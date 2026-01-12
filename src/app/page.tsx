"use client"

import { AnimatePresence } from "framer-motion"
import { PlayerProvider, usePlayer } from "@/lib/player-context"
import { HomeView } from "@/components/home-view"
import { AudioPlayer } from "@/components/audio-player"
import { VoiceControl } from "@/components/voice-control"
import Threads from "@/components/Threads"

function AudioPlayerWrapper() {
  const { currentEpisode } = usePlayer()
  return (
    <AnimatePresence>
      {currentEpisode && <AudioPlayer />}
    </AnimatePresence>
  )
}

function VoiceControlWrapper() {
  const { isVoiceActive } = usePlayer()
  return isVoiceActive ? <VoiceControl /> : null
}

export default function Home() {
  return (
    <PlayerProvider>
      {/* Full-screen Threads background */}
      <div className="fixed inset-0 z-0">
        <Threads
          amplitude={1.7}
          distance={1}
          enableMouseInteraction={false}
        />
      </div>

      <main className="relative z-10 min-h-screen pb-24">
        <HomeView onEpisodeSelect={() => { }} />
      </main>
      <AudioPlayerWrapper />
      <VoiceControlWrapper />
    </PlayerProvider>
  );
}
