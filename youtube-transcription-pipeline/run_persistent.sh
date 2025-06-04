#!/bin/bash

# YouTube Transcription Pipeline - Persistent Runner
# This script sets up a tmux session to run the transcription pipeline persistently

SESSION_NAME="youtube-transcription"
CONDA_ENV="pixel"

# Function to check if session exists
session_exists() {
    tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

# Function to create new session
create_session() {
    echo "🚀 Creating new tmux session: $SESSION_NAME"
    
    # Create new session and activate conda environment
    tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)"
    
    # Activate conda environment
    tmux send-keys -t "$SESSION_NAME" "conda activate $CONDA_ENV" C-m
    
    # Wait a moment for conda to activate
    sleep 2
    
    # Start Jupyter in the session
    tmux send-keys -t "$SESSION_NAME" "jupyter lab --no-browser --port=8888 --ip=0.0.0.0 --allow-root" C-m
    
    echo "✅ Session created! Use the following commands:"
    echo "   Attach: tmux attach-session -t $SESSION_NAME"
    echo "   Detach: Ctrl+b, then d"
    echo "   List sessions: tmux list-sessions"
    echo "   Kill session: tmux kill-session -t $SESSION_NAME"
}

# Function to attach to existing session
attach_session() {
    echo "📎 Attaching to existing session: $SESSION_NAME"
    tmux attach-session -t "$SESSION_NAME"
}

# Main logic
if session_exists; then
    echo "⚡ Session '$SESSION_NAME' already exists!"
    read -p "Do you want to (a)ttach, (k)ill and recreate, or (l)ist sessions? [a/k/l]: " choice
    case $choice in
        [Kk]* ) 
            tmux kill-session -t "$SESSION_NAME"
            create_session
            ;;
        [Ll]* ) 
            tmux list-sessions
            ;;
        * ) 
            attach_session
            ;;
    esac
else
    create_session
fi 