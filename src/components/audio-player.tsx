"use client"

import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Mic, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { usePlayer } from "@/lib/player-context"
import { cn } from "@/lib/utils"
import ElectricBorder from "./ElectricBorder"

// Speed options for cycling
const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0]

// Format time as H:MM:SS for long durations, MM:SS for short
function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
}

// Animated Waveform Equalizer Component
function WaveformIndicator({ isPlaying }: { isPlaying: boolean }) {
    return (
        <div className="flex items-end gap-[3px] h-6 w-5">
            <span
                className={cn(
                    "w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400 transition-all",
                    isPlaying ? "animate-waveform-1 h-3" : "h-2"
                )}
            />
            <span
                className={cn(
                    "w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400 transition-all",
                    isPlaying ? "animate-waveform-2 h-5" : "h-3"
                )}
            />
            <span
                className={cn(
                    "w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400 transition-all",
                    isPlaying ? "animate-waveform-3 h-4" : "h-2"
                )}
            />
        </div>
    )
}

export function AudioPlayer() {
    const {
        currentEpisode,
        isPlaying,
        togglePlay,
        currentTime,
        duration,
        seek,
        skipForward,
        skipBackward,
        volume,
        setVolume,
        toggleMute,
        isMuted,
        stopPlayback,
        playbackSpeed,
        setPlaybackSpeed,
        toggleVoiceMode,
        isVoiceActive
    } = usePlayer()

    if (!currentEpisode) return null

    // Fallback to RSS duration if metadata duration is 0
    const maxDuration = duration || currentEpisode?.duration || 100
    const progress = maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0

    // Cycle through speed options
    const cycleSpeed = () => {
        const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed)
        const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
        setPlaybackSpeed(SPEED_OPTIONS[nextIndex])
    }

    return (
        <>
            {/* Inject keyframe animations */}
            <style jsx global>{`
                @keyframes waveform-1 {
                    0%, 100% { height: 0.5rem; }
                    50% { height: 1.25rem; }
                }
                @keyframes waveform-2 {
                    0%, 100% { height: 1.25rem; }
                    50% { height: 0.625rem; }
                }
                @keyframes waveform-3 {
                    0%, 100% { height: 0.75rem; }
                    50% { height: 1.5rem; }
                }
                .animate-waveform-1 { animation: waveform-1 0.8s ease-in-out infinite; }
                .animate-waveform-2 { animation: waveform-2 0.6s ease-in-out infinite; }
                .animate-waveform-3 { animation: waveform-3 0.7s ease-in-out infinite; }
            `}</style>

            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                }}
                className={cn(
                    // Floating geometry with 16px margins
                    "fixed bottom-4 left-4 right-4",
                    "w-[calc(100%-32px)] max-w-5xl mx-auto",
                    // Fixed height
                    "h-[90px]",
                    // Shape & Glassmorphism
                    "rounded-2xl",
                    "bg-gray-900/90 backdrop-blur-xl",
                    "border-t border-white/10",
                    "shadow-2xl shadow-black/50",
                    // Z-index for global persistence
                    "z-[100]",
                    // Grid layout
                    "grid grid-cols-[30%_40%_30%]",
                    "items-center",
                    "px-5"
                )}
            >
                {/* ═══════════════════════════════════════════════════════════════
                    LEFT SECTION (30%) - Typography Anchor
                ═══════════════════════════════════════════════════════════════ */}
                <div className="flex items-center gap-4 min-w-0 pr-4">
                    {/* Animated Waveform Indicator */}
                    <WaveformIndicator isPlaying={isPlaying} />

                    {/* Text Metadata Block */}
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-lg font-bold text-white truncate leading-tight">
                            {currentEpisode?.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                            {currentEpisode?.guest || "Podcast Episode"}
                        </p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    CENTER SECTION (40%) - The Command Center
                ═══════════════════════════════════════════════════════════════ */}
                <div className="flex flex-col items-center gap-2">
                    {/* Top Row: Transport Controls */}
                    <div className="flex items-center gap-3">
                        {/* Rewind 15s */}
                        <button
                            onClick={skipBackward}
                            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            title="Rewind 15 seconds"
                        >
                            <RotateCcw className="h-5 w-5" />
                            <span className="absolute text-[9px] font-bold">15</span>
                        </button>

                        {/* Play/Pause - Large & Prominent with Morph Animation */}
                        <button
                            onClick={togglePlay}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {isPlaying ? (
                                    <motion.div
                                        key="pause"
                                        initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                        exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Pause className="h-6 w-6" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="play"
                                        initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                        exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Play className="h-6 w-6 ml-0.5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>

                        {/* Fast Forward 15s */}
                        <button
                            onClick={skipForward}
                            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            title="Forward 15 seconds"
                        >
                            <RotateCw className="h-5 w-5" />
                            <span className="absolute text-[9px] font-bold">15</span>
                        </button>

                        {/* Voice AI Trigger */}
                        <ElectricBorder
                            color={isVoiceActive ? "#ef4444" : "#80bdff"} // Red when listening, Blue when idle
                            speed={isVoiceActive ? 2 : 0.9} // Faster when listening
                            chaos={isVoiceActive ? 0.4 : 0.17}
                            borderRadius={100}
                            className="flex items-center justify-center"
                        >
                            <button
                                onClick={toggleVoiceMode}
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                                    isVoiceActive ? "bg-red-500/30 text-red-300" : "bg-violet-500/30 text-violet-300"
                                )}
                                title={isVoiceActive ? "Stop Voice Command" : "Start Voice Command"}
                            >
                                <Mic className={cn("h-5 w-5", isVoiceActive && "animate-pulse")} />
                            </button>
                        </ElectricBorder>
                    </div>

                    {/* Bottom Row: Scrubber with Time Labels */}
                    <div className="flex items-center gap-3 w-full max-w-md">
                        <span className="text-xs text-white/50 font-mono w-14 text-right">
                            {formatTime(currentTime)}
                        </span>
                        <div className="relative flex-1 h-5 flex items-center group">
                            <div className="absolute w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-100"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={maxDuration}
                                value={currentTime}
                                onChange={(e) => seek(Number(e.target.value))}
                                className="absolute w-full h-5 opacity-0 cursor-pointer"
                            />
                            {/* Thumb indicator */}
                            <div
                                className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress}% - 6px)` }}
                            />
                        </div>
                        <span className="text-xs text-white/50 font-mono w-14">
                            {formatTime(maxDuration)}
                        </span>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    RIGHT SECTION (30%) - Utilities
                ═══════════════════════════════════════════════════════════════ */}
                <div className="flex items-center justify-end gap-4 pl-4">
                    {/* Speed Toggle */}
                    <button
                        onClick={cycleSpeed}
                        className="flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all min-w-[52px]"
                        title="Playback Speed"
                    >
                        {playbackSpeed.toFixed(playbackSpeed % 1 === 0 ? 1 : 2)}x
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX className="h-5 w-5" />
                            ) : (
                                <Volume2 className="h-5 w-5" />
                            )}
                        </button>
                        <div className="relative w-20 h-4 flex items-center group">
                            <div className="absolute w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white/60 rounded-full"
                                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                                />
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={isMuted ? 0 : volume}
                                onChange={(e) => setVolume(Number(e.target.value))}
                                className="absolute w-full h-4 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={stopPlayback}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
                        title="Close Player"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        </>
    )
}
