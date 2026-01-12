import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const storageConfigSchema = z.object({
  endpoint: z.string().default('http://minio-dev:9000'),
  port: z.coerce.number().default(9000),
  useSSL: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  accessKey: z.string().default('minioadmin'),
  secretKey: z.string().default('minioadmin'),
  region: z.string().default('us-east-1'),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

export default registerAs('storage', () => {
  const config = storageConfigSchema.parse({
    endpoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT,
    useSSL: process.env.MINIO_USE_SSL,
    accessKey:
      process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER,
    secretKey:
      process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD,
    region: process.env.STORAGE_REGION,
  });

  return config;
});
