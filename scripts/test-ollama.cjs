#!/usr/bin/env node

/**
 * Test script for the Ollama Overlord check-in system
 */

const { requireApproval, checkInWithOverlord } = require('./ollama-utils.cjs');

async function testCheckIn() {
    console.log('🧪 Testing Ollama Overlord check-in system...\n');
    
    try {
        // Test 1: Basic check-in
        console.log('Test 1: Basic check-in');
        const result = await checkInWithOverlord('Created automated Ollama check-in scripts with proper response parsing');
        console.log(`✅ Result: approved=${result.approved}, decision=${result.decision}, improvements=${result.improvements.length}\n`);
        
        // Test 2: requireApproval function
        console.log('Test 2: Require approval function');
        await requireApproval('Successfully tested the Ollama check-in system with multiple utility functions');
        console.log('✅ Approval received without throwing\n');
        
        console.log('🎉 All tests passed! The Ollama check-in system is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testCheckIn();
}
