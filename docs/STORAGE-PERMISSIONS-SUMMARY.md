# Storage Access Control Quick Reference

## TL;DR: Three Access Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 0: BLOCK PUBLIC ACCESS (Safety Override)                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Enabled by default. Rejects ALL unauthenticated requests.          │
│  Must explicitly disable per-bucket if public access needed.        │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: AUTHENTICATION (Who is making the request?)               │
│  ─────────────────────────────────────────────────────────────────  │
│  • API Keys (primary) - Apps, CI/CD, SDKs                           │
│  • User Sessions (secondary) - Humans in web UI                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2: AUTHORIZATION (Does identity have permission?)            │
│  ─────────────────────────────────────────────────────────────────  │
│  • Bucket Policies (JSON) - Conditional rules (IP, time, etc.)      │
│  • User/Key Permissions - Role-based access                         │
└─────────────────────────────────────────────────────────────────────┘
```

| Method | Use | Auth | Typical Users |
|--------|-----|------|---------------|
| **API Keys** (Primary) | Programmatic access | `X-Storage-API-Key` header | Apps, CI/CD, SDKs |
| **User Sessions** (Secondary) | Web UI | Session cookie | Humans in browser |

**Key Insight**: 95% of storage access is programmatic (API keys). User sessions are for web UI collaboration only.

**Permission Model**: Both API keys and user permissions use the **PermissionBuilder pattern** with resource-based permissions (`bucket`, `object`, `presigned`, `multipart` resources).

---

## NEW: Block Public Access (Safety Layer)

> **Inspired by AWS S3**: This is the #1 security feature that prevents accidental data exposure.

### What It Does

Block Public Access is a **safety override** that rejects ALL unauthenticated requests, regardless of any other policy.

- **Enabled by default** on all new buckets
- **Overrides everything** - even if a bucket policy allows public access, this blocks it
- Can be set at **bucket level** or **account level** (account setting overrides bucket)

### Schema Addition

```sql
-- Account-level setting (applies to all buckets)
ALTER TABLE account ADD COLUMN block_public_access BOOLEAN DEFAULT TRUE;

-- Bucket-level setting
ALTER TABLE bucket ADD COLUMN block_public_access BOOLEAN DEFAULT TRUE;
ALTER TABLE bucket ADD COLUMN public_access_reason TEXT; -- Required if disabled
```

### How It Works

```typescript
async function checkBlockPublicAccess(
  request: Request,
  bucket: Bucket
): Promise<void> {
  const isAuthenticated = hasApiKey(request) || hasSession(request);
  
  if (isAuthenticated) {
    return; // Authenticated requests bypass this check
  }
  
  // Check account-level block (highest priority)
  const account = await getAccountSettings();
  if (account.blockPublicAccess) {
    throw new ForbiddenException('Public access is blocked at account level');
  }
  
  // Check bucket-level block
  if (bucket.blockPublicAccess) {
    throw new ForbiddenException('Public access is blocked for this bucket');
  }
  
  // Public access allowed - continue to policy checks
}
```

### Disabling Public Access Block (Requires Reason)

```typescript
// To allow public access, must provide a reason
PUT /storage/buckets/my-bucket/public-access
{
  "blockPublicAccess": false,
  "reason": "Static website hosting - verified public content only"
}

// This creates an audit log entry
// ⚠️ Shows warning in UI: "This bucket allows public access"
```

### Visual Indicator in UI

```
┌─────────────────────────────────────────────────────────────┐
│ 🪣 my-bucket                                                │
│                                                             │
│ ⚠️ PUBLIC ACCESS ENABLED                                    │
│ Reason: Static website hosting - verified public content    │
│ Changed by: alice@example.com on 2026-01-15                 │
└─────────────────────────────────────────────────────────────┘
```

---

## NEW: Bucket Policies (Conditional Access Rules)

> **Inspired by AWS S3 Bucket Policies**: JSON-based rules for advanced access control.

### When to Use Bucket Policies

| Use Case | Solution |
|----------|----------|
| IP restrictions | Bucket policy with `IpAddress` condition |
| Time-based access | Bucket policy with `DateGreaterThan/DateLessThan` |
| Require HTTPS | Bucket policy with `SecureTransport` condition |
| Referer restrictions | Bucket policy with `Referer` condition |
| Read-only for everyone, write for specific IPs | Bucket policy combining effects |

### Bucket Policy Schema

```sql
CREATE TABLE bucket_policy (
  id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL REFERENCES bucket(id) ON DELETE CASCADE,
  policy JSONB NOT NULL,  -- The policy document
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT NOT NULL REFERENCES user(id),
  
  UNIQUE(bucket_id)  -- One policy per bucket
);
```

### Policy Document Structure

```typescript
interface BucketPolicy {
  version: '2024-01-01';
  statements: PolicyStatement[];
}

interface PolicyStatement {
  sid?: string;                    // Statement ID (optional, for documentation)
  effect: 'Allow' | 'Deny';        // Deny always wins
  principals: Principal[];          // Who this applies to
  actions: Action[];               // What actions
  resources: string[];             // Which objects (glob patterns)
  conditions?: Condition[];        // Optional conditions
}

type Principal = 
  | '*'                            // Anyone (public)
  | { userId: string }             // Specific user
  | { apiKeyId: string }           // Specific API key
  | { authenticated: true };       // Any authenticated user

type Action = 
  | 'storage:GetObject'            // Read/download object
  | 'storage:PutObject'            // Upload/overwrite object
  | 'storage:DeleteObject'         // Delete object
  | 'storage:ListBucket'           // List objects in bucket
  | 'storage:GetBucketInfo'        // Get bucket metadata
  | 'storage:*';                   // All actions

interface Condition {
  type: ConditionType;
  key: string;
  value: string | string[];
}

type ConditionType =
  | 'IpAddress'           // Source IP matches CIDR
  | 'NotIpAddress'        // Source IP doesn't match CIDR
  | 'StringEquals'        // Exact string match
  | 'StringNotEquals'     // String doesn't match
  | 'StringLike'          // Glob pattern match (*)
  | 'StringNotLike'       // Glob pattern doesn't match
  | 'DateGreaterThan'     // After date (YYYY-MM-DD)
  | 'DateLessThan'        // Before date
  | 'TimeGreaterThan'     // After time (HH:MM:SS)
  | 'TimeLessThan'        // Before time
  | 'Bool';               // Boolean (secureTransport, etc.)
```

### Example Policies

#### 1. IP Restriction (Office Only)

```json
{
  "version": "2024-01-01",
  "statements": [{
    "sid": "OfficeAccessOnly",
    "effect": "Deny",
    "principals": ["*"],
    "actions": ["storage:*"],
    "resources": ["*"],
    "conditions": [{
      "type": "NotIpAddress",
      "key": "sourceIp",
      "value": ["203.0.113.0/24", "198.51.100.0/24"]
    }]
  }]
}
```

#### 2. HTTPS Required

```json
{
  "version": "2024-01-01",
  "statements": [{
    "sid": "RequireHTTPS",
    "effect": "Deny",
    "principals": ["*"],
    "actions": ["storage:*"],
    "resources": ["*"],
    "conditions": [{
      "type": "Bool",
      "key": "secureTransport",
      "value": "false"
    }]
  }]
}
```

#### 3. Time-Based Access (Business Hours Only)

```json
{
  "version": "2024-01-01",
  "statements": [
    {
      "sid": "DenyAfterHours",
      "effect": "Deny",
      "principals": ["*"],
      "actions": ["storage:PutObject", "storage:DeleteObject"],
      "resources": ["*"],
      "conditions": [{
        "type": "TimeGreaterThan",
        "key": "currentTime",
        "value": "18:00:00"
      }]
    },
    {
      "sid": "DenyBeforeHours",
      "effect": "Deny",
      "principals": ["*"],
      "actions": ["storage:PutObject", "storage:DeleteObject"],
      "resources": ["*"],
      "conditions": [{
        "type": "TimeLessThan",
        "key": "currentTime",
        "value": "09:00:00"
      }]
    }
  ]
}
```

> **Note**: Time conditions within a single statement use AND logic. To deny access outside 9am-6pm, we need two separate Deny statements.

#### 4. Read-Only Public, Write from Specific IPs

```json
{
  "version": "2024-01-01",
  "statements": [
    {
      "sid": "PublicRead",
      "effect": "Allow",
      "principals": ["*"],
      "actions": ["storage:GetObject"],
      "resources": ["public/*"]
    },
    {
      "sid": "WriteFromCIOnly",
      "effect": "Deny",
      "principals": ["*"],
      "actions": ["storage:PutObject", "storage:DeleteObject"],
      "resources": ["*"],
      "conditions": [{
        "type": "NotIpAddress",
        "key": "sourceIp",
        "value": ["10.0.0.0/8"]
      }]
    }
  ]
}
```

#### 5. Referer Restriction (Hotlink Protection)

```json
{
  "version": "2024-01-01",
  "statements": [{
    "sid": "HotlinkProtection",
    "effect": "Deny",
    "principals": ["*"],
    "actions": ["storage:GetObject"],
    "resources": ["images/*"],
    "conditions": [{
      "type": "StringNotLike",
      "key": "referer",
      "value": ["https://mysite.com/*", "https://www.mysite.com/*"]
    }]
  }]
}
```

### Policy Evaluation Flow

```typescript
async function evaluateBucketPolicy(
  bucket: Bucket,
  request: StorageRequest
): Promise<'Allow' | 'Deny' | 'NoMatch'> {
  const policy = await getBucketPolicy(bucket.id);
  
  if (!policy) return 'NoMatch';  // No policy = defer to other checks
  
  let hasAllow = false;
  
  for (const statement of policy.statements) {
    // Check if statement applies to this request
    if (!matchesPrincipal(statement.principals, request.identity)) continue;
    if (!matchesAction(statement.actions, request.action)) continue;
    if (!matchesResource(statement.resources, request.objectKey)) continue;
    if (!evaluateConditions(statement.conditions, request)) continue;
    
    // Statement applies!
    if (statement.effect === 'Deny') {
      return 'Deny';  // Explicit deny always wins
    }
    
    hasAllow = true;
  }
  
  return hasAllow ? 'Allow' : 'NoMatch';
}
```

---

## Object Key Prefixes in API Keys

> Allow API keys to be scoped to specific paths within a bucket.

See the full API Key schema in the "API Keys" section below. The `allowed_prefixes` field enables path-level scoping.

### Prefix-Scoped Key Examples

```typescript
// Key that can only write to uploads/user-123/
const { apiKey } = await storage.apiKeys.create({
  name: 'User Upload Key',
  bucketIds: ['user-content'],
  allowedActions: ['read', 'write'],
  allowedPrefixes: ['uploads/user-123/*'],  // NEW
});

// Key for CI/CD that can only deploy to dist/
const { apiKey } = await storage.apiKeys.create({
  name: 'CI Deploy Key',
  bucketIds: ['static-assets'],
  allowedActions: ['read', 'write', 'delete'],
  allowedPrefixes: ['dist/*', 'assets/*'],
});

// Key scoped to specific folder
const { apiKey } = await storage.apiKeys.create({
  name: 'Processing Worker',
  bucketIds: ['data-bucket'],
  allowedActions: ['read', 'write'],
  allowedPrefixes: ['temp/*'],      // Can only access temp/ folder
});
```

### Prefix Check in Permission Flow

```typescript
async function checkApiKeyAccess(
  apiKey: ValidatedKey,
  bucketId: string,
  objectKey: string,  // e.g., "uploads/user-123/file.pdf"
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // ... existing checks ...
  
  // NEW: Check object key matches allowed prefixes
  if (apiKey.allowedPrefixes !== null) {
    const keyMatchesPrefix = apiKey.allowedPrefixes.some(prefix => 
      matchGlob(objectKey, prefix)
    );
    
    if (!keyMatchesPrefix) {
      return false;  // Object path not allowed
    }
  }
  
  // ... continue with creator permission check ...
}
```

---

## NEW: Audit Logging

> Track all access for security and compliance.

### Audit Log Schema

```sql
CREATE TABLE storage_audit_log (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Who
  auth_type TEXT NOT NULL,          -- 'api_key' | 'user_session' | 'public'
  user_id TEXT REFERENCES user(id),
  api_key_id TEXT REFERENCES storage_api_key(id),
  api_key_name TEXT,                -- Denormalized for deleted keys
  
  -- What
  action TEXT NOT NULL,             -- 'GetObject', 'PutObject', 'DeleteObject', etc.
  bucket_id TEXT NOT NULL,
  bucket_name TEXT NOT NULL,        -- Denormalized
  object_key TEXT,
  
  -- Request details
  source_ip TEXT,
  user_agent TEXT,
  request_id TEXT UNIQUE NOT NULL,
  
  -- Result
  status_code INTEGER NOT NULL,
  error_code TEXT,                  -- 'AccessDenied', 'NotFound', etc.
  bytes_transferred BIGINT,
  duration_ms INTEGER,
  
  -- Indexing
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_bucket (bucket_id, timestamp),
  INDEX idx_audit_user (user_id, timestamp),
  INDEX idx_audit_key (api_key_id, timestamp)
);
```

### What Gets Logged

| Event | Logged | Details |
|-------|--------|---------|
| Object read (GET) | ✅ | Key/user, bucket, object, bytes |
| Object write (PUT) | ✅ | Key/user, bucket, object, bytes |
| Object delete | ✅ | Key/user, bucket, object |
| List bucket | ✅ | Key/user, bucket, prefix |
| Access denied | ✅ | Key/user, bucket, object, reason |
| API key created | ✅ | User, key name, permissions |
| API key revoked | ✅ | User, key name, reason |
| Permission granted | ✅ | Granter, grantee, bucket, role |
| Permission revoked | ✅ | Revoker, revokee, bucket |
| Bucket policy changed | ✅ | User, bucket, old/new policy |
| Public access changed | ✅ | User, bucket, old/new setting |

### Querying Audit Logs

```typescript
// Who accessed this bucket in the last 24 hours?
GET /storage/buckets/my-bucket/audit-logs?since=24h

// What did this API key do?
GET /storage/api-keys/{id}/audit-logs

// All denied requests (security monitoring)
GET /storage/audit-logs?status=denied&since=7d

// Export for compliance
GET /storage/audit-logs?from=2026-01-01&to=2026-01-31&format=csv
```

---

## NEW: Presigned URLs with Conditions

> Enhanced presigned URLs with additional security constraints.

### Enhanced Presigned URL Options

```typescript
interface PresignedUrlOptions {
  bucket: string;
  objectKey: string;
  expiresIn: number;            // Seconds
  
  // NEW: Conditions
  conditions?: {
    contentType?: string;       // Required content-type for uploads
    contentLengthMin?: number;  // Minimum file size
    contentLengthMax?: number;  // Maximum file size (prevent abuse)
    sourceIp?: string[];        // Allowed IPs
    requireHttps?: boolean;     // HTTPS only
  };
  
  // NEW: Metadata for uploads
  metadata?: Record<string, string>;
}
```

### Presigned Upload with Size Limit

```typescript
// Generate presigned URL that only accepts files up to 10MB
const { url, fields } = await storage.presignedUploadUrl({
  bucket: 'user-uploads',
  objectKey: 'avatar.png',
  expiresIn: 3600,
  conditions: {
    contentType: 'image/*',
    contentLengthMax: 10 * 1024 * 1024,  // 10MB
  }
});

// Client must include these conditions or upload fails
```

### Presigned URL Validation

```typescript
async function validatePresignedRequest(
  signedUrl: ParsedPresignedUrl,
  request: Request
): Promise<void> {
  // Check expiration
  if (signedUrl.expiresAt < Date.now()) {
    throw new ExpiredUrlException();
  }
  
  // Verify signature
  const expectedSignature = computeSignature(signedUrl.params);
  if (signedUrl.signature !== expectedSignature) {
    throw new InvalidSignatureException();
  }
  
  // NEW: Validate conditions
  if (signedUrl.conditions) {
    const { conditions } = signedUrl;
    
    if (conditions.contentType) {
      const contentType = request.headers.get('Content-Type');
      if (!matchGlob(contentType, conditions.contentType)) {
        throw new ConditionFailedException('Content-Type mismatch');
      }
    }
    
    if (conditions.contentLengthMax) {
      const contentLength = parseInt(request.headers.get('Content-Length') || '0');
      if (contentLength > conditions.contentLengthMax) {
        throw new ConditionFailedException('File too large');
      }
    }
    
    if (conditions.sourceIp) {
      const clientIp = getClientIp(request);
      if (!conditions.sourceIp.some(ip => ipMatches(clientIp, ip))) {
        throw new ConditionFailedException('IP not allowed');
      }
    }
  }
}
```

---

## API Keys (Primary Access Method)

### Core Security Principle

> **API keys can ONLY have permissions ≤ the creating user's permissions.**
> 
> You cannot delegate more access than you have. This prevents privilege escalation.

**Examples:**
- User has `writer` on bucket A → Can create key with `object:read` or `object:write` on A ✅
- User has `writer` on bucket A → Cannot create key with `object:delete` on A ❌ (escalation)
- User has no access to bucket B → Cannot create key for bucket B ❌

### What API Keys Provide

- **Delegated permissions**: Subset of YOUR permissions (never more)
- **Resource-based scoping**: Uses PermissionBuilder resources for type-safe permissions
- **Time-limited**: Optional expiration (e.g., 90 days for contractors)
- **Self-service**: Users generate and manage their own keys
- **Revocable**: Keys can be revoked instantly
- **Trackable**: Last used, usage count, rate limiting
- **Metadata**: Custom key-value pairs for tracking, tagging, and organization

---

## PermissionBuilder Integration for API Keys

API keys use the **same PermissionBuilder pattern** as the rest of the platform. The storage resources define what permissions CAN be granted to API keys.

### Storage Permission Builder Definition

```typescript
// packages/contracts/api/modules/storage/permissions.ts
import { PermissionBuilder } from "@repo/auth/permissions";

/**
 * Storage permission builder
 * These resources define what permissions can be assigned to API keys
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

// Export built configuration
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
```

### API Key Permission Schema (Resource-Based)

API key permissions are stored as a **resource → actions mapping**, matching the PermissionBuilder structure:

```typescript
/**
 * API Key permission structure
 * Maps resources to their allowed actions
 * Must be a SUBSET of the user's permissions
 */
type ApiKeyPermissions = {
  bucket?: ('list' | 'create' | 'read' | 'update' | 'delete' | 'manage-acl')[];
  object?: ('list' | 'read' | 'write' | 'delete' | 'copy' | 'metadata')[];
  presigned?: ('generate-get' | 'generate-put' | 'generate-post')[];
  multipart?: ('initiate' | 'upload-part' | 'complete' | 'abort' | 'list-parts')[];
};

// Zod schema for validation (derived from PermissionBuilder)
const apiKeyPermissionsSchema = z.object({
  bucket: z.array(storageSchemas.statements.bucket.action).optional(),
  object: z.array(storageSchemas.statements.object.action).optional(),
  presigned: z.array(storageSchemas.statements.presigned.action).optional(),
  multipart: z.array(storageSchemas.statements.multipart.action).optional(),
});
```

### API Key Schema (Complete with Metadata)

```sql
CREATE TABLE storage_api_key (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,    -- SHA-256 of full key (never store plain key)
  key_prefix TEXT NOT NULL,         -- e.g., "sak_prod_abc" for display/identification
  name TEXT NOT NULL,               -- User-given descriptive name
  description TEXT,                 -- Optional longer description
  
  -- Ownership
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organization(id),
  
  -- Resource-Based Permissions (from PermissionBuilder)
  permissions JSONB NOT NULL,       -- { bucket: ['list', 'read'], object: ['list', 'read', 'write'], ... }
  
  -- Bucket Scoping
  bucket_ids TEXT[],                -- NULL = all user's accessible buckets, or specific IDs
  allowed_prefixes TEXT[],          -- NULL = all paths, or specific prefixes like ['uploads/*']
  
  -- Metadata (for tracking, tagging, organization)
  metadata JSONB DEFAULT '{}',      -- Custom key-value pairs
  tags TEXT[] DEFAULT '{}',         -- Quick tags for filtering
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,             -- NULL = never expires
  last_used_at TIMESTAMP,           -- Updated on each use
  last_used_ip TEXT,                -- IP of last request
  revoked_at TIMESTAMP,             -- NULL = active, set timestamp to revoke
  revoked_by TEXT REFERENCES user(id),
  revoked_reason TEXT,              -- Why was it revoked?
  
  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER,       -- NULL = no daily limit
  
  -- Usage Tracking
  total_requests BIGINT DEFAULT 0,
  total_bytes_read BIGINT DEFAULT 0,
  total_bytes_written BIGINT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_api_key_hash ON storage_api_key(key_hash);
CREATE INDEX idx_api_key_user ON storage_api_key(user_id);
CREATE INDEX idx_api_key_org ON storage_api_key(organization_id);
CREATE INDEX idx_api_key_tags ON storage_api_key USING GIN(tags);
CREATE INDEX idx_api_key_metadata ON storage_api_key USING GIN(metadata);
```

### API Key TypeScript Types

```typescript
import { z } from 'zod';
import { storageSchemas, type StorageResource, type StorageAction } from './permissions';

/**
 * API Key metadata schema
 * Custom key-value pairs for tracking and organization
 */
export const apiKeyMetadataSchema = z.record(z.string(), z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
])).optional();

/**
 * API Key creation input
 */
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  
  // Resource-based permissions (from PermissionBuilder)
  permissions: z.object({
    bucket: z.array(storageSchemas.statements.bucket.action).optional(),
    object: z.array(storageSchemas.statements.object.action).optional(),
    presigned: z.array(storageSchemas.statements.presigned.action).optional(),
    multipart: z.array(storageSchemas.statements.multipart.action).optional(),
  }),
  
  // Scoping
  bucketIds: z.array(z.string()).nullable().optional(),  // NULL = all accessible
  allowedPrefixes: z.array(z.string()).nullable().optional(),
  
  // Metadata
  metadata: apiKeyMetadataSchema,
  tags: z.array(z.string().max(50)).max(10).optional(),
  
  // Lifecycle
  expiresInDays: z.number().positive().max(365).optional(),
  
  // Rate limiting
  rateLimitPerMinute: z.number().positive().optional(),
  rateLimitPerDay: z.number().positive().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/**
 * API Key response (returned after creation)
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: ApiKeyPermissions;
  bucketIds: string[] | null;
  allowedPrefixes: string[] | null;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * Validated API Key (internal use after authentication)
 */
export interface ValidatedApiKey {
  id: string;
  userId: string;
  organizationId: string | null;
  permissions: ApiKeyPermissions;
  bucketIds: string[] | null;
  allowedPrefixes: string[] | null;
  metadata: Record<string, unknown>;
}
```

### API Key Format

```
sak_{environment}_{random_32_chars}

Examples:
sak_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
sak_dev_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
sak_test_9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p

Prefix breakdown:
- sak   = Storage API Key
- _prod = Environment (prod/dev/test/staging)
- _...  = 32 random alphanumeric characters
```

### Permission Check Flow (API Key with Resources)

```typescript
import { storageAc } from './permissions';

async function checkApiKeyAccess(
  apiKey: ValidatedApiKey,
  bucketId: string,
  resource: StorageResource,     // 'bucket' | 'object' | 'presigned' | 'multipart'
  action: string,                // Resource-specific action
  objectKey?: string             // For prefix checking
): Promise<boolean> {
  // 1. Check resource:action is in key's permissions
  const allowedActions = apiKey.permissions[resource];
  if (!allowedActions || !allowedActions.includes(action)) {
    return false;
  }
  
  // 2. Check bucket scope
  if (apiKey.bucketIds !== null && !apiKey.bucketIds.includes(bucketId)) {
    return false;
  }
  
  // 3. Check object prefix (for object operations)
  if (resource === 'object' && objectKey && apiKey.allowedPrefixes !== null) {
    const matchesPrefix = apiKey.allowedPrefixes.some(prefix => 
      matchGlob(objectKey, prefix)
    );
    if (!matchesPrefix) {
      return false;
    }
  }
  
  // 4. CRITICAL: Verify key creator still has this permission
  const creatorHasAccess = await checkUserResourceAccess(
    apiKey.userId,
    bucketId,
    resource,
    action
  );
  
  return creatorHasAccess;
}

/**
 * Check if user has resource:action permission on a bucket
 */
async function checkUserResourceAccess(
  userId: string,
  bucketId: string,
  resource: StorageResource,
  action: string
): Promise<boolean> {
  const bucket = await getBucketById(bucketId);
  
  // Owner has all permissions
  if (bucket.ownerId === userId) {
    return true;
  }
  
  // Check explicit permission grant
  const permission = await getBucketPermission(bucketId, userId);
  if (!permission) return false;
  
  // Check expiration
  if (permission.expiresAt && permission.expiresAt < new Date()) {
    return false;
  }
  
  // Use PermissionBuilder's access control to check role permissions
  const rolePermissions = storageAc.authorize(permission.role);
  return rolePermissions[resource]?.includes(action) ?? false;
}
```

### API Key Creation with PermissionBuilder Validation

```typescript
import { storageAc, storagePermissionBuilder } from './permissions';

async function createApiKey(
  userId: string,
  params: CreateApiKeyInput
): Promise<{ apiKey: string; keyId: string }> {
  // 1. Validate requested permissions exist in PermissionBuilder
  const validResources = storagePermissionBuilder.getStatementNames();
  
  for (const [resource, actions] of Object.entries(params.permissions)) {
    // Check resource exists
    if (!validResources.includes(resource)) {
      throw new BadRequestException(`Unknown resource: ${resource}`);
    }
    
    // Check actions are valid for this resource
    const validActions = storagePermissionBuilder.statement[resource];
    for (const action of actions) {
      if (!validActions.includes(action)) {
        throw new BadRequestException(
          `Invalid action '${action}' for resource '${resource}'. ` +
          `Valid actions: ${validActions.join(', ')}`
        );
      }
    }
  }
  
  // 2. Validate user has each requested permission
  for (const bucketId of params.bucketIds ?? []) {
    for (const [resource, actions] of Object.entries(params.permissions)) {
      for (const action of actions) {
        const userHasAccess = await checkUserResourceAccess(
          userId, bucketId, resource as StorageResource, action
        );
        
        if (!userHasAccess) {
          throw new ForbiddenException(
            `Cannot create API key with '${resource}:${action}' on bucket '${bucketId}' - ` +
            `you don't have that permission`
          );
        }
      }
    }
  }
  
  // 3. Generate key
  const rawKey = `sak_${env}_${generateSecureRandom(32)}`;
  const keyHash = sha256(rawKey);
  const keyId = generateId();
  
  // 4. Store key with permissions and metadata
  await db.insert(storageApiKey).values({
    id: keyId,
    keyHash,
    keyPrefix: rawKey.slice(0, 12),
    name: params.name,
    description: params.description,
    userId,
    permissions: params.permissions,
    bucketIds: params.bucketIds ?? null,
    allowedPrefixes: params.allowedPrefixes ?? null,
    metadata: params.metadata ?? {},
    tags: params.tags ?? [],
    expiresAt: params.expiresInDays 
      ? addDays(new Date(), params.expiresInDays) 
      : null,
    rateLimitPerMinute: params.rateLimitPerMinute ?? 1000,
    rateLimitPerDay: params.rateLimitPerDay,
  });
  
  // 5. Return raw key ONCE - user must save it
  return { apiKey: rawKey, keyId };
}
```

### Metadata Use Cases

```typescript
// Example 1: Environment tracking
const { apiKey } = await storage.apiKeys.create({
  name: 'Production Backend',
  permissions: {
    object: ['list', 'read', 'write'],
    presigned: ['generate-put'],
  },
  metadata: {
    environment: 'production',
    service: 'api-server',
    team: 'backend',
    costCenter: 'eng-123',
  },
  tags: ['production', 'backend', 'api'],
});

// Example 2: Client/customer tracking
const { apiKey } = await storage.apiKeys.create({
  name: `Customer ${customerId}`,
  permissions: {
    object: ['list', 'read', 'write'],
  },
  bucketIds: [`customer-${customerId}`],
  metadata: {
    customerId,
    customerName: customer.name,
    plan: customer.plan,
    createdBy: adminUserId,
  },
  tags: ['customer', customer.plan],
});

// Example 3: CI/CD pipeline tracking
const { apiKey } = await storage.apiKeys.create({
  name: 'GitHub Actions - Deploy',
  permissions: {
    object: ['list', 'read', 'write', 'delete'],
  },
  allowedPrefixes: ['dist/*', 'assets/*'],
  metadata: {
    pipeline: 'github-actions',
    repository: 'myorg/myrepo',
    workflow: 'deploy.yml',
    createdAt: new Date().toISOString(),
  },
  tags: ['ci-cd', 'github', 'deploy'],
  expiresInDays: 365,
});

// Querying keys by metadata/tags
GET /storage/api-keys?tags=production
GET /storage/api-keys?metadata.environment=production
GET /storage/api-keys?metadata.customerId=cust_123
```

### Role-Based Key Templates

Create API keys using predefined role templates:

```typescript
/**
 * Create an API key with a predefined role's permissions
 */
async function createApiKeyFromRole(
  userId: string,
  roleName: StorageRole,
  params: Omit<CreateApiKeyInput, 'permissions'>
): Promise<{ apiKey: string; keyId: string }> {
  // Get permissions from role definition
  const rolePermissions = storageRoles[roleName];
  
  if (!rolePermissions) {
    throw new BadRequestException(`Unknown role: ${roleName}`);
  }
  
  return createApiKey(userId, {
    ...params,
    permissions: rolePermissions.statements,
    metadata: {
      ...params.metadata,
      createdFromRole: roleName,
    },
  });
}

// Usage examples:

// Create a reader key (list + read on buckets and objects)
const readerKey = await createApiKeyFromRole(userId, 'reader', {
  name: 'Read-Only Analytics',
  bucketIds: ['analytics-data'],
  tags: ['analytics', 'readonly'],
});

// Create a writer key (includes write permissions)
const writerKey = await createApiKeyFromRole(userId, 'writer', {
  name: 'Upload Service',
  bucketIds: ['uploads'],
  allowedPrefixes: ['incoming/*'],
});

// Create an admin key (full access)
const adminKey = await createApiKeyFromRole(userId, 'admin', {
  name: 'Admin Tool',
  expiresInDays: 30,  // Short expiry for admin keys
});
```

### Permission Preset Helpers (Type-Safe from PermissionBuilder)

Permission presets are built using a **dedicated PermissionBuilder** that only defines resources (no roles). This ensures full type safety:

```typescript
import { PermissionBuilder } from "@repo/auth/permissions";

/**
 * Storage preset builder - defines resources only
 * This is the single source of truth for all storage permission presets
 */
const storagePresetBuilder = new PermissionBuilder()
  .resources(({ actions }) => ({
    bucket: actions([
      'list',
      'create', 
      'read',
      'update',
      'delete',
      'manage-acl',
    ] as const),
    
    object: actions([
      'list',
      'read',
      'write',
      'delete',
      'copy',
      'metadata',
    ] as const),
    
    presigned: actions([
      'generate-get',
      'generate-put',
      'generate-post',
    ] as const),
    
    multipart: actions([
      'initiate',
      'upload-part',
      'complete',
      'abort',
      'list-parts',
    ] as const),
  }));

// Get the statement (resources) from the builder
const storageResources = storagePresetBuilder.getStatement();

// Infer types from the builder
type StorageResources = typeof storageResources;
type StorageResource = keyof StorageResources;
type StorageAction<R extends StorageResource> = StorageResources[R][number];

/**
 * Type-safe permission preset type
 * Each resource maps to an array of its valid actions
 */
type StoragePermissionPreset = {
  [K in StorageResource]?: readonly StorageAction<K>[];
};

/**
 * Common permission presets - type-checked against PermissionBuilder resources
 * 
 * Using storagePresetBuilder.createPermission() for compile-time validation
 */
export const permissionPresets = {
  // Read-only access
  readOnly: storagePresetBuilder.createPermission({
    bucket: ['list', 'read'],
    object: ['list', 'read'],
    presigned: ['generate-get'],
  }),
  
  // Upload only (write but no read/delete)
  uploadOnly: storagePresetBuilder.createPermission({
    bucket: ['list', 'read'],
    object: ['write'],
    presigned: ['generate-put', 'generate-post'],
    multipart: ['initiate', 'upload-part', 'complete', 'abort'],
  }),
  
  // Read and write (no delete)
  readWrite: storagePresetBuilder.createPermission({
    bucket: ['list', 'read'],
    object: ['list', 'read', 'write', 'metadata'],
    presigned: ['generate-get', 'generate-put', 'generate-post'],
    multipart: ['initiate', 'upload-part', 'complete', 'abort', 'list-parts'],
  }),
  
  // Full object access (including delete)
  fullObjects: storagePresetBuilder.createPermission({
    bucket: ['list', 'read'],
    object: ['list', 'read', 'write', 'delete', 'copy', 'metadata'],
    presigned: ['generate-get', 'generate-put', 'generate-post'],
    multipart: ['initiate', 'upload-part', 'complete', 'abort', 'list-parts'],
  }),
  
  // CDN / edge server (read-only, optimized)
  cdn: storagePresetBuilder.createPermission({
    object: ['read'],
    presigned: ['generate-get'],
  }),
  
  // Backup service (read all, no write)
  backup: storagePresetBuilder.createPermission({
    bucket: ['list', 'read'],
    object: ['list', 'read', 'copy'],
    presigned: ['generate-get'],
    multipart: ['list-parts'],
  }),
  
  // Admin (full access to everything)
  admin: storagePresetBuilder.createPermission({
    bucket: ['list', 'create', 'read', 'update', 'delete', 'manage-acl'],
    object: ['list', 'read', 'write', 'delete', 'copy', 'metadata'],
    presigned: ['generate-get', 'generate-put', 'generate-post'],
    multipart: ['initiate', 'upload-part', 'complete', 'abort', 'list-parts'],
  }),
} as const;

// Export types for preset names and values
export type PermissionPresetName = keyof typeof permissionPresets;
export type PermissionPreset = typeof permissionPresets[PermissionPresetName];

// Export the builder for custom preset creation
export { storagePresetBuilder };
```

### Why Use PermissionBuilder for Presets?

1. **Single Source of Truth**: Resources are defined once in the builder
2. **Compile-Time Validation**: `createPermission()` validates all resources and actions
3. **Type Inference**: TypeScript infers exact types from the builder
4. **Autocomplete**: IDE suggests valid actions for each resource
5. **Refactoring Safe**: Rename an action and TypeScript catches all usages

```typescript
// ✅ This works - all actions are valid
const valid = storagePresetBuilder.createPermission({
  object: ['read', 'write'],
});

// ❌ This fails at compile time - 'download' is not a valid action
const invalid = storagePresetBuilder.createPermission({
  object: ['read', 'download'],  // TypeScript Error!
});

// ❌ This fails at compile time - 'files' is not a valid resource
const alsoInvalid = storagePresetBuilder.createPermission({
  files: ['read'],  // TypeScript Error!
});
```

### Custom Preset Creation

Users can create custom presets using the same builder:

```typescript
// Create a custom preset for a specific use case
const myCustomPreset = storagePresetBuilder.createPermission({
  bucket: ['list', 'read'],
  object: ['list', 'read', 'write'],
  // Only generate-put presigned URLs (no download URLs)
  presigned: ['generate-put'],
  multipart: ['initiate', 'upload-part', 'complete'],
});

// Use in API key creation
const { apiKey } = await storage.apiKeys.create({
  name: 'Custom Upload Service',
  permissions: myCustomPreset,
  bucketIds: ['my-bucket'],
});
```

### Advanced: Preset Builder from PermissionBuilder Roles

You can also create presets directly from the PermissionBuilder's role definitions:

```typescript
import { storagePermissionBuilder, storageRoles, type StorageRole } from './permissions';

/**
 * Create a preset from an existing role definition
 * This extracts the permissions from a role defined in the PermissionBuilder
 */
function presetFromRole(roleName: StorageRole): StoragePermissionPreset {
  const role = storageRoles[roleName];
  if (!role) {
    throw new Error(`Unknown role: ${roleName}`);
  }
  // Role.statements contains the permission mapping
  return role.statements as StoragePermissionPreset;
}

/**
 * Role-based presets (derived from PermissionBuilder roles)
 */
export const rolePresets = {
  reader: presetFromRole('reader'),
  writer: presetFromRole('writer'),
  admin: presetFromRole('admin'),
} as const;

// Usage - these are equivalent:
const key1 = await storage.apiKeys.create({
  name: 'Reader Key',
  permissions: permissionPresets.readOnly,  // Manual preset
});

const key2 = await storage.apiKeys.create({
  name: 'Reader Key',
  permissions: rolePresets.reader,  // From role definition
});
```

### Preset Composition (Combining Presets)

```typescript
/**
 * Merge multiple presets into one
 * Later presets override earlier ones for the same resource
 */
function mergePresets(...presets: StoragePermissions[]): StoragePermissions {
  const result: Record<string, string[]> = {};
  
  for (const preset of presets) {
    for (const [resource, actions] of Object.entries(preset)) {
      if (!result[resource]) {
        result[resource] = [];
      }
      // Add unique actions
      for (const action of actions) {
        if (!result[resource].includes(action)) {
          result[resource].push(action);
        }
      }
    }
  }
  
  return result as StoragePermissions;
}

/**
 * Restrict a preset to specific resources
 */
function pickResources<T extends StoragePermissions, K extends keyof T>(
  preset: T,
  resources: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of resources) {
    if (preset[key]) {
      result[key] = preset[key];
    }
  }
  return result;
}

// Usage examples:

// Combine readOnly with multipart access
const readWithMultipart = mergePresets(
  permissionPresets.readOnly,
  { multipart: ['list-parts'] }
);

// Take only object permissions from a preset
const objectOnly = pickResources(permissionPresets.readWrite, ['object']);
// Result: { object: ['list', 'read', 'write', 'metadata'] }
```

### Validation Against PermissionBuilder

```typescript
import { storagePermissionBuilder } from './permissions';

/**
 * Validate that a permissions object only contains valid resource:action pairs
 * Uses the PermissionBuilder as the source of truth
 */
function validatePermissions(permissions: Record<string, string[]>): void {
  const validResources = storagePermissionBuilder.getStatementNames();
  
  for (const [resource, actions] of Object.entries(permissions)) {
    // Check resource exists
    if (!validResources.includes(resource as any)) {
      throw new Error(
        `Invalid resource '${resource}'. Valid resources: ${validResources.join(', ')}`
      );
    }
    
    // Check actions are valid for this resource
    const validActions = storagePermissionBuilder.statement[resource as keyof typeof storageStatement];
    for (const action of actions) {
      if (!validActions.includes(action as any)) {
        throw new Error(
          `Invalid action '${action}' for resource '${resource}'. ` +
          `Valid actions: ${validActions.join(', ')}`
        );
      }
    }
  }
}

// Runtime validation example
try {
  validatePermissions({
    object: ['read', 'write', 'invalid-action'],  // ❌ Will throw
  });
} catch (error) {
  // "Invalid action 'invalid-action' for resource 'object'. 
  //  Valid actions: list, read, write, delete, copy, metadata"
}
```

### Using Presets in API Key Creation

```typescript
// Usage with presets
const cdnKey = await storage.apiKeys.create({
  name: 'CDN Edge Server',
  permissions: permissionPresets.cdn,  // Type-safe, from PermissionBuilder
  bucketIds: ['static-assets'],
  metadata: {
    edgeLocation: 'us-east-1',
    provider: 'cloudflare',
  },
});

// Custom permissions (also type-checked)
const customKey = await storage.apiKeys.create({
  name: 'Custom Service',
  permissions: createPreset({
    bucket: ['list', 'read'],
    object: ['list', 'read', 'write'],
    // 'invalid-action' would be a TypeScript error here ✅
  }),
  bucketIds: ['my-bucket'],
});

// Composed permissions
const composedKey = await storage.apiKeys.create({
  name: 'Backup + Upload Service',
  permissions: mergePresets(
    permissionPresets.backup,
    { object: ['write'] }  // Add write to backup preset
  ),
  bucketIds: ['backup-bucket'],
});
```

---

## Real-World Use Cases

### 1. Web Application Storage

```typescript
// Setup: Generate key in UI with resource-based permissions
// - Name: "Production App"
// - Bucket: prod-uploads
// - Permissions: { object: ['list', 'read', 'write'], presigned: ['generate-put'] }
// - Expiry: Never

// Usage in app:
const storage = new StorageClient({
  apiKey: process.env.STORAGE_API_KEY,
});

await storage.upload('prod-uploads', 'file.pdf', buffer);
```

### 2. CI/CD Pipeline

```yaml
# GitHub Actions
- name: Deploy Assets
  env:
    STORAGE_API_KEY: ${{ secrets.STORAGE_DEPLOY_KEY }}
  run: npx storage-cli sync ./dist s3://static-assets/
```

```typescript
// Key created with:
const { apiKey } = await storage.apiKeys.create({
  name: 'GitHub Actions Deploy',
  permissions: {
    object: ['list', 'read', 'write', 'delete'],
  },
  bucketIds: ['static-assets'],
  allowedPrefixes: ['dist/*'],
  metadata: {
    pipeline: 'github-actions',
    repository: 'myorg/myrepo',
  },
  tags: ['ci-cd', 'deploy'],
});
```

### 3. Multi-tenant SaaS

```typescript
// Per-customer API key with scoped bucket
const { apiKey } = await storage.apiKeys.create({
  name: `Customer ${customerId}`,
  permissions: {
    bucket: ['list', 'read'],
    object: ['list', 'read', 'write'],
    presigned: ['generate-get', 'generate-put'],
  },
  bucketIds: [`customer-${customerId}`],
  metadata: {
    customerId,
    customerName: customer.name,
    plan: customer.plan,
  },
  tags: ['customer', customer.plan],
});
```

### 4. Temporary Contractor Access

```typescript
const { apiKey } = await storage.apiKeys.create({
  name: 'Contractor John - Q1 2026',
  permissions: permissionPresets.readWrite,  // Uses preset
  bucketIds: ['project-alpha'],
  expiresInDays: 90,  // Auto-expires
  metadata: {
    contractor: 'john@external.com',
    project: 'alpha',
    approvedBy: 'alice@company.com',
  },
  tags: ['contractor', 'temporary'],
});
```

### 5. Read-Only CDN

```typescript
const { apiKey } = await storage.apiKeys.create({
  name: 'CDN Edge Servers',
  permissions: permissionPresets.cdn,  // { object: ['read'], presigned: ['generate-get'] }
  bucketIds: ['public-assets'],
  metadata: {
    provider: 'cloudflare',
    region: 'global',
  },
  tags: ['cdn', 'readonly'],
});
// Safe to embed in edge workers (read-only, scoped bucket)
```

### 6. Upload-Only Intake Service

```typescript
const { apiKey } = await storage.apiKeys.create({
  name: 'User Upload Service',
  permissions: permissionPresets.uploadOnly,
  bucketIds: ['user-uploads'],
  allowedPrefixes: ['incoming/*'],
  metadata: {
    service: 'upload-intake',
    maxFileSize: '100MB',
  },
  tags: ['upload', 'service'],
});
// Cannot read or delete - only write to incoming/*
```

---

## User Sessions (Secondary - Web UI Only)

For humans using the web interface to collaborate.

### Bucket Ownership

```sql
CREATE TABLE bucket (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL REFERENCES user(id),      -- Always set, user who created it
  organization_id TEXT REFERENCES organization(id), -- Optional grouping context
  
  -- Public Access Control
  block_public_access BOOLEAN DEFAULT TRUE,        -- Safety override (default ON)
  public_access_reason TEXT,                       -- Required if block disabled
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast owner lookups
CREATE INDEX idx_bucket_owner ON bucket(owner_id);
CREATE INDEX idx_bucket_org ON bucket(organization_id);
```

- Every bucket has exactly one user owner
- Organization ID is optional (for grouping only)
- **Organization membership does NOT grant bucket access**
- **Block public access is ON by default** - must explicitly disable with reason

### User Permission Grants

```sql
CREATE TABLE bucket_permission (
  id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL REFERENCES bucket(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'writer', 'reader')),
  
  -- Audit trail
  granted_by TEXT NOT NULL REFERENCES user(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,                            -- NULL = never expires
  
  UNIQUE(bucket_id, user_id)  -- One permission per user per bucket
);

-- Index for fast permission lookups
CREATE INDEX idx_permission_bucket ON bucket_permission(bucket_id);
CREATE INDEX idx_permission_user ON bucket_permission(user_id);
```

> **Note**: Bucket owners don't need a permission record - ownership implies full access.

### Permission Check Flow (User Session)

```typescript
async function checkUserAccess(
  userId: string,
  bucketId: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  const bucket = await getBucketById(bucketId);
  
  // 1. Bucket owner has full access (implicit)
  if (bucket.ownerId === userId) {
    return true;
  }
  
  // 2. Check explicit permission grant
  const permission = await getBucketPermission(bucketId, userId);
  if (!permission) return false;
  
  // 3. Check permission hasn't expired
  if (permission.expiresAt && permission.expiresAt < new Date()) {
    return false;
  }
  
  // 4. Check role allows action
  const actionRoles: Record<string, string[]> = {
    read: ['reader', 'writer', 'admin'],
    write: ['writer', 'admin'],
    delete: ['admin'],
  };
  
  return actionRoles[action].includes(permission.role);
}
```

---

## Storage Resources & Roles (PermissionBuilder)

### Resources and Actions

The storage system defines 4 resources, each with specific actions:

| Resource | Actions | Description |
|----------|---------|-------------|
| **bucket** | `list`, `create`, `read`, `update`, `delete`, `manage-acl` | Bucket-level operations |
| **object** | `list`, `read`, `write`, `delete`, `copy`, `metadata` | Object-level operations |
| **presigned** | `generate-get`, `generate-put`, `generate-post` | Presigned URL generation |
| **multipart** | `initiate`, `upload-part`, `complete`, `abort`, `list-parts` | Multipart upload operations |

### Role → Resource:Action Mapping

| Role | bucket | object | presigned | multipart |
|------|--------|--------|-----------|-----------|
| **owner** | ✅ all | ✅ all | ✅ all | ✅ all |
| **admin** | ✅ all | ✅ all | ✅ all | ✅ all |
| **writer** | `list`, `read` | `list`, `read`, `write`, `metadata` | ✅ all | ✅ all |
| **reader** | `list`, `read` | `list`, `read` | `generate-get` | `list-parts` |

### S3-Compatible Action Mapping

| Permission | S3 Operations |
|------------|---------------|
| `bucket:list` | ListAllMyBuckets |
| `bucket:create` | CreateBucket |
| `bucket:read` | GetBucketLocation, HeadBucket |
| `bucket:update` | PutBucketVersioning, PutBucketPolicy |
| `bucket:delete` | DeleteBucket |
| `bucket:manage-acl` | PutBucketAcl, GetBucketAcl |
| `object:list` | ListObjects, ListObjectsV2 |
| `object:read` | GetObject, HeadObject |
| `object:write` | PutObject |
| `object:delete` | DeleteObject, DeleteObjects |
| `object:copy` | CopyObject |
| `object:metadata` | GetObjectTagging, PutObjectTagging |
| `presigned:generate-get` | Generate presigned GET URLs |
| `presigned:generate-put` | Generate presigned PUT URLs |
| `presigned:generate-post` | Generate presigned POST URLs |
| `multipart:initiate` | CreateMultipartUpload |
| `multipart:upload-part` | UploadPart |
| `multipart:complete` | CompleteMultipartUpload |
| `multipart:abort` | AbortMultipartUpload |
| `multipart:list-parts` | ListParts |

### Who Can Grant Permissions?

| Granter Role | Can Grant | Cannot Grant |
|--------------|-----------|---------------|
| **owner** | admin, writer, reader | - |
| **admin** | writer, reader | admin (no privilege escalation) |
| **writer** | - | Cannot grant permissions |
| **reader** | - | Cannot grant permissions |

---

## Unified Authentication Middleware

```typescript
export const requireStorageAuth = () => {
  return async ({ request, next }) => {
    // 1. Check API key first (primary method)
    const apiKey = request.headers.get('X-Storage-API-Key');
    
    if (apiKey) {
      const validated = await validateApiKey(apiKey);
      if (!validated) throw new UnauthorizedException('Invalid API key');
      
      return next({ auth: { type: 'api_key', userId: validated.userId, apiKey: validated } });
    }
    
    // 2. Fall back to user session (web UI)
    const session = await getSession(request);
    
    if (session) {
      return next({ auth: { type: 'user_session', userId: session.user.id, session } });
    }
    
    throw new UnauthorizedException('Provide X-Storage-API-Key header or sign in');
  };
};
```

---

## API Endpoints

### API Key Management

```
POST   /storage/api-keys           - Create new API key
GET    /storage/api-keys           - List my API keys
DELETE /storage/api-keys/{id}      - Revoke API key
POST   /storage/api-keys/{id}/regenerate - Rotate key
```

### User Permission Management (Web UI)

```
POST   /storage/buckets/{name}/permissions       - Grant user access
DELETE /storage/buckets/{name}/permissions/{id}  - Revoke access
GET    /storage/buckets/{name}/collaborators     - List users with access
```

---

## Key Design Decisions

| Aspect | Decision |
|--------|----------|
| **Primary access** | API keys (for apps) |
| **Secondary access** | User sessions (for web UI) |
| **Permission model** | **PermissionBuilder** - resource:action based |
| **Key permission model** | **Delegated** - key permissions ≤ creator's permissions |
| **Runtime validation** | Check creator's permissions at request time |
| **Bucket ownership** | Single user (`owner_id`), always set |
| **Org association** | Optional metadata, no automatic access |
| **Permission storage** | JSONB with resource:actions mapping |
| **Resources** | bucket, object, presigned, multipart |
| **Bucket scoping** | Specific bucket IDs or all owner's buckets |
| **Prefix scoping** | Glob patterns for object keys |
| **Metadata** | JSONB for custom tracking data |
| **Tags** | Array for quick filtering |

---

## Security Best Practices

1. **Never store plain API keys** - Only store SHA-256 hash
2. **Show key once** - User saves it, cannot retrieve again
3. **Prefer scoped keys** - Don't use "all buckets" unless needed
4. **Set expiration** - Especially for temporary access
5. **Revoke unused keys** - Regular audit and cleanup
6. **Rate limit keys** - Prevent abuse
7. **Log key usage** - Track for security monitoring

---

---

## Complete Multi-User Flow Example

### The Scenario

**Users:**
- **Alice** - Project lead, creates buckets
- **Bob** - Developer on the team
- **Charlie** - External contractor (temporary)
- **Diana** - Read-only auditor

**Buckets:**
- `project-assets` - Main project files
- `client-deliverables` - Files shared with clients

---

### Step 1: Alice Creates Buckets

Alice signs in via web UI and creates two buckets:

```
Database State After Creation:
┌─────────────────────────────────────────────────────┐
│ bucket                                              │
├──────────────────────┬──────────┬───────────────────┤
│ id                   │ name              │ owner_id │
├──────────────────────┼───────────────────┼──────────┤
│ bucket_001           │ project-assets    │ alice    │
│ bucket_002           │ client-deliverables│ alice   │
└──────────────────────┴───────────────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ bucket_permission                                   │
├──────────────────────────────────────────────────────┤
│ (empty - only Alice has access as owner)            │
└─────────────────────────────────────────────────────┘
```

**Alice's Access:**
- `project-assets`: ALL (owner)
- `client-deliverables`: ALL (owner)

---

### Step 2: Alice Grants Permissions to Team

Alice shares buckets with her team via web UI:

```typescript
// Alice grants Bob "writer" on project-assets
POST /storage/buckets/project-assets/permissions
{ "userId": "bob", "role": "writer" }

// Alice grants Bob "reader" on client-deliverables
POST /storage/buckets/client-deliverables/permissions
{ "userId": "bob", "role": "reader" }

// Alice grants Diana "reader" on both buckets
POST /storage/buckets/project-assets/permissions
{ "userId": "diana", "role": "reader" }

POST /storage/buckets/client-deliverables/permissions
{ "userId": "diana", "role": "reader" }
```

```
Database State:
┌────────────────────────────────────────────────────────────────────┐
│ bucket_permission                                                  │
├────────────┬─────────────────────┬──────────┬────────┬─────────────┤
│ id         │ bucket_id           │ user_id  │ role   │ granted_by  │
├────────────┼─────────────────────┼──────────┼────────┼─────────────┤
│ perm_001   │ bucket_001          │ bob      │ writer │ alice       │
│ perm_002   │ bucket_002          │ bob      │ reader │ alice       │
│ perm_003   │ bucket_001          │ diana    │ reader │ alice       │
│ perm_004   │ bucket_002          │ diana    │ reader │ alice       │
└────────────┴─────────────────────┴──────────┴────────┴─────────────┘
```

**Current Access Matrix:**

| User | project-assets | client-deliverables |
|------|----------------|---------------------|
| Alice | owner (all) | owner (all) |
| Bob | writer (bucket:list,read + object:list,read,write) | reader (bucket:list,read + object:list,read) |
| Diana | reader (bucket:list,read + object:list,read) | reader (bucket:list,read + object:list,read) |

---

### Step 3: Bob Creates API Keys for His App

Bob wants to use storage from his application. He creates API keys via web UI:

```typescript
// Bob creates a key for his build pipeline (using resource-based permissions)
POST /storage/api-keys
{
  "name": "CI/CD Pipeline",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read", "write"],
    "presigned": ["generate-put"]
  },
  "bucketIds": ["bucket_001"],  // project-assets only
  "metadata": {
    "pipeline": "github-actions",
    "repository": "myorg/myrepo"
  },
  "tags": ["ci-cd", "build"]
}

// VALIDATION: Does Bob have these permissions on bucket_001?
// ✅ Yes - Bob is "writer" which includes bucket:list,read + object:list,read,write

// Response (shown ONCE, Bob must save it):
{
  "keyId": "key_001",
  "apiKey": "sak_prod_abc123def456...",  // Only shown once!
  "name": "CI/CD Pipeline",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read", "write"],
    "presigned": ["generate-put"]
  }
}
```

```typescript
// Bob tries to create a key with delete permission
POST /storage/api-keys
{
  "name": "Admin Key",
  "permissions": {
    "object": ["list", "read", "write", "delete"]  // ❌ Requesting delete
  },
  "bucketIds": ["bucket_001"]
}

// VALIDATION: Does Bob have object:delete on bucket_001?
// ❌ No - Bob is only "writer", not "admin" or "owner"
// Writer role doesn't include object:delete

// Response:
{
  "error": "Forbidden",
  "message": "Cannot create API key with 'object:delete' on bucket 'project-assets' - you don't have that permission"
}
```

```typescript
// Bob tries to create a key for a bucket he can't write to
POST /storage/api-keys
{
  "name": "Deliverables Upload",
  "permissions": {
    "object": ["list", "read", "write"]  // ❌ Requesting write
  },
  "bucketIds": ["bucket_002"]  // client-deliverables
}

// VALIDATION: Does Bob have object:write on bucket_002?
// ❌ No - Bob is only "reader" on client-deliverables

// Response:
{
  "error": "Forbidden",
  "message": "Cannot create API key with 'object:write' on bucket 'client-deliverables' - you don't have that permission"
}
```

```typescript
// Bob creates a read-only key for client-deliverables (this works)
POST /storage/api-keys
{
  "name": "Deliverables Reader",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read"],
    "presigned": ["generate-get"]
  },
  "bucketIds": ["bucket_002"],
  "metadata": {
    "purpose": "client-report-viewer"
  },
  "tags": ["readonly", "client"]
}

// ✅ Bob has reader access, which includes all these permissions

// Response:
{
  "keyId": "key_002",
  "apiKey": "sak_prod_xyz789...",
  "name": "Deliverables Reader"
}
```

```
Database State:
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ storage_api_key                                                                                  │
├──────────┬─────────────────────┬─────────┬──────────────────┬───────────────────────────────────┤
│ id       │ name                │ user_id │ bucket_ids       │ permissions (JSONB)               │
├──────────┼─────────────────────┼─────────┼──────────────────┼───────────────────────────────────┤
│ key_001  │ CI/CD Pipeline      │ bob     │ [bucket_001]     │ {bucket:[l,r],object:[l,r,w],...} │
│ key_002  │ Deliverables Reader │ bob     │ [bucket_002]     │ {bucket:[l,r],object:[l,r],...}   │
└──────────┴─────────────────────┴─────────┴──────────────────┴───────────────────────────────────┘
```

---

### Step 4: Alice Gives Charlie Temporary Access

Charlie is an external contractor who needs to upload files for 90 days:

```typescript
// Alice grants Charlie writer access with expiration
POST /storage/buckets/project-assets/permissions
{
  "userId": "charlie",
  "role": "writer",
  "expiresAt": "2026-04-22T00:00:00Z"  // 90 days from now
}
```

Charlie creates an API key for his tools:

```typescript
// Charlie creates a key with resource-based permissions (also with expiration)
POST /storage/api-keys
{
  "name": "Upload Tool",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read", "write"],
    "multipart": ["initiate", "upload-part", "complete", "abort"]
  },
  "bucketIds": ["bucket_001"],
  "expiresInDays": 90,
  "metadata": {
    "contractor": "charlie@external.com",
    "project": "project-assets-migration"
  },
  "tags": ["contractor", "temporary"]
}

// ✅ Valid - Charlie has writer access until April 22
```

```
Database State:
┌────────────────────────────────────────────────────────────────────────────────────┐
│ bucket_permission                                                                  │
├────────────┬─────────────────────┬──────────┬────────┬─────────────┬───────────────┤
│ id         │ bucket_id           │ user_id  │ role   │ granted_by  │ expires_at    │
├────────────┼─────────────────────┼──────────┼────────┼─────────────┼───────────────┤
│ perm_001   │ bucket_001          │ bob      │ writer │ alice       │ NULL          │
│ perm_002   │ bucket_002          │ bob      │ reader │ alice       │ NULL          │
│ perm_003   │ bucket_001          │ diana    │ reader │ alice       │ NULL          │
│ perm_004   │ bucket_002          │ diana    │ reader │ alice       │ NULL          │
│ perm_005   │ bucket_001          │ charlie  │ writer │ alice       │ 2026-04-22    │
└────────────┴─────────────────────┴──────────┴────────┴─────────────┴───────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ storage_api_key                                                                                            │
├──────────┬─────────────────────┬─────────┬──────────────────┬───────────────────────────────────┬──────────┤
│ id       │ name                │ user_id │ bucket_ids       │ permissions (JSONB)               │ expires  │
├──────────┼─────────────────────┼─────────┼──────────────────┼───────────────────────────────────┼──────────┤
│ key_001  │ CI/CD Pipeline      │ bob     │ [bucket_001]     │ {bucket:[l,r],object:[l,r,w],...} │ NULL     │
│ key_002  │ Deliverables Reader │ bob     │ [bucket_002]     │ {bucket:[l,r],object:[l,r],...}   │ NULL     │
│ key_003  │ Upload Tool         │ charlie │ [bucket_001]     │ {bucket:[l,r],object:[l,r,w],...} │ 04-22    │
└──────────┴─────────────────────┴─────────┴──────────────────┴───────────────────────────────────┴──────────┘
```

---

### Step 5: Runtime Access Checks

Now let's see how requests are processed with resource-based permissions:

#### Request A: Bob's CI/CD uploads a file

```
Request:
PUT /storage/project-assets/build-output.zip
Headers: X-Storage-API-Key: sak_prod_abc123def456...
Body: [file data]
```

```typescript
// 1. Validate API key
const apiKey = await validateApiKey("sak_prod_abc123def456...");
// ✅ Key exists, not expired, not revoked
// apiKey = { 
//   userId: "bob", 
//   bucketIds: ["bucket_001"], 
//   permissions: { bucket: ["list", "read"], object: ["list", "read", "write"], ... }
// }

// 2. Check key has required resource:action
const keyAllows = apiKey.permissions.object?.includes("write")
  && apiKey.bucketIds.includes("bucket_001");
// ✅ Key has object:write for bucket_001

// 3. Check key creator (Bob) still has this permission
const bobHasAccess = await checkUserResourceAccess("bob", "bucket_001", "object", "write");
// Bob's role: writer on bucket_001
// Writer role includes object:write ✅

// 4. ALLOW - Upload proceeds
```

#### Request B: Bob's key tries to delete a file

```
Request:
DELETE /storage/project-assets/old-file.txt
Headers: X-Storage-API-Key: sak_prod_abc123def456...
```

```typescript
// 1. Validate API key
const apiKey = await validateApiKey("sak_prod_abc123def456...");
// ✅ Valid

// 2. Check key has required resource:action
const keyAllows = apiKey.permissions.object?.includes("delete");
// ❌ Key only has ["list", "read", "write"], not "delete"

// 3. DENY - 403 Forbidden
// "API key does not have 'object:delete' permission"
```

#### Request C: Charlie uploads after his access expires (April 23)

```
Request:
PUT /storage/project-assets/final-report.pdf
Headers: X-Storage-API-Key: sak_prod_charlie_key...
Date: April 23, 2026
```

```typescript
// 1. Validate API key
const apiKey = await validateApiKey("ak_prod_charlie_key...");
// ❌ Key expired on April 22
// OR if key wasn't expired but permission was:

// 2. (If key valid) Check creator still has permission
const charlieHasAccess = await checkUserAccess("charlie", "bucket_001", "write");
// Charlie's permission expired on April 22
// ❌ No valid permission found

// 3. DENY - 403 Forbidden
// "Access denied - your permission has expired"
```

#### Request D: Diana tries to use web UI to upload

```
Request (from browser with session cookie):
PUT /storage/project-assets/audit-notes.txt
Cookie: session=diana_session_token
```

```typescript
// 1. No API key, fall back to session
const session = await getSession(request);
// session = { user: { id: "diana", ... } }

// 2. Check Diana's permission
const dianaHasAccess = await checkUserAccess("diana", "bucket_001", "write");
// Diana's permission: reader on bucket_001
// ❌ Reader role does NOT include write action

// 3. DENY - 403 Forbidden
// "You have read-only access to this bucket"
```

---

### Step 6: Alice Revokes Bob's Access

Project ends, Alice removes Bob from project-assets:

```typescript
// Alice revokes Bob's permission
DELETE /storage/buckets/project-assets/permissions/perm_001
```

**What happens to Bob's API keys?**

```typescript
// Bob's CI/CD tries to upload
PUT /storage/project-assets/new-file.zip
Headers: X-Storage-API-Key: ak_prod_abc123def456...

// 1. Validate API key
const apiKey = await validateApiKey("ak_prod_abc123def456...");
// ✅ Key itself is still valid (not revoked)

// 2. Check key allows action
// ✅ Key has write permission for bucket_001

// 3. Check creator (Bob) still has permission
const bobHasAccess = await checkUserAccess("bob", "bucket_001", "write");
// ❌ Bob's permission was revoked!

// 4. DENY - 403 Forbidden
// "Access denied - underlying permission has been revoked"
```

> **Key Point**: We don't need to find and revoke all of Bob's API keys.
> The runtime check ensures keys automatically lose access when the creator's permission is revoked.

---

### Final Access Matrix

| User | project-assets | client-deliverables | API Keys |
|------|----------------|---------------------|----------|
| Alice | owner (all) | owner (all) | Can create any |
| Bob | ~~writer~~ REVOKED | reader | Keys now fail for project-assets |
| Charlie | ~~writer~~ EXPIRED | - | Keys now fail |
| Diana | reader | reader | Can only create read keys |

---

### Visual Flow Summary (Simplified - Without Policy Layer)

This diagram shows the basic auth flow. See "Complete Authorization Flow" section for the full 4-layer diagram including Block Public Access and Bucket Policies.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            REQUEST ARRIVES                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Has X-Storage-API-Key?      │
                    └───────────────────────────────┘
                         │                    │
                        YES                   NO
                         │                    │
                         ▼                    ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ Validate API Key │  │ Get User Session │
              │ - Exists?        │  │ - Logged in?     │
              │ - Not expired?   │  │                  │
              │ - Not revoked?   │  │                  │
              └──────────────────┘  └──────────────────┘
                         │                    │
                         ▼                    ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ Key allows       │  │                  │
              │ action+bucket+   │  │                  │
              │ prefix?          │  │                  │
              └──────────────────┘  │                  │
                         │          │                  │
                         ▼          │                  │
              ┌──────────────────┐  │                  │
              │ Creator (user)   │◄─┘                  │
              │ STILL has this   │                     │
              │ permission?      │◄────────────────────┘
              └──────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
             YES                    NO
              │                     │
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │  ALLOW   │          │   DENY   │
        │  Request │          │   403    │
        └──────────┘          └──────────┘
```

---

### Key Takeaways

1. **Bucket owners** have implicit full access (no permission record needed)
2. **Permission grants** are explicit records in `bucket_permission` table
3. **API keys** are delegated credentials - never exceed creator's permissions
4. **Runtime validation** always checks the underlying user permission
5. **Revocation cascades** - revoking a user's permission invalidates their API keys
6. **Expiration** works at both permission and API key level

---

## Complete Authorization Flow (All Layers)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            REQUEST ARRIVES                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  LAYER 0: Block Public Access │
                    │  Is request authenticated?    │
                    └───────────────────────────────┘
                              │           │
                           YES           NO
                              │           │
                              │           ▼
                              │    ┌──────────────────┐
                              │    │ Is bucket public │
                              │    │ access enabled?  │
                              │    └──────────────────┘
                              │           │        │
                              │          YES      NO
                              │           │        │
                              │           │        ▼
                              │           │   ┌──────────┐
                              │           │   │  DENY    │
                              │           │   │  403     │
                              │           │   └──────────┘
                              │           │
                              ▼           ▼
                    ┌───────────────────────────────┐
                    │  LAYER 1: Authentication      │
                    │  API Key or User Session?     │
                    └───────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────────────────┐
                    │  LAYER 2: Bucket Policy       │
                    │  Check JSON policy conditions │
                    │  (IP, time, referer, etc.)    │
                    └───────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                Explicit DENY      No Deny
                    │                   │
                    ▼                   ▼
              ┌──────────┐    ┌───────────────────────────────┐
              │  DENY    │    │  LAYER 3: User/Key Permissions│
              │  403     │    │  Role-based access check      │
              └──────────┘    └───────────────────────────────┘
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                           ALLOW               DENY
                              │                   │
                              ▼                   ▼
                        ┌──────────┐        ┌──────────┐
                        │  ALLOW   │        │  DENY    │
                        │  Request │        │  403     │
                        └──────────┘        └──────────┘
```

---

## Implementation Priority (Updated)

### Phase 1 (Must Have - Security Foundation)
- [ ] Block Public Access (account + bucket level)
- [ ] API key generation and storage
- [ ] API key validation middleware
- [ ] Scoped permissions (bucket + actions)
- [ ] Key management UI (create, list, revoke)
- [ ] Basic audit logging (access denied, key changes)

### Phase 2 (Important - Collaboration)
- [ ] User-to-user permission grants
- [ ] Web UI collaboration features
- [ ] Permission expiration
- [ ] Object key prefix scoping for API keys

### Phase 3 (Advanced - Enterprise)
- [ ] Bucket policies (JSON) with conditions
- [ ] IP restrictions
- [ ] Time-based access
- [ ] Presigned URLs with conditions
- [ ] Full audit logging with export

### Phase 4 (Nice to Have)
- [ ] Usage analytics per key
- [ ] Rate limiting per key
- [ ] Key rotation automation
- [ ] Referer restrictions (hotlink protection)

---

## Feature Comparison: Us vs AWS S3

| Feature | AWS S3 | Our Design | Priority |
|---------|--------|------------|----------|
| Block Public Access | ✅ Account + Bucket | ✅ Same | **Phase 1** |
| IAM Users/Roles | ✅ Complex | ✅ Simplified (Better Auth) | **Phase 1** |
| Access Keys | ✅ Inherit all perms | ✅ **Better** - resource:action scoped | **Phase 1** |
| Permission Model | Actions list | ✅ **Better** - PermissionBuilder | **Phase 1** |
| Key Metadata | ❌ Limited | ✅ Full JSONB + tags | **Phase 1** |
| Bucket Policies | ✅ JSON policies | ✅ Same structure | Phase 3 |
| ACLs | ⚠️ Deprecated | ❌ Skip (correct) | N/A |
| IP Restrictions | ✅ In policies | ✅ In policies | Phase 3 |
| Presigned URLs | ✅ Basic | ✅ **Enhanced** with conditions | Phase 3 |
| Audit Logging | ✅ CloudTrail | ✅ Built-in | Phase 1 (basic) |
| Access Points | ✅ For complex sharing | ⏳ If needed | Future |

**Our Advantages Over S3**:
1. **Resource-based API key permissions** (S3 keys inherit everything, need IAM policies to restrict)
2. **PermissionBuilder pattern** - type-safe, consistent with platform
3. **Rich metadata on keys** - track environment, customer, service, etc.
4. **Tag-based filtering** - easily find and manage keys
5. **Built-in audit logging** (S3 requires CloudTrail setup)
6. **Runtime delegation check** (revoking user permission auto-revokes their keys)

---

## Quick Reference: Common Operations

### Create Read-Only Public Bucket

```typescript
// 1. Create bucket
POST /storage/buckets
{ "name": "public-assets" }

// 2. Disable block public access (with reason)
PUT /storage/buckets/public-assets/public-access
{ 
  "blockPublicAccess": false, 
  "reason": "CDN static assets" 
}

// 3. Add bucket policy for public read
PUT /storage/buckets/public-assets/policy
{
  "version": "2024-01-01",
  "statements": [{
    "effect": "Allow",
    "principals": ["*"],
    "actions": ["storage:GetObject"],
    "resources": ["*"]
  }]
}
```

### Create Restricted Upload Bucket

```typescript
// 1. Create bucket (block public access stays ON)
POST /storage/buckets
{ "name": "secure-uploads" }

// 2. Add bucket policy for IP + HTTPS restrictions
PUT /storage/buckets/secure-uploads/policy
{
  "version": "2024-01-01",
  "statements": [
    {
      "sid": "RequireHTTPS",
      "effect": "Deny",
      "principals": ["*"],
      "actions": ["storage:*"],
      "resources": ["*"],
      "conditions": [{ "type": "Bool", "key": "secureTransport", "value": "false" }]
    },
    {
      "sid": "OfficeIPsOnly",
      "effect": "Deny", 
      "principals": ["*"],
      "actions": ["storage:PutObject"],
      "resources": ["*"],
      "conditions": [{ "type": "NotIpAddress", "key": "sourceIp", "value": ["10.0.0.0/8"] }]
    }
  ]
}

// 3. Create scoped API key with resource-based permissions
POST /storage/api-keys
{
  "name": "Upload Service",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read", "write"],
    "presigned": ["generate-put"],
    "multipart": ["initiate", "upload-part", "complete", "abort"]
  },
  "bucketIds": ["secure-uploads"],
  "allowedPrefixes": ["uploads/*"],
  "metadata": {
    "service": "upload-api",
    "environment": "production"
  },
  "tags": ["upload", "production"]
}
```

### Grant Temporary Contractor Access

```typescript
// 1. Grant permission with expiration
POST /storage/buckets/project-files/permissions
{
  "userId": "contractor-123",
  "role": "writer",
  "expiresAt": "2026-04-01T00:00:00Z"
}

// 2. Contractor creates their own scoped key
POST /storage/api-keys
{
  "name": "Contractor Tool",
  "permissions": {
    "bucket": ["list", "read"],
    "object": ["list", "read", "write", "metadata"],
    "presigned": ["generate-get", "generate-put"]
  },
  "bucketIds": ["project-files"],
  "expiresInDays": 60,
  "metadata": {
    "contractor": "john@external.com",
    "project": "website-redesign"
  },
  "tags": ["contractor", "temporary"]
}
// ✅ Key auto-validated against contractor's permissions
// ✅ Key expires, AND permission expires - double protection
```

### Query API Keys

```typescript
// List all keys
GET /storage/api-keys

// Filter by tags
GET /storage/api-keys?tags=production

// Filter by metadata
GET /storage/api-keys?metadata.environment=production
GET /storage/api-keys?metadata.customerId=cust_123

// Get key details
GET /storage/api-keys/{id}

// Revoke key
DELETE /storage/api-keys/{id}
{ "reason": "Project completed" }
```
