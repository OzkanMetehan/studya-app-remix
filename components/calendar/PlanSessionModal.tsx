
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SESSION_SUBJECTS, SESSION_TOPICS } from '../../constants';
import { PlannedSession } from '../../types';

interface Props {
  date: Date;
  onClose: () => void;
  onSave: (plan: PlannedSession) => void;
  onCycle?: (delta: number) => void;
  onSwitchToManual?: () => void; // Legacy callback
}

// Reusable Select (Matches ManualSessionModal style)
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
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 max-h-[160px] overflow-y-auto no-scrollbar">
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

const PlanSessionModal: React.FC<Props> = ({ date, onClose, onSave, onCycle, onSwitchToManual }) => {
  const [subject, setSubject] = useState(SESSION_SUBJECTS[0]);
  const [topic, setTopic] = useState(SESSION_TOPICS[SESSION_SUBJECTS[0]][0]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  
  // Initialize time. If today, ensure it's future
  const isToday = new Date().toDateString() === date.toDateString();
  const [time, setTime] = useState(() => {
      if (isToday) {
          const now = new Date();
          now.setMinutes(now.getMinutes() + 5); // Default to now + 5 mins
          return now.toTimeString().slice(0,5);
      }
      return '14:00';
  });

  const handleSubjectChange = (val: string) => {
      setSubject(val);
      setTopic(SESSION_TOPICS[val][0]);
  };

  const handleSave = () => {
      if (isToday) {
          const now = new Date();
          const [h, m] = time.split(':').map(Number);
          const selectedTime = new Date(date);
          selectedTime.setHours(h, m, 0, 0);
          
          if (selectedTime <= now) {
              alert("Lütfen ileri bir saat seçiniz.");
              return;
          }
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      const plan: PlannedSession = {
          id: `plan_${Date.now()}`,
          date: localDateStr,
          time,
          subject,
          topic,
          durationMinutes
      };
      onSave(plan);
      onClose();
  };

  const getCurrentTimeStr = () => {
      const now = new Date();
      return now.toTimeString().slice(0,5);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-[#FFFBEB] w-full max-w-sm h-auto rounded-[30px] p-6 shadow-2xl animate-fadeIn flex flex-col">
                
                {/* Header: Title with Cycling Arrows */}
                <div className="flex justify-between items-center mb-6 relative">
                    <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 pointer-events-auto">
                            {onCycle && (
                                <button onClick={() => onCycle(-1)} className="text-[#5A4A42] hover:bg-black/5 rounded-full p-1 transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <h2 className="text-xl font-bold text-[#5A4A42]">Oturum Planla</h2>
                            {onCycle && (
                                <button onClick={() => onCycle(1)} className="text-[#5A4A42] hover:bg-black/5 rounded-full p-1 transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="ml-auto z-10">
                        <button onClick={onClose} className="bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition-colors">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="flex-1 text-center text-sm font-bold text-[#5A4A42] bg-orange-100 py-2 rounded-xl flex items-center justify-center">
                        {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    
                    <div className="w-1/3 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center relative">
                        <input 
                            type="time" 
                            min={isToday ? getCurrentTimeStr() : undefined}
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full h-full bg-transparent text-center font-bold text-[#5A4A42] outline-none text-sm px-1"
                            style={{ colorScheme: 'light' }} 
                        />
                    </div>
                </div>

                {isToday && (
                    <div className="text-[10px] text-orange-600 bg-orange-50 px-3 py-1 rounded-lg mb-4 font-bold text-center">
                        İleri bir saat seçmelisiniz.
                    </div>
                )}

                <div className="space-y-4">
                    {/* Subject */}
                    <div>
                        <label className="text-xs font-bold text-[#888] ml-2">Ders & Konu</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <ModalSelect 
                                    value={subject}
                                    onChange={handleSubjectChange}
                                    options={SESSION_SUBJECTS.map(s => ({ label: s, value: s }))}
                                />
                            </div>
                            <div className="relative flex-1">
                                <ModalSelect 
                                    value={topic}
                                    onChange={setTopic}
                                    options={SESSION_TOPICS[subject]?.map(t => ({ label: t, value: t }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-xs font-bold text-[#888] ml-2">Planlanan Süre (Dakika)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full h-10 bg-white rounded-xl px-4 font-bold text-[#3D3D3D] shadow-sm outline-none border border-gray-100 placeholder-gray-300"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full mt-4 bg-[#2D3A31] hover:bg-[#3D4A41] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                    Planla
                </button>
            </div>
        </div>
    </div>
  );
};

export default PlanSessionModal;
