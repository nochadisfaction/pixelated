/**
 * MCP Helper Utilities
 *
 * Provides helper functions for working with MCP services in tests
 */

import type { Page } from '@playwright/test'
import { MCPSettingsPage } from './page-objects/mcp-settings-page'

/**
 * Available MCP integration types
 */
export type MCPIntegrationType =
  | 'linear'
  | 'github'
  | 'slack'
  | 'jira'
  | 'notion'
  | 'postgres'
  | 'mysql'
  | 'redis'
  | 'opensearch'
  | 'sequentialthinking'
  | 'figma'
  | 'memory'

/**
 * Interface for MCP Integration data
 */
export interface MCPIntegrationData {
  name: string
  connected: boolean
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Helper class for MCP interactions in tests
 */
export class MCPHelper {
  private settingsPage: MCPSettingsPage

  constructor(private page: Page) {
    this.settingsPage = new MCPSettingsPage(page)
  }

  /**
   * Checks if MCP integration is enabled
   * @returns Promise<boolean> - Whether MCP is enabled
   */
  async isMCPEnabled(): Promise<boolean> {
    try {
      // Check for MCP server environment variable
      if (process.env.MCP_ENABLED === 'false') {
        return false
      }

      // Try to execute a simple MCP command to check availability
      return await this.page
        .evaluate(async () => {
          // @ts-expect-error - MCP functions are injected at runtime
          if (typeof window.mcp_browser_tools_takeScreenshot === 'function') {
            return true
          }
          return false
        })
        .catch(() => false)
    } catch (error) {
      console.warn('Error checking MCP status:', error)
      return false
    }
  }

  /**
   * Navigates to MCP integration settings
   */
  async navigateToMCPSettings(): Promise<void> {
    await this.settingsPage.goto()
  }

  /**
   * Connects to a specific MCP integration
   * @param integrationName - Name of the integration to connect to
   * @returns Promise<boolean> - Whether connection was initiated successfully
   */
  async connectToIntegration(
    integrationName: MCPIntegrationType,
  ): Promise<boolean> {
    await this.navigateToMCPSettings()

    // Check if integration is already connected
    if (await this.isIntegrationConnected(integrationName)) {
      console.log(`Integration ${integrationName} is already connected`)
      return false
    }

    if (!(await this.settingsPage.isIntegrationDisplayed(integrationName))) {
      console.warn(`Integration ${integrationName} not found`)
      return false
    }

    // Click the connect button
    await this.settingsPage.clickConnectButton(integrationName)

    // Return true to indicate connection process was initiated
    return true
  }

  /**
   * Lists all available MCP integrations
   * @returns Promise<string[]> - Array of integration names
   */
  async listAvailableIntegrations(): Promise<string[]> {
    await this.navigateToMCPSettings()
    return this.settingsPage.getAvailableIntegrations()
  }

  /**
   * Checks if a specific integration is connected
   * @param integrationName - Name of the integration to check
   * @returns Promise<boolean> - Whether the integration is connected
   */
  async isIntegrationConnected(
    integrationName: MCPIntegrationType,
  ): Promise<boolean> {
    await this.navigateToMCPSettings()
    return this.settingsPage.isIntegrationConnected(integrationName)
  }

  /**
   * Gets integration-specific data for testing
   * @param integrationName - Name of the integration
   * @returns Promise<MCPIntegrationData> - Integration data
   */
  async getIntegrationData(
    integrationName: MCPIntegrationType,
  ): Promise<MCPIntegrationData> {
    const isConnected = await this.isIntegrationConnected(integrationName)

    // Basic data we can always provide
    const data: MCPIntegrationData = {
      name: integrationName,
      connected: isConnected,
      timestamp: Date.now(),
    }

    // If connected, try to get more detailed information
    if (isConnected) {
      try {
        const metadata =
          await this.settingsPage.getIntegrationMetadata(integrationName)
        data.metadata = metadata
      } catch (error) {
        console.warn(
          `Error getting detailed data for ${integrationName}:`,
          error,
        )
      }
    }

    return data
  }

  /**
   * Disconnects from a specific integration
   * @param integrationName - Name of the integration to disconnect
   * @returns Promise<boolean> - True if disconnected successfully
   */
  async disconnectIntegration(
    integrationName: MCPIntegrationType,
  ): Promise<boolean> {
    await this.navigateToMCPSettings()

    // Check if the integration is already disconnected
    if (!(await this.isIntegrationConnected(integrationName))) {
      console.log(`Integration ${integrationName} is already disconnected`)
      return false
    }

    // Click the disconnect button
    await this.settingsPage.clickDisconnectButton(integrationName)

    // Confirm the disconnect action
    await this.settingsPage.confirmAction()

    // Wait for the UI to update
    await this.page.waitForTimeout(1000)

    // Verify the integration is disconnected
    const stillConnected = await this.isIntegrationConnected(integrationName)
    return !stillConnected
  }

  /**
   * Takes a screenshot using MCP browser tools
   * @returns Promise<string> - Base64 encoded screenshot
   */
  async takeScreenshot(): Promise<string | null> {
    try {
      return await this.page.evaluate(async () => {
        // @ts-expect-error - MCP functions are injected at runtime
        return await window.mcp_browser_tools_takeScreenshot({
          random_string: 'unused',
        })
      })
    } catch (error) {
      console.error('Error taking screenshot with MCP:', error)
      return null
    }
  }

  /**
   * Runs an accessibility audit using MCP browser tools
   * @returns Promise<any> - Accessibility audit results
   */
  async runAccessibilityAudit(): Promise<any> {
    try {
      return await this.page.evaluate(async () => {
        // @ts-expect-error - MCP functions are injected at runtime
        return await window.mcp_browser_tools_runAccessibilityAudit({
          random_string: 'unused',
        })
      })
    } catch (error) {
      console.error('Error running accessibility audit with MCP:', error)
      return null
    }
  }

  /**
   * Gets console errors using MCP browser tools
   * @returns Promise<any[]> - Array of console errors
   */
  async getConsoleErrors(): Promise<any[]> {
    try {
      return await this.page.evaluate(async () => {
        // @ts-expect-error - MCP functions are injected at runtime
        return await window.mcp_browser_tools_getConsoleErrors({
          random_string: 'unused',
        })
      })
    } catch (error) {
      console.error('Error getting console errors with MCP:', error)
      return []
    }
  }

  /**
   * Gets network logs using MCP browser tools
   * @returns Promise<any[]> - Array of network logs
   */
  async getNetworkLogs(): Promise<any[]> {
    try {
      return await this.page.evaluate(async () => {
        // @ts-expect-error - MCP functions are injected at runtime
        const logs = await window.mcp_browser_tools_getNetworkLogs({
          random_string: 'unused',
        })
        return logs as any[]
      })
    } catch (error) {
      console.error('Error getting network logs with MCP:', error)
      return []
    }
  }
}
