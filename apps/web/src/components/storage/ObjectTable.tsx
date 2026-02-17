'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/shadcn/table'
import { Button } from '@repo/ui/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu'
import { File, Folder, MoreVertical, Download, Trash2 } from 'lucide-react'
import { useDeleteObject, usePresignedGetUrl } from '@/domains/storage/hooks'
import type { JSX } from 'react'

interface StorageObject {
  name: string
  key: string
  size?: number
  lastModified?: Date
  etag?: string
  isPrefix?: boolean
}

interface ObjectTableProps {
  bucket: string
  objects: StorageObject[]
  onNavigate?: (prefix: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const sizeUnit = sizes[i] ?? 'Bytes'
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2)).toString()} ${sizeUnit}`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function ObjectTable({ bucket, objects, onNavigate }: ObjectTableProps): JSX.Element {
  const deleteObject = useDeleteObject()
  const getPresignedUrl = usePresignedGetUrl()

  const handleDownload = async (objectKey: string, objectName: string) => {
    try {
      const result = await getPresignedUrl.mutateAsync({
        params: {
          id: objectKey,
          bucket,
          objectName: objectKey,
        },
        query: {
          expirySeconds: 3600,
        },
      })

      // Open download link
      const link = document.createElement('a')
      link.href = result.url
      link.download = objectName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const handleDelete = async (objectKey: string) => {
    if (!confirm(`Are you sure you want to delete "${objectKey}"?`)) return
    
    await deleteObject.mutateAsync({
      params: {
        id: objectKey,
        bucket,
        objectName: objectKey,
      },
    })
  }

  if (objects.length === 0) {
    return (
      <div className="border-muted flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
          <File className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-sm">No files in this folder</p>
          <p className="text-muted-foreground text-xs">Upload files to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-muted rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-32">Size</TableHead>
            <TableHead className="w-48">Last Modified</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((object) => (
            <TableRow key={object.key} className="group">
              <TableCell>
                <div className="flex items-center space-x-3">
                  {object.isPrefix ? (
                    <>
                      <Folder className="text-primary h-5 w-5" />
                      <button
                        className="text-primary hover:underline"
                        onClick={() => onNavigate?.(object.key)}
                      >
                        {object.name}
                      </button>
                    </>
                  ) : (
                    <>
                      <File className="text-muted-foreground h-5 w-5" />
                      <span>{object.name}</span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {object.isPrefix ? '-' : object.size ? formatBytes(object.size) : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {object.isPrefix
                  ? '-'
                  : object.lastModified
                    ? formatDate(object.lastModified)
                    : '-'}
              </TableCell>
              <TableCell>
                {!object.isPrefix && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => { void handleDownload(object.key, object.name); }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { void handleDelete(object.key); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
