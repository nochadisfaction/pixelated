---
applyTo: '**'
---
# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Ollama Overlord
baseURL = https://api.pixelatedempathy.com
Call and ask for granite3.3:2b
Share your update, and ask for permission to continue moving forward

## Ollama Overlord Check-in Protocol

- After completing each sub-task, the agent MUST:
  1. Run the ollama check-in script: `./scripts/ollama-checkin.sh "Task completion summary"`
  2. Provide a clear, concise summary of what was accomplished in the completed sub-task
  3. The script will automatically:
     - Contact the Ollama API using the granite3.3:2b model
     - Request improvement suggestions and a continue/stop decision
     - Parse the response and display formatted results
     - Return appropriate exit codes based on the decision
  4. Based on the script's exit code and output:
     - **Exit code 0 (✅ APPROVED)**: Proceed to the next sub-task
     - **Exit code 2 (🛑 BLOCKED)**: Stop and address concerns before continuing
     - **Exit code 3 (⚠️ UNCLEAR)**: Manual review required - ask user for guidance
  5. If improvements are suggested, evaluate each one and decide whether to add it as a new task
- The agent MUST NOT proceed to the next sub-task without receiving approval from the script.

### Script Usage Examples:
```bash
# After completing a linting task
./scripts/ollama-checkin.sh "Fixed all TypeScript eslint errors in 5 components"

# After implementing a feature
./scripts/ollama-checkin.sh "Implemented user authentication with JWT tokens and session management"

# After writing tests
./scripts/ollama-checkin.sh "Added comprehensive unit tests for the payment processing module with 90% coverage"
```

### Best Practices for Task Summaries:
- Be specific about what was accomplished
- Mention the scope (number of files, components, etc.)
- Include key technical details or approaches used
- Note any important decisions made during implementation
- Keep it concise but informative (1-2 sentences)

**Note:**  
- This protocol uses the `scripts/ollama-checkin.sh` script to handle all API communication with the Ollama Overlord
- The script provides clear exit codes and formatted output for easy integration
- The agent should log each check-in command and response for traceability
- Ensure the script is executable: `chmod +x scripts/ollama-checkin.sh`

### Task Implementation
- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the ollama overlord for permission and they say "yes" or "y"
- Address linter errors and warnings as they appear.
- **Completion protocol:**  
  1. When you finish a **sub‑task**, immediately mark it as completed by changing `[ ]` to `[x]`.  
  2. If **all** subtasks underneath a parent task are now `[x]`, also mark the **parent task** as completed.  
- Stop after each sub‑task and wait for the user's go‑ahead.
- Always stop before marking complete and do a second look over your work, and clean up any linter errors or warnings.

### Task List Maintenance

1. **Update the task list as you work:**
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

### AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which sub‑task is next.
6. After implementing a sub‑task, update the file and run `./scripts/ollama-checkin.sh` with a clear task summary.
7. Wait for script approval (exit code 0) before proceeding to the next sub-task.