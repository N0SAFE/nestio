'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card'
import { Button } from '@repo/ui/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/shadcn/dropdown-menu'
import { Database, MoreVertical, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { JSX } from 'react'

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  
  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second')
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month')
  return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year')
}

interface BucketCardProps {
  name: string
  creationDate: Date
  onDelete: () => void
}

export function BucketCard({ name, creationDate, onDelete }: BucketCardProps): JSX.Element {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      <div className="from-primary/10 to-primary/5 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Database className="text-primary h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-semibold">{name}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="text-muted-foreground mb-4 text-sm">
          Created {getRelativeTime(new Date(creationDate))}
        </div>
        <Link href={`/storage/${name}`}>
          <Button className="w-full" variant="outline">
            Browse Files
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
