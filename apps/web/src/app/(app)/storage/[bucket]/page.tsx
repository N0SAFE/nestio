'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useObjects } from '@/hooks/storage/useStorage'
import { ObjectTable } from '@/components/storage/ObjectTable'
import { FileUploadDialog } from '@/components/storage/FileUploadDialog'
import { Button } from '@repo/ui/components/shadcn/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@repo/ui/components/shadcn/breadcrumb'
import { Loader2, Home } from 'lucide-react'
import Link from 'next/link'
import type { JSX } from 'react'

export default function BucketPage(): JSX.Element {
  const params = useParams()
  const bucket = params.bucket as string
  const [currentPath, setCurrentPath] = useState('')

  const { data, isLoading, error, refetch } = useObjects(bucket, currentPath)

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
          <p className="text-destructive mb-2">Failed to load objects</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  const objects = data?.objects ?? []
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : []

  // Transform objects to include folder structure
  const transformedObjects = objects.map((obj) => ({
    name: obj.name.split('/').pop() || obj.name,
    key: obj.name,
    size: obj.size,
    lastModified: obj.lastModified ? new Date(obj.lastModified) : undefined,
    etag: obj.etag,
    isPrefix: obj.name.endsWith('/'),
  }))

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/storage">
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/storage/${bucket}`}>{bucket}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathParts.map((part, index) => (
                <div key={index} className="flex items-center">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === pathParts.length - 1 ? (
                      <BreadcrumbPage>{part}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button
                          onClick={() =>
                            setCurrentPath(pathParts.slice(0, index + 1).join('/'))
                          }
                        >
                          {part}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold">
            {currentPath ? pathParts[pathParts.length - 1] : bucket}
          </h1>
        </div>
        <FileUploadDialog
          bucket={bucket}
          path={currentPath}
          onUploadComplete={() => void refetch()}
        />
      </div>

      {/* Back Button */}
      {currentPath && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newPath = pathParts.slice(0, -1).join('/')
            setCurrentPath(newPath)
          }}
        >
          ← Back
        </Button>
      )}

      {/* Objects Table */}
      <ObjectTable
        bucket={bucket}
        objects={transformedObjects}
        onNavigate={(prefix) => setCurrentPath(prefix)}
      />
    </div>
  )
}
