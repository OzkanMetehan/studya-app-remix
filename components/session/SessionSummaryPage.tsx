import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Save, FileText, X, Trash2, Plus, Feather, Star, Check } from 'lucide-react';
import { SessionResult, TopicStat, UserModel } from '../../types';

interface Props {
  user: UserModel;
  result: SessionResult;
  onHome: (finalResult: SessionResult) => void;
}

interface TopicInput {
  q: string;
  c: string;
  w: string;
  e: string;
}

const SessionSummaryPage: React.FC<Props> = ({ user, result, onHome }) => {
  const isMock = result.config.isMockTest;
  const isLecture = result.config.sessionType === 'lecture';
  const examType = result.config.examType;

  const [isNotAnnounced, setIsNotAnnounced] = useState(false);

  // --- Lecture Mode State ---
  const [understanding, setUnderstanding] = useState(3);
  const [focus, setFocus] = useState(3);
  const [isFinished, setIsFinished] = useState(false);

  // Determine Topics and Defaults based on User Target + Exam Type
  const { topics, defaults } = useMemo(() => {
      let topicList: string[] = [];
      let defaultCounts: Record<string, number> = {};

      if (isMock) {
          if (examType === 'TYT') {
              topicList = ['Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
              defaultCounts = {
                  'Türkçe': 40, 'Tarih': 5, 'Coğrafya': 5, 'Felsefe': 5, 'Din Kültürü': 5,
                  'Matematik': 40, 'Fizik': 7, 'Kimya': 7, 'Biyoloji': 6
              };
          } else if (examType === 'AYT') {
              const targets = user.targetExams || [];
              const uniqueTopics = new Set<string>();
              
              const addTopics = (subjects: string[], counts: Record<string, number>) => {
                  subjects.forEach(sub => {
                      if (!uniqueTopics.has(sub)) {
                          uniqueTopics.add(sub);
                          defaultCounts[sub] = counts[sub];
                      }
                  });
              };

              const isSAY = targets.includes('AYT-SAY');
              const isEA = targets.includes('AYT-EA');
              const isSOZ = targets.includes('AYT-SOZ') || targets.includes('AYT-SÖZ');

              if (isSAY) {
                  addTopics(
                      ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'], 
                      { 'Matematik': 40, 'Fizik': 14, 'Kimya': 13, 'Biyoloji': 13 }
                  );
              }
              
              if (isEA) {
                  addTopics(
                      ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'],
                      { 'Matematik': 40, 'Edebiyat': 24, 'Tarih-1': 10, 'Coğrafya-1': 6 }
                  );
              }

              if (isSOZ) {
                  addTopics(
                      ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe', 'Din Kültürü'],
                      { 'Edebiyat': 24, 'Tarih-1': 10, 'Coğrafya-1': 6, 'Tarih-2': 11, 'Coğrafya-2': 11, 'Felsefe': 12, 'Din Kültürü': 6 }
                  );
              }

              topicList = Array.from(uniqueTopics);

              if (topicList.length === 0) {
                  topicList = ['Matematik', 'Fen Bilimleri', 'Türk Dili ve Edebiyatı', 'Sosyal Bilimler-1', 'Sosyal Bilimler-2'];
                  defaultCounts = {}; 
              }
          } else if (examType === 'YDT') {
              topicList = ['İngilizce'];
              defaultCounts = { 'İngilizce': 80 };
          }
      } 
      
      if (topicList.length === 0) {
          topicList = result.config.activeTopics && result.config.activeTopics.length > 0 
            ? result.config.activeTopics 
            : [result.config.topic];
      }

      return { topics: topicList, defaults: defaultCounts };
  }, [result.config, user.targetExams]);

  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const currentTopic = topics[currentTopicIndex];

  const [topicData, setTopicData] = useState<Record<string, TopicInput>>(() => {
      const initial: Record<string, TopicInput> = {};
      
      topics.forEach(t => {
          const defQ = defaults[t];
          initial[t] = { 
              q: defQ !== undefined ? defQ.toString() : '', 
              c: '', w: '', e: '' 
          };
      });
      return initial;
  });

  const [calc, setCalc] = useState({ net: 0, acc: 0, totalQ: 0 });
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<string[]>(result.notes || []);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingResult, setPendingResult] = useState<SessionResult | null>(null);

  const qRef = useRef<HTMLInputElement>(null);
  const cRef = useRef<HTMLInputElement>(null);
  const wRef = useRef<HTMLInputElement>(null);
  const eRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (error) {
          const timer = setTimeout(() => setError(null), 2000);
          return () => clearTimeout(timer);
      }
  }, [error]);

  useEffect(() => {
    let totalC = 0;
    let totalW = 0;
    let totalQ = 0;

    Object.values(topicData).forEach((d: TopicInput) => {
        const c = parseInt(d.c) || 0;
        const w = parseInt(d.w) || 0;
        const q = parseInt(d.q) || 0;
        totalC += c;
        totalW += w;
        totalQ += q;
    });
    
    const net = totalC - (totalW / 4);
    const totalSolved = totalC + totalW;
    const acc = totalSolved > 0 ? (totalC / totalSolved) * 100 : 0;

    setCalc({ net: parseFloat(net.toFixed(2)), acc: Math.round(acc), totalQ });
  }, [topicData]);

  const isStatInputDisabled = (topic: string) => {
      if (isNotAnnounced) return true;
      const rawQ = topicData[topic]?.q;
      const q = parseInt(rawQ);
      return isNaN(q) || q <= 0;
  };

  const handleInputChange = (topic: string, field: keyof TopicInput, value: string) => {
      const currentStats = { ...topicData[topic] };
      const q = parseInt(currentStats.q);
      const val = parseInt(value);
      
      if (!isNaN(q) && q > 0 && field !== 'q') {
          if (!isNaN(val) && val > q) {
              setError('Girilen değer soru sayısını geçemez.');
              return;
          }
      }
      currentStats[field] = value;
      setTopicData({ ...topicData, [topic]: currentStats });
      if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        if (!nextRef.current.disabled) nextRef.current.focus();
        else e.currentTarget.blur();
      } else {
        e.currentTarget.blur();
      }
    }
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

  const handleComplete = () => {
      if (isLecture) {
        const finalResult: SessionResult = {
            ...result,
            questions: 0, correct: 0, wrong: 0, empty: 0,
            net: 0, accuracy: 0,
            understandingScore: understanding,
            focusScore: focus,
            isFinished: isFinished,
            notes: notes
        };
        setPendingResult(finalResult);
        setShowConfirmation(true);
        return;
      }

      let grandTotalQ = 0;
      let grandTotalC = 0;
      let grandTotalW = 0;
      let grandTotalE = 0;
      const computedStats: TopicStat[] = [];

      for (const topic of topics) {
          const raw = topicData[topic];
          const q = parseInt(raw.q);
          if (isNaN(q) || q <= 0) {
              setError(`${topic} için soru sayısı girilmelidir.`);
              return;
          }

          if (isNotAnnounced) {
              grandTotalQ += q;
              computedStats.push({
                  topic, questions: q, correct: 0, wrong: 0, empty: 0,
                  durationSeconds: result.topicDurations ? result.topicDurations[topic] : 0
              });
              continue;
          }

          const hasC = raw.c !== '';
          const hasW = raw.w !== '';
          const hasE = raw.e !== '';
          let c = hasC ? parseInt(raw.c) : 0;
          let w = hasW ? parseInt(raw.w) : 0;
          let e = hasE ? parseInt(raw.e) : 0;

          if (hasC && hasW) e = q - c - w;
          else if (hasC && hasE) w = q - c - e;
          else if (hasW && hasE) c = q - w - e;
          else if (hasC) { w = 0; e = q - c; }
          else if (hasW) { c = 0; e = q - w; }
          else { c = 0; w = 0; e = q; }

          if (c < 0 || w < 0 || e < 0 || (c + w + e) !== q) {
              setError(`${topic}: Değerler toplamı soru sayısına (${q}) eşit olmalıdır.`);
              return;
          }

          grandTotalQ += q;
          grandTotalC += c;
          grandTotalW += w;
          grandTotalE += e;

          computedStats.push({
              topic, questions: q, correct: c, wrong: w, empty: e,
              durationSeconds: result.topicDurations ? result.topicDurations[topic] : 0
          });
      }

      if (!isNotAnnounced && grandTotalQ > 0 && (grandTotalC + grandTotalW === 0)) {
          setError('Oturumda en az 1 soru çözülmüş olmalıdır.');
          return;
      }

      const finalNet = isNotAnnounced ? 0 : grandTotalC - (grandTotalW / 4);
      const totalSolved = grandTotalC + grandTotalW;
      const finalAcc = totalSolved > 0 ? (grandTotalC / totalSolved) * 100 : 0;
      
      const finalResult: SessionResult = {
          ...result, questions: grandTotalQ, correct: grandTotalC, wrong: grandTotalW,
          empty: isNotAnnounced ? grandTotalQ : grandTotalE,
          net: parseFloat(finalNet.toFixed(2)),
          accuracy: isNotAnnounced ? 0 : Math.round(finalAcc),
          notes: notes, topicStats: computedStats, isPendingResult: isNotAnnounced
      };
      
      setPendingResult(finalResult);
      setShowConfirmation(true);
  };

  const handleConfirmSave = () => { if (pendingResult) onHome(pendingResult); };
  
  const formatTime = (ts: number) => {
    const h = Math.floor(ts / 3600);
    const m = Math.floor((ts % 3600) / 60);
    const s = ts % 60;
    return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
  };

  const handleNextTopic = () => { if (currentTopicIndex < topics.length - 1) setCurrentTopicIndex(prev => prev + 1); };
  const handlePrevTopic = () => { if (currentTopicIndex > 0) setCurrentTopicIndex(prev => prev - 1); };
  const isQuestionInputDisabled = (topic: string) => isMock && defaults[topic] !== undefined;

  // Pause Info String in Turkish
  const pauseInfo = useMemo(() => {
      if (!result.pauseCount || result.pauseCount === 0) return null;
      const mins = Math.ceil((result.pauseDurationSeconds || 0) / 60);
      return `Bu oturumu ${result.pauseCount} kez, toplam ${mins} dakika duraklattın.`;
  }, [result.pauseCount, result.pauseDurationSeconds]);

  return (
    <div className="h-full w-full font-sans relative flex flex-col items-center overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <img src="https://i.imgur.com/IuI5un9.png" alt="background" className="w-full h-full object-cover" />
      </div>
      
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-10 px-6">
        
        <div className="text-center text-white drop-shadow-md">
            <h1 className="text-base font-light tracking-widest uppercase mb-0.5">{result.config.subject}</h1>
            <div className="text-[9px] opacity-80 italic">
                {isLecture ? result.config.lectureSource : (topics.length > 1 ? `${topics.length} Konu` : topics[0])}
            </div>
            {result.customDate && <div className="mt-1 bg-red-500/80 px-2 py-0.5 rounded text-[7px] font-bold inline-block">DEV: {result.customDate}</div>}
        </div>

        <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-light tracking-widest text-white drop-shadow-md mb-3 italic uppercase">Oturum Bitti</h2>
            <div className="w-full py-2.5 text-center text-lg font-light text-white drop-shadow-sm mb-8 bg-white/10 backdrop-blur-sm rounded-xl">
                {formatTime(result.durationSeconds)}
            </div>

            <div className="bg-white/30 backdrop-blur-md rounded-[24px] p-5 shadow-2xl border border-white/20 w-full max-w-xs relative">
                {isMock && (
                    <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm p-2 rounded-xl mb-3 border border-white/10">
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-white drop-shadow-sm">Henüz açıklanmadı</span></div>
                        <button onClick={() => setIsNotAnnounced(!isNotAnnounced)} className={`w-8 h-5 rounded-full p-0.5 transition-colors ${isNotAnnounced ? 'bg-[#94AFA0]' : 'bg-gray-400'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isNotAnnounced ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                    </div>
                )}

                {isLecture ? (
                    <div className="space-y-5">
                         <div className="text-center border-b border-white/20 pb-2 mb-2">
                             <h3 className="font-bold text-white text-xs drop-shadow-sm truncate">{result.config.topic}</h3>
                         </div>

                         {/* Understanding Level */}
                         <div className="space-y-1.5">
                             <label className="text-[9px] font-bold text-white uppercase tracking-wider block text-center">Anlama Seviyesi</label>
                             <div className="flex justify-between px-1">
                                 {[1, 2, 3, 4, 5].map(v => (
                                     <button 
                                        key={v}
                                        onClick={() => setUnderstanding(v)}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${understanding === v ? 'bg-[#FCEBB6] shadow-md scale-110' : 'bg-white/20 text-white/60'}`}
                                     >
                                         <Star className={`w-4 h-4 ${understanding === v ? 'fill-[#5A4A42] text-[#5A4A42]' : 'currentColor'}`} />
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Focus Level */}
                         <div className="space-y-1.5">
                             <label className="text-[9px] font-bold text-white uppercase tracking-wider block text-center">Odaklanma Seviyesi</label>
                             <div className="flex justify-between px-1">
                                 {[1, 2, 3, 4, 5].map(v => (
                                     <button 
                                        key={v}
                                        onClick={() => setFocus(v)}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${focus === v ? 'bg-[#FCEBB6] shadow-md scale-110' : 'bg-white/20 text-white/60'}`}
                                     >
                                         <Feather className={`w-4 h-4 ${focus === v ? 'text-[#5A4A42]' : 'currentColor'}`} />
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Finished Toggle */}
                         <div className="flex items-center justify-between bg-white/10 p-2.5 rounded-2xl border border-white/10 mt-3">
                             <span className="text-[11px] font-bold text-white">Konu Bitti mi?</span>
                             <button 
                                onClick={() => setIsFinished(!isFinished)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-bold text-[9px] ${isFinished ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}`}
                             >
                                 {isFinished ? 'BİTTİ' : 'DEVAM EDECEK'}
                                 {isFinished && <Check className="w-2.5 h-2.5" />}
                             </button>
                         </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                            <button onClick={handlePrevTopic} className={`p-1 rounded-full ${currentTopicIndex === 0 ? 'opacity-0' : ''}`}><ChevronLeft className="w-4 h-4 text-white" /></button>
                            <h3 className="font-bold text-white text-xs text-center truncate flex-1 px-2 drop-shadow-sm">{currentTopic}</h3>
                            <button onClick={handleNextTopic} className={`p-1 rounded-full ${currentTopicIndex === topics.length - 1 ? 'opacity-0' : ''}`}><ChevronRight className="w-4 h-4 text-white" /></button>
                        </div>

                        <div className={`space-y-3 transition-opacity ${isNotAnnounced ? 'opacity-50' : 'opacity-100'}`}>
                            {[ {f:'q', l:'Soru', r:qRef, n:cRef, d:isQuestionInputDisabled(currentTopic)}, 
                            {f:'c', l:'Doğru', r:cRef, n:wRef, d:isStatInputDisabled(currentTopic)}, 
                            {f:'w', l:'Yanlış', r:wRef, n:eRef, d:isStatInputDisabled(currentTopic)}, 
                            {f:'e', l:'Boş', r:eRef, n:null, d:isStatInputDisabled(currentTopic)} ].map(row => (
                                <div key={row.f} className="flex items-center justify-between">
                                    <div className={`w-20 h-9 rounded-2xl transition-all shadow-sm ${row.d ? 'bg-gray-200/50' : 'bg-[#FCEBB6]'}`}>
                                        <input ref={row.r} type="number" value={topicData[currentTopic][row.f as keyof TopicInput]} 
                                            onChange={e => handleInputChange(currentTopic, row.f as keyof TopicInput, e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, row.n)} disabled={row.d}
                                            className="w-full h-full bg-transparent text-center font-bold outline-none text-sm text-black placeholder-black/30" />
                                    </div>
                                    <span className={`text-sm font-medium ${row.d ? 'text-gray-200' : 'text-gray-800'}`}>{row.l}</span>
                                </div>
                            ))}
                        </div>

                        {topics.length > 1 && (
                            <div className="flex justify-center gap-1.5 mt-6">
                                {topics.map((_, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentTopicIndex ? 'bg-white' : 'bg-white/20'}`}/>)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        <div className="w-full flex flex-col items-center">
            <div className="text-white text-sm font-medium text-center mb-1 min-h-[18px] drop-shadow-md">
                {isLecture ? (
                    <span className="italic opacity-80">Verimli bir konu çalışmasıydı!</span>
                ) : isNotAnnounced ? (
                    <span className="italic opacity-70">Sonuçlar sonra girilecek</span>
                ) : (
                    <>Toplamda <span className="font-bold bg-[#FCEBB6] text-black px-1.5 py-0.5 rounded-lg mx-1">{calc.net}</span> net ve <span className="font-bold bg-[#FCEBB6] text-black px-1.5 py-0.5 rounded-lg mx-1">%{calc.acc}</span> doğruluk</>
                )}
            </div>
            
            <div className="text-white text-[11px] italic opacity-80 text-center mb-8 min-h-[18px] max-w-xs drop-shadow-sm font-medium">
                {pauseInfo}
            </div>

            <div className="flex gap-4 w-full justify-between px-2">
                <button 
                    onClick={() => setShowNoteModal(true)} 
                    className="bg-[#FCEBB6] text-[#2D3A31] px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold shadow-lg text-xs active:scale-95 transition-transform"
                >
                    Not Al <Feather className="w-4 h-4 text-[#2D3A31]" />
                </button>
                <button 
                    onClick={handleComplete} 
                    className="bg-[#FCEBB6] text-[#2D3A31] px-5 py-2.5 rounded-2xl font-bold shadow-lg text-xs active:scale-95 transition-transform"
                >
                    Ana Sayfa
                </button>
            </div>
        </div>

        {showNoteModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#FFFBEB] rounded-3xl p-5 shadow-2xl w-full max-w-xs flex flex-col max-h-[80%]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-[#5A4A42] flex items-center gap-2"><FileText className="w-4 h-4" /> Notlar</h2>
                        <button onClick={() => setShowNoteModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar mb-4 space-y-2 min-h-[80px]">
                        {notes.map((note, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 flex justify-between items-start">
                                <p className="text-[10px] text-[#3D3D3D] flex-1 mr-2 break-words font-medium">{note}</p>
                                <button onClick={() => handleDeleteNote(idx)}><Trash2 className="w-3 h-3 text-gray-300 hover:text-red-500" /></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={currentNote} onChange={e => setCurrentNote(e.target.value)} placeholder="Yeni not..." className="flex-1 bg-white rounded-lg px-2 text-xs h-8 border border-gray-200 outline-none text-[#3D3D3D] font-medium" onKeyDown={e => e.key === 'Enter' && handleAddNote()}/>
                        <button onClick={handleAddNote} className="bg-[#2D3A31] text-white px-3 rounded-lg"><Plus className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        )}

        {showConfirmation && pendingResult && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-[40px] p-8 shadow-2xl w-full max-w-sm flex flex-col items-center">
                    
                    <div className="w-16 h-16 bg-[#FDE8A8] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <Save className="w-8 h-8 text-[#5A4A42]" />
                    </div>

                    <h2 className="text-2xl font-bold text-[#2D3A31] mb-6">Oturumu Kaydet</h2>
                    
                    {!isLecture && (
                        <div className="w-full bg-white border border-gray-50 rounded-2xl p-4 mb-6 shadow-sm">
                            <div className="grid grid-cols-4 gap-0">
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold text-gray-400 mb-1">Soru</span>
                                    <span className="text-xl font-extrabold text-[#5A4A42]">{pendingResult.questions}</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-100">
                                    <span className="text-xs font-bold text-green-500 mb-1">Doğru</span>
                                    <span className="text-xl font-extrabold text-green-500">{isNotAnnounced ? '-' : pendingResult.correct}</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-100">
                                    <span className="text-xs font-bold text-red-500 mb-1">Yanlış</span>
                                    <span className="text-xl font-extrabold text-red-500">{isNotAnnounced ? '-' : pendingResult.wrong}</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 mb-1">Boş</span>
                                    <span className="text-xl font-extrabold text-gray-400">{isNotAnnounced ? pendingResult.questions : pendingResult.empty}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLecture && (
                         <div className="w-full bg-white border border-gray-50 rounded-2xl p-4 mb-6 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Anlama</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <Star key={v} className={`w-3 h-3 ${v <= understanding ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-xs font-bold text-gray-400 uppercase">Odak</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <Star key={v} className={`w-3 h-3 ${v <= focus ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                            </div>
                         </div>
                    )}

                    <p className="text-sm text-[#5A4A42] font-medium text-center leading-relaxed mb-8 px-4 opacity-90">
                        Oturum verilerini kaydetmek ve ana sayfaya dönmek istediğinize emin misiniz?
                    </p>

                    <div className="flex gap-4 w-full">
                        <button 
                            onClick={() => setShowConfirmation(false)} 
                            className="flex-1 py-4 rounded-2xl border border-gray-200 font-extrabold text-gray-500 text-sm hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleConfirmSave} 
                            className="flex-1 py-4 bg-[#2D3A31] text-white rounded-2xl font-extrabold text-sm hover:bg-[#3D4A41] transition-all shadow-md active:scale-95"
                        >
                            Evet, Kaydet
                        </button>
                    </div>
                </div>
            </div>
        )}

        {error && (
            <div className="fixed top-20 inset-x-0 mx-auto bg-red-100 text-red-600 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 z-[60] w-max max-w-[90%] border border-red-200">
                <AlertCircle className="w-4 h-4" /><span className="text-[10px] font-bold">{error}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SessionSummaryPage;