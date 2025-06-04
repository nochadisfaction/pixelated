#!/usr/bin/env python3
"""
Persistent YouTube Transcription Pipeline Runner
Designed to run unattended with comprehensive logging and error recovery
"""

import os
import sys
import time
import json
import signal
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_logging() -> logging.Logger:
    """Setup comprehensive logging"""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create timestamped log file
    log_file = log_dir / f"transcription_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.info(f"🚀 Starting YouTube Transcription Pipeline")
    logger.info(f"📁 Log file: {log_file}")
    
    return logger

def signal_handler(signum, frame, logger):
    """Handle shutdown signals gracefully"""
    logger.info(f"🛑 Received signal {signum}, shutting down gracefully...")
    save_progress_checkpoint()
    sys.exit(0)

def save_progress_checkpoint():
    """Save current progress to resume later"""
    checkpoint_file = Path("transcription_checkpoint.json")
    checkpoint_data = {
        "timestamp": datetime.now().isoformat(),
        "status": "interrupted",
        "last_processed": getattr(save_progress_checkpoint, 'last_processed', None)
    }
    
    with open(checkpoint_file, 'w') as f:
        json.dump(checkpoint_data, f, indent=2)

def load_progress_checkpoint() -> Dict:
    """Load previous progress checkpoint"""
    checkpoint_file = Path("transcription_checkpoint.json")
    if checkpoint_file.exists():
        try:
            with open(checkpoint_file, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def run_transcription_pipeline(playlists: Optional[List[str]] = None, logger: Optional[logging.Logger] = None):
    """Run the transcription pipeline with error recovery"""
    if logger is None:
        logger = setup_logging()
    
    try:
        # Import the pipeline components (assuming they're in the notebook or separate module)
        logger.info("📦 Importing transcription modules...")
        
        # You would need to extract the classes from the notebook into separate .py files
        # For now, this is a template showing the structure
        
        # Load checkpoint
        checkpoint = load_progress_checkpoint()
        logger.info(f"📋 Checkpoint loaded: {checkpoint}")
        
        # Configuration
        config = {
            'WHISPER_MODEL': 'base',
            'USE_FASTER_WHISPER': True,
            'FORCE_CPU': True,
            'LANGUAGE': 'en',
            'WORK_DIR': 'youtube_transcriptions',
            'RESUME': True,
            'CLEANUP_AUDIO': True,
            'PLAYLISTS': playlists or [
                "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4",
                # Add more playlists as needed
            ]
        }
        
        logger.info(f"⚙️ Configuration: {json.dumps(config, indent=2)}")
        
        # Create progress tracking
        total_playlists = len(config['PLAYLISTS'])
        completed_playlists = 0
        
        # Process each playlist
        for i, playlist_url in enumerate(config['PLAYLISTS']):
            logger.info(f"🎵 Processing playlist {i+1}/{total_playlists}: {playlist_url}")
            
            try:
                # Here you would call your actual transcription pipeline
                # result = pipeline.process_playlist(playlist_url)
                
                # For now, simulate processing
                time.sleep(2)  # Remove this in actual implementation
                
                completed_playlists += 1
                save_progress_checkpoint.last_processed = playlist_url
                
                logger.info(f"✅ Completed playlist {i+1}/{total_playlists}")
                
                # Update checkpoint
                checkpoint_data = {
                    "timestamp": datetime.now().isoformat(),
                    "status": "running",
                    "completed_playlists": completed_playlists,
                    "total_playlists": total_playlists,
                    "last_completed": playlist_url
                }
                
                with open("transcription_checkpoint.json", 'w') as f:
                    json.dump(checkpoint_data, f, indent=2)
                
            except Exception as e:
                logger.error(f"❌ Failed to process playlist {playlist_url}: {e}")
                continue
        
        logger.info(f"🎉 Pipeline completed! Processed {completed_playlists}/{total_playlists} playlists")
        
        # Final checkpoint
        final_checkpoint = {
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "completed_playlists": completed_playlists,
            "total_playlists": total_playlists
        }
        
        with open("transcription_checkpoint.json", 'w') as f:
            json.dump(final_checkpoint, f, indent=2)
        
        return True
        
    except Exception as e:
        logger.error(f"💥 Pipeline failed with error: {e}")
        return False

def main():
    """Main entry point"""
    logger = setup_logging()
    
    # Setup signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, lambda s, f: signal_handler(s, f, logger))
    signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s, f, logger))
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Run YouTube Transcription Pipeline Persistently')
    parser.add_argument('--single', type=str, help='Process single playlist URL')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--test', action='store_true', help='Run in test mode')
    
    args = parser.parse_args()
    
    # Determine playlists to process
    playlists = None
    if args.single:
        playlists = [args.single]
        logger.info(f"🎯 Single playlist mode: {args.single}")
    elif args.test:
        playlists = ["https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4"]
        logger.info(f"🧪 Test mode with single playlist")
    
    # Run the pipeline
    success = run_transcription_pipeline(playlists, logger)
    
    if success:
        logger.info("🎊 Pipeline completed successfully!")
        sys.exit(0)
    else:
        logger.error("💀 Pipeline failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 