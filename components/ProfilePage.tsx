import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Pencil, Share, Settings as SettingsIcon, LogOut, ChevronDown, Plus, MapPin, Sliders, X, Trophy, Target, Zap, Clock, BookOpen, Star, Cpu, Hammer, RefreshCw, Award, Library, Flame, Book, Gem, Atom, Sunrise, Moon, Calendar, RotateCcw, Timer, Wind, Footprints, Leaf, GraduationCap, TestTube, Calculator, Scroll, Feather, Clover, Sigma, Check, Edit2, Trash2, Volume2, Bell, Info, Heart, Coffee, Github, Twitter, Lock, Globe, Languages, Users } from 'lucide-react';
import { UserModel, SessionPreset } from '../types';
import { getMockDayData, APP_START_DATE, SIMULATED_TODAY, PRESETS as DEFAULT_PRESETS, LOCATIONS as DEFAULT_LOCATIONS, MOODS as DEFAULT_MOODS } from '../constants';
import { sessionService } from '../services/sessionService';
import { bookService } from '../services/bookService';
import AddPresetModal from './session/AddPresetModal';
import LocationModal from './profile/LocationModal';
import MoodModal from './profile/MoodModal';
import EditProfileModal from './profile/EditProfileModal';

interface Props {
  user: UserModel;
  onUpdateUser: (data: Partial<UserModel>) => void;
  isDevMode: boolean;
  onToggleDevMode: (enabled: boolean) => void;
}

// Helper Icon Component
const FlameIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.246-5.318 6-6.5 1.5 2.5 1.178 5.82 4 8.512" />
    <path d="M12.001 22a8.003 8.003 0 0 1-5.657-13.658" />
  </svg>
);

// Badge Definition Template
interface BadgeTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isTiered?: boolean;
}

const BADGE_TEMPLATES: BadgeTemplate[] = [
    // --- Scientist Badges (1000 Questions) ---
    { id: 'nazim_hikmet', title: 'Bana Nazım Hikmet diyebilirsin!', description: '1000 Türkçe sorusu çöz.', icon: Feather, color: 'text-fuchsia-600' },
    { id: 'sirri_erinc', title: 'Bana Sırrı Erinç diyebilirsin!', description: '1000 Coğrafya sorusu çöz.', icon: Globe, color: 'text-amber-600' },
    { id: 'halil_inalcik', title: 'Bana Halil İnalcık diyebilirsin!', description: '1000 Tarih sorusu çöz.', icon: Scroll, color: 'text-orange-600' },
    { id: 'hilmi_ziya', title: 'Bana Hilmi Ziya diyebilirsin!', description: '1000 Felsefe sorusu çöz.', icon: BookOpen, color: 'text-indigo-600' },
    { id: 'alim', title: 'Bana Alim diyebilirsin!', description: '1000 Din Kültürü sorusu çöz.', icon: BookOpen, color: 'text-emerald-600' },
    { id: 'shakespeare', title: 'Bana Shakespeare diyebilirsin!', description: '1000 İngilizce sorusu çöz.', icon: Languages, color: 'text-violet-600' },
    
    { id: 'cahit_arf', title: 'Bana Cahit Arf diyebilirsin!', description: '1000 Matematik sorusu çöz.', icon: Sigma, color: 'text-blue-600' },
    { id: 'ratip_berker', title: 'Bana Ratip Berker diyebilirsin!', description: '1000 Geometri sorusu çöz.', icon: Calculator, color: 'text-cyan-600' },
    { id: 'feza_gursey', title: 'Bana Feza Gürsey diyebilirsin!', description: '1000 Fizik sorusu çöz.', icon: Atom, color: 'text-violet-600' },
    { id: 'aziz_sancar', title: 'Bana Aziz Sancar diyebilirsin!', description: '1000 Kimya sorusu çöz.', icon: TestTube, color: 'text-teal-600' },
    { id: 'aykut_kence', title: 'Bana Aykut Kence diyebilirsin!', description: '1000 Biyoloji sorusu çöz.', icon: Leaf, color: 'text-green-600' },

    // --- Tiered Badges ---
    { id: 'devoted', title: 'Adanmış', description: 'Kesintisiz çalışma serisi yap.', icon: FlameIcon, color: 'text-orange-600', isTiered: true },
    { id: 'scientist', title: 'Bilim İnsanı', description: 'Fen derslerinden soru çöz.', icon: Atom, color: 'text-cyan-600', isTiered: true },
    { id: 'sociologist', title: 'Sosyolog', description: 'Sosyal bilimler derslerinden soru çöz.', icon: Users, color: 'text-rose-600', isTiered: true },
    { id: 'converter', title: 'Dönüştürücü', description: '%90+ doğrulukla oturum tamamla.', icon: RefreshCw, color: 'text-green-600', isTiered: true },
    { id: 'laborer', title: 'Emekçi', description: 'Toplam çalışma saatini artır.', icon: Hammer, color: 'text-stone-600', isTiered: true },
    { id: 'processor', title: 'İşlemci', description: 'Toplam soru sayısını artır.', icon: Cpu, color: 'text-blue-600', isTiered: true },
    { id: 'bookworm', title: 'Kitap Kurdu', description: 'Kitap bitir.', icon: Book, color: 'text-emerald-600', isTiered: true },
    { id: 'veteran', title: 'Kıdemli', description: 'Aktif gün sayısını artır.', icon: Award, color: 'text-purple-600', isTiered: true },
    { id: 'collector', title: 'Koleksiyoner', description: 'Farklı rozetler kazan.', icon: Gem, color: 'text-pink-600', isTiered: true },
    { id: 'librarian', title: 'Kütüphaneci', description: 'Kitaplığına kitap ekle.', icon: Library, color: 'text-yellow-600', isTiered: true },

    // --- One-Time Badges ---
    { id: 'perfect_session', title: 'Dört Dörtlük', description: '40+ soruluk bir oturumda 0 yanlış, 0 boş.', icon: Target, color: 'text-rose-600' },
    { id: 'night_owl', title: 'Gece Baykuşu', description: 'Gece 00:00 - 05:00 arasında bir oturum başlat.', icon: Moon, color: 'text-slate-600' },
    { id: 'comeback_kid', title: 'Gözümüz Yollarda', description: '7 gün aradan sonra geri dön.', icon: RotateCcw, color: 'text-gray-600' },
    { id: 'weekend_warrior', title: 'Hafta Sonu Şampiyonu', description: 'Hafta sonları çalışmayı alışkanlık edin.', icon: Calendar, color: 'text-orange-500' },
    { id: 'speedrunner', title: 'Hız Koşucusu', description: 'Bir oturumda %75+ doğrulukla 2.0 dbs hızına ulaş.', icon: Wind, color: 'text-blue-500' },
    { id: 'first_step', title: 'İlk Adım', description: 'İlk çalışma oturumunu tamamla.', icon: Footprints, color: 'text-lime-600' },
    { id: 'leprechaun', title: 'Leprikon', description: 'Uygulamadaki gizli sürprizi bul!', icon: Clover, color: 'text-green-500' },
    { id: 'marathon_mind', title: 'Maraton Kafası', description: 'Tek seferde 3 saatten uzun çalış.', icon: Timer, color: 'text-red-500' },
    { id: 'early_bird', title: 'Sabah Kuşu', description: 'Sabah 05:00 - 07:00 arasında bir oturum başlat.', icon: Sunrise, color: 'text-yellow-600' },
    { id: 'subject_expert', title: 'Uzmanlık Alanı', description: 'Bir dersin tüm konularını %100 tamamla.', icon: GraduationCap, color: 'text-violet-600' },
    { id: 'zen_mode', title: 'Zen Modu', description: '1 saatlik oturumu hiç duraklatmadan bitir.', icon: Leaf, color: 'text-green-700' },
];

interface CalculatedBadge extends BadgeTemplate {
    progress: number;
    max: number;
    tier: number; // 0: Locked, 1: Bronze, 2: Silver, 3: Gold, 4: Prismatic
    isLocked: boolean;
}

// 4 Tiers Thresholds
// [Bronze, Silver, Gold, Prismatic]
const TIER_THRESHOLDS: Record<string, number[]> = {
    processor: [1000, 5000, 15000, 50000],
    laborer: [20, 100, 250, 1000], // Hours
    converter: [10, 50, 200, 1000], // Sessions
    veteran: [14, 60, 180, 365], // Days
    librarian: [5, 15, 50, 100], // Books
    devoted: [7, 30, 90, 365], // Streak
    bookworm: [1, 5, 20, 50], // Finished Books
    scientist: [500, 2500, 7500, 15000],
    sociologist: [500, 2500, 7500, 15000],
    collector: [5, 10, 20, 30] // Badges
};

// Helper for Tier Colors
const getTierColor = (tier: number) => {
    if (tier === 1) return { border: 'border-[#cd7f32]', bg: 'bg-[#cd7f32]', name: 'Bronz' };
    if (tier === 2) return { border: 'border-[#c0c0c0]', bg: 'bg-[#c0c0c0]', name: 'Gümüş' };
    if (tier === 3) return { border: 'border-[#fbbf24]', bg: 'bg-[#fbbf24]', name: 'Altın' };
    if (tier === 4) return { border: 'border-purple-400', bg: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500', name: 'Efsanevi' }; // Prismatic
    return { border: 'border-gray-200', bg: 'bg-gray-200', name: 'Kilitli' };
};

const SOUND_OPTIONS = ['Melodi', 'Zil', 'Alarm', 'Sessiz'];

const NOTIFICATION_TYPES = [
    { id: 'streak', label: 'Seri' },
    { id: 'neglect', label: 'İhmal Köşesi' },
    { id: 'plan', label: 'Plan Hatırlatıcı' },
    { id: 'weekly', label: 'Haftalık Özet' },
];

const BadgeDiamond: React.FC<{ tier: number }> = ({ tier }) => {
    const style = getTierColor(tier);
    return (
        <div 
            className={`w-3 h-3 ${style.bg} shadow-sm`} 
            style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        />
    );
};

const ProfilePage: React.FC<Props> = ({ user, onUpdateUser, isDevMode, onToggleDevMode }) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'preferences' | 'settings'>('badges');

  // --- Preference States ---
  // Sound
  const [sound, setSound] = useState('Melodi');
  
  // Notifications
  const [notifSettings, setNotifSettings] = useState({
      streak: true,
      neglect: true,
      plan: true,
      weekly: true
  });

  // Location States
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  
  // Location Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

  // Mood States
  const [allMoods, setAllMoods] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [isMoodDropdownOpen, setIsMoodDropdownOpen] = useState(false);
  const moodDropdownRef = useRef<HTMLDivElement>(null);

  // Mood Modal State
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [editingMoodIndex, setEditingMoodIndex] = useState<number | null>(null);

  // Preset States
  const [presets, setPresets] = useState<SessionPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [editingPreset, setEditingPreset] = useState<SessionPreset | null>(null);
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  // --- Modal States ---
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Badge Details & Selection
  const [selectedBadgeForDetail, setSelectedBadgeForDetail] = useState<CalculatedBadge | null>(null);
  const [swappingSlotIndex, setSwappingSlotIndex] = useState<number | null>(null);

  // Dev Mode Password State
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');

  // Load Preferences on Mount
  useEffect(() => {
    // Load Sound
    const savedSound = localStorage.getItem('studya_pref_sound');
    if (savedSound) setSound(savedSound);

    // Load Notifications
    const savedNotifs = localStorage.getItem('studya_pref_notifs');
    if (savedNotifs) {
        setNotifSettings(JSON.parse(savedNotifs));
    }

    // Load Locations
    const savedLocations = localStorage.getItem('studya_all_locations');
    if (savedLocations) {
        const parsed = JSON.parse(savedLocations);
        setAllLocations(parsed);
        if (parsed.length > 0) setSelectedLocation(parsed[0]);
    } else {
        // Initialize with default constants
        setAllLocations(DEFAULT_LOCATIONS);
        setSelectedLocation(DEFAULT_LOCATIONS[0]);
        localStorage.setItem('studya_all_locations', JSON.stringify(DEFAULT_LOCATIONS));
    }

    // Load Moods
    const savedMoods = localStorage.getItem('studya_all_moods');
    if (savedMoods) {
        const parsed = JSON.parse(savedMoods);
        setAllMoods(parsed);
        if (parsed.length > 0) setSelectedMood(parsed[0]);
    } else {
        // Initialize with default constants
        setAllMoods(DEFAULT_MOODS);
        setSelectedMood(DEFAULT_MOODS[0]);
        localStorage.setItem('studya_all_moods', JSON.stringify(DEFAULT_MOODS));
    }

    // Load Presets
    const savedPresets = localStorage.getItem('studya_presets');
    if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
    } else {
        // Initialize with default string presets converted to objects
        const defaults = DEFAULT_PRESETS.map((p, i) => ({
            id: `default_${i}`,
            name: p,
            config: {}
        }));
        setPresets(defaults);
        if (defaults.length > 0) setSelectedPreset(defaults[0].name);
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(event.target as Node)) {
        setIsPresetDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(event.target as Node)) {
        setIsMoodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Sound & Notification Handlers ---
  const cycleSound = () => {
      const idx = SOUND_OPTIONS.indexOf(sound);
      const next = SOUND_OPTIONS[(idx + 1) % SOUND_OPTIONS.length];
      setSound(next);
      localStorage.setItem('studya_pref_sound', next);
  };

  const toggleNotif = (key: string) => {
      setNotifSettings(prev => {
          const next = { ...prev, [key]: !prev[key as keyof typeof prev] };
          localStorage.setItem('studya_pref_notifs', JSON.stringify(next));
          return next;
      });
  };

  // --- Location Handlers ---
  const handleSaveLocation = (val: string) => {
      let updatedList = [...allLocations];
      if (editingLocationIndex !== null) {
          // Edit existing
          updatedList[editingLocationIndex] = val;
      } else {
          // Add new
          if (!updatedList.includes(val)) {
              updatedList.push(val);
          }
      }
      setAllLocations(updatedList);
      localStorage.setItem('studya_all_locations', JSON.stringify(updatedList));
      setSelectedLocation(val);
      setIsLocationModalOpen(false);
      setEditingLocationIndex(null);
  };

  const handleDeleteLocation = (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const updatedList = allLocations.filter((_, i) => i !== index);
      setAllLocations(updatedList);
      localStorage.setItem('studya_all_locations', JSON.stringify(updatedList));
      
      if (selectedLocation === allLocations[index]) {
          setSelectedLocation(updatedList.length > 0 ? updatedList[0] : '');
      }
  };

  const handleEditLocation = (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingLocationIndex(index);
      setIsLocationModalOpen(true);
      setIsLocationDropdownOpen(false);
  };

  const handleOpenAddLocation = () => {
      setEditingLocationIndex(null);
      setIsLocationModalOpen(true);
  };

  // --- Mood Handlers ---
  const handleSaveMood = (val: string) => {
      let updatedList = [...allMoods];
      if (editingMoodIndex !== null) {
          updatedList[editingMoodIndex] = val;
      } else {
          if (!updatedList.includes(val)) {
              updatedList.push(val);
          }
      }
      setAllMoods(updatedList);
      localStorage.setItem('studya_all_moods', JSON.stringify(updatedList));
      setSelectedMood(val);
      setIsMoodModalOpen(false);
      setEditingMoodIndex(null);
  };

  const handleDeleteMood = (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const updatedList = allMoods.filter((_, i) => i !== index);
      setAllMoods(updatedList);
      localStorage.setItem('studya_all_moods', JSON.stringify(updatedList));
      
      if (selectedMood === allMoods[index]) {
          setSelectedMood(updatedList.length > 0 ? updatedList[0] : '');
      }
  };

  const handleEditMood = (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingMoodIndex(index);
      setIsMoodModalOpen(true);
      setIsMoodDropdownOpen(false);
  };

  const handleOpenAddMood = () => {
      setEditingMoodIndex(null);
      setIsMoodModalOpen(true);
  };

  // --- Preset Handlers ---
  const handleSavePreset = (preset: SessionPreset) => {
      let updatedPresets;
      const existingIndex = presets.findIndex(p => p.id === preset.id);
      
      if (existingIndex >= 0) {
          updatedPresets = [...presets];
          updatedPresets[existingIndex] = preset;
      } else {
          updatedPresets = [...presets, preset];
      }

      setPresets(updatedPresets);
      localStorage.setItem('studya_presets', JSON.stringify(updatedPresets));
      setSelectedPreset(preset.name);
      setIsPresetModalOpen(false);
      setEditingPreset(null);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove immediately without confirmation
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('studya_presets', JSON.stringify(updated));
    
    // If selected was deleted, pick the first one or clear
    if (selectedPreset === presets.find(p => p.id === id)?.name) {
        setSelectedPreset(updated.length > 0 ? updated[0].name : '');
    }
  };

  const handleEditPreset = (preset: SessionPreset, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPreset(preset);
    setIsPresetModalOpen(true);
    setIsPresetDropdownOpen(false);
  };

  const handleOpenAddPreset = () => {
    setEditingPreset(null);
    setIsPresetModalOpen(true);
  };
  
  // --- Dev Mode Handlers ---
  const handleDevToggle = () => {
      if (isDevMode) {
          // Turn OFF immediately
          onToggleDevMode(false);
      } else {
          // Turn ON requires password
          setDevPasswordInput('');
          setShowDevPassword(true);
      }
  };

  const handleDevPasswordSubmit = () => {
      if (devPasswordInput === 'studya_dev') {
          onToggleDevMode(true);
          setShowDevPassword(false);
      } else {
          alert("Hatalı şifre!");
      }
  };

  // --- BADGE CALCULATIONS ---
  const badgeStats = useMemo(() => {
    // Aggregators
    let totalQuestions = 0;
    let totalSeconds = 0;
    let totalSessions = 0;
    
    // Subject specific
    const subjectStats: Record<string, { q: number, c: number }> = {};
    const initSubject = (s: string) => { if (!subjectStats[s]) subjectStats[s] = { q: 0, c: 0 }; };

    // Badge specific trackers
    let scienceQuestions = 0;
    let socialQuestions = 0;
    let highAccSessions = 0;
    let activeDays = new Set<string>();
    
    let earlyBirdCount = 0;
    let nightOwlCount = 0;
    let weekendCount = 0;
    let maxGap = 0;
    let marathonCount = 0;
    let speedrunnerCount = 0;
    let zenCount = 0;
    let perfectSessions = 0;

    const SCIENCE_SUBJECTS = ['Fizik', 'Kimya', 'Biyoloji'];
    const SOCIAL_SUBJECTS = ['Tarih', 'Coğrafya', 'Felsefe', 'Türkçe', 'Din Kültürü ve Ahlak Bilgisi'];

    // 1. ITERATE MOCK HISTORY (ONLY IF DEV MODE)
    const datesWithActivity: Date[] = [];

    if (isDevMode) {
        const current = new Date(APP_START_DATE);
        const end = new Date(SIMULATED_TODAY);
        current.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        while(current <= end) {
            const m = getMockDayData(new Date(current));
            if (m.val > 0 || ['sick', 'saved', 'rest'].includes(m.status)) {
                datesWithActivity.push(new Date(current));
                
                totalQuestions += m.val;
                totalSeconds += m.durationSeconds;
                totalSessions += m.sessionCount;
                activeDays.add(current.toISOString().split('T')[0]);

                m.subjects.forEach(s => {
                    initSubject(s.name);
                    subjectStats[s.name].q += s.val;
                    const estCorrect = Math.round(s.val * (m.correct / m.val));
                    subjectStats[s.name].c += estCorrect;

                    if (SCIENCE_SUBJECTS.includes(s.name)) {
                        scienceQuestions += s.val;
                    }
                    if (SOCIAL_SUBJECTS.includes(s.name)) {
                        socialQuestions += s.val;
                    }
                });

                if (m.val > 0 && (m.correct/m.val) > 0.90) highAccSessions += 1;
                
                const day = current.getDay();
                if (day === 0 || day === 6) weekendCount++;
            }
            current.setDate(current.getDate() + 1);
        }
    }

    // 2. ITERATE REAL SESSIONS
    const realSessions = sessionService.getAllSessions();
    realSessions.forEach(s => {
        const d = new Date(s.completedAt);
        const dateStr = d.toISOString().split('T')[0];
        datesWithActivity.push(d);
        activeDays.add(dateStr);

        totalQuestions += s.questions;
        totalSeconds += s.durationSeconds;
        totalSessions += 1;

        // Process Subject Stats (Handles Mock Deneme Topics)
        const processSubjectStats = (subjName: string, q: number, c: number) => {
             let normalized = subjName;
             // Normalizations for Badges
             if (normalized === 'Din Kültürü') normalized = 'Din Kültürü ve Ahlak Bilgisi';
             if (normalized === 'Tarih-1' || normalized === 'Tarih-2') normalized = 'Tarih';
             if (normalized === 'Coğrafya-1' || normalized === 'Coğrafya-2') normalized = 'Coğrafya';
             if (normalized === 'Edebiyat' || normalized === 'Türk Dili ve Edebiyatı') normalized = 'Türkçe'; // Map Literature to Turkish for badges

             initSubject(normalized);
             subjectStats[normalized].q += q;
             subjectStats[normalized].c += c;

             if (SCIENCE_SUBJECTS.includes(normalized)) {
                 scienceQuestions += q;
             }
             if (SOCIAL_SUBJECTS.includes(normalized)) {
                 socialQuestions += q;
             }
        };

        if (s.config.isMockTest && s.topicStats && s.topicStats.length > 0) {
             s.topicStats.forEach(t => {
                 processSubjectStats(t.topic, t.questions, t.correct);
             });
        } else {
             processSubjectStats(s.config.subject, s.questions, s.correct);
        }

        if (s.questions > 10 && (s.correct/s.questions) >= 0.9) highAccSessions++;

        const hour = d.getHours();
        
        // Sabah Kuşu: 05:00 - 07:00 (Stricter range)
        if (hour >= 5 && hour < 7) earlyBirdCount++;
        
        // Gece Baykuşu: 00:00 - 05:00 (Stricter range)
        if (hour >= 0 && hour < 5) nightOwlCount++;
        
        const day = d.getDay();
        if (day === 0 || day === 6) weekendCount++;

        if (s.durationSeconds > 3 * 3600) marathonCount++;
        if (s.durationSeconds > 3600) zenCount++;

        const mins = s.durationSeconds / 60;
        const qpm = mins > 0 ? s.questions / mins : 0;
        const acc = s.questions > 0 ? s.correct/s.questions : 0;
        if (qpm > 2 && acc > 0.75) speedrunnerCount++;

        if (s.questions >= 40 && s.wrong === 0 && s.empty === 0) perfectSessions++;
    });

    // 3. AGGREGATE STATS
    datesWithActivity.sort((a,b) => a.getTime() - b.getTime());
    for(let i=1; i<datesWithActivity.length; i++) {
        const diffTime = Math.abs(datesWithActivity[i].getTime() - datesWithActivity[i-1].getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays > maxGap) maxGap = diffDays;
    }

    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);
    
    const isActive = (d: Date) => activeDays.has(d.toISOString().split('T')[0]);
    
    if (!isActive(checkDate)) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (!isActive(checkDate)) streak = 0;
    }
    checkDate = new Date(today);
    if (!isActive(checkDate)) checkDate.setDate(checkDate.getDate() - 1);
    
    while(true) {
        if (isActive(checkDate)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    // Get books from service (respects dev mode)
    const currentBooks = bookService.getBooks();
    const totalBooks = currentBooks.length;
    const finishedBooks = currentBooks.filter(b => b.progress === 100).length;

    return {
        totalQuestions,
        totalHours: Math.floor(totalSeconds / 3600),
        totalSessions,
        scienceQuestions,
        socialQuestions,
        highAccSessions,
        activeDaysCount: activeDays.size,
        streak,
        earlyBirdCount,
        nightOwlCount,
        weekendCount,
        maxGap,
        marathonCount,
        zenCount,
        speedrunnerCount,
        perfectSessions,
        subjectStats,
        totalBooks,
        finishedBooks,
        booksInLibrary: totalBooks,
    };

  }, [isDevMode]);

  const calculatedBadges = useMemo(() => {
      // Helper to calculate tier
      const getTierInfo = (progress: number, thresholds: number[]) => {
          if (progress >= thresholds[3]) return { tier: 4, max: thresholds[3], next: null };
          if (progress >= thresholds[2]) return { tier: 3, max: thresholds[3], next: thresholds[3] };
          if (progress >= thresholds[1]) return { tier: 2, max: thresholds[2], next: thresholds[2] };
          if (progress >= thresholds[0]) return { tier: 1, max: thresholds[1], next: thresholds[1] };
          return { tier: 0, max: thresholds[0], next: thresholds[0] };
      };

      const badges: CalculatedBadge[] = BADGE_TEMPLATES.map(tmpl => {
          let progress = 0;
          let max = 1;
          let tier = 0;

          if (tmpl.isTiered) {
              const thresholds = TIER_THRESHOLDS[tmpl.id];
              if (thresholds) {
                  switch (tmpl.id) {
                      case 'processor': progress = badgeStats.totalQuestions; break;
                      case 'laborer': progress = badgeStats.totalHours; break;
                      case 'converter': progress = badgeStats.highAccSessions; break;
                      case 'veteran': progress = badgeStats.activeDaysCount; break;
                      case 'librarian': progress = badgeStats.booksInLibrary; break;
                      case 'devoted': progress = badgeStats.streak; break;
                      case 'bookworm': progress = badgeStats.finishedBooks; break;
                      case 'scientist': progress = badgeStats.scienceQuestions; break;
                      case 'sociologist': progress = badgeStats.socialQuestions; break;
                      case 'collector': progress = 0; break; // Calculated later
                  }
                  
                  const info = getTierInfo(progress, thresholds);
                  tier = info.tier;
                  max = info.max;
                  // For progress bar: if locked, goal is T1. If T1, goal is T2, etc.
                  // If max tier reached, fill bar.
              }
          } else {
              // One-time badges
              switch (tmpl.id) {
                // New Subject Scientist Badges
                case 'nazim_hikmet': progress = badgeStats.subjectStats['Türkçe']?.q || 0; max = 1000; break;
                case 'sirri_erinc': progress = badgeStats.subjectStats['Coğrafya']?.q || 0; max = 1000; break;
                case 'halil_inalcik': progress = badgeStats.subjectStats['Tarih']?.q || 0; max = 1000; break;
                case 'hilmi_ziya': progress = badgeStats.subjectStats['Felsefe']?.q || 0; max = 1000; break;
                case 'cahit_arf': progress = badgeStats.subjectStats['Matematik']?.q || 0; max = 1000; break;
                case 'ratip_berker': progress = badgeStats.subjectStats['Geometri']?.q || 0; max = 1000; break;
                case 'feza_gursey': progress = badgeStats.subjectStats['Fizik']?.q || 0; max = 1000; break;
                case 'aziz_sancar': progress = badgeStats.subjectStats['Kimya']?.q || 0; max = 1000; break;
                case 'aykut_kence': progress = badgeStats.subjectStats['Biyoloji']?.q || 0; max = 1000; break;
                case 'alim': progress = badgeStats.subjectStats['Din Kültürü ve Ahlak Bilgisi']?.q || 0; max = 1000; break;
                case 'shakespeare': progress = badgeStats.subjectStats['İngilizce']?.q || 0; max = 1000; break;

                case 'early_bird': progress = badgeStats.earlyBirdCount; max = 1; break;
                case 'night_owl': progress = badgeStats.nightOwlCount; max = 1; break;
                case 'weekend_warrior': progress = badgeStats.weekendCount; max = 8; break;
                case 'comeback_kid': progress = badgeStats.maxGap >= 7 ? 1 : 0; max = 1; break;
                case 'marathon_mind': progress = badgeStats.marathonCount; max = 1; break;
                case 'speedrunner': progress = badgeStats.speedrunnerCount; max = 1; break;
                case 'first_step': progress = badgeStats.totalSessions; max = 1; break;
                case 'zen_mode': progress = badgeStats.zenCount; max = 1; break;
                case 'perfect_session': progress = badgeStats.perfectSessions; max = 1; break;
                case 'leprechaun': progress = 0; max = 1; break;
                case 'subject_expert': progress = 0; max = 1; break;
                default: break;
              }
              // For one-time: Tier 3 (Gold) if achieved, 0 if not
              if (progress >= max) {
                  progress = max;
                  tier = 3; 
              } else {
                  tier = 0;
              }
          }

          return { ...tmpl, progress, max, tier, isLocked: tier === 0 };
      });

      // Special handling for Collector badge (depends on others)
      const collectorBadge = badges.find(b => b.id === 'collector');
      if (collectorBadge) {
          const unlockedCount = badges.filter(b => b.id !== 'collector' && b.tier > 0).length;
          collectorBadge.progress = unlockedCount;
          const info = getTierInfo(unlockedCount, TIER_THRESHOLDS['collector']);
          collectorBadge.tier = info.tier;
          collectorBadge.max = info.max;
          collectorBadge.isLocked = collectorBadge.tier === 0;
      }

      return badges.sort((a,b) => {
          // 1. Tier Descending (4 -> 0)
          if (b.tier !== a.tier) return b.tier - a.tier;

          // 2. One-Time vs Tiered (One-time first)
          // isTiered: undefined/false -> One-time
          // isTiered: true -> Tiered
          const aIsOneTime = !a.isTiered;
          const bIsOneTime = !b.isTiered;
          if (aIsOneTime !== bIsOneTime) return aIsOneTime ? -1 : 1;

          // 3. Percentage Descending
          const pA = Math.min(100, (a.progress / a.max) * 100);
          const pB = Math.min(100, (b.progress / b.max) * 100);
          if (pB !== pA) return pB - pA;

          // 4. Alphabetical Ascending
          return a.title.localeCompare(b.title);
      });
  }, [badgeStats]);

  const profileStats = useMemo(() => {
      const h = Math.floor(badgeStats.totalHours);
      return {
          questions: badgeStats.totalQuestions,
          timeStr: `${h}s`,
          sessions: badgeStats.totalSessions
      };
  }, [badgeStats]);

  // --- Showcase Logic ---
  const earnedBadges = useMemo(() => calculatedBadges.filter(b => !b.isLocked), [calculatedBadges]);
  
  const showcaseBadges = useMemo(() => {
      if (user.showcaseBadgeIds && user.showcaseBadgeIds.length > 0) {
          return user.showcaseBadgeIds.map(id => calculatedBadges.find(b => b.id === id)).filter(Boolean) as CalculatedBadge[];
      }
      // Default: Top 6 earned badges alphabetically
      return [...earnedBadges].sort((a,b) => a.title.localeCompare(b.title)).slice(0, 6);
  }, [user.showcaseBadgeIds, calculatedBadges, earnedBadges]);

  const handleBadgeClick = (badge: CalculatedBadge, index: number) => {
      // Open detail modal for showcase
      setSelectedBadgeForDetail(badge);
      setSwappingSlotIndex(index); 
  };

  const handleSwapClick = () => {
      setShowAllBadges(true);
      // Close detail to show list
      setSelectedBadgeForDetail(null);
  };

  const handleSelectBadgeForSlot = (badgeId: string) => {
      if (swappingSlotIndex === null) return;
      
      // Initialize with current display if user hasn't saved a config yet
      let currentIds = user.showcaseBadgeIds || [];
      if (currentIds.length === 0) {
          currentIds = showcaseBadges.map(b => b.id);
      }
      
      // Ensure the array is big enough if we are adding to a new slot
      const newShowcaseIds = [...currentIds];
      while (newShowcaseIds.length <= swappingSlotIndex) {
          newShowcaseIds.push('');
      }
      
      // Check if badge is already in showcase, if so, swap them
      const existingIndex = newShowcaseIds.indexOf(badgeId);
      if (existingIndex !== -1 && existingIndex !== swappingSlotIndex) {
          // Swap logic
          const temp = newShowcaseIds[swappingSlotIndex];
          newShowcaseIds[swappingSlotIndex] = badgeId;
          newShowcaseIds[existingIndex] = temp;
      } else {
          // Replace logic
          newShowcaseIds[swappingSlotIndex] = badgeId;
      }
      
      // Filter out empty strings if we want to clean up, but for a grid of 6, we might want to keep placeholders?
      // Keeping it simple: remove gaps for now, or just remove pure empty strings.
      const cleanedIds = newShowcaseIds.filter(id => id && id !== '');
      
      onUpdateUser({ showcaseBadgeIds: cleanedIds });
      setShowAllBadges(false);
      setSwappingSlotIndex(null);
  };

  return (
    <div className="flex-1 h-full w-full relative overflow-y-auto no-scrollbar pb-64 font-sans">
        
        <div className="relative z-10 flex flex-col items-center pt-16 px-6">
            <div className="w-48 h-48 rounded-full bg-base-3 border-4 border-white/40 shadow-xl flex items-center justify-center mb-8 relative">
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User" className="w-44 h-44 rounded-full object-cover" />
                ) : (
                    <div className="w-full h-full rounded-full bg-base-3" />
                )}
            </div>

            <div className="w-full max-w-sm bg-white/30 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/40 flex flex-col items-center mb-4">
                <h1 className="text-2xl font-bold text-type-1">{user.name.toUpperCase()}</h1>
                <div className="flex items-center gap-2 text-type-2 text-sm mt-1">
                    <span>{user.grade === 13 ? 'Mezun' : `${user.grade}. Sınıf`}</span>
                    <span className="w-px h-3 bg-type-2"></span>
                    <span className="font-bold text-type-1">Çaylak</span>
                </div>
                
                {/* Motivational Goal Text */}
                {user.targetUni && user.targetDept && !user.isTargetUndecided && (
                  <div className="mt-2 text-sm text-type-1 font-medium italic opacity-80 border-t border-type-1/10 pt-2 w-full text-center">
                     İleride {user.targetUni} {user.targetDept} öğrencisi olacak
                  </div>
                )}
            </div>

            <div className="w-full max-w-sm flex justify-between items-center bg-white/30 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/40 mb-6">
                <div className="flex flex-col items-center flex-1">
                    <span className="text-xl font-extrabold text-type-1">{profileStats.questions}</span>
                    <span className="text-xs text-type-2">Soru</span>
                </div>
                <div className="flex flex-col items-center flex-1 border-x border-white/30">
                    <span className="text-xl font-extrabold text-type-1">{profileStats.timeStr}</span>
                    <span className="text-xs text-type-2">Saat</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                    <span className="text-xl font-extrabold text-type-1">{profileStats.sessions}</span>
                    <span className="text-xs text-type-2">Oturum</span>
                </div>
            </div>

            <div className="flex gap-3 mb-10">
                <button 
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="flex items-center gap-2 bg-base-2 text-type-1 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-base-1 transition"
                >
                    Profili Düzenle <Pencil className="w-4 h-4" />
                </button>
                <button className="bg-transparent border-2 border-type-1/20 p-2.5 rounded-xl text-type-1">
                    <Share className="w-5 h-5" />
                </button>
            </div>

            <div className="w-full max-w-sm flex justify-start gap-8 border-b border-white/20 pb-0 mb-2 px-2">
                 {['badges', 'preferences', 'settings'].map(tab => (
                     <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 font-bold text-sm transition-all relative capitalize ${
                            activeTab === tab 
                            ? 'text-type-1' 
                            : 'text-type-1/50 hover:text-type-1/80'
                        }`}
                     >
                        {tab === 'badges' ? 'Rozetler' : tab === 'preferences' ? 'Tercihler' : 'Ayarlar'}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-type-1 rounded-t-full" />}
                     </button>
                 ))}
            </div>
            
            {activeTab === 'badges' && (
                <div className="w-full max-w-sm flex justify-end px-2 mb-4">
                    <button 
                        onClick={() => {
                            setSwappingSlotIndex(null);
                            setShowAllBadges(true);
                        }}
                        className="text-[10px] font-bold text-type-1/70 hover:text-type-1 underline decoration-type-1/30"
                    >
                        Tümünü Gör
                    </button>
                </div>
            )}
            
            {activeTab !== 'badges' && <div className="mb-6" />}

            <div className="w-full max-w-sm min-h-[200px]">
                
                {activeTab === 'badges' && (
                    <>
                        {earnedBadges.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 bg-white/20 rounded-2xl border border-dashed border-white/40">
                                <Trophy className="w-12 h-12 text-gray-400 mb-2 opacity-50" />
                                <p className="text-sm font-bold text-type-1/60 text-center px-6">
                                    Henüz rozet kazanmadınız. <br/> Kazanmak için çalışmaya başla!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4 mb-12 animate-fadeIn">
                                {showcaseBadges.map((badge, index) => {
                                    const tierStyle = getTierColor(badge.tier);
                                    return (
                                        <div 
                                            key={badge.id} 
                                            onClick={() => handleBadgeClick(badge, index)}
                                            className={`
                                                aspect-square bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:scale-105 transition-transform cursor-pointer border-[3px]
                                                ${tierStyle.border}
                                            `}
                                        >
                                            <div className="absolute top-2 right-2 z-10">
                                                <BadgeDiamond tier={badge.tier} />
                                            </div>
                                            
                                            <badge.icon className={`w-8 h-8 mb-2 ${badge.color}`} />
                                            
                                            <div className="text-[10px] font-bold text-type-1/80 text-center leading-tight px-1 truncate w-full">
                                                {badge.title}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'preferences' && (
                    <div className="animate-fadeIn space-y-6">
                         {/* Sound Setting */}
                         <div className="flex items-center gap-3">
                             <div className="w-28 bg-base-2 text-type-1 font-bold text-sm py-2.5 rounded-xl text-center shadow-sm">
                                 Bildirim Sesi
                             </div>
                             <button 
                                onClick={cycleSound}
                                className="flex-1 bg-neu-1 text-type-1 font-bold text-sm py-2.5 px-3 rounded-xl shadow-sm flex justify-between items-center active:scale-95 transition-transform"
                             >
                                 <span>{sound}</span>
                                 <Volume2 className="w-4 h-4 opacity-50" />
                             </button>
                         </div>
                         
                         {/* Locations Dropdown */}
                         <div className="flex items-center gap-3">
                             <div className="w-28 bg-base-2 text-type-1 font-bold text-sm py-2.5 rounded-xl text-center shadow-sm">
                                 Konumlar
                             </div>
                             <div className="flex-1 relative flex gap-2" ref={locationDropdownRef}>
                                 <div className="relative flex-1">
                                     <button 
                                        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                                        className="w-full bg-neu-1 text-type-1 font-bold text-sm py-2.5 px-3 rounded-xl shadow-sm flex justify-between items-center"
                                     >
                                         <span className="truncate">{selectedLocation || 'Seçiniz'}</span>
                                         <ChevronDown className={`w-4 h-4 text-type-1 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                                     </button>
                                     
                                     {isLocationDropdownOpen && (
                                         <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-type-1/10 max-h-[160px] overflow-y-auto no-scrollbar">
                                             {allLocations.map((loc, idx) => (
                                                 <div 
                                                     key={idx}
                                                     className={`px-3 py-2.5 text-sm font-bold text-type-1 hover:bg-base-2 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group ${selectedLocation === loc ? 'bg-base-2' : ''}`}
                                                     onClick={() => {
                                                         setSelectedLocation(loc);
                                                         setIsLocationDropdownOpen(false);
                                                     }}
                                                 >
                                                     <span className="truncate flex-1">{loc}</span>
                                                     <div className="flex gap-2 ml-2">
                                                         <button onClick={(e) => handleEditLocation(idx, e)} className="p-1.5 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200">
                                                             <Edit2 className="w-3 h-3" />
                                                         </button>
                                                         <button onClick={(e) => handleDeleteLocation(idx, e)} className="p-1.5 bg-red-100 rounded-lg text-red-600 hover:bg-red-200">
                                                             <Trash2 className="w-3 h-3" />
                                                         </button>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                                 <button 
                                    onClick={handleOpenAddLocation}
                                    className="bg-acc-1 p-2.5 rounded-xl hover:bg-[#8FB3C0] transition-colors shadow-sm flex-shrink-0"
                                 >
                                    <Plus className="w-5 h-5 text-white" />
                                 </button>
                             </div>
                         </div>

                         {/* Moods Dropdown */}
                         <div className="flex items-center gap-3">
                             <div className="w-28 bg-base-2 text-type-1 font-bold text-sm py-2.5 rounded-xl text-center shadow-sm">
                                 Hisler
                             </div>
                             <div className="flex-1 relative flex gap-2" ref={moodDropdownRef}>
                                 <div className="relative flex-1">
                                     <button 
                                        onClick={() => setIsMoodDropdownOpen(!isMoodDropdownOpen)}
                                        className="w-full bg-neu-1 text-type-1 font-bold text-sm py-2.5 px-3 rounded-xl shadow-sm flex justify-between items-center"
                                     >
                                         <span className="truncate">{selectedMood || 'Seçiniz'}</span>
                                         <ChevronDown className={`w-4 h-4 text-type-1 transition-transform ${isMoodDropdownOpen ? 'rotate-180' : ''}`} />
                                     </button>
                                     
                                     {isMoodDropdownOpen && (
                                         <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-type-1/10 max-h-[160px] overflow-y-auto no-scrollbar">
                                             {allMoods.map((mood, idx) => (
                                                 <div 
                                                     key={idx}
                                                     className={`px-3 py-2.5 text-sm font-bold text-type-1 hover:bg-base-2 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group ${selectedMood === mood ? 'bg-base-2' : ''}`}
                                                     onClick={() => {
                                                         setSelectedMood(mood);
                                                         setIsMoodDropdownOpen(false);
                                                     }}
                                                 >
                                                     <span className="truncate flex-1">{mood}</span>
                                                     <div className="flex gap-2 ml-2">
                                                         <button onClick={(e) => handleEditMood(idx, e)} className="p-1.5 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200">
                                                             <Edit2 className="w-3 h-3" />
                                                         </button>
                                                         <button onClick={(e) => handleDeleteMood(idx, e)} className="p-1.5 bg-red-100 rounded-lg text-red-600 hover:bg-red-200">
                                                             <Trash2 className="w-3 h-3" />
                                                         </button>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                                 <button 
                                    onClick={handleOpenAddMood}
                                    className="bg-acc-1 p-2.5 rounded-xl hover:bg-[#8FB3C0] transition-colors shadow-sm flex-shrink-0"
                                 >
                                    <Plus className="w-5 h-5 text-white" />
                                 </button>
                             </div>
                         </div>

                         {/* Presets Dropdown */}
                         <div className="flex items-center gap-3">
                             <div className="w-28 bg-base-2 text-type-1 font-bold text-sm py-2.5 rounded-xl text-center shadow-sm">
                                 Hazır Ayarlar
                             </div>
                             
                             <div className="flex-1 relative flex gap-2" ref={presetDropdownRef}>
                                 <div className="relative flex-1">
                                     <button 
                                        onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
                                        className="w-full bg-neu-1 text-type-1 font-bold text-sm py-2.5 px-3 rounded-xl shadow-sm flex justify-between items-center"
                                     >
                                         <span className="truncate">{selectedPreset || 'Seçiniz'}</span>
                                         <ChevronDown className={`w-4 h-4 text-type-1 transition-transform ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
                                     </button>
                                     
                                     {isPresetDropdownOpen && (
                                         <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-type-1/10 max-h-[160px] overflow-y-auto no-scrollbar">
                                             {presets.map(p => {
                                                 return (
                                                     <div 
                                                         key={p.id}
                                                         className={`px-3 py-2.5 text-sm font-bold text-type-1 hover:bg-base-2 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group ${selectedPreset === p.name ? 'bg-base-2' : ''}`}
                                                         onClick={() => {
                                                             setSelectedPreset(p.name);
                                                             setIsPresetDropdownOpen(false);
                                                         }}
                                                     >
                                                         <span className="truncate flex-1">{p.name}</span>
                                                         <div className="flex gap-2 ml-2">
                                                             <button onClick={(e) => handleEditPreset(p, e)} className="p-1.5 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200">
                                                                 <Edit2 className="w-3 h-3" />
                                                             </button>
                                                             <button onClick={(e) => handleDeletePreset(p.id, e)} className="p-1.5 bg-red-100 rounded-lg text-red-600 hover:bg-red-200">
                                                                 <Trash2 className="w-3 h-3" />
                                                             </button>
                                                         </div>
                                                     </div>
                                                 )
                                             })}
                                         </div>
                                     )}
                                 </div>
                                 <button 
                                    onClick={handleOpenAddPreset}
                                    className="bg-acc-1 p-2.5 rounded-xl hover:bg-[#8FB3C0] transition-colors shadow-sm flex-shrink-0"
                                 >
                                    <Plus className="w-5 h-5 text-white" />
                                 </button>
                             </div>
                         </div>

                         {/* Notification Settings Box */}
                         <div className="bg-white/40 rounded-2xl p-4 border border-white/40 shadow-sm">
                            <h3 className="text-type-1 font-bold text-sm mb-3 ml-1 flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Bildirim Tercihleri
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {NOTIFICATION_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => toggleNotif(type.id)}
                                        className={`
                                            py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95
                                            ${notifSettings[type.id as keyof typeof notifSettings] 
                                                ? 'bg-[#2D3A31] text-white' 
                                                : 'bg-neu-1 text-type-2/60'}
                                        `}
                                    >
                                        {type.label}
                                        {notifSettings[type.id as keyof typeof notifSettings] && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="animate-fadeIn space-y-4 w-full max-w-sm">
                        {/* Version Card */}
                        <div className="flex w-full min-h-[100px] rounded-2xl overflow-hidden shadow-sm">
                            <div className="w-16 bg-acc-1 flex items-center justify-center flex-shrink-0">
                                <div className="w-10 h-10 rounded-full border-2 border-type-1/20 flex items-center justify-center">
                                    <Info className="w-6 h-6 text-type-1" strokeWidth={2} />
                                </div>
                            </div>
                            <div className="flex-1 bg-neu-1 p-5 flex flex-col justify-center gap-3">
                                <div className="flex justify-between items-center border-b border-type-1/10 pb-2">
                                    <span className="font-bold text-type-1 text-sm">Versiyon</span>
                                    <span className="font-mono font-medium text-type-2 text-xs">0.6.4 Alpha</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="font-bold text-type-1 text-sm">Değerlendir</span>
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-[#F1C40F] text-[#F1C40F]" />)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social/Support Card */}
                        <div className="flex w-full min-h-[100px] rounded-2xl overflow-hidden shadow-sm">
                            <div className="w-16 bg-acc-1 flex items-center justify-center flex-shrink-0">
                                <div className="w-10 h-10 rounded-full border-2 border-type-1/20 flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-type-1" strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="flex-1 bg-base-2 flex items-center justify-around px-4">
                                {/* Coffee */}
                                <a href="https://buymeacoffee.com/modun" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-neu-1 rounded-xl flex items-center justify-center shadow-sm hover:scale-110 transition-transform group">
                                    <Coffee className="w-6 h-6 text-type-1 group-hover:text-orange-700" />
                                </a>
                                
                                {/* X */}
                                <a href="https://x.com/meteanozkan" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-sm hover:scale-110 transition-transform text-white">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </a>

                                {/* GitHub */}
                                <a href="https://github.com/OzkanMetehan" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#2D3A31] rounded-xl flex items-center justify-center shadow-sm hover:scale-110 transition-transform text-white">
                                    <Github className="w-6 h-6" />
                                </a>
                            </div>
                        </div>

                         {/* Dev Mode Toggle */}
                         <div className="bg-white/40 rounded-2xl p-4 border border-white/40 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-bold text-type-1">Geliştirici Modu</span>
                            </div>
                            <button 
                                onClick={handleDevToggle}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDevMode ? 'bg-[#9DD9B1]' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDevMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                         </div>
                    </div>
                )}
            </div>
        </div>

        {/* All Badges / Selection Modal */}
        {showAllBadges && (
            <div className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-28 sm:items-center sm:pb-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                 <div className="bg-neu-1 w-full max-w-sm h-[65vh] sm:h-auto sm:max-h-[80vh] rounded-[30px] p-6 shadow-2xl flex flex-col relative">
                     <div className="flex justify-between items-center mb-6 border-b border-type-1/10 pb-4">
                         <h2 className="text-xl font-bold text-type-1 flex items-center gap-2">
                             <Trophy className="w-5 h-5 text-orange-500" />
                             {swappingSlotIndex !== null ? 'Rozet Seç' : 'Tüm Rozetler'}
                         </h2>
                         <button 
                            onClick={() => {
                                setShowAllBadges(false);
                                setSwappingSlotIndex(null);
                            }} 
                            className="bg-gray-200 rounded-full p-1.5 hover:bg-gray-300 transition-colors"
                         >
                             <X className="w-5 h-5 text-gray-600" />
                         </button>
                     </div>
                     <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                         {calculatedBadges.map(badge => {
                             const percent = Math.min(100, Math.floor((badge.progress / badge.max) * 100));
                             const isCompleted = percent >= 100;
                             const isUnlocked = badge.tier > 0;
                             
                             // Fix class generation for background color
                             const bgClass = isUnlocked 
                                ? badge.color.replace('text-', 'bg-').replace(/-\d+$/, '-100') 
                                : 'bg-gray-100';

                             return (
                                 <div 
                                    key={badge.id} 
                                    onClick={() => {
                                        if (swappingSlotIndex !== null && !badge.isLocked) {
                                            handleSelectBadgeForSlot(badge.id);
                                        } else {
                                            // Show detail if not selecting
                                            setSelectedBadgeForDetail(badge);
                                        }
                                    }}
                                    className={`
                                        bg-white rounded-xl p-4 shadow-sm border relative overflow-hidden flex gap-4 items-center transition-all
                                        ${swappingSlotIndex !== null 
                                            ? badge.isLocked 
                                                ? 'opacity-50 cursor-not-allowed border-gray-100' 
                                                : 'cursor-pointer hover:border-orange-300 hover:shadow-md border-orange-50'
                                            : 'border-orange-50 cursor-pointer hover:bg-gray-50'
                                        }
                                    `}
                                 >
                                     <div className="absolute top-2 right-2">
                                         <BadgeDiamond tier={badge.tier} />
                                     </div>
                                     <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${isUnlocked ? badge.color : 'text-gray-400'}`}>
                                         <badge.icon className="w-6 h-6" />
                                     </div>
                                     <div className="flex-1 min-w-0 z-10">
                                         <div className="flex justify-between items-center mb-1 pr-4">
                                             <h4 className="font-bold text-type-1 text-sm truncate">{badge.title}</h4>
                                             {isCompleted ? <div className="bg-green-100 text-green-700 p-1 rounded-full"><Check className="w-3 h-3" /></div> : <span className="text-[10px] text-gray-400 font-bold">%{percent}</span>}
                                         </div>
                                         <p className="text-xs text-gray-500 mb-2 truncate">{badge.description}</p>
                                         <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-1">
                                             <span>
                                                 {badge.tier === 0 ? 'Kilitli' : 
                                                  (!badge.isTiered) ? 'Tamamlandı' :
                                                  badge.tier === 4 ? 'Efsanevi' : 
                                                  `Seviye ${badge.tier}`}
                                             </span>
                                             <span>{badge.progress} / {badge.max}</span>
                                         </div>
                                     </div>
                                     <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
                                         <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${percent}%` }} />
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
            </div>
        )}

        {/* Badge Detail Modal */}
        {selectedBadgeForDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-[30px] p-6 shadow-2xl w-full max-w-xs relative flex flex-col items-center max-h-[85vh] overflow-y-auto no-scrollbar">
                    <button onClick={() => setSelectedBadgeForDetail(null)} className="absolute top-4 right-4 bg-gray-100 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    <div className={`w-20 h-20 rounded-2xl shadow-md flex items-center justify-center relative mb-4 mt-2 border-[3px] ${getTierColor(selectedBadgeForDetail.tier).border}`}>
                        <div className="absolute top-2 right-2">
                            <BadgeDiamond tier={selectedBadgeForDetail.tier} />
                        </div>
                        <selectedBadgeForDetail.icon className={`w-10 h-10 ${selectedBadgeForDetail.color}`} />
                    </div>

                    <h3 className="text-lg font-bold text-type-1 text-center mb-1">{selectedBadgeForDetail.title}</h3>
                    <div className={`text-xs font-bold text-white mb-4 px-3 py-1 rounded-full ${getTierColor(selectedBadgeForDetail.tier).bg.includes('gradient') ? getTierColor(selectedBadgeForDetail.tier).bg : getTierColor(selectedBadgeForDetail.tier).bg.replace('bg-', 'bg-').replace('100', '500').replace('200', '400')}`}>
                        {getTierColor(selectedBadgeForDetail.tier).name}
                    </div>
                    
                    <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                        {selectedBadgeForDetail.description}
                    </p>

                    <div className="w-full bg-gray-100 h-2 rounded-full mb-2 overflow-hidden">
                        <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (selectedBadgeForDetail.progress / selectedBadgeForDetail.max) * 100)}%` }} 
                        />
                    </div>
                    <div className="flex justify-between w-full text-xs font-bold text-gray-400 mb-6">
                        <span>İlerleme</span>
                        <span>{selectedBadgeForDetail.progress} / {selectedBadgeForDetail.max}</span>
                    </div>

                    {/* Tier Thresholds Table */}
                    {selectedBadgeForDetail.isTiered && TIER_THRESHOLDS[selectedBadgeForDetail.id] && (
                        <div className="w-full bg-gray-50 rounded-xl p-3 mb-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Seviyeler</h4>
                            <div className="space-y-2">
                                {TIER_THRESHOLDS[selectedBadgeForDetail.id].map((val, idx) => {
                                    const tierNum = idx + 1;
                                    const isCurrent = selectedBadgeForDetail.tier === tierNum;
                                    const isPassed = selectedBadgeForDetail.tier > tierNum;
                                    const style = getTierColor(tierNum);
                                    
                                    return (
                                        <div key={idx} className={`flex justify-between items-center text-xs p-2 rounded-lg ${isCurrent ? 'bg-white shadow-sm ring-1 ring-orange-200' : ''} ${isPassed ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <BadgeDiamond tier={tierNum} />
                                                <span className={`font-bold ${isCurrent ? 'text-gray-800' : 'text-gray-500'}`}>{style.name}</span>
                                            </div>
                                            <span className="font-mono text-gray-600">{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {swappingSlotIndex !== null && (
                        <button 
                            onClick={handleSwapClick}
                            className="w-full py-3 rounded-xl border-2 border-orange-200 text-orange-600 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Değiştir
                        </button>
                    )}
                </div>
            </div>
        )}
        
        {/* Dev Mode Password Prompt */}
        {showDevPassword && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
                    <h3 className="text-lg font-bold text-[#2D3A31] mb-4 text-center">Geliştirici Şifresi</h3>
                    <input 
                        type="password"
                        value={devPasswordInput}
                        onChange={(e) => setDevPasswordInput(e.target.value)}
                        placeholder="Şifreyi giriniz"
                        className="w-full h-10 border-2 border-gray-200 rounded-xl px-3 mb-4 outline-none focus:border-orange-300 text-center"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDevPassword(false)}
                            className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleDevPasswordSubmit}
                            className="flex-1 py-2 bg-[#2D3A31] text-white font-bold rounded-xl hover:bg-[#3D4A41]"
                        >
                            Onayla
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Add Preset Modal */}
        {isPresetModalOpen && (
            <AddPresetModal 
                onClose={() => setIsPresetModalOpen(false)}
                onSave={handleSavePreset}
                initialData={editingPreset || undefined}
            />
        )}

        {/* Location Modal */}
        {isLocationModalOpen && (
            <LocationModal
                onClose={() => setIsLocationModalOpen(false)}
                onSave={handleSaveLocation}
                initialValue={editingLocationIndex !== null ? allLocations[editingLocationIndex] : ''}
            />
        )}

        {/* Mood Modal */}
        {isMoodModalOpen && (
            <MoodModal
                onClose={() => setIsMoodModalOpen(false)}
                onSave={handleSaveMood}
                initialValue={editingMoodIndex !== null ? allMoods[editingMoodIndex] : ''}
            />
        )}
        
        {/* Edit Profile Modal */}
        {isEditProfileModalOpen && (
            <EditProfileModal
                user={user}
                onClose={() => setIsEditProfileModalOpen(false)}
                onSave={onUpdateUser}
            />
        )}
    </div>
  );
};

export default ProfilePage;