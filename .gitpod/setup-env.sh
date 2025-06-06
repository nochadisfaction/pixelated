#!/bin/bash

# Setup script for Gitpod environment variables
# This script should be run during Gitpod initialization

echo "Setting up Pixelated environment variables for Gitpod..."

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# AI Service API Keys (set these in Gitpod environment variables)
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
GOOGLE_API_KEY=${GOOGLE_API_KEY}
MISTRAL_API_KEY=${MISTRAL_API_KEY}
AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
XAI_API_KEY=${XAI_API_KEY}
OLLAMA_API_KEY=${OLLAMA_API_KEY}

# Magic API Key for MCP
MAGIC_API_KEY=${MAGIC_API_KEY}

# Memory service
MEM0_API_KEY=${MEM0_API_KEY}
DEFAULT_USER_ID=${DEFAULT_USER_ID:-default_user}

# Database and other services
DATABASE_URL=${DATABASE_URL}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Development settings
NODE_ENV=development
ASTRO_TELEMETRY_DISABLED=1
EOF
    echo ".env file created successfully"
fi

# Copy Cursor rules to Gitpod location
echo "Copying Cursor rules for AI assistant..."
mkdir -p .vscode
if [ -d ".cursor/rules" ]; then
    cp -r .cursor/rules .vscode/
    echo "Cursor rules copied to .vscode/rules"
fi

# Copy MCP configuration
echo "Setting up MCP configuration..."
if [ -f ".gitpod/mcp.json" ]; then
    mkdir -p .vscode
    cp .gitpod/mcp.json .vscode/mcp.json
    echo "MCP configuration copied"
fi

# Copy VS Code settings
if [ -f ".gitpod/settings.json" ]; then
    mkdir -p .vscode
    cp .gitpod/settings.json .vscode/settings.json
    echo "VS Code settings copied"
fi

# Set up conda environment activation
echo "Setting up conda environment..."
source /home/gitpod/miniconda/etc/profile.d/conda.sh
conda create -n pixel python=3.12 -y 2>/dev/null || echo "pixel environment already exists"
conda activate pixel

# Install Python dependencies if requirements exist
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

echo "Gitpod environment setup complete!"
echo ""
echo "To manually activate the conda environment, run:"
echo "conda activate pixel"
echo ""
echo "To use the correct Node version, run:"
echo "nvm use 22.16.0" 