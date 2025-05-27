# TogetherAI Setup for MentalLLaMA Integration

This guide explains how to set up TogetherAI to host the MentalLLaMA-chat-13B model for mental health analysis.

## Prerequisites

- A TogetherAI account (sign up at [together.ai](https://www.together.ai))
- Access to the MentalLLaMA model weights or checkpoints
- Basic knowledge of API usage and environment configuration

## Steps to Set Up TogetherAI Hosting

### 1. Create a TogetherAI Account

If you don't already have one, sign up for an account at [together.ai](https://www.together.ai).

### 2. Obtain API Key

1. Log in to your TogetherAI account
2. Navigate to the API section or dashboard
3. Generate a new API key
4. Copy and save this key securely - you'll need it for configuration

### 3. Deploy MentalLLaMA-13B Model

#### Option A: Use Pre-hosted Model (Recommended)

If the MentalLLaMA-chat-13B model is already available in TogetherAI's model library:

1. Navigate to the Models section in your TogetherAI dashboard
2. Search for "MentalLLaMA-chat-13B" or similar naming
3. Enable the model for your account
4. Note the exact model identifier (e.g., `togethercomputer/MentalLLaMA-chat-13B`)

#### Option B: Custom Upload (For Custom Fine-tuned Models)

If you have a custom fine-tuned version of MentalLLaMA-chat-13B:

1. Navigate to the Model Upload section
2. Follow TogetherAI's instructions for uploading custom models
3. Provide the model weights and configuration files
4. Wait for the model to be deployed and ready
5. Note the assigned model identifier

### 4. Test API Access

Before integrating with your application, test the API access using TogetherAI's playground or a simple curl command:

```bash
curl -X POST "https://api.together.xyz/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "togethercomputer/MentalLLaMA-chat-13B",
    "messages": [
      {"role": "system", "content": "You are a mental health classifier system based on MentalLLaMA."},
      {"role": "user", "content": "I've been feeling really down lately, and I'm having trouble getting out of bed."}
    ],
    "temperature": 0.1,
    "max_tokens": 1024
  }'
```

### 5. Configure Your Environment

Add the TogetherAI API details to your environment variables:

```bash
# Enable direct integration with MentalLLaMA-chat-13B model
USE_MENTAL_LLAMA_13B_MODEL=true

# TogetherAI API endpoint
MENTAL_LLAMA_13B_API_URL=https://api.together.xyz/v1

# Your TogetherAI API key
MENTAL_LLAMA_13B_API_KEY=your_together_api_key_here

# The exact model identifier from TogetherAI
MENTAL_LLAMA_13B_MODEL_NAME=togethercomputer/MentalLLaMA-chat-13B
```

## Rate Limits and Costs

Be aware of TogetherAI's rate limits and pricing:

- Check your account tier for request limits
- Monitor usage to avoid unexpected costs
- Consider implementing rate limiting in your application
- Set up budget alerts to avoid overages

## Troubleshooting

If you encounter issues with the TogetherAI integration:

1. Verify your API key is valid and has not expired
2. Check that you have sufficient credits or billing set up
3. Ensure the model name is correct
4. Look for any error messages in the API response
5. Check TogetherAI status page for service issues
6. Contact TogetherAI support for platform-specific issues

## Security Considerations

- Never expose your API key in client-side code
- Store the API key securely using environment variables or a secrets manager
- Implement proper authentication for your application
- Consider using TogetherAI's IP allowlisting if available
- Encrypt sensitive data in transit and at rest

## Next Steps

After setting up TogetherAI hosting, proceed to:

1. Test the integration using the test-model.js CLI tool
2. Implement containerization for deployment
3. Set up monitoring and logging for the integration
4. Develop a fallback strategy for API outages
