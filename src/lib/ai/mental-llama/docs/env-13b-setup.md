# MentalLLaMA-chat-13B Environment Setup

This document provides instructions for setting up environment variables for direct integration with the MentalLLaMA-chat-13B model.

## Overview

Direct integration with the MentalLLaMA-chat-13B model allows for improved mental health analysis with better classification accuracy and more detailed explanations compared to the 7B model. The 13B model has more parameters and a larger context window, making it more suitable for complex mental health analysis.

## Environment Variables

To enable direct integration with the MentalLLaMA-chat-13B model, set the following environment variables:

```bash
# Enable direct integration with MentalLLaMA-chat-13B model
USE_MENTAL_LLAMA_13B_MODEL=true

# API endpoint for the hosted model
# For TogetherAI, use their API endpoint:
MENTAL_LLAMA_13B_API_URL=https://api.together.xyz/v1

# API key for TogetherAI or other hosting service
# If not provided, falls back to EMOTION_LLAMA_API_KEY
MENTAL_LLAMA_13B_API_KEY=your-api-key-here

# Optional: Custom model name if different from default
# Default: MentalLLaMA-chat-13B
MENTAL_LLAMA_13B_MODEL_NAME=MentalLLaMA-chat-13B
```

## Model Selection Strategy

When both 7B and 13B models are configured, the system will automatically prioritize the 13B model for improved accuracy. The selection order is:

1. MentalLLaMA-chat-13B model (if configured)
2. MentalLLaMA-chat-7B model (if configured)
3. EmotionLlama provider (fallback)

## Testing the Setup

After setting up the environment variables, you can test the 13B model integration using the provided CLI tool:

```bash
# Test the 13B model integration
node src/lib/ai/mental-llama/cli/test-model.js --model 13B
```

The test will verify that the 13B model is properly configured and can be used for mental health analysis.

## Performance Considerations

The 13B model provides better accuracy and more detailed explanations but requires more computational resources and may have slightly higher latency than the 7B model. Consider the following when choosing which model to enable:

| Factor | 7B Model | 13B Model |
|--------|----------|-----------|
| Response Time | Faster | Slightly slower |
| Accuracy | Good | Better |
| Context Understanding | Good | Better |
| Resource Usage | Lower | Higher |
| Cost (API calls) | Lower | Higher |

For production environments where response time is critical, you may want to enable both models and implement dynamic selection based on the specific use case or user preferences.

## Troubleshooting

If you encounter issues with the 13B model integration, check the following:

1. Verify that `USE_MENTAL_LLAMA_13B_MODEL` is set to `true`
2. Ensure that `MENTAL_LLAMA_13B_API_URL` points to a valid API endpoint
3. Confirm that the API key is valid and has access to the 13B model
4. Check server logs for detailed error messages
5. Verify network connectivity to the API endpoint
6. Ensure sufficient resources are available for running the larger model

For more detailed troubleshooting, refer to the MentalLLaMA documentation or contact the API provider.
