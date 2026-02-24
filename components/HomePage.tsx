
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame, User, Pencil, X, Scroll, Calculator, FlaskConical, Globe, History, Languages, BookOpen, BrainCircuit, Activity, Clock, Edit3 } from 'lucide-react';
import { UserModel, PlannedSession } from '../types';
import { getMockDayData, APP_START_DATE } from '../constants';
import { sessionService, StoredSession } from '../services/sessionService';
import UpdateMockResultModal from './calendar/UpdateMockResultModal';

interface Props {
  user: UserModel;
  onStartSession: () => void;
  isDevMode: boolean;
}

// Helper to map subject to icon
const getSubjectIcon = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('türkçe') || s.includes('edebiyat')) return Scroll;
    if (s.includes('matematik') || s.includes('geometri')) return Calculator;
    if (s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji')) return FlaskConical;
    if (s.includes('tarih')) return History;
    if (s.includes('coğrafya')) return Globe;
    if (s.includes('ingilizce') || s.includes('dil')) return Languages;
    if (s.includes('felsefe') || s.includes('din')) return BookOpen;
    return BrainCircuit;
};

// Helper to convert mock daily stats to a session-like object for display
const convertMockToSession = (mock: { date: Date, data: any }) => {
    // Find dominant subject
    let subject = 'Genel';
    let max = -1;
    if (mock.data.subjects && mock.data.subjects.length > 0) {
        mock.data.subjects.forEach((s: any) => {
            if (s.val > max) {
                max = s.val;
                subject = s.name;
            }
        });
    }

    return {
        id: `mock-${mock.date.getTime()}`,
        completedAt: mock.date.toISOString(),
        config: {
            // Added sessionType to satisfy SessionConfig requirements
            sessionType: 'question',
            subject: subject,
            topic: 'Günlük Otomatik',
            subTopic: 'Genel Çalışma',
            durationMinutes: Math.floor(mock.data.durationSeconds / 60),
            isMockTest: false,
            breakReminderInterval: 0,
            mood: 'Neutral',
            location: 'Sanal',
        },
        questions: mock.data.val,
        correct: mock.data.correct,
        wrong: mock.data.wrong,
        empty: mock.data.empty,
        net: mock.data.net,
        accuracy: mock.data.val > 0 ? (mock.data.correct / mock.data.val) * 100 : 0,
        durationSeconds: mock.data.durationSeconds
    };
};

const HomePage: React.FC<Props> = ({ user, onStartSession, isDevMode }) => {
  const [timeStr, setTimeStr] = useState('');
  const [todayDateStr, setTodayDateStr] = useState('');
  
  // Target Editing State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetPeriod, setTargetPeriod] = useState<'weekly'|'monthly'>(user.targetPeriod || 'weekly');
  const [targetType, setTargetType] = useState<'time'|'question'>(user.targetType || 'time');
  const [targetGoal, setTargetGoal] = useState(user.targetGoal || 15);

  // Planning Section State
  const [planViewDate, setPlanViewDate] = useState(new Date());
  
  // Quick Entry State
  const [updateMockSession, setUpdateMockSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const updateTime = () => {
        const now = new Date();
        setTimeStr(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        // System Date format "25 Kas"
        setTodayDateStr(now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
    };
    updateTime(); 
    const timer = setInterval(updateTime, 1000); 
    return () => clearInterval(timer);
  }, []);

  // Last Session Data (Real + Mock)
  const lastSession = useMemo(() => {
      // 1. Get Real Sessions
      const allReal = sessionService.getAllSessions();
      let latestReal = null;
      if (allReal.length > 0) {
          latestReal = allReal.sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
      }

      // 2. Mock Sessions (Only if Dev Mode)
      let latestMock = null;
      if (isDevMode) {
          let ptr = new Date();
          ptr.setHours(12, 0, 0, 0); 
          
          const limit = new Date(APP_START_DATE);
          limit.setHours(0, 0, 0, 0);

          // Search up to 90 days back
          for(let i=0; i<90; i++) {
              if (ptr < limit) break;
              
              const m = getMockDayData(ptr);
              if (m.val > 0) {
                  latestMock = { date: new Date(ptr), data: m };
                  break;
              }
              ptr.setDate(ptr.getDate() - 1);
          }
      }

      // 3. Determine which to show
      if (!latestReal && !latestMock) return null;
      if (latestReal && !latestMock) return latestReal;
      if (!latestReal && latestMock) return convertMockToSession(latestMock!);

      // Both exist: compare dates
      const rDate = new Date(latestReal!.completedAt);
      rDate.setHours(0,0,0,0);
      
      const mDate = new Date(latestMock!.date);
      mDate.setHours(0,0,0,0);

      if (mDate > rDate) {
          return convertMockToSession(latestMock!);
      }
      
      return latestReal;
  }, [todayDateStr, isDevMode, updateMockSession]); // Refresh if session updated

  // Update user preference when saved
  const handleSaveTarget = () => {
      user.targetPeriod = targetPeriod;
      user.targetType = targetType;
      user.targetGoal = targetGoal;
      // Map to legacy if using time
      if (targetType === 'time') {
          user.targetHours = targetGoal;
      }
      setIsTargetModalOpen(false);
  };

  // Streak Calculation
  const currentStreak = useMemo(() => {
      const today = new Date();
      let streak = 0;
      let checkDate = new Date(today);
      
      const hasActivity = (d: Date) => {
          const m = isDevMode ? getMockDayData(d) : { val: 0, status: 'none' };
          const r = sessionService.getDailyStats(d);
          const totalVal = m.val + r.val;
          const status = m.status; 
          return totalVal > 0 || ['sick', 'saved', 'rest'].includes(status as any);
      };

      if (!hasActivity(checkDate)) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (!hasActivity(checkDate)) return 0; 
      }

      while(true) {
          if (hasActivity(checkDate)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      return streak;
  }, [isDevMode]);

  // Progress Calculation
  const progressData = useMemo(() => {
      const now = new Date();
      let start = new Date(now);
      
      if (user.targetPeriod === 'weekly') {
          const day = start.getDay() || 7; // Mon=1, Sun=7
          if (day !== 1) start.setHours(-24 * (day - 1)); // Go back to Monday
      } else {
          start.setDate(1); // 1st of month
      }
      start.setHours(0,0,0,0);

      let totalVal = 0;
      const current = new Date(start);
      // Loop until today
      while(current <= now) {
          const m = isDevMode ? getMockDayData(new Date(current)) : { durationSeconds: 0, val: 0 };
          const r = sessionService.getDailyStats(new Date(current));
          
          if (user.targetType === 'time') {
              totalVal += m.durationSeconds + r.durationSeconds;
          } else {
              totalVal += m.val + r.val;
          }
          current.setDate(current.getDate() + 1);
      }
      
      let currentValue = 0;
      if (user.targetType === 'time') {
          currentValue = totalVal / 3600; // Convert to hours
      } else {
          currentValue = totalVal; // Already questions
      }
      
      const goal = user.targetGoal || (user.targetType === 'time' ? 15 : 1000);
      const percent = Math.min(100, (currentValue / goal) * 100);

      return {
          current: user.targetType === 'time' ? currentValue.toFixed(1) : Math.round(currentValue),
          target: goal,
          percent,
          unit: 's' // 's' for 'saat' (time) and 's' for 'soru' (question)
      };
  }, [user.targetPeriod, user.targetType, user.targetGoal, isDevMode, todayDateStr]);

  // Daily Average Calculation for Modal
  const dailyAverageStr = useMemo(() => {
    const days = targetPeriod === 'weekly' ? 7 : 30;
    const avg = targetGoal / days;
    return targetType === 'time' ? `${avg.toFixed(1)} saat` : `${Math.round(avg)} soru`;
  }, [targetGoal, targetPeriod, targetType]);

  // --- Planning Section Logic ---

  const handlePlanDateChange = (days: number) => {
      const newDate = new Date(planViewDate);
      newDate.setDate(newDate.getDate() + days);
      setPlanViewDate(newDate);
  };

  const formattedPlanDateTitle = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(planViewDate);
    target.setHours(0,0,0,0);
    
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diff === 0) return "Bugünün Planı";
    if (diff === 1) return "Yarının Planı";
    if (diff === -1) return "Dünün Planı";
    
    return target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + " Planı";
  }, [planViewDate]);

  const dailyPlans = useMemo(() => {
    const all = sessionService.getPlannedSessions();
    const offset = planViewDate.getTimezoneOffset();
    const localDate = new Date(planViewDate.getTime() - (offset*60*1000));
    const queryStr = localDate.toISOString().split('T')[0];

    return all
        .filter(p => p.date === queryStr)
        .sort((a,b) => a.time.localeCompare(b.time));
  }, [planViewDate]);

  const getPlanStatus = (plan: PlannedSession, index: number, allPlans: PlannedSession[]) => {
      const now = new Date();
      const pDate = new Date(`${plan.date}T${plan.time}`);
      
      if (pDate < now) return 'past';
      
      const futurePlans = allPlans.filter(p => new Date(`${p.date}T${p.time}`) > now);
      if (futurePlans.length > 0 && futurePlans[0].id === plan.id) return 'next';
      
      return 'future';
  };

  const formatSessionDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
  };
  
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateMock = (updated: StoredSession) => {
      sessionService.updateSession(updated);
      setUpdateMockSession(null);
  };

  return (
    <div className="flex-1 overflow-y-auto z-10 no-scrollbar pb-32">
        
        {/* Header Section */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center gap-2">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[#4A5D50] font-medium text-[10px] mb-0.5">{todayDateStr}</span>
            <h1 className="text-lg font-bold text-[#2D3A31] mb-1 leading-tight break-words">
              Merhaba, {user.name}
            </h1>
            
            {/* Streak Pill */}
            <div className="flex items-center gap-1 bg-pale-yellow/80 backdrop-blur-sm px-2 py-0.5 rounded-full w-fit shadow-sm border border-yellow-200/50">
              <Flame className={`w-3 h-3 ${currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
              <span className="font-bold text-gray-800 text-[10px]">{currentStreak} Gün</span>
            </div>
          </div>

          {/* User Avatar */}
          <div className="w-20 h-20 flex-shrink-0 bg-pale-yellow rounded-2xl flex items-center justify-center shadow-sm border border-white/20">
             {user.avatarUrl ? (
               <img src={user.avatarUrl} alt="User" className="w-16 h-16 rounded-xl object-cover" />
             ) : (
               <User className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
             )}
          </div>
        </div>

        {/* Progress Card */}
        <div className="px-6 mt-4">
          <div className="bg-pale-yellow rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-0.5">
                <h3 className="text-[#6B6B6B] text-xs font-medium">
                    {user.targetPeriod === 'weekly' ? 'Bu Hafta' : 'Bu Ay'} {user.targetType === 'time' ? 'Çalışılan' : 'Çözülen'}
                </h3>
                <button 
                    onClick={() => {
                        setTargetPeriod(user.targetPeriod || 'weekly');
                        setTargetType(user.targetType || 'time');
                        setTargetGoal(user.targetGoal || (user.targetType === 'time' ? 15 : 1000));
                        setIsTargetModalOpen(true);
                    }}
                    className="p-1 bg-white/50 rounded-lg hover:bg-white transition-colors"
                >
                    <Pencil className="w-2.5 h-2.5 text-[#5A4A42]" />
                </button>
            </div>
            
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-xl font-bold text-[#333]">{progressData.current}{progressData.unit}</span>
              <span className="text-sm text-[#888]">/ {progressData.target}{progressData.unit}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#D4D4D4]/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#A8C9D5] rounded-full transition-all duration-500" 
                style={{ width: `${progressData.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Planning Section */}
        <div className="mt-6 px-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-[#2D3A31] border-b-2 border-[#2D3A31] pb-0.5 inline-block">
                {formattedPlanDateTitle}
            </h2>
            <div className="flex gap-3 text-[#4A5D50]">
              <button onClick={() => handlePlanDateChange(-1)} className="hover:bg-black/5 rounded-full p-1"><ChevronLeft className="w-4 h-4 opacity-70" /></button>
              <button onClick={() => handlePlanDateChange(1)} className="hover:bg-black/5 rounded-full p-1"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[100px]">
            {dailyPlans.length > 0 ? dailyPlans.map((plan, idx) => {
              const status = getPlanStatus(plan, idx, dailyPlans);
              const Icon = getSubjectIcon(plan.subject);
              
              return (
                  <div key={plan.id} className="flex flex-col items-center">
                    <div 
                        className={`
                            min-w-[150px] p-3 rounded-xl flex items-center justify-between shadow-sm border-2 relative
                            ${status === 'next' 
                                ? 'bg-white border-yellow-300 ring-2 ring-yellow-200/50' 
                                : status === 'past' 
                                    ? 'bg-gray-50 border-gray-100 opacity-60' 
                                    : 'bg-white border-transparent'
                            }
                        `}
                    >
                        <div className="flex flex-col">
                            <h4 className={`text-sm font-bold ${status === 'past' ? 'text-gray-500' : 'text-gray-700'}`}>{plan.subject}</h4>
                            <span className="text-[10px] text-gray-500 font-medium truncate max-w-[70px]">{plan.topic}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={`text-[10px] font-bold ${status === 'next' ? 'text-orange-500' : 'text-gray-400'}`}>{plan.time}</span>
                                <div className="w-px h-2.5 bg-gray-300"></div>
                                <span className="text-[9px] text-gray-400 font-medium flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {plan.durationMinutes}dk
                                </span>
                            </div>
                        </div>
                        <Icon className={`w-7 h-7 ${status === 'past' ? 'text-gray-400' : 'text-gray-800 opacity-80'}`} strokeWidth={1.5} />
                    </div>
                    
                    {/* Status Label */}
                    <div className="h-5 mt-0.5 flex items-center">
                        {status === 'next' && (
                            <span className="text-[10px] italic text-[#2D3A31] font-bold animate-pulse">Sıradaki!</span>
                        )}
                        {status === 'past' && (
                            <span className="text-[10px] font-bold text-gray-400">Geçmiş</span>
                        )}
                    </div>
                  </div>
              );
            }) : (
                <div className="w-full h-[90px] flex flex-col items-center justify-center text-gray-400 bg-white/30 rounded-xl border border-dashed border-gray-300">
                    <span className="text-xs font-medium">Bu tarihte plan yok.</span>
                    <span className="text-[10px] opacity-60">Takvimden ekleyebilirsin.</span>
                </div>
            )}
          </div>
        </div>

        {/* Start Studying Section */}
        <div className="mt-2 flex flex-col items-center justify-center relative z-10">
          <h2 className="text-xl font-bold text-[#2D3A31] italic mb-1">{timeStr}</h2>
          <button 
            onClick={onStartSession}
            className="bg-teal-header hover:bg-teal-dark active:scale-95 transition-all text-white text-lg font-bold px-8 py-3 rounded-full shadow-lg shadow-teal-900/10"
          >
            Çalışmaya Başla
          </button>
        </div>

        {/* Previous Session Stats Card */}
        <div className="mt-6 mx-4 rounded-t-2xl overflow-hidden shadow-lg relative">
            <div className="bg-teal-header px-4 py-1.5 flex justify-between items-center text-white">
            <span className="text-xs font-medium">Son Oturum</span>
            <span className="text-[10px] opacity-90">
                {lastSession ? formatSessionDate(lastSession.completedAt) : '-'}
            </span>
            </div>
            
            <div className="bg-pale-yellow p-3 flex relative">
            {/* Quick Entry Overlay for Pending Results */}
            {lastSession && 'isPendingResult' in lastSession && lastSession.isPendingResult && (
                <div className="absolute inset-0 bg-[#A8C9D5]/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 text-center p-3">
                    <div className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase mb-1 shadow-sm">Sonuç Bekleniyor</div>
                    <p className="text-[10px] text-[#2D3A31] font-bold mb-3 opacity-90 leading-tight">Deneme sonucun açıklandı mı? <br/>Hemen gir ve istatistiklerini gör!</p>
                    <button 
                        onClick={() => setUpdateMockSession(lastSession as StoredSession)}
                        className="bg-white text-blue-600 px-4 py-1.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 hover:bg-blue-50 active:scale-95 transition-all"
                    >
                        <Edit3 className="w-3 h-3" />
                        Sonuçları Gir
                    </button>
                </div>
            )}

            <div className="flex-1 pr-2 border-r border-black/5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                <div className="bg-[#A8C9D5] px-2 py-1 rounded-md max-w-full">
                    <div className="text-[11px] font-bold text-gray-700 truncate">{lastSession?.config.subject || 'Henüz Yok'}</div>
                    <div className="text-[8px] text-gray-500 italic truncate max-w-[90px]">{lastSession?.config.topic || 'İlk oturumunu başlat'}</div>
                </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                    <div>
                    <div className="text-[8px] text-gray-500 uppercase">Süre</div>
                    <div className="text-[11px] font-bold text-gray-800">{lastSession ? formatDuration(lastSession.durationSeconds) : '00:00:00'}</div>
                    </div>
                    <div>
                    <div className="text-[8px] text-gray-500 uppercase">Çözülen</div>
                    <div className="text-[11px] font-bold text-gray-800">{lastSession?.questions || 0}</div>
                    </div>
                    <div>
                    <div className="text-[8px] text-gray-500 uppercase">Molalar</div>
                    <div className="text-[11px] font-bold text-gray-800">0</div>
                    </div>
                </div>
            </div>

            <div className="w-[40%] pl-2 flex flex-col items-center justify-center relative">
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="transform -rotate-90 w-full h-full">
                        {(() => {
                        const total = lastSession?.questions || 1; 
                        const emptyP = ((lastSession?.empty || 0) / total) * 100;
                        const wrongP = ((lastSession?.wrong || 0) / total) * 100;
                        
                        return (
                            <>
                                <circle r="16" cx="16" cy="16" fill="#2D9CDB" />
                                <circle 
                                    r="8" cx="16" cy="16" 
                                    fill="transparent" 
                                    stroke="#F2C94C" 
                                    strokeWidth="16" 
                                    strokeDasharray={`${emptyP} 100`} 
                                    strokeDashoffset="0"
                                />
                                <circle 
                                    r="8" cx="16" cy="16" 
                                    fill="transparent" 
                                    stroke="#EB5757" 
                                    strokeWidth="16" 
                                    strokeDasharray={`${wrongP} 100`} 
                                    strokeDashoffset={`-${emptyP}`} 
                                />
                            </>
                        );
                        })()}
                    </svg>
                    <span className="absolute top-[60%] left-[15%] text-[7px] text-white font-bold drop-shadow-md">Doğru</span>
                    <span className="absolute top-[25%] right-[10%] text-[7px] text-white font-bold drop-shadow-md">Boş</span>
                    <span className="absolute bottom-[20%] right-[5%] text-[7px] text-white font-bold drop-shadow-md">Yanlış</span>
                </div>
                
                <div className="mt-1 text-center">
                    <div className="text-[10px] font-bold text-gray-700">Net <span className="mx-1 text-gray-400">—</span> {lastSession?.net || 0}</div>
                    <div className="text-[8px] text-gray-400 italic">Doğruluk {Math.round(lastSession?.accuracy || 0)}%</div>
                </div>
            </div>

            </div>
        </div>

        {/* TARGET EDIT MODAL */}
        {isTargetModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsTargetModalOpen(false)}></div>
                <div className="relative bg-[#FFFBEB] w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#5A4A42]">Hedefini Düzenle</h2>
                        <button onClick={() => setIsTargetModalOpen(false)} className="bg-gray-200 rounded-full p-1"><X className="w-5 h-5 text-gray-600" /></button>
                    </div>

                    <div className="flex bg-gray-200/50 p-1 rounded-xl mb-4">
                        <button 
                            onClick={() => {
                                setTargetPeriod('weekly');
                                // Adjust goal if switching period context but keeping same type
                                if (targetPeriod === 'monthly') setTargetGoal(Math.max(1, Math.round(targetGoal / 4)));
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${targetPeriod === 'weekly' ? 'bg-white shadow-sm text-[#5A4A42]' : 'text-gray-400'}`}
                        >
                            Haftalık
                        </button>
                        <button 
                            onClick={() => {
                                setTargetPeriod('monthly');
                                if (targetPeriod === 'weekly') setTargetGoal(targetGoal * 4);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${targetPeriod === 'monthly' ? 'bg-white shadow-sm text-[#5A4A42]' : 'text-gray-400'}`}
                        >
                            Aylık
                        </button>
                    </div>

                    <div className="flex bg-gray-200/50 p-1 rounded-xl mb-6">
                        <button 
                            onClick={() => {
                                setTargetType('time');
                                setTargetGoal(targetPeriod === 'weekly' ? 15 : 60);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'time' ? 'bg-white shadow-sm text-[#5A4A42]' : 'text-gray-400'}`}
                        >
                            Süre (Saat)
                        </button>
                        <button 
                            onClick={() => {
                                setTargetType('question');
                                setTargetGoal(targetPeriod === 'weekly' ? 1000 : 4000);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${targetType === 'question' ? 'bg-white shadow-sm text-[#5A4A42]' : 'text-gray-400'}`}
                        >
                            Soru Sayısı
                        </button>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between mb-2">
                             <span className="text-sm font-bold text-[#5A4A42]">Hedef</span>
                             <span className="text-xl font-bold text-[#EFA88D]">{targetGoal} {targetType === 'time' ? 'Saat' : 'Soru'}</span>
                        </div>
                        
                        {targetType === 'time' ? (
                            <>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max={targetPeriod === 'weekly' ? 50 : 200} 
                                    value={targetGoal} 
                                    onChange={(e) => setTargetGoal(parseInt(e.target.value))}
                                    className="w-full accent-[#EFA88D] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-2 font-bold">
                                    <span>1s</span>
                                    <span>{targetPeriod === 'weekly' ? '50s' : '200s'}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <input 
                                    type="range" 
                                    min={targetPeriod === 'weekly' ? 50 : 200}
                                    max={targetPeriod === 'weekly' ? 5000 : 20000} 
                                    step="50"
                                    value={targetGoal} 
                                    onChange={(e) => setTargetGoal(parseInt(e.target.value))}
                                    className="w-full accent-[#EFA88D] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-2 font-bold">
                                    <span>{targetPeriod === 'weekly' ? '50' : '200'}</span>
                                    <span>{targetPeriod === 'weekly' ? '5000' : '20000'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mb-8 text-center text-xs font-medium text-[#5A4A42] bg-[#FCEBB6]/40 p-2 rounded-xl border border-yellow-200/50">
                        Günlük ortalama <span className="font-bold text-orange-500">{dailyAverageStr}</span> ile bu hedefe ulaşabilirsin
                    </div>

                    <button 
                        onClick={handleSaveTarget}
                        className="w-full py-4 bg-[#2D3A31] text-white rounded-xl font-bold hover:bg-[#3D4A41] active:scale-95 transition-all shadow-lg"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        )}
        
        {/* Quick Update Result Modal */}
        {updateMockSession && (
            <UpdateMockResultModal 
                session={updateMockSession}
                onClose={() => setUpdateMockSession(null)}
                onSave={handleUpdateMock}
            />
        )}

      </div>
  );
};

export default HomePage;
