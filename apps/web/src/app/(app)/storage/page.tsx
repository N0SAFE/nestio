'use client'

import { useBuckets, useDeleteBucket } from '@/hooks/storage/useStorage'
import { BucketCard } from '@/components/storage/BucketCard'
import { CreateBucketDialog } from '@/components/storage/CreateBucketDialog'
import { Loader2, Database } from 'lucide-react'
import type { JSX } from 'react'

export default function StoragePage(): JSX.Element {
  const { data, isLoading, error } = useBuckets()
  const deleteBucket = useDeleteBucket()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load buckets</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  const buckets = data?.buckets ?? []

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Storage Buckets</h1>
          <p className="text-muted-foreground mt-2">
            Manage your S3-compatible object storage buckets
          </p>
        </div>
        <CreateBucketDialog />
      </div>

      {/* Buckets Grid */}
      {buckets.length === 0 ? (
        <div className="border-muted flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <Database className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h2 className="mb-2 text-xl font-semibold">No buckets yet</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Create your first bucket to start storing files
            </p>
            <CreateBucketDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {buckets.map((bucket) => (
            <BucketCard
              key={bucket.name}
              name={bucket.name}
                creationDate={new Date(bucket.creationDate)}
              onDelete={() => deleteBucket.mutate(bucket.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
