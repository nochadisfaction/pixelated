# Emotion Analysis System

This module provides a comprehensive set of tools for emotion detection, analysis, and visualization with support for personalization and contextual normalization.

## Components

### 1. EmotionDetectionEngine

Detects emotions from various input types using natural language processing and machine learning techniques.

- Text-based emotion detection
- Speech-based emotion detection
- Multimodal integration for comprehensive assessment
- Risk factor identification

### 2. MultidimensionalEmotionMapper

Maps emotions to multi-dimensional space using established models like the Circumplex Model (valence-arousal) and PAD Model (pleasure-arousal-dominance).

- Emotion vector mapping
- Dimensional distribution analysis
- Quadrant determination
- Dominant dimension identification

### 3. PersonalizedBaselineEstablishment

Creates and maintains personalized emotional baselines for individuals to provide context-aware emotion analysis.

- Individual-specific emotional baseline modeling
- Contextual normalization of emotional expressions
- Cultural and demographic considerations
- Baseline updating and confidence tracking

### 4. EmotionAlertSystem

Detects potential crisis situations based on emotion analysis and generates appropriate alerts.

- Multiple alert types and levels
- Pattern recognition across analyses
- Recommended action suggestions
- Alert acknowledgment system

### 5. EmotionAnalysisAPI

Provides a facade for the various emotion analysis components, simplifying integration with client applications.

- Simplified interfaces for emotion analysis
- Unified access to all emotion analysis capabilities
- Service registration for dependency injection

## Database Schema

The system includes a comprehensive database schema for storing emotion analysis data:

- `emotion_analyses`: Core table for storing emotion analysis results
- `dimensional_emotion_mappings`: Storage for dimensional mappings
- `emotional_baselines`: User-specific emotional baselines
- `baseline_personalization`: Personalization parameters for baseline establishment
- `emotional_trends`: Aggregated historical data for trend analysis

Row-Level Security policies are implemented for all tables to ensure secure access to emotion data.

## Getting Started

### Installation

The emotion analysis system is included in the core library and requires no additional installation.

### Basic Usage Examples

#### Analyzing emotions from text

```typescript
import { EmotionAnalysisAPI } from '../../lib/ai/emotions'

// Create an instance of the API
const emotionAPI = new EmotionAnalysisAPI()

// Analyze emotions from text
const result = await emotionAPI.analyzeEmotionsFromText(
  'I am feeling excited but also a bit nervous about this presentation.'
)

console.log(result.analysis.emotions)
console.log(result.dimensionalMapping.quadrant)
```

#### Creating a personalized baseline

```typescript
import { EmotionAnalysisAPI, BaselinePersonalizationParams } from '../../lib/ai/emotions'

const emotionAPI = new EmotionAnalysisAPI()

// Assuming you have previous emotion analyses for this user
const previousAnalyses = [/* ... */]

// Personalization parameters
const personalizationParams: BaselinePersonalizationParams = {
  demographics: {
    age: 35,
    culture: 'east asian',
    language: 'en'
  },
  personalFactors: {
    communicationStyle: 'reserved',
    emotionalExpressiveness: 0.6
  }
}

// Create the baseline
const baseline = emotionAPI.createEmotionalBaseline(
  'user-123',
  previousAnalyses,
  personalizationParams
)
```

#### Detecting potential crisis situations

```typescript
import { EmotionAlertSystem } from '../../lib/ai/emotions'

// Create the alert system
const alertSystem = new EmotionAlertSystem()

// Analyze an emotion analysis for potential crisis situations
const alert = alertSystem.detectCrisis(
  emotionAnalysis,  // Current emotion analysis
  'user-123',       // User ID
  previousAnalyses  // Optional previous analyses for pattern detection
)

if (alert) {
  console.log(`ALERT (${alert.level}): ${alert.title}`)
  console.log(`Description: ${alert.description}`)
  console.log('Recommended actions:')
  alert.recommendedActions?.forEach(action => console.log(`- ${action}`))
}
```

## Integration with Other Systems

### Client-Side Integration

For client-side integration, use the `EmotionAnalysisAPI` class to access all emotion analysis functionality. Create custom React hooks or services as needed for your specific UI requirements.

### Server-Side Integration

On the server side, implement API endpoints that utilize the emotion analysis components and interact with the database schema for storing and retrieving emotion data.

Example API endpoint for emotion analysis:

```typescript
import { EmotionAnalysisAPI } from '../../lib/ai/emotions'

export const POST = async (req: Request) => {
  try {
    const { text, userId, context } = await req.json()

    const emotionAPI = new EmotionAnalysisAPI()
    const result = await emotionAPI.analyzeEmotionsFromText(text, context)

    // Store the result in the database if needed

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

## Extending the System

### Adding New Emotion Types

To add new emotion types, update the `EmotionType` type in `types.ts` and add corresponding mappings in `MultidimensionalEmotionMapper.ts`.

### Implementing Real NLP Models

The current implementation uses placeholder mock functions for emotion detection. To implement real NLP models:

1. Replace the mock implementation in `EmotionDetectionEngine.ts`
2. Implement model loading and inference
3. Update confidence and intensity calculations based on model outputs

## Security Considerations

- All emotion data is protected by Row-Level Security policies in the database
- Sensitive data is only accessible to authorized users
- Client applications should enforce proper authorization before displaying emotion analysis results
- Consider the ethical implications of emotion analysis and ensure proper consent

## Performance Optimization

- Consider caching frequently accessed data like emotional baselines
- For large-scale deployments, implement batch processing for emotion analyses
- Use appropriate indexes on database tables for efficient queries

## License

This module is part of the core platform and follows the same licensing terms.

## Support and Contributions

For issues, feature requests, or contributions, please follow the standard project contribution guidelines.
