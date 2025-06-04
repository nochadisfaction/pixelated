# 🎥 YouTube Transcription Pipeline - Jupyter Notebook

A comprehensive Jupyter notebook for downloading audio from YouTube playlists and transcribing them using OpenAI Whisper or faster-whisper. Perfect for Google Colab, Kaggle, or any Jupyter environment.

## 📋 Overview

This notebook combines all the functionality from the original bash pipeline into a single, portable Jupyter notebook that can run on:
- **Google Colab** (recommended for GPU acceleration)
- **Kaggle Notebooks**
- **Local Jupyter environments**
- **JupyterLab**
- **VS Code with Jupyter extension**

## 🚀 Quick Start

### Option 1: Google Colab (Recommended)

1. **Upload the notebook**: 
   - Go to [Google Colab](https://colab.research.google.com/)
   - Click "Upload" and select `YouTube_Transcription_Pipeline.ipynb`

2. **Enable GPU (Optional but recommended)**:
   - Go to Runtime → Change runtime type
   - Set Hardware accelerator to "GPU"
   - Click Save

3. **Run the setup cells**:
   - Execute the first few cells to install dependencies
   - The notebook will automatically install all required packages

4. **Start transcribing**:
   - Run the test setup cell to verify everything works
   - Choose your processing option (single playlist, custom selection, or all)

### Option 2: Kaggle

1. **Create a new notebook**:
   - Go to [Kaggle](https://www.kaggle.com/)
   - Create a new notebook
   - Copy and paste the notebook content or upload the `.ipynb` file

2. **Enable internet access**:
   - In notebook settings, turn on "Internet" access
   - This is required for downloading YouTube videos

3. **Run the notebook**:
   - Execute cells in order
   - The setup will handle all dependencies

### Option 3: Local Environment

1. **Install Jupyter**:
   ```bash
   pip install jupyter notebook
   ```

2. **Start Jupyter**:
   ```bash
   jupyter notebook
   ```

3. **Open the notebook**:
   - Navigate to `YouTube_Transcription_Pipeline.ipynb`
   - Run cells in order

## 📦 What's Included

The notebook contains all the functionality from the original pipeline:

### 🎯 Core Features
- **28 Pre-configured YouTube playlists** ready to process
- **Automatic dependency installation** (yt-dlp, whisper, faster-whisper)
- **Cross-platform filename sanitization** for problematic Unicode characters
- **Resume capability** - skip already processed files
- **Comprehensive logging** with colored output and timestamps
- **Progress tracking** with estimated time remaining
- **Automatic cleanup** of audio files after transcription
- **Summary report generation** in Markdown format

### 🛠️ Technical Components

1. **Installation & Setup**
   - Automatic package installation
   - Dependency verification
   - Environment testing

2. **Configuration**
   - Whisper model selection (tiny, base, small, medium, large)
   - faster-whisper vs OpenAI Whisper selection
   - CPU/GPU processing options
   - Language settings
   - Directory structure setup

3. **Utility Functions**
   - Colored logging system
   - Filename sanitization for cross-platform compatibility
   - Directory management
   - Playlist ID extraction

4. **YouTube Download System**
   - Playlist information extraction
   - Individual video download with yt-dlp
   - Error handling and retry logic
   - Progress tracking

5. **Transcription Engine**
   - Support for both OpenAI Whisper and faster-whisper
   - Optimized settings for speed and accuracy
   - Automatic model loading
   - Resume capability for interrupted processing

6. **Main Pipeline**
   - Complete end-to-end processing
   - Statistics tracking
   - Progress reporting
   - Summary generation

7. **Interactive Controls**
   - Single playlist processing
   - Custom playlist selection
   - Batch processing of all playlists
   - Setup testing and troubleshooting

## 🎮 Usage Examples

### Process a Single Playlist
```python
# Uncomment and run:
single_playlist_url = "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4"
result = run_single_playlist(single_playlist_url)
print(f"Processed {result['stats']['successful_transcriptions']} transcriptions")
```

### Process Custom Selection
```python
# Uncomment and run:
custom_playlists = [
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4",
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35"
]
result = run_custom_playlists(custom_playlists)
print(f"Processed {len(custom_playlists)} playlists")
```

### Process All Playlists (Warning: Takes Hours!)
```python
# Uncomment and run (WARNING: This processes all 28 playlists):
# result = run_all_playlists()
# print(f"Total transcriptions: {result['stats']['successful_transcriptions']}")
```

## ⚙️ Configuration Options

### Whisper Models
- **tiny**: Fastest, least accurate (~39 MB)
- **base**: Good balance of speed/accuracy (~74 MB) - **Default**
- **small**: Better accuracy (~244 MB)
- **medium**: High accuracy (~769 MB)
- **large**: Best accuracy (~1550 MB)

### Performance Settings
```python
# In the Configuration cell, modify:
config.WHISPER_MODEL = "base"        # Change model size
config.USE_FASTER_WHISPER = True     # Use faster-whisper (recommended)
config.FORCE_CPU = True              # Set to False for GPU acceleration
config.LANGUAGE = "en"               # Language code or "auto"
config.CLEANUP_AUDIO = True          # Delete audio files after transcription
```

## 📊 Output Structure

The notebook creates the following directory structure:

```
youtube_transcriptions/
├── transcripts/              # All transcription files
│   ├── PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4/
│   │   ├── video1.txt
│   │   ├── video2.txt
│   │   └── ...
│   ├── PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35/
│   │   └── ...
│   └── TRANSCRIPTION_SUMMARY.md     # Summary report
├── logs/                     # Processing logs
│   └── pipeline_20231201_143022.log
├── audio/                    # Temporary audio files (auto-cleaned)
└── temp/                     # Temporary processing files
```

## 🔧 Troubleshooting

### Common Issues

1. **"yt-dlp not found"**
   - Run the installation cell again
   - Restart the runtime if needed

2. **"ffmpeg not found"**
   - The notebook tries to install ffmpeg automatically
   - On some systems, manual installation may be required

3. **Out of memory errors**
   - Use a smaller Whisper model (tiny or base)
   - Enable `config.FORCE_CPU = True`
   - Process fewer playlists at once

4. **Download failures**
   - Check internet connection
   - Some videos may be region-restricted or unavailable
   - The pipeline will continue with available videos

5. **Slow transcription**
   - Use faster-whisper (enabled by default)
   - Use GPU acceleration in Colab
   - Use smaller Whisper models

### Performance Tips

1. **For Google Colab**:
   - Enable GPU runtime for faster transcription
   - Mount Google Drive to save results persistently:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   # Change work directory to Drive
   config.WORK_DIR = "/content/drive/MyDrive/youtube_transcriptions"
   ```

2. **For Kaggle**:
   - Enable GPU accelerator in settings
   - Use the persistent storage for large datasets

3. **For Local Use**:
   - Ensure you have sufficient disk space
   - Consider using SSD storage for better performance

## 📝 Playlist Information

The notebook includes 28 pre-configured YouTube playlists:

| Playlist ID | URL |
|-------------|-----|
| PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4 | https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4 |
| PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35 | https://www.youtube.com/playlist?list=PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35 |
| ... | (26 more playlists) |

You can easily add your own playlists by modifying the `config.PLAYLISTS` list in the configuration cell.

## 🚨 Important Notes

### Resource Usage
- **Processing all 28 playlists can take several hours to days** depending on:
  - Number of videos in each playlist
  - Whisper model size
  - Hardware capabilities
  - Internet speed

### Storage Requirements
- **Audio files**: Temporarily stored, then deleted (if cleanup enabled)
- **Transcripts**: Text files, typically 1-10KB each
- **Logs**: Detailed processing logs for debugging

### Rate Limiting
- YouTube may rate-limit downloads if processing too aggressively
- The pipeline includes reasonable delays and error handling
- Consider processing playlists in smaller batches

## 🤝 Contributing

To modify or extend the notebook:

1. **Add new playlists**: Modify the `config.PLAYLISTS` list
2. **Change output format**: Modify the `transcribe_file` method to save as JSON, SRT, etc.
3. **Add metadata**: Extend the transcriber to include video metadata
4. **Custom processing**: Add your own processing functions

## 📄 License

This notebook is provided as-is for educational and research purposes. Please respect YouTube's Terms of Service and copyright laws when using this tool.

## 🆘 Support

If you encounter issues:

1. **Run the troubleshooting cell** in the notebook
2. **Check the logs** in the `logs/` directory
3. **Verify your internet connection** and YouTube access
4. **Try with a smaller test playlist** first

---

**Happy transcribing! 🎉**

*This notebook combines the power of yt-dlp and Whisper in a user-friendly, portable format perfect for research, accessibility, and content analysis projects.* 