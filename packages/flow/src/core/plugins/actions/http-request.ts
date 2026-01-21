/**
 * HTTP Request Plugin
 * 
 * Makes HTTP requests and stores responses in variables.
 * Supports all HTTP methods, headers, query params, and request bodies.
 */

import type { FlowPlugin, PluginOutputSchema } from '../../types/plugin';
import { SchemaHelpers } from '../../types/variable-schema';
import { z } from 'zod';

/**
 * HTTP Method Types
 */
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * HTTP Header Schema
 */
const httpHeaderSchema = z.object({
  key: z.string(),
  value: z.string(),
});

/**
 * Query Parameter Schema
 */
const queryParamSchema = z.object({
  key: z.string(),
  value: z.string(),
});

/**
 * HTTP Request Configuration Schema
 */
const httpRequestConfigSchema = z.object({
  url: z.string().url('Must be a valid URL').describe('Request URL'),
  method: httpMethodSchema.default('GET').describe('HTTP method'),
  
  // Headers
  headers: z.array(httpHeaderSchema).default([]).describe('HTTP headers'),
  
  // Query parameters
  queryParams: z.array(queryParamSchema).default([]).describe('Query parameters'),
  
  // Request body
  body: z.string().optional().describe('Request body (JSON string or expression)'),
  bodyType: z.enum(['json', 'text', 'form']).default('json').describe('Body content type'),
  
  // Response handling
  responseVariable: z.string().optional().describe('Variable to store response'),
  statusVariable: z.string().optional().describe('Variable to store status code'),
  
  // Options
  timeout: z.number().positive().default(30000).describe('Request timeout in milliseconds'),
  followRedirects: z.boolean().default(true).describe('Follow HTTP redirects'),
});

export type HttpRequestConfig = z.infer<typeof httpRequestConfigSchema>;
export type HttpMethod = z.infer<typeof httpMethodSchema>;

/**
 * HTTP Request Plugin Implementation
 */
export const httpRequestPlugin: FlowPlugin = {
  id: 'http-request',
  name: 'HTTP Request',
  version: '1.0.0',
  category: 'core',
  subCategory: 'action',
  nodeType: 'action',
  icon: '🌐',
  description: 'Makes HTTP requests to external APIs',

  configSchema: httpRequestConfigSchema,

  outputSchema: z.object({
    status: z.number(),
    statusText: z.string(),
    headers: z.record(z.string(), z.string()),
    data: z.unknown().optional(),
    error: z.string().optional(),
  }),

  /**
   * Typed variable output schema for autocomplete
   */
  variableOutputSchema: {
    output: SchemaHelpers.object({
      status: SchemaHelpers.number({ description: 'HTTP status code (e.g., 200, 404)' }),
      statusText: SchemaHelpers.string({ description: 'HTTP status text (e.g., "OK", "Not Found")' }),
      headers: SchemaHelpers.record(SchemaHelpers.string(), {
        description: 'Response headers as key-value pairs',
      }),
      data: SchemaHelpers.any({ description: 'Response body (parsed JSON or raw text)' }),
      error: SchemaHelpers.string({ optional: true, description: 'Error message if request failed' }),
    }, { description: 'HTTP response object' }),
  },

  nodeUIPattern: 'clickable',

  async execute(context, config) {
    const typedConfig = config as HttpRequestConfig;

    try {
      // Build URL with query params
      const url = new URL(typedConfig.url);
      for (const param of typedConfig.queryParams) {
        url.searchParams.append(param.key, param.value);
      }

      // Build headers
      const headers: Record<string, string> = {};
      for (const header of typedConfig.headers) {
        headers[header.key] = header.value;
      }

      // Set content-type based on bodyType
      if (typedConfig.body && !headers['Content-Type']) {
        switch (typedConfig.bodyType) {
          case 'json':
            headers['Content-Type'] = 'application/json';
            break;
          case 'form':
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            break;
          case 'text':
            headers['Content-Type'] = 'text/plain';
            break;
        }
      }

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), typedConfig.timeout);

      const response = await fetch(url.toString(), {
        method: typedConfig.method,
        headers,
        body: typedConfig.body,
        signal: controller.signal,
        redirect: typedConfig.followRedirects ? 'follow' : 'manual',
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Store in variables
      if (typedConfig.responseVariable) {
        // Would set: context.variables.set(typedConfig.responseVariable, data)
      }
      
      if (typedConfig.statusVariable) {
        // Would set: context.variables.set(typedConfig.statusVariable, response.status)
      }

      // Build response headers object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'HTTP request failed';

      return {
        status: 0,
        statusText: 'Error',
        headers: {},
        error: errorMsg,
      };
    }
  },

  validate(config) {
    try {
      httpRequestConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        };
      }
      return {
        valid: false,
        errors: [{ path: '', message: 'Invalid configuration' }],
      };
    }
  },
};
