#!/bin/bash

# Check if Python is installed
if ! command -v python3 &>/dev/null; then
	echo "Python 3 is not installed. Please install Python 3 first."
	exit 1
fi

# Install dependencies (if they're not already installed)
echo "Installing required packages..."
python3 -m pip install -r requirements-mem0.txt

# Set environment variables if not already set
if [ -z "${MEM0_API_KEY}" ]; then
	echo "MEM0_API_KEY not set, setting from .env file."
	# Try to load from .env file if it exists
	if [ -f .env ]; then
		MEM0_API_KEY=$(grep MEM0_API_KEY .env | cut -d '=' -f2- | tr -d '"')
		export MEM0_API_KEY
		echo "Loaded MEM0_API_KEY from .env file."
	fi
fi

# Make the server script executable
chmod +x mem0_mcp_server.py

# Run the MCP server
echo "Starting mem0 MCP server..."
python3 mem0_mcp_server.py "$@"
