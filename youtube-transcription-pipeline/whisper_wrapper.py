#!/usr/bin/env python3
"""
Wrapper script to replace 'whisper' command with faster-whisper
Compatible with existing pipeline calls
"""
import sys
import os
import argparse
from pathlib import Path
import time

def main():
    start_time = time.time()
    print(f"[DEBUG] Faster-whisper wrapper starting at {time.strftime('%H:%M:%S')}", file=sys.stderr)
    
    # Parse arguments to be compatible with whisper command
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
    print(f"[DEBUG] Processing file: {args.audio_file}", file=sys.stderr)
    print(f"[DEBUG] Model: {args.model}, Language: {args.language}", file=sys.stderr)
    
    # Import faster-whisper
    try:
        from faster_whisper import WhisperModel
        print(f"[DEBUG] faster-whisper imported successfully", file=sys.stderr)
    except ImportError:
        print("Installing faster-whisper...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
        from faster_whisper import WhisperModel
    
    # Check if file exists
    if not os.path.exists(args.audio_file):
        print(f"Error: Audio file not found: {args.audio_file}")
        sys.exit(1)
    
    file_size = os.path.getsize(args.audio_file) / (1024 * 1024)  # MB
    print(f"[DEBUG] Audio file size: {file_size:.2f} MB", file=sys.stderr)
    
    try:
        # Initialize model with optimized settings
        print(f"[DEBUG] Initializing model...", file=sys.stderr)
        model_init_start = time.time()
        
        # Use tiny model for speed, regardless of what pipeline requests
        model_size = "tiny" if args.model in ["tiny", "base", "small"] else "base"
        
        model = WhisperModel(
            model_size,
            device=args.device,
            compute_type="int8",  # Always use int8 for speed
            num_workers=1,  # Single worker to avoid overhead
            local_files_only=False,
            download_root=None
        )
        
        model_init_time = time.time() - model_init_start
        print(f"[DEBUG] Model initialized in {model_init_time:.2f}s", file=sys.stderr)
        
        # Transcribe with aggressive speed optimizations
        print(f"[DEBUG] Starting transcription...", file=sys.stderr)
        transcribe_start = time.time()
        
        segments, info = model.transcribe(
            args.audio_file,
            language=args.language if args.language != 'auto' else None,
            beam_size=1,  # Fastest beam size
            condition_on_previous_text=False,  # Disable for speed
            temperature=0.0,  # Deterministic output
            compression_ratio_threshold=2.4,  # Default
            log_prob_threshold=-1.0,  # Default
            no_speech_threshold=0.6,  # Skip silent parts
            initial_prompt=None,  # No prompt for speed
            word_timestamps=False,  # Disable word timestamps for speed
            vad_filter=True,  # Enable VAD for speed
            vad_parameters=dict(min_silence_duration_ms=500)  # Skip short silences
        )
        
        # Collect transcription efficiently
        print(f"[DEBUG] Processing segments...", file=sys.stderr)
        transcription_parts = []
        segment_count = 0
        
        for segment in segments:
            transcription_parts.append(segment.text)
            segment_count += 1
            if segment_count % 100 == 0:  # Progress every 100 segments
                print(f"[DEBUG] Processed {segment_count} segments...", file=sys.stderr)
        
        transcription = " ".join(transcription_parts).strip()
        
        transcribe_time = time.time() - transcribe_start
        print(f"[DEBUG] Transcription completed in {transcribe_time:.2f}s ({segment_count} segments)", file=sys.stderr)
        
        # Save output
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_path = Path(args.audio_file)
        output_file = output_dir / f"{audio_path.stem}.{args.output_format}"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(transcription)
        
        total_time = time.time() - start_time
        chars_per_second = len(transcription) / total_time if total_time > 0 else 0
        
        print(f"[DEBUG] Total processing time: {total_time:.2f}s", file=sys.stderr)
        print(f"[DEBUG] Transcription length: {len(transcription)} characters", file=sys.stderr)
        print(f"[DEBUG] Speed: {chars_per_second:.1f} chars/second", file=sys.stderr)
        print(f"Transcription saved to: {output_file}")
        
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
