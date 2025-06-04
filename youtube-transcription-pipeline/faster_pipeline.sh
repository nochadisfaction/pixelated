#!/bin/bash

# Simple, reliable pipeline runner with faster-whisper
# Avoids all recursion issues by creating a clean environment

echo "🚀 Running YouTube transcription pipeline with faster-whisper"
echo "============================================================"

# Get the absolute path to the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verify requirements
if [[ ! -f "$SCRIPT_DIR/pipeline.sh" ]]; then
    echo "❌ Error: pipeline.sh not found in $SCRIPT_DIR"
    exit 1
fi

if [[ ! -f "$SCRIPT_DIR/whisper_wrapper.py" ]]; then
    echo "❌ Error: whisper_wrapper.py not found in $SCRIPT_DIR"
    echo "💡 Run: bash integrate_faster_whisper.sh first"
    exit 1
fi

# Test that faster-whisper is available
python3 -c "import faster_whisper; print('✅ faster-whisper is available')" 2>/dev/null
if [[ $? -ne 0 ]]; then
    echo "📦 Installing faster-whisper..."
    python3 -m pip install faster-whisper
fi

# Create a simple whisper command replacement
TEMP_DIR=$(mktemp -d)
WHISPER_SCRIPT="$TEMP_DIR/whisper"

cat > "$WHISPER_SCRIPT" << EOF
#!/bin/bash
# This script replaces the 'whisper' command with faster-whisper
exec python3 "$SCRIPT_DIR/whisper_wrapper.py" "\$@"
EOF

chmod +x "$WHISPER_SCRIPT"

# Set up cleanup
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Run pipeline with our whisper replacement in PATH
echo "✅ Faster-whisper integration active"
echo "🔄 Starting pipeline..."
echo ""

cd "$SCRIPT_DIR"
PATH="$TEMP_DIR:$PATH" bash pipeline.sh "$@"
RESULT=$?

echo ""
if [[ $RESULT -eq 0 ]]; then
    echo "🎉 Pipeline completed successfully!"
else
    echo "❌ Pipeline failed with exit code: $RESULT"
fi

exit $RESULT