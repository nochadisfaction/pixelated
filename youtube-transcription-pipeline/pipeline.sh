#!/bin/bash

# YouTube Playlist Transcription Pipeline - Filename-Safe Version
# Automatically downloads audio from YouTube playlists and transcribes them using OpenAI Whisper

set -e  # Exit on error

# Default parameters
WHISPER_MODEL="base"  # Changed from "medium" to "base" for faster processing
WORK_DIR="youtube_transcriptions"
COOKIES_FILE=""
RESUME=true
FORCE_CPU=true  # Changed from false to true - force CPU by default

# Color codes for output
declare -A COLORS=(
    ["RED"]='\033[0;31m'
    ["GREEN"]='\033[0;32m'
    ["YELLOW"]='\033[0;33m'
    ["BLUE"]='\033[0;34m'
    ["CYAN"]='\033[0;36m'
    ["MAGENTA"]='\033[0;35m'
    ["WHITE"]='\033[0;37m'
    ["GRAY"]='\033[0;90m'
    ["NC"]='\033[0m'  # No Color
)

# Global statistics
TOTAL_VIDEOS=0
COMPLETED_VIDEOS=0
SKIPPED_VIDEOS=0

# Directories
AUDIO_DIR=""
TRANSCRIPTS_DIR=""
LOGS_DIR=""
TEMP_DIR=""
LOG_FILE=""

# YouTube playlist URLs
PLAYLISTS=(
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLN7UfGKJJxFJhvvys8Sfv4"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJBqhmA3nZfYIXSfhtu2B35"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL8YrmEVRCZt2DhMM76cBR2"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIKWQo5BZx-peSJ2xs2XzzZ"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIGmIbJg7y74Pz0iFpT_WBs"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLo5-JYZ4xX10LZYdBXSOWO"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoKklld5-q-foFnApCvvFbfS"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJZI0n7gupCafbnjIhl1PT4"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLdvaCn9E73SsVnDJ4WQlBk"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJ4OzYmSbEGpAjlt_XZB97l"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLXM4TIz8yZcsHMLPCwdz8c"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJItM9a3-8kqr9zC73fwJPP"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL2RXPaiWc8q1yl68f6E40w"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJjcgaVzYiWo6V9_gUZhPEn"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJmX4RpWMyQwzkZbMfSQRYt"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoKs5NaWJtSV7EKS37aLlKuX"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoI54OEebUuESZssg-3jI0e6"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoIZzY3KLAQHDQgkwbIat6SJ"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoK82WCyPghzCHBUAVmH5VGO"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLMRSgGwhAH-TT0LStYtF7R"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLNLNIAVM0ks8nU3fSKaFV0"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLz_e8J9DSWNwnRsrDNMair"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoLTyIsWcHcwdDNSs3Tc7kjd"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoL81XgB4Pfl7pMhddi9nkXp"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJkYPent92OETZKS01Tq22_"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoI1vYrje_j_Hd48Dc-nHK0V"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJEKK5DdfMqlMcLgKURTpuY"
    "https://www.youtube.com/playlist?list=PLpvbEN3KkqoJSfVa6j9yHyFE8wHDVlmEc"
)

# Function to sanitize filename for processing
sanitize_filename() {
    local filename="$1"
    # Replace problematic Unicode characters
    filename=$(echo "$filename" | sed 's/？/?/g')  # Unicode question mark to ASCII
    filename=$(echo "$filename" | sed 's/⧸/\//g')  # Unicode division slash to forward slash
    filename=$(echo "$filename" | sed 's/｜/|/g')   # Unicode vertical bar to ASCII
    filename=$(echo "$filename" | tr -d '\0')      # Remove null bytes
    echo "$filename"
}

# Enhanced function to check if filename has problematic characters
has_problematic_chars() {
    local filename="$1"
    
    # Only flag files with specific known problematic Unicode characters
    # DO NOT flag normal ASCII: letters, numbers, underscores, hyphens, spaces, periods
    
    # Check for Unicode division slash ⧸ (U+29F8)
    if [[ "$filename" == *"⧸"* ]]; then
        return 0
    fi
    
    # Check for Unicode question mark ？ (U+FF1F)
    if [[ "$filename" == *"？"* ]]; then
        return 0
    fi
    
    # Check for Unicode vertical bar ｜ (U+FF5C)  
    if [[ "$filename" == *"｜"* ]]; then
        return 0
    fi
    
    # Check for Unicode quotes and dashes that break tools
    if [[ "$filename" == *"""* ]] || [[ "$filename" == *"""* ]] || \
       [[ "$filename" == *"'"* ]] || [[ "$filename" == *"'"* ]] || \
       [[ "$filename" == *"…"* ]] || [[ "$filename" == *"—"* ]] || \
       [[ "$filename" == *"–"* ]]; then
        return 0
    fi
    
    # Everything else is considered safe
    return 1
}

# Function to create ASCII-safe filename
create_safe_filename() {
    local original_file="$1"
    local base_name=$(basename "$original_file" .mp3)
    local dir_name=$(dirname "$original_file")
    
    # Create safe version of filename
    local safe_name="$base_name"
    
    # Replace problematic characters with safe alternatives
    safe_name=$(echo "$safe_name" | sed 's/[？?]/Q/g')
    safe_name=$(echo "$safe_name" | sed 's/[⧸/]/slash/g')
    safe_name=$(echo "$safe_name" | sed 's/[｜|]/pipe/g')
    safe_name=$(echo "$safe_name" | sed 's/[&]/and/g')
    safe_name=$(echo "$safe_name" | sed 's/[""''""'']/quote/g')
    safe_name=$(echo "$safe_name" | sed 's/[…]/dot/g')
    safe_name=$(echo "$safe_name" | sed 's/[—–]/-/g')
    
    # Remove any remaining non-ASCII characters
    safe_name=$(echo "$safe_name" | iconv -f utf8 -t ascii//IGNORE 2>/dev/null || echo "$safe_name" | tr -cd '[:print:][:space:]')
    
    # Replace multiple spaces/underscores with single ones
    safe_name=$(echo "$safe_name" | sed 's/[[:space:]_]\+/_/g')
    
    # Remove leading/trailing spaces and underscores
    safe_name=$(echo "$safe_name" | sed 's/^[[:space:]_]*//;s/[[:space:]_]*$//')
    
    # Ensure filename isn't empty
    if [[ -z "$safe_name" ]]; then
        safe_name="audio_file_$(date +%s)"
    fi
    
    echo "$dir_name/${safe_name}.mp3"
}

# Function to create symlink with safe filename
create_safe_symlink() {
    local original_file="$1"
    local safe_file="$2"
    
    log_message "🔗 Creating safe file: $(basename "$safe_file")" "CYAN"
    
    # Remove existing file/symlink if it exists
    if [[ -e "$safe_file" || -L "$safe_file" ]]; then
        rm -f "$safe_file"
    fi
    
    # Just copy the file instead of symlink to avoid issues
    if cp "$original_file" "$safe_file" 2>/dev/null; then
        log_message "✅ Created safe copy: $(basename "$safe_file")" "GREEN"
        return 0
    else
        log_message "❌ Failed to create safe copy: $(basename "$safe_file")" "RED"
        return 1
    fi
}

# Function to log with timestamp
log_message() {
    local message=$1
    local color=${2:-WHITE}
    local timestamp=$(date '+%H:%M:%S')
    local log_entry="[$timestamp] $message"
    
    echo -e "${COLORS[$color]}${log_entry}${COLORS[NC]}"
    echo "$log_entry" >> "$LOG_FILE" 2>/dev/null || true
}

# Function to show overall pipeline status
show_pipeline_status() {
    local current_playlist=$1
    local total_playlists=$2
    local script_start_time=$3
    
    local current_time=$(date +%s)
    local elapsed_hours=$(( (current_time - script_start_time) / 3600 ))
    local elapsed_minutes=$(( ((current_time - script_start_time) % 3600) / 60 ))
    
    # Calculate estimated time remaining
    local avg_time_per_playlist=0
    if [[ $current_playlist -gt 1 ]]; then
        avg_time_per_playlist=$(( (current_time - script_start_time) / (current_playlist - 1) ))
    fi
    
    local remaining_playlists=$((total_playlists - current_playlist + 1))
    local estimated_remaining_hours=0
    local estimated_remaining_minutes=0
    
    if [[ $avg_time_per_playlist -gt 0 ]]; then
        local estimated_remaining_seconds=$((remaining_playlists * avg_time_per_playlist))
        estimated_remaining_hours=$((estimated_remaining_seconds / 3600))
        estimated_remaining_minutes=$(((estimated_remaining_seconds % 3600) / 60))
    fi
    
    log_message "📊 === PIPELINE STATUS ===" "MAGENTA"
    log_message "   Current: Playlist $current_playlist of $total_playlists" "WHITE"
    log_message "   Elapsed: ${elapsed_hours}h ${elapsed_minutes}m" "WHITE"
    log_message "   Videos transcribed: $COMPLETED_VIDEOS" "GREEN"
    log_message "   Videos skipped: $SKIPPED_VIDEOS" "YELLOW"
    
    if [[ $estimated_remaining_hours -gt 0 || $estimated_remaining_minutes -gt 0 ]]; then
        log_message "   Estimated remaining: ${estimated_remaining_hours}h ${estimated_remaining_minutes}m" "CYAN"
    fi
    
    # Show current directory sizes
    if [[ -d "$TRANSCRIPTS_DIR" ]]; then
        local transcript_size=$(du -sh "$TRANSCRIPTS_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        log_message "   Transcripts size: $transcript_size" "BLUE"
    fi
    
    if [[ -d "$AUDIO_DIR" ]]; then
        local audio_size=$(du -sh "$AUDIO_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        log_message "   Audio cache size: $audio_size" "BLUE"
    fi
    
    log_message "📊 ======================" "MAGENTA"
}

# Function to test dependencies
test_dependencies() {
    local all_good=true
    
    if command -v yt-dlp >/dev/null 2>&1; then
        log_message "✓ yt-dlp is installed" "GREEN"
        log_message "  Version: $(yt-dlp --version)" "GRAY"
    else
        log_message "✗ yt-dlp not found. Install with: pip install yt-dlp" "RED"
        all_good=false
    fi
    
    if command -v whisper >/dev/null 2>&1; then
        log_message "✓ whisper is installed" "GREEN"
        log_message "  Version: $(whisper --version 2>/dev/null || echo 'unknown')" "GRAY"
    else
        log_message "✗ whisper not found. Install with: pip install openai-whisper" "RED"
        all_good=false
    fi
    
    if command -v ffmpeg >/dev/null 2>&1; then
        log_message "✓ ffmpeg is installed" "GREEN"
        log_message "  Version: $(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3)" "GRAY"
    else
        log_message "✗ ffmpeg not found. Install ffmpeg for audio processing" "RED"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        return 0
    else
        log_message "❌ Please install missing dependencies before continuing" "RED"
        return 1
    fi
}

# Function to detect cookies file
get_cookies_file() {
    if [[ -n "$COOKIES_FILE" && -f "$COOKIES_FILE" ]]; then
        echo "$COOKIES_FILE"
        return
    fi
    
    # Common cookie file locations
    local cookie_paths=(
        "cookies.txt"
        "youtube_cookies.txt"
        "$WORK_DIR/cookies.txt"
        "$WORK_DIR/youtube_cookies.txt"
        "$HOME/.config/yt-dlp/cookies.txt"
    )
    
    for path in "${cookie_paths[@]}"; do
        if [[ -f "$path" ]]; then
            echo "$path"
            return
        fi
    done
    
    echo ""
}

# Function to download playlist audio with better error handling
download_playlist_audio() {
    local playlist_url=$1
    local playlist_id=$(echo "$playlist_url" | sed 's/.*list=\([^&]*\).*/\1/')
    local output_dir="$AUDIO_DIR/$playlist_id"
    
    log_message "🎵 Downloading audio from playlist: $playlist_id" "BLUE"
    
    # Create output directory
    mkdir -p "$output_dir"
    
    # Check for existing files if resume mode
    if [ "$RESUME" = true ]; then
        local existing_count=$(find "$output_dir" -name "*.mp3" 2>/dev/null | wc -l)
        if [ "$existing_count" -gt 0 ]; then
            log_message "Found $existing_count existing audio files in resume mode" "YELLOW"
        fi
    fi
    
    # Build yt-dlp command with improved settings and safe filenames
    local ytdlp_args=(
        "--extract-audio"
        "--audio-format" "mp3"
        "--audio-quality" "192K"
        "--output" "$output_dir/%(playlist_index)02d_%(title).100s.%(ext)s"  # Limit title length
        "--ignore-errors"
        "--no-warnings"
        "--retries" "5"
        "--fragment-retries" "5"
        "--retry-sleep" "5"
        "--user-agent" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        "--embed-metadata"
        "--add-metadata"
        "--playlist-start" "1"
        "--playlist-end" "50"  # Limit to 50 videos per playlist to avoid rate limits
        "--sleep-requests" "1"
        "--sleep-interval" "2"
        "--max-sleep-interval" "5"
        "--restrict-filenames"  # Use ASCII-only characters in filenames
        "--progress"  # Enable progress output
        "--newline"   # Force newlines in progress output
    )
    
    # Add cookies if available
    local cookie_file=$(get_cookies_file)
    if [[ -n "$cookie_file" ]]; then
        ytdlp_args+=("--cookies" "$cookie_file")
        log_message "Using cookies file: $cookie_file" "BLUE"
    else
        log_message "⚠️  No cookies file found. Some videos may be inaccessible" "YELLOW"
    fi
    
    # Add playlist URL
    ytdlp_args+=("$playlist_url")
    
    log_message "📁 Output directory: $output_dir" "BLUE"
    
    # Execute yt-dlp with enhanced monitoring
    local start_time=$(date +%s)
    local temp_log="$TEMP_DIR/ytdlp_${playlist_id}_$$.log"
    local progress_file="$TEMP_DIR/ytdlp_progress_${playlist_id}_$$.txt"
    
    log_message "🚀 Starting download with enhanced settings..." "CYAN"
    log_message "📊 Progress will be shown every 30 seconds..." "CYAN"
    
    # Function to monitor progress
    monitor_progress() {
        local log_file="$1"
        local progress_file="$2"
        local start_time="$3"
        
        while true; do
            sleep 30
            
            local current_time=$(date +%s)
            local elapsed=$(( (current_time - start_time) / 60 ))
            
            # Count downloaded files
            local current_count=$(find "$output_dir" -name "*.mp3" 2>/dev/null | wc -l)
            
            # Check if yt-dlp is still running
            if ! pgrep -f "yt-dlp.*${playlist_id}" >/dev/null 2>&1; then
                break
            fi
            
            # Show progress
            log_message "⏳ Download in progress... ${elapsed}m elapsed, ${current_count} files downloaded" "CYAN"
            
            # Show recent activity from log
            if [[ -f "$log_file" ]]; then
                local recent_lines=$(tail -5 "$log_file" | grep -E "(Downloading|ERROR|100%)" | tail -2)
                if [[ -n "$recent_lines" ]]; then
                    log_message "📄 Recent activity:" "BLUE"
                    echo "$recent_lines" | while IFS= read -r line; do
                        # Clean up the line and show it
                        local clean_line=$(echo "$line" | sed 's/\[[0-9;]*m//g' | cut -c1-80)
                        if [[ -n "$clean_line" ]]; then
                            log_message "   $clean_line" "GRAY"
                        fi
                    done
                fi
            fi
            
            # Show disk space
            local disk_usage=$(df -h "$output_dir" 2>/dev/null | tail -1 | awk '{print $4}')
            if [[ -n "$disk_usage" ]]; then
                log_message "💽 Available space: $disk_usage" "BLUE"
            fi
        done
    }
    
    # Start progress monitoring in background
    monitor_progress "$temp_log" "$progress_file" "$start_time" &
    local monitor_pid=$!
    
    # Execute yt-dlp with timeout and show some output
    local exit_code=0
    if timeout 7200 yt-dlp "${ytdlp_args[@]}" >"$temp_log" 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi
    
    # Stop the progress monitor
    kill $monitor_pid 2>/dev/null || true
    wait $monitor_pid 2>/dev/null || true
    
    # Final progress update
    local end_time=$(date +%s)
    local duration=$(( (end_time - start_time) / 60 ))
    local file_count=$(find "$output_dir" -name "*.mp3" 2>/dev/null | wc -l)
    
    if [[ $exit_code -eq 0 ]]; then
        log_message "✅ Downloaded $file_count audio files in $duration minutes" "GREEN"
        TOTAL_VIDEOS=$((TOTAL_VIDEOS + file_count))
        rm -f "$temp_log" "$progress_file"
        return 0
    else
        # Show yt-dlp errors for debugging
        if [[ -f "$temp_log" ]]; then
            log_message "📄 yt-dlp errors (last 10 lines):" "YELLOW"
            tail -10 "$temp_log" | while IFS= read -r line; do
                local clean_line=$(echo "$line" | sed 's/\[[0-9;]*m//g')
                log_message "   $clean_line" "RED"
            done
        fi
        
        if [ "$file_count" -gt 0 ]; then
            log_message "⚠️  yt-dlp had errors but downloaded $file_count files" "YELLOW"
            TOTAL_VIDEOS=$((TOTAL_VIDEOS + file_count))
            rm -f "$temp_log" "$progress_file"
            return 0
        else
            log_message "❌ yt-dlp failed with exit code $exit_code" "RED"
            rm -f "$temp_log" "$progress_file"
            return 1
        fi
    fi
}

# Function to transcribe audio file with better filename handling
transcribe_audio() {
    local audio_file="$1"
    local output_dir="$2"
    local base_name=$(basename "$audio_file" .mp3)
    local transcript_file="$output_dir/$base_name.md"
    
    # Check if transcript already exists and we're in resume mode
    if [[ "$RESUME" = true && -f "$transcript_file" ]]; then
        log_message "⏭️  Skipping existing transcript: $base_name" "YELLOW"
        SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
        echo "skipped"
        return 0
    fi
    
    # Check for problematic characters in filename
    local working_audio_file="$audio_file"
    local safe_symlink=""
    
    if has_problematic_chars "$audio_file"; then
        log_message "⚠️  File has problematic characters, creating safe symlink: $base_name" "YELLOW"
        
        # Create safe filename and symlink
        safe_symlink=$(create_safe_filename "$audio_file")
        
        if create_safe_symlink "$audio_file" "$safe_symlink"; then
            working_audio_file="$safe_symlink"
            log_message "✅ Created safe symlink: $(basename "$safe_symlink")" "GREEN"
        else
            log_message "❌ Failed to create safe symlink for: $base_name" "RED"
            SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
            echo "skipped"
            return 0
        fi
    fi
    
    # Check if file exists and is readable
    if [[ ! -f "$working_audio_file" ]]; then
        log_message "❌ Audio file not found: $working_audio_file" "RED"
        return 1
    fi
    
    if [[ ! -r "$working_audio_file" ]]; then
        log_message "❌ Audio file not readable: $working_audio_file" "RED"
        return 1
    fi
    
    # Check file size and skip empty files
    local file_size=$(stat -c%s "$working_audio_file" 2>/dev/null || stat -f%z "$working_audio_file" 2>/dev/null || echo "0")
    if [[ "$file_size" -eq 0 ]]; then
        log_message "⚠️  Skipping empty audio file: $base_name" "YELLOW"
        SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
        
        # Clean up safe symlink if it was created
        if [[ -n "$safe_symlink" && -L "$safe_symlink" ]]; then
            rm -f "$safe_symlink"
        fi
        
        echo "skipped"
        return 0
    fi
    
    # Create temporary directory for this transcription
    local temp_transcribe_dir="$TEMP_DIR/transcribe_$$_$(date +%s)"
    mkdir -p "$temp_transcribe_dir"
    
    log_message "🎙️  Transcribing: $base_name" "BLUE"
    
    # Show file size for context
    local file_size_mb=$(echo "scale=2; $file_size / 1048576" | bc -l 2>/dev/null || echo "0")
    log_message "📊 File size: ${file_size_mb} MB" "BLUE"
    
    local start_time=$(date +%s)
    local temp_output="$TEMP_DIR/whisper_output_$$.txt"
    local temp_error="$TEMP_DIR/whisper_error_$$.txt"
    
    # Use safer whisper command with better error handling
    log_message "🔧 Running: whisper (safe mode)" "BLUE"
    
    # Function to monitor transcription progress
    monitor_transcription() {
        local working_file="$1"
        local start_time="$2"
        local base_name="$3"
        
        while true; do
            sleep 60  # Check every minute for transcription
            
            local current_time=$(date +%s)
            local elapsed=$(( (current_time - start_time) / 60 ))
            
            # Check if whisper is still running
            if ! pgrep -f "whisper.*$(basename "$working_file")" >/dev/null 2>&1; then
                break
            fi
            
            # Show transcription progress
            log_message "🎙️  Transcribing: $base_name... ${elapsed}m elapsed" "CYAN"
            
            # Show system resources
            local memory_usage=$(free -h 2>/dev/null | grep "^Mem" | awk '{print $3"/"$2}' 2>/dev/null || echo "unknown")
            local cpu_usage=$(top -bn1 | grep "load average" | awk '{print $NF}' 2>/dev/null || echo "unknown")
            log_message "💻 Memory: $memory_usage, Load: $cpu_usage" "BLUE"
            
            # Check for any output files being created
            if [[ -d "$temp_transcribe_dir" ]]; then
                local output_files=$(find "$temp_transcribe_dir" -name "*.txt" -o -name "*.json" -o -name "*.srt" 2>/dev/null | wc -l)
                if [[ $output_files -gt 0 ]]; then
                    log_message "📄 Found $output_files output files in progress" "BLUE"
                fi
            fi
        done
    }
    
    # Start transcription monitoring in background (DISABLED TO AVOID INTERFERENCE)
    # monitor_transcription "$working_audio_file" "$start_time" "$base_name" &
    # local transcribe_monitor_pid=$!
    
    # Execute whisper with timeout and proper error handling
    local whisper_device="cpu"  # Always use CPU to avoid GPU hangs
    local whisper_model="tiny"   # Use tiny model for fast processing
    
    log_message "🔧 Using CPU-only with tiny model (fast mode)" "CYAN"
    
    # Much longer timeout for large files (20 minutes instead of 10)
    if timeout 1200 whisper "$working_audio_file" \
        --model "$whisper_model" \
        --output_dir "$temp_transcribe_dir" \
        --output_format "txt" \
        --language "en" \
        --device "$whisper_device" \
        --fp16 False \
        --threads 1 >"$temp_output" 2>"$temp_error"; then
        
        local exit_code=0
    else
        local exit_code=$?
        log_message "⚠️  Whisper timed out or failed (exit code: $exit_code)" "YELLOW"
    fi
    
    # Stop the transcription monitor
    # kill $transcribe_monitor_pid 2>/dev/null || true
    # wait $transcribe_monitor_pid 2>/dev/null || true
    
    # Debug: Show whisper results
    log_message "🔍 Whisper exit code: $exit_code" "BLUE"
    
    if [[ -f "$temp_output" && -s "$temp_output" ]]; then
        log_message "📄 Whisper output:" "CYAN"
        head -3 "$temp_output" | while IFS= read -r line; do
            log_message "   $line" "GRAY"
        done
    fi
    
    if [[ -f "$temp_error" && -s "$temp_error" ]]; then
        log_message "⚠️  Whisper errors:" "YELLOW"
        if grep -q "RuntimeError: could not create a primitive" "$temp_error"; then
            log_message "   GPU/PyTorch primitive error - skipping file" "RED"
        else
            # Show first few lines of error
            head -3 "$temp_error" | while IFS= read -r line; do
                log_message "   $line" "RED"
            done
        fi
        
        # Clean up and skip this file
        rm -rf "$temp_transcribe_dir"
        rm -f "$temp_output" "$temp_error"
        
        # Clean up safe symlink if it was created
        if [[ -n "$safe_symlink" && -L "$safe_symlink" ]]; then
            rm -f "$safe_symlink"
            log_message "🗑️  Cleaned up safe symlink: $(basename "$safe_symlink")" "YELLOW"
        fi
        
        SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
        echo "skipped"
        return 0
    fi
    
    # Debug: List files in temp directory
    log_message "📂 Files created:" "BLUE"
    if [[ -d "$temp_transcribe_dir" ]]; then
        find "$temp_transcribe_dir" -type f | while IFS= read -r file; do
            local file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
            log_message "   $(basename "$file") ($file_size bytes)" "CYAN"
        done
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        local end_time=$(date +%s)
        local duration=$(( (end_time - start_time) / 60 ))
        
        # Find the generated text file
        local txt_file=$(find "$temp_transcribe_dir" -name "*.txt" | head -1)
        
        if [[ -f "$txt_file" ]]; then
            # Read transcription content
            local transcript_content=$(cat "$txt_file")
            
            # Create formatted output
            {
                echo "# $base_name"
                echo ""
                echo "**Source:** $(basename "$working_audio_file")"
                echo "**File Size:** ${file_size_mb} MB"
                echo "**Transcribed:** $(date '+%Y-%m-%d %H:%M:%S')"
                echo "**Whisper Model:** $WHISPER_MODEL"
                echo "**Processing Time:** ${duration} minutes"
                echo ""
                echo "---"
                echo ""
                
                if [[ -z "${transcript_content// }" ]]; then
                    echo "*[No transcribable content detected]*"
                else
                    echo "$transcript_content"
                fi
            } > "$transcript_file"
            
            log_message "✅ Successfully transcribed: $base_name (${duration}m)" "GREEN"
            COMPLETED_VIDEOS=$((COMPLETED_VIDEOS + 1))
            
            # Clean up audio file after successful transcription
            if rm "$working_audio_file" 2>/dev/null; then
                log_message "🗑️  Cleaned up audio file: $(basename "$working_audio_file")" "GREEN"
            fi
            
            # If we used a safe symlink, also clean up the original file
            if [[ -n "$safe_symlink" && "$working_audio_file" == "$safe_symlink" ]]; then
                if [[ -f "$audio_file" ]] && rm "$audio_file" 2>/dev/null; then
                    log_message "🗑️  Cleaned up original file: $(basename "$audio_file")" "GREEN"
                fi
            fi
            
            # Clean up temp files
            rm -rf "$temp_transcribe_dir"
            rm -f "$temp_output" "$temp_error"
            echo "transcribed"
            return 0
        else
            log_message "❌ No transcription file found" "RED"
            rm -rf "$temp_transcribe_dir"
            rm -f "$temp_output" "$temp_error"
            
            # Clean up safe symlink if it was created
            if [[ -n "$safe_symlink" && -L "$safe_symlink" ]]; then
                rm -f "$safe_symlink"
                log_message "🗑️  Cleaned up safe symlink: $(basename "$safe_symlink")" "YELLOW"
            fi
            
            SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
            echo "skipped"
            return 0
        fi
    else
        log_message "❌ Whisper failed with exit code $exit_code for: $base_name" "RED"
        rm -rf "$temp_transcribe_dir"
        rm -f "$temp_output" "$temp_error"
        
        # Clean up safe symlink if it was created
        if [[ -n "$safe_symlink" && -L "$safe_symlink" ]]; then
            rm -f "$safe_symlink"
            log_message "🗑️  Cleaned up safe symlink: $(basename "$safe_symlink")" "YELLOW"
        fi
        
        SKIPPED_VIDEOS=$((SKIPPED_VIDEOS + 1))
        echo "skipped"
        return 0
    fi
}

# Function to process playlist
process_playlist() {
    local playlist_url=$1
    local playlist_id=$(echo "$playlist_url" | sed 's/.*list=\([^&]*\).*/\1/')
    local playlist_audio_dir="$AUDIO_DIR/$playlist_id"
    local playlist_transcript_dir="$TRANSCRIPTS_DIR/$playlist_id"
    
    log_message "🎯 Processing playlist: $playlist_id" "MAGENTA"
    log_message "🔗 URL: $playlist_url" "BLUE"
    
    # Download audio
    if download_playlist_audio "$playlist_url"; then
        # Create transcript directory
        mkdir -p "$playlist_transcript_dir"
        
        # Get audio files, filtering for readable files
        local audio_files=()
        while IFS= read -r -d '' file; do
            if [[ -f "$file" && -r "$file" ]]; then
                audio_files+=("$file")
            fi
        done < <(find "$playlist_audio_dir" -name "*.mp3" -print0 2>/dev/null)
        
        local total_audio_files=${#audio_files[@]}
        log_message "📂 Found $total_audio_files audio files to transcribe" "BLUE"
        
        if [ "$total_audio_files" -eq 0 ]; then
            log_message "⚠️  No audio files found in $playlist_audio_dir" "YELLOW"
            return 1
        fi
        
        # Count problematic files
        local problematic_count=0
        local normal_count=0
        for audio_file in "${audio_files[@]}"; do
            if has_problematic_chars "$audio_file"; then
                problematic_count=$((problematic_count + 1))
                log_message "   Problematic: $(basename "$audio_file")" "YELLOW"
            else
                normal_count=$((normal_count + 1))
            fi
        done
        
        log_message "📊 File analysis: $normal_count normal, $problematic_count problematic" "BLUE"
        
        if [ "$problematic_count" -gt 0 ]; then
            log_message "⚠️  Found $problematic_count files with problematic characters (will create safe copies)" "YELLOW"
        fi
        
        # Process each audio file
        local success_count=0
        local skip_count=0
        for audio_file in "${audio_files[@]}"; do
            log_message "📄 Processing: $(basename "$audio_file")" "CYAN"
            
            local result=$(transcribe_audio "$audio_file" "$playlist_transcript_dir")
            local exit_code=$?
            
            if [[ $exit_code -eq 0 ]]; then
                # Check if it was actually transcribed or skipped
                if [[ "$result" == "skipped" ]]; then
                    skip_count=$((skip_count + 1))
                else
                    success_count=$((success_count + 1))
                fi
            else
                # Failed transcription
                log_message "❌ Failed to transcribe: $(basename "$audio_file")" "RED"
            fi
        done
        
        # Clean up empty directory
        rmdir "$playlist_audio_dir" 2>/dev/null || true
        
        # Show playlist completion summary
        log_message "🎉 Playlist $playlist_id completed!" "GREEN"
        log_message "   ✅ Successfully transcribed: $success_count/$total_audio_files" "GREEN"
        log_message "   ⏭️  Skipped (existing/problematic): $skip_count/$total_audio_files" "YELLOW"
        
        if [[ $success_count -gt 0 ]]; then
            log_message "   📁 Transcripts saved to: $playlist_transcript_dir" "BLUE"
        fi
        
        return 0
    else
        log_message "❌ Failed to download playlist: $playlist_id" "RED"
        return 1
    fi
}

# Initialize directories
initialize_directories() {
    AUDIO_DIR="$WORK_DIR/audio"
    TRANSCRIPTS_DIR="$WORK_DIR/transcripts"
    LOGS_DIR="$WORK_DIR/logs"
    TEMP_DIR="$WORK_DIR/temp"
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    LOG_FILE="$LOGS_DIR/pipeline_$timestamp.log"
    
    mkdir -p "$WORK_DIR" "$AUDIO_DIR" "$TRANSCRIPTS_DIR" "$LOGS_DIR" "$TEMP_DIR"
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --work-dir)
                WORK_DIR="$2"
                shift 2
                ;;
            --model)
                WHISPER_MODEL="$2"
                shift 2
                ;;
            --cookies)
                COOKIES_FILE="$2"
                shift 2
                ;;
            --no-resume)
                RESUME=false
                shift
                ;;
            --cpu-only)
                FORCE_CPU=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --work-dir DIR     Working directory (default: youtube_transcriptions)"
                echo "  --model MODEL      Whisper model: tiny, base, small, medium, large (default: medium)"
                echo "  --cookies FILE     Path to cookies.txt file for yt-dlp"
                echo "  --no-resume       Don't resume, start fresh"
                echo "  --cpu-only        Force CPU-only processing"
                echo "  --help, -h        Show this help"
                echo ""
                echo "This script will download and transcribe ${#PLAYLISTS[@]} YouTube playlists related to mental health/therapy"
                echo ""
                echo "Prerequisites:"
                echo "  pip install yt-dlp openai-whisper"
                echo "  # Install ffmpeg for your system"
                exit 0
                ;;
            *)
                log_message "Unknown option: $1" "RED"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Initialize
    initialize_directories
    
    log_message "=== YouTube Transcription Pipeline (Filename-Safe) ===" "CYAN"
    log_message "Working directory: $WORK_DIR" "BLUE"
    log_message "Whisper model: $WHISPER_MODEL" "BLUE"
    log_message "Resume mode: $RESUME" "BLUE"
    log_message "Total playlists to process: ${#PLAYLISTS[@]}" "BLUE"
    
    # Test dependencies
    if ! test_dependencies; then
        exit 1
    fi
    
    # Process each playlist
    local script_start_time=$(date +%s)
    local completed_playlists=0
    local playlist_index=0
    
    for playlist in "${PLAYLISTS[@]}"; do
        playlist_index=$((playlist_index + 1))
        
        log_message "📋 Processing playlist $playlist_index of ${#PLAYLISTS[@]}" "MAGENTA"
        
        if process_playlist "$playlist"; then
            completed_playlists=$((completed_playlists + 1))
            log_message "✅ Playlist $playlist_index completed successfully" "GREEN"
        else
            log_message "❌ Playlist $playlist_index failed" "RED"
        fi
        
        # Show overall progress
        show_pipeline_status "$playlist_index" "${#PLAYLISTS[@]}" "$script_start_time"
        
        # Clean up between playlists
        if [[ -d "$TEMP_DIR" ]]; then
            rm -rf "$TEMP_DIR"/*.txt 2>/dev/null || true
        fi
        
        # Add delay between playlists to avoid rate limiting
        if [ $playlist_index -lt ${#PLAYLISTS[@]} ]; then
            log_message "⏳ Waiting 30 seconds before next playlist..." "CYAN"
            sleep 30
        fi
    done
    
    # Final summary
    local script_end_time=$(date +%s)
    local total_duration=$(( (script_end_time - script_start_time) / 3600 ))
    
    log_message "🎉 Pipeline completed!" "GREEN"
    log_message "📊 Final Statistics:" "WHITE"
    log_message "   Total playlists: ${#PLAYLISTS[@]}" "WHITE"
    log_message "   Completed playlists: $completed_playlists" "GREEN"
    log_message "   Total videos transcribed: $COMPLETED_VIDEOS" "GREEN"
    log_message "   Skipped (already existed): $SKIPPED_VIDEOS" "YELLOW"
    log_message "   Total processing time: ${total_duration} hours" "BLUE"
    log_message "📁 Transcripts saved to: $TRANSCRIPTS_DIR" "BLUE"
    log_message "📄 Log saved to: $LOG_FILE" "BLUE"
    
    # Create summary report
    local summary_file="$WORK_DIR/transcription_summary.md"
    {
        echo "# YouTube Transcription Pipeline Summary"
        echo ""
        echo "**Date:** $(date '+%Y-%m-%d %H:%M:%S')"
        echo "**Total Runtime:** ${total_duration} hours"
        echo ""
        echo "## Statistics"
        echo "- Total playlists: ${#PLAYLISTS[@]}"
        echo "- Completed playlists: $completed_playlists"
        echo "- Total videos transcribed: $COMPLETED_VIDEOS"
        echo "- Skipped (already existed): $SKIPPED_VIDEOS"
        echo ""
        echo "## Configuration"
        echo "- Whisper model: $WHISPER_MODEL"
        echo "- Working directory: $WORK_DIR"
        echo "- Resume mode: $RESUME"
        echo ""
        echo "## Output Locations"
        echo "- Transcripts: $TRANSCRIPTS_DIR"
        echo "- Logs: $LOG_FILE"
        echo ""
        echo "## Notes"
        echo "- Files with problematic Unicode characters are automatically processed via safe symlinks"
        echo "- Enhanced filename sanitization handles: ？⧸｜&""''…—– and non-ASCII characters"
        echo "- Symlinks are automatically cleaned up after successful transcription"
        echo "- Use --restrict-filenames option in yt-dlp for future downloads to minimize issues"
    } > "$summary_file"
    
    log_message "📋 Summary report saved to: $summary_file" "BLUE"
}

# Cleanup function
cleanup() {
    log_message "🧹 Cleaning up..." "YELLOW"
    
    # Kill any remaining background processes
    pkill -f "monitor_progress" 2>/dev/null || true
    pkill -f "monitor_transcription" 2>/dev/null || true
    
    # Clean up temp files
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"/*.txt 2>/dev/null || true
        rm -rf "$TEMP_DIR"/transcribe_* 2>/dev/null || true
        rm -rf "$TEMP_DIR"/ytdlp_* 2>/dev/null || true
    fi
    
    log_message "✅ Cleanup completed" "GREEN"
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@" 