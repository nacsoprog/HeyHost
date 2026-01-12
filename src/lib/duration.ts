/**
 * Robust duration parsing and formatting utilities.
 * Handles various podcast feed formats and edge cases.
 */

/**
 * Extract duration from a podcast description's OUTLINE section.
 * Many podcast feeds (like Lex Fridman) don't include itunes:duration
 * but have timestamps in the description like:
 *   (00:00) – Introduction
 *   (3:58:24) – Final topic
 *
 * This function finds the LAST timestamp and converts it to seconds.
 *
 * @returns Duration in seconds, or 0 if no timestamps found
 */
export function extractDurationFromOutline(description: string | null | undefined): number {
    if (!description) return 0

    // Match timestamps in format (H:MM:SS), (HH:MM:SS), (M:SS), or (MM:SS)
    // Examples: (0:00), (15:40), (1:02:50), (3:58:24)
    const timestampRegex = /\((\d{1,2}):(\d{2})(?::(\d{2}))?\)/g

    let lastMatch: RegExpExecArray | null = null
    let match: RegExpExecArray | null

    while ((match = timestampRegex.exec(description)) !== null) {
        lastMatch = match
    }

    if (!lastMatch) return 0

    // Parse the last timestamp
    if (lastMatch[3] !== undefined) {
        // Format: H:MM:SS or HH:MM:SS
        const hours = parseInt(lastMatch[1], 10)
        const minutes = parseInt(lastMatch[2], 10)
        const seconds = parseInt(lastMatch[3], 10)
        return hours * 3600 + minutes * 60 + seconds
    } else {
        // Format: M:SS or MM:SS
        const minutes = parseInt(lastMatch[1], 10)
        const seconds = parseInt(lastMatch[2], 10)
        return minutes * 60 + seconds
    }
}

/**
 * Parse a duration value that may come in various formats:
 * - Raw seconds as number: 5400
 * - Raw seconds as string: "5400"
 * - HH:MM:SS format: "1:30:00" or "01:30:00"
 * - MM:SS format: "30:00"
 * - H:MM:SS with single digit hour: "1:30:00"
 * - null/undefined/empty
 *
 * @returns Duration in seconds, or 0 if unparseable
 */
export function parseDuration(value: string | number | null | undefined): number {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
        return 0
    }

    // If it's already a valid number, return it
    if (typeof value === 'number') {
        return isNaN(value) || value < 0 ? 0 : Math.floor(value)
    }

    // Clean the string
    const str = String(value).trim()
    if (!str) return 0

    // Check if it's a colon-separated time format
    if (str.includes(':')) {
        const parts = str.split(':').map(p => {
            const num = parseInt(p, 10)
            return isNaN(num) ? 0 : num
        })

        if (parts.length === 3) {
            // HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
            // MM:SS
            return parts[0] * 60 + parts[1]
        }
        // Invalid format, try parsing as raw number below
    }

    // Try parsing as raw seconds (e.g., "5400")
    const num = parseInt(str, 10)
    if (!isNaN(num) && num >= 0) {
        return num
    }

    return 0
}

/**
 * Check if a duration value is valid and displayable.
 * Returns false for 0, NaN, negative, or unreasonably large values.
 */
export function isValidDuration(seconds: number | null | undefined): boolean {
    if (seconds === null || seconds === undefined) return false
    if (typeof seconds !== 'number') return false
    if (isNaN(seconds)) return false
    if (seconds <= 0) return false
    // Sanity check: more than 24 hours is probably an error
    if (seconds > 86400) return false
    return true
}

/**
 * Format duration in seconds to human-readable string for display.
 * Examples: "1h 30m", "45m", "2m"
 *
 * @returns Formatted string, or null if duration is invalid
 */
export function formatDurationHuman(seconds: number | null | undefined): string | null {
    if (!isValidDuration(seconds)) {
        return null
    }

    const secs = seconds as number
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)

    if (h > 0) {
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }

    // Always show at least 1m for valid durations
    return `${Math.max(1, m)}m`
}

/**
 * Format duration in seconds to timestamp format.
 * Examples: "1:30:00", "45:00", "2:30"
 */
export function formatDurationTimestamp(seconds: number | null | undefined): string {
    if (!isValidDuration(seconds)) {
        return "0:00"
    }

    const secs = seconds as number
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
}
