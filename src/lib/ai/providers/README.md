# Modal Provider Integration

This directory contains the implementation of the Modal provider for the AI service. The Modal provider allows you to use custom LLM models deployed on Modal's serverless infrastructure.

## Overview

Modal is a cloud platform that provides convenient, on-demand access to serverless cloud compute from Python scripts on your local computer. It's particularly useful for running custom LLM models without depending on external LLM APIs.

## Setup

1. Install Modal CLI:
   ```bash
   pip install modal
   ```

2. Set up Modal credentials:
   ```bash
   modal setup
   ```

3. Deploy a custom model using the provided script:
   ```bash
   python src/scripts/deploy-modal-model.py --model llama3-8b
   ```

4. Configure environment variables:
   ```
   MODAL_API_URL=https://your-app-name--serve.modal.run
   MODAL_$1=YOUR_API_KEY_HERE
   ```

## Usage

```typescript
import { createAIService } from '../lib/ai'

// Create AI service with Modal provider
const aiService = createAIService({
  modal: {
    baseUrl: process.env.MODAL_API_URL,
    apiKey: process.env.MODAL_API_KEY,
  },
  defaultProvider: 'modal'
})

// Use the service
const response = await aiService.createChatCompletion(
  [
    {
      role: 'system',
      content: 'You are a helpful assistant.'
    },
    {
      role: 'user',
      content: 'Hello, how are you?'
    }
  ],
  {
    model: 'llama3-8b-modal',
    temperature: 0.7,
    maxTokens: 1000
  }
)
```

## Available Models

The following models are pre-configured in the registry:

- `llama3-8b-modal`: LLaMA 3 8B (Modal)
- `llama3-70b-modal`: LLaMA 3 70B (Modal)
- `mistral-7b-modal`: Mistral 7B (Modal)
- `custom-model-modal`: Custom Model (Modal)

## Deployment Script

The `deploy-modal-model.py` script in the `src/scripts` directory allows you to deploy custom models to Modal. It supports various models like LLaMA 3, Mistral, and others.

```bash
# Deploy LLaMA 3 8B
python src/scripts/deploy-modal-model.py --model llama3-8b

# Deploy Mistral 7B
python src/scripts/deploy-modal-model.py --model mistral-7b

# Deploy a custom model
python src/scripts/deploy-modal-model.py --model custom-model --model-id meta-llama/Llama-3-8B-Instruct
```

## Testing

You can test the Modal provider using the provided test page at `/admin/modal-test`. This page allows you to select a model and send a prompt to test the integration.

## Implementation Details

The Modal provider implements the same interface as other providers like OpenAI and Anthropic, making it easy to switch between providers. It supports both streaming and non-streaming responses, and handles errors gracefully.

The provider communicates with the Modal-deployed model using the OpenAI-compatible API, which makes it compatible with the existing AI service infrastructure.
