import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LogOut, Clock, PlayCircle, PauseCircle, BarChart2, Filter, Activity, ChevronDown, Flame, MapPin, Calendar, Zap, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Info, TrendingUp, TrendingDown, Target, Layers, BookOpen } from 'lucide-react';
import { getMockDayData, getDevMockExams, APP_START_DATE, SIMULATED_TODAY, MOCK_START_DATE, getStableDate } from '../constants';
import { sessionService } from '../services/sessionService';
import { UserModel, SessionType } from '../types';

type ViewMode = 'question' | 'mock' | 'lecture';

const STRENGTH_FILTERS = [
    { id: 'accuracy', label: 'Doğruluk' },
    { id: 'speed', label: 'Hız' },
    { id: 'questions', label: 'Soru' },
    { id: 'time', label: 'Süre' },
];

const CHART_COLORS = [
    '#F2C94C', '#27AE60', '#EB5757', '#2D9CDB', '#BB6BD9', '#F2994A', '#6FCF97', '#56CCF2', '#9B51E0', '#FF80A0'
];

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const parsePeriodString = (str: string) => {
    if (str === 'Genel') return null;
    const parts = str.split(" ");
    if (parts.length < 2) return null;
    const [mStr, yStr] = parts;
    const month = TR_MONTHS.indexOf(mStr);
    const year = 2000 + parseInt(yStr.replace("'", ""));
    return { month, year };
};

interface SubjectStatsData {
    val: number;
    correct: number;
    wrong: number;
    empty: number;
    duration: number;
    topics: Record<string, { q: number, c: number, w: number, e: number, dur: number }>;
}

type InsightType = 'positive' | 'neutral' | 'negative';

interface InsightItem {
    id: string;
    type: InsightType;
    title: string;
    message: string;
}

interface Props {
  user: UserModel;
  isDevMode: boolean;
}

const AnalyticsPage: React.FC<Props> = ({ user, isDevMode }) => {
  // View Toggle State
  const [viewMode, setViewMode] = useState<ViewMode>('question');

  // --- Study View States ---
  const [selectedPeriod, setSelectedPeriod] = useState('Genel');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [strengthFilter, setStrengthFilter] = useState('accuracy');
  const [showStrengthFilter, setShowStrengthFilter] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [studyChartPeriod, setStudyChartPeriod] = useState('Genel');
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [posIndex, setPosIndex] = useState(0);
  const [neuIndex, setNeuIndex] = useState(0);
  const [negIndex, setNegIndex] = useState(0);

  // --- Mock View States ---
  const [mockFilter, setMockFilter] = useState<'Hepsi' | 'TYT' | 'AYT' | 'YDT'>('Hepsi');
  
  // --- Chart Layout State ---
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartDims, setChartDims] = useState({ width: 0, height: 0 });

  // Determine available mock filters based on user targets
  const mockFilters = useMemo(() => {
      const filters = ['Hepsi', 'TYT']; // Always show Hepsi and TYT
      
      const hasAYT = user.targetExams.some(t => t.includes('AYT'));
      const hasYDT = user.targetExams.includes('YDT');

      if (hasAYT) filters.push('AYT');
      if (hasYDT) filters.push('YDT');

      return filters;
  }, [user.targetExams]);

  // Robust Measurement using ResizeObserver
  useEffect(() => {
    if (viewMode !== 'mock' && viewMode !== 'lecture') return;

    const element = chartRef.current;
      if (!element) return;

      const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
              if (entry.contentRect) {
                  const { width, height } = entry.contentRect;
                  // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
                  requestAnimationFrame(() => {
                      setChartDims({ width, height });
                  });
              }
          }
      });

      observer.observe(element);

      return () => {
          observer.disconnect();
      };
  }, [viewMode]);

  // --- Dynamic Periods Logic ---
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    
    const sessions = sessionService.getAllSessions();
    let minDate = new Date(SIMULATED_TODAY);
    
    if (isDevMode) {
        // In dev mode, start from MOCK_START_DATE
        minDate = new Date(MOCK_START_DATE);
    } else if (sessions.length > 0) {
        sessions.forEach(s => {
            const d = new Date(s.completedAt);
            if (d < minDate) minDate = d;
        });
    }

    // Generate a continuous list of months from minDate to today
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(SIMULATED_TODAY.getFullYear(), SIMULATED_TODAY.getMonth(), 1);
    
    const curr = new Date(start);
    while (curr <= end) {
        const m = TR_MONTHS[curr.getMonth()];
        const y = curr.getFullYear().toString().slice(-2);
        periods.add(`${m} ${y}'`);
        curr.setMonth(curr.getMonth() + 1);
    }

    return ['Genel', ...Array.from(periods).sort((a, b) => {
        const pa = parsePeriodString(a);
        const pb = parsePeriodString(b);
        if (!pa || !pb) return 0;
        if (pa.year !== pb.year) return pa.year - pb.year;
        return pa.month - pb.month;
    })];
  }, [isDevMode]); 

  // --- Summary Card Data Logic (Question) ---
  const stats = useMemo(() => {
    const realSessions = sessionService.getAllSessions().filter(s => s.config.sessionType === 'question' && !s.config.isMockTest); // Exclude mocks and lectures from Question View
    const realSessionMap: Record<string, {
        val: number, correct: number, wrong: number, empty: number, net: number, durationSeconds: number,
        subjects: Record<string, number>,
        rawSessions: typeof realSessions
    }> = {};

    let minSessionDate: Date | null = null;
    let maxSessionDate: Date | null = null;

    realSessions.forEach(s => {
        const d = new Date(s.completedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; 
        
        if (!minSessionDate || d < minSessionDate) minSessionDate = d;
        if (!maxSessionDate || d > maxSessionDate) maxSessionDate = d;

        if (!realSessionMap[key]) {
            realSessionMap[key] = { val: 0, correct: 0, wrong: 0, empty: 0, net: 0, durationSeconds: 0, subjects: {}, rawSessions: [] };
        }
        
        const entry = realSessionMap[key];
        entry.val += (s.questions || 0);
        entry.correct += (s.correct || 0);
        entry.wrong += (s.wrong || 0);
        entry.empty += (s.empty || 0);
        entry.net += (s.net || 0);
        entry.durationSeconds += (s.durationSeconds || 0);
        entry.rawSessions.push(s);
        
        const sub = s.config.subject;
        entry.subjects[sub] = (entry.subjects[sub] || 0) + (s.questions || 0);
    });

    let start: Date;
    let end: Date;

    if (selectedPeriod === 'Genel') {
        start = new Date(APP_START_DATE);
        end = new Date(SIMULATED_TODAY);
        if (minSessionDate && (minSessionDate as Date).getTime() < start.getTime()) start = new Date(minSessionDate as Date);
        if (maxSessionDate && (maxSessionDate as Date).getTime() > end.getTime()) end = new Date(maxSessionDate as Date);
    } else {
        const p = parsePeriodString(selectedPeriod)!;
        start = new Date(p.year, p.month, 1);
        end = new Date(p.year, p.month + 1, 0); 
    }

    const data = {
        questions: 0,
        correct: 0,
        wrong: 0,
        empty: 0,
        net: 0,
        durationSeconds: 0,
        subjectStats: {} as Record<string, SubjectStatsData>
    };

    const current = new Date(start);
    current.setHours(0,0,0,0);
    const endDate = new Date(end);
    endDate.setHours(23,59,59,999);

    while (current <= endDate) {
        const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
        const realEntry = realSessionMap[dateKey];
        
        if (realEntry && realEntry.val > 0) {
            // Priority: Real Data
            data.questions += realEntry.val;
            data.correct += realEntry.correct;
            data.wrong += realEntry.wrong;
            data.empty += realEntry.empty;
            data.net += realEntry.net;
            data.durationSeconds += realEntry.durationSeconds;

            if (realEntry.rawSessions) {
                realEntry.rawSessions.forEach(s => {
                    const sName = s.config.subject;
                    if (!data.subjectStats[sName]) {
                        data.subjectStats[sName] = { val: 0, correct: 0, wrong: 0, empty: 0, duration: 0, topics: {} };
                    }
                    const sData = data.subjectStats[sName];
                    
                    sData.val += s.questions;
                    sData.correct += s.correct;
                    sData.wrong += s.wrong;
                    sData.empty += s.empty;
                    sData.duration += s.durationSeconds;

                    if (s.topicStats && s.topicStats.length > 0) {
                        s.topicStats.forEach(t => {
                            const tName = t.topic;
                            if (!sData.topics[tName]) sData.topics[tName] = { q: 0, c: 0, w: 0, e: 0, dur: 0 };
                            
                            sData.topics[tName].q += t.questions;
                            sData.topics[tName].c += t.correct;
                            sData.topics[tName].w += t.wrong;
                            sData.topics[tName].e += t.empty;
                            sData.topics[tName].dur += (t.durationSeconds || 0); 
                        });
                    } else {
                        const tName = s.config.topic || "Genel";
                        if (!sData.topics[tName]) sData.topics[tName] = { q: 0, c: 0, w: 0, e: 0, dur: 0 };
                        sData.topics[tName].q += s.questions;
                        sData.topics[tName].c += s.correct;
                        sData.topics[tName].w += s.wrong;
                        sData.topics[tName].e += s.empty;
                        sData.topics[tName].dur += s.durationSeconds;
                    }
                });
            }
        } else if (isDevMode) {
            // Fallback: Mock Data
            const mockStats = getMockDayData(getStableDate(new Date(current)));
            data.questions += mockStats.val;
            data.correct += mockStats.correct;
            data.wrong += mockStats.wrong;
            data.empty += mockStats.empty;
            data.net += mockStats.net;
            data.durationSeconds += mockStats.durationSeconds;

            if (mockStats.subjects) {
                mockStats.subjects.forEach(sub => {
                    if (!data.subjectStats[sub.name]) {
                        data.subjectStats[sub.name] = { val: 0, correct: 0, wrong: 0, empty: 0, duration: 0, topics: {} };
                    }
                    const sData = data.subjectStats[sub.name];
                    sData.val += sub.val;
                    
                    const ratio = mockStats.val > 0 ? sub.val / mockStats.val : 0;
                    const c = mockStats.correct * ratio;
                    const w = mockStats.wrong * ratio;
                    const e = mockStats.empty * ratio;
                    const d = mockStats.durationSeconds * ratio;

                    sData.correct += c;
                    sData.wrong += w;
                    sData.empty += e;
                    sData.duration += d;

                    const tName = "Genel Tarama";
                    if (!sData.topics[tName]) sData.topics[tName] = { q: 0, c: 0, w: 0, e: 0, dur: 0 };
                    sData.topics[tName].q += sub.val;
                    sData.topics[tName].c += c;
                    sData.topics[tName].w += w;
                    sData.topics[tName].e += e;
                    sData.topics[tName].dur += d;
                });
            }
        }
        current.setDate(current.getDate() + 1);
    }

    const accuracy = data.questions > 0 ? (data.correct / data.questions) * 100 : 0;
    const durationMinutes = data.durationSeconds / 60;
    const dbs = durationMinutes > 0 ? (data.questions / durationMinutes) : 0;
    const hours = Math.floor(data.durationSeconds / 3600);
    const mins = Math.floor((data.durationSeconds % 3600) / 60);

    const sortedSubjects = Object.entries(data.subjectStats)
        .map(([name, val]) => ({ name, val: val.val }))
        .sort((a,b) => b.val - a.val);

    return {
        ...data,
        accuracy: parseFloat(accuracy.toFixed(1)),
        dbs: parseFloat(dbs.toFixed(2)),
        timeStr: `${hours}s ${mins}dk`,
        sortedSubjects
    };

  }, [selectedPeriod, isDevMode]);

  // --- Lecture View Data Logic ---
  const lectureStats = useMemo(() => {
    const lectureSessions = sessionService.getAllSessions().filter(s => s.config.sessionType === 'lecture');
    
    let start: Date;
    let end: Date;

    if (selectedPeriod === 'Genel') {
        start = new Date(MOCK_START_DATE);
        end = new Date(SIMULATED_TODAY);
    } else {
        const p = parsePeriodString(selectedPeriod)!;
        start = new Date(p.year, p.month, 1);
        end = new Date(p.year, p.month + 1, 0); 
    }

    const stats = {
        totalDuration: 0,
        avgUnderstanding: 0,
        avgFocus: 0,
        finishedCount: 0,
        sessionCount: 0,
        subjectStats: {} as Record<string, { duration: number, sessions: number, understanding: number, focus: number, topics: Record<string, { duration: number, sessions: number }> }>
    };

    let totalUnderstanding = 0;
    let totalFocus = 0;

    const allSessions: any[] = [];

    const processSession = (s: any) => {
        allSessions.push(s);
        const d = s.durationSeconds || 0;
        stats.totalDuration += d;
        totalUnderstanding += (s.understandingScore || 0);
        totalFocus += (s.focusScore || 0);
        if (s.isFinished) stats.finishedCount++;
        stats.sessionCount++;

        const sub = s.config.subject;
        if (!stats.subjectStats[sub]) {
            stats.subjectStats[sub] = { duration: 0, sessions: 0, understanding: 0, focus: 0, topics: {} };
        }
        const sData = stats.subjectStats[sub];
        sData.duration += d;
        sData.sessions++;
        sData.understanding += (s.understandingScore || 0);
        sData.focus += (s.focusScore || 0);

        const topic = s.config.topic || 'Genel';
        if (!sData.topics[topic]) sData.topics[topic] = { duration: 0, sessions: 0 };
        sData.topics[topic].duration += d;
        sData.topics[topic].sessions++;
    };

    // Filter real sessions by period
    lectureSessions.forEach(s => {
        const d = new Date(s.completedAt);
        if (d >= start && d <= end) {
            processSession(s);
        }
    });

    if (isDevMode) {
        const current = new Date(start);
        current.setHours(0,0,0,0);
        const endDate = new Date(end);
        endDate.setHours(23,59,59,999);

        while (current <= endDate) {
            const date = new Date(current);
            const realStats = sessionService.getDailyStats(date, 'lecture');
            
            if (realStats.sessionCount === 0) {
                const m = getMockDayData(getStableDate(date));
                if (m.lectureDurationSeconds > 0) {
                    m.lectureSubjects.forEach(ls => {
                        const mockS = {
                            completedAt: date.toISOString(),
                            durationSeconds: ls.durationSeconds,
                            understandingScore: 4.2, 
                            focusScore: 4.1, 
                            isFinished: true,
                            config: { subject: ls.name, topic: ls.topic, sessionType: 'lecture' }
                        };
                        processSession(mockS);
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }
    }

    if (stats.sessionCount > 0) {
        stats.avgUnderstanding = parseFloat((totalUnderstanding / stats.sessionCount).toFixed(1));
        stats.avgFocus = parseFloat((totalFocus / stats.sessionCount).toFixed(1));
    }

    const sortedSubjects = Object.entries(stats.subjectStats)
        .map(([name, data]) => ({ 
            name, 
            duration: data.duration,
            avgUnderstanding: parseFloat((data.understanding / data.sessions).toFixed(1)),
            avgFocus: parseFloat((data.focus / data.sessions).toFixed(1)),
            sessions: data.sessions
        }))
        .sort((a, b) => b.duration - a.duration);

    const hours = Math.floor(stats.totalDuration / 3600);
    const mins = Math.floor((stats.totalDuration % 3600) / 60);

    return {
        ...stats,
        timeStr: `${hours}s ${mins}dk`,
        sortedSubjects,
        allSessions
    };
  }, [sessionService.getAllSessions(), isDevMode, selectedPeriod]);

  const renderLectureView = () => {
    const { timeStr, avgUnderstanding, avgFocus, finishedCount, sessionCount, sortedSubjects, allSessions } = lectureStats;

    return (
        <div className="animate-fadeIn space-y-6">
            {/* Summary Card */}
            <div className="bg-[#E0F2F1] rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="font-bold text-[#00695C] text-lg">Konu Özeti</h2>
                    <BookOpen className="w-5 h-5 text-[#00695C] opacity-50" />
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/50 rounded-xl">
                                <Clock className="w-5 h-5 text-[#00695C]" />
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Toplam Süre</div>
                                <div className="text-xl font-extrabold text-[#00695C]">{timeStr}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/40 p-2 rounded-xl">
                                <div className="text-[9px] text-gray-500 font-bold uppercase">Anlama</div>
                                <div className="text-sm font-bold text-[#00695C]">%{Math.round(avgUnderstanding * 20)}</div>
                            </div>
                            <div className="bg-white/40 p-2 rounded-xl">
                                <div className="text-[9px] text-gray-500 font-bold uppercase">Odak</div>
                                <div className="text-sm font-bold text-[#00695C]">%{Math.round(avgFocus * 20)}</div>
                            </div>
                        </div>
                    </div>
                    <div className="w-24 h-24 bg-white/30 rounded-full flex flex-col items-center justify-center border-4 border-white/50">
                        <span className="text-2xl font-black text-[#00695C]">{finishedCount}</span>
                        <span className="text-[8px] font-bold text-[#00695C] uppercase">Biten</span>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 relative min-h-[220px]">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="font-bold text-[#5A4A42] text-lg flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-500" />
                        Konu Çalışma Süresi
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button 
                                onClick={() => setShowChartDropdown(!showChartDropdown)}
                                className="bg-teal-50 rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] font-bold text-[#00695C]"
                            >
                                <span>{studyChartPeriod}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            {showChartDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-teal-100 py-1 w-24 z-50 max-h-[120px] overflow-y-auto no-scrollbar">
                                    {availablePeriods.map(opt => (
                                        <button 
                                            key={opt}
                                            onClick={() => {
                                                setStudyChartPeriod(opt);
                                                setShowChartDropdown(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#00695C] hover:bg-teal-50 ${studyChartPeriod === opt ? 'bg-teal-50' : ''}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chart Render */}
                <div className="h-40 w-full flex items-end justify-between gap-2 px-2 relative mt-4">
                    {/* Y-Axis Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] text-gray-300 font-bold -z-0">
                        {chartData.yAxisLabels.map((label, i) => (
                            <div key={i} className="w-full border-b border-gray-100 flex items-center">
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    {chartData.dataPoints.map((point, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
                            <div 
                                className="w-full max-w-[20px] bg-teal-400 rounded-t-md transition-all duration-500 hover:bg-teal-600"
                                style={{ height: `${(point.hours / chartData.maxScale) * 100}%` }}
                            >
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#5A4A42] text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                    {(point.hours || 0)}s
                                </div>
                            </div>
                            <span className="text-[8px] text-gray-400 mt-1 font-medium truncate w-full text-center">{point.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subject Breakdown */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
                <h3 className="font-bold text-[#5A4A42] mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-500" />
                    Ders Bazlı Dağılım
                </h3>
                <div className="space-y-4">
                    {sortedSubjects.length > 0 ? sortedSubjects.map((sub, i) => {
                        const h = Math.floor(sub.duration / 3600);
                        const m = Math.floor((sub.duration % 3600) / 60);
                        return (
                            <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-600">{sub.name}</span>
                                    <span className="text-[10px] font-bold text-teal-600">{h > 0 ? `${h}s ` : ''}{m}dk</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-teal-400 rounded-full" 
                                        style={{ width: `${Math.min(100, (sub.duration / lectureStats.totalDuration) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex gap-3 text-[8px] font-bold text-gray-400">
                                    <span>{sub.sessions} Oturum</span>
                                    <span>Anlama: %{Math.round(sub.avgUnderstanding * 20)}</span>
                                    <span>Odak: %{Math.round(sub.avgFocus * 20)}</span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center text-xs text-gray-400 italic py-4">
                            Konu çalışması verisi bulunamadı.
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="pb-4">
                <h3 className="font-bold text-[#5A4A42] mb-3 px-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Son Konu Çalışmaları
                </h3>
                <div className="space-y-2">
                    {allSessions
                        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                        .slice(0, 5)
                        .map((s, i) => {
                            const h = Math.floor(s.durationSeconds / 3600);
                            const m = Math.floor((s.durationSeconds % 3600) / 60);
                            return (
                                <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[#5A4A42]">{new Date(s.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                            <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">{s.config.subject}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-0.5">{s.config.topic || 'Genel'}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-extrabold text-teal-600 block">{h > 0 ? `${h}s ` : ''}{m}dk</span>
                                        <div className="flex gap-1 justify-end">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Odak" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Anlama" />
                                            {s.isFinished && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Bitti" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
  };

  // --- Mock View Data Logic ---
  const mockStats = useMemo(() => {
      let allSessions = sessionService.getAllSessions().filter(s => s.config.isMockTest);
      
      // Inject Fake Data if Dev Mode
      if (isDevMode) {
          const now = new Date();
          const y = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
          const devMocks: any[] = getDevMockExams(y);
          allSessions = [...allSessions, ...devMocks];
      }

      // 1. Filter Logic
      let sessions = allSessions;
      if (mockFilter !== 'Hepsi') {
          sessions = sessions.filter(s => 
              s.config.examType === mockFilter || 
              (s.config.subject && s.config.subject.toUpperCase().includes(mockFilter))
          );
      }

      // 2. Separate Announced vs Pending
      const announcedSessions = sessions.filter(s => !s.isPendingResult);

      // 3. Sort Date Ascending for Chart (Only Announced)
      const chartSessions = [...announcedSessions].sort((a,b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
      
      // 4. Basic Stats (Announced only for performance)
      const totalAnnounced = announcedSessions.length;
      const totalSolved = sessions.length; // Count all including pending for history list
      const avgNet = totalAnnounced > 0 ? announcedSessions.reduce((acc, s) => acc + s.net, 0) / totalAnnounced : 0;
      const maxNet = totalAnnounced > 0 ? Math.max(...announcedSessions.map(s => s.net)) : 0;
      const lastNet = chartSessions.length > 0 ? chartSessions[chartSessions.length - 1].net : 0;

      // 5. Subject Averages from TopicStats (Announced only)
      const subMap: Record<string, { netSum: number, count: number }> = {};
      
      announcedSessions.forEach(s => {
          if (s.topicStats) {
              s.topicStats.forEach(t => {
                  if (!subMap[t.topic]) subMap[t.topic] = { netSum: 0, count: 0 };
                  const subNet = t.correct - (t.wrong / 4);
                  subMap[t.topic].netSum += subNet;
                  subMap[t.topic].count += 1;
              });
          }
      });

      const subjects = Object.entries(subMap).map(([name, d]) => ({
          name,
          avg: parseFloat((d.netSum / (totalAnnounced || 1)).toFixed(1))
      })).sort((a,b) => b.avg - a.avg);

      // 6. History List (Sorted Descending, include all)
      const history = [...sessions].sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

      return { chartSessions, totalSolved: totalAnnounced, avgNet, maxNet, lastNet, subjects, history };
  }, [mockFilter, isDevMode]);

  // --- Real Data for Strengths Card ---
  const strengthsData = useMemo(() => {
    const subjectList = Object.entries(stats.subjectStats).map(([name, data]: [string, SubjectStatsData]) => {
        const acc = data.val > 0 ? (data.correct / data.val) * 100 : 0;
        const mins = data.duration / 60;
        const speed = mins > 0 ? data.val / mins : 0;
        return {
            name,
            val: data.val,
            accuracy: acc,
            speed: speed,
            duration: data.duration,
            correct: data.correct,
            wrong: data.wrong,
            empty: data.empty,
            topics: data.topics
        };
    });

    let sorted = [...subjectList];
    if (strengthFilter === 'accuracy') {
        sorted.sort((a,b) => b.accuracy - a.accuracy);
    } else if (strengthFilter === 'speed') {
        sorted.sort((a,b) => b.speed - a.speed);
    } else if (strengthFilter === 'questions') {
        sorted.sort((a,b) => b.val - a.val);
    } else if (strengthFilter === 'time') {
        sorted.sort((a,b) => b.duration - a.duration);
    }

    const list = sorted.map((s, i) => {
        let valueDisplay = '';
        if (strengthFilter === 'accuracy') valueDisplay = `%${Math.round(s.accuracy)}`;
        else if (strengthFilter === 'speed') valueDisplay = `${s.speed.toFixed(2)} dbs`;
        else if (strengthFilter === 'questions') valueDisplay = `${Math.round(s.val)}`;
        else if (strengthFilter === 'time') {
             const h = Math.floor(s.duration / 3600);
             const m = Math.floor((s.duration % 3600) / 60);
             valueDisplay = h > 0 ? `${h}s` : `${m}dk`;
        }

        return {
            subject: s.name,
            value: valueDisplay,
            raw: s,
            status: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'none'
        };
    });

    const activeItem = selectedSubject 
        ? list.find(l => l.subject === selectedSubject) 
        : list[0];
    
    let details = null;

    if (activeItem) {
        const s = activeItem.raw;
        const h = Math.floor(s.duration / 3600);
        const m = Math.floor((s.duration % 3600) / 60);
        const topics = Object.entries(s.topics).map(([tName, tData]) => {
            const mins = tData.dur / 60;
            const spd = mins > 0 ? tData.q / mins : 0;
            return {
                label: tName,
                q: Math.round(tData.q),
                speed: spd.toFixed(2),
                correct: Math.round(tData.c),
                wrong: Math.round(tData.w),
                empty: Math.round(tData.e)
            };
        })
        .filter(t => t.q > 0); // Only show topics with questions solved
        
        topics.sort((a,b) => b.q - a.q);

        details = {
            name: s.name,
            timeStr: h > 0 ? `${h}s ${m}dk` : `${m}dk`,
            speed: s.speed.toFixed(2),
            topics: topics
        };
    }

    return { list, details };
  }, [stats, strengthFilter, selectedSubject]);

  // --- Insight Data Calculations ---
  const insights = useMemo(() => {
      // 1. Streak Calculation
      const today = new Date();
      let streak = 0;
      let checkDate = new Date(today);
      
      const hasActivity = (d: Date) => {
          const m = isDevMode ? getMockDayData(getStableDate(d)) : { val: 0, status: 'none' };
          const r = sessionService.getDailyStats(d);
          const totalVal = m.val + r.val;
          const status = m.status; 
          return totalVal > 0 || ['sick', 'saved', 'rest'].includes(status as any);
      };

      if (!hasActivity(checkDate)) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (!hasActivity(checkDate)) streak = 0; 
      }
      
      checkDate = new Date(today);
      if (!hasActivity(checkDate)) checkDate.setDate(checkDate.getDate() - 1);

      while(true) {
          if (hasActivity(checkDate)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }

      const realSessions = sessionService.getAllSessions();
      
      const locationMap: Record<string, { count: number, correct: number, total: number, duration: number }> = {};
      const dayMap: number[] = [0, 0, 0, 0, 0, 0, 0]; 
      const hourMap: number[] = new Array(24).fill(0); 

      let totalDuration = 0;
      let totalQuestions = 0;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let lastWeekEmpty = 0;
      let lastWeekTotal = 0;

      realSessions.forEach(s => {
          // Skip pending results for detailed analysis
          if (s.isPendingResult) return;

          const loc = s.config.location || 'Bilinmiyor';
          if (!locationMap[loc]) locationMap[loc] = { count: 0, correct: 0, total: 0, duration: 0 };
          locationMap[loc].count++;
          locationMap[loc].correct += s.correct;
          locationMap[loc].total += s.questions;
          locationMap[loc].duration += s.durationSeconds;

          const date = new Date(s.completedAt);
          const dayIdx = date.getDay(); 
          dayMap[dayIdx] += s.questions;

          const hour = date.getHours();
          hourMap[hour] += s.correct;

          totalDuration += s.durationSeconds;
          totalQuestions += s.questions;

          if (date >= oneWeekAgo) {
              lastWeekEmpty += s.empty;
              lastWeekTotal += s.questions;
          }
      });

      const positive: InsightItem[] = [];
      const neutral: InsightItem[] = [];
      const negative: InsightItem[] = [];

      if (streak >= 3) {
          positive.push({
              id: 'streak_good',
              type: 'positive',
              title: 'Harika İstikrar!',
              message: `${streak} gündür aralıksız çalışıyorsun.`
          });
      }
      
      const highAccSubject = (Object.entries(stats.subjectStats) as [string, SubjectStatsData][]).find(([_, d]) => d.val > 20 && (d.correct/d.val) > 0.85);
      if (highAccSubject) {
          const acc = Math.round((highAccSubject[1].correct / highAccSubject[1].val) * 100);
          positive.push({
              id: 'high_acc_subj',
              type: 'positive',
              title: 'Tam İsabet!',
              message: `${highAccSubject[0]} dersinde doğruluğun %${acc}.`
          });
      }

      if (isDevMode) {
          positive.push(
            { id: 'm_pos_1', type: 'positive', title: 'Yükseliştesin', message: 'Netlerin son 3 denemedir istikrarlı artıyor.' },
            { id: 'm_pos_2', type: 'positive', title: 'Sabah Kuşu', message: 'Sabah 08:00 - 11:00 arası odaklanman çok yüksek.' }
          );
      }

      if (totalDuration > 0) {
          const globalDBS = totalQuestions / (totalDuration/60);
          Object.entries(locationMap).forEach(([loc, data]) => {
              if (data.total > 20) {
                  const locDBS = data.total / (data.duration/60);
                  if (locDBS < globalDBS * 0.7) {
                      neutral.push({
                          id: `slow_loc_${loc}`,
                          type: 'neutral',
                          title: 'Ortam Uyarısı',
                          message: `${loc} ortamında soruları çözmen yavaşlıyor.`
                      });
                  }
              }
          });
      }

      if (isDevMode) {
          neutral.push(
            { id: 'm_neu_1', type: 'neutral', title: 'Dengeyi Bul', message: 'Matematik çalışırken Sosyali ihmal etme.' },
            { id: 'm_neu_2', type: 'neutral', title: 'Süre Yönetimi', message: 'Paragraf sorularında 2 dakikayı geçiyorsun.' },
            { id: 'm_neu_3', type: 'neutral', title: 'Mola Düzeni', message: 'Son oturumda molaları biraz uzun tuttun.' }
          );
      }

      if (streak === 0 && realSessions.length > 0) {
           negative.push({
              id: 'broken_streak',
              type: 'negative',
              title: 'Seri Bozuldu',
              message: `Bugün henüz çalışmadın. Seriyi canlandır!`
          });
      }

      const lowAccSubject = (Object.entries(stats.subjectStats) as [string, SubjectStatsData][]).find(([_, d]) => d.val > 20 && (d.correct/d.val) < 0.50);
      if (lowAccSubject) {
          const acc = Math.round((lowAccSubject[1].correct / lowAccSubject[1].val) * 100);
          negative.push({
              id: 'low_acc_subj',
              type: 'negative',
              title: 'Destek Lazım',
              message: `${lowAccSubject[0]} doğruluğun %${acc}. Tekrar et.`
          });
      }

      if (isDevMode) {
          negative.push(
              { id: 'm_neg_1', type: 'negative', title: 'Dikkat!', message: 'Son 2 gündür günlük soru hedefine ulaşamadın.' },
              { id: 'm_neg_2', type: 'negative', title: 'Eksik Konular', message: 'Geometri - Üçgenler konusunda çok yanlışın var.' }
          );
      }

      let mostFreqLoc = '-';
      let maxLocCount = 0;
      Object.entries(locationMap).forEach(([l, d]) => {
          if (d.count > maxLocCount) {
              maxLocCount = d.count;
              mostFreqLoc = l;
          }
      });

      let bestLoc = '-';
      let maxLocAcc = -1;
      Object.entries(locationMap).forEach(([l, d]) => {
          if (d.total > 20) {
              const acc = d.correct / d.total;
              if (acc > maxLocAcc) {
                  maxLocAcc = acc;
                  bestLoc = l;
              }
          }
      });
      if (bestLoc === '-' && mostFreqLoc !== '-') bestLoc = mostFreqLoc;

      let favDay = '-';
      let maxDayQs = -1;
      let favDayAvg = 0;
      dayMap.forEach((q, idx) => {
          if (q > maxDayQs) {
              maxDayQs = q;
              favDay = TR_DAYS[idx];
              favDayAvg = q;
          }
      });

      if (realSessions.length === 0 && isDevMode) {
          mostFreqLoc = 'Kütüphane';
          bestLoc = 'Ev';
          favDay = 'Pazar';
          favDayAvg = 145; 
      }

      return {
          positive,
          neutral,
          negative,
          streak,
          mostFreqLoc,
          bestLoc,
          favDay,
          favDayAvg
      };

  }, [stats, isDevMode]);

  // --- Time Chart Data Logic ---
  const chartData = useMemo(() => {
      interface ChartPoint {
          label: string;
          hours: number;
      }
      
      const dataPoints: ChartPoint[] = [];

      const chartType: SessionType | undefined = viewMode === 'question' ? 'question' : viewMode === 'lecture' ? 'lecture' : undefined;

      if (studyChartPeriod === 'Genel') {
          const periodsToPlot = availablePeriods.filter(p => p !== 'Genel');
          
          periodsToPlot.forEach(pString => {
              const p = parsePeriodString(pString)!;
              const start = new Date(p.year, p.month, 1);
              const end = new Date(p.year, p.month + 1, 0);

              let totalSec = 0;
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                 const date = new Date(d);
                 const realStats = sessionService.getDailyStats(date, chartType);
                 if (realStats.sessionCount > 0) {
                     totalSec += (realStats.durationSeconds || 0);
                 } else if (isDevMode) {
                     const m = getMockDayData(getStableDate(date));
                     totalSec += (chartType === 'question' ? (m.durationSeconds || 0) : (m.lectureDurationSeconds || 0));
                 }
              }
              const label = TR_MONTHS[p.month];
              dataPoints.push({ 
                  label: label, 
                  hours: parseFloat((totalSec / 3600).toFixed(1)) || 0
              });
          });

      } else {
          const p = parsePeriodString(studyChartPeriod)!;
          const monthIdx = p.month;
          const year = p.year;
          const monthName = TR_MONTHS[monthIdx];
          
          // Generate actual weeks for the month (Monday to Sunday)
          const firstDayOfMonth = new Date(year, monthIdx, 1);
          const lastDayOfMonth = new Date(year, monthIdx + 1, 0);
          
          let currentWeekStart = new Date(firstDayOfMonth);
          // Adjust to the Monday of the week containing the 1st of the month
          const dayOfWeek = currentWeekStart.getDay();
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          currentWeekStart.setDate(currentWeekStart.getDate() - diffToMonday);

          while (currentWeekStart <= lastDayOfMonth) {
              let weekTotalSec = 0;
              let weekLabel = "";
              
              // A week is 7 days (Mon-Sun)
              for (let i = 0; i < 7; i++) {
                  const date = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
                  
                  // Only count if the day belongs to the selected month
                  if (date.getMonth() === monthIdx && date.getFullYear() === year) {
                      if (weekLabel === "") {
                          weekLabel = `${monthName} ${date.getDate()}`;
                      }
                      
                      const realStats = sessionService.getDailyStats(date, chartType);
                      if (realStats.sessionCount > 0) {
                          weekTotalSec += (realStats.durationSeconds || 0);
                      } else if (isDevMode) {
                          const m = getMockDayData(getStableDate(date));
                          weekTotalSec += (chartType === 'question' ? (m.durationSeconds || 0) : (m.lectureDurationSeconds || 0));
                      }
                  }
              }
              
              if (weekLabel !== "") {
                  dataPoints.push({
                      label: weekLabel,
                      hours: parseFloat((weekTotalSec / 3600).toFixed(1)) || 0
                  });
              }
              
              currentWeekStart.setDate(currentWeekStart.getDate() + 7);
          }
      }

      // Filter out NaNs for max calculation
      const validHours = dataPoints.map(d => d.hours).filter(h => !isNaN(h) && isFinite(h));
      const maxVal = validHours.length > 0 ? Math.max(...validHours) : 0;
      
      // Better scaling logic - use "nice" numbers
      let maxScale = 5;
      if (maxVal > 0) {
          const rawCeil = maxVal * 1.15;
          if (rawCeil <= 2) maxScale = 2;
          else if (rawCeil <= 5) maxScale = 5;
          else if (rawCeil <= 10) maxScale = 10;
          else if (rawCeil <= 20) maxScale = 20;
          else if (rawCeil <= 40) maxScale = 40;
          else if (rawCeil <= 60) maxScale = 60;
          else if (rawCeil <= 100) maxScale = 100;
          else maxScale = Math.ceil(rawCeil / 20) * 20;
      }

      const yAxisLabels = [
          `${maxScale}S`, 
          `${(maxScale * 0.75).toFixed(maxScale < 5 ? 1 : 0)}S`, 
          `${(maxScale * 0.5).toFixed(maxScale < 5 ? 1 : 0)}S`, 
          `${(maxScale * 0.25).toFixed(maxScale < 5 ? 1 : 0)}S`, 
          '0S'
      ];

      return { dataPoints, yAxisLabels, maxScale };
  }, [studyChartPeriod, availablePeriods, isDevMode, viewMode, sessionService.getAllSessions().length]);

  const getInsightStyle = (type: InsightType) => {
      switch(type) {
          case 'positive': return {
              bg: 'bg-[#DCFCE7]', border: 'border-green-300', text: 'text-green-900', 
              icon: <CheckCircle className="w-3 h-3 text-green-700 flex-shrink-0" />
          };
          case 'neutral': return {
              bg: 'bg-[#FEF9C3]', border: 'border-yellow-300', text: 'text-yellow-900',
              icon: <Info className="w-3 h-3 text-yellow-700 flex-shrink-0" />
          };
          case 'negative': return {
              bg: 'bg-[#FEE2E2]', border: 'border-red-300', text: 'text-red-900',
              icon: <AlertCircle className="w-3 h-3 text-red-700 flex-shrink-0" />
          };
          default: return {
              bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900',
              icon: <Info className="w-3 h-3 text-gray-500 flex-shrink-0" />
          };
      }
  };

  const renderInsightBar = (items: InsightItem[], index: number, setIndex: React.Dispatch<React.SetStateAction<number>>, type: InsightType) => {
      const active = items[index];
      if (!active) return null;

      const styles = getInsightStyle(type);
      
      const handleNext = () => setIndex((prev) => (prev + 1) % items.length);
      const handlePrev = () => setIndex((prev) => (prev - 1 + items.length) % items.length);

      return (
          <div className={`rounded-lg border ${styles.bg} ${styles.border} px-2 py-2 flex items-center justify-between gap-2 shadow-sm relative min-h-[50px] transition-all`}>
              
              <button 
                onClick={handlePrev}
                disabled={items.length <= 1}
                className={`p-1 rounded-full hover:bg-black/5 transition-colors ${items.length <= 1 ? 'opacity-20 cursor-default' : ''}`}
              >
                  <ChevronLeft className="w-3 h-3 text-gray-700 opacity-60" />
              </button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                  {styles.icon}
                  <div className="min-w-0 flex flex-col justify-center">
                      <div className={`text-[10px] font-bold ${styles.text} truncate`}>{active.title}</div>
                      <div className={`text-[9px] ${styles.text} opacity-90 leading-tight font-medium whitespace-normal pr-1`}>
                          {active.message}
                      </div>
                  </div>
              </div>

              <button 
                onClick={handleNext}
                disabled={items.length <= 1}
                className={`p-1 rounded-full hover:bg-black/5 transition-colors ${items.length <= 1 ? 'opacity-20 cursor-default' : ''}`}
              >
                  <ChevronRight className="w-3 h-3 text-gray-700 opacity-60" />
              </button>
              
              {items.length > 1 && (
                  <div className="absolute bottom-1 w-full flex justify-center gap-0.5 left-0">
                        {items.map((_, i) => (
                            <div key={i} className={`w-0.5 h-0.5 rounded-full ${i === index ? 'bg-black/40' : 'bg-black/10'}`} />
                        ))}
                  </div>
              )}
          </div>
      );
  };

  const renderMockView = () => {
      const { chartSessions, totalSolved, avgNet, maxNet, lastNet, subjects, history } = mockStats;
      
      // Calculate Chart Points
      const chartPoints = chartSessions.map((s, i) => ({
          date: new Date(s.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
          net: s.net,
          fullDate: new Date(s.completedAt)
      }));

      // Determine Y Axis Max (120 for TYT, 80 for AYT, or dynamic)
      const yMax = Math.max(120, maxNet + 10);
      
      // Chart Rendering Constants
      const PADDING_TOP = 20;
      const PADDING_BOTTOM = 20;
      const PADDING_X = 32; // Increased horizontal padding to constrain chart width
      const AVAILABLE_HEIGHT = chartDims.height - PADDING_TOP - PADDING_BOTTOM;
      const AVAILABLE_WIDTH = chartDims.width - (PADDING_X * 2);
      
      return (
          <div className="animate-fadeIn space-y-6">
              
              {/* Filter Pills */}
              <div className="flex justify-center mb-2">
                  <div className="bg-white/50 backdrop-blur-md p-1 rounded-xl flex gap-1 shadow-sm border border-white/40">
                      {mockFilters.map((filter) => (
                          <button
                              key={filter}
                              onClick={() => setMockFilter(filter as any)}
                              className={`
                                  px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                                  ${mockFilter === filter 
                                      ? 'bg-[#2D3A31] text-white shadow-md' 
                                      : 'text-[#5A4A42] hover:bg-white/50'
                                  }
                              `}
                          >
                              {filter}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Net Progression Chart (Hero) */}
              <div className="bg-white rounded-3xl p-5 shadow-sm relative overflow-hidden min-h-[220px]">
                  <h3 className="font-bold text-[#5A4A42] mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      Net Gelişimi
                  </h3>
                  
                  {/* Chart Container - Measured by ref */}
                  <div ref={chartRef} className="w-full h-32 relative mt-4">
                      
                      {chartDims.width > 0 && chartPoints.length > 1 ? (
                          <>
                              {/* Y-Axis Lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                                  <div key={i} className="absolute w-full border-t border-dashed border-gray-200" style={{ bottom: `${PADDING_BOTTOM + (p * AVAILABLE_HEIGHT)}px` }}>
                                      <span className="absolute -left-0 -top-2 text-[8px] text-gray-400">{Math.round(p * yMax)}</span>
                                  </div>
                              ))}
                              
                              <svg width={chartDims.width} height={chartDims.height} className="overflow-visible">
                                  {/* Line Path */}
                                  <polyline 
                                      fill="none" 
                                      stroke="#F2994A" 
                                      strokeWidth="2" 
                                      points={chartPoints.map((p, i) => {
                                          const x = PADDING_X + (i / (chartPoints.length - 1)) * AVAILABLE_WIDTH;
                                          const y = chartDims.height - PADDING_BOTTOM - ((p.net / yMax) * AVAILABLE_HEIGHT);
                                          return `${x},${y}`;
                                      }).join(' ')}
                                  />
                                  
                                  {/* Dots & Labels */}
                                  {chartPoints.map((p, i) => {
                                      const x = PADDING_X + (i / (chartPoints.length - 1)) * AVAILABLE_WIDTH;
                                      const y = chartDims.height - PADDING_BOTTOM - ((p.net / yMax) * AVAILABLE_HEIGHT);
                                      return (
                                          <g key={i}>
                                              <circle cx={x} cy={y} r="3" fill="#F2994A" stroke="white" strokeWidth="2" />
                                              {/* Always show Net Label */}
                                              <text x={x} y={y - 8} textAnchor="middle" fontSize="10" fill="#5A4A42" fontWeight="bold">
                                                  {p.net}
                                              </text>
                                          </g>
                                      );
                                  })}
                              </svg>
                              
                              {/* X-Axis Labels */}
                              <div className="absolute top-full w-full mt-2 h-4">
                                  {chartPoints.map((p, i) => {
                                      const x = PADDING_X + (i / (chartPoints.length - 1)) * AVAILABLE_WIDTH;
                                      const leftPos = (x / chartDims.width) * 100;
                                      return (
                                          <span 
                                            key={i} 
                                            className={`absolute text-[8px] text-gray-400 transform -translate-x-1/2 whitespace-nowrap ${i % 2 !== 0 && chartPoints.length > 5 ? 'hidden' : 'block'}`}
                                            style={{ left: `${leftPos}%` }}
                                          >
                                              {p.date}
                                          </span>
                                      );
                                  })}
                              </div>
                          </>
                      ) : (
                          <div className="flex items-center justify-center h-32 text-xs text-gray-400 italic">
                              {chartPoints.length <= 1 ? "Grafik için en az 2 açıklanmış deneme sonucu gerekli." : "Yükleniyor..."}
                          </div>
                      )}
                  </div>
              </div>

              {/* Snapshot Cards - Grid Layout Fix */}
              <div className="grid grid-cols-4 gap-2">
                  <div className="bg-[#FFF8E7] p-2 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center items-center text-center h-20">
                      <span className="text-[9px] text-gray-500 font-bold uppercase mb-1 truncate w-full">Ortalama</span>
                      <span className="text-lg font-extrabold text-[#5A4A42]">{avgNet.toFixed(1)}</span>
                  </div>
                  <div className="bg-[#E0F2F1] p-2 rounded-2xl shadow-sm border border-teal-100 flex flex-col justify-center items-center text-center h-20">
                      <span className="text-[9px] text-gray-500 font-bold uppercase mb-1 truncate w-full">En Yüksek</span>
                      <span className="text-lg font-extrabold text-[#00695C]">{maxNet}</span>
                  </div>
                  <div className="bg-[#F3E5F5] p-2 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-center items-center text-center h-20">
                      <span className="text-[9px] text-gray-500 font-bold uppercase mb-1 truncate w-full">Son Deneme</span>
                      <div className="flex items-baseline gap-0.5 justify-center">
                          <span className="text-lg font-extrabold text-[#6A1B9A]">{lastNet}</span>
                          <span className={`text-[8px] font-bold ${lastNet >= avgNet ? 'text-green-500' : 'text-red-500'}`}>
                              {lastNet >= avgNet ? '↑' : '↓'}
                          </span>
                      </div>
                  </div>
                  <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center h-20">
                      <span className="text-[9px] text-gray-500 font-bold uppercase mb-1 truncate w-full">Çözülen</span>
                      <span className="text-lg font-extrabold text-gray-700">{totalSolved}</span>
                  </div>
              </div>

              {/* Subject Breakdown */}
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                  <h3 className="font-bold text-[#5A4A42] mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      Branş Ortalamaları
                  </h3>
                  <div className="space-y-3">
                      {subjects.length > 0 ? subjects.map((sub, i) => (
                          <div key={i} className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-600 w-1/3 truncate">{sub.name}</span>
                              <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full bg-blue-400 rounded-full" 
                                      style={{ width: `${Math.min(100, (sub.avg / 40) * 100)}%` }} // Assuming 40q max for scaling visually
                                  />
                              </div>
                              <span className="text-xs font-bold text-[#5A4A42] w-12 text-right">{sub.avg} Net</span>
                          </div>
                      )) : (
                          <div className="text-center text-xs text-gray-400 italic py-2">
                              Konu bazlı veri bulunamadı.
                          </div>
                      )}
                  </div>
              </div>

              {/* History List */}
              <div className="pb-4">
                  <h3 className="font-bold text-[#5A4A42] mb-3 px-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Geçmiş Denemeler
                  </h3>
                  <div className="space-y-2">
                      {history.map((h, i) => (
                          <div key={i} className={`bg-white p-3 rounded-xl shadow-sm border flex justify-between items-center ${h.isPendingResult ? 'border-blue-100 bg-blue-50/20' : 'border-gray-50'}`}>
                              <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#5A4A42]">{new Date(h.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                      <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">{h.config.examType || 'Genel'}</span>
                                      {h.isPendingResult && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">BEKLİYOR</span>}
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-0.5">{h.config.publisher || 'Yayın Yok'}</span>
                              </div>
                              <div className="text-right">
                                  {h.isPendingResult ? (
                                      <span className="text-xs font-bold text-blue-600 italic">Açıklanmadı</span>
                                  ) : (
                                      <>
                                          <span className="text-sm font-extrabold text-[#2D3A31] block">{h.net} Net</span>
                                          <span className="text-[9px] text-gray-400 font-medium">Doğruluk %{Math.round(h.accuracy)}</span>
                                      </>
                                  )}
                              </div>
                          </div>
                      ))}
                      {history.length === 0 && (
                          <div className="text-center text-xs text-gray-400 py-4 bg-white/50 rounded-xl border border-dashed border-gray-200">
                              Henüz deneme kaydı yok.
                          </div>
                      )}
                  </div>
              </div>

          </div>
      );
  };

  return (
    <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar pb-32 font-sans relative">
        
        <div className="relative z-10 px-4 pt-8">
            
            {/* Header & Toggle */}
            <div className="flex flex-col mb-6">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h1 className="text-3xl font-bold text-[#2D3A31]">İstatistikler</h1>
                    <LogOut className="w-6 h-6 text-[#2D3A31] transform rotate-180 opacity-70" />
                </div>

                {/* View Mode Toggle */}
                <div className="bg-[#E0E0E0] p-1 rounded-2xl flex relative w-full max-w-sm mx-auto">
                    {/* Sliding Background */}
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out z-0 ${
                            viewMode === 'question' ? 'left-1' : 
                            viewMode === 'mock' ? 'left-[33.33%]' : 
                            'left-[66.66%]'
                        }`}
                    />
                    
                    <button 
                        onClick={() => setViewMode('question')}
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors ${viewMode === 'question' ? 'text-[#2D3A31]' : 'text-gray-500'}`}
                    >
                        Soru
                    </button>
                    <button 
                        onClick={() => setViewMode('mock')}
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors ${viewMode === 'mock' ? 'text-[#2D3A31]' : 'text-gray-500'}`}
                    >
                        Deneme
                    </button>
                    <button 
                        onClick={() => setViewMode('lecture')}
                        className={`flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors ${viewMode === 'lecture' ? 'text-[#2D3A31]' : 'text-gray-500'}`}
                    >
                        Konu
                    </button>
                </div>
            </div>

            {/* Content Based on View Mode */}
            {viewMode === 'mock' ? renderMockView() : viewMode === 'lecture' ? renderLectureView() : (
                <div className="animate-fadeIn">
                    <div className="bg-[#FDE8A8] rounded-3xl p-5 shadow-sm mb-6 relative overflow-visible">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="font-bold text-[#5A4A42] text-lg">Özet</h2>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                                    className="bg-white/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] font-bold text-[#5A4A42] active:bg-white/60 transition-colors"
                                >
                                    <span>{selectedPeriod}</span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>

                                {showPeriodDropdown && (
                                    <div className="absolute right-0 top-full mt-1 bg-[#FFFBEB] rounded-xl shadow-lg border border-orange-100 py-1 w-24 z-50 max-h-[150px] overflow-y-auto no-scrollbar">
                                        {availablePeriods.map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => {
                                                    setSelectedPeriod(opt);
                                                    setShowPeriodDropdown(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#5A4A42] hover:bg-orange-100 transition-colors ${selectedPeriod === opt ? 'bg-orange-50' : ''}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="w-[120px] h-[120px] relative flex items-center justify-center">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    <circle cx="50" cy="50" r={40} stroke="white" strokeWidth="10" fill="none" opacity="0.5" />
                                    
                                    {/* Subject Distribution Circle */}
                                    {stats.questions > 0 && (() => {
                                        let cumulativeOffset = 0;
                                        const C = 2 * Math.PI * 40;
                                        return stats.sortedSubjects.map((sub, i) => {
                                            const segmentLen = (sub.val / stats.questions) * C;
                                            const offset = cumulativeOffset;
                                            cumulativeOffset += segmentLen;
                                            const color = CHART_COLORS[i % CHART_COLORS.length];
                                            return (
                                                <circle 
                                                    key={i}
                                                    cx="50" cy="50" r={40} 
                                                    stroke={color} strokeWidth="10" fill="none" 
                                                    strokeDasharray={`${segmentLen} ${C}`} 
                                                    strokeDashoffset={-offset}
                                                    strokeLinecap="butt" 
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                                
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#5A4A42]">
                                    <span className="text-[10px] opacity-70 italic">doğruluk</span>
                                    <span className="text-xl font-bold">%{stats.accuracy}</span>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-y-4 gap-x-1 pl-2 text-center content-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[#888]">Soru</span>
                                    <span className="font-bold text-[#5A4A42]">{stats.questions}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[#888]">Doğru</span>
                                    <span className="font-bold text-[#5A4A42]">{stats.correct}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[#888]">Yanlış</span>
                                    <span className="font-bold text-[#5A4A42]">{stats.wrong}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[#888]">Boş</span>
                                    <span className="font-bold text-[#5A4A42]">{stats.empty}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm mb-6 relative min-h-[220px]">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="font-bold text-[#5A4A42] text-lg flex items-center gap-2">
                                <Activity className="w-4 h-4 text-orange-500" />
                                Soru Çözme Süresi
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowChartDropdown(!showChartDropdown)}
                                        className="bg-[#FDE8A8]/50 rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] font-bold text-[#5A4A42]"
                                    >
                                        <span>{studyChartPeriod}</span>
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    
                                    {showChartDropdown && (
                                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-orange-100 py-1 w-24 z-50 max-h-[120px] overflow-y-auto no-scrollbar">
                                            {availablePeriods.map(opt => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => {
                                                        setStudyChartPeriod(opt);
                                                        setShowChartDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-1.5 text-[10px] font-bold text-[#5A4A42] hover:bg-orange-50 ${studyChartPeriod === opt ? 'bg-orange-50' : ''}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chart Render */}
                        <div className="h-40 w-full flex items-end justify-between gap-2 px-2 relative mt-4">
                            {/* Y-Axis Grid */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] text-gray-300 font-bold -z-0">
                                {chartData.yAxisLabels.map((label, i) => (
                                    <div key={i} className="w-full border-b border-gray-100 flex items-center">
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>

                            {chartData.dataPoints.map((point, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
                                    <div 
                                        className="w-full max-w-[20px] bg-[#F2C94C] rounded-t-md transition-all duration-500 hover:bg-[#F2994A]"
                                        style={{ height: `${(point.hours / chartData.maxScale) * 100}%` }}
                                    >
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#5A4A42] text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            {(point.hours || 0)}s
                                        </div>
                                    </div>
                                    <span className="text-[8px] text-gray-400 mt-1 font-medium truncate w-full text-center">{point.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Insights */}
                    <div className="space-y-3 mb-6">
                        <h3 className="font-bold text-[#5A4A42] text-sm ml-1 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Analizler
                        </h3>
                        {renderInsightBar(insights.positive, posIndex, setPosIndex, 'positive')}
                        {renderInsightBar(insights.neutral, neuIndex, setNeuIndex, 'neutral')}
                        {renderInsightBar(insights.negative, negIndex, setNegIndex, 'negative')}
                    </div>

                    {/* Strengths Card */}
                    <div className="bg-white rounded-3xl p-5 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-[#5A4A42] text-lg flex items-center gap-2">
                                <Target className="w-4 h-4 text-red-500" />
                                Ders Analizi
                            </h2>
                            <button 
                                onClick={() => setShowStrengthFilter(!showStrengthFilter)}
                                className="bg-gray-100 p-1.5 rounded-lg text-gray-600 relative"
                            >
                                <Filter className="w-4 h-4" />
                                {showStrengthFilter && (
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100">
                                        {STRENGTH_FILTERS.map(f => (
                                            <div 
                                                key={f.id}
                                                onClick={() => {
                                                    setStrengthFilter(f.id);
                                                    setShowStrengthFilter(false);
                                                }}
                                                className={`px-3 py-2 text-xs font-bold hover:bg-gray-50 cursor-pointer ${strengthFilter === f.id ? 'bg-gray-50 text-orange-500' : 'text-gray-600'}`}
                                            >
                                                {f.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {strengthsData.list.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedSubject(item.subject)}
                                    className={`
                                        flex-shrink-0 min-w-[100px] bg-gray-50 rounded-xl p-3 border-2 transition-all text-left
                                        ${item.subject === selectedSubject 
                                            ? 'border-orange-200 bg-orange-50 shadow-sm' 
                                            : 'border-transparent hover:border-gray-200'
                                        }
                                    `}
                                >
                                    <div className="text-[10px] text-gray-500 font-bold mb-1 truncate">{item.subject}</div>
                                    <div className="text-lg font-bold text-[#5A4A42]">{item.value}</div>
                                    {item.status !== 'none' && (
                                        <div className={`text-[9px] font-bold mt-1 ${item.status === 'gold' ? 'text-yellow-600' : item.status === 'silver' ? 'text-gray-500' : 'text-orange-700'}`}>
                                            {item.status === 'gold' ? 'En İyi' : item.status === 'silver' ? '2. İyi' : '3. İyi'}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {strengthsData.details && (
                            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-[#5A4A42]">{strengthsData.details.name} Detayı</h4>
                                    <span className="text-xs font-bold text-gray-500">{strengthsData.details.timeStr}</span>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                    {strengthsData.details.topics.length > 0 ? (
                                        strengthsData.details.topics.map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-700 truncate">{t.label}</div>
                                                <div className="text-[9px] text-gray-400">{t.q} Soru • {t.speed} dbs</div>
                                            </div>
                                            <div className="flex gap-2 text-[9px] font-bold">
                                                <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{t.correct} D</span>
                                                <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{t.wrong} Y</span>
                                                <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{t.empty} B</span>
                                            </div>
                                        </div>
                                    ))
                                    ) : (
                                        <div className="text-center text-xs text-gray-400 py-4 italic">
                                            Bu ders için henüz soru çözümü yok.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AnalyticsPage;