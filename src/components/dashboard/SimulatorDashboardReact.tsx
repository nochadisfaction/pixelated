'use client'

import React, { useState } from 'react'
import {
  SimulatorProvider,
  SimulationContainer,
  ScenarioSelector,
} from '@/simulator'
import { MetricsDialog } from '../MetricsDialog'

export interface SimulatorDashboardProps {
  'client:load'?: boolean
  'client:visible'?: boolean
  'client:idle'?: boolean
  'client:only'?: boolean
}

/**
 * Dashboard component for the therapeutic practice simulator
 * Includes both scenario selection and the active simulation in one interface
 */
export default function SimulatorDashboardReact(
  _props: SimulatorDashboardProps,
) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  )
  const [showSelector, setShowSelector] = useState<boolean>(true)
  const [showMetricsDialog, setShowMetricsDialog] = useState<boolean>(false)

  // Handle scenario selection
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId)
    setShowSelector(false)
  }

  // Return to scenario selection
  const handleBackToScenarios = () => {
    setShowSelector(true)
  }

  // Toggle metrics dialog
  const toggleMetricsDialog = () => {
    setShowMetricsDialog(!showMetricsDialog)
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <SimulatorProvider>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Therapeutic Practice Simulator
          </h2>

          <div className="flex flex-wrap gap-2">
            {!showSelector && (
              <button
                onClick={handleBackToScenarios}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Scenarios
              </button>
            )}

            <button
              onClick={toggleMetricsDialog}
              className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Progress Metrics
            </button>
          </div>
        </div>

        {showSelector ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                Select a Practice Scenario
              </h3>
              <p className="text-sm text-gray-600">
                Choose a scenario to practice therapeutic techniques in a safe,
                private environment. All interactions are processed in real-time
                with no recording or storage.
              </p>
            </div>

            <ScenarioSelector
              onSelect={handleSelectScenario}
              className="mt-4"
            />
          </div>
        ) : (
          <SimulationContainer
            scenarioId={selectedScenarioId || 'default-scenario'}
            className="bg-white rounded-lg shadow-sm"
          />
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            About This Simulator
          </h3>
          <p className="text-sm text-blue-700">
            This simulator allows you to practice therapeutic techniques in a
            private, safe environment. No audio or video data is recorded or
            stored at any time. All processing happens in real-time with zero
            data retention to ensure complete privacy and HIPAA compliance.
          </p>

          <div className="mt-3 text-xs text-blue-600">
            You can track your progress through anonymized metrics that are only
            stored in your browser. View your progress by clicking the "Progress
            Metrics" button above.
          </div>
        </div>

        <MetricsDialog
          isOpen={showMetricsDialog}
          onClose={() => setShowMetricsDialog(false)}
        />
      </SimulatorProvider>
    </div>
  )
}
