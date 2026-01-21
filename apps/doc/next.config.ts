import type { NextConfig } from 'next'
import { createMDX } from 'fumadocs-mdx/next'
import path from 'path'

const withMDX = createMDX({})

const config: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactCompiler: true, // disable react compiler because of errors with docker and new bun 1.3.0
  transpilePackages: ['@repo/ui', '@repo/flow'],
  webpack: (config) => {
    // Ensure reactflow can be resolved from node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'reactflow': path.resolve('./node_modules/reactflow'),
    }
    return config
  },
}

export default withMDX(config)
