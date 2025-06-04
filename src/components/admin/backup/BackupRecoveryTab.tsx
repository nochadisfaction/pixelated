import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-radix'
import Dialog from '@/components/ui/dialog'
import { RecoveryTestStatus } from '../../../lib/security/backup/backup-types'
import type { BackupType } from '../../../lib/security/backup'
import type { BackupStatus } from '../../../lib/security/backup'
import { TestEnvironmentType } from '../../../lib/security/backup/recovery-testing'
import { toast } from '@/components/ui/toast'

interface Backup {
  id: string
  type: BackupType
  timestamp: string
  size: number
  location: string
  status: BackupStatus
  retentionDate: string
}

interface RecoveryTest {
  id: string
  backupId: string
  testDate: string
  status: RecoveryTestStatus
  timeTaken: number
  environment: string
  verificationResults?: Array<{
    testCase: string
    passed: boolean
    details: Record<string, unknown>
  }>
  issues?: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
}

interface BackupRecoveryTabProps {
  backups: Backup[]
  recoveryTests: RecoveryTest[]
  onStartRecoveryTest: (
    backupId: string,
    environmentType: TestEnvironmentType,
  ) => Promise<RecoveryTest>
  onScheduleRecoveryTests: () => Promise<void>
}

// Helper functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${remainingSeconds}s`
}

const renderStatusBadge = (status: RecoveryTestStatus) => {
  switch (status) {
    case RecoveryTestStatus.SCHEDULED:
      return <Badge variant="outline">Scheduled</Badge>

    case RecoveryTestStatus.IN_PROGRESS:
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 hover:bg-blue-100"
        >
          In Progress
        </Badge>
      )

    case RecoveryTestStatus.PASSED:
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 hover:bg-green-100"
        >
          Passed
        </Badge>
      )

    case RecoveryTestStatus.FAILED:
      return <Badge variant="destructive">Failed</Badge>

    default:
      return null
  }
}

const BackupRecoveryTab: React.FC<BackupRecoveryTabProps> = ({
  backups,
  recoveryTests,
  onStartRecoveryTest,
  onScheduleRecoveryTests,
}) => {
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testEnv, setTestEnv] = useState<TestEnvironmentType>(
    TestEnvironmentType.SANDBOX,
  )
  const [testInProgress, setTestInProgress] = useState(false)
  const [testResults, setTestResults] = useState<RecoveryTest[]>(
    recoveryTests || [],
  )
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  useEffect(() => {
    setTestResults(recoveryTests || [])
  }, [recoveryTests])

  const availableBackups = backups.filter(
    (b) => b.status === 'completed' || b.status === 'verified',
  )

  const handleStartTest = async () => {
    if (!selectedBackup) {
      toast.error('No backup selected. Please select a backup to test.')
      return
    }

    setTestInProgress(true)

    try {
      // Call the provided function to start a recovery test
      const result = await onStartRecoveryTest(selectedBackup, testEnv)

      // Add the new test result to the list
      setTestResults((prev) => [result, ...prev])

      // Show success or failure toast
      if (result.status === RecoveryTestStatus.PASSED) {
        toast.success(
          `Successfully tested recovery of backup in ${formatDuration(result.timeTaken)}`,
        )
      } else {
        toast.error(
          'The recovery test encountered issues. See details for more information.',
        )
      }

      // Close the dialog
      setDialogOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred during the recovery test',
      )
    } finally {
      setTestInProgress(false)
      setSelectedBackup('')
    }
  }

  const handleScheduleTests = async () => {
    try {
      await onScheduleRecoveryTests()
      toast.success(
        'Recovery tests have been scheduled according to the system configuration.',
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to schedule recovery tests',
      )
    }
  }

  const handleSelectTest = (testId: string) => {
    if (selectedTest === testId) {
      setSelectedTest(null)
    } else {
      setSelectedTest(testId)
    }
  }

  const getBackupById = (backupId: string) => {
    return backups.find((b) => b.id === backupId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Recovery Testing</h2>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleScheduleTests}>
            Schedule Automated Tests
          </Button>
          <Dialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Start Recovery Test"
            footer={
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartTest}
                  disabled={!selectedBackup || testInProgress}
                >
                  {testInProgress ? 'Running Test...' : 'Start Test'}
                </Button>
              </>
            }
          >
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="backup-selection"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Select Backup
                </label>
                <Select
                  value={selectedBackup}
                  onValueChange={setSelectedBackup}
                >
                  <SelectTrigger id="backup-selection">
                    <SelectValue placeholder="Select a backup" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBackups.length === 0 ? (
                      <SelectItem value="" disabled>
                        No backups available
                      </SelectItem>
                    ) : (
                      availableBackups.map((backup) => (
                        <SelectItem key={backup.id} value={backup.id}>
                          {`${backup.type} backup - ${new Date(backup.timestamp).toLocaleDateString()}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="test-environment"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Test Environment
                </label>
                <Select
                  value={testEnv}
                  onValueChange={(value: string) =>
                    setTestEnv(value as TestEnvironmentType)
                  }
                >
                  <SelectTrigger id="test-environment">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TestEnvironmentType.SANDBOX}>
                      Sandbox (Memory)
                    </SelectItem>
                    <SelectItem value={TestEnvironmentType.DOCKER}>
                      Docker
                    </SelectItem>
                    <SelectItem value={TestEnvironmentType.KUBERNETES}>
                      Kubernetes
                    </SelectItem>
                    <SelectItem value={TestEnvironmentType.VM}>
                      Virtual Machine
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p>
                This will perform a test restoration of the selected backup in
                an isolated environment.
              </p>
            </div>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recovery Tests</CardTitle>
              <CardDescription>
                Results from backup recovery testing in isolated environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-12 p-3 bg-slate-50 dark:bg-slate-800 text-sm font-medium">
                  <div className="col-span-4">Backup</div>
                  <div className="col-span-3">Test Date</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Time Taken</div>
                  <div className="col-span-1">Details</div>
                </div>

                {testResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No recovery tests have been run yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {testResults.map((test) => {
                      const backup = getBackupById(test.backupId)

                      return (
                        <div
                          key={test.id}
                          className={`grid grid-cols-12 p-3 text-sm items-center ${selectedTest === test.id ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                        >
                          <div className="col-span-4 truncate">
                            {backup ? (
                              <>
                                <span className="font-medium">
                                  {backup.type}
                                </span>{' '}
                                -{' '}
                                {new Date(
                                  backup.timestamp,
                                ).toLocaleDateString()}
                              </>
                            ) : (
                              <span className="text-gray-500">
                                Unknown backup
                              </span>
                            )}
                          </div>

                          <div className="col-span-3">
                            {formatDate(test.testDate)}
                          </div>

                          <div className="col-span-2">
                            {renderStatusBadge(test.status)}
                          </div>

                          <div className="col-span-2">
                            {formatDuration(test.timeTaken)}
                          </div>

                          <div className="col-span-1 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectTest(test.id)}
                            >
                              {selectedTest === test.id ? 'Hide' : 'View'}
                            </Button>
                          </div>

                          {selectedTest === test.id && (
                            <div className="col-span-12 p-3 bg-slate-50 dark:bg-slate-800 mt-1 rounded-md">
                              <h4 className="font-medium mb-2">Test Results</h4>

                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="text-xs text-gray-500 dark:text-gray-400">
                                      Environment
                                    </h5>
                                    <p className="text-sm">
                                      {test.environment}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-xs text-gray-500 dark:text-gray-400">
                                      Test ID
                                    </h5>
                                    <p className="text-sm font-mono text-xs">
                                      {test.id}
                                    </p>
                                  </div>
                                </div>

                                {test.verificationResults &&
                                  test.verificationResults.length > 0 && (
                                    <div className="mt-3">
                                      <h5 className="text-sm font-medium mb-2">
                                        Verification Results
                                      </h5>
                                      <div className="rounded-md border divide-y">
                                        {test.verificationResults.map(
                                          (vr, idx) => (
                                            <div
                                              key={idx}
                                              className="p-2 flex justify-between items-center"
                                            >
                                              <div>
                                                <span className="font-medium">
                                                  {vr.testCase}
                                                </span>
                                              </div>
                                              <div>
                                                {vr.passed ? (
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-green-100 text-green-800"
                                                  >
                                                    Passed
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="destructive">
                                                    Failed
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {test.issues && test.issues.length > 0 && (
                                  <div className="mt-3">
                                    <h5 className="text-sm font-medium mb-2 text-red-500">
                                      Issues
                                    </h5>
                                    <div className="rounded-md border border-red-200 divide-y divide-red-100">
                                      {test.issues.map((issue, idx) => (
                                        <div key={idx} className="p-2">
                                          <div className="flex justify-between">
                                            <span className="font-medium">
                                              {issue.type}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={`
                                                ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' : ''}
                                                ${issue.severity === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                                ${issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${issue.severity === 'low' ? 'bg-blue-100 text-blue-800' : ''}
                                              `}
                                            >
                                              {issue.severity}
                                            </Badge>
                                          </div>
                                          <p className="text-sm mt-1">
                                            {issue.description}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recovery Testing Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  What is Recovery Testing?
                </h3>
                <p className="text-sm">
                  Recovery tests verify that backups can be successfully
                  restored in an isolated environment, ensuring data integrity
                  and availability in case of a disaster recovery scenario.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Test Environments
                </h3>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>
                    <strong>Sandbox:</strong> Lightweight in-memory environment
                    (fastest)
                  </li>
                  <li>
                    <strong>Docker:</strong> Container-based environment
                  </li>
                  <li>
                    <strong>Kubernetes:</strong> Orchestrated container
                    environment
                  </li>
                  <li>
                    <strong>VM:</strong> Full virtual machine environment (most
                    comprehensive)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Automated Testing
                </h3>
                <p className="text-sm">
                  The system can automatically run recovery tests on a schedule
                  to ensure backup integrity. Use the &ldquo;Schedule Automated
                  Tests&rdquo; button to configure this.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleScheduleTests}
                >
                  Schedule Automated Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedBackup && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Selected Backup Details
          </h2>
          <div className="space-y-4">
            {backups.find((b) => b.id === selectedBackup) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Name
                    </h3>
                    <p>
                      {backups.find((b) => b.id === selectedBackup)?.type} (
                      {new Date(
                        backups.find((b) => b.id === selectedBackup)
                          ?.timestamp || '',
                      ).toLocaleDateString()}
                      )
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Size
                    </h3>
                    <p>
                      {backups.find((b) => b.id === selectedBackup)?.size} GB
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Date Created
                    </h3>
                    <p>
                      {new Date(
                        backups.find((b) => b.id === selectedBackup)
                          ?.timestamp || '',
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Storage Location
                    </h3>
                    <p>
                      {backups.find((b) => b.id === selectedBackup)?.location}
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleStartTest}
                    disabled={testInProgress}
                    className="w-full sm:w-auto"
                  >
                    {testInProgress ? 'Running Test...' : 'Run Recovery Test'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default BackupRecoveryTab
