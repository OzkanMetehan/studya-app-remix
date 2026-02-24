
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Save, X, Check, ChevronLeft, ChevronRight, Clock, BookOpen, Scroll, AlertCircle } from 'lucide-react';
import { SESSION_SUBJECTS, SESSION_TOPICS } from '../../constants';
import { SessionResult, TopicStat, UserModel } from '../../types';

interface Props {
  user: UserModel;
  date: Date;
  onClose: () => void;
  onSave: (result: SessionResult) => void;
  onCycle?: (delta: number) => void;
}

// YKS Standard Question Distributions
const TYT_DEFAULTS: Record<string, number> = {
  'Türkçe': 40, 'Tarih': 5, 'Coğrafya': 5, 'Felsefe': 5, 'Din Kültürü': 5,
  'Matematik': 40, 'Fizik': 7, 'Kimya': 7, 'Biyoloji': 6
};

const AYT_DEFAULTS: Record<string, number> = {
  'Matematik': 40, 'Fizik': 14, 'Kimya': 13, 'Biyoloji': 13,
  'Edebiyat': 24, 'Tarih-1': 10, 'Coğrafya-1': 6,
  'Tarih-2': 11, 'Coğrafya-2': 11, 'Felsefe': 12, 'Din Kültürü': 6
};

const YDT_DEFAULTS: Record<string, number> = {
  'İngilizce': 80
};

// Reusable Custom Select for Modal
interface CustomSelectProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const ModalSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, placeholder = 'Seçiniz' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 bg-white rounded-xl px-3 font-bold text-[#3D3D3D] shadow-sm flex items-center justify-between text-sm transition-colors active:bg-gray-50 border border-gray-100" 
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[#5A4A42] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 max-h-[200px] overflow-y-auto no-scrollbar">
             {options.map((opt) => (
               <div 
                 key={opt.value} 
                 onClick={() => {
                   onChange(opt.value);
                   setIsOpen(false);
                 }}
                 className={`px-4 py-3 text-sm font-bold text-[#3D3D3D] hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 ${opt.value === value ? 'bg-orange-50' : ''}`}
               >
                 {opt.label}
               </div>
             ))}
        </div>
      )}
    </div>
  );
};

interface MultiSelectProps {
  selectedValues: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const TopicMultiSelect: React.FC<MultiSelectProps> = ({ selectedValues, options, onChange, placeholder = 'Konu Seçiniz' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val: string) => {
     if (selectedValues.includes(val)) {
         onChange(selectedValues.filter(v => v !== val));
     } else {
         onChange([...selectedValues, val]);
     }
  };

  const label = selectedValues.length === 0 
     ? placeholder 
     : selectedValues.length === 1 
        ? selectedValues[0] 
        : `${selectedValues.length} Konu Seçildi`;

  return (
    <div ref={containerRef} className="relative w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 bg-white rounded-xl px-3 font-bold text-[#3D3D3D] shadow-sm flex items-center justify-between text-sm transition-colors active:bg-gray-50 border border-gray-100" 
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-[#5A4A42] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 max-h-[250px] overflow-y-auto no-scrollbar">
             {options.map((opt) => {
               const isSelected = selectedValues.includes(opt);
               return (
                   <div 
                     key={opt} 
                     onClick={() => toggleOption(opt)}
                     className={`px-4 py-3 text-sm font-bold flex items-center justify-between cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-[#3D3D3D] hover:bg-gray-50'}`}
                   >
                     <span>{opt}</span>
                     {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                   </div>
               );
             })}
             {options.length === 0 && <div className="px-4 py-3 text-xs text-gray-400">Konu bulunamadı</div>}
        </div>
      )}
    </div>
  );
};

interface TopicInput {
  q: string;
  c: string;
  w: string;
  e: string;
}

const ManualSessionModal: React.FC<Props> = ({ user, date, onClose, onSave, onCycle }) => {
  const [mode, setMode] = useState<'study' | 'mock'>('study');
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingResult, setPendingResult] = useState<SessionResult | null>(null);

  // --- Common State ---
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [durationStr, setDurationStr] = useState('');
  const isToday = new Date().toDateString() === date.toDateString();

  // --- Study Mode State ---
  const [subject, setSubject] = useState(SESSION_SUBJECTS[0]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([SESSION_TOPICS[SESSION_SUBJECTS[0]][0]]);
  const [topicStatsMap, setTopicStatsMap] = useState<Record<string, TopicInput>>({});
  const [currentStudyTopicIdx, setCurrentStudyTopicIdx] = useState(0);

  // --- Mock Mode State ---
  const availableExams = useMemo(() => {
    const targets = user.targetExams || [];
    const exams: string[] = ['TYT'];
    if (targets.some(t => t.includes('AYT'))) exams.push('AYT');
    if (targets.includes('YDT')) exams.push('YDT');
    if (exams.length === 1) exams.push('AYT');
    return exams;
  }, [user.targetExams]);

  const [mockExamType, setMockExamType] = useState<'TYT' | 'AYT' | 'YDT'>(availableExams[0] as any);
  const [publisher, setPublisher] = useState('');
  const [mockTopicIdx, setMockTopicIdx] = useState(0);
  const [mockData, setMockData] = useState<Record<string, TopicInput>>({});

  const mockTopics = useMemo(() => {
    if (mockExamType === 'TYT') {
      return ['Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
    }
    if (mockExamType === 'AYT') {
      const targets = user.targetExams || [];
      const isSAY = targets.includes('AYT-SAY');
      const isEA = targets.includes('AYT-EA');
      const isSOZ = targets.includes('AYT-SOZ') || targets.includes('AYT-SÖZ');
      
      const unique = new Set<string>();
      if (isSAY) ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'].forEach(s => unique.add(s));
      if (isEA) ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'].forEach(s => unique.add(s));
      if (isSOZ) ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe', 'Din Kültürü'].forEach(s => unique.add(s));
      
      return unique.size > 0 ? Array.from(unique) : ['Matematik', 'Edebiyat', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih-1', 'Coğrafya-1'];
    }
    return ['İngilizce'];
  }, [mockExamType, user.targetExams]);

  const handleExamTypeChange = (type: 'TYT' | 'AYT' | 'YDT') => {
      setMockExamType(type);
      setMockTopicIdx(0);
  };

  useEffect(() => {
    if (mode === 'mock') {
        const defaults: Record<string, TopicInput> = {};
        const activeDefaults = mockExamType === 'TYT' ? TYT_DEFAULTS : mockExamType === 'AYT' ? AYT_DEFAULTS : YDT_DEFAULTS;
        
        mockTopics.forEach(t => {
            const defVal = activeDefaults[t] || (mockExamType === 'AYT' ? 13 : 10);
            defaults[t] = {
                q: defVal.toString(),
                c: mockData[t]?.c || '',
                w: mockData[t]?.w || '',
                e: mockData[t]?.e || ''
            };
        });
        setMockData(defaults);
    }
  }, [mode, mockExamType, mockTopics]);

  useEffect(() => {
    setError(null);
    if (mode === 'mock') {
      setDurationStr(mockExamType === 'TYT' ? '165' : mockExamType === 'AYT' ? '180' : '120');
      setMockTopicIdx(0);
    } else {
      setDurationStr('');
      setCurrentStudyTopicIdx(0);
    }
  }, [mode, mockExamType]);

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    const defaultTopic = SESSION_TOPICS[val]?.[0] || '';
    setSelectedTopics(defaultTopic ? [defaultTopic] : []);
    setTopicStatsMap({});
    setCurrentStudyTopicIdx(0);
  };

  const handleStatsChange = (topic: string, field: keyof TopicInput, val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    const targetMap = mode === 'study' ? topicStatsMap : mockData;
    const setTargetMap = mode === 'study' ? setTopicStatsMap : setMockData;

    setTargetMap({
      ...targetMap,
      [topic]: {
        ...(targetMap[topic] || { q: '', c: '', w: '', e: '' }),
        [field]: val
      }
    });
    if (error) setError(null);
  };

  const validateHours = (val: string) => {
    let intVal = parseInt(val);
    if (isToday) {
      const currentHour = new Date().getHours();
      const maxAllowedHour = Math.max(0, currentHour - 2);
      if (intVal > maxAllowedHour) return maxAllowedHour.toString().padStart(2, '0');
    }
    if (intVal > 23) return '23';
    return val;
  };

  const handleSave = () => {
    const durationMinutes = parseInt(durationStr) || 0;
    const activeTopics = mode === 'study' ? selectedTopics : mockTopics;
    const statsSource = mode === 'study' ? topicStatsMap : mockData;

    if (mode === 'mock' && !publisher.trim()) {
      setError("Lütfen bir yayın adı giriniz.");
      return;
    }

    if (activeTopics.length === 0) {
      setError("Lütfen en az bir konu seçiniz.");
      return;
    }

    let totalQ = 0, totalC = 0, totalW = 0, totalE = 0;
    const computedStats: TopicStat[] = [];
    const durPerTopic = (durationMinutes * 60) / activeTopics.length;

    for (const t of activeTopics) {
      const s = statsSource[t] || { q: '', c: '', w: '', e: '' };
      const q = parseInt(s.q) || 0;

      if (q <= 0) {
        if (mode === 'study') {
          setError(`${t}: Soru sayısı girilmelidir.`);
          return;
        }
        continue; // Skip subjects with 0 questions in mock
      }

      const hasC = s.c !== '';
      const hasW = s.w !== '';
      const hasE = s.e !== '';
      let c = hasC ? (parseInt(s.c) || 0) : 0;
      let w = hasW ? (parseInt(s.w) || 0) : 0;
      let e = hasE ? (parseInt(s.e) || 0) : 0;

      // Autofill logic based on presence
      if (hasC && hasW && !hasE) e = q - c - w;
      else if (hasC && hasE && !hasW) w = q - c - e;
      else if (hasW && hasE && !hasC) c = q - w - e;
      else if (hasC && !hasW && !hasE) { w = 0; e = q - c; }
      else if (hasW && !hasC && !hasE) { c = 0; e = q - w; }
      else if (hasE && !hasC && !hasW) { c = 0; w = 0; e = q; }
      else if (!hasC && !hasW && !hasE) { c = 0; w = 0; e = q; }

      if (c < 0 || w < 0 || e < 0 || (c + w + e) !== q) {
        setError(`${t}: Toplam soru sayısına (${q}) uyumlu değerler girilmelidir.`);
        return;
      }

      totalQ += q; totalC += c; totalW += w; totalE += e;
      computedStats.push({ topic: t, questions: q, correct: c, wrong: w, empty: e, durationSeconds: durPerTopic });
    }

    if (totalQ <= 0) {
      setError("Lütfen en az bir soru sayısı giriniz.");
      return;
    }

    const h = parseInt(hours) || 0, m = parseInt(minutes) || 0;
    const finalDate = new Date(date);
    finalDate.setHours(h, m, 0, 0);

    const result: SessionResult = {
      durationSeconds: durationMinutes * 60,
      config: {
        // Fixed missing sessionType property
        sessionType: 'question',
        durationMinutes,
        subject: mode === 'mock' ? `${mockExamType} Denemesi` : subject,
        topic: activeTopics[0],
        activeTopics,
        isMockTest: mode === 'mock',
        examType: mode === 'mock' ? mockExamType : undefined,
        publisher: mode === 'mock' ? publisher : undefined,
        mood: 'Manual',
        location: 'Manual',
        breakReminderInterval: 0
      },
      questions: totalQ, correct: totalC, wrong: totalW, empty: totalE,
      net: parseFloat((totalC - (totalW / 4)).toFixed(2)),
      accuracy: Math.round(totalQ > 0 ? (totalC / totalQ) * 100 : 0),
      customDate: finalDate.toISOString(),
      topicStats: computedStats
    };

    if (mode === 'mock') {
        setPendingResult(result);
        setShowConfirmation(true);
    } else {
        onSave(result);
        onClose();
    }
  };

  const handleConfirmSave = () => {
    if (pendingResult) {
      onSave(pendingResult);
      onClose();
    }
  };

  const mockNetSummary = useMemo(() => {
    let totalC = 0, totalW = 0;
    (Object.values(mockData) as TopicInput[]).forEach(s => {
      totalC += parseInt(s.c) || 0;
      totalW += parseInt(s.w) || 0;
    });
    return (totalC - (totalW / 4)).toFixed(2);
  }, [mockData]);

  const currentTopic = mode === 'study' ? selectedTopics[currentStudyTopicIdx] : mockTopics[mockTopicIdx];
  const currentStats = (mode === 'study' ? topicStatsMap : mockData)[currentTopic] || { q: '', c: '', w: '', e: '' };

  const isQuestionFieldLocked = mode === 'mock';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-[#FFFBEB] w-full max-w-sm rounded-[35px] p-6 shadow-2xl animate-fadeIn flex flex-col">
          
          <div className="flex justify-between items-center mb-5 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                {onCycle && <button onClick={() => onCycle(-1)} className="text-[#5A4A42] p-1"><ChevronLeft className="w-5 h-5" /></button>}
                <h2 className="text-xl font-bold text-[#5A4A42]">Oturum Ekle</h2>
                {onCycle && <button onClick={() => onCycle(1)} className="text-[#5A4A42] p-1"><ChevronRight className="w-5 h-5" /></button>}
              </div>
            </div>
            <div className="ml-auto z-10"><button onClick={onClose} className="bg-gray-200 rounded-full p-1"><X className="w-4 h-4 text-gray-600" /></button></div>
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-xs font-bold text-[#5A4A42] bg-orange-100/60 py-2.5 rounded-xl flex items-center justify-center">
              {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
            </div>
            <div className="w-24 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center gap-1 shadow-sm">
              <input type="text" maxLength={2} value={hours} onChange={e => /^\d{0,2}$/.test(e.target.value) && setHours(e.target.value)} onBlur={() => setHours(validateHours(hours).padStart(2, '0'))} className="w-6 text-center font-bold text-[#5A4A42] outline-none text-sm" />
              <span className="text-gray-300 font-bold">:</span>
              <input type="text" maxLength={2} value={minutes} onChange={e => /^\d{0,2}$/.test(e.target.value) && (parseInt(e.target.value) < 60 || e.target.value === '') && setMinutes(e.target.value)} onBlur={() => setMinutes((minutes || '0').padStart(2, '0'))} className="w-6 text-center font-bold text-[#5A4A42] outline-none text-sm" />
            </div>
          </div>

          <div className="bg-gray-200/50 p-1 rounded-2xl flex relative mb-5">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ${mode === 'mock' ? 'left-[calc(50%)]' : 'left-1'}`} />
            <button onClick={() => setMode('study')} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${mode === 'study' ? 'text-[#2D3A31]' : 'text-gray-400'}`}>Çalışma</button>
            <button onClick={() => setMode('mock')} className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${mode === 'mock' ? 'text-[#2D3A31]' : 'text-gray-400'}`}>Deneme</button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-[10px] font-bold mb-4 flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </div>
          )}

          <div className="space-y-4">
            {mode === 'study' ? (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Ders & Konu</label>
                  <div className="flex gap-2">
                    <ModalSelect value={subject} onChange={handleSubjectChange} options={SESSION_SUBJECTS.map(s => ({ label: s, value: s }))} />
                    <TopicMultiSelect selectedValues={selectedTopics} onChange={setSelectedTopics} options={SESSION_TOPICS[subject] || []} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Süre (Dakika)</label>
                  <input type="text" value={durationStr} onChange={e => /^\d*$/.test(e.target.value) && setDurationStr(e.target.value)} placeholder="0" className="w-full h-10 bg-white rounded-xl px-4 font-bold text-[#3D3D3D] shadow-sm outline-none border border-gray-100" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Sınav & Yayın</label>
                  <div className="flex gap-2 mb-2">
                    {availableExams.map(ex => (
                      <button key={ex} onClick={() => handleExamTypeChange(ex as any)} className={`flex-1 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${mockExamType === ex ? 'bg-white border-orange-200 text-orange-600 shadow-sm' : 'bg-white/50 border-transparent text-gray-400'}`}>{ex}</button>
                    ))}
                  </div>
                  <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="Yayın Adı (Örn: 3D)" className="w-full h-10 bg-white rounded-xl px-4 font-bold text-[#3D3D3D] shadow-sm outline-none border border-gray-100 text-xs" />
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Süre</label>
                    <input type="text" value={durationStr} onChange={e => /^\d*$/.test(e.target.value) && setDurationStr(e.target.value)} className="w-full h-10 bg-white rounded-xl px-4 font-bold text-[#3D3D3D] border border-gray-100 text-xs" />
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 rounded-xl h-10 mt-5 flex items-center justify-center gap-2 px-3 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400">NET</span>
                    <span className="text-sm font-extrabold text-[#2D3A31]">{mockNetSummary}</span>
                  </div>
                </div>
              </>
            )}

            {currentTopic ? (
              <div className="bg-white rounded-[25px] p-4 shadow-sm border border-orange-50">
                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                  <button onClick={() => mode === 'study' ? setCurrentStudyTopicIdx(prev => Math.max(0, prev - 1)) : setMockTopicIdx(prev => Math.max(0, prev - 1))} disabled={(mode === 'study' ? currentStudyTopicIdx : mockTopicIdx) === 0} className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-20"><ChevronLeft className="w-4 h-4 text-black" /></button>
                  <span className="text-xs font-extrabold text-[#5A4A42] truncate max-w-[150px]">{currentTopic}</span>
                  <button onClick={() => mode === 'study' ? setCurrentStudyTopicIdx(prev => Math.min(selectedTopics.length - 1, prev + 1)) : setMockTopicIdx(prev => Math.min(mockTopics.length - 1, prev + 1))} disabled={(mode === 'study' ? currentStudyTopicIdx : mockTopicIdx) === (mode === 'study' ? selectedTopics.length : mockTopics.length) - 1} className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-20"><ChevronRight className="w-4 h-4 text-black" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['q', 'c', 'w', 'e'].map(f => (
                    <div key={f} className="flex flex-col items-center">
                      <label className={`text-[9px] font-bold uppercase mb-1 ${f === 'c' ? 'text-green-500' : f === 'w' ? 'text-red-500' : 'text-gray-400'}`}>
                        {f === 'q' ? 'Soru' : f === 'c' ? 'Doğru' : f === 'w' ? 'Yanlış' : 'Boş'}
                      </label>
                      <input 
                        type="text" 
                        inputMode="numeric" 
                        value={currentStats[f as keyof TopicInput]} 
                        placeholder="0" 
                        onChange={e => handleStatsChange(currentTopic, f as keyof TopicInput, e.target.value)} 
                        disabled={f === 'q' && isQuestionFieldLocked}
                        className={`w-full h-9 text-center font-extrabold bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-orange-200 transition-all text-sm ${f === 'q' && isQuestionFieldLocked ? 'text-gray-400 opacity-70' : 'text-[#5A4A42]'}`} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-gray-400 border border-dashed">Veri girmek için konu seçiniz.</div>
            )}
          </div>

          <button onClick={handleSave} className="w-full mt-6 bg-[#2D3A31] hover:bg-[#3D4A41] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"><Save className="w-4 h-4" />Kaydet</button>
        </div>
      </div>

      {showConfirmation && pendingResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[40px] p-8 shadow-2xl w-full max-w-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#FDE8A8] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <Save className="w-8 h-8 text-[#5A4A42]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#2D3A31] mb-6">Denemeyi Kaydet</h2>
                  <div className="w-full bg-white border border-gray-50 rounded-2xl p-4 mb-6 shadow-sm">
                      <div className="grid grid-cols-4 gap-0">
                          <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-gray-400 mb-1">Soru</span>
                              <span className="text-xl font-extrabold text-[#5A4A42]">{pendingResult.questions}</span>
                          </div>
                          <div className="flex flex-col items-center border-l border-gray-100">
                              <span className="text-xs font-bold text-green-500 mb-1">Doğru</span>
                              <span className="text-xl font-extrabold text-green-500">{pendingResult.correct}</span>
                          </div>
                          <div className="flex flex-col items-center border-l border-gray-100">
                              <span className="text-xs font-bold text-red-500 mb-1">Yanlış</span>
                              <span className="text-xl font-extrabold text-red-500">{pendingResult.wrong}</span>
                          </div>
                          <div className="flex flex-col items-center border-l border-gray-100">
                              <span className="text-xs font-bold text-gray-400 mb-1">Net</span>
                              <span className="text-xl font-extrabold text-[#5A4A42]">{pendingResult.net}</span>
                          </div>
                      </div>
                  </div>
                  <p className="text-sm text-[#5A4A42] font-medium text-center leading-relaxed mb-8 px-4 opacity-90">Deneme sonuçlarını kaydetmek istediğinize emin misiniz?</p>
                  <div className="flex gap-4 w-full">
                      <button onClick={() => setShowConfirmation(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-extrabold text-gray-500 text-sm hover:bg-gray-50 transition-colors">Vazgeç</button>
                      <button onClick={handleConfirmSave} className="flex-1 py-4 bg-[#2D3A31] text-white rounded-2xl font-extrabold text-sm hover:bg-[#3D4A41] transition-all shadow-md active:scale-95">Evet, Kaydet</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ManualSessionModal;
