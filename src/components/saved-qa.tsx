"use client"

import { MessageCircleQuestion, Search } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { usePlayer } from "@/lib/player-context"
import { useMemo } from "react"
import { ConversationThread } from "./ConversationThread"
import type { SavedQA, ConversationThread as ThreadType, ThreadMessage } from "@/lib/types"

/**
 * Generates a simple topic label from question text.
 * Extracts key concepts for display as the thread topic.
 */
function generateTopicLabel(questions: string[]): string {
    if (questions.length === 0) return "Conversation"

    const firstQuestion = questions[0].toLowerCase()

    // Common topic patterns to extract
    const topicPatterns = [
        { pattern: /what is (?:the |a )?(.+?)(?:\?|$)/i, group: 1 },
        { pattern: /how (?:do|does|can|to) (.+?)(?:\?|$)/i, group: 1 },
        { pattern: /why (?:is|are|do|does) (.+?)(?:\?|$)/i, group: 1 },
        { pattern: /(?:explain|tell me about|describe) (.+?)(?:\?|$)/i, group: 1 },
        { pattern: /who (?:is|was|are) (.+?)(?:\?|$)/i, group: 1 },
    ]

    for (const { pattern, group } of topicPatterns) {
        const match = firstQuestion.match(pattern)
        if (match && match[group]) {
            const topic = match[group].trim()
            // Capitalize and truncate
            const words = topic.split(' ').slice(0, 3)
            return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        }
    }

    // Fallback: use first few words of question
    const words = questions[0].split(' ').slice(0, 3).join(' ')
    return words.length > 25 ? words.substring(0, 25) + '...' : words
}

/**
 * Groups SavedQA items into conversation threads.
 *
 * Grouping logic:
 * 1. If a Q&A has an explicit threadId, group by that
 * 2. Otherwise, group consecutive Q&As from the same episode within a time window
 * 3. Single Q&As become their own thread
 */
function groupQAsIntoThreads(savedQAs: SavedQA[]): ThreadType[] {
    if (savedQAs.length === 0) return []

    const threads: ThreadType[] = []
    const threadMap = new Map<string, SavedQA[]>()
    const unthreaded: SavedQA[] = []

    // First pass: group by explicit threadId
    for (const qa of savedQAs) {
        if (qa.threadId) {
            if (!threadMap.has(qa.threadId)) {
                threadMap.set(qa.threadId, [])
            }
            threadMap.get(qa.threadId)!.push(qa)
        } else {
            unthreaded.push(qa)
        }
    }

    // Second pass: group unthreaded QAs by episode and time proximity (5 min window)
    const TIME_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
    const episodeGroups = new Map<string, SavedQA[]>()

    for (const qa of unthreaded) {
        const key = qa.episodeId || 'no-episode'
        if (!episodeGroups.has(key)) {
            episodeGroups.set(key, [])
        }
        episodeGroups.get(key)!.push(qa)
    }

    // Sort each episode group by savedAt and group by time proximity
    for (const [episodeKey, qas] of episodeGroups) {
        // Sort by savedAt ascending
        const sortedQAs = [...qas].sort((a, b) =>
            new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        )

        let currentGroup: SavedQA[] = []
        let lastTime: number | null = null

        for (const qa of sortedQAs) {
            const qaTime = new Date(qa.savedAt).getTime()

            if (lastTime === null || qaTime - lastTime <= TIME_WINDOW_MS) {
                currentGroup.push(qa)
            } else {
                // Time gap too large, start new group
                if (currentGroup.length > 0) {
                    const threadId = `auto-${episodeKey}-${currentGroup[0].id}`
                    threadMap.set(threadId, currentGroup)
                }
                currentGroup = [qa]
            }
            lastTime = qaTime
        }

        // Don't forget the last group
        if (currentGroup.length > 0) {
            const threadId = `auto-${episodeKey}-${currentGroup[0].id}`
            threadMap.set(threadId, currentGroup)
        }
    }

    // Convert thread groups to Thread objects
    for (const [threadId, qas] of threadMap) {
        // Sort QAs by savedAt for proper order
        const sortedQAs = [...qas].sort((a, b) =>
            new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        )

        const messages: ThreadMessage[] = []
        const questions: string[] = []

        for (let i = 0; i < sortedQAs.length; i++) {
            const qa = sortedQAs[i]
            questions.push(qa.question)

            // Add question message
            messages.push({
                id: `${qa.id}-q`,
                type: 'question',
                content: qa.question,
                timestamp: qa.timestamp,
                savedAt: qa.savedAt
            })

            // Add answer message
            messages.push({
                id: `${qa.id}-a`,
                type: 'answer',
                content: qa.answer,
                timestamp: qa.timestamp,
                savedAt: qa.savedAt
            })
        }

        const firstQA = sortedQAs[0]
        const lastQA = sortedQAs[sortedQAs.length - 1]

        threads.push({
            id: threadId,
            topicLabel: generateTopicLabel(questions),
            episodeId: firstQA.episodeId,
            episodeTitle: firstQA.episodeTitle,
            messages,
            createdAt: firstQA.savedAt,
            updatedAt: lastQA.savedAt
        })
    }

    // Sort threads by most recent activity (updatedAt descending)
    threads.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return threads
}

interface SavedQAProps {
    searchQuery?: string
}

export function SavedQA({ searchQuery = "" }: SavedQAProps) {
    const { savedQAs, deleteQA } = usePlayer()

    // Filter Q&As by search query
    const filteredQAs = useMemo(() => {
        if (!searchQuery) return savedQAs

        const query = searchQuery.toLowerCase()
        return savedQAs.filter(
            (qa) =>
                qa.question.toLowerCase().includes(query) ||
                qa.answer.toLowerCase().includes(query) ||
                (qa.episodeTitle && qa.episodeTitle.toLowerCase().includes(query))
        )
    }, [savedQAs, searchQuery])

    // Group filtered Q&As into threads
    const threads = useMemo(() => {
        return groupQAsIntoThreads(filteredQAs)
    }, [filteredQAs])

    // Handle deleting all Q&As in a thread
    const handleDeleteThread = (threadId: string) => {
        const thread = threads.find(t => t.id === threadId)
        if (!thread) return

        // Extract original QA ids from message ids (format: "qaId-q" or "qaId-a")
        const qaIds = new Set<string>()
        for (const message of thread.messages) {
            const qaId = message.id.replace(/-[qa]$/, '')
            qaIds.add(qaId)
        }

        // Delete all Q&As in the thread
        for (const qaId of qaIds) {
            deleteQA(qaId)
        }
    }

    if (savedQAs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircleQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No saved Q&A yet</h3>
                <p className="text-muted-foreground max-w-sm">
                    Say "Hey Host" and ask a question to get AI-powered answers about the podcast
                </p>
            </div>
        )
    }

    if (threads.length === 0 && searchQuery) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No Q&A match your search</h3>
                <p className="text-muted-foreground">Try a different search term</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            <AnimatePresence initial={false}>
                {threads.map((thread) => (
                    <ConversationThread
                        key={thread.id}
                        thread={thread}
                        onDeleteThread={handleDeleteThread}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}
