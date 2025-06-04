#!/bin/bash

# Clean wrapper to run pipeline.sh with faster-whisper
# This script does NOT modify pipeline.sh - it just intercepts whisper calls

echo "🔧 Setting up faster-whisper for pipeline..."

# Verify files exist
if [[ ! -f "pipeline.sh" ]]; then
    echo "❌ Error: pipeline.sh not found"
    exit 1
fi

if [[ ! -f "whisper_wrapper.py" ]]; then
    echo "❌ Error: whisper_wrapper.py not found - creating it..."
    
    cat > whisper_wrapper.py << 'EOF'
#!/usr/bin/env python3
import sys
import os
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('audio_file', help='Audio file to transcribe')
    parser.add_argument('--model', default='base', help='Model size')
    parser.add_argument('--output_dir', default='.', help='Output directory')
    parser.add_argument('--output_format', default='txt', help='Output format')
    parser.add_argument('--language', default='en', help='Language')
    parser.add_argument('--device', default='cpu', help='Device')
    parser.add_argument('--fp16', default='False', help='FP16 (ignored)')
    parser.add_argument('--threads', type=int, default=1, help='Threads')
    parser.add_argument('--verbose', default='False', help='Verbose')
    
    args = parser.parse_args()
    
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("Installing faster-whisper...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
        from faster_whisper import WhisperModel
    
    if not os.path.exists(args.audio_file):
        print(f"Error: Audio file not found: {args.audio_file}")
        sys.exit(1)
    
    try:
        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type="int8" if args.device == "cpu" else "float16",
            num_workers=args.threads
        )
        
        segments, info = model.transcribe(
            args.audio_file,
            language=args.language if args.language != 'auto' else None,
            beam_size=1,
            condition_on_previous_text=False
        )
        
        transcription = ""
        for segment in segments:
            transcription += segment.text + " "
        
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_path = Path(args.audio_file)
        output_file = output_dir / f"{audio_path.stem}.{args.output_format}"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(transcription.strip())
        
        print(f"Transcription saved to: {output_file}")
        
    except Exception as e:
        print(f"Error during transcription: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF
fi

# Test faster-whisper availability
python3 -c "import faster_whisper" 2>/dev/null
if [[ $? -ne 0 ]]; then
    echo "📦 Installing faster-whisper..."
    python3 -m pip install faster-whisper
fi

# Create temporary whisper replacement
TEMP_DIR=$(mktemp -d)
WHISPER_CMD="$TEMP_DIR/whisper"

# Get the absolute path to the current directory where whisper_wrapper.py exists
CURRENT_DIR="$(pwd)"

cat > "$WHISPER_CMD" << EOF
#!/bin/bash
echo "[DEBUG] Faster-whisper called with args: \$@" >&2
echo "[DEBUG] Working directory: \$(pwd)" >&2
echo "[DEBUG] Wrapper path: $CURRENT_DIR/whisper_wrapper.py" >&2
python3 "$CURRENT_DIR/whisper_wrapper.py" "\$@"
RESULT=\$?
echo "[DEBUG] Wrapper exit code: \$RESULT" >&2
exit \$RESULT
EOF

chmod +x "$WHISPER_CMD"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "✅ Faster-whisper ready"
echo "🚀 Running original pipeline.sh..."
echo ""

# Run the original pipeline with whisper intercepted
PATH="$TEMP_DIR:$PATH" ./pipeline.sh "$@"
RESULT=$?

echo ""
if [[ $RESULT -eq 0 ]]; then
    echo "🎉 Pipeline completed successfully with faster-whisper!"
else
    echo "❌ Pipeline exited with code: $RESULT"
fi

exit $RESULT 