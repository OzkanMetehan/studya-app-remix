
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { Book, UserModel } from '../../types';
import { BOOK_SUBJECTS } from '../../constants';

interface Props {
  user: UserModel;
  onClose: () => void;
  onSave: (book: Partial<Book>) => void;
}

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
        className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 outline-none font-bold text-[#5A4A42] shadow-sm flex items-center justify-between transition-colors active:bg-[#FCEBB6]" 
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[#5A4A42] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-orange-100/50">
           {/* Approx 4 items visible */}
           <div className="max-h-[160px] overflow-y-auto no-scrollbar">
             {options.length > 0 ? (
                 options.map((opt) => (
                   <div 
                     key={opt.value} 
                     onClick={() => {
                       onChange(opt.value);
                       setIsOpen(false);
                     }}
                     className={`px-4 py-3 text-sm font-bold text-[#3D3D3D] hover:bg-[#FDE8A8]/30 cursor-pointer border-b border-gray-100 last:border-0 ${opt.value === value ? 'bg-[#FDE8A8]/50' : ''}`}
                   >
                     {opt.label}
                   </div>
                 ))
             ) : (
                <div className="px-4 py-3 text-sm text-gray-400 font-medium italic">Seçenek yok</div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

const AddBookModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [publisher, setPublisher] = useState('');
  const [subject, setSubject] = useState('');
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [year, setYear] = useState<string>('');
  const [page, setPage] = useState('');
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for input navigation
  const yearRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLInputElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  // Determine visibility of AYT button based on user targets
  const hasAYTTarget = user.targetExams.some(t => t.includes('AYT'));

  // Effect to enforce exam type rules based on subject
  useEffect(() => {
    if (subject === 'İngilizce') {
        setExamTypes(['YDT']);
    } else if (subject) {
        // If subject is NOT English, remove YDT if present
        if (examTypes.includes('YDT')) {
            setExamTypes(prev => prev.filter(t => t !== 'YDT'));
        }
    }
  }, [subject]);

  const toggleExam = (type: string) => {
    if (type === 'YDT') return; // Should be handled by subject logic

    let current = [...examTypes];
    // Remove YDT if switching to TYT/AYT manual toggle (safety check)
    if (current.includes('YDT')) {
        current = [];
    }
    
    if (current.includes(type)) {
        current = current.filter(t => t !== type);
    } else {
        current.push(type);
    }
    setExamTypes(current);
    if (error) setError(null);
  };

  const handleSave = () => {
    if (!publisher || !subject) return;

    if (examTypes.length === 0) {
        setError('Lütfen en az bir sınav türü seçiniz.');
        return;
    }

    const newBook: Partial<Book> = {
      title: publisher, // Using Publisher input as Title based on user request/design interpretation
      category: subject,
      year: parseInt(year) || undefined,
      totalQuestions: parseInt(question) || 0,
      progress: 0,
      color: '#FFF8E7',
      // Add other defaults
      solvedQuestions: 0,
      lastSolvedDate: '-',
      timeSpent: '0dk',
      qpm: 0,
      accuracy: 0,
      rating: 0,
      topics: [],
      examTypes: examTypes
    };

    onSave(newBook);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (nextRef && nextRef.current) {
            nextRef.current.focus();
        } else {
            // If no next ref, assume it's the last field and save
            handleSave();
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            {/* Dark Overlay */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="relative bg-[#6E9C9E] w-full max-w-sm rounded-[30px] p-6 shadow-2xl animate-fadeIn">
                
                {/* Header */}
                <div className="flex items-center mb-8">
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center -ml-2 text-white">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 5L7 12L16 19Z" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Publisher */}
                    <div>
                        <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30">YAYINEVİ</label>
                        <input 
                            type="text" 
                            value={publisher}
                            onChange={(e) => setPublisher(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, yearRef)}
                            className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 outline-none font-bold text-[#5A4A42] shadow-sm" 
                            autoFocus
                        />
                    </div>

                    {/* Subject Dropdown */}
                    <div>
                        <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30">DERS</label>
                        <ModalSelect 
                            value={subject}
                            onChange={setSubject}
                            options={BOOK_SUBJECTS.map(s => ({ label: s, value: s }))}
                            placeholder="Seçiniz..."
                        />
                    </div>

                    {/* Exam Type Selector */}
                    <div>
                        <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30">SINAV TÜRÜ</label>
                        
                        {subject === 'İngilizce' ? (
                            <div className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 flex items-center justify-center font-bold text-[#5A4A42] shadow-sm opacity-100 cursor-not-allowed">
                                <span className="flex items-center gap-2">
                                    YDT <span className="text-[10px] opacity-60">(Zorunlu)</span>
                                </span>
                            </div>
                        ) : (
                            <div className="w-full h-10 bg-[#FDE8A8] rounded-full px-1 flex items-center justify-center gap-1 font-bold text-[#5A4A42] shadow-sm select-none p-1">
                                <button 
                                    onClick={() => toggleExam('TYT')}
                                    className={`flex-1 h-full rounded-full flex items-center justify-center transition-all ${examTypes.includes('TYT') ? 'bg-white shadow-sm text-orange-500 scale-95' : 'hover:bg-white/30 text-[#5A4A42]/60'}`}
                                >
                                    TYT
                                </button>
                                {hasAYTTarget && (
                                    <button 
                                        onClick={() => toggleExam('AYT')}
                                        className={`flex-1 h-full rounded-full flex items-center justify-center transition-all ${examTypes.includes('AYT') ? 'bg-white shadow-sm text-orange-500 scale-95' : 'hover:bg-white/30 text-[#5A4A42]/60'}`}
                                    >
                                        AYT
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {error && (
                            <div className="flex items-center gap-1 mt-1 ml-1 text-[10px] text-[#FDE8A8] font-bold animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Year */}
                    <div className="pt-2">
                        <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30 text-center">YIL</label>
                        <input 
                            ref={yearRef}
                            type="number" 
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, pageRef)}
                            placeholder="2025"
                            className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 outline-none font-bold text-[#5A4A42] shadow-sm text-center placeholder-orange-900/20" 
                        />
                    </div>

                    {/* Page & Question Row */}
                    <div className="flex gap-4 pt-2">
                        <div className="flex-1">
                            <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30 text-center">SAYFA</label>
                            <input 
                                ref={pageRef}
                                type="number" 
                                value={page}
                                onChange={(e) => setPage(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, questionRef)}
                                className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 outline-none font-bold text-[#5A4A42] shadow-sm text-center" 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-white text-xs font-bold mb-1 ml-1 uppercase tracking-wide underline decoration-white/30 text-center">SORU</label>
                            <input 
                                ref={questionRef}
                                type="number" 
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, null)}
                                className="w-full h-10 bg-[#FDE8A8] rounded-full px-4 outline-none font-bold text-[#5A4A42] shadow-sm text-center" 
                            />
                        </div>
                    </div>

                </div>

                {/* Plus Button */}
                <div className="flex justify-center mt-8 -mb-12">
                    <button 
                        onClick={handleSave}
                        className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-md border-4 border-white/40 hover:scale-105 transition-transform active:scale-95 shadow-lg"
                    >
                        <Plus className="w-10 h-10 text-white" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AddBookModal;
