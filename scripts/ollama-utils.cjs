/**
 * Ollama Overlord Check-in Module
 * Provides utilities for automated check-ins with the Ollama Overlord
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Performs an automated check-in with the Ollama Overlord
 * @param {string} taskSummary - Summary of the completed task
 * @returns {Promise<{approved: boolean, improvements: string[], decision: string}>}
 */
function checkInWithOverlord(taskSummary) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'ollama-checkin.cjs');
        const process = spawn('node', [scriptPath, taskSummary], {
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            console.log(stdout); // Always show the output
            
            if (stderr) {
                console.error(stderr);
            }

            const approved = code === 0;
            const blocked = code === 2;
            const unclear = code === 3;

            // Parse improvements from stdout if needed
            const improvements = [];
            const lines = stdout.split('\n');
            let inImprovements = false;
            
            for (const line of lines) {
                if (line.includes('💡 Improvements:')) {
                    inImprovements = true;
                    continue;
                }
                if (line.includes('⚖️') || line.includes('Decision:')) {
                    inImprovements = false;
                    continue;
                }
                if (inImprovements && line.trim().startsWith('-')) {
                    improvements.push(line.trim().substring(1).trim());
                }
            }

            let decision = 'unclear';
            if (approved) {
                decision = 'yes';
            } else if (blocked) {
                decision = 'no';
            }

            resolve({
                approved,
                blocked,
                unclear,
                improvements,
                decision,
                exitCode: code
            });
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Quick check-in function that throws if not approved
 * @param {string} taskSummary - Summary of the completed task
 * @returns {Promise<void>}
 */
async function requireApproval(taskSummary) {
    const result = await checkInWithOverlord(taskSummary);
    
    if (!result.approved) {
        if (result.blocked) {
            throw new Error('Ollama Overlord blocked further progress. Address the improvements suggested.');
        } else if (result.unclear) {
            throw new Error('Ollama Overlord decision was unclear. Manual review required.');
        } else {
            throw new Error(`Ollama Overlord check-in failed with exit code ${result.exitCode}`);
        }
    }
    
    return result;
}

module.exports = {
    checkInWithOverlord,
    requireApproval
};
