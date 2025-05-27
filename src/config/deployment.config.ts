import config from './env.config'

/**
 * Deployment environment configurations
 */
export const deploymentConfig = {
  /**
   * Vercel deployment configuration
   */
  vercel: {
    token: config.deployment.vercelToken(),
    orgId: config.deployment.vercelOrgId(),
    projectId: config.deployment.vercelProjectId(),

    /**
     * Get the current deployment environment (development, preview, production)
     */
    getEnvironment: (): string => {
      return config.deployment.vercelEnv() || 'development'
    },

    /**
     * Check if the application is running in a Vercel environment
     */
    isVercelEnvironment: (): boolean => {
      return !!config.deployment.isVercel()
    },

    /**
     * Check if the application is running in a Vercel production environment
     */
    isProduction: (): boolean => {
      return config.deployment.vercelEnv() === 'production'
    },

    /**
     * Check if the application is running in a Vercel preview environment
     */
    isPreview: (): boolean => {
      return config.deployment.vercelEnv() === 'preview'
    },

    /**
     * Check if the application is running in a Vercel development environment
     */
    isDevelopment: (): boolean => {
      return config.deployment.vercelEnv() === 'development'
    },

    /**
     * Get the URL of the current deploymen
     */
    getDeploymentUrl: (): string => {
      if (config.deployment.vercelUrl()) {
        return `https://${config.deployment.vercelUrl()}`
      }
      return config.client.apiUrl() || ''
    },
  },

  /**
   * Get the base URL for API requests
   */
  getApiBaseUrl: (): string => {
    // Use the deployment URL if running in Vercel
    if (config.deployment.vercelUrl()) {
      return `https://${config.deployment.vercelUrl()}/api`
    }

    // Otherwise use the configured API URL
    return `${config.client.apiUrl() || ''}/api`
  },

  /**
   * Check if the application is running in a development environment
   */
  isDevelopment: (): boolean => {
    return config.isDevelopment() || deploymentConfig.vercel.isDevelopment()
  },

  /**
   * Check if the application is running in a production environment
   */
  isProduction: (): boolean => {
    return config.isProduction() || deploymentConfig.vercel.isProduction()
  },

  /**
   * Check if the application is running in a test environment
   */
  isTest: (): boolean => {
    return config.isTest()
  },
}

export default deploymentConfig
