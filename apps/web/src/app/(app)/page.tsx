import React from 'react'
import { Button } from '@repo/ui/components/shadcn/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@repo/ui/components/shadcn/card'
import Link from 'next/link'
import {
    ArrowRight,
    Database,
    HardDrive,
    Shield,
    Zap,
    Lock,
    Upload,
    Download,
} from 'lucide-react'
import type { JSX } from 'react'

function FeatureCard({
    icon: Icon,
    title,
    description,
    gradient,
}: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    gradient: string
}) {
    return (
        <Card className="from-background to-muted/20 relative overflow-hidden border-0 bg-gradient-to-br">
            <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}
            />
            <CardHeader className="relative">
                <div className="flex items-center space-x-3">
                    <div
                        className={`rounded-lg bg-gradient-to-br p-2 ${gradient}`}
                    >
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="relative">
                <CardDescription className="text-sm leading-relaxed">
                    {description}
                </CardDescription>
            </CardContent>
        </Card>
    )
}

export default function Page(): JSX.Element {
    return (
        <div className="container mx-auto mt-8 space-y-12 px-4 py-12 md:py-16 lg:py-20">
            {/* Hero Section */}
            <section className="space-y-6 text-center">
                <div className="space-y-4">
                    <h1 className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
                        Nestio Object Storage
                    </h1>
                    <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
                        S3-compatible object storage built from scratch with NestJS.
                        Fast, reliable, and fully compatible with AWS S3 APIs.
                    </p>
                </div>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                    <Link href="/storage">
                        <Button
                            size="lg"
                            className="flex items-center space-x-2"
                        >
                            <Database className="h-5 w-5" />
                            <span>Browse Buckets</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/auth/signin">
                        <Button
                            variant="outline"
                            size="lg"
                            className="flex items-center space-x-2"
                        >
                            <Shield className="h-5 w-5" />
                            <span>Sign In</span>
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="space-y-8">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-bold">Features</h2>
                    <p className="text-muted-foreground">
                        Everything you need for object storage
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard
                        icon={Database}
                        title="S3-Compatible"
                        description="Fully compatible with AWS S3 APIs. Use existing S3 clients and SDKs without modification."
                        gradient="from-blue-500 to-purple-600"
                    />
                    <FeatureCard
                        icon={HardDrive}
                        title="Hybrid Storage"
                        description="Metadata in PostgreSQL, object data on filesystem. Best of both worlds for performance and reliability."
                        gradient="from-green-500 to-teal-600"
                    />
                    <FeatureCard
                        icon={Zap}
                        title="High Performance"
                        description="Built with NestJS and TypeScript. Fast API responses and efficient file operations."
                        gradient="from-yellow-400 to-orange-500"
                    />
                    <FeatureCard
                        icon={Shield}
                        title="Secure Access"
                        description="Authentication and authorization built-in. Presigned URLs for secure file sharing."
                        gradient="from-pink-500 to-rose-500"
                    />
                    <FeatureCard
                        icon={Upload}
                        title="Multipart Upload"
                        description="Support for large file uploads with multipart upload protocol and progress tracking."
                        gradient="from-indigo-500 to-blue-600"
                    />
                    <FeatureCard
                        icon={Lock}
                        title="Data Integrity"
                        description="MD5 ETags for data integrity verification. Ensures your files are never corrupted."
                        gradient="from-purple-500 to-violet-600"
                    />
                </div>
            </section>

            {/* Quick Start Section */}
            <section className="space-y-8">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-bold">Get Started</h2>
                    <p className="text-muted-foreground">
                        Start managing your object storage
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Database className="h-8 w-8 text-blue-500" />
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        Create Buckets
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Organize your files
                                    </p>
                                </div>
                            </div>
                            <p className="text-muted-foreground">
                                Create buckets to organize your files. Each bucket acts as a
                                container for your objects with its own access controls.
                            </p>
                            <Link href="/storage">
                                <Button className="w-full">
                                    Manage Buckets
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Upload className="h-8 w-8 text-green-500" />
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        Upload Files
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Store any file type
                                    </p>
                                </div>
                            </div>
                            <p className="text-muted-foreground">
                                Upload files of any size with progress tracking. Supports
                                multipart uploads for large files.
                            </p>
                            <Link href="/storage">
                                <Button className="w-full">
                                    Upload Files
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Download className="h-8 w-8 text-purple-500" />
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        Share Files
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        Generate presigned URLs
                                    </p>
                                </div>
                            </div>
                            <p className="text-muted-foreground">
                                Share files securely with presigned URLs. Set expiration
                                times and control access to your objects.
                            </p>
                            <Link href="/storage">
                                <Button className="w-full">
                                    Browse Files
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </section>
        </div>
    )
}
