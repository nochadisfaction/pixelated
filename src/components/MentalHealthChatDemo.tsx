'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  MentalHealthInsights,
  MentalHealthHistoryChart,
  type EnhancedMentalHealthAnalysis as ComponentEnhancedMentalHealthAnalysis,
} from '@/components/MentalHealthInsights'
import { getLogger } from '@/lib/utils/logger'
import { fheService as _fheService } from '@/lib/fhe'
import type { MentalHealthAnalysis } from '@/lib/chat'
import { createMentalHealthChat } from '@/lib/chat'

// Use the imported interface type
type EnhancedMentalHealthAnalysis = ComponentEnhancedMentalHealthAnalysis

const logger = getLogger('MentalHealthChatDemo')

// Mock implementation for demo
const mockFHEService = {
  encrypt: async (data: string) => data,
  decrypt: async (data: string) => data,
  encryptText: async (text: string) => text,
  decryptText: async (text: string) => text,
  generateHash: async (data: string) => `hash_${data.substring(0, 10)}`,
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  mentalHealthAnalysis?: MentalHealthAnalysis
}

// Helper function to convert MentalHealthAnalysis to EnhancedMentalHealthAnalysis
const enhanceAnalysis = (
  analysis?: MentalHealthAnalysis,
): EnhancedMentalHealthAnalysis | undefined => {
  if (!analysis) {
    return undefined
  }

  // Convert the basic analysis to the enhanced version
  return {
    ...analysis,
    hasMentalHealthIssue: Object.values(analysis.scores).some(
      (score) => (score || 0) > 0.5,
    ),
    confidence: Math.max(
      ...Object.values(analysis.scores).map((score) => score || 0),
    ),
    supportingEvidence: Object.values(analysis.evidence)
      .filter((arr): arr is string[] => Array.isArray(arr))
      .flat()
      .filter(Boolean),
    // Map 'moderate' to 'medium' to match the expected enum values
    riskLevel:
      analysis.riskLevel === 'moderate' ? 'medium' : analysis.riskLevel,
    // Transform scores to ensure no undefined values
    scores: Object.entries(analysis.scores).reduce(
      (acc, [key, value]) => {
        acc[key] = value ?? 0
        return acc
      },
      {} as Record<string, number>,
    ),
  }
}

// Helper to convert an array of analyses
const enhanceAnalysisArray = (
  analyses: MentalHealthAnalysis[],
): EnhancedMentalHealthAnalysis[] => {
  return analyses.map((analysis) => enhanceAnalysis(analysis)!).filter(Boolean)
}

/**
 * Demo component for the MentalLLaMA chat integration
 */
export function MentalHealthChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm here to chat. How are you feeling today?",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [mentalHealthChat, setMentalHealthChat] = useState<ReturnType<
    typeof createMentalHealthChat
  > | null>(null)
  const [settings, setSettings] = useState({
    enableAnalysis: true,
    useExpertGuidance: true,
    showAnalysisPanel: true,
  })

  // Initialize the MentalHealthChat service
  useEffect(() => {
    const chat = createMentalHealthChat(mockFHEService, {
      enableAnalysis: settings.enableAnalysis,
      useExpertGuidance: settings.useExpertGuidance,
      triggerInterventionThreshold: 0.7,
      analysisMinimumLength: 15,
    })

    setMentalHealthChat(chat)

    return () => {
      // Clean up if needed
    }
  }, [settings.enableAnalysis, settings.useExpertGuidance])

  // Get all analyses from the message history
  const getAnalysisHistory = (): MentalHealthAnalysis[] => {
    return messages
      .filter((m) => m.mentalHealthAnalysis)
      .map((m) => m.mentalHealthAnalysis!)
  }

  // Get enhanced analyses for the components
  const getEnhancedAnalysisHistory = (): EnhancedMentalHealthAnalysis[] => {
    return enhanceAnalysisArray(getAnalysisHistory())
  }

  // Process a new user message
  const handleSendMessage = async () => {
    if (!input.trim() || !mentalHealthChat) {
      return
    }

    setProcessing(true)

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: input,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')

      // Process message with MentalHealthChat
      const processedMessage = await mentalHealthChat.processMessage({
        id: userMessage.id,

        senderId: 'user',
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      })

      // Update user message with analysis
      if (processedMessage.mentalHealthAnalysis) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id
              ? {
                  ...m,
                  mentalHealthAnalysis: processedMessage.mentalHealthAnalysis,
                }
              : m,
          ),
        )
      }

      // Generate assistant response
      let responseContent = 'I understand. Can you tell me more about that?'

      // If intervention is needed, generate therapeutic response
      if (mentalHealthChat.needsIntervention()) {
        responseContent = await mentalHealthChat.generateIntervention()
      }

      // Add assistant response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setProcessing(false)
      }, 1000)
    } catch (error) {
      logger.error('Error processing message', { error })
      setProcessing(false)
    }
  }

  // Toggle settings
  const handleToggleSetting = (setting: keyof typeof settings) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [setting]: !prev[setting] }

      // Update the MentalHealthChat service if needed
      if (
        mentalHealthChat &&
        (setting === 'enableAnalysis' || setting === 'useExpertGuidance')
      ) {
        mentalHealthChat.configure({
          enableAnalysis: newSettings.enableAnalysis,
          useExpertGuidance: newSettings.useExpertGuidance,
        })
      }

      return newSettings
    })
  }

  // Request a therapeutic intervention
  const handleRequestIntervention = async (
    _messageWithAnalysis: ChatMessage,
  ) => {
    if (!mentalHealthChat) {
      return
    }

    setProcessing(true)

    try {
      const intervention = await mentalHealthChat.generateIntervention()

      const assistantMessage: ChatMessage = {
        id: `intervention_${Date.now()}`,
        role: 'assistant',
        content: intervention,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      logger.error('Error generating intervention', { error })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      <div
        className={`flex-1 ${settings.showAnalysisPanel ? 'md:max-w-[65%]' : 'w-full'}`}
      >
        <Card className="h-[600px] flex flex-col">
          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {processing && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                    <p>...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={processing}
              />

              <Button onClick={handleSendMessage} disabled={processing}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {settings.showAnalysisPanel && (
        <div className="md:w-[35%]">
          <Tabs defaultValue="insights">
            <TabsList className="w-full">
              <TabsTrigger value="insights" className="flex-1">
                Insights
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="mt-4 space-y-4">
              {messages
                .filter((m) => m.role === 'user' && m.mentalHealthAnalysis)
                .map((m) => (
                  <div key={`analysis_${m.id}`} className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      Analysis for: &quot;{m.content.substring(0, 30)}
                      {m.content.length > 30 ? '...' : ''}&quot;
                    </p>
                    <MentalHealthInsights
                      analysis={enhanceAnalysis(m.mentalHealthAnalysis)!}
                      onRequestIntervention={() => handleRequestIntervention(m)}
                      showCharts={true}
                    />
                  </div>
                ))
                .slice(-1)}

              {messages.filter(
                (m) => m.role === 'user' && m.mentalHealthAnalysis,
              ).length === 0 && (
                <Card className="w-full bg-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-center py-8 text-muted-foreground">
                      No analysis available yet. Send a message to see insights.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <MentalHealthHistoryChart
                analysisHistory={getEnhancedAnalysisHistory()}
              />

              {getAnalysisHistory().length === 0 && (
                <Card className="w-full bg-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-center py-8 text-muted-foreground">
                      No analysis history available yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableAnalysis" className="flex flex-col">
                      <span>Mental Health Analysis</span>
                      <span className="font-normal text-xs text-muted-foreground">
                        Analyze messages for mental health indicators
                      </span>
                    </Label>
                    <Switch
                      id="enableAnalysis"
                      checked={settings.enableAnalysis}
                      onCheckedChange={() =>
                        handleToggleSetting('enableAnalysis')
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="useExpertGuidance"
                      className="flex flex-col"
                    >
                      <span>Expert Guidance</span>
                      <span className="font-normal text-xs text-muted-foreground">
                        Use expert-written explanations as templates
                      </span>
                    </Label>
                    <Switch
                      id="useExpertGuidance"
                      checked={settings.useExpertGuidance}
                      onCheckedChange={() =>
                        handleToggleSetting('useExpertGuidance')
                      }
                      disabled={!settings.enableAnalysis}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="showAnalysisPanel"
                      className="flex flex-col"
                    >
                      <span>Analysis Panel</span>
                      <span className="font-normal text-xs text-muted-foreground">
                        Show the analysis panel in the UI
                      </span>
                    </Label>
                    <Switch
                      id="showAnalysisPanel"
                      checked={settings.showAnalysisPanel}
                      onCheckedChange={() =>
                        handleToggleSetting('showAnalysisPanel')
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
