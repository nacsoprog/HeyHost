"use client"

import { Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import type { ConversationThread as ThreadType } from "@/lib/types"

interface ConversationThreadProps {
    thread: ThreadType
    onDeleteThread?: (threadId: string) => void
}

function formatDate(dateString: string): string {
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })
    } catch (e) {
        return dateString
    }
}

export function ConversationThread({
    thread,
    onDeleteThread
}: ConversationThreadProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="group/thread relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm mb-6 overflow-hidden"
        >
            {/* Thread Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Thread: {thread.topicLabel}
                    </span>
                    {thread.episodeTitle && (
                        <span className="text-xs text-gray-600 truncate max-w-[200px]">
                            {thread.episodeTitle}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onDeleteThread && (
                        <button
                            onClick={() => onDeleteThread(thread.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 transition-all group-hover/thread:opacity-100 hover:bg-destructive/20"
                            title="Delete Thread"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Thread Content with Timeline */}
            <div className="relative px-4 py-4">
                {/* Vertical Timeline Connector */}
                <div
                    className="absolute left-[1.75rem] top-6 bottom-6 w-px bg-gray-700"
                    aria-hidden="true"
                />

                {/* Messages */}
                <div className="flex flex-col">
                    {thread.messages.map((message, index) => {
                        const isQuestion = message.type === 'question'
                        const isFirst = index === 0
                        const isFollowUp = isQuestion && !isFirst

                        return (
                            <div
                                key={message.id}
                                className={`relative flex gap-3 ${isFollowUp ? 'mt-2' : isFirst ? '' : 'mt-4'}`}
                            >
                                {/* Timeline Node */}
                                <div className="relative z-10 flex-shrink-0">
                                    <div
                                        className={`
                                            flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold
                                            ${isQuestion
                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                                            }
                                        `}
                                    >
                                        {isQuestion ? 'Q' : 'A'}
                                    </div>
                                </div>

                                {/* Message Content */}
                                <div className="flex-1 min-w-0 pb-2">
                                    {isFollowUp && (
                                        <span className="inline-block mb-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium rounded bg-gray-800 text-gray-500">
                                            Follow-up
                                        </span>
                                    )}
                                    <p
                                        className={`
                                            text-sm leading-relaxed
                                            ${isQuestion ? 'text-white font-medium' : 'text-gray-300'}
                                        `}
                                    >
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Thread Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800/30 bg-gray-900/30">
                <span className="text-xs text-gray-600">
                    {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-600">
                    {formatDate(thread.updatedAt)}
                </span>
            </div>
        </motion.div>
    )
}
