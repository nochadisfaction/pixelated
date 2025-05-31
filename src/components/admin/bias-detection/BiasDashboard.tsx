/**
 * Bias Detection Dashboard Component
 * 
 * Provides real-time monitoring and analytics for bias detection in therapeutic training sessions.
 * Features bias metrics, alerts, trends, and demographic analysis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterPlot,
  Scatter
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye,
  Download,
  RefreshCw,
  Settings,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { getLogger } from '@/lib/utils/logger';
import type { 
  BiasDashboardData,
  BiasAlert,
  BiasTrendData,
  DemographicBreakdown,
  BiasAnalysisResult
} from '@/lib/ai/bias-detection/types';

const logger = getLogger('BiasDashboard');

interface BiasDashboardProps {
  className?: string;
  refreshInterval?: number; // milliseconds
  enableRealTimeUpdates?: boolean;
}

export const BiasDashboard: React.FC<BiasDashboardProps> = ({
  className = '',
  refreshInterval = 30000, // 30 seconds
  enableRealTimeUpdates = true
}) => {
  // State management
  const [dashboardData, setDashboardData] = useState<BiasDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedDemographicFilter, setSelectedDemographicFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(enableRealTimeUpdates);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/bias-detection/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const data: BiasDashboardData = await response.json();
      setDashboardData(data);
      setLastUpdated(new Date());
      
      logger.info('Dashboard data loaded successfully', {
        totalSessions: data.summary.totalSessions,
        averageBiasScore: data.summary.averageBiasScore,
        alertsCount: data.alerts.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to fetch dashboard data', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  // Alert severity colors
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Bias score color based on severity
  const getBiasScoreColor = (score: number) => {
    if (score >= 0.8) {
      return 'text-red-600';
    }
    if (score >= 0.6) {
      return 'text-orange-600';
    }
    if (score >= 0.3) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  // Export dashboard data
  const exportData = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/bias-detection/export?format=${format}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bias-dashboard-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logger.info(`Dashboard data exported as ${format}`);
    } catch (err) {
      logger.error('Export failed', { error: err });
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Loading bias detection dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={fetchDashboardData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary, recentAnalyses, alerts, trends, demographics, recommendations } = dashboardData;

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bias Detection Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of therapeutic training bias
            {lastUpdated && (
              <span className="ml-2">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`} />
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(alert => alert.level === 'critical' || alert.level === 'high').length > 0 && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Priority Bias Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter(alert => alert.level === 'critical' || alert.level === 'high').length} 
            {' '}critical or high-priority bias issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Analyzed therapeutic sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bias Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBiasScoreColor(summary.averageBiasScore)}`}>
              {(summary.averageBiasScore * 100).toFixed(1)}%
            </div>
            <Progress value={summary.averageBiasScore * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.alertsLast24h}</div>
            <p className="text-xs text-muted-foreground">
              In the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(summary.complianceScore * 100).toFixed(1)}%
            </div>
            <Progress value={summary.complianceScore * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bias Score Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis domain={[0, 1]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Bias Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="biasScore" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="sessionCount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="alertCount" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(demographics.age).map(([age, count]) => ({
                        name: age,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(demographics.age).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(demographics.gender).map(([gender, count]) => ({
                        name: gender,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#82ca9d"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(demographics.gender).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${120 + index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ethnicity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Ethnicity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={Object.entries(demographics.ethnicity).map(([ethnicity, count]) => ({
                    ethnicity,
                    count
                  }))}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="ethnicity" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.alertId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Badge className={`${getAlertColor(alert.level)} text-white`}>
                        {alert.level.toUpperCase()}
                      </Badge>
                      <div>
                        <h4 className="font-semibold">{alert.type}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Session: {alert.sessionId} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Recent Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {recentAnalyses.map((analysis) => (
            <Card key={analysis.sessionId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Session {analysis.sessionId}</h4>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`text-sm font-medium ${getBiasScoreColor(analysis.overallBiasScore)}`}>
                        Bias Score: {(analysis.overallBiasScore * 100).toFixed(1)}%
                      </span>

                      <Badge variant={analysis.alertLevel === 'low' ? 'secondary' : 'error'}>
                        {analysis.alertLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.timestamp).toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">

                      <Badge variant={rec.priority === 'critical' ? 'error' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                      <h4 className="font-semibold">{rec.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">

















                      }; 