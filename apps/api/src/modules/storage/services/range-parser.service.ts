import { Injectable, BadRequestException } from "@nestjs/common";

/**
 * Range request result
 */
export interface RangeResult {
    start: number;
    end: number;
    size: number;
    contentLength: number;
}

/**
 * RangeParserService - Handles HTTP Range header parsing and validation
 * 
 * Implements RFC 7233 (HTTP Range Requests) for:
 * - Partial content downloads (206 responses)
 * - Resumable downloads
 * - Video/audio streaming
 * - Bandwidth optimization
 * 
 * Supported formats:
 * - bytes=0-1023 (specific range)
 * - bytes=1024- (from byte to end)
 * - bytes=-500 (last 500 bytes)
 * - bytes=0-0,-1 (first and last byte) - returns first satisfiable range
 */
@Injectable()
export class RangeParserService {
    /**
     * Parse HTTP Range header and validate against file size
     * 
     * @param rangeHeader - The Range header value (e.g., "bytes=0-1023")
     * @param fileSize - Total size of the file in bytes
     * @returns Range information or null if no range specified
     * @throws BadRequestException if range is invalid
     */
    parseRange(rangeHeader: string | undefined, fileSize: number): RangeResult | null {
        // No range header means full file
        if (!rangeHeader) {
            return null;
        }

        // Validate range header format
        if (!rangeHeader.startsWith("bytes=")) {
            throw new BadRequestException("Invalid Range header format. Must start with 'bytes='");
        }

        // Extract range specification
        const rangeSpec = rangeHeader.substring(6); // Remove "bytes="

        // Handle multiple ranges - take first satisfiable range only
        // (multipart/byteranges is complex and rarely needed)
        const ranges = rangeSpec.split(",");
        const firstRange = ranges[0]?.trim();

        if (!firstRange) {
            throw new BadRequestException("Invalid Range header: empty range specification");
        }

        return this.parseRangeSpec(firstRange, fileSize);
    }

    /**
     * Parse a single range specification
     * 
     * @param rangeSpec - Range spec (e.g., "0-1023", "1024-", "-500")
     * @param fileSize - Total file size
     * @returns Range result
     */
    private parseRangeSpec(rangeSpec: string, fileSize: number): RangeResult {
        const parts = rangeSpec.split("-");

        if (parts.length !== 2) {
            throw new BadRequestException(`Invalid range specification: ${rangeSpec}`);
        }

        const [startStr, endStr] = parts;

        // Case 1: bytes=-500 (last N bytes)
        if (startStr === "" && endStr !== "") {
            const suffixLength = parseInt(endStr ?? "", 10);

            if (isNaN(suffixLength) || suffixLength <= 0) {
                throw new BadRequestException(`Invalid suffix length: ${String(endStr)}`);
            }

            const start = Math.max(0, fileSize - suffixLength);
            const end = fileSize - 1;

            return {
                start,
                end,
                size: fileSize,
                contentLength: end - start + 1,
            };
        }

        // Parse start position
        const start = parseInt(startStr ?? "", 10);

        if (isNaN(start) || start < 0) {
            throw new BadRequestException(`Invalid start position: ${String(startStr)}`);
        }

        // Case 2: bytes=1024- (from start to end)
        if (endStr === "") {
            if (start >= fileSize) {
                throw new BadRequestException(
                    `Range start ${String(start)} exceeds file size ${String(fileSize)}`
                );
            }

            const end = fileSize - 1;

            return {
                start,
                end,
                size: fileSize,
                contentLength: end - start + 1,
            };
        }

        // Case 3: bytes=0-1023 (specific range)
        const end = parseInt(endStr ?? "", 10);

        if (isNaN(end) || end < start) {
            throw new BadRequestException(`Invalid end position: ${String(endStr)} (must be >= start ${String(start)})`);
        }

        // Clamp end to file size
        const actualEnd = Math.min(end, fileSize - 1);

        if (start >= fileSize) {
            throw new BadRequestException(
                `Range start ${String(start)} exceeds file size ${String(fileSize)}`
            );
        }

        return {
            start,
            end: actualEnd,
            size: fileSize,
            contentLength: actualEnd - start + 1,
        };
    }

    /**
     * Generate Content-Range header value
     * 
     * @param range - Range result
     * @returns Content-Range header value (e.g., "bytes 0-1023/4096")
     */
    formatContentRange(range: RangeResult): string {
        return `bytes ${String(range.start)}-${String(range.end)}/${String(range.size)}`;
    }

    /**
     * Check if a range is satisfiable for the given file size
     * 
     * @param rangeHeader - Range header value
     * @param fileSize - File size
     * @returns true if range is satisfiable
     */
    isRangeSatisfiable(rangeHeader: string | undefined, fileSize: number): boolean {
        try {
            if (!rangeHeader) {
                return true;
            }

            this.parseRange(rangeHeader, fileSize);
            return true;
        } catch {
            return false;
        }
    }
}
