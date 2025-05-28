import React, { useState } from 'react'

import RecommendationDisplay from '../ai/RecommendationDisplay'
import type { EnhancedRecommendation } from '../../lib/ai/types/recommendations'

// Styles as a separate object
const styles = {
  recommendationDemo: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  heading: {
    marginBottom: '20px',
    color: '#333',
  },
  controls: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f5f5f5',
    borderRadius: '8px',
  },
  toggleControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
  },
  recommendationContainer: {
    marginBottom: '30px',
  },
  selectionConfirmation: {
    padding: '15px',
    background: '#e6f7ff',
    borderLeft: '4px solid #1890ff',
    borderRadius: '4px',
    marginTop: '20px',
  },
  confirmationHeading: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '16px',
  },
  confirmationText: {
    margin: 0,
    fontWeight: 500,
  },
}

// Media queries would need to be applied differently with this approach
// You could use a library like @emotion/css or create separate styles for mobile

const RecommendationDemo = (): React.ReactNode => {
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<EnhancedRecommendation | null>(null)
  const [showEfficacy, setShowEfficacy] = useState(false)
  const [showPersonalization, setShowPersonalization] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  // Sample recommendation data
  const sampleRecommendations: EnhancedRecommendation[] = [
    {
      id: '1',
      title: 'Daily Mindfulness Meditation',
      description:
        'A structured mindfulness practice to reduce anxiety and increase present-moment awareness.',
      tags: ['anxiety', 'stress', 'mindfulness'],
      efficacyScore: 0.85,
      efficacyDetails: {
        successRate: 0.78,
        averageTimeToImprovement: '2-3 weeks',
        sampleSize: 1200,
        evidenceLevel: 'Strong',
        bestFor: ['generalized anxiety', 'stress management', 'rumination'],
        references: [
          'Smith et al. (2022). "Mindfulness-Based Interventions for Anxiety", Journal of Clinical Psychology',
          'Rodriguez & Chen (2024). "Long-term Efficacy of Brief Mindfulness Practices", Psychological Science',
        ],
      },
      personalizationScore: 0.92,
      personalizationReason:
        'Based on your reported challenges with racing thoughts and difficulty staying present, particularly during work hours.',
      clientContextFactors: [
        'Reported difficulty sleeping due to racing thoughts',
        'Previous positive experience with guided relaxation',
        'Available 15 minutes in morning routine',
      ],

      steps: [
        "Find a quiet place where you won't be disturbed for 10-15 minutes",
        'Sit in a comfortable position with your back straight',
        'Focus your attention on your breath, noticing the sensation of air moving in and out',
        'When your mind wanders (which is natural), gently bring your attention back to your breath',
        'Start with 5 minutes daily, gradually increasing to 15-20 minutes',
      ],

      cautions: [
        'Some people may experience increased anxiety initially when becoming aware of thoughts',
        'Not recommended as a replacement for medication without consulting your healthcare provider',
        'May bring up difficult emotions that should be discussed with your therapist',
      ],

      timeCommitment: '10-15 minutes daily',
      difficulty: 'Easy',
      practiceFrequency: 'Daily, ideally at the same time each day',
      alternatives: [
        {
          id: 'alt1',
          name: 'Body Scan Meditation',
          description:
            'A focused attention practice that involves scanning your body for sensations, tension, and relaxation.',
          suitableFor: [
            'physical tension',
            'somatic anxiety symptoms',
            'sleep difficulties',
          ],

          efficacyRate: 0.72,
        },
        {
          id: 'alt2',
          name: 'Guided Visualization',
          description:
            'Using guided imagery to create calming mental scenarios and reduce anxiety responses.',
          suitableFor: [
            'visual learners',
            'creativity-oriented individuals',
            'panic attacks',
          ],

          efficacyRate: 0.68,
        },
      ],

      mediaResources: [
        {
          id: 'med1',
          title: 'Introduction to Mindfulness',
          type: 'Video',
          description:
            'A beginner-friendly guide to mindfulness meditation techniques.',
          url: 'https://example.com/mindfulness-intro',
          durationMinutes: 12,
          previewImage: 'https://example.com/images/mindfulness-preview.jpg',
        },
        {
          id: 'med2',
          title: 'Daily Calm',
          type: 'App',
          description:
            'Mobile application with guided meditations and progress tracking.',
          url: 'https://example.com/dailycalm-app',
        },
        {
          id: 'med3',
          title: 'The Science of Mindfulness',
          type: 'Article',
          description:
            'Research overview of how mindfulness affects the brain and anxiety responses.',
          url: 'https://example.com/mindfulness-science',
          durationMinutes: 8,
        },
      ],
    },
  ]

  const handleSelect = (recommendation: EnhancedRecommendation) => {
    setSelectedRecommendation(recommendation)
    console.log('Selected recommendation:', recommendation.title)
  }

  return (
    <div style={styles.recommendationDemo}>
      <h2 style={styles.heading}>Recommendation Display Demo</h2>

      <div style={styles.controls}>
        <div style={styles.toggleControls}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={showEfficacy}
              onChange={() => setShowEfficacy(!showEfficacy)}
              style={styles.checkbox}
            />
            Show Efficacy Stats
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={showPersonalization}
              onChange={() => setShowPersonalization(!showPersonalization)}
              style={styles.checkbox}
            />
            Show Personalization Details
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={showAlternatives}
              onChange={() => setShowAlternatives(!showAlternatives)}
              style={styles.checkbox}
            />
            Show Alternatives
          </label>
        </div>
      </div>

      <div style={styles.recommendationContainer}>
        <RecommendationDisplay
          recommendations={sampleRecommendations}
          clientName="Alex Johnson"
          onSelect={handleSelect}
          showEfficacyStats={showEfficacy}
          showPersonalizationDetails={showPersonalization}
          showAlternatives={showAlternatives}
        />
      </div>

      {selectedRecommendation && (
        <div style={styles.selectionConfirmation}>
          <h3 style={styles.confirmationHeading}>Selected Recommendation:</h3>
          <p style={styles.confirmationText}>{selectedRecommendation.title}</p>
        </div>
      )}
    </div>
  )
}

export default RecommendationDemo
