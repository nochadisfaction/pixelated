import { useState } from 'react'

interface ScheduleSettings {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  time: string
  day: string
  retention: number
  autoTest: boolean
  notifyOnFailure: boolean
  notifyOnSuccess: boolean
  encryptBackups: boolean
}

const BackupScheduleTab = () => {
  const [settings, setSettings] = useState<ScheduleSettings>({
    frequency: 'daily',
    time: '02:00',
    day: 'monday',
    retention: 30,
    autoTest: true,
    notifyOnFailure: true,
    notifyOnSuccess: false,
    encryptBackups: true,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setSettings({
        ...settings,
        [name]: target.checked,
      })
    } else {
      setSettings({
        ...settings,
        [name]: value,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setIsSaved(true)

      setTimeout(() => {
        setIsSaved(false)
      }, 3000)
    }, 1000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Backup Schedule Configuration</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure when automatic backups are performed and how long they're
          retained.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="frequency"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Backup Frequency
            </label>
            <select
              id="frequency"
              name="frequency"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
              value={settings.frequency}
              onChange={handleChange}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="time"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Backup Time
            </label>
            <input
              type="time"
              name="time"
              id="time"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
              value={settings.time}
              onChange={handleChange}
            />
          </div>

          {settings.frequency === 'weekly' && (
            <div>
              <label
                htmlFor="day"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Day of Week
              </label>
              <select
                id="day"
                name="day"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                value={settings.day}
                onChange={handleChange}
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="retention"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Retention Period (days)
            </label>
            <input
              type="number"
              name="retention"
              id="retention"
              min="1"
              max="365"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
              value={settings.retention}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="autoTest"
                name="autoTest"
                type="checkbox"
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                checked={settings.autoTest}
                onChange={handleChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="autoTest"
                className="font-medium text-gray-700 dark:text-gray-300"
              >
                Automatically test each backup
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Run a recovery test for each backup to verify it's valid and can
                be restored
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="encryptBackups"
                name="encryptBackups"
                type="checkbox"
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                checked={settings.encryptBackups}
                onChange={handleChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="encryptBackups"
                className="font-medium text-gray-700 dark:text-gray-300"
              >
                Encrypt backups
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Encrypt backup data using AES-256 encryption (recommended)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notification Settings
          </h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="notifyOnFailure"
                  name="notifyOnFailure"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                  checked={settings.notifyOnFailure}
                  onChange={handleChange}
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="notifyOnFailure"
                  className="font-medium text-gray-700 dark:text-gray-300"
                >
                  Notify on backup failure
                </label>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="notifyOnSuccess"
                  name="notifyOnSuccess"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                  checked={settings.notifyOnSuccess}
                  onChange={handleChange}
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="notifyOnSuccess"
                  className="font-medium text-gray-700 dark:text-gray-300"
                >
                  Notify on backup success
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Reset to Defaults
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
              isLoading ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
          >
            {isLoading ? (
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
            ) : isSaved ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BackupScheduleTab
