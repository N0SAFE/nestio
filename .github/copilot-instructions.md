# Nestio - MinIO-like S3 Object Storage API

## Project Overview

Nestio is a **custom S3-compatible object storage system** built from scratch:
- **NestJS API**: Custom S3-compatible storage backend with bucket/object operations
- **Next.js Web UI**: Storage management interface for bucket browsing and file upload/download
- **TypeScript SDK**: End-to-end type-safe client (via ORPC contracts)
- **Hybrid Storage**: Metadata in PostgreSQL, object data on filesystem (S3-compatible architecture)

**Core Services (Docker)**:
- API: `http://localhost:3005`
- Web UI: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

---

## Architecture at a Glance

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Next.js Web   │───▶│   NestJS API     │───▶│ PostgreSQL (metadata)│
│   (apps/web)    │    │   (apps/api)     │    │ Filesystem (objects) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
        │                      │                           │
        └──────────────────────┼───────────────────────────┘
                               ▼
                   ┌─────────────────────────┐
                   │  @repo/api-contracts    │
                   │  (ORPC type contracts)  │
                   └─────────────────────────┘
```

**Storage Architecture (S3-Compatible Hybrid)**:
- **Bucket metadata** → PostgreSQL table (`buckets`)
- **Object metadata** → PostgreSQL table (`objects`: key, size, etag, content-type, timestamps)
- **Object data** → Filesystem (organized by bucket/key path)
- **ETags** → MD5 hashes for integrity verification
- **Multipart uploads** → Tracked in database, assembled on filesystem

**Key Directories**:
- `apps/api/src/modules/storage/` - Custom storage implementation (service, controller, types)
- `packages/contracts/api/modules/storage/` - Storage ORPC contracts
- `apps/web/src/` - Storage UI components and hooks

---

## Storage API Patterns

### ORPC Contract → Controller → Service Flow

```typescript
// 1. Contract: packages/contracts/api/modules/storage/bucket-list.ts
export const bucketListContract = oc.route({ method: 'GET', path: '/buckets' })
  .output(z.object({ buckets: z.array(BucketSchema), total: z.number() }));

// 2. Controller: apps/api/src/modules/storage/controllers/storage.controller.ts
@Implement(storageContract.bucketList)
bucketList() {
  return implement(storageContract.bucketList)
    .use(requireAuth())  // Auth middleware
    .handler(async () => {
      const buckets = await this.storageService.listBuckets();
      return { buckets, total: buckets.length };
    });
}

// 3. Service: apps/api/src/modules/storage/services/storage.service.ts
async listBuckets(): Promise<BucketInfo[]> {
  // Query PostgreSQL for bucket metadata
  const buckets = await this.db.select().from(schema.buckets);
  return buckets.map(b => ({ name: b.name, creationDate: b.createdAt }));
}
```

### Storage Contract Operations

| Contract                  | Purpose                          | Path                                    |
|---------------------------|----------------------------------|-----------------------------------------|
| `bucketList`              | List all buckets                 | `GET /storage/buckets`                  |
| `bucketCreate`            | Create new bucket                | `POST /storage/buckets`                 |
| `bucketDelete`            | Delete empty bucket              | `DELETE /storage/buckets/:name`         |
| `bucketExists`            | Check bucket existence           | `GET /storage/buckets/:name/exists`     |
| `objectList`              | List objects (with pagination)   | `GET /storage/:bucket/objects`          |
| `objectStat`              | Get object metadata              | `GET /storage/:bucket/objects/:key/stat`|
| `objectDelete`            | Delete object                    | `DELETE /storage/:bucket/objects/:key`  |
| `objectPresignedGetUrl`   | Generate download URL            | `POST .../presigned-url`                |
| `objectPresignedPutUrl`   | Generate upload URL              | `POST .../presigned-upload-url`         |

---

## Development Commands

```bash
bun run dev           # Full stack: API + Web + MinIO + PostgreSQL
bun run dev:api       # API only (includes DB + MinIO)
bun run dev:web       # Web only (requires running API)
```

**MinIO Access**:
- API: `http://localhost:9000` (S3 endpoint for direct SDK use)
- Console: `http://localhost:9001` (Web UI, login: minioadmin/minioadmin)

**Logs**:
```bash
bun run dev:api:logs
bun run dev:web:logs
```

---

## Adding Storage Features

### 1. Define Contract
```typescript
// packages/contracts/api/modules/storage/your-feature.ts
export const yourFeatureContract = oc.route({
  method: 'POST',
  path: '/{bucket}/your-feature',
})
.input(z.object({ bucket: z.string(), ... }))
.output(z.object({ ... }));

// Export in packages/contracts/api/modules/storage/index.ts
```

### 2. Implement in Controller
```typescript
// apps/api/src/modules/storage/controllers/storage.controller.ts
@Implement(storageContract.yourFeature)
yourFeature() {
  return implement(storageContract.yourFeature)
    .use(requireAuth())
    .handler(async ({ input }) => {
      return await this.storageService.yourMethod(input);
    });
}
```

### 3. Add Service Method
```typescript
// apps/api/src/modules/storage/services/storage.service.ts
async yourMethod(params: YourParams): Promise<YourResult> {
  // 1. Handle metadata in PostgreSQL (buckets/objects tables)
  // 2. Handle file data on filesystem (organized by bucket/key)
  // 3. Calculate ETags (MD5 hashes) for integrity
  // 4. Support multipart uploads if needed
}
```

### 4. Update Database Schema (if needed)
```bash
# Add new columns to storage tables
bun run api -- db:generate
bun run api -- db:push
```

### 5. Regenerate Web Types
```bash
bun run web -- generate
```

---

## Storage Implementation Details

### Database Schema

**Buckets Table** (`buckets`):
- `id` - UUID primary key
- `name` - Unique bucket name (S3 naming rules)
- `createdAt` - Bucket creation timestamp
- `ownerId` - User who created the bucket

**Objects Table** (`objects`):
- `id` - UUID primary key
- `bucketId` - Foreign key to buckets
- `key` - Object key/path within bucket
- `size` - File size in bytes
- `etag` - MD5 hash for integrity
- `contentType` - MIME type
- `metadata` - JSON field for custom metadata
- `createdAt` - Upload timestamp
- `updatedAt` - Last modification timestamp

### Filesystem Organization

```
storage/
├── buckets/
│   ├── bucket-name-1/
│   │   ├── object-key-1
│   │   └── folder/
│   │       └── object-key-2
│   └── bucket-name-2/
│       └── object-key-3
```

### ETag Calculation

```typescript
import { createHash } from 'crypto';

function calculateETag(fileBuffer: Buffer): string {
  return createHash('md5').update(fileBuffer).digest('hex');
}
```

### Multipart Upload Support

1. **Initiate**: Create upload record in database with `uploadId`
2. **Upload Parts**: Store parts temporarily, track in `multipart_parts` table
3. **Complete**: Assemble parts into final object, calculate final ETag
4. **Abort**: Clean up temporary parts

---

## Storage Configuration

Environment variables (`.env` or Docker):
```env
STORAGE_ROOT_PATH=/app/storage           # Root path for object storage
STORAGE_BUCKET_PATH=/app/storage/buckets # Bucket data directory
STORAGE_MAX_FILE_SIZE=5368709120         # 5GB max file size (S3 limit)
STORAGE_MULTIPART_THRESHOLD=104857600    # 100MB (when to suggest multipart)
```

**Important**: Ensure the storage directory is:
- Mounted as a Docker volume for persistence
- Has proper read/write permissions for the API process
- Backed up regularly (production environments)

---

## Presigned URL Pattern

For secure file upload/download without direct authentication:

```typescript
// Generate presigned upload URL (valid for limited time)
const { url } = await api.storage.objectPresignedPutUrl.call({
  bucket: 'my-bucket',
  objectName: 'file.txt',
  expirySeconds: 3600  // 1 hour
});

// Client uploads directly to the presigned URL
await fetch(url, {
  method: 'PUT',
  body: fileData,
  headers: { 'Content-Type': 'application/octet-stream' }
});

// Generate presigned download URL
const { url } = await api.storage.objectPresignedGetUrl.call({
  bucket: 'my-bucket',
  objectName: 'file.txt',
  expirySeconds: 3600
});

// Client downloads from presigned URL
const response = await fetch(url);
const blob = await response.blob();
```

**Presigned URL Implementation**:
- Generate signed token with expiry timestamp
- Include bucket, key, and operation (GET/PUT) in signature
- Verify signature and expiry on request
- Provide direct file access without re-authentication

---

## ORPC Hooks Pattern (Frontend)

**Never use ORPC directly in components** - create custom hooks:

```typescript
// apps/web/src/hooks/useStorage.ts
export function useBuckets() {
  return useQuery(orpc.storage.bucketList.queryOptions({ input: {} }));
}

export function useCreateBucket() {
  const queryClient = useQueryClient();
  return useMutation(orpc.storage.bucketCreate.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', 'bucketList'] });
    },
  }));
}
```

See `docs/ORPC-HOOKS-SYSTEM-ARCHITECTURE.md` for the complete hook generation system.

---

## Key Files Reference

| Purpose                    | Path                                                          |
|----------------------------|---------------------------------------------------------------|
| Storage service (custom)   | `apps/api/src/modules/storage/services/storage.service.ts`    |
| Storage controller         | `apps/api/src/modules/storage/controllers/storage.controller.ts` |
| Storage types              | `apps/api/src/modules/storage/types/storage.types.ts`         |
| Storage contracts          | `packages/contracts/api/modules/storage/`                     |
| Database schema            | `apps/api/src/db/drizzle/schema/storage.schema.ts`            |
| Docker storage volume      | `docker/compose/api/docker-compose.api.dev.yml`               |
| Auth middleware            | `apps/api/src/core/modules/auth/orpc/middlewares.ts`          |

---

## Testing Storage API

```bash
# List buckets
curl -H "Authorization: Bearer <token>" http://localhost:3005/storage/buckets

# Create bucket
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"test-bucket"}' \
  http://localhost:3005/storage/buckets

# Get presigned upload URL
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"bucket":"test-bucket","objectName":"file.txt"}' \
  http://localhost:3005/storage/test-bucket/objects/file.txt/presigned-upload-url
```

---

## Common Gotchas

1. **Storage directory permissions**: Ensure the API process has read/write access to the storage path
2. **Auth required**: All storage endpoints use `requireAuth()` middleware
3. **Presigned URLs expire**: Default 1 hour, configure via `expirySeconds`
4. **Empty bucket for deletion**: Must delete all objects first
5. **Docker volume mounting**: Storage directory must be mounted as a volume for persistence
6. **ETag calculation**: ETags must be MD5 hashes for S3 compatibility

---

## Documentation Structure

- **Architecture**: `.docs/reference/ARCHITECTURE.md`
- **ORPC Hooks**: `docs/ORPC-HOOKS-SYSTEM-ARCHITECTURE.md`
- **Declarative Routing**: `apps/web/src/routes/README.md`
- **Local AGENTS.md**: Read `AGENTS.md` in each app/package directory for specific rules
