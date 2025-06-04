#!/usr/bin/env python3
"""
Quick test script to verify faster-whisper is working
"""
import sys
import os
import time
from pathlib import Path
import urllib.request

class WhisperTestError(Exception):
    """Custom exception for whisper test failures"""
    pass

def create_sample_audio_file():
    """Create or download a sample audio file for testing"""
    # Create test directory
    test_dir = Path("test_audio")
    test_dir.mkdir(exist_ok=True)
    
    sample_file = test_dir / "sample.mp3"
    
    # If we already have a sample file, use it
    if sample_file.exists():
        return sample_file
    
    # Try to download a small sample audio file (public domain)
    sample_url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"
    
    try:
        print("📥 Downloading sample audio file for testing...")
        urllib.request.urlretrieve(sample_url, sample_file)
        print(f"✅ Sample audio downloaded: {sample_file}")
        return sample_file
    except Exception as e:
        print(f"⚠️  Could not download sample audio: {e}")
        raise WhisperTestError("❌ No test audio available. Please place an MP3 file in test_audio/sample.mp3")

def find_test_audio_file():
    """Find a test audio file, raising exception if none found"""
    # First try the remote audio directory
    audio_dir = Path("youtube_transcriptions/audio")
    if audio_dir.exists():
        audio_files = list(audio_dir.rglob("*.mp3"))
        if audio_files:
            return audio_files[0]
    
    # If no remote files, try to create/find a local test file
    return create_sample_audio_file()

def initialize_whisper_model():
    """Initialize the whisper model and return it with timing info"""
    print("🚀 Initializing tiny model...")
    start_time = time.time()
    
    from faster_whisper import WhisperModel
    
    model = WhisperModel(
        "tiny",
        device="cpu",
        compute_type="int8",
        num_workers=1
    )
    
    init_time = time.time() - start_time
    print(f"⏱️  Model initialized in {init_time:.2f}s")
    
    return model

def transcribe_audio_sample(model, audio_file):
    """Transcribe first 30 seconds of audio file"""
    print("🎙️  Testing transcription (first 30s)...")
    transcribe_start = time.time()
    
    segments, info = model.transcribe(
        str(audio_file),
        language="en",
        beam_size=1,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )
    
    # Collect segments up to 30 seconds
    text_parts = []
    for segment in segments:
        text_parts.append(segment.text)
        if segment.end > 30:  # Stop after 30 seconds
            break
    
    transcribe_time = time.time() - transcribe_start
    transcription = " ".join(text_parts).strip()
    
    print(f"⏱️  Transcription completed in {transcribe_time:.2f}s")
    print(f"📝 Text length: {len(transcription)} characters")
    print(f"🔤 Sample: {transcription[:100]}...")
    
    return transcription

def validate_transcription(transcription):
    """Validate that transcription meets minimum quality requirements"""
    if not transcription:
        raise WhisperTestError("❌ Transcription test FAILED - no output")
    
    if len(transcription) <= 10:
        raise WhisperTestError("❌ Transcription test FAILED - output too short")
    
    print("✅ Transcription test PASSED")
    return True

def test_faster_whisper():
    """Main test function with structured error handling"""
    try:
        from faster_whisper import WhisperModel
        print("✅ faster-whisper imported successfully")
        
        # Find test file
        test_file = find_test_audio_file()
        print(f"🎵 Testing with: {test_file.name}")
        
        file_size = test_file.stat().st_size / (1024 * 1024)
        print(f"📊 File size: {file_size:.2f} MB")
        
        # Initialize model
        model = initialize_whisper_model()
        
        # Transcribe audio
        transcription = transcribe_audio_sample(model, test_file)
        
        # Validate results
        validate_transcription(transcription)
        
        return True
        
    except WhisperTestError as e:
        print(str(e))
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing faster-whisper setup...")
    success = test_faster_whisper()
    sys.exit(0 if success else 1) 