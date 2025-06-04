import React from 'react'
import { EmotionDetector } from './EmotionDetector'
import { EmotionDisplay } from './EmotionDisplay'
import { useSimulatorContext } from '../context/SimulatorContext'

interface EmotionAnalysisProps {
  text: string
}

export const EmotionAnalysis: React.FC<EmotionAnalysisProps> = ({ text }) => {
  const { dispatch } = useSimulatorContext()

  const handleAnalysisComplete = (result: {
    valence: number
    energy: number
    dominance: number
  }) => {
    dispatch({
      type: 'SET_EMOTION_STATE',
      payload: result,
    })
  }

  return (
    <div className="space-y-4">
      <EmotionDetector
        text={text}
        onAnalysisComplete={handleAnalysisComplete}
      />

      <EmotionDisplay />
    </div>
  )
}
