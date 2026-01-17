'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/shadcn/dialog'
import { Button } from '@repo/ui/components/shadcn/button'
import { Progress } from '@repo/ui/components/shadcn/progress'
import { Upload, X, File as FileIcon } from 'lucide-react'
import { useFileUpload } from '@/domains/storage/hooks'
import { cn } from '@repo/ui/lib/utils'
import type { JSX } from 'react'

interface FileUploadDialogProps {
  bucket: string
  path?: string
  onUploadComplete?: () => void
}

interface UploadFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
}

export function FileUploadDialog({
  bucket,
  path = '',
  onUploadComplete,
}: FileUploadDialogProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const upload = useFileUpload()

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles).map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const handleUpload = async () => {
    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      if (currentFile?.status !== 'pending') continue

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' as const } : f))
      )

      try {
        await upload.mutateAsync({
          bucket,
          file: currentFile.file,
          objectName: path ? `${path.replace(/\/+$/, '')}/${currentFile.file.name}` : currentFile.file.name,
        })

        // Update status to completed
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'completed' as const, progress: 100 } : f))
        )
      } catch {
        // Update status to error
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error' as const } : f))
        )
      }
    }

    // Call completion callback and close dialog
    onUploadComplete?.()
    setTimeout(() => {
      setOpen(false)
      setFiles([])
    }, 1000)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isUploading = files.some((f) => f.status === 'uploading')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to {bucket}/{path || '(root)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div
            className={cn(
              'border-muted-foreground/25 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
              'hover:border-primary hover:bg-primary/5'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              Click to select files or drag and drop
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { handleFileSelect(e.target.files); }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Files to upload ({files.length})</p>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {files.map((uploadFile, index) => (
                  <div
                    key={index}
                    className="border-muted flex items-center space-x-3 rounded-lg border p-3"
                  >
                    <FileIcon className="text-muted-foreground h-8 w-8" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{uploadFile.file.name}</p>
                        {uploadFile.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => { removeFile(index); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <p className="text-muted-foreground text-xs">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {uploadFile.status === 'uploading' && (
                          <p className="text-muted-foreground text-xs">
                            • {Math.round(uploadFile.progress)}%
                          </p>
                        )}
                        {uploadFile.status === 'completed' && (
                          <p className="text-green-600 text-xs">• Completed</p>
                        )}
                        {uploadFile.status === 'error' && (
                          <p className="text-destructive text-xs">• Failed</p>
                        )}
                      </div>
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="h-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setFiles([])
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { void handleUpload(); }}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length.toString()} file(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
