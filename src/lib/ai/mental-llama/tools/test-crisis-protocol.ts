#!/usr/bin/env node

/**
 * Test script for Crisis Protocol implementation
 *
 * Usage:
 *   npm run test:crisis-protocol
 *   npm run test:crisis-protocol -- "custom test text"
 *
 * Environment variables required:
 *   SLACK_WEBHOOK_URL (optional, for Slack testing)
 *   EMAIL_FROM (optional, for email fallback)
 */

import { MentalLLaMAFactory } from '../MentalLLaMAFactory'
import { SlackNotificationService } from '@/lib/services/notification/SlackNotificationService'
import { config } from '@/config/env.config'

const DEFAULT_CRISIS_TEXTS = [
  "I don't want to live anymore",
  "I'm thinking about ending it all",
  'Nobody would care if I was gone',
  "I can't take this pain anymore, I want to die",
  'I have a plan to hurt myself',
  // Non-crisis text for comparison
  "I'm feeling a bit down today but I'll be okay",
]

async function testCrisisDetection(text: string, testName: string) {
  console.log(`\n🧪 Testing: ${testName}`)
  console.log(`📝 Text: "${text}"`)
  console.log(`${'─'.repeat(80)}`)

  try {
    // Create MentalLLaMA adapter with crisis protocol
    const { adapter } = await MentalLLaMAFactory.createFromEnv()

    // Test with auto-routing to enable crisis detection
    const result = await adapter.analyzeMentalHealth(
      text,
      ['auto_route'], // Enable automatic routing with crisis detection
      {
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        sessionType: 'crisis_test_session',
        explicitTaskHint: 'crisis_evaluation',
      },
    )

    // Display results
    console.log(`🎯 Analysis Results:`)
    console.log(`   Mental Health Category: ${result.mentalHealthCategory}`)
    console.log(
      `   Confidence Score: ${(result.confidenceScore * 100).toFixed(1)}%`,
    )
    console.log(
      `   Has Mental Health Issue: ${result.hasMentalHealthIssue ? 'Yes' : 'No'}`,
    )

    // Check for crisis detection
    if (result.mentalHealthCategory === 'crisis') {
      console.log(`🚨 CRISIS DETECTED! Alert protocol should be activated.`)
      console.log(`   ✓ Crisis category set correctly`)
      console.log(`   ✓ Crisis notifications should have been sent`)
    } else {
      console.log(
        `✅ No crisis detected (category: ${result.mentalHealthCategory})`,
      )
    }

    // Show routing decision if available
    if (result._routingDecision) {
      console.log(`🧠 Router Decision:`)
      console.log(
        `   Target Analyzer: ${result._routingDecision.targetAnalyzer}`,
      )
      console.log(`   Method: ${result._routingDecision.method}`)
      console.log(
        `   Confidence: ${(result._routingDecision.confidence * 100).toFixed(1)}%`,
      )
      if (result._routingDecision.isCritical) {
        console.log(`   ⚠️  CRITICAL FLAG SET`)
      }
    }

    return result
  } catch (error) {
    console.error(`❌ Error during analysis:`, error)
    throw error
  }
}

async function testSlackNotificationService() {
  console.log(`\n🔔 Testing SlackNotificationService`)
  console.log(`${'─'.repeat(80)}`)

  const slackWebhookUrl = config.notifications.slackWebhookUrl()

  if (!slackWebhookUrl) {
    console.log(`⚠️  SLACK_WEBHOOK_URL not configured - skipping Slack test`)
    console.log(
      `   To test Slack notifications, set SLACK_WEBHOOK_URL environment variable`,
    )
    return
  }

  try {
    const slackService = new SlackNotificationService(slackWebhookUrl)

    const testAlert = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      sessionType: 'crisis_protocol_test',
      explicitTaskHint: 'manual_test',
      timestamp: new Date().toISOString(),
      textSample:
        'This is a test crisis alert to verify the notification system is working correctly.',
      decisionDetails: {
        targetAnalyzer: 'crisis',
        method: 'test',
        confidence: 0.95,
        isCritical: true,
      },
    }

    console.log(`📤 Sending test crisis alert to Slack...`)
    await slackService.sendCrisisAlert(testAlert)
    console.log(`✅ Test alert sent successfully!`)
    console.log(`   Check your Slack channel for the test message`)
  } catch (error) {
    console.error(`❌ Failed to send test alert:`, error)
    console.log(
      `   Verify your SLACK_WEBHOOK_URL is correct and the webhook is active`,
    )
  }
}

async function main() {
  const args = process.argv.slice(2)
  const customText = args[0]

  console.log(`🧠 Crisis Protocol Test Suite`)
  console.log(
    `════════════════════════════════════════════════════════════════════════════════`,
  )

  // Test SlackNotificationService first
  await testSlackNotificationService()

  console.log(`\n📊 Running Crisis Detection Tests`)

  if (customText) {
    // Test with custom text
    await testCrisisDetection(customText, 'Custom Text')
  } else {
    // Test with predefined crisis texts
    for (let i = 0; i < DEFAULT_CRISIS_TEXTS.length; i++) {
      const text = DEFAULT_CRISIS_TEXTS[i]
      const testName =
        i < DEFAULT_CRISIS_TEXTS.length - 1
          ? `Crisis Text ${i + 1}`
          : 'Non-Crisis Control Text'

      try {
        await testCrisisDetection(text, testName)
      } catch (error) {
        console.error(`Test failed for "${text}":`, error)
      }

      // Add delay between tests to avoid rate limiting
      if (i < DEFAULT_CRISIS_TEXTS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  console.log(`\n✅ Crisis Protocol Test Suite Complete`)
  console.log(`${'═'.repeat(80)}`)
  console.log(`📋 Summary:`)
  console.log(`   • Crisis detection tests completed`)
  console.log(`   • Check console output for crisis alerts`)
  console.log(`   • Check Slack channel for notification tests`)
  console.log(`   • Review logs for detailed protocol execution`)
  console.log(`\n💡 Tips:`)
  console.log(`   • Set SLACK_WEBHOOK_URL to test Slack notifications`)
  console.log(
    `   • Use custom text: npm run test:crisis-protocol -- "your text here"`,
  )
  console.log(`   • Check MentalLLaMA logs for detailed crisis detection flow`)
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error)
}

export { testCrisisDetection, testSlackNotificationService }
