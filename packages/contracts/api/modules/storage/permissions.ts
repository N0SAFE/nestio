/**
 * Storage Permission Builder
 * 
 * Defines resources and actions for S3-compatible storage using the PermissionBuilder pattern.
 * These permissions are used for:
 * - API key scoped permissions
 * - User role definitions (owner, admin, writer, reader)
 * - Permission validation at runtime
 */

import { PermissionBuilder } from '@repo/auth/permissions';

/**
 * Storage permission builder
 * Defines all resources and their available actions
 */
export const storagePermissionBuilder = new PermissionBuilder()
  .resources(({ actions }) => ({
    // Bucket-level operations
    bucket: actions([
      'list',           // List buckets (GET /buckets)
      'create',         // Create bucket (POST /buckets)
      'read',           // Get bucket info (GET /buckets/:name)
      'update',         // Update bucket settings
      'delete',         // Delete bucket (DELETE /buckets/:name)
      'manage-acl',     // Grant/revoke permissions
    ] as const),
    
    // Object-level operations
    object: actions([
      'list',           // List objects (GET /:bucket/objects)
      'read',           // Download object (GET /:bucket/:key)
      'write',          // Upload object (PUT /:bucket/:key)
      'delete',         // Delete object (DELETE /:bucket/:key)
      'copy',           // Copy object
      'metadata',       // Read/write object metadata
    ] as const),
    
    // Presigned URL operations
    presigned: actions([
      'generate-get',   // Generate download URLs
      'generate-put',   // Generate upload URLs
      'generate-post',  // Generate POST upload URLs
    ] as const),
    
    // Multipart upload operations
    multipart: actions([
      'initiate',       // Start multipart upload
      'upload-part',    // Upload a part
      'complete',       // Complete multipart upload
      'abort',          // Abort multipart upload
      'list-parts',     // List uploaded parts
    ] as const),
  }))
  // Define roles that map to permission sets
  .role('owner').allPermissions()
  .roles(({ permissions }) => ({
    admin: permissions({
      bucket: ['list', 'create', 'read', 'update', 'delete', 'manage-acl'],
      object: ['list', 'read', 'write', 'delete', 'copy', 'metadata'],
      presigned: ['generate-get', 'generate-put', 'generate-post'],
      multipart: ['initiate', 'upload-part', 'complete', 'abort', 'list-parts'],
    }),
    
    writer: permissions({
      bucket: ['list', 'read'],
      object: ['list', 'read', 'write', 'metadata'],
      presigned: ['generate-get', 'generate-put', 'generate-post'],
      multipart: ['initiate', 'upload-part', 'complete', 'abort', 'list-parts'],
    }),
    
    reader: permissions({
      bucket: ['list', 'read'],
      object: ['list', 'read'],
      presigned: ['generate-get'],
      multipart: ['list-parts'],
    }),
  }));

// Build and export configuration
export const storagePermissionConfig = storagePermissionBuilder.build();

// Export individual parts for use across the codebase
export const {
  statement: storageStatement,       // Resource definitions
  ac: storageAc,                     // Access control instance
  roles: storageRoles,               // Role definitions
  schemas: storageSchemas,           // Zod schemas for validation
  statementsConfig,                  // Statement utilities
  rolesConfig,                       // Role utilities
} = storagePermissionConfig;

// Type exports
export type StorageResource = keyof typeof storageStatement;
export type StorageAction<R extends StorageResource> = (typeof storageStatement)[R][number];
export type StorageRole = keyof typeof storageRoles;

/**
 * Full permission type for API keys and user grants
 * Maps resources to arrays of their allowed actions
 */
export type StoragePermissions = {
  [K in StorageResource]?: readonly StorageAction<K>[];
};

/**
 * Helper to check if a role has a specific resource:action permission
 */
export function roleHasPermission(
  role: StorageRole,
  resource: StorageResource,
  action: string
): boolean {
  const rolePermissions = storageRoles[role];
  const statements = rolePermissions.statements as Record<string, readonly string[]>;
  const resourceActions = statements[resource];
  return Array.isArray(resourceActions) && resourceActions.includes(action);
}

/**
 * Helper to get all permissions for a role
 */
export function getRolePermissions(role: StorageRole): StoragePermissions {
  const roleObj = storageRoles[role];
  return roleObj.statements as StoragePermissions;
}
