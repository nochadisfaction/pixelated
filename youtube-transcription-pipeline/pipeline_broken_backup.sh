#!/bin/bash

# Pipeline wrapper that uses faster-whisper instead of openai-whisper
# This script modifies whisper calls on-the-fly

# Function to replace whisper commands with our wrapper
run_whisper() {
    echo "🚀 Using faster-whisper instead of openai-whisper"
    python3 "$(dirname "$0")/whisper_wrapper.py" "$@"
}

# Export the function so it can be used as a command
export -f run_whisper

# Create a temporary whisper script that calls our wrapper
TEMP_WHISPER_DIR=$(mktemp -d)
TEMP_WHISPER_SCRIPT="$TEMP_WHISPER_DIR/whisper"

cat > "$TEMP_WHISPER_SCRIPT" << 'INNER_EOF'
#!/bin/bash
exec python3 "$(dirname "$0")/../whisper_wrapper.py" "$@"
INNER_EOF

chmod +x "$TEMP_WHISPER_SCRIPT"

# Add temp directory to PATH so our whisper is found first
export PATH="$TEMP_WHISPER_DIR:$PATH"

# Now run the original pipeline
echo "🔄 Running pipeline with faster-whisper..."
./pipeline.sh "$@"

# Cleanup
rm -rf "$TEMP_WHISPER_DIR"
