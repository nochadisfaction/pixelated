#!/usr/bin/env node

/**
 * Ollama Overlord Check-in Utility
 * Handles automated check-ins with the Ollama Overlord API
 * Usage: node scripts/ollama-checkin.js "Task completion summary"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'https://api.pixelatedempathy.com/api/generate';
const MODEL = 'granite3.3:2b';
const TASK_LIST_FILE = path.join(__dirname, '..', 'lint-fixes-task-list.md');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(emoji, message, color = 'reset') {
    console.log(`${emoji} ${colorize(message, color)}`);
}

function createPrompt(taskSummary) {
    return `You are an AI project oversight system reviewing task completion progress. Based on the task summary provided, please:

1. Provide 1-3 specific improvement ideas for the completed task (focus on code quality, architecture, testing, documentation, or implementation approach)
2. Decide whether the project should continue to the next task

Response format:
IMPROVEMENTS:
- [Improvement idea 1]
- [Improvement idea 2] (if applicable)
- [Improvement idea 3] (if applicable)

DECISION: [yes/no]

Task completed: ${taskSummary}

Remember:
- Always suggest improvements unless the task is perfect
- Only say "no" if there are critical errors, failures, or security issues
- Consider maintainability, scalability, and best practices
- Be constructive and specific in your suggestions`;
}

function makeApiCall(prompt) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false
        });

        const url = new URL(API_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    resolve(jsonResponse);
                } catch (error) {
                    reject(new Error(`Failed to parse JSON response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`API request failed: ${error.message}`));
        });

        req.write(data);
        req.end();
    });
}

function parseResponse(responseText) {
    const lines = responseText.split('\n');
    let improvements = [];
    let decision = '';
    let inImprovements = false;

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.toUpperCase().startsWith('IMPROVEMENTS:')) {
            inImprovements = true;
            continue;
        }
        
        if (trimmedLine.toUpperCase().startsWith('DECISION:')) {
            decision = trimmedLine.replace(/^DECISION:\s*/i, '').toLowerCase().trim();
            inImprovements = false;
            continue;
        }
        
        if (inImprovements && trimmedLine.startsWith('-')) {
            improvements.push(trimmedLine.substring(1).trim());
        }
    }

    return { improvements, decision };
}

function logCheckinResult(improvements, decision) {
    console.log('\n' + '='.repeat(50));
    log('📋', 'Ollama Overlord Response:', 'bright');
    console.log('='.repeat(50));
    
    log('💡', 'Improvements:', 'yellow');
    if (improvements.length > 0) {
        improvements.forEach(improvement => {
            console.log(`   - ${improvement}`);
        });
    } else {
        console.log('   (None specified)');
    }
    
    console.log('');
    log('⚖️ ', `Decision: ${decision}`, decision === 'yes' ? 'green' : decision === 'no' ? 'red' : 'yellow');
    console.log('');
}

function handleDecision(decision) {
    switch (decision) {
        case 'yes':
        case 'y':
            log('✅', 'APPROVED: You may proceed to the next task', 'green');
            return 0;
        case 'no':
        case 'n':
            log('🛑', 'BLOCKED: Do not proceed to the next task', 'red');
            log('   ', 'Address the concerns raised in the improvements section', 'red');
            return 2;
        default:
            log('⚠️ ', `UNCLEAR: Decision was '${decision}' (expected yes/no)`, 'yellow');
            log('   ', 'Manual review required', 'yellow');
            return 3;
    }
}

function updateTaskListLog(taskSummary, improvements, decision) {
    if (!fs.existsSync(TASK_LIST_FILE)) {
        return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = `\n## Check-in Log Entry - ${timestamp}\n\n**Task Completed:** ${taskSummary}\n\n**Improvements Suggested:**\n${improvements.map(imp => `- ${imp}`).join('\n')}\n\n**Decision:** ${decision.toUpperCase()}\n\n---\n`;

    try {
        fs.appendFileSync(TASK_LIST_FILE, logEntry);
        log('📝', 'Updated task list with check-in log', 'cyan');
    } catch (error) {
        log('⚠️ ', `Failed to update task list: ${error.message}`, 'yellow');
    }
}

async function main() {
    const taskSummary = process.argv[2];
    
    if (!taskSummary) {
        console.error('Usage: node scripts/ollama-checkin.js "Task completion summary"');
        console.error('Example: node scripts/ollama-checkin.js "Fixed all typescript-eslint errors in 5 files"');
        process.exit(1);
    }

    try {
        log('🤖', 'Checking in with Ollama Overlord...', 'cyan');
        log('📝', `Task Summary: ${taskSummary}`, 'blue');
        
        const prompt = createPrompt(taskSummary);
        const response = await makeApiCall(prompt);
        
        if (!response.response) {
            throw new Error('No response received from Ollama API');
        }
        
        const { improvements, decision } = parseResponse(response.response);
        
        logCheckinResult(improvements, decision);
        updateTaskListLog(taskSummary, improvements, decision);
        
        const exitCode = handleDecision(decision);
        process.exit(exitCode);
        
    } catch (error) {
        log('❌', `Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createPrompt, makeApiCall, parseResponse };
