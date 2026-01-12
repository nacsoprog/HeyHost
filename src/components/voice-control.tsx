"use client"

import { useEffect, useRef, useState } from "react"
import { usePlayer } from "@/lib/player-context"
import { PorcupineWorker } from "@picovoice/porcupine-web"
import { WebVoiceProcessor } from "@picovoice/web-voice-processor"

const ACCESS_KEY_HEY_HOST = process.env.NEXT_PUBLIC_PORCUPINE_KEY_HEY_HOST || ""
const ACCESS_KEY_SAVE_THAT = process.env.NEXT_PUBLIC_PORCUPINE_KEY_SAVE_THAT || ""
const ACCESS_KEY_FORWARD = process.env.NEXT_PUBLIC_PORCUPINE_KEY_FORWARD || ""
const ACCESS_KEY_REWIND = process.env.NEXT_PUBLIC_PORCUPINE_KEY_REWIND || ""
const SILENCE_THRESHOLD = 30;
const SILENCE_DURATION = 1000;
const SERVER_URL = "http://localhost:5001/transcribe";

interface ConversationMessage {
    role: "user" | "assistant"
    content: string
}

export function VoiceControl() {
    const { isPlaying, togglePlay, saveClip, saveQA, skipForward, skipBackward } = usePlayer()
    const [status, setStatus] = useState<"idle" | "listening_wake_word" | "listening_speech" | "transcribing">("idle")
    const [transcript, setTranscript] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

    // Refs
    const heyHostWorkerRef = useRef<PorcupineWorker | null>(null)
    const saveThatWorkerRef = useRef<PorcupineWorker | null>(null)
    const forwardWorkerRef = useRef<PorcupineWorker | null>(null)
    const rewindWorkerRef = useRef<PorcupineWorker | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const silenceStartRef = useRef<number | null>(null)
    const silenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const isWakeWordActiveRef = useRef<boolean>(false)
    const shouldContinueConversationRef = useRef<boolean>(false)

    // Wake Word Init
    useEffect(() => {
        let isMounted = true;

        const initPorcupine = async () => {
            console.log("[VoiceControl] Initializing Porcupine wake words...")

            const porcupineModel = {
                publicPath: "/porcupine_params.pv"
            }

            // Initialize "Hey Host" wake word
            try {
                const heyHostKeyword = {
                    publicPath: "/Hey-Host_en_wasm_v4_0_0/Hey-Host_en_wasm_v4_0_0.ppn",
                    label: "Hey Host"
                }

                const heyHostWorker = await PorcupineWorker.create(
                    ACCESS_KEY_HEY_HOST,
                    [heyHostKeyword],
                    (detection) => {
                        // Prevent triggering if another wake word is active
                        if (isWakeWordActiveRef.current) {
                            console.log(`[VoiceControl] 'Hey Host' detected but another wake word is active, ignoring`)
                            return
                        }
                        console.log(`[VoiceControl] Wake word detected: ${detection.label}`)
                        isWakeWordActiveRef.current = true
                        document.dispatchEvent(new CustomEvent("voice-command-pause"))
                        document.dispatchEvent(new CustomEvent("start-speech-recording"))
                    },
                    porcupineModel
                )

                if (!isMounted) return;
                heyHostWorkerRef.current = heyHostWorker
                await WebVoiceProcessor.subscribe(heyHostWorker)
                console.log("[VoiceControl] 'Hey Host' wake word ready.")
            } catch (err: any) {
                console.error("[VoiceControl] 'Hey Host' init FAILED:", err)
            }

            // Initialize "Save That" wake word (separate try-catch)
            try {
                const saveThatKeyword = {
                    publicPath: "/save-that_en_wasm_v4_0_0/save-that_en_wasm_v4_0_0.ppn",
                    label: "Save That"
                }

                console.log("[VoiceControl] Creating 'Save That' worker with key:", ACCESS_KEY_SAVE_THAT.substring(0, 10) + "...")

                const saveThatWorker = await PorcupineWorker.create(
                    ACCESS_KEY_SAVE_THAT,
                    [saveThatKeyword],
                    (detection) => {
                        // Prevent triggering if another wake word is active
                        if (isWakeWordActiveRef.current) {
                            console.log(`[VoiceControl] 'Save That' detected but another wake word is active, ignoring`)
                            return
                        }
                        console.log(`[VoiceControl] Wake word detected: ${detection.label}`)
                        isWakeWordActiveRef.current = true
                        document.dispatchEvent(new CustomEvent("voice-command-save-clip"))
                    },
                    porcupineModel
                )

                if (!isMounted) return;
                saveThatWorkerRef.current = saveThatWorker
                await WebVoiceProcessor.subscribe(saveThatWorker)
                console.log("[VoiceControl] 'Save That' wake word ready.")
            } catch (err: any) {
                console.error("[VoiceControl] 'Save That' init FAILED:", err)
                console.error("[VoiceControl] This usually means the access key doesn't match the .ppn model file")
            }

            // Initialize "Forward" wake word
            try {
                const forwardKeyword = {
                    publicPath: "/keywords/forward.ppn",
                    label: "forward"
                }

                const forwardWorker = await PorcupineWorker.create(
                    ACCESS_KEY_FORWARD,
                    [forwardKeyword],
                    (detection) => {
                        if (isWakeWordActiveRef.current) return
                        console.log(`[VoiceControl] Wake word detected: ${detection.label}`)
                        skipForward()
                    },
                    porcupineModel
                )

                if (!isMounted) return;
                forwardWorkerRef.current = forwardWorker
                await WebVoiceProcessor.subscribe(forwardWorker)
                console.log("[VoiceControl] 'Forward' wake word ready.")
            } catch (err: any) {
                console.error("[VoiceControl] 'Forward' init FAILED:", err)
            }

            // Initialize "Rewind" wake word
            try {
                const rewindKeyword = {
                    publicPath: "/keywords/rewind.ppn",
                    label: "rewind"
                }

                const rewindWorker = await PorcupineWorker.create(
                    ACCESS_KEY_REWIND,
                    [rewindKeyword],
                    (detection) => {
                        if (isWakeWordActiveRef.current) return
                        console.log(`[VoiceControl] Wake word detected: ${detection.label}`)
                        skipBackward()
                    },
                    porcupineModel
                )

                if (!isMounted) return;
                rewindWorkerRef.current = rewindWorker
                await WebVoiceProcessor.subscribe(rewindWorker)
                console.log("[VoiceControl] 'Rewind' wake word ready.")
            } catch (err: any) {
                console.error("[VoiceControl] 'Rewind' init FAILED:", err)
            }

            if (isMounted) {
                setStatus("listening_wake_word")
                console.log("[VoiceControl] Wake word initialization complete.")
            }
        }

        initPorcupine()

        return () => {
            isMounted = false
            const cleanup = async () => {
                if (heyHostWorkerRef.current) {
                    await WebVoiceProcessor.unsubscribe(heyHostWorkerRef.current)
                    heyHostWorkerRef.current.terminate()
                }
                if (saveThatWorkerRef.current) {
                    await WebVoiceProcessor.unsubscribe(saveThatWorkerRef.current)
                    saveThatWorkerRef.current.terminate()
                }
                if (forwardWorkerRef.current) {
                    await WebVoiceProcessor.unsubscribe(forwardWorkerRef.current)
                    forwardWorkerRef.current.terminate()
                }
                if (rewindWorkerRef.current) {
                    await WebVoiceProcessor.unsubscribe(rewindWorkerRef.current)
                    rewindWorkerRef.current.terminate()
                }
            }
            cleanup().catch(e => console.error("Cleanup error", e))
        }
    }, [skipForward, skipBackward])

    // Event Handlers
    useEffect(() => {
        const handlePauseCommand = () => {
            if (isPlaying) {
                console.log("[VoiceControl] Pausing playback via wake word")
                togglePlay()
            }
        }

        const startRecording = async () => {
            // Prevent multiple starts
            if (status === "listening_speech" || status === "transcribing") return;

            console.log("[VoiceControl] Starting speech recording...")
            setStatus("listening_speech")
            setTranscript(null)
            audioChunksRef.current = []
            silenceStartRef.current = null

            try {
                // 1. Get Stream
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 2. Setup Audio Context for Silence Detection
                const audioCtx = new AudioContext();
                audioContextRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;

                // 3. Setup Recorder
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                recorder.onstop = () => {
                    console.log("[VoiceControl] Recorder stopped. Uploading...")
                    uploadRecording();
                };

                recorder.start(100); // chunk every 100ms

                // 4. Start Silence Loop
                if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
                silenceIntervalRef.current = setInterval(checkSilence, 100);

            } catch (err) {
                console.error("[VoiceControl] Mic Error:", err);
                setStatus("listening_wake_word");
                // Re-enable wake words after mic error
                isWakeWordActiveRef.current = false
            }
        }

        const handleResumeCommand = () => {
            if (!isPlaying) {
                // Logic check: only resume if we paused it?
                // For now, just resume.
                console.log("[VoiceControl] Resuming playback");
                togglePlay();
            }
        }

        const handleSaveClipCommand = async () => {
            console.log("[VoiceControl] 'Save That' triggered - saving clip of last 30 seconds")
            // Show generating feedback
            setTranscript("Generating title...")

            try {
                await saveClip()
                // Play confirmation sound
                const confirmSound = new Audio("/sounds/clip-saved.wav")
                confirmSound.volume = 0.5
                confirmSound.play().catch(e => console.error("[VoiceControl] Sound play failed:", e))
                // Show success feedback
                setTranscript("Clip saved!")
            } catch (e) {
                console.error("[VoiceControl] Save clip failed:", e)
                setTranscript("Clip saved!")
            }
            setTimeout(() => {
                setTranscript(null)
                // Re-enable wake words after command completes
                isWakeWordActiveRef.current = false
            }, 2000)
        }

        document.addEventListener("voice-command-pause", handlePauseCommand)
        document.addEventListener("voice-command-resume", handleResumeCommand)
        document.addEventListener("start-speech-recording", startRecording)
        document.addEventListener("voice-command-save-clip", handleSaveClipCommand)

        return () => {
            document.removeEventListener("voice-command-pause", handlePauseCommand)
            document.removeEventListener("voice-command-resume", handleResumeCommand)
            document.removeEventListener("start-speech-recording", startRecording)
            document.removeEventListener("voice-command-save-clip", handleSaveClipCommand)
        }
    }, [isPlaying, togglePlay, status, saveClip, saveQA])

    const checkSilence = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Average volume (0-255)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        // Debug log occasionally?
        // console.log("Volume:", average);

        if (average < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) {
                silenceStartRef.current = Date.now();
                console.log("[VoiceControl] Silence started...")
            } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION) {
                console.log("[VoiceControl] Silence threshold met (1s). Stopping...")
                stopRecording();
            }
        } else {
            if (silenceStartRef.current) {
                console.log("[VoiceControl] Noise detected. Resetting silence timer.")
            }
            silenceStartRef.current = null;
        }
    }

    const stopRecording = () => {
        if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    }

    const uploadRecording = async () => {
        setStatus("transcribing");
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        console.log(`[VoiceControl] Uploading ${audioBlob.size} bytes to backend...`);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
            const res = await fetch(SERVER_URL, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error(`Server Error: ${res.status}`);

            const data = await res.json();
            console.log("[VoiceControl] Transcription result:", data);

            if (data.text) {
                setTranscript(data.text);

                // Build messages array with conversation history
                const messages = [
                    ...conversationHistory,
                    { role: "user" as const, content: data.text }
                ]

                console.log(`[VoiceControl] Sending question to AI with history:`, messages);
                setStatus("transcribing");

                try {
                    const chatRes = await fetch("http://localhost:5001/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: data.text,
                            messages: messages  // Pass full conversation history
                        })
                    });

                    if (!chatRes.ok) throw new Error(`Chat Error: ${chatRes.status}`);

                    const chatData = await chatRes.json();
                    console.log("[VoiceControl] AI Response:", chatData);

                    // Update conversation history with assistant response
                    const updatedHistory: ConversationMessage[] = [
                        ...messages,
                        { role: "assistant", content: chatData.reply }
                    ]
                    setConversationHistory(updatedHistory)

                    // Handle function calls
                    if ('function_call' in chatData && chatData.function_call) {
                        if (chatData.function_call === "end_conversation") {
                            document.dispatchEvent(new CustomEvent("voice-command-resume"));
                            setStatus("listening_wake_word");
                            setConversationHistory([])  // Clear history when conversation ends
                            isWakeWordActiveRef.current = false
                            shouldContinueConversationRef.current = false
                        }

                        if (chatData.function_call === "semantic_bookmark") {
                            console.log("Sem bookmark placeholder");
                        }
                    }

                    if (chatData.reply) {
                        setTranscript(chatData.reply);
                        saveQA(data.text, chatData.reply);
                    }

                    // Handle Audio
                    if (chatData.audio) {
                        setStatus("idle");

                        const binaryString = window.atob(chatData.audio);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                        const audioUrl = URL.createObjectURL(audioBlob);

                        const audio = new Audio(audioUrl);
                        audio.onended = () => {
                            console.log("[VoiceControl] AI finished speaking.");

                            // Check if conversation should continue
                            if (chatData.repeat === "True" || shouldContinueConversationRef.current) {
                                console.log("[VoiceControl] Continuing conversation - listening for next input...");
                                shouldContinueConversationRef.current = true
                                setTranscript(null)
                                // Automatically start recording for next turn
                                setTimeout(() => {
                                    document.dispatchEvent(new CustomEvent("start-speech-recording"))
                                }, 500)
                            } else {
                                console.log("[VoiceControl] Conversation ended. Resuming podcast...");
                                document.dispatchEvent(new CustomEvent("voice-command-resume"));
                                setStatus("listening_wake_word");
                                setConversationHistory([])
                                isWakeWordActiveRef.current = false
                                shouldContinueConversationRef.current = false
                            }
                        };

                        console.log("[VoiceControl] Playing Audio...");
                        audio.play();

                    } else {
                        console.warn("[VoiceControl] No audio in response");
                        // If no audio, check repeat flag
                        if (chatData.repeat === "True") {
                            console.log("[VoiceControl] Repeat enabled, starting new recording...");
                            shouldContinueConversationRef.current = true
                            setTranscript(null)
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent("start-speech-recording"))
                            }, 1000)
                        } else {
                            setTimeout(() => {
                                document.dispatchEvent(new CustomEvent("voice-command-resume"));
                                setStatus("listening_wake_word");
                                setConversationHistory([])
                                isWakeWordActiveRef.current = false
                                shouldContinueConversationRef.current = false
                            }, 3000);
                        }
                    }

                } catch (chatErr) {
                    console.error("[VoiceControl] Chat request failed:", chatErr);
                    setTranscript("Error: AI Brain Failed");
                    setStatus("listening_wake_word");
                    setConversationHistory([])
                    isWakeWordActiveRef.current = false
                    shouldContinueConversationRef.current = false
                }

            } else {
                setTranscript("(No speech detected)");
                setStatus("listening_wake_word");
                isWakeWordActiveRef.current = false
                shouldContinueConversationRef.current = false
            }

        } catch (err: any) {
            console.error("[VoiceControl] Transcription failed:", err);
            setTranscript("Error: Server Failed");
            setStatus("listening_wake_word");
            setConversationHistory([])
            isWakeWordActiveRef.current = false
            shouldContinueConversationRef.current = false
        }
    }

    // -- UI RENDER --

    if (errorMessage) return null;

    // Show indicator if active or we have a transcript
    const isActive = status !== "idle" && status !== "listening_wake_word";
    const showTranscript = !!transcript;

    if (!isActive && !showTranscript) return null;

    return (
        <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">

            {/* Combined Status & Transcript Pill */}
            {(isActive || transcript) && (
                <div className="pointer-events-auto flex items-center gap-4 rounded-3xl bg-zinc-900/95 px-5 py-2.5 text-white backdrop-blur-md shadow-xl border border-white/10 transition-all animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* Status Indicators */}
                    {status === "listening_speech" && (
                        <div className="flex items-center gap-2 min-w-fit">
                            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            <span className="text-xs font-semibold tracking-wide uppercase text-red-100/90">Listening</span>
                        </div>
                    )}

                    {status === "transcribing" && (
                        <div className="flex items-center gap-2 min-w-fit">
                            <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/20 border-t-white" />
                            <span className="text-xs font-semibold tracking-wide uppercase text-white/90">Thinking</span>
                        </div>
                    )}

                    {status === "listening_wake_word" && transcript && (
                        <div className="flex items-center gap-2 min-w-fit">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                    )}

                    {/* Divider if we have both status and text */}
                    {isActive && transcript && <div className="h-4 w-[1px] bg-white/10" />}

                    {/* Transcript Text */}
                    {transcript && (
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-medium max-w-lg text-zinc-100 text-left">
                                "{transcript}"
                            </p>
                            <button
                                onClick={() => setTranscript(null)}
                                className="ml-1 rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
