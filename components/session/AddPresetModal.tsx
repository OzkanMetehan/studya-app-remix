
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { SessionPreset } from '../../types';
import { SESSION_SUBJECTS, SESSION_TOPICS, LOCATIONS as DEFAULT_LOCATIONS } from '../../constants';

interface Props {
  onClose: () => void;
  onSave: (preset: SessionPreset) => void;
  initialData?: SessionPreset;
}

// Reusable Custom Select
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
        className="w-full h-9 bg-[#FDE8A8] rounded-xl px-4 font-bold text-[#5A4A42] shadow-sm flex items-center justify-between text-xs outline-none transition-colors active:bg-[#FCEBB6]" 
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 text-[#5A4A42] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-orange-100/50">
           <div className="max-h-[160px] overflow-y-auto no-scrollbar">
             {options.map((opt) => (
               <div 
                 key={opt.value} 
                 onClick={() => {
                   onChange(opt.value);
                   setIsOpen(false);
                 }}
                 className={`px-4 py-2 text-xs font-bold text-[#3D3D3D] hover:bg-[#FDE8A8]/30 cursor-pointer border-b border-gray-100 last:border-0 ${opt.value === value ? 'bg-[#FDE8A8]/50' : ''}`}
               >
                 {opt.label}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

const AddPresetModal: React.FC<Props> = ({ onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [subject, setSubject] = useState(initialData?.config?.subject || SESSION_SUBJECTS[0]);
  const [topic, setTopic] = useState(initialData?.config?.topic || SESSION_TOPICS[SESSION_SUBJECTS[0]][0]);
  const [durationMinutes, setDurationMinutes] = useState(initialData?.config?.durationMinutes || 40);
  const [breakReminder, setBreakReminder] = useState(initialData?.config?.breakReminderInterval || 0);
  const [activeLocations, setActiveLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [location, setLocation] = useState(initialData?.config?.location || DEFAULT_LOCATIONS[0]);

  // Load Locations dynamically on mount
  useEffect(() => {
    const savedLocs = localStorage.getItem('studya_all_locations');
    if (savedLocs) {
        const parsed = JSON.parse(savedLocs);
        if (parsed && parsed.length > 0) {
            setActiveLocations(parsed);
            // If editing and previous location not found (e.g. deleted), use first available
            if (!initialData && !parsed.includes(location)) {
                setLocation(parsed[0]);
            }
        }
    }
  }, []);

  const handleSave = () => {
      if (!name.trim()) return;

      const newPreset: SessionPreset = {
          id: initialData?.id || `preset_${Date.now()}`,
          name: name,
          config: {
              subject,
              topic,
              durationMinutes,
              breakReminderInterval: breakReminder,
              location
          }
      };
      onSave(newPreset);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal Content - Teal Background */}
            <div className="relative bg-[#6E9C9E] w-full max-w-sm rounded-[30px] p-6 shadow-2xl animate-fadeIn">
                
                {/* Header */}
                <div className="flex items-center mb-6 relative">
                    <button onClick={onClose} className="absolute left-0 w-8 h-8 flex items-center justify-center -ml-2 text-white">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 5L7 12L16 19Z" />
                        </svg>
                    </button>
                    <h2 className="w-full text-center text-xl font-bold text-white uppercase">{initialData ? 'AYARI DÜZENLE' : 'HAZIR AYAR'}</h2>
                </div>

                {/* Name Input */}
                <div className="mb-8">
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ayara isim ver (Örn: Hızlı Türkçe)"
                        className="w-full h-11 bg-[#FFF8E7] rounded-full px-6 text-center font-bold text-[#5A4A42] placeholder-[#5A4A42]/40 outline-none shadow-inner"
                        autoFocus
                    />
                </div>

                <div className="space-y-4">
                    {/* Duration - Aligned Left */}
                    <div className="flex items-center justify-between">
                        <span className="w-24 bg-[#F3C568] py-1.5 rounded-full text-center text-xs font-bold text-[#5A4A42] shadow-sm flex-shrink-0">
                            Süre
                        </span>
                        <div className="flex-1 ml-3 flex justify-start">
                            <div className="w-20 h-9 bg-[#FDE8A8] rounded-xl flex items-center justify-center font-bold text-[#5A4A42]">
                                <input 
                                    type="number"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-full h-full bg-transparent text-center outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="flex items-center justify-between">
                        <span className="w-24 bg-[#F3C568] py-1.5 rounded-full text-center text-xs font-bold text-[#5A4A42] shadow-sm flex-shrink-0">
                            Dersler
                        </span>
                        <div className="flex-1 ml-3">
                            <ModalSelect 
                                value={subject}
                                onChange={(v) => {
                                    setSubject(v);
                                    setTopic(SESSION_TOPICS[v][0]);
                                }}
                                options={SESSION_SUBJECTS.map(s => ({ label: s, value: s }))}
                            />
                        </div>
                    </div>

                    {/* Topics */}
                    <div className="flex items-center justify-between">
                        <span className="w-24 bg-[#F3C568] py-1.5 rounded-full text-center text-xs font-bold text-[#5A4A42] shadow-sm flex-shrink-0">
                            Konular
                        </span>
                        <div className="flex-1 ml-3">
                            <ModalSelect 
                                value={topic}
                                onChange={setTopic}
                                options={SESSION_TOPICS[subject]?.map(t => ({ label: t, value: t }))}
                            />
                        </div>
                    </div>

                    {/* Break Reminder - Aligned Left */}
                    <div className="flex items-center justify-between">
                        <span className="w-24 bg-[#F3C568] py-1.5 rounded-full text-center text-xs font-bold text-[#5A4A42] shadow-sm leading-tight flex items-center justify-center flex-shrink-0 min-h-[28px]">
                            Mola<br/>Hatırlatıcı
                        </span>
                        <div className="flex-1 ml-3 flex justify-start">
                            <div className="w-20 h-9 bg-[#FDE8A8] rounded-xl flex items-center justify-center font-bold text-[#5A4A42]">
                                <input 
                                    type="number"
                                    value={breakReminder}
                                    onChange={(e) => setBreakReminder(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full h-full bg-transparent text-center outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between">
                        <span className="w-24 bg-[#F3C568] py-1.5 rounded-full text-center text-xs font-bold text-[#5A4A42] shadow-sm flex-shrink-0">
                            Konum
                        </span>
                        <div className="flex-1 ml-3">
                            <ModalSelect 
                                value={location}
                                onChange={setLocation}
                                options={activeLocations.map(l => ({ label: l, value: l }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-center mt-8 -mb-10">
                    <button 
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="bg-[#FDE8A8] text-[#5A4A42] px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        Kaydet
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};

export default AddPresetModal;
