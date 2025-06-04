/**
 * Page Object Model for the MCP Settings page
 *
 * This class encapsulates all interactions with the MCP settings UI,
 * providing a clean abstraction layer for tests to use.
 */

import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import type { MCPIntegrationType } from '../mcp-helpers'

export class MCPSettingsPage {
  readonly page: Page

  // Page elements
  readonly integrationsSection: Locator
  readonly integrationsList: Locator
  readonly pageHeading: Locator
  readonly refreshButton: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators for page elements
    this.integrationsSection = page.getByTestId('mcp-integration-section')
    this.integrationsList = page.getByTestId('mcp-integrations-list')
    this.pageHeading = page.getByText('Model Context Protocol Integrations')
    this.refreshButton = page.getByTestId('refresh-integrations-button')
  }

  /**
   * Navigate to the MCP settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings/integrations/mcp')
    await this.waitForPageLoad()
  }

  /**
   * Wait for the page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 })
    await expect(this.integrationsSection).toBeVisible()
  }

  /**
   * Get all available integrations displayed on the page
   */
  async getAvailableIntegrations(): Promise<string[]> {
    await expect(this.integrationsList).toBeVisible()

    // Get all integration items
    const integrationItems = this.integrationsList.locator('li')
    const count = await integrationItems.count()

    const integrations: string[] = []
    for (let i = 0; i < count; i++) {
      const itemText = await integrationItems
        .nth(i)
        .locator('[data-testid="integration-name"]')
        .textContent()
      if (itemText) {
        integrations.push(itemText.trim())
      }
    }

    return integrations
  }

  /**
   * Refresh the list of integrations
   */
  async refreshIntegrations(): Promise<void> {
    await this.refreshButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get the integration card element for a specific integration
   */
  getIntegrationCard(integrationType: MCPIntegrationType): Locator {
    return this.page.getByTestId(`integration-card-${integrationType}`)
  }

  /**
   * Check if an integration is displayed on the page
   */
  async isIntegrationDisplayed(
    integrationType: MCPIntegrationType,
  ): Promise<boolean> {
    const card = this.getIntegrationCard(integrationType)
    return await card.isVisible()
  }

  /**
   * Click on the connect button for a specific integration
   */
  async clickConnectButton(integrationType: MCPIntegrationType): Promise<void> {
    const card = this.getIntegrationCard(integrationType)
    const connectButton = card.getByTestId('connect-button')

    await expect(connectButton).toBeVisible()
    await connectButton.click()
  }

  /**
   * Click on the disconnect button for a specific integration
   */
  async clickDisconnectButton(
    integrationType: MCPIntegrationType,
  ): Promise<void> {
    const card = this.getIntegrationCard(integrationType)
    const disconnectButton = card.getByTestId('disconnect-button')

    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()
  }

  /**
   * Confirm an action in a confirmation dialog (e.g., disconnect confirmation)
   */
  async confirmAction(): Promise<void> {
    const confirmButton = this.page.getByTestId('confirm-action-button')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()
  }

  /**
   * Cancel an action in a confirmation dialog
   */
  async cancelAction(): Promise<void> {
    const cancelButton = this.page.getByTestId('cancel-action-button')
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()
  }

  /**
   * Get the connection status for a specific integration
   */
  async getConnectionStatus(
    integrationType: MCPIntegrationType,
  ): Promise<string> {
    const card = this.getIntegrationCard(integrationType)
    const statusElement = card.getByTestId('connection-status')

    await expect(statusElement).toBeVisible()
    const status = await statusElement.textContent()
    return status ? status.trim() : ''
  }

  /**
   * Check if an integration is connected
   */
  async isIntegrationConnected(
    integrationType: MCPIntegrationType,
  ): Promise<boolean> {
    const status = await this.getConnectionStatus(integrationType)
    return status.toLowerCase() === 'connected'
  }

  /**
   * Open the integration details panel
   */
  async openIntegrationDetails(
    integrationType: MCPIntegrationType,
  ): Promise<void> {
    const card = this.getIntegrationCard(integrationType)
    const detailsButton = card.getByTestId('view-details-button')

    await expect(detailsButton).toBeVisible()
    await detailsButton.click()
  }

  /**
   * Get metadata for a connected integration
   */
  async getIntegrationMetadata(
    integrationType: MCPIntegrationType,
  ): Promise<Record<string, string>> {
    // Open the details panel if it exists
    if (
      await this.page
        .getByTestId(`${integrationType}-details-panel`)
        .isVisible({ timeout: 1000 })
        .catch(() => false)
    ) {
      // Already open
    } else {
      await this.openIntegrationDetails(integrationType)
    }

    const metadataPanel = this.page.getByTestId(`${integrationType}-metadata`)
    await expect(metadataPanel).toBeVisible()

    // Get all metadata items
    const metadataItems = metadataPanel.locator('[data-testid="metadata-item"]')
    const count = await metadataItems.count()

    const metadata: Record<string, string> = {}
    for (let i = 0; i < count; i++) {
      const item = metadataItems.nth(i)
      const key = await item
        .locator('[data-testid="metadata-key"]')
        .textContent()
      const value = await item
        .locator('[data-testid="metadata-value"]')
        .textContent()

      if (key && value) {
        metadata[key.trim()] = value.trim()
      }
    }

    return metadata
  }

  /**
   * Check if an authentication modal is visible for a specific integration
   */
  async isAuthModalVisible(
    integrationType: MCPIntegrationType,
  ): Promise<boolean> {
    const authModal = this.page.getByTestId(`${integrationType}-auth-modal`)
    return await authModal.isVisible({ timeout: 2000 }).catch(() => false)
  }

  /**
   * Check if a success message is visible
   */
  async isSuccessMessageVisible(message: string): Promise<boolean> {
    const successMessage = this.page.getByText(message)
    return await successMessage.isVisible({ timeout: 2000 }).catch(() => false)
  }
}
