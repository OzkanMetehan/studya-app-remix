
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Coffee, Feather, Zap, FastForward, Calendar, Bell, AlertTriangle, X, Trash2, FileText, ChevronDown } from 'lucide-react';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { MOTIVATIONAL_QUOTES, SESSION_TOPICS, TYT_TOPICS, AYT_TOPICS, YDT_TOPICS } from '../../constants';
import { SessionConfig, SessionResult, Book } from '../../types';
import { bookService } from '../../services/bookService';

interface Props {
  config: SessionConfig;
  onEndSession: (result: SessionResult) => void;
  isDevMode: boolean;
}

const ActiveSessionPage: React.FC<Props> = ({ config, onEndSession, isDevMode }) => {
  const [status, setStatus] = useState<'running' | 'paused' | 'break'>('running');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [totalBreakSeconds, setTotalBreakSeconds] = useState(0); // Track accumulated break time
  const [pauseCount, setPauseCount] = useState(0); // Track number of pauses
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  
  // Topic Management
  const [activeTopics, setActiveTopics] = useState<string[]>([config.topic]);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  
  // Topic Duration Tracking (Track time spent on the current topic)
  const [currentTopic, setCurrentTopic] = useState<string>(config.topic);
  const [topicDurations, setTopicDurations] = useState<Record<string, number>>({ [config.topic]: 0 });

  // Current Book for topic filtering
  const [currentBook, setCurrentBook] = useState<Book | undefined>(undefined);

  // Motivational Preference State
  const [showQuote, setShowQuote] = useState(true);

  // Controls Visibility (Pause Button)
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Break Reminder State
  const [secondsSinceLastBreak, setSecondsSinceLastBreak] = useState(0);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const hasShownBreakReminderRef = useRef(false);

  // Inactivity Check State
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  // Time Up / Overtime State
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  
  // Note taking
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);

  // Dev Tools State
  const [showDevTools, setShowDevTools] = useState(false);
  const [devDate, setDevDate] = useState<string>(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // --- REFS FOR STABLE ACCESS IN TIMERS & BACKGROUND ---
  const elapsedSecondsRef = useRef(0);
  const totalBreakSecondsRef = useRef(0);
  const pauseCountRef = useRef(0);
  const topicDurationsRef = useRef<Record<string, number>>({});
  const notesRef = useRef<string[]>([]);
  const activeTopicsRef = useRef<string[]>([]);

  // Sync state to refs
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  useEffect(() => { totalBreakSecondsRef.current = totalBreakSeconds; }, [totalBreakSeconds]);
  useEffect(() => { pauseCountRef.current = pauseCount; }, [pauseCount]);
  useEffect(() => { topicDurationsRef.current = topicDurations; }, [topicDurations]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { activeTopicsRef.current = activeTopics; }, [activeTopics]);

  // Total duration in seconds (for Mock tests or Fixed Duration sessions)
  const totalDurationSeconds = config.durationMinutes * 60;
  const isCountdown = config.isMockTest || (!config.isFreeMode && config.durationMinutes > 0);

  useEffect(() => {
      const savedMotiv = localStorage.getItem('studya_pref_motivational');
      if (savedMotiv === 'false') {
          setShowQuote(false);
      }
  }, []);

  useEffect(() => {
      if (config.bookId) {
          const b = bookService.getBooks().find(book => book.id === config.bookId);
          setCurrentBook(b);
      }
  }, [config.bookId]);

  // --- NATIVE WAKE LOCK IMPLEMENTATION ---
  useEffect(() => {
    const manageWakeLock = async () => {
        if (status === 'running' || status === 'break') {
            try {
                await KeepAwake.keepAwake();
            } catch (err: any) {
                // Gracefully handle permission errors common in web previews or restrictive webviews
                if (err?.message?.includes('disallowed by permissions policy')) {
                    console.debug('Wake Lock skipped (permissions policy)');
                } else {
                    console.warn('KeepAwake failed:', err);
                }
            }
        } else {
            try {
                await KeepAwake.allowSleep();
            } catch (err) {
                // Ignore errors on allowSleep, often harmless if no lock was active
            }
        }
    };

    manageWakeLock();

    // Cleanup on unmount
    return () => {
        KeepAwake.allowSleep().catch(() => {});
    };
  }, [status]);

  const resetIdleTimer = () => {
      setIsControlsVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (status === 'running') {
        idleTimerRef.current = setTimeout(() => setIsControlsVisible(false), 5000);
      }
  };

  useEffect(() => {
      resetIdleTimer();
      const handleInteraction = () => resetIdleTimer();
      window.addEventListener('touchstart', handleInteraction);
      window.addEventListener('click', handleInteraction);
      window.addEventListener('mousemove', handleInteraction);

      return () => {
          window.removeEventListener('touchstart', handleInteraction);
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('mousemove', handleInteraction);
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
  }, [status]);

  // Stable End Handler using Refs (Safe for Intervals)
  const handleEnd = () => {
    const result: SessionResult = {
        durationSeconds: elapsedSecondsRef.current,
        config: {
            ...config,
            activeTopics: activeTopicsRef.current
        },
        questions: 0,
        correct: 0,
        wrong: 0,
        empty: 0,
        net: 0,
        accuracy: 0,
        customDate: isDevMode ? devDate : undefined,
        notes: notesRef.current,
        topicDurations: topicDurationsRef.current,
        pauseCount: pauseCountRef.current,
        pauseDurationSeconds: totalBreakSecondsRef.current
    };
    onEndSession(result);
  };

  // --- ROBUST TIMER LOGIC WITH DRIFT CORRECTION ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let lastTick = Date.now();

    if (status === 'running') {
      lastTick = Date.now();
      
      interval = setInterval(() => {
        const now = Date.now();
        let delta = 0;
        
        if (speedMultiplier === 1) {
            const diff = now - lastTick;
            // Only update if at least 1 second passed (handles typical throttling)
            if (diff >= 1000) {
                delta = Math.floor(diff / 1000);
                lastTick += delta * 1000;
            }
        } else {
            delta = 1; // Dev Mode fast forward
        }

        if (delta > 0) {
            setElapsedSeconds(prev => prev + delta);
            setSecondsSinceLastBreak(prev => prev + delta);
            
            setTopicDurations(prev => ({
                 ...prev,
                 [currentTopic]: (prev[currentTopic] || 0) + delta
            }));
        }
      }, 1000 / speedMultiplier);

    } else if (status === 'break') {
      lastTick = Date.now();
      
      interval = setInterval(() => {
        const now = Date.now();
        let delta = 0;
        
        if (speedMultiplier === 1) {
            const diff = now - lastTick;
            if (diff >= 1000) {
                delta = Math.floor(diff / 1000);
                lastTick += delta * 1000;
            }
        } else {
            delta = 1;
        }

        if (delta > 0) {
            setBreakSeconds(prev => prev + delta);
            setTotalBreakSeconds(prev => prev + delta);
            
            const nextBreak = breakSeconds + delta;
            const FIFTEEN_MINS = 15 * 60;
            const SIXTEEN_MINS = 16 * 60;

            if (breakSeconds < FIFTEEN_MINS && nextBreak >= FIFTEEN_MINS) {
                setShowInactivityModal(true);
            }
            if (breakSeconds < SIXTEEN_MINS && nextBreak >= SIXTEEN_MINS) {
                handleEnd(); 
            }
        }
      }, 1000 / speedMultiplier);
    }

    return () => clearInterval(interval);
  }, [status, speedMultiplier, currentTopic]); 

  // Watch for Timeout (Mock Test or Fixed Duration)
  useEffect(() => {
      if (isCountdown && elapsedSeconds >= totalDurationSeconds && !isOvertime && !showTimeUpModal && status === 'running') {
          setStatus('paused');
          setShowTimeUpModal(true);
      }
  }, [elapsedSeconds, isCountdown, totalDurationSeconds, isOvertime, showTimeUpModal, status]);

  // Break Reminder Check
  useEffect(() => {
     if (status === 'running' && config.breakReminderInterval && config.breakReminderInterval > 0) {
         const threshold = config.breakReminderInterval * 60;
         if (secondsSinceLastBreak >= threshold && !hasShownBreakReminderRef.current) {
             setShowBreakReminder(true);
             hasShownBreakReminderRef.current = true;
         }
     }
  }, [secondsSinceLastBreak, config.breakReminderInterval, status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
       return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
  };

  const displayTime = () => {
      if (isCountdown) {
          if (elapsedSeconds >= totalDurationSeconds) {
              const extra = elapsedSeconds - totalDurationSeconds;
              return `+${formatTime(extra)}`;
          }
          const remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);
          return formatTime(remaining);
      }
      return formatTime(elapsedSeconds);
  };

  const handleTakeBreak = () => {
      if (config.isMockTest && !config.allowBreaks) return;

      setStatus('break');
      setPauseCount(prev => prev + 1);
      setSecondsSinceLastBreak(0); 
      hasShownBreakReminderRef.current = false;
      setShowBreakReminder(false);
      setBreakSeconds(0); 
      setShowInactivityModal(false);
      setIsControlsVisible(true);
  };

  const handleDismissReminder = () => {
      setShowBreakReminder(false);
  };

  const handleResumeFromBreak = () => {
      setStatus('running');
      setShowInactivityModal(false);
      resetIdleTimer();
  };
  
  const handleTimeUpContinue = () => {
      setIsOvertime(true);
      setShowTimeUpModal(false);
      setStatus('running');
  };

  const handleOpenAddTopic = () => {
      setStatus('paused');
      setShowAddTopicModal(true);
  };

  const handleAddTopic = (newTopic: string) => {
      if (!activeTopics.includes(newTopic)) {
          setActiveTopics([...activeTopics, newTopic]);
          setTopicDurations(prev => ({ ...prev, [newTopic]: 0 }));
      }
      setCurrentTopic(newTopic);
      setShowAddTopicModal(false);
      setStatus('running');
  };

  const handleCancelAddTopic = () => {
      setShowAddTopicModal(false);
      setStatus('running');
  };

  const handleAddNote = () => {
      if (currentNote.trim()) {
          setNotes([...notes, currentNote]);
          setCurrentNote('');
      }
  };

  const handleDeleteNote = (index: number) => {
      const newNotes = [...notes];
      newNotes.splice(index, 1);
      setNotes(newNotes);
  };

  const getAvailableTopics = () => {
      if (currentBook) {
          const sub = currentBook.category;
          const types = currentBook.examTypes || [];
          let list: string[] = [];
          
          if (types.includes('TYT')) list = list.concat(TYT_TOPICS[sub] || []);
          if (types.includes('AYT')) list = list.concat(AYT_TOPICS[sub] || []);
          if (types.includes('YDT')) list = list.concat(YDT_TOPICS[sub] || []);
          
          if (list.length === 0) return SESSION_TOPICS[sub] || [];
          return [...new Set(list)];
      }
      return SESSION_TOPICS[config.subject] || [];
  };

  const handleDevFastForward = (e: React.MouseEvent) => {
      e.stopPropagation();
      const isFixedDuration = !config.isFreeMode && config.durationMinutes > 0;
      const fullDuration = isFixedDuration ? config.durationMinutes * 60 : elapsedSeconds;

      const result: SessionResult = {
        durationSeconds: fullDuration,
        config: { ...config, activeTopics },
        questions: 0, correct: 0, wrong: 0, empty: 0, net: 0, accuracy: 0,
        customDate: devDate,
        notes: notes,
        topicDurations: topicDurations,
        pauseCount: pauseCount,
        pauseDurationSeconds: totalBreakSeconds
    };
    onEndSession(result);
  };

  const renderContent = () => {
    if (status === 'break') {
        return (
            <div className="flex flex-col items-center justify-between h-full pt-32 pb-16 relative z-10 animate-fadeIn">
                <div className="text-center text-gray-700">
                    <h1 className="text-2xl font-light mb-1 italic tracking-widest text-[#5A4A42]">MOLADASIN</h1>
                    <button 
                        onClick={handleEnd}
                        className="bg-[#E74C3C] text-white px-5 py-1 rounded-full text-[11px] font-bold shadow-md active:scale-95 transition-transform mt-2"
                    >
                        OTURUMU BİTİR
                    </button>
                </div>

                <div className="flex flex-col items-center mt-8">
                    <button 
                        onClick={handleResumeFromBreak}
                        className="w-40 h-40 rounded-full bg-[#FCEBB6] shadow-[0_0_30px_rgba(253,235,168,0.6)] flex items-center justify-center mb-10 hover:scale-105 transition-transform active:scale-95"
                    >
                        <div className="w-14 h-14 bg-white/50 rounded-full flex items-center justify-center">
                           <Play className="w-7 h-7 text-[#5A4A42] ml-1 fill-[#5A4A42]" />
                        </div>
                    </button>

                    <p className="font-handwriting text-xl text-white drop-shadow-md text-center max-w-xs leading-relaxed font-serif italic">
                       Kahveni tazelemeye <br/> ne dersin? <Coffee className="inline w-5 h-5 ml-1 mb-1 text-gray-700"/>
                    </p>
                </div>

                <div className="text-white text-2xl font-light tracking-widest drop-shadow-sm opacity-90">
                    {formatTime(breakSeconds)}
                </div>

                <button 
                    onClick={() => setShowNoteModal(true)}
                    className="bg-[#FCEBB6] text-[#5A4A42] px-6 py-2.5 rounded-full flex items-center gap-2 font-medium shadow-lg hover:bg-[#F2D680] transition-colors"
                >
                    Notlar <span className="bg-[#5A4A42] text-white text-[9px] px-1.5 py-0.5 rounded-full">{notes.length}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-between h-full py-20 relative z-10">
            {/* Header */}
            <div className="text-center text-white drop-shadow-md relative w-full px-6">
                {config.isMockTest ? (
                    <div className="flex justify-between items-start w-full">
                         <div className="text-left">
                             <h1 className="text-lg font-bold tracking-wider uppercase mb-0.5">
                                 {config.examType} Denemesi
                             </h1>
                             <span className="text-xs opacity-90 italic block">
                                 {config.publisher || 'Genel Yayın'}
                             </span>
                         </div>
                         <button 
                             onClick={handleEnd}
                             className="bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                         >
                             Bitir
                         </button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-xl font-light tracking-widest uppercase mb-1">
                            {config.subject} OTURUMU
                        </h1>
                        <div className="flex flex-col items-center justify-center gap-1 text-xs opacity-90">
                            <span className="italic flex items-center gap-2 flex-wrap justify-center">
                                {activeTopics.join(', ')}
                            </span>
                            <button 
                                onClick={handleOpenAddTopic}
                                className="mt-1 bg-[#FCEBB6]/20 hover:bg-[#FCEBB6]/40 rounded-full p-0.5 transition-colors"
                                title="Konu Ekle"
                            >
                                <Plus className="w-3.5 h-3.5 text-[#FCEBB6]" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Timer Area */}
            <div className="flex flex-col items-center justify-center flex-1 w-full gap-8">
                <div className={`text-3xl font-light tracking-widest drop-shadow-md transition-all duration-500 font-mono ${isOvertime ? 'text-orange-200 animate-pulse' : 'text-white'}`}>
                    {displayTime()}
                </div>

                {(!config.isMockTest || config.allowBreaks) && (
                    <div className={`transition-opacity duration-500 ${isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <button 
                            onClick={handleTakeBreak}
                            className="w-48 h-48 rounded-full bg-[#FCEBB6]/90 shadow-[0_0_40px_rgba(253,235,168,0.4)] flex items-center justify-center backdrop-blur-sm hover:bg-[#FCEBB6] transition-colors active:scale-95"
                        >
                             <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center gap-1.5">
                                <div className="w-1.5 h-7 bg-[#5A4A42] rounded-full" />
                                <div className="w-1.5 h-7 bg-[#5A4A42] rounded-full" />
                            </div>
                        </button>
                    </div>
                )}
                
                {config.isMockTest && !config.allowBreaks && (
                     <div className="w-48 h-48 rounded-full border-4 border-white/20 flex items-center justify-center animate-pulse">
                         <span className="text-white/60 font-bold text-xs uppercase tracking-widest">Mola Yok</span>
                     </div>
                )}

                {showQuote && (
                    <div className="px-6 min-h-[50px] flex items-center justify-center">
                        <p className="font-serif text-lg text-white drop-shadow-lg text-center max-w-sm italic leading-relaxed opacity-90">
                            "{quote}"
                        </p>
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => setShowNoteModal(true)}
                className="bg-[#FCEBB6] text-[#5A4A42] px-6 py-2.5 rounded-full flex items-center gap-2 font-medium shadow-lg hover:bg-[#F2D680] transition-colors mt-4"
            >
                Notlar <span className="bg-[#5A4A42] text-white text-[9px] px-1.5 py-0.5 rounded-full">{notes.length}</span>
            </button>
        </div>
    );
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <img src="https://i.imgur.com/IuI5un9.png" alt="background" className="w-full h-full object-cover" />
      </div>

      {isDevMode && (
        <div className="absolute top-0 right-0 w-full z-50 pointer-events-none">
            <button 
                onClick={() => setShowDevTools(!showDevTools)}
                className={`absolute right-4 top-4 p-2 rounded-full transition-all pointer-events-auto ${showDevTools ? 'bg-red-500 text-white' : 'bg-white/20 text-white/50'}`}
            >
                <Zap className="w-4 h-4" fill={showDevTools ? "currentColor" : "none"} />
            </button>
            {showDevTools && (
                 <div className="absolute top-16 right-4 flex flex-col items-end gap-2 animate-fadeIn pointer-events-auto">
                    <div className="bg-white/90 p-2 rounded-lg text-xs text-gray-800 shadow-xl flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <input 
                            type="date" 
                            value={devDate}
                            onChange={(e) => setDevDate(e.target.value)}
                            className="bg-transparent outline-none font-bold"
                        />
                    </div>
                    <div className="bg-white/90 p-2 rounded-lg flex gap-1 shadow-xl">
                        {[1, 3, 5, 10].map(s => (
                            <button 
                                key={s}
                                onClick={() => setSpeedMultiplier(s)}
                                className={`px-2 py-1 text-xs font-bold rounded ${speedMultiplier === s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                    <button 
                        type="button"
                        onClick={handleDevFastForward}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-bold shadow-lg animate-pulse text-xs cursor-pointer"
                    >
                        <FastForward className="w-3 h-3 fill-white" />
                        Hemen Bitir (Dev)
                    </button>
                 </div>
            )}
        </div>
      )}

      {renderContent()}

      {/* Modals */}
      {showNoteModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#FFFBEB] rounded-3xl p-6 shadow-2xl w-full max-w-sm relative flex flex-col max-h-[80%]">
                    <button onClick={() => setShowNoteModal(false)} className="absolute top-4 right-4 text-gray-400">
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold text-[#5A4A42] mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Notlar
                    </h2>
                    <div className="flex-1 overflow-y-auto no-scrollbar mb-4 space-y-3 min-h-[100px]">
                        {notes.length > 0 ? (
                            notes.map((note, idx) => (
                                <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-start group">
                                    <p className="text-sm text-[#3D3D3D] flex-1 mr-2 break-words min-w-0">{note}</p>
                                    <button onClick={() => handleDeleteNote(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <FileText className="w-12 h-12 mb-2 stroke-1" />
                                <span className="text-sm">Henüz not eklenmedi</span>
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-xl p-2 shadow-inner border border-gray-100 flex items-center gap-2">
                        <input
                            type="text" 
                            value={currentNote}
                            onChange={(e) => setCurrentNote(e.target.value)}
                            placeholder="Yeni not ekle..."
                            className="flex-1 bg-transparent px-2 text-[#3D3D3D] outline-none text-sm h-10"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        />
                        <button onClick={handleAddNote} disabled={!currentNote.trim()} className="bg-[#2D3A31] text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3D4A41]"><Plus className="w-5 h-5" /></button>
                    </div>
                    <div className="mt-4 text-center">
                         <button onClick={() => setShowNoteModal(false)} className="text-[#5A4A42] font-bold text-sm hover:underline">Kapat</button>
                    </div>
                </div>
            </div>
        )}

        {showAddTopicModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#FFFBEB] rounded-3xl p-6 shadow-2xl w-full max-w-sm relative flex flex-col max-h-[70%]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-[#5A4A42]">Konu Ekle</h2>
                        <button onClick={handleCancelAddTopic} className="text-gray-400"><X className="w-6 h-6" /></button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{config.subject} dersi için eklemek istediğiniz konuyu seçin.</p>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 max-h-60">
                        {getAvailableTopics()?.filter(t => !activeTopics.includes(t)).map(t => (
                                <button key={t} onClick={() => handleAddTopic(t)} className="w-full text-left px-4 py-3 rounded-xl bg-white text-[#3D3D3D] font-bold text-sm shadow-sm hover:bg-orange-50 border border-gray-100 transition-colors">{t}</button>
                            ))
                        }
                        {(!getAvailableTopics() || getAvailableTopics().filter(t => !activeTopics.includes(t)).length === 0) && (
                            <div className="text-center py-4 text-gray-400 text-sm">Eklenecek başka konu kalmadı.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {showBreakReminder && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-[#FDE8A8] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Bell className="w-8 h-8 text-[#5A4A42]" /></div>
                    <h2 className="text-2xl font-bold text-[#2D3A31] mb-2">Mola Zamanı!</h2>
                    <p className="text-gray-600 mb-6">{config.breakReminderInterval} dakika geçti. Kısa bir mola verip zihnini tazelemeye ne dersin?</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleDismissReminder} className="px-6 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Ertele</button>
                        <button onClick={handleTakeBreak} className="px-6 py-3 rounded-xl bg-[#2D3A31] text-white font-bold hover:bg-[#3D4A41]">Mola Ver</button>
                    </div>
                </div>
            </div>
        )}

        {showInactivityModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
                    <h2 className="text-2xl font-bold text-[#2D3A31] mb-2">Orada mısın?</h2>
                    <p className="text-gray-600 mb-6">15 dakikadır moladasın. 1 dakika içinde yanıt vermezsen oturum otomatik olarak sonlandırılacak.</p>
                    <div className="flex gap-3 justify-center flex-col">
                        <button onClick={handleResumeFromBreak} className="w-full px-6 py-3 rounded-xl bg-[#2D3A31] text-white font-bold hover:bg-[#3D4A41]">Çalışmaya Dön</button>
                        <button onClick={handleEnd} className="w-full px-6 py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50">Oturumu Sonlandır</button>
                    </div>
                </div>
            </div>
        )}
        
        {showTimeUpModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-[#FDE8A8] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Bell className="w-8 h-8 text-[#5A4A42]" /></div>
                    <h2 className="text-2xl font-bold text-[#2D3A31] mb-2">Süre Doldu!</h2>
                    <p className="text-gray-600 mb-6">Belirlenen süre tamamlandı. Çalışmaya devam etmek ister misin?</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleEnd} className="flex-1 px-4 py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors">Bitir</button>
                        <button onClick={handleTimeUpContinue} className="flex-1 px-4 py-3 rounded-xl bg-[#2D3A31] text-white font-bold hover:bg-[#3D4A41] transition-colors">Devam Et</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ActiveSessionPage;
