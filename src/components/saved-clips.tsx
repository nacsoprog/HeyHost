"use client"

import { Play, Square, Trash2, Bookmark, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePlayer } from "@/lib/player-context"
import { ClipTrimmer } from "@/components/clip-trimmer"
import ShinyText from "@/components/ShinyText"
import type { SavedClip } from "@/lib/types"

// Group clips by episode for a cleaner "table of contents" layout
interface EpisodeGroup {
    episodeId: string
    episodeTitle: string
    episodeDuration: number
    clips: SavedClip[]
}

function groupClipsByEpisode(clips: SavedClip[]): EpisodeGroup[] {
    const groupMap = new Map<string, EpisodeGroup>()

    for (const clip of clips) {
        const existing = groupMap.get(clip.episodeId)
        if (existing) {
            existing.clips.push(clip)
        } else {
            groupMap.set(clip.episodeId, {
                episodeId: clip.episodeId,
                episodeTitle: clip.episodeTitle,
                episodeDuration: clip.episodeDuration,
                clips: [clip],
            })
        }
    }

    // Return groups, maintaining the order of first appearance
    return Array.from(groupMap.values())
}

// Format time as MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface SavedClipsProps {
    searchQuery?: string
}

export function SavedClips({ searchQuery = "" }: SavedClipsProps) {
    const { savedClips, playClip, stopClip, deleteClip, updateClip, isPlayingClip, currentClipId } = usePlayer()

    // Filter clips by search query
    const filteredClips = searchQuery
        ? savedClips.filter(
            (clip) =>
                clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                clip.episodeTitle.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : savedClips

    if (savedClips.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bookmark className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No saved clips yet</h3>
                <p className="text-muted-foreground max-w-sm">
                    Say "Save that" while listening to save the last 30 seconds as a clip
                </p>
            </div>
        )
    }

    if (filteredClips.length === 0 && searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No clips match your search</h3>
                <p className="text-muted-foreground">Try a different search term</p>
            </div>
        )
    }

    const episodeGroups = groupClipsByEpisode(filteredClips)

    return (
        <div className="flex flex-col gap-5">
            {episodeGroups.map((group) => (
                <EpisodeCard
                    key={group.episodeId}
                    group={group}
                    playClip={playClip}
                    stopClip={stopClip}
                    deleteClip={deleteClip}
                    updateClip={updateClip}
                    isPlayingClip={isPlayingClip}
                    currentClipId={currentClipId}
                />
            ))}
        </div>
    )
}

// Parent Card: Shows episode artwork, title, and clip count
interface EpisodeCardProps {
    group: EpisodeGroup
    playClip: (clip: SavedClip) => void
    stopClip: () => void
    deleteClip: (id: string) => void
    updateClip: (id: string, newStart: number, newEnd: number) => void
    isPlayingClip: boolean
    currentClipId: string | null
}

function EpisodeCard({
    group,
    playClip,
    stopClip,
    deleteClip,
    updateClip,
    isPlayingClip,
    currentClipId,
}: EpisodeCardProps) {
    const clipCount = group.clips.length

    return (
        <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden">
            {/* Episode Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h3 className="font-semibold text-base leading-tight truncate">
                    {group.episodeTitle}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0 ml-3">
                    {clipCount} saved clip{clipCount !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Clips List */}
            <div className="divide-y divide-border/20">
                <AnimatePresence initial={false}>
                    {group.clips.map((clip) => (
                        <ClipRow
                            key={clip.id}
                            clip={clip}
                            episodeDuration={group.episodeDuration}
                            playClip={playClip}
                            stopClip={stopClip}
                            deleteClip={deleteClip}
                            updateClip={updateClip}
                            isPlaying={isPlayingClip && currentClipId === clip.id}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}

// Child Row: Shows timestamp range and play/delete buttons only
interface ClipRowProps {
    clip: SavedClip
    episodeDuration: number
    playClip: (clip: SavedClip) => void
    stopClip: () => void
    deleteClip: (id: string) => void
    updateClip: (id: string, newStart: number, newEnd: number) => void
    isPlaying: boolean
}

function ClipRow({
    clip,
    episodeDuration,
    playClip,
    stopClip,
    deleteClip,
    updateClip,
    isPlaying,
}: ClipRowProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`group relative flex flex-col gap-3 px-4 py-4 hover:bg-muted/30 transition-colors ${
                isPlaying ? "bg-purple-500/5" : ""
            }`}
        >
            {/* Now Playing Glow Indicator */}
            {isPlaying && (
                <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="absolute inset-0 rounded-lg border-2 border-purple-500/50"
                        animate={{
                            boxShadow: [
                                "0 0 0px rgba(168, 85, 247, 0)",
                                "0 0 20px rgba(168, 85, 247, 0.3)",
                                "0 0 0px rgba(168, 85, 247, 0)",
                            ],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </motion.div>
            )}

            {/* Top row: Play button | Title | Delete button */}
            <div className="flex items-center gap-3 relative z-10">
                {/* Left: Play/Stop button */}
                <div className="flex-shrink-0">
                    <AnimatePresence mode="wait">
                        {isPlaying ? (
                            <motion.button
                                key="stop"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={stopClip}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white transition-transform hover:scale-105"
                                title="Stop clip"
                            >
                                <Square className="h-4 w-4" />
                            </motion.button>
                        ) : (
                            <motion.button
                                key="play"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => playClip(clip)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
                                title="Play clip"
                            >
                                <Play className="h-4 w-4 ml-0.5" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Center: Big Title */}
                <div className="flex-1 min-w-0 px-2">
                    <h4 className="text-center text-[1.1rem] font-semibold leading-tight line-clamp-2">
                        {isPlaying ? (
                            <ShinyText text={clip.title} speed={2} />
                        ) : (
                            clip.title
                        )}
                    </h4>
                </div>

                {/* Right: Delete button - hidden until hover */}
                <div className="flex-shrink-0">
                    <button
                        onClick={() => deleteClip(clip.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/20"
                        title="Delete clip"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Bottom: Full-width Progress Bar */}
            {episodeDuration > 0 && (
                <ClipTrimmer
                    totalDuration={episodeDuration}
                    startTime={clip.startTime}
                    endTime={clip.endTime}
                    onChange={(newStart, newEnd) => updateClip(clip.id, newStart, newEnd)}
                />
            )}
        </motion.div>
    )
}
