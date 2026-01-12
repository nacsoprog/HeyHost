"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlayer } from "@/lib/player-context"
import { LiveTranscript } from "./LiveTranscript"
import type { Episode, TranscriptSegment } from "@/lib/types"

interface ActiveEpisodeHeroProps {
    episode: Episode
    isListening?: boolean
    className?: string
}

function extractEpisodeId(title: string): string {
    const match = title.match(/#(\d+)/)
    return match ? match[1] : ""
}

export function ActiveEpisodeHero({
    episode,
    isListening = false,
    className,
}: ActiveEpisodeHeroProps) {
    const { currentTime, seek } = usePlayer()
    const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const episodeId = extractEpisodeId(episode.title)
        if (episodeId) {
            setTranscript([])
            setIsLoading(true)
            fetch(`http://localhost:5001/api/transcript/${episodeId}`)
                .then(res => {
                    if (!res.ok) return []
                    return res.json()
                })
                .then(data => {
                    if (Array.isArray(data)) {
                        setTranscript(data)
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false))
        } else {
            setTranscript([])
        }
    }, [episode.title])

    return (
        <motion.div
            layoutId="active-hero"
            className={cn(
                "relative overflow-hidden rounded-2xl",
                "bg-slate-900/90 backdrop-blur-xl",
                "border border-white/10",
                "transition-shadow duration-300",
                isListening && [
                    "ring-2 ring-purple-500/50",
                    "shadow-[0_0_30px_rgba(168,85,247,0.15)]",
                ],
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
            }}
        >
            {isListening && (
                <motion.div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.3) 0%, transparent 60%)",
                    }}
                    animate={{
                        opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}

            <div className="relative z-10 p-6">
                <div className="mb-2 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        Live Now
                    </span>

                    {isListening && (
                        <span className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-400">
                            <Radio className="h-3 w-3" />
                            Listening
                        </span>
                    )}
                </div>

                <h1 className="text-xl font-bold tracking-tight text-white leading-tight line-clamp-2">
                    {episode.title}
                </h1>

                <div className="flex items-center gap-3 text-sm text-slate-400">
                    {episode.guest && (
                        <span className="font-medium">{episode.guest}</span>
                    )}
                    {episode.guest && episode.publishedAt && (
                        <span className="text-slate-600">·</span>
                    )}
                    {episode.publishedAt && (
                        <span>
                            {new Date(episode.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                            })}
                        </span>
                    )}
                </div>
            </div>

            {(isLoading || transcript.length > 0) && (
                <div className="border-t border-white/10">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <LiveTranscript
                            segments={transcript}
                            currentTime={currentTime}
                            onSeek={seek}
                        />
                    )}
                </div>
            )}

            {isListening && (
                <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(168,85,247,0.1), transparent)",
                    }}
                    animate={{
                        backgroundPosition: ["0% 0%", "200% 0%"],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            )}
        </motion.div>
    )
}

export default ActiveEpisodeHero
