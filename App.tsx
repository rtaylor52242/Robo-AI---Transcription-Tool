import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { transcribeAudio, analyzeTextMetrics, WordMetrics } from './services/geminiService';

// --- Type Definitions ---
interface Session {
    id: string;
    name: string;
    text: string;
    date: string;
}

// Custom hook to manage state in localStorage
function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                return JSON.parse(item);
            }
            return initialValue instanceof Function ? initialValue() : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue instanceof Function ? initialValue() : initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}


// --- SVG Icons ---
const RecordIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <rect x="6" y="6" width="8" height="8" rx="1" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ClearIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

const LoadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M7 7l8.586-8.586a2 2 0 012.828 0l2.172 2.172a2 2 0 010 2.828L12 17H7v-5z"></path></svg>
);

const ShareIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0L8 6m4-4v12"></path></svg>
);

const SunIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
);

const MoonIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
);

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
);

const SaveIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);

const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
    <svg className={`w-6 h-6 transition-transform duration-300 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

const MetricsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
);

// --- Child Components ---
const MetricItem = ({ label, value }: { label: string; value: number }) => (
    <div className="flex flex-col p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{value}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    </div>
);


const SESSIONS_STORAGE_KEY = 'robo-ai-transcription-sessions';
const THEME_STORAGE_KEY = 'robo-ai-theme';

const languages = [
    { name: 'English' },
    { name: 'Spanish' },
    { name: 'French' },
    { name: 'German' },
    { name: 'Italian' },
    { name: 'Portuguese' },
    { name: 'Russian' },
    { name: 'Japanese' },
    { name: 'Korean' },
    { name: 'Chinese (Simplified)' },
    { name: 'Hindi' },
    { name: 'Arabic' },
];

const App: React.FC = () => {
    // Recording & Transcription State
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [transcribedText, setTranscribedText] = useState<string>('');
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [targetLanguage, setTargetLanguage] = useState<string>('English');
    
    // Session Management State (using localStorage custom hook)
    const [sessionName, setSessionName] = useState<string>('');
    const [savedSessions, setSavedSessions] = useLocalStorage<Session[]>(SESSIONS_STORAGE_KEY, []);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingSessionName, setEditingSessionName] = useState<string>('');

    // Metrics State
    const [metrics, setMetrics] = useState<WordMetrics | null>(null);
    const [isAnalyzingMetrics, setIsAnalyzingMetrics] = useState<boolean>(false);
    const [showMetrics, setShowMetrics] = useState<boolean>(false);

    // UI/UX State
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string>('');
    const [isSessionsExpanded, setIsSessionsExpanded] = useState<boolean>(true);
    const [theme, setTheme] = useLocalStorage<string>(THEME_STORAGE_KEY, () => 
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // --- Effects ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // --- Helper Functions ---
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                resolve(base64data);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const runMetricsAnalysis = useCallback(async (text: string) => {
        if (!text.trim()) {
            setMetrics(null);
            setShowMetrics(false);
            return;
        }
        setIsAnalyzingMetrics(true);
        setShowMetrics(true);
        try {
            const result = await analyzeTextMetrics(text);
            setMetrics(result);
        } catch (err) {
            console.error("Metrics analysis error:", err);
            setError("Failed to analyze text metrics.");
            setShowMetrics(false);
        } finally {
            setIsAnalyzingMetrics(false);
        }
    }, []);
    
    // --- Event Handlers ---
    const handleStartRecording = async () => {
        setError(null);
        setAudioBlob(null);
        setTranscribedText('');
        setSessionName('');
        setMetrics(null);
        setShowMetrics(false);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                const newAudioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                setAudioBlob(newAudioBlob);
                setAudioUrl(URL.createObjectURL(newAudioBlob));
                audioChunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            setError("Could not start recording. Please grant microphone permissions.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscribe = useCallback(async () => {
        if (!audioBlob) {
            setError("No audio recorded to transcribe.");
            return;
        }
        setIsTranscribing(true);
        setError(null);
        setTranscribedText('');
        setCopySuccess('');
        setMetrics(null);
        setShowMetrics(false);
        try {
            const base64Audio = await blobToBase64(audioBlob);
            const result = await transcribeAudio(base64Audio, audioBlob.type, targetLanguage);
            setTranscribedText(result);
            await runMetricsAnalysis(result);
        } catch (err) {
            console.error("Transcription error:", err);
            setError("Failed to transcribe audio. Please try again.");
        } finally {
            setIsTranscribing(false);
        }
    }, [audioBlob, runMetricsAnalysis, targetLanguage]);

    const handleCopyText = useCallback(() => {
        if (transcribedText) {
            navigator.clipboard.writeText(transcribedText).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                setCopySuccess('Failed');
                setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    }, [transcribedText]);

    const handleClearText = () => {
        setTranscribedText('');
        setCopySuccess('');
        setMetrics(null);
        setShowMetrics(false);
    };

    const handleSaveSession = () => {
        if (!transcribedText.trim()) {
            setError("There is no transcribed text to save.");
            return;
        }
        
        const finalSessionName = sessionName.trim();

        if (finalSessionName) {
            const isDuplicate = savedSessions.some(session => session.name === finalSessionName);
            if (isDuplicate) {
                setError(`A session named "${finalSessionName}" already exists. Please choose a different name.`);
                return;
            }
        }

        setError(null);
        const newSession: Session = {
            id: Date.now().toString(),
            name: finalSessionName || `Session ${new Date().toLocaleString()}`,
            text: transcribedText,
            date: new Date().toISOString(),
        };
        setSavedSessions(prev => [newSession, ...prev]);
        setSessionName('');
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl('');
        }
    };

    const handleLoadSession = (id: string) => {
        const sessionToLoad = savedSessions.find(s => s.id === id);
        if (sessionToLoad) {
            setTranscribedText(sessionToLoad.text);
            setSessionName(sessionToLoad.name);
            setAudioBlob(null);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl('');
            setError(null);
            setCopySuccess('');
            runMetricsAnalysis(sessionToLoad.text);
        }
    };

    const handleDeleteSession = (id: string) => {
        setSavedSessions(prev => prev.filter(s => s.id !== id));
    };

    const handleStartEditingSession = (session: Session) => {
        setEditingSessionId(session.id);
        setEditingSessionName(session.name);
        setError(null);
    };

    const handleCancelEditingSession = () => {
        setEditingSessionId(null);
        setEditingSessionName('');
    };

    const handleSaveSessionName = (id: string) => {
        const newName = editingSessionName.trim();
        if (!newName) {
            setError("Session name cannot be empty.");
            return;
        }

        const isDuplicate = savedSessions.some(session => session.id !== id && session.name === newName);
        if (isDuplicate) {
            setError(`A session named "${newName}" already exists. Please choose a different name.`);
            return;
        }

        setSavedSessions(prev =>
            prev.map(session =>
                session.id === id ? { ...session, name: newName } : session
            )
        );

        handleCancelEditingSession();
        setError(null);
    };


    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
    const handleShare = async (type: 'audio' | 'text') => {
        if (!navigator.share) {
            setError("Sharing is not supported on this browser.");
            setTimeout(() => setError(null), 3000);
            return;
        }

        const downloadAudioFallback = (message?: string) => {
            if (!audioBlob) return;
            setError(message || "Audio sharing not available, downloading file instead.");
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            setTimeout(() => setError(null), 5000);
        };

        if (type === 'audio') {
            if (!audioBlob) return;
            const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: audioBlob.type });

            if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
                try {
                    await navigator.share({
                        files: [audioFile],
                        title: 'Audio Recording',
                        text: 'Listen to my audio recording.',
                    });
                } catch (err) {
                    if (err instanceof Error && err.name !== 'AbortError') {
                        console.error("Error sharing audio:", err);
                        if (err.name === 'NotAllowedError') {
                            downloadAudioFallback("Sharing permission denied. Downloading file instead.");
                        } else {
                            downloadAudioFallback("Could not share audio. Downloading file instead.");
                        }
                    }
                }
            } else {
                downloadAudioFallback();
            }
        } else if (type === 'text') {
            if (!transcribedText) return;
            try {
                await navigator.share({
                    title: 'Transcription',
                    text: transcribedText,
                });
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error("Error sharing text:", err);
                    if (err.name === 'NotAllowedError') {
                        setError("Sharing permission denied. You can copy the text instead.");
                    } else {
                        setError("An error occurred while sharing text.");
                    }
                    setTimeout(() => setError(null), 4000);
                }
            }
        }
    };


    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-8">
                <header className="text-center relative">
                    <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                        Robo AI - Transcription Tool
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Record, Stop, and Transcribe with the power of AI.</p>
                    <button onClick={toggleTheme} title="Toggle Theme" className="absolute top-0 right-0 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors">
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                </header>

                <div className="space-y-2">
                    <label htmlFor="language-select" className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        Transcription Language
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select the language for the final transcription output.</p>
                    <select
                        id="language-select"
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        disabled={isRecording || isTranscribing}
                        className="w-full px-4 py-3 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
                        aria-label="Select transcription language"
                    >
                        {languages.map(lang => (
                            <option key={lang.name} value={lang.name}>{lang.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out w-full sm:w-auto text-white ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} focus:outline-none focus:ring-4 focus:ring-opacity-50`}>
                        {isRecording ? <><StopIcon /> Stop</> : <><RecordIcon /> Record</>}
                    </button>
                    <button onClick={handleTranscribe} disabled={!audioBlob || isRecording || isTranscribing} className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50">
                        {isTranscribing ? <><LoadingSpinner /> Transcribing...</> : 'Transcribe'}
                    </button>
                </div>
                
                {isRecording && <p className="text-center text-red-500 dark:text-red-400 animate-pulse">Recording in progress...</p>}
                {error && <p className="text-center text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}

                {audioUrl && !isRecording && (
                    <div className="my-4 space-y-3">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 text-center">Audio Playback</p>
                        <audio controls src={audioUrl} className="w-full" />
                        {navigator.share && (
                             <button onClick={() => handleShare('audio')} title="Share Audio" className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 mt-2 rounded-md font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors">
                                <ShareIcon /> Share Audio
                            </button>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <label htmlFor="transcription" className="text-lg font-semibold text-gray-700 dark:text-gray-300">Transcribed Text</label>
                         {transcribedText && (
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowMetrics(prev => !prev)} title="Show Metrics" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"><MetricsIcon /></button>
                                {navigator.share && (
                                    <button onClick={() => handleShare('text')} title="Share Text" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"><ShareIcon /></button>
                                )}
                                <button onClick={handleClearText} title="Clear Text" className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors"><ClearIcon /></button>
                                <button onClick={handleCopyText} title="Copy Text" className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                                    {copySuccess ? copySuccess : <CopyIcon />}
                                </button>
                            </div>
                        )}
                    </div>
                    <textarea id="transcription" value={transcribedText} onChange={(e) => setTranscribedText(e.target.value)} placeholder="Your transcribed text will appear here..." className="w-full h-48 p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"/>
                    
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showMetrics ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {isAnalyzingMetrics ? (
                            <div className="flex justify-center items-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing metrics...</span>
                            </div>
                        ) : metrics ? (() => {
                            const posData = [
                                { name: 'Verbs', value: metrics.verbCount },
                                { name: 'Nouns', value: metrics.nounCount },
                                { name: 'Adjectives', value: metrics.adjectiveCount },
                                { name: 'Conjunctions', value: metrics.conjunctionCount },
                            ].filter(item => item.value > 0);

                            const COLORS = ['#8884d8', '#82ca9d', '#FFBB28', '#FF8042', '#AF19FF'];
                           
                            const RADIAN = Math.PI / 180;
                            const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                if (percent < 0.05) return null; // Don't render label for small slices

                                return (
                                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                                        {`${(percent * 100).toFixed(0)}%`}
                                    </text>
                                );
                            };

                            return (
                                <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg space-y-6">
                                    <h3 className="text-md font-semibold text-center text-gray-700 dark:text-gray-300">Transcription Metrics</h3>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                                        <MetricItem label="Words" value={metrics.wordCount} />
                                        <MetricItem label="Characters" value={metrics.characterCount} />
                                        <MetricItem label="Profanity" value={metrics.profanityCount} />
                                    </div>

                                    {posData.length > 0 && (
                                        <div className="pt-4">
                                            <h4 className="text-sm font-semibold mb-2 text-center text-gray-600 dark:text-gray-400">Part-of-Speech Distribution</h4>
                                            <div style={{ width: '100%', height: 250 }}>
                                                <ResponsiveContainer>
                                                    <PieChart>
                                                        <Pie
                                                            data={posData}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={renderCustomizedLabel}
                                                            outerRadius={100}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            nameKey="name"
                                                        >
                                                            {posData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                                                borderColor: theme === 'dark' ? '#4B5563' : '#D1D5DB',
                                                                borderRadius: '0.5rem',
                                                            }}
                                                        />
                                                        <Legend iconSize={12} wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })() : null}
                    </div>
                </div>
                
                <div className="space-y-4 bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                    <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Enter session name to save..." className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    <button onClick={handleSaveSession} disabled={!transcribedText.trim()} className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500">
                        Save Session
                    </button>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={() => setIsSessionsExpanded(prev => !prev)}
                        className="w-full flex justify-between items-center text-lg font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-2 focus:outline-none"
                        aria-expanded={isSessionsExpanded}
                        aria-controls="sessions-list-container"
                    >
                        <span>Saved Sessions</span>
                        <ChevronDownIcon className={isSessionsExpanded ? 'rotate-0' : '-rotate-90'} />
                    </button>
                    <div
                        id="sessions-list-container"
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isSessionsExpanded ? 'max-h-96' : 'max-h-0'}`}
                    >
                        {savedSessions.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 py-2">
                                {savedSessions.map(session => (
                                    <div key={session.id} className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg flex justify-between items-center gap-2">
                                        {editingSessionId === session.id ? (
                                            <input
                                                type="text"
                                                value={editingSessionName}
                                                onChange={(e) => setEditingSessionName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveSessionName(session.id);
                                                    if (e.key === 'Escape') handleCancelEditingSession();
                                                }}
                                                className="flex-grow p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-semibold text-purple-600 dark:text-purple-300 truncate" title={session.name}>{session.name}</p>
                                                <p className="text-xs text-gray-500">{new Date(session.date).toLocaleString()}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-2 flex-shrink-0">
                                            {editingSessionId === session.id ? (
                                                <>
                                                    <button onClick={() => handleSaveSessionName(session.id)} title="Save Name" className="p-2 text-green-500 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><SaveIcon /></button>
                                                    <button onClick={handleCancelEditingSession} title="Cancel" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><ClearIcon /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleLoadSession(session.id)} title="Load Session" className="p-2 text-blue-500 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><LoadIcon /></button>
                                                    <button onClick={() => handleStartEditingSession(session)} title="Edit Name" className="p-2 text-yellow-600 dark:text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><EditIcon /></button>
                                                    <button onClick={() => handleDeleteSession(session.id)} title="Delete Session" className="p-2 text-red-500 dark:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><DeleteIcon /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No sessions saved yet.</p>
                        )}
                    </div>
                </div>
            </div>
            <footer className="text-center mt-8 text-gray-600 dark:text-gray-500 text-sm">
                <p>Powered by Gemini API</p>
            </footer>
        </div>
    );
};

export default App;