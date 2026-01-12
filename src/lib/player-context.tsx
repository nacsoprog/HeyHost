"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import type { Episode, PlayerState, Annotation, SavedClip, SavedQA, TranscriptSegment } from "./types"
import { mockEpisodes, mockTranscript, mockAnnotations } from "./mock-data"
import { parseDuration, extractDurationFromOutline } from "./duration"

const CLIP_DURATION = 30; // Duration of saved clips in seconds
const LOCAL_STORAGE_KEY = "heyhost_saved_clips";
const QA_STORAGE_KEY = "heyhost_saved_qa";
const TITLE_API_URL = "http://localhost:5001/generate-clip-title";

// Extract episode number from title (e.g., "#487 – Irving..." → "487")
function extractEpisodeId(title: string): string {
    const match = title.match(/#(\d+)/);
    if (match) return match[1];
    // Fallback: try end pattern "Podcast #488"
    const endMatch = title.match(/Podcast #(\d+)/i);
    if (endMatch) return endMatch[1];
    return title;
}

// Helper to format seconds as MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface PlayerContextType extends PlayerState {
    episodes: Episode[]
    currentEpisode: Episode | null
    transcript: TranscriptSegment[]
    annotations: Annotation[]
    savedClips: SavedClip[]
    savedQAs: SavedQA[]
    isPlayingClip: boolean
    currentClipId: string | null
    playEpisode: (episode: Episode) => void
    togglePlay: () => void
    seek: (time: number) => void
    setVolume: (volume: number) => void
    toggleMute: () => void
    setPlaybackSpeed: (speed: number) => void
    skipForward: () => void
    skipBackward: () => void
    saveClip: () => Promise<void>
    playClip: (clip: SavedClip) => void
    stopClip: () => void
    toggleVoiceMode: () => void
    addAnnotation: (annotation: Omit<Annotation, "id" | "createdAt">) => void
    deleteAnnotation: (id: string) => void
    deleteClip: (id: string) => void
    updateClip: (id: string, newStart: number, newEnd: number) => void
    saveQA: (question: string, answer: string) => void
    deleteQA: (id: string) => void
    setCurrentTime: (time: number) => void
    stopPlayback: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolumeState] = useState(0.8)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackSpeed, setPlaybackSpeedState] = useState(1)
    const [isVoiceActive, setIsVoiceActive] = useState(false)
    const [annotations, setAnnotations] = useState<Annotation[]>(mockAnnotations)
    const [savedClips, setSavedClips] = useState<SavedClip[]>([])
    const [savedQAs, setSavedQAs] = useState<SavedQA[]>([])
    const [isPlayingClip, setIsPlayingClip] = useState(false)
    const [currentClipId, setCurrentClipId] = useState<string | null>(null)

    // Load saved clips from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
            if (stored) {
                try {
                    setSavedClips(JSON.parse(stored))
                } catch (e) {
                    console.error("Failed to parse saved clips:", e)
                }
            }
        }
    }, [])

    // Load saved Q&As from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(QA_STORAGE_KEY)
            if (stored) {
                try {
                    setSavedQAs(JSON.parse(stored))
                } catch (e) {
                    console.error("Failed to parse saved Q&As:", e)
                }
            }
        }
    }, [])

    const RSS_URL = '/api/rss';

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const response = await fetch(RSS_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                const items = xml.querySelectorAll('item');

                const fetchedEpisodes: Episode[] = Array.from(items).slice(0, 20).map((item, index) => {
                    const enclosure = item.querySelector('enclosure');
                    const description = item.querySelector('description')?.textContent || '';

                    // Parse duration - try itunes:duration first, fall back to extracting from description
                    const durationStr = item.getElementsByTagName('itunes:duration')[0]?.textContent;
                    let duration = parseDuration(durationStr);

                    // If no itunes:duration, extract from OUTLINE timestamps in description
                    if (duration === 0) {
                        duration = extractDurationFromOutline(description);
                    }

                    return {
                        id: String(index),
                        title: item.querySelector('title')?.textContent || 'Untitled',
                        guest: '',
                        description: description,
                        thumbnail: '/placeholder.svg',
                        duration: duration,
                        publishedAt: item.querySelector('pubDate')?.textContent || '',
                        audioUrl: enclosure?.getAttribute('url') || '',
                        progress: 0
                    };
                });

                setEpisodes(fetchedEpisodes);
                if (fetchedEpisodes.length > 0) {
                    setCurrentEpisode(fetchedEpisodes[0]);
                }
            } catch (error) {
                console.error("Error fetching episodes:", error);
                setEpisodes(mockEpisodes);
            }
        };

        fetchEpisodes();
    }, []);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const clipAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);
        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                setDuration(audio.duration);
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    // Clip audio timeupdate listener - stops playback when clip reaches endTime
    useEffect(() => {
        const clipAudio = clipAudioRef.current;
        if (!clipAudio) return;

        const handleClipTimeUpdate = () => {
            if (!currentClipId) return;
            const currentClip = savedClips.find(c => c.id === currentClipId);
            if (currentClip && clipAudio.currentTime >= currentClip.endTime) {
                clipAudio.pause();
                setIsPlayingClip(false);
                setCurrentClipId(null);
            }
        };

        const handleClipEnded = () => {
            setIsPlayingClip(false);
            setCurrentClipId(null);
        };

        clipAudio.addEventListener('timeupdate', handleClipTimeUpdate);
        clipAudio.addEventListener('ended', handleClipEnded);
        return () => {
            clipAudio.removeEventListener('timeupdate', handleClipTimeUpdate);
            clipAudio.removeEventListener('ended', handleClipEnded);
        };
    }, [currentClipId, savedClips]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = volume;
            audio.muted = isMuted;
            audio.playbackRate = playbackSpeed;
        }
    }, [volume, isMuted, playbackSpeed]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio && currentEpisode?.audioUrl) {
            if (audio.src !== currentEpisode.audioUrl) {
                audio.src = currentEpisode.audioUrl;
                audio.load();
                if (isPlaying) audio.play().catch(e => console.error("Play failed:", e));
            } else {
                if (isPlaying && audio.paused) audio.play().catch(e => console.error("Play failed:", e));
                if (!isPlaying && !audio.paused) audio.pause();
            }
        } else if (audio && !currentEpisode) {
            audio.pause();
            audio.src = "";
        }
    }, [currentEpisode, isPlaying]);

    const playEpisode = useCallback((episode: Episode) => {
        // Stop any playing clip
        if (clipAudioRef.current && !clipAudioRef.current.paused) {
            clipAudioRef.current.pause()
            setIsPlayingClip(false)
            setCurrentClipId(null)
        }
        setCurrentEpisode(episode)
        setIsPlaying(true)
    }, [])

    const togglePlay = useCallback(() => {
        // Stop any playing clip when toggling main player
        if (clipAudioRef.current && !clipAudioRef.current.paused) {
            clipAudioRef.current.pause()
            setIsPlayingClip(false)
            setCurrentClipId(null)
        }
        setIsPlaying((prev) => !prev)
    }, [])

    const seek = useCallback((time: number) => {
        const d = duration || currentEpisode?.duration || 0;
        const newTime = Math.max(0, Math.min(time, d));
        if (audioRef.current) audioRef.current.currentTime = newTime;
        setCurrentTime(newTime)
    }, [currentEpisode, duration])

    const skipForward = useCallback(() => {
        const current = audioRef.current?.currentTime || 0
        seek(current + 15)
    }, [seek])

    const skipBackward = useCallback(() => {
        const current = audioRef.current?.currentTime || 0
        seek(current - 15)
    }, [seek])

    // Save clip function - saves the last 30 seconds as a bookmark with AI-generated title
    const saveClip = useCallback(async () => {
        if (!currentEpisode) {
            console.warn("[PlayerContext] Cannot save clip - no episode playing")
            return
        }

        const endTime = currentTime
        const startTime = Math.max(0, endTime - CLIP_DURATION)
        const clipDuration = endTime - startTime
        const fallbackTitle = `Clip at ${formatTime(startTime)}`

        // Try to generate AI title
        let title = fallbackTitle
        try {
            const episodeId = extractEpisodeId(currentEpisode.title)
            console.log("[PlayerContext] Generating title for episode:", episodeId, "time range:", startTime, "-", endTime)

            const response = await fetch(TITLE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    episode_id: episodeId,
                    start_time: Math.floor(startTime),
                    end_time: Math.floor(endTime)
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.title) {
                    title = data.title
                    console.log("[PlayerContext] AI generated title:", title)
                }
            } else {
                console.warn("[PlayerContext] Title API returned:", response.status)
            }
        } catch (e) {
            console.warn("[PlayerContext] Title generation failed, using fallback:", e)
        }

        const newClip: SavedClip = {
            id: `clip_${Date.now()}`,
            episodeId: currentEpisode.id,
            episodeTitle: currentEpisode.title,
            episodeThumbnail: currentEpisode.thumbnail,
            episodeDuration: duration || currentEpisode.duration,
            title,
            startTime,
            endTime,
            duration: clipDuration,
            savedAt: new Date().toISOString()
        }

        console.log("[PlayerContext] Saving clip:", newClip)

        setSavedClips(prev => {
            const updated = [newClip, ...prev]
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
            }
            return updated
        })
    }, [currentEpisode, currentTime, duration])

    const toggleVoiceMode = useCallback(() => {
        setIsVoiceActive(prev => !prev)
    }, [])
    const addAnnotation = useCallback(() => { }, [])
    const deleteAnnotation = useCallback(() => { }, [])

    const deleteClip = useCallback((id: string) => {
        setSavedClips(prev => {
            const updated = prev.filter(clip => clip.id !== id)
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
            }
            return updated
        })
    }, [])

    // Update a clip's start and end times (for trimming) - preserves AI titles
    const updateClip = useCallback((id: string, newStart: number, newEnd: number) => {
        setSavedClips(prev => {
            const updated = prev.map(clip => {
                if (clip.id !== id) return clip
                // Preserve AI-generated titles; only update fallback titles
                const hasAiTitle = !clip.title.startsWith("Clip at ")
                return {
                    ...clip,
                    startTime: newStart,
                    endTime: newEnd,
                    duration: newEnd - newStart,
                    title: hasAiTitle ? clip.title : `Clip at ${formatTime(newStart)}`
                }
            })
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
            }
            return updated
        })
    }, [])

    // Save a Q&A pair
    const saveQA = useCallback((question: string, answer: string) => {
        const newQA: SavedQA = {
            id: `qa_${Date.now()}`,
            question,
            answer,
            episodeId: currentEpisode?.id,
            episodeTitle: currentEpisode?.title,
            timestamp: currentTime,
            savedAt: new Date().toISOString()
        }

        console.log("[PlayerContext] Saving Q&A:", newQA)

        setSavedQAs(prev => {
            const updated = [newQA, ...prev]
            if (typeof window !== 'undefined') {
                localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(updated))
            }
            return updated
        })
    }, [currentEpisode, currentTime])

    const deleteQA = useCallback((id: string) => {
        setSavedQAs(prev => {
            const updated = prev.filter(qa => qa.id !== id)
            if (typeof window !== 'undefined') {
                localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(updated))
            }
            return updated
        })
    }, [])

    // Play a saved clip using a separate audio element (stops main player)
    const playClip = useCallback((clip: SavedClip) => {
        const episode = episodes.find(ep => ep.id === clip.episodeId)
        if (!episode || !clipAudioRef.current || !episode.audioUrl) {
            console.warn("[PlayerContext] Could not find episode or audio URL for clip:", clip.episodeId)
            return
        }

        // Stop the main podcast audio if it's playing
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause()
            setIsPlaying(false)
        }

        // Use the separate clip audio element
        const clipAudio = clipAudioRef.current
        clipAudio.src = episode.audioUrl
        clipAudio.currentTime = clip.startTime
        clipAudio.play().catch(e => console.error("Clip play failed:", e))

        setCurrentClipId(clip.id)
        setIsPlayingClip(true)
    }, [episodes])

    // Stop playing the current clip
    const stopClip = useCallback(() => {
        if (clipAudioRef.current) {
            clipAudioRef.current.pause()
        }
        setIsPlayingClip(false)
        setCurrentClipId(null)
    }, [])
    const setVolume = useCallback((v: number) => setVolumeState(v), [])
    const toggleMute = useCallback(() => setIsMuted(prev => !prev), [])
    const setPlaybackSpeed = useCallback((s: number) => setPlaybackSpeedState(s), [])

    // Stop playback and clear current episode (for closing the player)
    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ""
        }
        setIsPlaying(false)
        setCurrentEpisode(null)
        setCurrentTime(0)
        setDuration(0)
    }, [])

    return (
        <PlayerContext.Provider
            value={{
                currentEpisode,
                isPlaying,
                currentTime,
                duration,
                volume,
                isMuted,
                playbackSpeed,
                isVoiceActive,
                episodes,
                transcript: mockTranscript,
                annotations,
                savedClips,
                savedQAs,
                isPlayingClip,
                currentClipId,
                playEpisode,
                togglePlay,
                seek,
                setVolume,
                toggleMute,
                setPlaybackSpeed,
                skipForward,
                skipBackward,
                saveClip,
                playClip,
                stopClip,
                toggleVoiceMode,
                addAnnotation,
                deleteAnnotation,
                deleteClip,
                updateClip,
                saveQA,
                deleteQA,
                setCurrentTime,
                stopPlayback,
            }}
        >
            <audio ref={audioRef} />
            <audio ref={clipAudioRef} />
            {children}
        </PlayerContext.Provider>
    )
}

export function usePlayer() {
    const context = useContext(PlayerContext)
    if (!context) throw new Error("usePlayer must be used within a PlayerProvider")
    return context
}
