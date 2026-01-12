"use client"

import { Input } from "@/components/ui/input"
import { Search, Radio, Bookmark, MessageCircleQuestion, X } from "lucide-react"
import { motion } from "framer-motion"

type Tab = "episodes" | "clips" | "qa"

interface HeaderProps {
    activeTab: Tab
    onTabChange: (tab: Tab) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    savedClipsCount: number
    savedQAsCount: number
}

export function Header({
    activeTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    savedClipsCount,
    savedQAsCount,
}: HeaderProps) {
    return (
        <header className="sticky top-0 z-50 relative flex h-16 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            {/* Left Column - Brand */}
            <div className="flex-1">
                <h1 className="text-xl font-bold font-sans tracking-tight">
                    Hey Host
                </h1>
            </div>

            {/* Center Column - Segmented Control Navigation */}
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex gap-1 rounded-full border border-gray-800 bg-gray-900/50 p-1">
                    <button
                        onClick={() => onTabChange("episodes")}
                        className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                        {activeTab === "episodes" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gray-800 rounded-full"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className={`relative z-10 flex items-center gap-2 ${activeTab === "episodes" ? "text-white" : "text-gray-400 hover:text-white"}`}>
                            <Radio className="h-4 w-4" />
                            Episodes
                        </span>
                    </button>
                    <button
                        onClick={() => onTabChange("clips")}
                        className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                        {activeTab === "clips" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gray-800 rounded-full"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className={`relative z-10 flex items-center gap-2 ${activeTab === "clips" ? "text-white" : "text-gray-400 hover:text-white"}`}>
                            <Bookmark className="h-4 w-4" />
                            Clips
                            {savedClipsCount > 0 && (
                                <span className="ml-0.5 text-xs tabular-nums text-gray-500">
                                    {savedClipsCount}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => onTabChange("qa")}
                        className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                        {activeTab === "qa" && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-gray-800 rounded-full"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className={`relative z-10 flex items-center gap-2 ${activeTab === "qa" ? "text-white" : "text-gray-400 hover:text-white"}`}>
                            <MessageCircleQuestion className="h-4 w-4" />
                            Q&A
                            {savedQAsCount > 0 && (
                                <span className="ml-0.5 text-xs tabular-nums text-gray-500">
                                    {savedQAsCount}
                                </span>
                            )}
                        </span>
                    </button>
                </div>
            </nav>

            {/* Right Column - Search */}
            <div className="flex flex-1 justify-end">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 rounded-full bg-secondary/30 pl-9 pr-9 text-sm border-border/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    )
}
