#!/bin/bash

# Ollama Overlord Check-in Script
# Usage: ./scripts/ollama-checkin.sh "Task completion summary"

set -e

# Check if task summary is provided
if [[ -z $1 ]]; then
	echo "Usage: $0 \"Task completion summary\""
	echo "Example: $0 \"Fixed all typescript-eslint errors in 5 files\""
	exit 1
fi

TASK_SUMMARY="$1"
API_URL="https://api.pixelatedempathy.com/api/generate"
MODEL="granite3.3:2b"

# Create the prompt
PROMPT="You are an AI project oversight system reviewing task completion progress. Based on the task summary provided, please:

1. Provide 1-3 specific improvement ideas for the completed task (focus on code quality, architecture, testing, documentation, or implementation approach)
2. Decide whether the project should continue to the next task

Response format:
IMPROVEMENTS:
- [Improvement idea 1]
- [Improvement idea 2] (if applicable)
- [Improvement idea 3] (if applicable)

DECISION: [yes/no]

Task completed: ${TASK_SUMMARY}

Remember:
- Always suggest improvements unless the task is perfect
- Only say \"no\" if there are critical errors, failures, or security issues
- Consider maintainability, scalability, and best practices
- Be constructive and specific in your suggestions"

echo "🤖 Checking in with Ollama Overlord..."
echo "📝 Task Summary: ${TASK_SUMMARY}"
echo ""

# Make the API call and capture the response
if ! RESPONSE=$(curl -s -X POST "${API_URL}" \
	-H "Content-Type: application/json" \
	-d "{\"model\": \"${MODEL}\", \"prompt\": $(echo "${PROMPT}" | jq -R -s . || true), \"stream\": false}"); then
	echo "❌ Failed to connect to Ollama API"
	exit 1
fi

# Extract the response content
RESPONSE_TEXT=$(echo "${RESPONSE}" | jq -r '.response // empty')

if [[ -z ${RESPONSE_TEXT} ]]; then
	echo "❌ No response received from Ollama API"
	echo "Raw response: ${RESPONSE}"
	exit 1
fi

echo "📋 Ollama Overlord Response:"
echo "================================"
echo "${RESPONSE_TEXT}"
echo "================================"
echo ""

# Parse improvements
echo "🔍 Parsing response..."
IMPROVEMENTS=$(echo "${RESPONSE_TEXT}" | sed -n '/IMPROVEMENTS:/,/DECISION:/p' | sed '$d' | sed '1d' || true)
DECISION=$(echo "${RESPONSE_TEXT}" | grep -i "DECISION:" | sed 's/.*DECISION: *//I' | tr '[:upper:]' '[:lower:]' | xargs || true)

echo "💡 Improvements:"
if [[ -n ${IMPROVEMENTS} ]]; then
	echo "${IMPROVEMENTS}"
else
	echo "  (None specified)"
fi
echo ""

echo "⚖️  Decision: ${DECISION}"
echo ""

# Check decision and provide guidance
case "${DECISION}" in
"yes" | "y")
	echo "✅ APPROVED: You may proceed to the next task"
	exit 0
	;;
"no" | "n")
	echo "🛑 BLOCKED: Do not proceed to the next task"
	echo "   Address the concerns raised in the improvements section"
	exit 2
	;;
*)
	echo "⚠️  UNCLEAR: Decision was '${DECISION}' (expected yes/no)"
	echo "   Manual review required"
	exit 3
	;;
esac
