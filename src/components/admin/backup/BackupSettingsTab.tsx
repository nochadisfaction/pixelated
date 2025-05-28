import { useState } from 'react'

interface BackupSettings {
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number // 0-6, Sunday to Saturday
    dayOfMonth?: number // 1-31
    hour: number // 0-23
    minute: number // 0-59
  }
  retention: {
    policy: 'time' | 'count'
    days?: number
    count?: number
  }
  encryption: {
    enabled: boolean
    algorithm: 'AES-256' | 'AES-128'
    keyRotation: boolean
    keyRotationDays: number
  }
  compression: {
    enabled: boolean
    level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  }
  notify: {
    onSuccess: boolean
    onFailure: boolean
    emails: string[]
  }
}

const BackupSettingsTab = () => {
  const [settings, setSettings] = useState<BackupSettings>({
    schedule: {
      frequency: 'daily',
      hour: 2,
      minute: 0,
    },
    retention: {
      policy: 'time',
      days: 30,
    },
    encryption: {
      enabled: true,
      algorithm: 'AES-256',
      keyRotation: false,
      keyRotationDays: 90,
    },
    compression: {
      enabled: true,
      level: 6,
    },
    notify: {
      onSuccess: false,
      onFailure: true,
      emails: ['admin@example.com'],
    },
  })

  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleScheduleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = e.target

    if (name === 'frequency') {
      // Reset day-specific settings when frequency changes
      const newSchedule = {
        frequency: value as any,
        hour: settings.schedule.hour,
        minute: settings.schedule.minute,
      }

      if (value === 'weekly') {
        newSchedule.dayOfWeek = 1 // Monday
      } else if (value === 'monthly') {
        newSchedule.dayOfMonth = 1 // First day
      }

      setSettings({
        ...settings,
        schedule: newSchedule,
      })
    } else {
      setSettings({
        ...settings,
        schedule: {
          ...settings.schedule,
          [name]: value === '' ? '' : Number(value),
        },
      })
    }
  }

  const handleRetentionChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = e.target

    if (name === 'policy') {
      const newRetention = { policy: value as 'time' | 'count' }
      if (value === 'time') {
        newRetention.days = 30
      } else {
        newRetention.count = 10
      }

      setSettings({
        ...settings,
        retention: newRetention as any,
      })
    } else {
      setSettings({
        ...settings,
        retention: {
          ...settings.retention,
          [name]: Number(value),
        },
      })
    }
  }

  const handleEncryptionChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value

    setSettings({
      ...settings,
      encryption: {
        ...settings.encryption,
        [name]: name === 'keyRotationDays' ? Number(val) : val,
      },
    })
  }

  const handleCompressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value

    setSettings({
      ...settings,
      compression: {
        ...settings.compression,
        [name]: name === 'level' ? Number(val) : val,
      },
    })
  }

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target

    setSettings({
      ...settings,
      notify: {
        ...settings.notify,
        [name]: checked,
      },
    })
  }

  const handleAddEmail = () => {
    if (email && !settings.notify.emails.includes(email)) {
      setSettings({
        ...settings,
        notify: {
          ...settings.notify,
          emails: [...settings.notify.emails, email],
        },
      })
      setEmail('')
    }
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setSettings({
      ...settings,
      notify: {
        ...settings.notify,
        emails: settings.notify.emails.filter((e) => e !== emailToRemove),
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      // Show notification (ideally use a toast notification system here)
      alert('Backup settings saved successfully')
    }, 1000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Backup Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure how and when your data is backed up
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
        {/* Schedule Settings */}
        <div>
          <h4 className="text-base font-medium">Backup Schedule</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure when backups should run automatically
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="frequency"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Frequency
              </label>
              <select
                id="frequency"
                name="frequency"
                value={settings.schedule.frequency}
                onChange={handleScheduleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {settings.schedule.frequency === 'weekly' && (
              <div>
                <label
                  htmlFor="dayOfWeek"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Day of Week
                </label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  value={settings.schedule.dayOfWeek}
                  onChange={handleScheduleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
            )}

            {settings.schedule.frequency === 'monthly' && (
              <div>
                <label
                  htmlFor="dayOfMonth"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Day of Month
                </label>
                <select
                  id="dayOfMonth"
                  name="dayOfMonth"
                  value={settings.schedule.dayOfMonth}
                  onChange={handleScheduleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="hour"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Hour
              </label>
              <select
                id="hour"
                name="hour"
                value={settings.schedule.hour}
                onChange={handleScheduleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="minute"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Minute
              </label>
              <select
                id="minute"
                name="minute"
                value={settings.schedule.minute}
                onChange={handleScheduleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Retention Settings */}
        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-base font-medium">Backup Retention</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure how long backups should be kept
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="retentionPolicy"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Retention Policy
              </label>
              <select
                id="retentionPolicy"
                name="policy"
                value={settings.retention.policy}
                onChange={handleRetentionChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              >
                <option value="time">Time-based (days)</option>
                <option value="count">Count-based</option>
              </select>
            </div>

            {settings.retention.policy === 'time' && (
              <div>
                <label
                  htmlFor="retentionDays"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Days to Keep Backups
                </label>
                <input
                  type="number"
                  id="retentionDays"
                  name="days"
                  min="1"
                  max="365"
                  value={settings.retention.days}
                  onChange={handleRetentionChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                />
              </div>
            )}

            {settings.retention.policy === 'count' && (
              <div>
                <label
                  htmlFor="retentionCount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Number of Backups to Keep
                </label>
                <input
                  type="number"
                  id="retentionCount"
                  name="count"
                  min="1"
                  max="100"
                  value={settings.retention.count}
                  onChange={handleRetentionChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                />
              </div>
            )}
          </div>
        </div>

        {/* Encryption Settings */}
        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-base font-medium">Encryption</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure encryption settings for your backups
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                id="encryptionEnabled"
                name="enabled"
                type="checkbox"
                checked={settings.encryption.enabled}
                onChange={handleEncryptionChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />

              <label
                htmlFor="encryptionEnabled"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable Encryption
              </label>
            </div>

            {settings.encryption.enabled && (
              <>
                <div>
                  <label
                    htmlFor="algorithm"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Encryption Algorithm
                  </label>
                  <select
                    id="algorithm"
                    name="algorithm"
                    value={settings.encryption.algorithm}
                    onChange={handleEncryptionChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                  >
                    <option value="AES-256">AES-256 (Recommended)</option>
                    <option value="AES-128">AES-128</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="keyRotation"
                    name="keyRotation"
                    type="checkbox"
                    checked={settings.encryption.keyRotation}
                    onChange={handleEncryptionChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                  />

                  <label
                    htmlFor="keyRotation"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    Enable Key Rotation
                  </label>
                </div>

                {settings.encryption.keyRotation && (
                  <div>
                    <label
                      htmlFor="keyRotationDays"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Rotate Keys Every (days)
                    </label>
                    <input
                      type="number"
                      id="keyRotationDays"
                      name="keyRotationDays"
                      min="1"
                      max="365"
                      value={settings.encryption.keyRotationDays}
                      onChange={handleEncryptionChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Compression Settings */}
        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-base font-medium">Compression</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure compression settings for your backups
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                id="compressionEnabled"
                name="enabled"
                type="checkbox"
                checked={settings.compression.enabled}
                onChange={handleCompressionChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />

              <label
                htmlFor="compressionEnabled"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Enable Compression
              </label>
            </div>

            {settings.compression.enabled && (
              <div>
                <label
                  htmlFor="compressionLevel"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Compression Level (1-9)
                </label>
                <input
                  type="range"
                  id="compressionLevel"
                  name="level"
                  min="1"
                  max="9"
                  value={settings.compression.level}
                  onChange={handleCompressionChange}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Faster</span>
                  <span>Current: {settings.compression.level}</span>
                  <span>Smaller</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-base font-medium">Notifications</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
            Configure email notifications for backup jobs
          </p>

          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <input
                  id="notifyOnSuccess"
                  name="onSuccess"
                  type="checkbox"
                  checked={settings.notify.onSuccess}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />

                <label
                  htmlFor="notifyOnSuccess"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Notify on Successful Backups
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="notifyOnFailure"
                  name="onFailure"
                  type="checkbox"
                  checked={settings.notify.onFailure}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />

                <label
                  htmlFor="notifyOnFailure"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Notify on Failed Backups
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="notificationEmail"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Notification Emails
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="email"
                  name="email"
                  id="notificationEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-500 focus:outline-none"
                >
                  Add
                </button>
              </div>

              {settings.notify.emails.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {settings.notify.emails.map((email) => (
                    <div
                      key={email}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1.5 inline-flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
                      >
                        <span className="sr-only">Remove</span>
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSaving ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              {isSaving ? (
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
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default BackupSettingsTab
