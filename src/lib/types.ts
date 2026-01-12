export interface Episode {
    id: string
    title: string
    guest: string
    description: string
    thumbnail: string
    duration: number
    publishedAt: string
    progress?: number
    audioUrl?: string
}

export interface PlayerState {
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    isVoiceActive: boolean
    playbackSpeed: number
}

// Mock transcript interfaces just in case we need them as specific types
export interface TranscriptSegment {
    id: string
    startTime: number
    endTime: number
    text: string
    speaker: string
}

export interface Annotation {
    id: string
    timestamp: number
    text: string
    createdAt: string
}

export interface SavedClip {
    id: string
    episodeId: string
    episodeTitle: string
    episodeThumbnail: string
    episodeDuration: number
    title: string
    startTime: number
    endTime: number
    duration: number
    savedAt: string
}

export interface SavedQA {
    id: string
    question: string
    answer: string
    episodeId?: string
    episodeTitle?: string
    timestamp?: number
    savedAt: string
    threadId?: string // Groups related Q&As into conversation threads
    isFollowUp?: boolean // Indicates if this is a follow-up question
}

export interface ThreadMessage {
    id: string
    type: 'question' | 'answer'
    content: string
    timestamp?: number
    savedAt: string
}

export interface ConversationThread {
    id: string
    topicLabel: string
    episodeId?: string
    episodeTitle?: string
    messages: ThreadMessage[]
    createdAt: string
    updatedAt: string
}
