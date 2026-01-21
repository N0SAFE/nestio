/**
 * Constant Plugin Examples
 *
 * Demonstrates how to use the constant plugin to define reusable values.
 */

import { createConstant, createEnvConstants } from '../constant';

// Example 1: Simple API configuration constants
export const apiConfigConstants = createConstant({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key-here',
  timeout: 5000,
  maxRetries: 3,
  enableLogging: true,
}, {
  namespace: 'api',
  descriptions: {
    baseUrl: 'Base URL for all API requests',
    apiKey: 'Authentication key',
    timeout: 'Request timeout in milliseconds',
    maxRetries: 'Maximum number of retry attempts',
    enableLogging: 'Enable request/response logging',
  },
});

// Example 2: Application settings
export const appSettingsConstants = createConstant({
  appName: 'My Application',
  version: '1.0.0',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'fr', 'es', 'de'],
  features: {
    darkMode: true,
    notifications: true,
    analytics: false,
  },
  limits: {
    maxUploadSize: 10485760, // 10MB
    maxFileCount: 5,
    sessionTimeout: 3600,
  },
}, {
  namespace: 'app',
});

// Example 3: Database configuration
export const dbConstants = createConstant({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  poolSize: 10,
  ssl: false,
  connectionTimeout: 10000,
}, {
  namespace: 'db',
  descriptions: {
    host: 'Database host',
    port: 'Database port',
    database: 'Database name',
    poolSize: 'Connection pool size',
    ssl: 'Enable SSL connection',
    connectionTimeout: 'Connection timeout in milliseconds',
  },
});

// Example 4: Environment-based constants (using mock values for example)
export const envConstants = createEnvConstants({
  nodeEnv: 'development',
  apiUrl: 'http://localhost:3000',
  debug: true,
  port: 3000,
}, {
  namespace: 'env',
  descriptions: {
    nodeEnv: 'Node environment',
    apiUrl: 'API base URL from environment',
    debug: 'Debug mode enabled',
    port: 'Application port',
  },
});

// Example 5: UI theme constants
export const themeConstants = createConstant({
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  borderRadius: 8,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },
}, {
  namespace: 'theme',
});

// Example 6: Feature flags
export const featureFlagsConstants = createConstant({
  newDashboard: true,
  experimentalFeatures: false,
  betaAccess: true,
  maintenanceMode: false,
  showBanner: true,
  enableChat: true,
}, {
  namespace: 'features',
  descriptions: {
    newDashboard: 'Enable new dashboard UI',
    experimentalFeatures: 'Enable experimental features',
    betaAccess: 'Allow beta feature access',
    maintenanceMode: 'Application in maintenance mode',
    showBanner: 'Show announcement banner',
    enableChat: 'Enable live chat support',
  },
});

// Example 7: Business rules constants
export const businessRulesConstants = createConstant({
  minimumOrderAmount: 10.0,
  shippingThreshold: 50.0,
  taxRate: 0.2,
  discountCodes: ['WELCOME10', 'SAVE20', 'FREESHIP'],
  allowedCountries: ['US', 'CA', 'UK', 'DE', 'FR'],
  paymentMethods: ['credit_card', 'paypal', 'bank_transfer'],
}, {
  namespace: 'business',
  descriptions: {
    minimumOrderAmount: 'Minimum order amount in USD',
    shippingThreshold: 'Free shipping threshold in USD',
    taxRate: 'Default tax rate',
    discountCodes: 'Available discount codes',
    allowedCountries: 'Countries where shipping is available',
    paymentMethods: 'Supported payment methods',
  },
});

// Example 8: Status codes and messages
export const statusConstants = createConstant({
  codes: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  },
  messages: {
    SUCCESS: 'Operation completed successfully',
    CREATED: 'Resource created successfully',
    BAD_REQUEST: 'Invalid request parameters',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    INTERNAL_ERROR: 'An internal error occurred',
  },
}, {
  namespace: 'status',
});

/**
 * Usage in flow:
 *
 * 1. Add constant node at the start of your flow
 * 2. Configure it with createConstant() helper
 * 3. Connect to downstream nodes
 * 4. Access values in downstream nodes via inputs:
 *
 * Example flow:
 * ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
 * │  Constants  │────▶│  HTTP Request│────▶│  Transform  │
 * │  (api config)│     │  (uses url)  │     │             │
 * └─────────────┘     └──────────────┘     └─────────────┘
 *
 * In HTTP Request node, access: inputs.constantNodeId.api.baseUrl
 */
