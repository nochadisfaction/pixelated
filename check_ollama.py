#!/usr/bin/env python3
"""Simple Ollama Overlord check-in script for cross-platform compatibility"""
import requests
import json
import sys

def check_in_with_overlord(task_summary):
    """Check in with Ollama Overlord for task completion approval"""
    try:
        url = "https://api.pixelatedempathy.com/api/generate"
        payload = {
            "model": "granite3.3:2b",
            "prompt": f"Task completion summary: {task_summary}. Should I continue to next task?",
            "stream": False
        }
        headers = {"Content-Type": "application/json"}
        
        print(f"🔄 Checking in with Ollama Overlord...")
        print(f"📋 Task Summary: {task_summary}")
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        ollama_response = result.get('response', '').strip()
        print(f"🤖 Ollama Overlord Response: {ollama_response}")
        
        approval_keywords = ['yes', 'continue', 'proceed', 'approved', 'go ahead', 'next']
        blocking_keywords = ['no', 'stop', 'wait', 'blocked', 'hold']
        response_lower = ollama_response.lower()
        
        if any(keyword in response_lower for keyword in approval_keywords):
            print("✅ APPROVED: Continue to next task")
            return 0
        elif any(keyword in response_lower for keyword in blocking_keywords):
            print("🛑 BLOCKED: Address concerns before continuing")
            return 2
        else:
            print("⚠️ UNCLEAR: Manual review required")
            return 3
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_ollama.py 'task completion summary'")
        sys.exit(1)
    exit_code = check_in_with_overlord(sys.argv[1])
    sys.exit(exit_code) 