/**
 * Service-level configuration
 * Centralized constants used across the service
 */

/**
 * Service name used for metrics, logging, and message routing
 * Can be overridden via SERVICE_NAME environment variable
 */
export const SERVICE_NAME = process.env.SERVICE_NAME || 'user-service'

/**
 * Node environment (development, production, test)
 */
export const NODE_ENV = process.env.NODE_ENV || 'development'

/**
 * Service version for tracking and debugging
 */
export const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0'

