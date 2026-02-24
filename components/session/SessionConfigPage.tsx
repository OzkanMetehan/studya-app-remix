import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Play, BookOpen, GraduationCap } from 'lucide-react';
import { SESSION_SUBJECTS, SESSION_TOPICS, TYT_TOPICS, AYT_TOPICS, YDT_TOPICS, MOODS as DEFAULT_MOODS, LOCATIONS as DEFAULT_LOCATIONS, PRESETS as DEFAULT_PRESETS, LECTURE_SOURCES } from '../../constants';
import { SessionConfig, SessionPreset, Book, UserModel } from '../../types';
import { bookService } from '../../services/bookService';

interface Props {
  user: UserModel;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
}

// Custom Scrollable Select Component
interface CustomSelectProps {
  value: string | number;
  options: { label: string; value: string | number; disabled?: boolean }[];
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string; // Allow custom height classes
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, placeholder = 'Seçiniz', disabled = false, className = "h-10" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen && containerRef.current) {
        // Check available space below
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        // If less than 220px (approx dropdown height), open upwards
        setOpenUpwards(spaceBelow < 220);
    }
    
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button 
        onClick={toggleDropdown}
        className={`w-full bg-[#FCEBB6] rounded-2xl px-3 font-bold text-[#3D3D3D] shadow-sm flex items-center justify-between outline-none transition-colors text-xs ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-[#F2D680]'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#5A4A42] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
            className={`absolute left-0 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-orange-100/50 ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
           <div className="max-h-[200px] overflow-y-auto no-scrollbar">
             {options.length > 0 ? (
                 options.map((opt) => (
                   <div 
                     key={opt.value} 
                     onClick={() => {
                       if (opt.disabled) return;
                       onChange(opt.value);
                       setIsOpen(false);
                     }}
                     className={`
                        px-3 py-3 text-xs border-b border-gray-100 last:border-0
                        ${opt.disabled 
                            ? 'font-extrabold bg-gray-50 text-gray-400 cursor-default uppercase tracking-wider text-[10px] py-1.5' 
                            : `font-bold text-[#3D3D3D] hover:bg-[#FCEBB6]/30 cursor-pointer ${opt.value === value ? 'bg-[#FCEBB6]/50' : ''}`
                        }
                     `}
                   >
                     {opt.label}
                   </div>
                 ))
             ) : (
                <div className="px-3 py-2 text-xs text-gray-400 font-medium italic">Seçenek yok</div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

const SessionConfigPage: React.FC<Props> = ({ user, onStart, onBack }) => {
  const [config, setConfig] = useState<SessionConfig>({
    sessionType: 'question',
    durationMinutes: 40,
    subject: 'Matematik',
    topic: 'Temel Kavramlar',
    subTopic: '',
    isMockTest: false,
    breakReminderInterval: 0,
    mood: 'Sakin',
    location: 'Ev',
    bookId: undefined,
    lectureSource: 'YouTube',
    publisher: '',
    examType: 'TYT',
    allowBreaks: false,
    isFreeMode: false
  });

  // Store the regular config to restore when switching back from Mock Mode
  const [savedRegularConfig, setSavedRegularConfig] = useState<SessionConfig | null>(null);

  // Mock Test Mode State
  const [mockExamType, setMockExamType] = useState<'TYT' | 'AYT' | 'YDT'>('TYT');
  const [publisher, setPublisher] = useState('');
  const [allowBreaks, setAllowBreaks] = useState(false);

  // Preset State
  const [presets, setPresets] = useState<SessionPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Active Locations & Moods
  const [activeLocations, setActiveLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [activeMoods, setActiveMoods] = useState<string[]>(DEFAULT_MOODS);
  
  // Library Books
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);

  // Filter available Mock Types based on User Profile
  const availableMockTypes = React.useMemo(() => {
      const targets = user.targetExams || [];
      const hasAYT = targets.some(t => t.includes('AYT'));
      const hasYDT = targets.includes('YDT');
      
      const types = ['TYT']; // TYT is always available
      if (hasAYT) types.push('AYT');
      if (hasYDT) types.push('YDT');
      
      return types;
  }, [user.targetExams]);

  // Ensure mockExamType is valid when available types change
  useEffect(() => {
      if (config.isMockTest && !availableMockTypes.includes(mockExamType)) {
          setMockExamType('TYT');
      }
  }, [config.isMockTest, availableMockTypes, mockExamType]);

  // Load Data on Mount
  useEffect(() => {
    const savedLocs = localStorage.getItem('studya_all_locations');
    if (savedLocs) {
        const parsed = JSON.parse(savedLocs);
        if (parsed && parsed.length > 0) setActiveLocations(parsed);
    }

    const savedMoods = localStorage.getItem('studya_all_moods');
    if (savedMoods) {
        const parsed = JSON.parse(savedMoods);
        if (parsed && parsed.length > 0) setActiveMoods(parsed);
    }

    const savedPresets = localStorage.getItem('studya_presets');
    let loaded: SessionPreset[] = [];
    if (savedPresets) {
        loaded = JSON.parse(savedPresets);
    } else {
        loaded = DEFAULT_PRESETS.map((p, i) => ({
            id: `default_${i}`,
            name: p,
            config: {} 
        }));
    }
    setPresets(loaded);

    // Load Books from BookService - Ensure we get fresh data every time this page mounts
    setLibraryBooks(bookService.getBooks());
  }, []);

  // Sync Mock Config
  useEffect(() => {
    if (config.isMockTest) {
        let dur = 165;
        if (mockExamType === 'AYT') dur = 180;
        if (mockExamType === 'YDT') dur = 120;
        
        setConfig(prev => ({
            ...prev,
            durationMinutes: dur,
            subject: `${mockExamType} Denemesi`,
            topic: 'Genel',
            examType: mockExamType as any,
            publisher: publisher,
            allowBreaks: allowBreaks
        }));
    }
  }, [config.isMockTest, mockExamType, publisher, allowBreaks]);

  // Filter books when subject changes
  const availableBooks = libraryBooks.filter(b => b.category === config.subject);

  useEffect(() => {
      const currentBook = libraryBooks.find(b => b.id === config.bookId);
      if (currentBook && currentBook.category !== config.subject) {
          setConfig(prev => ({ ...prev, bookId: undefined }));
      }
  }, [config.subject, config.bookId, libraryBooks]);

  // Smart Topic Options Logic
  const getTopicOptions = () => {
      const subject = config.subject;
      const selectedBook = libraryBooks.find(b => b.id === config.bookId);
      
      const tyt = TYT_TOPICS[subject] || [];
      const ayt = AYT_TOPICS[subject] || [];
      const ydt = YDT_TOPICS[subject] || [];

      // 1. If Book Selected
      if (selectedBook) {
         const bookTypes = selectedBook.examTypes || [];
         const titleUpper = selectedBook.title.toUpperCase();
         
         const isTYT = bookTypes.includes('TYT') || titleUpper.includes('TYT') || titleUpper.includes('345') || titleUpper.includes('LIMIT');
         const isAYT = bookTypes.includes('AYT') || titleUpper.includes('AYT');
         const isYDT = bookTypes.includes('YDT') || titleUpper.includes('YDS') || titleUpper.includes('YDT');

         if (isAYT && !isTYT) return ayt.map(t => ({label: t, value: t}));
         if (isTYT && !isAYT) return tyt.map(t => ({label: t, value: t}));
         if (isYDT) return ydt.map(t => ({label: t, value: t}));
      }

      // 2. If No Book or Mixed -> Show Headers
      const options = [];
      if (tyt.length > 0) {
          options.push({ label: '--- TYT ---', value: 'header_tyt', disabled: true });
          options.push(...tyt.map(t => ({ label: t, value: t })));
      }
      if (ayt.length > 0) {
          options.push({ label: '--- AYT ---', value: 'header_ayt', disabled: true });
          options.push(...ayt.map(t => ({ label: t, value: t })));
      }
      if (ydt.length > 0) {
           options.push({ label: '--- YDT ---', value: 'header_ydt', disabled: true });
           options.push(...ydt.map(t => ({ label: t, value: t })));
      }
      
      if (options.length === 0) {
          return (SESSION_TOPICS[subject] || []).map(t => ({ label: t, value: t }));
      }

      return options;
  };

  const handleStart = () => {
    onStart(config);
  };

  const handleBreakIncrement = (amount: number) => {
      setConfig(prev => {
          let current = prev.breakReminderInterval || 0;
          let newVal = current + amount;
          if (amount > 0 && current === 0) newVal = 20;
          if (amount < 0 && current === 20) newVal = 0;
          if (newVal !== 0 && newVal < 20) newVal = 20;
          if (newVal > 99) newVal = 99;
          return { ...prev, breakReminderInterval: newVal };
      });
  };

  const handleBreakInputChange = (valStr: string) => {
      let val = parseInt(valStr);
      if (isNaN(val)) val = 0;
      if (val !== 0) {
          if (val > 99) val = 99;
      }
      setConfig({...config, breakReminderInterval: val});
  };

  const handleBreakInputBlur = () => {
      let val = config.breakReminderInterval || 0;
      if (val !== 0 && val < 20) {
          setConfig({...config, breakReminderInterval: 20});
      }
  };

  const applyPreset = (preset: SessionPreset) => {
      setConfig(prev => ({
          ...prev,
          ...preset.config
      }));
  };

  const handlePresetChange = (id: string) => {
      setSelectedPresetId(id);
      const p = presets.find(pre => pre.id === id);
      if (p) applyPreset(p);
  };

  // Toggle Mock Mode
  const handleToggleMockMode = () => {
      if (config.isMockTest) {
          if (savedRegularConfig) {
              setConfig({ ...savedRegularConfig, isMockTest: false });
          } else {
              setConfig(prev => ({
                  ...prev,
                  isMockTest: false,
                  subject: SESSION_SUBJECTS[0],
                  topic: SESSION_TOPICS[SESSION_SUBJECTS[0]][0] || 'Genel',
                  durationMinutes: 40,
                  isFreeMode: false,
                  bookId: undefined, 
              }));
          }
      } else {
          setSavedRegularConfig({ ...config });
          setConfig(prev => ({ ...prev, isMockTest: true, sessionType: 'question' }));
      }
  };

  const handleToggleSessionType = (type: 'question' | 'lecture') => {
    setConfig(prev => ({ ...prev, sessionType: type }));
  };

  return (
    <div className="h-[100dvh] w-full bg-[url('https://i.imgur.com/hvIoUYE.png')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans relative flex flex-col">
      
      {/* Header */}
      <div className="px-6 pt-6 flex items-center mb-1 flex-shrink-0">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-2 text-[#555]">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 5L7 12L16 19Z" />
           </svg>
        </button>
      </div>

      {/* Mode Switcher - 2x Toggle Layout */}
      <div className="px-8 flex justify-center mb-4 flex-shrink-0">
          <div className="bg-white/50 backdrop-blur-md p-1 rounded-2xl flex relative w-full max-w-[280px] shadow-sm border border-white/40">
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#FCEBB6] rounded-xl shadow-sm transition-all duration-300 ease-in-out z-0 ${config.sessionType === 'lecture' ? 'left-[calc(50%)]' : 'left-1'}`}
                />
                <button 
                    onClick={() => handleToggleSessionType('question')}
                    disabled={config.isMockTest}
                    className={`flex-1 relative z-10 py-2 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-colors ${config.sessionType === 'question' ? 'text-[#2D3A31]' : 'text-gray-500'} ${config.isMockTest ? 'opacity-50' : ''}`}
                >
                    <BookOpen className="w-3.5 h-3.5" /> Soru Çözümü
                </button>
                <button 
                    onClick={() => handleToggleSessionType('lecture')}
                    disabled={config.isMockTest}
                    className={`flex-1 relative z-10 py-2 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-colors ${config.sessionType === 'lecture' ? 'text-[#2D3A31]' : 'text-gray-500'} ${config.isMockTest ? 'opacity-50' : ''}`}
                >
                    <GraduationCap className="w-3.5 h-3.5" /> Konu Çalışma
                </button>
          </div>
      </div>

      {/* Controls Bar */}
      <div className="px-8 flex justify-between items-end mb-4 flex-shrink-0">
          <div className="flex flex-col gap-1.5">
             <span className="text-xs font-bold text-[#5A4A42] italic opacity-80">Deneme Testi</span>
             <button 
                onClick={handleToggleMockMode}
                className={`w-14 h-8 rounded-full p-1 transition-colors shadow-sm ${config.isMockTest ? 'bg-[#E74C3C]' : 'bg-[#D4D4D4]'}`}
             >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${config.isMockTest ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <button 
            onClick={handleStart}
            disabled={config.isMockTest && !publisher.trim()}
            className={`bg-[#FCEBB6] hover:bg-[#F2D680] text-[#5A4A42] px-6 h-8 rounded-full shadow-md font-bold flex items-center gap-2 border border-orange-200 transition-all ${config.isMockTest && !publisher.trim() ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            Başla <Play className="w-4 h-4 fill-[#5A4A42]" />
          </button>
      </div>

      {/* Form Container */}
      <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-t-[40px] px-8 pt-6 pb-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 -mx-4 px-4">
            <div className="flex flex-col gap-5 min-h-full">
            {config.isMockTest ? (
                <>
                    <div className="flex justify-between gap-3">
                        {availableMockTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setMockExamType(type as any)}
                                className={`flex-1 py-2.5 rounded-2xl font-bold text-xs border-2 transition-all ${
                                    mockExamType === type 
                                    ? 'bg-white border-[#EFA88D] text-[#3D3D3D] shadow-sm' 
                                    : 'bg-white/50 border-transparent text-gray-500'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Süre</span>
                        <div className="flex-1 ml-4 bg-[#FCEBB6] h-10 rounded-2xl flex items-center justify-center font-bold text-[#3D3D3D] text-sm shadow-sm">
                        {Math.floor(config.durationMinutes / 60)}s { (config.durationMinutes % 60).toString().padStart(2, '0') }dk
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Yayın</span>
                        <div className="flex-1 ml-4">
                            <input 
                                type="text"
                                value={publisher}
                                onChange={(e) => setPublisher(e.target.value)}
                                placeholder="Yayın giriniz"
                                className="w-full h-10 bg-[#FCEBB6] rounded-2xl px-4 font-bold text-[#3D3D3D] placeholder-[#5A4A42]/50 shadow-sm outline-none text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Konum</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={config.location}
                                onChange={(val) => setConfig({...config, location: val})}
                                options={activeLocations.map(l => ({ label: l, value: l }))}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">His</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={config.mood}
                                onChange={(val) => setConfig({...config, mood: val})}
                                options={activeMoods.map(m => ({ label: m, value: m }))}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-[#5A4A42] text-xs ml-2 opacity-80">Molalara izin ver</span>
                        <div 
                            onClick={() => setAllowBreaks(!allowBreaks)}
                            className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${allowBreaks ? 'bg-[#94AFA0]' : 'bg-[#D4D4D4]'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${allowBreaks ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Süre</span>
                        {config.isFreeMode ? (
                            <div className="flex-1 ml-4 bg-[#FCEBB6]/60 h-10 rounded-2xl flex items-center justify-center border border-dashed border-orange-300">
                                <span className="font-bold text-[#5A4A42] text-xs">Serbest Çalışma</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 ml-4">
                                <input 
                                    type="number" min="0"
                                    value={Math.floor(config.durationMinutes / 60).toString().padStart(2, '0')}
                                    onChange={(e) => {
                                        const h = Math.max(0, parseInt(e.target.value) || 0);
                                        const m = config.durationMinutes % 60;
                                        setConfig({...config, durationMinutes: h * 60 + m});
                                    }}
                                    className="w-12 h-10 bg-[#FCEBB6] rounded-2xl text-center font-bold text-[#3D3D3D] shadow-sm outline-none focus:ring-2 ring-orange-200 text-sm"
                                />
                                <span className="font-bold text-[#3D3D3D] text-sm">:</span>
                                <input 
                                    type="number" min="0"
                                    value={(config.durationMinutes % 60).toString().padStart(2, '0')}
                                    onChange={(e) => {
                                        const m = Math.max(0, parseInt(e.target.value) || 0);
                                        const h = Math.floor(config.durationMinutes / 60);
                                        setConfig({...config, durationMinutes: h * 60 + m});
                                    }}
                                    className="w-12 h-10 bg-[#FCEBB6] rounded-2xl text-center font-bold text-[#3D3D3D] shadow-sm outline-none focus:ring-2 ring-orange-200 text-sm"
                                />
                            </div>
                        )}
                        <div className="ml-2">
                            <div 
                                onClick={() => setConfig({...config, isFreeMode: !config.isFreeMode})}
                                className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.isFreeMode ? 'bg-[#94AFA0]' : 'bg-[#D4D4D4]'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${config.isFreeMode ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Dersler</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={config.subject}
                                onChange={(val) => {
                                    const defaultTopic = SESSION_TOPICS[val]?.[0] || '';
                                    setConfig({...config, subject: val, topic: defaultTopic});
                                }}
                                options={SESSION_SUBJECTS.map(s => ({ label: s, value: s }))}
                                className="h-10"
                            />
                        </div>
                    </div>
                    
                    {config.sessionType === 'question' ? (
                        <div className="flex items-center justify-between">
                            <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Kitap</span>
                            <div className="flex-1 ml-4 relative">
                                <CustomSelect 
                                    value={config.bookId || ''}
                                    onChange={(val) => setConfig({...config, bookId: val ? val : undefined})}
                                    options={[
                                        { label: 'Kitap Seçilmedi', value: '' },
                                        ...availableBooks.map(b => ({ label: b.title, value: b.id }))
                                    ]}
                                    placeholder="Seçiniz"
                                    disabled={availableBooks.length === 0}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Kaynak</span>
                            <div className="flex-1 ml-4 relative">
                                <CustomSelect 
                                    value={config.lectureSource || ''}
                                    onChange={(val) => setConfig({...config, lectureSource: val})}
                                    options={LECTURE_SOURCES.map(s => ({ label: s, value: s }))}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Konular</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={config.topic}
                                onChange={(val) => setConfig({...config, topic: val})}
                                options={getTopicOptions()}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-[10px] leading-tight flex items-center justify-center h-10">Mola<br/>Hatırlatıcı</span>
                        <div className="flex items-center gap-2">
                             <div className="w-14 h-9 bg-[#FCEBB6] rounded-2xl flex items-center justify-center font-bold text-[#3D3D3D] shadow-sm overflow-hidden">
                                <input 
                                    type="number" min="0" max="99"
                                    value={(config.breakReminderInterval || 0).toString().padStart(2, '0')}
                                    onChange={(e) => handleBreakInputChange(e.target.value)}
                                    onBlur={handleBreakInputBlur}
                                    className="w-full h-full bg-transparent text-center outline-none text-sm"
                                />
                             </div>
                             <div className="flex flex-col gap-0.5">
                                 <button onClick={() => handleBreakIncrement(1)}><ChevronDown className="w-3 h-3 rotate-180 text-[#5A4A42]" /></button>
                                 <button onClick={() => handleBreakIncrement(-1)}><ChevronDown className="w-3 h-3 text-[#5A4A42]" /></button>
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">His</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={config.mood}
                                onChange={(val) => setConfig({...config, mood: val})}
                                options={activeMoods.map(m => ({ label: m, value: m }))}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Konum</span>
                        <div className="flex-1 ml-4 relative">
                             <CustomSelect 
                                value={config.location}
                                onChange={(val) => setConfig({...config, location: val})}
                                options={activeLocations.map(l => ({ label: l, value: l }))}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="w-20 bg-[#FCEBB6] py-2 rounded-full text-center font-bold text-[#3D3D3D] shadow-sm text-xs">Hazır Ayar</span>
                        <div className="flex-1 ml-4 relative">
                            <CustomSelect 
                                value={selectedPresetId}
                                onChange={(val) => handlePresetChange(val)}
                                options={presets.map(p => ({ label: p.name, value: p.id }))}
                                placeholder="Seçiniz..."
                                className="h-10"
                            />
                        </div>
                    </div>
                </>
            )}
            </div>
        </div>
      </div>

    </div>
  );
};

export default SessionConfigPage;