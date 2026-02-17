#!/usr/bin/env -S bun

import { build } from "tsup";
import path from "path";
import { existsSync, rmSync } from "fs";
import { Glob } from "bun";

const __dirname = import.meta.dir;
const packageRoot = path.resolve(__dirname, "..");
const srcDir = path.join(packageRoot, "src");
const distDir = path.join(packageRoot, "dist");

// Parse command line arguments
const args = process.argv.slice(2);
const watchMode = args.includes("--watch");

// Cleanup function
function cleanup() {
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
}

// Filter function to exclude test files
function isTestFile(filePath: string): boolean {
  if (
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx")
  ) {
    return true;
  }
  const testDirNames = ["__tests__", "tests", "test", "__test__"];
  return testDirNames.some(
    (dir) => filePath.includes(`/${dir}/`) || filePath.startsWith(`${dir}/`)
  );
}

// Get all TypeScript/TSX files from source directories
async function getFiles(): Promise<string[]> {
  const glob = new Glob("**/*.{ts,tsx}");
  const files: string[] = [];

  // Scan all directories in src
  const directories = ["core", "ui", "plugins", "store"];

  for (const dir of directories) {
    const dirPath = path.join(srcDir, dir);
    if (existsSync(dirPath)) {
      for await (const file of glob.scan({ cwd: dirPath })) {
        const fullPath = path.join("src", dir, file);
        if (!isTestFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  // Add root index files
  const rootFiles = ["index.ts"];
  for (const file of rootFiles) {
    const filePath = path.join(srcDir, file);
    if (existsSync(filePath) && !isTestFile(file)) {
      files.push(path.join("src", file));
    }
  }

  return files;
}

// Build function using tsup
async function runBuild(files: string[], watch: boolean) {
  const entryPoints = files.map((file) => path.join(packageRoot, file));

  console.log("Building @repo/flow package with tsup...");
  console.log(`Found ${files.length} entry points`);

  try {
    await build({
      entry: entryPoints,
      outDir: "dist",
      format: ["esm"],
      dts: true,
      target: "es2020",
      sourcemap: true,
      clean: false,
      treeshake: true,
      watch,
      external: [
        "react",
        "react-dom",
        "reactflow",
        "zustand",
        "zod",
        "@repo/ui",
        "@repo/types",
        "lucide-react",
      ],
      esbuildOptions(options) {
        options.jsx = "automatic";
      },
    });

    if (!watch) {
      console.log("✅ Package built successfully");
    }
  } catch (error) {
    console.error("❌ Build failed:", error);
    throw error;
  }
}

// Main execution
(async () => {
  cleanup();
  const files = await getFiles();

  if (files.length === 0) {
    console.error("❌ No source files found!");
    process.exit(1);
  }

  await runBuild(files, watchMode);
})();
