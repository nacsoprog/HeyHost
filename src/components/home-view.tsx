"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, Clock, Calendar, Search } from "lucide-react"
import { usePlayer } from "@/lib/player-context"
import { SavedClips } from "@/components/saved-clips"
import { SavedQA } from "@/components/saved-qa"
import { ActiveEpisodeHero } from "@/components/ActiveEpisodeHero"
import { Header } from "@/components/Header"
import { formatDurationHuman } from "@/lib/duration"
import type { Episode } from "@/lib/types"

function formatDate(dateString: string): string {
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    } catch (e) {
        return dateString;
    }
}

interface HomeViewProps {
    onEpisodeSelect: (episode: Episode) => void
}

type Tab = "episodes" | "clips" | "qa"

export function HomeView({ onEpisodeSelect }: HomeViewProps) {
    const { episodes, playEpisode, currentEpisode, togglePlay, isPlaying, isVoiceActive, savedClips, savedQAs } = usePlayer()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<Tab>("episodes")

    // Filter episodes by search, excluding the current active episode
    const recentEpisodes = episodes.filter(
        (e) =>
            e.id !== currentEpisode?.id &&
            ((e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (e.guest && e.guest.toLowerCase().includes(searchQuery.toLowerCase())))
    )

    const handlePlay = (episode: Episode) => {
        if (currentEpisode?.id === episode.id) {
            togglePlay()
        } else {
            playEpisode(episode)
            onEpisodeSelect(episode)
        }
    }

    const isCurrent = (episode: Episode) => currentEpisode?.id === episode.id;

    return (
        <div className="min-h-screen text-foreground">
            {/* Header */}
            <Header
                activeTab={activeTab}
                onTabChange={setActiveTab}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                savedClipsCount={savedClips.length}
                savedQAsCount={savedQAs.length}
            />

            {/* Content */}
            <div className="p-8">
                <AnimatePresence mode="wait">
                    {activeTab === "clips" ? (
                        <motion.div
                            key="clips"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SavedClips searchQuery={searchQuery} />
                        </motion.div>
                    ) : activeTab === "qa" ? (
                        <motion.div
                            key="qa"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SavedQA searchQuery={searchQuery} />
                        </motion.div>
                    ) : (
                        <motion.section
                            key="episodes"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Active Episode Hero */}
                            <AnimatePresence mode="popLayout">
                                {currentEpisode && (
                                    <div className="mb-4" onClick={() => onEpisodeSelect(currentEpisode)}>
                                        <ActiveEpisodeHero
                                            episode={currentEpisode}
                                            isListening={isVoiceActive}
                                        />
                                    </div>
                                )}
                            </AnimatePresence>

                            {/* Episode List */}
                            <div className="flex flex-col gap-2">
                                {recentEpisodes.map((episode, index) => (
                                    <motion.div
                                        key={episode.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.2 }}
                                        className="group flex cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-card/70 backdrop-blur-sm p-4 transition-all hover:bg-card/90"
                                        onClick={() => handlePlay(episode)}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h3 className="mb-1 truncate text-lg font-medium">{episode.title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(episode.publishedAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDurationHuman(episode.duration) ?? "--"}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                        >
                                            {isCurrent(episode) && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {recentEpisodes.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                                    <p className="text-muted-foreground">No episodes match your search</p>
                                </div>
                            )}
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
