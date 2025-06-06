# Gitpod Environment Variables Setup

To preserve your exact Cursor setup in Gitpod, you'll need to configure these environment variables in your Gitpod account.

## Required Environment Variables

Go to [Gitpod User Variables](https://gitpod.io/user/variables) and add these variables:

### AI Service API Keys
- `ANTHROPIC_API_KEY` - For Claude models
- `PERPLEXITY_API_KEY` - For Perplexity search
- `OPENAI_API_KEY` - For OpenAI models
- `GOOGLE_API_KEY` - For Google AI models
- `MISTRAL_API_KEY` - For Mistral models
- `AZURE_OPENAI_API_KEY` - For Azure OpenAI
- `OPENROUTER_API_KEY` - For OpenRouter models
- `XAI_API_KEY` - For xAI models
- `OLLAMA_API_KEY` - For Ollama (if using remote)

### MCP Service Keys
- `MAGIC_API_KEY` - For @21st-dev/magic MCP server

### Memory Service
- `MEM0_API_KEY` - For mem0ai memory service
- `DEFAULT_USER_ID` - Default user ID for memory (optional, defaults to "default_user")

### Database and Services
- `DATABASE_URL` - Your database connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## How to Set Up

1. Go to https://gitpod.io/user/variables
2. Click "New Variable" for each environment variable above
3. Set the name and value
4. Set scope to `chadisfaction/pixelated` (or `*/*` for all repositories)
5. Click "Add Variable"

## Variable Scope Options
- `chadisfaction/pixelated` - Only for this repository
- `chadisfaction/*` - For all your repositories
- `*/*` - For all repositories (use with caution)

## Security Notes
- API keys are automatically masked in Gitpod
- Variables are encrypted and only accessible during workspace creation
- Use repository-specific scope when possible for better security

## After Setup
Once variables are configured, your Gitpod workspace will have the same environment as your local Cursor setup, including:
- All MCP servers configured
- AI services available
- Memory service connected
- Database connections ready 