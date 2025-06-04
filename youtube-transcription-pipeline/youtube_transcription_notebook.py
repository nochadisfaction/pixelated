# %% [markdown]
# # 🎥 YouTube Playlist Transcription Pipeline
# 
# This notebook provides a complete pipeline for downloading audio from YouTube playlists and transcribing them using OpenAI Whisper or faster-whisper.
# 
# ## Features
# - Download audio from multiple YouTube playlists
# - Transcribe using Whisper (OpenAI) or faster-whisper
# - Handle filename sanitization for cross-platform compatibility
# - Resume interrupted processing
# - Comprehensive logging and progress tracking
# 
# ## Requirements
# - Python 3.7+
# - yt-dlp for YouTube downloads
# - whisper or faster-whisper for transcription
# - ffmpeg for audio processing

# %% [markdown]
# ## 📦 Installation and Setup

# %%
# Install required packages
import subprocess
import sys

def install_package(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install required packages
packages = [
    "yt-dlp",
    "openai-whisper", 
    "faster-whisper",
    "tqdm"
]

print("Installing required packages...")
for package in packages:
    try:
        install_package(package)
        print(f"✅ {package} installed")
    except Exception as e:
        print(f"❌ Failed to install {package}: {e}")

# Install ffmpeg (for Colab/Linux environments)
try:
    subprocess.run(["apt", "update"], capture_output=True)
    subprocess.run(["apt", "install", "-y", "ffmpeg"], capture_output=True)
    print("✅ ffmpeg installed")
except:
    print("⚠️ Could not install ffmpeg automatically. Please install manually if needed.")

# %%
# Import required libraries
import os
import sys
import time
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
import shutil
import unicodedata
from typing import List, Dict, Optional, Tuple

# Try to import whisper libraries
try:
    import whisper
    WHISPER_AVAILABLE = True
    print("✅ OpenAI Whisper available")
except ImportError:
    WHISPER_AVAILABLE = False
    print("❌ OpenAI Whisper not available")

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
    print("✅ Faster-whisper available")
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    print("❌ Faster-whisper not available")

# %% [markdown]
# ## 🎯 Configuration

# %%
# Configuration
class Config:
    # Whisper settings
    WHISPER_MODEL = "base"  # tiny, base, small, medium, large
    USE_FASTER_WHISPER = True  # Set to False to use OpenAI Whisper
    FORCE_CPU = True  # Set to False to use GPU if available
    LANGUAGE = "en"  # Language code or "auto" for auto-detection
    
    # Directory settings
    WORK_DIR = "youtube_transcriptions"
    AUDIO_DIR = "audio"
    TRANSCRIPTS_DIR = "transcripts"
    LOGS_DIR = "logs"
    TEMP_DIR = "temp"
    
    # Processing settings
    RESUME = True  # Resume interrupted processing
    CLEANUP_AUDIO = True  # Delete audio files after transcription
    MAX_RETRIES = 3  # Maximum retries for failed downloads
    
    # YouTube playlist URLs
    PLAYLISTS = [
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL8YrmEVRCZt2DhMM76cBR2",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIKWQo5BZx-peSJ2xs2XzzZ",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIGmIbJg7y74Pz0iFpT_WBs",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLo5-JYZ4xX10LZYdBXSOWO",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoKklld5-q-foFnApCvvFbfS",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJZI0n7gupCafbnjIhl1PT4",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLdvaCn9E73SsVnDJ4WQlBk",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJ4OzYmSbEGpAjlt_XZB97l",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLXM4TIz8yZcsHMLPCwdz8c",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJItM9a3-8kqr9zC73fwJPP",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL2RXPaiWc8q1yl68f6E40w",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJjcgaVzYiWo6V9_gUZhPEn",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJmX4RpWMyQwzkZbMfSQRYt",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoKs5NaWJtSV7EKS37aLlKuX",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoI54OEebUuESZssg-3jI0e6",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIZzY3KLAQHDQgkwbIat6SJ",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoK82WCyPghzCHBUAVmH5VGO",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLMRSgGwhAH-TT0LStYtF7R",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLNLNIAVM0ks8nU3fSKaFV0",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLz_e8J9DSWNwnRsrDNMair",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLTyIsWcHcwdDNSs3Tc7kjd",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL81XgB4Pfl7pMhddi9nkXp",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJkYPent92OETZKS01Tq22_",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoI1vYrje_j_Hd48Dc-nHK0V",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJEKK5DdfMqlMcLgKURTpuY",
        "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJSfVa6j9yHyFE8wHDVlmEc"
    ]

config = Config()
print(f"📁 Work directory: {config.WORK_DIR}")
print(f"🎤 Whisper model: {config.WHISPER_MODEL}")
print(f"⚡ Using faster-whisper: {config.USE_FASTER_WHISPER}")
print(f"🎯 Total playlists: {len(config.PLAYLISTS)}")

# %% [markdown]
# ## 🛠️ Utility Functions

# %%
class Logger:
    """Simple logger with color support"""
    
    COLORS = {
        'RED': '\033[0;31m',
        'GREEN': '\033[0;32m',
        'YELLOW': '\033[0;33m',
        'BLUE': '\033[0;34m',
        'CYAN': '\033[0;36m',
        'MAGENTA': '\033[0;35m',
        'WHITE': '\033[0;37m',
        'GRAY': '\033[0;90m',
        'NC': '\033[0m'  # No Color
    }
    
    def __init__(self, log_file: Optional[str] = None):
        self.log_file = log_file
        
    def log(self, message: str, color: str = 'WHITE'):
        """Log message with timestamp and color"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        
        # Print with color
        color_code = self.COLORS.get(color, self.COLORS['WHITE'])
        print(f"{color_code}{log_entry}{self.COLORS['NC']}")
        
        # Write to file if specified
        if self.log_file:
            try:
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(f"{log_entry}\n")
            except:
                pass

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for cross-platform compatibility"""
    # Replace problematic Unicode characters
    filename = filename.replace('？', '?')  # Unicode question mark to ASCII
    filename = filename.replace('⧸', '/')   # Unicode division slash to forward slash
    filename = filename.replace('｜', '|')   # Unicode vertical bar to ASCII
    filename = filename.replace('\0', '')   # Remove null bytes
    
    # Replace problematic characters with safe alternatives
    filename = re.sub(r'[？?]', 'Q', filename)
    filename = re.sub(r'[⧸/]', 'slash', filename)
    filename = re.sub(r'[｜|]', 'pipe', filename)
    filename = re.sub(r'[&]', 'and', filename)
    filename = re.sub(r'[""''""'']', 'quote', filename)
    filename = re.sub(r'[…]', 'dot', filename)
    filename = re.sub(r'[—–]', '-', filename)
    
    # Remove any remaining non-ASCII characters
    try:
        filename = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    except:
        filename = re.sub(r'[^\x00-\x7F]+', '', filename)
    
    # Replace multiple spaces/underscores with single ones
    filename = re.sub(r'[\s_]+', '_', filename)
    
    # Remove leading/trailing spaces and underscores
    filename = filename.strip(' _')
    
    # Ensure filename isn't empty
    if not filename:
        filename = f"audio_file_{int(time.time())}"
    
    return filename

def extract_playlist_id(url: str) -> str:
    """Extract playlist ID from YouTube URL"""
    match = re.search(r'list=([a-zA-Z0-9_-]+)', url)
    return match.group(1) if match else "unknown"

def setup_directories(base_dir: str) -> Dict[str, Path]:
    """Setup directory structure"""
    base_path = Path(base_dir)
    dirs = {
        'base': base_path,
        'audio': base_path / config.AUDIO_DIR,
        'transcripts': base_path / config.TRANSCRIPTS_DIR,
        'logs': base_path / config.LOGS_DIR,
        'temp': base_path / config.TEMP_DIR
    }
    
    for dir_path in dirs.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    
    return dirs

# %% [markdown]
# ## 📥 YouTube Download Functions

# %%
class YouTubeDownloader:
    """Handle YouTube playlist downloads"""
    
    def __init__(self, logger: Logger, audio_dir: Path):
        self.logger = logger
        self.audio_dir = audio_dir
        
    def get_playlist_info(self, playlist_url: str) -> Dict:
        """Get playlist information"""
        try:
            cmd = [
                'yt-dlp',
                '--dump-json',
                '--flat-playlist',
                playlist_url
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                self.logger.log(f"❌ Failed to get playlist info: {result.stderr}", "RED")
                return {}
            
            # Parse JSON lines
            videos = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    try:
                        videos.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            
            return {
                'videos': videos,
                'count': len(videos)
            }
            
        except Exception as e:
            self.logger.log(f"❌ Error getting playlist info: {e}", "RED")
            return {}
    
    def download_audio(self, video_url: str, output_dir: Path, playlist_id: str) -> Optional[Path]:
        """Download audio from a single video"""
        try:
            # Create playlist-specific directory
            playlist_dir = output_dir / playlist_id
            playlist_dir.mkdir(exist_ok=True)
            
            cmd = [
                'yt-dlp',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '0',  # Best quality
                '--output', str(playlist_dir / '%(title)s.%(ext)s'),
                '--no-playlist',
                video_url
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Find the downloaded file
                for file in playlist_dir.glob('*.mp3'):
                    return file
            else:
                self.logger.log(f"❌ Download failed: {result.stderr}", "RED")
                
        except Exception as e:
            self.logger.log(f"❌ Download error: {e}", "RED")
            
        return None
    
    def download_playlist(self, playlist_url: str) -> List[Path]:
        """Download all videos from a playlist"""
        playlist_id = extract_playlist_id(playlist_url)
        self.logger.log(f"🎵 Processing playlist: {playlist_id}", "CYAN")
        
        # Get playlist info
        info = self.get_playlist_info(playlist_url)
        if not info or not info['videos']:
            self.logger.log(f"❌ No videos found in playlist", "RED")
            return []
        
        self.logger.log(f"📊 Found {info['count']} videos", "BLUE")
        
        downloaded_files = []
        
        for i, video in enumerate(tqdm(info['videos'], desc="Downloading")):
            video_url = f"https://www.youtube.com/watch?v={video['id']}"
            self.logger.log(f"⬇️ Downloading {i+1}/{info['count']}: {video.get('title', 'Unknown')}", "YELLOW")
            
            audio_file = self.download_audio(video_url, self.audio_dir, playlist_id)
            if audio_file:
                downloaded_files.append(audio_file)
                self.logger.log(f"✅ Downloaded: {audio_file.name}", "GREEN")
            else:
                self.logger.log(f"❌ Failed to download: {video.get('title', 'Unknown')}", "RED")
        
        return downloaded_files

# %% [markdown]
# ## 🎤 Transcription Functions

# %%
class WhisperTranscriber:
    """Handle audio transcription using Whisper"""
    
    def __init__(self, logger: Logger, model_name: str = "base", use_faster: bool = True, force_cpu: bool = True):
        self.logger = logger
        self.model_name = model_name
        self.use_faster = use_faster
        self.force_cpu = force_cpu
        self.model = None
        
    def load_model(self):
        """Load the Whisper model"""
        if self.model is not None:
            return
            
        self.logger.log(f"🔄 Loading {self.model_name} model...", "YELLOW")
        
        try:
            if self.use_faster and FASTER_WHISPER_AVAILABLE:
                device = "cpu" if self.force_cpu else "auto"
                self.model = WhisperModel(
                    self.model_name,
                    device=device,
                    compute_type="int8",
                    num_workers=1
                )
                self.logger.log(f"✅ Faster-whisper model loaded", "GREEN")
            elif WHISPER_AVAILABLE:
                self.model = whisper.load_model(self.model_name)
                self.logger.log(f"✅ OpenAI Whisper model loaded", "GREEN")
            else:
                raise Exception("No Whisper implementation available")
                
        except Exception as e:
            self.logger.log(f"❌ Failed to load model: {e}", "RED")
            raise
    
    def transcribe_file(self, audio_file: Path, output_dir: Path) -> Optional[Path]:
        """Transcribe a single audio file"""
        try:
            self.load_model()
            
            # Create output filename
            output_file = output_dir / f"{audio_file.stem}.txt"
            
            # Skip if already exists and resume is enabled
            if config.RESUME and output_file.exists():
                self.logger.log(f"⏭️ Skipping existing: {output_file.name}", "GRAY")
                return output_file
            
            self.logger.log(f"🎤 Transcribing: {audio_file.name}", "CYAN")
            start_time = time.time()
            
            if self.use_faster and FASTER_WHISPER_AVAILABLE:
                # Use faster-whisper
                segments, info = self.model.transcribe(
                    str(audio_file),
                    language=config.LANGUAGE if config.LANGUAGE != 'auto' else None,
                    beam_size=1,
                    condition_on_previous_text=False,
                    temperature=0.0,
                    no_speech_threshold=0.6,
                    word_timestamps=False,
                    vad_filter=True
                )
                
                # Collect transcription
                transcription_parts = []
                for segment in segments:
                    transcription_parts.append(segment.text)
                
                transcription = " ".join(transcription_parts).strip()
                
            else:
                # Use OpenAI Whisper
                result = self.model.transcribe(
                    str(audio_file),
                    language=config.LANGUAGE if config.LANGUAGE != 'auto' else None
                )
                transcription = result["text"].strip()
            
            # Save transcription
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(transcription)
            
            elapsed = time.time() - start_time
            self.logger.log(f"✅ Transcribed in {elapsed:.2f}s: {output_file.name}", "GREEN")
            
            return output_file
            
        except Exception as e:
            self.logger.log(f"❌ Transcription failed: {e}", "RED")
            return None

# %% [markdown]
# ## 🚀 Main Pipeline

# %%
class TranscriptionPipeline:
    """Main transcription pipeline"""
    
    def __init__(self):
        self.dirs = setup_directories(config.WORK_DIR)
        self.logger = Logger(self.dirs['logs'] / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        self.downloader = YouTubeDownloader(self.logger, self.dirs['audio'])
        self.transcriber = WhisperTranscriber(
            self.logger, 
            config.WHISPER_MODEL, 
            config.USE_FASTER_WHISPER, 
            config.FORCE_CPU
        )
        
        self.stats = {
            'total_playlists': 0,
            'total_videos': 0,
            'successful_downloads': 0,
            'successful_transcriptions': 0,
            'failed_downloads': 0,
            'failed_transcriptions': 0
        }
    
    def process_playlist(self, playlist_url: str) -> Dict:
        """Process a single playlist"""
        playlist_id = extract_playlist_id(playlist_url)
        self.logger.log(f"🎯 Starting playlist: {playlist_id}", "MAGENTA")
        
        # Create transcript directory for this playlist
        transcript_dir = self.dirs['transcripts'] / playlist_id
        transcript_dir.mkdir(exist_ok=True)
        
        playlist_stats = {
            'playlist_id': playlist_id,
            'url': playlist_url,
            'downloads': 0,
            'transcriptions': 0,
            'failed': 0
        }
        
        try:
            # Download audio files
            audio_files = self.downloader.download_playlist(playlist_url)
            playlist_stats['downloads'] = len(audio_files)
            self.stats['successful_downloads'] += len(audio_files)
            
            # Transcribe audio files
            for audio_file in tqdm(audio_files, desc=f"Transcribing {playlist_id}"):
                transcript_file = self.transcriber.transcribe_file(audio_file, transcript_dir)
                
                if transcript_file:
                    playlist_stats['transcriptions'] += 1
                    self.stats['successful_transcriptions'] += 1
                else:
                    playlist_stats['failed'] += 1
                    self.stats['failed_transcriptions'] += 1
                
                # Cleanup audio file if requested
                if config.CLEANUP_AUDIO and audio_file.exists():
                    try:
                        audio_file.unlink()
                        self.logger.log(f"🗑️ Cleaned up: {audio_file.name}", "GRAY")
                    except:
                        pass
            
            self.logger.log(f"✅ Completed playlist {playlist_id}: {playlist_stats['transcriptions']} transcriptions", "GREEN")
            
        except Exception as e:
            self.logger.log(f"❌ Failed to process playlist {playlist_id}: {e}", "RED")
            playlist_stats['failed'] += 1
        
        return playlist_stats
    
    def run(self, playlist_urls: Optional[List[str]] = None) -> Dict:
        """Run the complete pipeline"""
        if playlist_urls is None:
            playlist_urls = config.PLAYLISTS
        
        self.logger.log(f"🚀 Starting transcription pipeline", "MAGENTA")
        self.logger.log(f"📊 Processing {len(playlist_urls)} playlists", "BLUE")
        
        start_time = time.time()
        playlist_results = []
        
        for i, playlist_url in enumerate(playlist_urls):
            self.logger.log(f"📋 Playlist {i+1}/{len(playlist_urls)}", "CYAN")
            
            result = self.process_playlist(playlist_url)
            playlist_results.append(result)
            
            # Show progress
            elapsed = time.time() - start_time
            avg_time = elapsed / (i + 1)
            remaining = avg_time * (len(playlist_urls) - i - 1)
            
            self.logger.log(f"⏱️ Progress: {i+1}/{len(playlist_urls)} | Elapsed: {elapsed/60:.1f}m | ETA: {remaining/60:.1f}m", "BLUE")
        
        # Generate summary
        total_time = time.time() - start_time
        self.generate_summary(playlist_results, total_time)
        
        return {
            'stats': self.stats,
            'playlists': playlist_results,
            'total_time': total_time
        }
    
    def generate_summary(self, playlist_results: List[Dict], total_time: float):
        """Generate and save summary report"""
        summary_file = self.dirs['transcripts'] / "TRANSCRIPTION_SUMMARY.md"
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("# YouTube Playlist Transcription Summary\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Playlists Processed:** {len(playlist_results)}\n")
            f.write(f"**Total Processing Time:** {total_time/3600:.2f} hours\n\n")
            
            f.write("## Statistics\n\n")
            f.write(f"- **Total Downloads:** {self.stats['successful_downloads']}\n")
            f.write(f"- **Total Transcriptions:** {self.stats['successful_transcriptions']}\n")
            f.write(f"- **Failed Downloads:** {self.stats['failed_downloads']}\n")
            f.write(f"- **Failed Transcriptions:** {self.stats['failed_transcriptions']}\n\n")
            
            f.write("## Playlists\n\n")
            for result in playlist_results:
                f.write(f"- **{result['playlist_id']}**: {result['transcriptions']} transcriptions\n")
                f.write(f"  - URL: {result['url']}\n")
                f.write(f"  - Directory: `transcripts/{result['playlist_id']}/`\n\n")
        
        self.logger.log(f"📄 Summary saved to: {summary_file}", "GREEN")

# %% [markdown]
# ## 🎮 Interactive Controls

# %%
def run_single_playlist(playlist_url: str):
    """Run pipeline for a single playlist"""
    pipeline = TranscriptionPipeline()
    result = pipeline.run([playlist_url])
    return result

def run_all_playlists():
    """Run pipeline for all configured playlists"""
    pipeline = TranscriptionPipeline()
    result = pipeline.run()
    return result

def run_custom_playlists(playlist_urls: List[str]):
    """Run pipeline for custom list of playlists"""
    pipeline = TranscriptionPipeline()
    result = pipeline.run(playlist_urls)
    return result

def test_setup():
    """Test the setup and configuration"""
    print("🧪 Testing setup...")
    
    # Test yt-dlp
    try:
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ yt-dlp version: {result.stdout.strip()}")
        else:
            print("❌ yt-dlp not working")
    except:
        print("❌ yt-dlp not found")
    
    # Test whisper
    if WHISPER_AVAILABLE:
        print("✅ OpenAI Whisper available")
    else:
        print("❌ OpenAI Whisper not available")
    
    if FASTER_WHISPER_AVAILABLE:
        print("✅ Faster-whisper available")
    else:
        print("❌ Faster-whisper not available")
    
    # Test directories
    dirs = setup_directories(config.WORK_DIR)
    print(f"✅ Directories created: {list(dirs.keys())}")
    
    print("🎉 Setup test complete!")

# %% [markdown]
# ## 🚀 Usage Examples

# %%
# Test the setup first
test_setup()

# %% [markdown]
# ### Example 1: Process a Single Playlist
# 
# Uncomment and run the cell below to process just one playlist:

# %%
# # Process a single playlist
# single_playlist_url = "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4"
# result = run_single_playlist(single_playlist_url)
# print(f"Processed {result['stats']['successful_transcriptions']} transcriptions")

# %% [markdown]
# ### Example 2: Process All Configured Playlists
# 
# **Warning: This will process all 28 playlists and may take several hours!**
# 
# Uncomment and run the cell below to process all playlists:

# %%
# # Process all playlists (WARNING: This may take hours!)
# # result = run_all_playlists()
# # print(f"Total transcriptions: {result['stats']['successful_transcriptions']}")
# # print(f"Total time: {result['total_time']/3600:.2f} hours")

# %% [markdown]
# ### Example 3: Process Custom Playlists
# 
# Process a custom selection of playlists:

# %%
# # Process custom selection of playlists
# custom_playlists = [
#     "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4",
#     "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35"
# ]
# result = run_custom_playlists(custom_playlists)
# print(f"Processed {len(custom_playlists)} playlists")

# %% [markdown]
# ## 📊 Results and Analysis

# %%
def analyze_results():
    """Analyze transcription results"""
    transcripts_dir = Path(config.WORK_DIR) / config.TRANSCRIPTS_DIR
    
    if not transcripts_dir.exists():
        print("❌ No transcripts directory found. Run the pipeline first.")
        return
    
    total_transcripts = 0
    total_size = 0
    playlist_stats = {}
    
    for playlist_dir in transcripts_dir.iterdir():
        if playlist_dir.is_dir():
            transcript_files = list(playlist_dir.glob("*.txt"))
            playlist_stats[playlist_dir.name] = len(transcript_files)
            total_transcripts += len(transcript_files)
            
            for file in transcript_files:
                total_size += file.stat().st_size
    
    print(f"📊 Analysis Results:")
    print(f"   Total transcripts: {total_transcripts}")
    print(f"   Total size: {total_size / 1024 / 1024:.2f} MB")
    print(f"   Playlists processed: {len(playlist_stats)}")
    
    print(f"\n📋 Per-playlist breakdown:")
    for playlist_id, count in sorted(playlist_stats.items()):
        print(f"   {playlist_id}: {count} transcripts")

# Run analysis if transcripts exist
analyze_results()

# %% [markdown]
# ## 🔧 Troubleshooting

# %%
def troubleshoot():
    """Run troubleshooting checks"""
    print("🔧 Running troubleshooting checks...\n")
    
    # Check Python version
    print(f"🐍 Python version: {sys.version}")
    
    # Check required packages
    packages = ['yt_dlp', 'whisper', 'faster_whisper', 'tqdm']
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} not installed")
    
    # Check ffmpeg
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True)
        if result.returncode == 0:
            print("✅ ffmpeg available")
        else:
            print("❌ ffmpeg not working")
    except:
        print("❌ ffmpeg not found")
    
    # Check disk space
    try:
        import shutil
        total, used, free = shutil.disk_usage(".")
        print(f"💾 Disk space: {free // (1024**3)} GB free")
    except:
        print("❌ Could not check disk space")
    
    print("\n🎉 Troubleshooting complete!")

# Run troubleshooting
troubleshoot()

# %% [markdown]
# ## 📝 Notes and Tips
# 
# ### Performance Tips:
# 1. **Use faster-whisper** for better performance (enabled by default)
# 2. **Use smaller models** (tiny, base) for faster processing
# 3. **Enable cleanup** to save disk space
# 4. **Process playlists individually** for better control
# 
# ### Troubleshooting:
# 1. **If downloads fail**: Check internet connection and YouTube availability
# 2. **If transcription fails**: Try a smaller Whisper model
# 3. **If out of memory**: Enable CPU-only mode or use a smaller model
# 4. **If files not found**: Check that yt-dlp and ffmpeg are installed
# 
# ### Customization:
# 1. **Change models**: Modify `config.WHISPER_MODEL`
# 2. **Add playlists**: Add URLs to `config.PLAYLISTS`
# 3. **Change output format**: Modify the transcriber to save as JSON, SRT, etc.
# 4. **Add metadata**: Extend the transcriber to include video metadata
# 
# ### For Colab/Kaggle:
# 1. **Mount Google Drive** to save results persistently
# 2. **Use GPU runtime** for faster transcription (set `config.FORCE_CPU = False`)
# 3. **Monitor resource usage** to avoid timeouts
# 4. **Download results** before session ends

print("🎉 YouTube Transcription Pipeline notebook ready!")
print("📖 Read the notes above for usage tips and troubleshooting.")
print("🚀 Start by running test_setup() and then choose your processing option.") 