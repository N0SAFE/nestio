'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/shadcn/dialog'
import { Button } from '@repo/ui/components/shadcn/button'
import { Input } from '@repo/ui/components/shadcn/input'
import { Label } from '@repo/ui/components/shadcn/label'
import { PlusCircle } from 'lucide-react'
import { useCreateBucket } from '@/hooks/storage/useStorage'
import type { JSX } from 'react'

export function CreateBucketDialog(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [bucketName, setBucketName] = useState('')
  const createBucket = useCreateBucket()

  const handleCreate = async () => {
    if (!bucketName.trim()) return
    
    await createBucket.mutateAsync(bucketName.trim())
    setBucketName('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Bucket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Bucket</DialogTitle>
          <DialogDescription>
            Enter a unique name for your bucket. Bucket names must follow S3 naming conventions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bucketName">Bucket Name</Label>
            <Input
              id="bucketName"
              placeholder="my-bucket"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreate()
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Use lowercase letters, numbers, and hyphens only
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!bucketName.trim() || createBucket.isPending}
          >
            {createBucket.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
