import { useState } from 'react'

interface BackupRecord {
  id: string
  timestamp: string
  type: 'automatic' | 'manual'
  status: 'completed' | 'failed' | 'in-progress'
  size: string
  duration: string
  location: string
  retention: string
  initiatedBy?: string
  errorMessage?: string
}

const BackupHistoryTab = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([
    {
      id: '1',
      timestamp: '2025-03-15T14:30:00Z',
      type: 'automatic',
      status: 'completed',
      size: '256 MB',
      duration: '3m 45s',
      location: 'AWS S3: pixelated-backups',
      retention: '30 days',
    },
    {
      id: '2',
      timestamp: '2025-03-14T10:15:00Z',
      type: 'manual',
      status: 'completed',
      size: '253 MB',
      duration: '3m 30s',
      location: 'Local Storage: /var/backups/pixelated',
      retention: '90 days',
      initiatedBy: 'admin@example.com',
    },
    {
      id: '3',
      timestamp: '2025-03-13T10:00:00Z',
      type: 'automatic',
      status: 'failed',
      size: '0 MB',
      duration: '0m 45s',
      location: 'AWS S3: pixelated-backups',
      retention: '30 days',
      errorMessage:
        'S3 authentication failed. Check IAM roles and permissions.',
    },
    {
      id: '4',
      timestamp: '2025-03-12T10:00:00Z',
      type: 'automatic',
      status: 'completed',
      size: '248 MB',
      duration: '3m 15s',
      location: 'AWS S3: pixelated-backups',
      retention: '30 days',
    },
    {
      id: '5',
      timestamp: '2025-03-11T10:00:00Z',
      type: 'automatic',
      status: 'completed',
      size: '245 MB',
      duration: '3m 20s',
      location: 'AWS S3: pixelated-backups',
      retention: '30 days',
    },
  ])

  const [isBackupInProgress, setIsBackupInProgress] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expandedBackupId, setExpandedBackupId] = useState<string | null>(null)

  const handleStartBackup = () => {
    setIsBackupInProgress(true)

    const newBackup: BackupRecord = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      type: 'manual',
      status: 'in-progress',
      size: 'Calculating...',
      duration: '-',
      location: 'AWS S3: pixelated-backups',
      retention: '90 days',
      initiatedBy: 'admin@example.com',
    }

    setBackups([newBackup, ...backups])

    // Simulate backup completion after 5 seconds
    setTimeout(() => {
      setBackups((prevBackups) =>
        prevBackups.map((backup) =>
          backup.id === newBackup.id
            ? {
                ...backup,
                status: 'completed',
                size: '258 MB',
                duration: '3m 52s',
              }
            : backup,
        ),
      )
      setIsBackupInProgress(false)
    }, 5000)
  }

  const handleDownload = (id: string) => {
    // Simulate download action
    console.log(`Downloading backup ${id}`)
  }

  const handleRestore = (id: string) => {
    // Simulate restore action
    console.log(`Restoring from backup ${id}`)
  }

  const handleDelete = (id: string) => {
    // Simulate delete action with confirmation
    if (
      window.confirm(
        'Are you sure you want to delete this backup? This action cannot be undone.',
      )
    ) {
      setBackups(backups.filter((backup) => backup.id !== id))
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedBackupId === id) {
      setExpandedBackupId(null)
    } else {
      setExpandedBackupId(id)
    }
  }

  const filteredBackups = backups.filter((backup) => {
    if (filter === 'all') {
      return true
    }
    if (filter === 'automatic') {
      return backup.type === 'automatic'
    }
    if (filter === 'manual') {
      return backup.type === 'manual'
    }
    if (filter === 'completed') {
      return backup.status === 'completed'
    }
    if (filter === 'failed') {
      return backup.status === 'failed'
    }
    return true
  })

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold">Backup History</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage your backup history. You can restore or download
              backups from this page.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <label htmlFor="filter" className="sr-only">
                Filter backups
              </label>
              <select
                id="filter"
                name="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              >
                <option value="all">All Backups</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleStartBackup}
              disabled={isBackupInProgress}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isBackupInProgress
                  ? 'bg-gray-400'
                  : 'bg-primary-600 hover:bg-primary-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              {isBackupInProgress ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Backup in progress...
                </>
              ) : (
                'Backup Now'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Date & Time
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Duration
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Location
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {filteredBackups.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No backup records found matching your filters
                </td>
              </tr>
            ) : (
              filteredBackups.map((backup) => (
                <>
                  <tr
                    key={backup.id}
                    className={
                      expandedBackupId === backup.id
                        ? 'bg-gray-50 dark:bg-gray-750'
                        : ''
                    }
                    onClick={() => toggleExpand(backup.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(backup.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {backup.type === 'automatic' ? 'Scheduled' : 'Manual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {backup.status === 'completed' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Completed
                        </span>
                      )}
                      {backup.status === 'failed' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          Failed
                        </span>
                      )}
                      {backup.status === 'in-progress' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {backup.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {backup.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {backup.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-3 justify-end">
                        {backup.status === 'completed' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(backup.id)
                              }}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              Download
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRestore(backup.id)
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Restore
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(backup.id)
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedBackupId === backup.id && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 bg-gray-50 dark:bg-gray-750"
                      >
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">Backup ID:</p>
                              <p>{backup.id}</p>
                            </div>
                            <div>
                              <p className="font-semibold">Retention Period:</p>
                              <p>{backup.retention}</p>
                            </div>
                            {backup.initiatedBy && (
                              <div>
                                <p className="font-semibold">Initiated By:</p>
                                <p>{backup.initiatedBy}</p>
                              </div>
                            )}
                          </div>

                          {backup.errorMessage && (
                            <div className="mt-2">
                              <p className="font-semibold text-red-600 dark:text-red-400">
                                Error Message:
                              </p>
                              <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-md mt-1">
                                {backup.errorMessage}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-end mt-4">
                            <button
                              type="button"
                              onClick={() => setExpandedBackupId(null)}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BackupHistoryTab
