"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface ClipTrimmerProps {
    totalDuration: number
    startTime: number
    endTime: number
    onChange: (newStart: number, newEnd: number) => void
}

const MIN_CLIP_SECONDS = 1
const CONTEXT_PADDING = 30 // seconds of context on each side of clip

function formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

export function ClipTrimmer({
    totalDuration,
    startTime,
    endTime,
    onChange
}: ClipTrimmerProps) {
    const [localStart, setLocalStart] = useState(startTime)
    const [localEnd, setLocalEnd] = useState(endTime)
    const [dragging, setDragging] = useState<'start' | 'end' | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)

    // Viewport window - zoomed in around the clip for easier editing
    const [viewport, setViewport] = useState(() => ({
        start: Math.max(0, startTime - CONTEXT_PADDING),
        end: Math.min(totalDuration, endTime + CONTEXT_PADDING)
    }))

    // Sync local state with props when they change externally
    useEffect(() => {
        if (!dragging) {
            setLocalStart(startTime)
            setLocalEnd(endTime)
        }
    }, [startTime, endTime, dragging])

    // Update viewport when props change (but keep stable during drag)
    useEffect(() => {
        if (!dragging) {
            setViewport({
                start: Math.max(0, startTime - CONTEXT_PADDING),
                end: Math.min(totalDuration, endTime + CONTEXT_PADDING)
            })
        }
    }, [startTime, endTime, totalDuration, dragging])

    const viewportDuration = viewport.end - viewport.start

    // Map time to percentage within the zoomed viewport
    const timeToPercent = (time: number) => {
        return ((time - viewport.start) / viewportDuration) * 100
    }

    // Map pixel position to time within the zoomed viewport
    const pixelToTime = useCallback((clientX: number) => {
        if (!trackRef.current) return 0
        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        return viewport.start + (percent * viewportDuration)
    }, [viewport, viewportDuration])

    const handlePointerDown = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        setDragging(handle)
    }

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!dragging) return
        const time = pixelToTime(e.clientX)

        if (dragging === 'start') {
            const max = localEnd - MIN_CLIP_SECONDS
            setLocalStart(Math.max(0, Math.min(max, Math.round(time))))
        } else {
            const min = localStart + MIN_CLIP_SECONDS
            setLocalEnd(Math.max(min, Math.min(totalDuration, Math.round(time))))
        }
    }, [dragging, pixelToTime, localStart, localEnd, totalDuration])

    const handlePointerUp = useCallback(() => {
        if (dragging) {
            // Persist change when drag ends
            onChange(localStart, localEnd)
        }
        setDragging(null)
    }, [dragging, localStart, localEnd, onChange])

    useEffect(() => {
        if (dragging) {
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', handlePointerUp)
            return () => {
                window.removeEventListener('pointermove', handlePointerMove)
                window.removeEventListener('pointerup', handlePointerUp)
            }
        }
    }, [dragging, handlePointerMove, handlePointerUp])

    const startPercent = timeToPercent(localStart)
    const endPercent = timeToPercent(localEnd)
    const clipDuration = Math.floor(localEnd - localStart)

    return (
        <div className="flex flex-col gap-2">
            {/* Centered time info */}
            <div className="text-center text-xs text-muted-foreground">
                <span>{formatTimestamp(localStart)}</span>
                <span className="mx-1">-</span>
                <span>{formatTimestamp(localEnd)}</span>
                <span className="ml-1.5">
                    <span
                        key={clipDuration}
                        className="inline-block font-medium text-foreground animate-pop"
                    >
                        ({formatDuration(clipDuration)})
                    </span>
                </span>
            </div>

            {/* Progress Bar */}
            <div ref={trackRef} className="relative h-2 w-full select-none">
                {/* Background track */}
                <div className="absolute inset-0 rounded-full bg-secondary" />

                {/* Active clip segment */}
                <div
                    className="absolute top-0 bottom-0 bg-primary/70 rounded-full"
                    style={{
                        left: `${startPercent}%`,
                        width: `${endPercent - startPercent}%`
                    }}
                />

                {/* Start handle */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing touch-none z-10"
                    style={{ left: `${startPercent}%` }}
                    onPointerDown={handlePointerDown('start')}
                >
                    <div className="absolute -inset-3" />
                    <div className={`
                        w-3.5 h-3.5 rounded-full border-2 border-background shadow-md transition-transform
                        ${dragging === 'start' ? 'bg-primary scale-125' : 'bg-primary hover:scale-110'}
                    `} />
                </div>

                {/* End handle */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing touch-none z-10"
                    style={{ left: `${endPercent}%` }}
                    onPointerDown={handlePointerDown('end')}
                >
                    <div className="absolute -inset-3" />
                    <div className={`
                        w-3.5 h-3.5 rounded-full border-2 border-background shadow-md transition-transform
                        ${dragging === 'end' ? 'bg-primary scale-125' : 'bg-primary hover:scale-110'}
                    `} />
                </div>
            </div>
        </div>
    )
}
