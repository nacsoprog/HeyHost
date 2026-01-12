"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { TranscriptSegment } from "@/lib/types"

interface LiveTranscriptProps {
    segments: TranscriptSegment[]
    currentTime: number
    onSeek: (time: number) => void
    className?: string
}

function findActiveSegment(
    segments: TranscriptSegment[],
    currentTime: number
): TranscriptSegment | null {
    if (segments.length === 0) return null

    let left = 0
    let right = segments.length - 1
    let result = 0

    while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (currentTime >= segments[mid].startTime) {
            result = mid
            left = mid + 1
        } else {
            right = mid - 1
        }
    }

    return segments[result]
}

export function LiveTranscript({
    segments,
    currentTime,
    onSeek,
    className
}: LiveTranscriptProps) {
    const activeSegment = useMemo(() => {
        return findActiveSegment(segments, currentTime)
    }, [segments, currentTime])

    if (segments.length === 0) {
        return (
            <div className={cn("flex items-center justify-center h-full text-slate-500", className)}>
                No transcript available
            </div>
        )
    }

    if (!activeSegment) {
        return (
            <div className={cn("flex items-center justify-center h-full text-slate-500", className)}>
                Waiting for audio...
            </div>
        )
    }

    return (
        <div className={cn("px-6 py-4", className)}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSegment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onSeek(activeSegment.startTime)}
                    className="cursor-pointer"
                >
                    <span className="text-xs font-medium text-purple-400 mr-2">
                        {activeSegment.speaker}:
                    </span>
                    <span className="text-sm leading-relaxed text-slate-300">
                        {activeSegment.text}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default LiveTranscript
