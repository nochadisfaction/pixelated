# MentalLLaMA Integration

This directory contains an integration with [MentalLLaMA](https://github.com/SteveKGYang/MentalLLaMA), the first open-source instruction following large language model for interpretable mental health analysis.

## Overview

MentalLLaMA enhances our EmotionLLaMA implementation by providing:

1. **Mental Health Classification**: Detect potential mental health concerns from text
2. **Interpretable Explanations**: Evidence-based explanations for classifications
3. **Multi-stage Analysis**: Two-stage approach (classification and explanation)
4. **Quality Assessment**: Metrics for evaluating explanation quality

## Components

- `MentalLLaMAAdapter` - TypeScript adapter for MentalLLaMA functionality
- `MentalLLaMAFactory` - Factory for creating MentalLLaMA adapters
- `MentalLLaMAPythonBridge` - Bridge to execute original MentalLLaMA Python code
- `MentalLLaMAModelProvider` - Direct integration with MentalLLaMA-chat models (7B and 13B)

## Integration Options

### 1. Standard Integration

Use the MentalLLaMA adapter with your existing EmotionLlama provider:

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter from environment variables
const { adapter } = await MentalLLaMAFactory.createFromEnv()

// Analyze text for mental health concerns
const analysis = await adapter.analyzeMentalHealth(text)
console.log(`Category: ${analysis.mentalHealthCategory}`)
console.log(`Confidence: ${analysis.confidence}`)
console.log(`Explanation: ${analysis.explanation}`)
```

### 2. Direct Model Integration

For improved performance and accuracy, you can integrate directly with MentalLLaMA models (7B or 13B):

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter with direct model integration
// Environment variables determine which model is used (7B or 13B)
const { adapter, modelProvider } = await MentalLLaMAFactory.createFromEnv()

// Check if direct model integration is available
if (adapter.isDirectModelAvailable()) {
  const modelTier = modelProvider?.getModelTier() // '7B' or '13B'
  console.log(`Using direct MentalLLaMA-chat-${modelTier} model integration`)
}

// Analyze text (automatically uses the direct model if available)
const analysis = await adapter.analyzeMentalHealth(text)
```

### 3. Python Bridge Integration

For advanced features, you can use the Python bridge to interact with the original MentalLLaMA codebase:

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter with Python bridge
const { adapter, pythonBridge } = await MentalLLaMAFactory.createFromEnv()

// Use Python bridge for advanced functionality
await pythonBridge.initialize()
const testData = await pythonBridge.loadTestData('instruction')
```

## API Usage

### Mental Health Analysis

```typescript
// Analyze text for mental health indicators
const analysis = await adapter.analyzeMentalHealth(text)

// Analysis with expert guidance
const expertAnalysis = await adapter.analyzeMentalHealthWithExpertGuidance(text)
```

### Explanation Generation

```typescript
// Generate an explanation for a mental health classification
const explanation = await adapter.generateExplanation(text, 'depression')

// Generate explanation with expert guidance
const expertExplanation = await adapter.generateExplanationWithExpertGuidance(
  text,
  'anxiety'
)
```

### Quality Evaluation

```typescript
// Evaluate the quality of an explanation
const quality = await adapter.evaluateExplanationQuality(explanation)
console.log(`Overall quality: ${quality.overall}/5`)
```

## Command-Line Tools

A command-line tool is available for analyzing text with MentalLLaMA:

```bash
# Test the MentalLLaMA-chat-7B model integration
node src/lib/ai/mental-llama/tools/test-mental-llama-7b.js "I've been feeling down lately"

# Test the MentalLLaMA-chat-13B model integration
node src/lib/ai/mental-llama/tools/test-mental-llama-13b.js "I've been feeling down lately"

# Interactive mode (no text argument)
node src/lib/ai/mental-llama/tools/test-mental-llama-13b.js
```

## Environment Variables

### Basic Configuration

```bash
# Required environment variables
EMOTION_LLAMA_API_URL=https://api.example.com
EMOTION_LLAMA_API_KEY=your-api-key
FHE_KEY_PATH=/path/to/fhe/key.pem
FHE_CERT_PATH=/path/to/fhe/cert.pem

# Optional Python bridge variables
MENTAL_LLAMA_PATH=/path/to/MentalLLaMA
PYTHON_PATH=python3
```

### Direct Model Integration

#### For 7B Model

```bash
# Enable direct integration with MentalLLaMA-chat-7B model
USE_MENTAL_LLAMA_7B_MODEL=true

# API endpoint for the hosted model
MENTAL_LLAMA_7B_API_URL=https://api.together.xyz/v1

# API key (optional, falls back to EMOTION_LLAMA_API_KEY)
MENTAL_LLAMA_7B_API_KEY=your-model-api-key

# Model name (optional, default is MentalLLaMA-chat-7B)
MENTAL_LLAMA_7B_MODEL_NAME=MentalLLaMA-chat-7B
```

#### For 13B Model

```bash
# Enable direct integration with MentalLLaMA-chat-13B model
USE_MENTAL_LLAMA_13B_MODEL=true

# API endpoint for the hosted model (TogetherAI recommended)
MENTAL_LLAMA_13B_API_URL=https://api.together.xyz/v1

# API key (optional, falls back to EMOTION_LLAMA_API_KEY)
MENTAL_LLAMA_13B_API_KEY=your-together-api-key-here

# Model name (optional, default is MentalLLaMA-chat-13B)
MENTAL_LLAMA_13B_MODEL_NAME=togethercomputer/MentalLLaMA-chat-13B
```

## TogetherAI Integration

For the best performance with the 13B model, we recommend using TogetherAI hosting:

1. Create a TogetherAI account at [together.ai](https://www.together.ai)
2. Obtain an API key from your account dashboard
3. Configure environment variables as shown in the example above
4. Test the integration using the provided CLI tools

Detailed setup instructions can be found in [TogetherAI Setup Guide](./docs/together-ai-setup.md).

## 7B vs 13B Model Comparison

| Feature | 7B Model | 13B Model |
|---------|----------|-----------|
| Parameters | 7 billion | 13 billion |
| Context Window | 2048 tokens | 4096 tokens |
| Accuracy | Good | Better |
| Classification Granularity | Standard | Enhanced |
| Explanation Quality | Good | More detailed |
| Resource Requirements | Lower | Higher |
| Response Speed | Faster | Slightly slower |
| Nuance Recognition | Basic | Advanced |
| Context Understanding | Good | Superior |

The 13B model generally provides higher quality classifications and more detailed explanations, but requires more resources and may have slightly slower response times. For applications requiring maximum accuracy and detail, the 13B model is recommended. For applications where response time is critical, the 7B model may be more suitable.

## Model Selection Strategy

The factory will automatically select the best available model in this order:
1. MentalLLaMA-chat-13B model (if configured)
2. MentalLLaMA-chat-7B model (if configured)
3. EmotionLlama provider (fallback)

## API Endpoints

The integration comes with built-in API endpoints:

- `/api/ai/mental-health/analyze` - Analyze text for mental health indicators
- `/api/ai/mental-health/status` - Check the status of MentalLLaMA integration

Documentation for these endpoints is available at:
- `/api/ai/mental-health/analyze/` - Interactive documentation and examples

## Demo Components

Example components to showcase MentalLLaMA capabilities:

- `MentalLLaMA13BDemo.astro` - Demo component for the 13B model integration
- `MentalHealthAnalyzerCard.astro` - Reusable analyzer component

## Disclaimer

As stated in the MentalLLaMA repository, this integration is provided for **non-clinical research only**. None of the material constitutes actual diagnosis or advice, and help-seekers should get assistance from professional mental health services.

## Supported Mental Health Categories

The integration now supports comprehensive detection and analysis of the following mental health categories:

- **Depression** - Major depressive disorder
- **Anxiety** - Generalized anxiety disorder
- **PTSD** - Post-traumatic stress disorder
- **Suicidality** - Suicide risk assessment
- **Bipolar Disorder** - Mood episodes with mania and depression
- **OCD** - Obsessive-compulsive disorder
- **Eating Disorders** - Various eating-related disorders
- **Social Anxiety** - Social anxiety disorder
- **Panic Disorder** - Panic attacks and related anxiety

Each category includes specific detection patterns, evidence extraction rules, and expert-written explanations.

## Usage

### TypeScript Implementation

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter from environment variables
const { adapter } = await MentalLLaMAFactory.createFromEnv()

// Analyze text for mental health indicators
const analysisResult = await adapter.analyzeMentalHealth(text)
console.log(`Mental Health Issue: ${analysisResult.hasMentalHealthIssue}`)
console.log(`Category: ${analysisResult.mentalHealthCategory}`)
console.log(`Explanation: ${analysisResult.explanation}`)
console.log(`Supporting Evidence:`, analysisResult.supportingEvidence)

// Using expert-guided explanations (NEW)
const expertAnalysis = await adapter.analyzeMentalHealthWithExpertGuidance(text)
console.log(`Expert-guided explanation: ${expertAnalysis.explanation}`)
console.log(`Expert guidance used: ${expertAnalysis.expertGuided}`)

// Evaluate explanation quality
const qualityMetrics = await adapter.evaluateExplanationQuality(analysisResult.explanation)
console.log(`Quality: ${qualityMetrics.overall.toFixed(2)}/5.00`)
```

### Python Bridge

For advanced features, you can use the Python bridge to interact with the original MentalLLaMA codebase:

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter with Python bridge
const { adapter, pythonBridge } = await MentalLLaMAFactory.createFromEnv()

// Run IMHI benchmark evaluation
if (pythonBridge) {
  const result = await pythonBridge.runIMHIEvaluation({
    modelPath: '/path/to/model',
    outputPath: './imhi-results',
    testDataset: 'IMHI',
    isLlama: true
  })

  // Evaluate explanation quality using BART-score
  await pythonBridge.evaluateExplanationQuality({
    generatedDirName: 'responses',
    scoreMethod: 'bart_score'
  })
}
```

## Command Line Tool

A command-line tool is available for analyzing text with MentalLLaMA:

```bash
# List supported mental health categories
ts-node src/scripts/mental-llama-analyze.ts --list-categories

# Analyze text for mental health indicators
ts-node src/scripts/mental-llama-analyze.ts --text "I've been feeling really sad and hopeless lately. Nothing seems worth doing anymore." --evaluate-explanation

# Use expert-guided explanations (NEW)
ts-node src/scripts/mental-llama-analyze.ts --text "I've been feeling really sad and hopeless lately. Nothing seems worth doing anymore." --expert

# Analyze text from a file
ts-node src/scripts/mental-llama-analyze.ts --file ./patient-notes.txt --output-path ./analysis-results.json

# Run IMHI benchmark evaluation (requires Python bridge)
ts-node src/scripts/mental-llama-analyze.ts --imhi --model-path /path/to/model --output-path ./imhi-results
```

## Environment Variables

The following environment variables are required:

- `EMOTION_LLAMA_API_URL` - URL for the EmotionLLaMA API
- `EMOTION_LLAMA_API_KEY` - API key for EmotionLLaMA
- `FHE_KEY_PATH` - Path to FHE key file
- `FHE_CERT_PATH`
