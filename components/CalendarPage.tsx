
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Rewind, Clock, StickyNote, AlertCircle, Edit3, Trash2, X, AlertTriangle, BookOpen, Feather } from 'lucide-react';
import { SessionResult, PlannedSession, UserModel, SessionType } from '../types';
import { sessionService, StoredSession } from '../services/sessionService';
import { getMockDayData, APP_START_DATE, SIMULATED_TODAY } from '../constants';
import ManualSessionModal from './calendar/ManualSessionModal';
import PlanSessionModal from './calendar/PlanSessionModal';
import UpdateMockResultModal from './calendar/UpdateMockResultModal';

// Constants
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

interface DayData {
    date: Date;
    val: number; // Always Questions
    durationSeconds: number; // Duration in seconds
    status: string; // 'sick' | 'rest' | 'saved' | 'none' | 'low' | 'medium' | 'high'
    plans: PlannedSession[];
    hasPendingMock?: boolean;
    pendingMockSession?: StoredSession;
    isDisabled?: boolean;
    isFuture?: boolean;
}

// Extended Interface for Display
interface DisplaySession extends StoredSession {
    monthIndex: number; // 1-based index within the month
}

interface Props {
  user: UserModel;
  isDevMode: boolean;
}

const CalendarPage: React.FC<Props> = ({ user, isDevMode }) => {
    // State
    const [viewDate, setViewDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState<'month' | 'year'>('month');
    const [selectionKey, setSelectionKey] = useState<string>(''); // YYYY-MM-DD or week-X-M or weekday-X
    const [showAmounts, setShowAmounts] = useState(true);
    const [activeMode, setActiveMode] = useState<SessionType>('question');
    
    // Modal Management
    const [activeModalType, setActiveModalType] = useState<'none' | 'pending' | 'manual' | 'plan'>('none');
    const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null);
    const [selectedPendingSession, setSelectedPendingSession] = useState<StoredSession | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    
    const [refreshTrigger, setRefreshTrigger] = useState(0); // To force reload
    
    // Detail View State
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [topicIndex, setTopicIndex] = useState(-1); // -1 = Total, 0+ = Specific Topic index
    const [focusedSessionIndex, setFocusedSessionIndex] = useState(-1); // -1 = Total, 0+ = Specific Session in the filtered list

    const isTimeTarget = user.targetType === 'time';

    const getStableDate = (localDate: Date) => {
        return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0));
    };

    const closeModals = () => {
        setActiveModalType('none');
        setSelectedModalDate(null);
        setSelectedPendingSession(null);
    };

    const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHeaderTitleDown = () => {
        pressTimer.current = setTimeout(() => {
            setCalendarView(v => v === 'month' ? 'year' : 'month');
            setSelectionKey('');
            setFocusedSessionIndex(-1);
        }, 500);
    };
    const handleHeaderTitleUp = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };
    
    const handleHeaderTitleClick = () => {
        if (calendarView === 'month') {
            setSelectionKey('');
            setSelectedSubject(null);
            setTopicIndex(-1);
            setFocusedSessionIndex(-1);
        }
    };

    const cellPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = React.useRef(false);

    const openInteractionModal = (day: DayData) => {
        setSelectedModalDate(day.date);
        const now = new Date();
        now.setHours(0,0,0,0);
        const target = new Date(day.date);
        target.setHours(0,0,0,0);

        if (target > now) {
            setActiveModalType('plan');
        } else if (day.pendingMockSession) {
            setSelectedPendingSession(day.pendingMockSession);
            setActiveModalType('pending');
        } else {
            setActiveModalType('manual');
        }
    };

    const handleCellTouchStart = (day: DayData) => {
        isLongPress.current = false;
        if (cellPressTimer.current) clearTimeout(cellPressTimer.current);
        
        cellPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            const key = getLocalISODate(day.date);
            setSelectionKey(key);
            setSelectedSubject(null);
            setTopicIndex(-1);
            setFocusedSessionIndex(-1);
            openInteractionModal(day);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 800); 
    };

    const handleCellTouchEnd = () => {
        if (cellPressTimer.current) {
            clearTimeout(cellPressTimer.current);
            cellPressTimer.current = null;
        }
    };

    const handleMonthChange = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
        setSelectionKey('');
        setSelectedSubject(null);
        setTopicIndex(-1);
        setFocusedSessionIndex(-1);
    };

    const handleYearChange = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(newDate.getFullYear() + delta);
        setViewDate(newDate);
        setSelectionKey('');
        setFocusedSessionIndex(-1);
    };

    const monthData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayDow = new Date(year, month, 1).getDay(); 
        const startOffset = firstDayDow === 0 ? 6 : firstDayDow - 1;

        const days: (DayData | null)[] = Array(startOffset).fill(null);
        const allSessions = sessionService.getAllSessions().filter(s => s.config.sessionType === activeMode);

        for (let i = 1; i <= daysInMonth; i++) {
            const current = new Date(year, month, i);
            const isFuture = getStableDate(current) > getStableDate(SIMULATED_TODAY);
            const mock = isDevMode ? getMockDayData(getStableDate(current)) : { val: 0, status: 'none', durationSeconds: 0, lectureDurationSeconds: 0, plans: [] };
            const realStats = sessionService.getDailyStats(current, activeMode);
            const plans = sessionService.getPlannedSessions().filter(p => p.date === current.toISOString().split('T')[0]);

            const daySessions = allSessions.filter(s => {
                const d = new Date(s.completedAt);
                return d.getFullYear() === current.getFullYear() && d.getMonth() === current.getMonth() && d.getDate() === current.getDate();
            });
            const pendingMock = daySessions.find(s => s.isPendingResult);

            const hasRealData = realStats.sessionCount > 0;
            const totalSeconds = hasRealData ? realStats.durationSeconds : (isDevMode ? (activeMode === 'question' ? mock.durationSeconds : (mock.lectureDurationSeconds || 0)) : 0);
            const totalQuestions = hasRealData ? realStats.val : (isDevMode ? mock.val : 0);
            
            // For lecture mode, we use hours as the primary value for thresholds and display
            const displayVal = activeMode === 'question' ? totalQuestions : parseFloat((totalSeconds / 3600).toFixed(1));
            
            let status = hasRealData ? 'low' : mock.status;

            if (!['sick', 'rest', 'saved'].includes(status)) {
                if (activeMode === 'question') {
                    if (totalQuestions > 200) status = 'high';
                    else if (totalQuestions > 100) status = 'medium';
                    else if (totalQuestions > 0) status = 'low';
                    else status = 'none';
                } else {
                    // Lecture thresholds in hours
                    if (displayVal >= 2) status = 'high';
                    else if (displayVal >= 1) status = 'medium';
                    else if (displayVal > 0) status = 'low';
                    else status = 'none';
                }
            }

            days.push({
                date: current, val: displayVal, durationSeconds: totalSeconds, status, plans,
                hasPendingMock: !!pendingMock, pendingMockSession: pendingMock, isDisabled: false, isFuture
            });
        }
        return days;
    }, [viewDate, isDevMode, refreshTrigger, activeMode]);

    const weeks = useMemo(() => {
        const result = [];
        let currentWeek = [];
        for (let i = 0; i < monthData.length; i++) {
            currentWeek.push(monthData[i]);
            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            result.push(currentWeek);
        }
        return result;
    }, [monthData]);

    const maxVal = useMemo(() => Math.max(...monthData.map(d => d ? d.val : 0)), [monthData]);

    const getWeekNumber = (d: Date) => {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const getLocalISODate = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60 * 1000));
        return local.toISOString().split('T')[0];
    };

    const getStatusColor = (status: string, isSelected: boolean) => {
        if (isSelected) return 'bg-[#2D3A31] text-white';
        
        if (activeMode === 'lecture') {
            switch (status) {
                case 'high': return 'bg-blue-600 text-white'; 
                case 'medium': return 'bg-blue-400 text-white'; 
                case 'low': return 'bg-blue-200 text-blue-900'; 
                case 'sick': return 'bg-red-200 text-red-800';
                case 'rest': return 'bg-orange-200 text-orange-800';
                case 'saved': return 'bg-blue-200 text-blue-800';
                default: return 'bg-white text-gray-400 hover:bg-gray-50';
            }
        }

        switch (status) {
            case 'high': return 'bg-[#4ADE80] text-[#064E3B]'; 
            case 'medium': return 'bg-[#86EFAC] text-[#14532D]'; 
            case 'low': return 'bg-[#BBF7D0] text-[#14532D]'; 
            case 'sick': return 'bg-red-200 text-red-800';
            case 'rest': return 'bg-orange-200 text-orange-800';
            case 'saved': return 'bg-blue-200 text-blue-800';
            default: return 'bg-white text-gray-400 hover:bg-gray-50';
        }
    };

    const handleClick = (day: DayData) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        const key = getLocalISODate(day.date);
        if (selectionKey === key) {
            openInteractionModal(day);
        } else {
            setSelectionKey(key);
            setSelectedSubject(null);
            setTopicIndex(-1);
            setFocusedSessionIndex(-1);
        }
    };

    const selectWeekday = (index: number) => {
        const key = `weekday-${index}`;
        setSelectionKey(key === selectionKey ? '' : key);
        setSelectedSubject(null);
        setTopicIndex(-1);
        setFocusedSessionIndex(-1);
    };

    const selectWeek = (index: number) => {
        const key = `week-${index}-${viewDate.getMonth()}`;
        setSelectionKey(key === selectionKey ? '' : key);
        setSelectedSubject(null);
        setTopicIndex(-1);
        setFocusedSessionIndex(-1);
    };

    const weeklyTargetValue = useMemo(() => {
        let goal = user.targetGoal || 15; 
        if (user.targetPeriod === 'monthly') goal = goal / 4; 
        if (isTimeTarget) return parseFloat(goal.toFixed(1)) + 's';
        else return Math.round(goal);
    }, [user.targetPeriod, user.targetGoal, isTimeTarget]);

    const generateMockSessions = (date: Date, type: SessionType): StoredSession[] => {
        const m = getMockDayData(getStableDate(date));
        const sessions: StoredSession[] = [];
        
        if (type === 'question') {
            if (m.val === 0) return [];
            m.subjects.forEach((sub, i) => {
                const ratio = m.val > 0 ? sub.val / m.val : 0;
                const duration = Math.floor(m.durationSeconds * ratio);
                const correct = Math.floor(m.correct * ratio);
                const wrong = Math.floor(m.wrong * ratio);
                const empty = Math.floor(m.empty * ratio);
                const net = correct - (wrong / 4);
                const acc = sub.val > 0 ? (correct / sub.val) * 100 : 0;
                sessions.push({
                    id: `mock_q_${date.getTime()}_${i}`,
                    completedAt: date.toISOString(), 
                    config: { sessionType: 'question', subject: sub.name, topic: 'Genel', durationMinutes: Math.floor(duration / 60), isMockTest: false, mood: 'Dev', location: 'Dev', breakReminderInterval: 0, activeTopics: ['Genel'] },
                    questions: sub.val, correct, wrong, empty, net, accuracy: acc, durationSeconds: duration,
                    topicStats: [{ topic: 'Genel', questions: sub.val, correct, wrong, empty, durationSeconds: duration }]
                });
            });
        } else if (type === 'lecture') {
            if (!m.lectureDurationSeconds || m.lectureDurationSeconds === 0) return [];
            m.lectureSubjects.forEach((sub, i) => {
                sessions.push({
                    id: `mock_l_${date.getTime()}_${i}`,
                    completedAt: date.toISOString(),
                    config: { sessionType: 'lecture', subject: sub.name, topic: sub.topic, durationMinutes: Math.floor(sub.durationSeconds / 60), isMockTest: false, mood: 'Dev', location: 'Dev', breakReminderInterval: 0, activeTopics: [sub.topic] },
                    questions: 0, correct: 0, wrong: 0, empty: 0, net: 0, accuracy: 0, durationSeconds: sub.durationSeconds,
                    understandingScore: (Math.floor(Math.random() * 3) + 3), // 3-5
                    focusScore: (Math.floor(Math.random() * 3) + 3), // 3-5
                    isFinished: Math.random() > 0.3
                });
            });
        }
        return sessions;
    };

    const { 
        periodTitle, sessionTitle, statsTitle, statsSubtitle, subjectList, 
        activeStats, availableTopics, totalSessions, filteredSessions,
        isSessionPending, activeSessionRaw
    } = useMemo(() => {
        let allMonthSessions: DisplaySession[] = [];
        let pTitle = '';
        const currentYear = viewDate.getFullYear();
        const currentMonth = viewDate.getMonth();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        
        const real = sessionService.getAllSessions().filter(s => {
            const d = new Date(s.completedAt);
            return d >= monthStart && d <= new Date(monthEnd.getTime() + 86400000) && s.config.sessionType === activeMode;
        });
        
        const mockSessions: StoredSession[] = [];
        if (isDevMode) {
            const ptr = new Date(monthStart);
            ptr.setHours(12, 0, 0, 0); 
            const endPtr = new Date(monthEnd);
            endPtr.setHours(23, 59, 59, 999);
            while(ptr <= endPtr) {
                const hasRealForDay = real.some(s => {
                    const sd = new Date(s.completedAt);
                    return sd.getFullYear() === ptr.getFullYear() && sd.getMonth() === ptr.getMonth() && sd.getDate() === ptr.getDate();
                });
                if (!hasRealForDay) {
                    const mocks = generateMockSessions(ptr, activeMode);
                    mockSessions.push(...mocks);
                }
                ptr.setDate(ptr.getDate() + 1);
            }
        }

        allMonthSessions = [...real, ...mockSessions]
            .sort((a,b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
            .map((s, i) => ({ ...s, monthIndex: i + 1 }));

        let dateFilter: (d: Date) => boolean = () => false;
        if (calendarView === 'year') {
            pTitle = `${currentYear}`;
            dateFilter = () => true; 
        } else {
            if (selectionKey.startsWith('week-')) {
                const wIdx = parseInt(selectionKey.split('-')[1]);
                const week = weeks[wIdx];
                const validDay = week.find(d => d);
                const weekNum = validDay ? getWeekNumber(validDay.date) : 0;
                pTitle = `Hafta ${weekNum}`;
                const weekDates = week.map(d => d ? getLocalISODate(d.date) : null).filter(Boolean) as string[];
                dateFilter = (d) => weekDates.includes(getLocalISODate(d));
            } else if (selectionKey.startsWith('weekday-')) {
                const dayIdx = parseInt(selectionKey.split('-')[1]);
                pTitle = `${DAYS[dayIdx]} Günleri`;
                const targetDay = dayIdx === 6 ? 0 : dayIdx + 1;
                dateFilter = (d) => d.getDay() === targetDay;
            } else if (selectionKey) {
                const [y, m, d] = selectionKey.split('-').map(Number);
                const localDate = new Date(y, m - 1, d); 
                pTitle = localDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const targetKey = getLocalISODate(localDate);
                dateFilter = (d) => getLocalISODate(d) === targetKey;
            } else {
                pTitle = `${MONTHS[currentMonth]} ${currentYear}`;
                dateFilter = () => true; 
            }
        }

        const filteredSessions = allMonthSessions.filter(s => dateFilter(new Date(s.completedAt)));

        let displaySessions = filteredSessions;
        let rightTitle = 'Toplam'; 
        let rightSubtitle = 'Genel';
        let leftTitle = 'Toplam'; 
        let isSessionPending = false;
        let activeSessionRaw: StoredSession | null = null;

        if (focusedSessionIndex !== -1 && focusedSessionIndex < filteredSessions.length) {
            const s = filteredSessions[focusedSessionIndex];
            displaySessions = [s];
            isSessionPending = !!s.isPendingResult;
            activeSessionRaw = s;
            rightTitle = s.config.subject;
            rightSubtitle = s.config.topic || 'Genel';
            leftTitle = `Oturum ${s.monthIndex}`;
        } else {
            if (selectedSubject) {
                displaySessions = filteredSessions.filter(s => s.config.subject === selectedSubject);
                rightTitle = selectedSubject;
            }
        }

        const resultList: { name: string, val: number, isMock?: boolean, sessionId?: string }[] = [];
        const subjectMap: Record<string, number> = {};
        const mockTypeCounters: Record<string, number> = {};

        filteredSessions.forEach(s => {
            if (s.config.isMockTest) {
                const type = s.config.examType || 'Genel';
                const baseName = `${type} Denemesi`;
                mockTypeCounters[baseName] = (mockTypeCounters[baseName] || 0) + 1;
                resultList.push({
                    name: `${baseName} #${mockTypeCounters[baseName]}`,
                    val: activeMode === 'question' ? s.questions : Math.floor(s.durationSeconds / 60),
                    isMock: true,
                    sessionId: s.id
                });
            } else {
                const val = activeMode === 'question' ? s.questions : Math.floor(s.durationSeconds / 60);
                subjectMap[s.config.subject] = (subjectMap[s.config.subject] || 0) + val;
            }
        });

        Object.entries(subjectMap).forEach(([name, val]) => {
            resultList.push({ name, val });
        });

        const subjectList = resultList.sort((a, b) => {
            if (a.isMock && !b.isMock) return -1;
            if (!a.isMock && b.isMock) return 1;
            return b.val - a.val;
        });

        const calcStats = (sessList: StoredSession[]) => {
            const totalQ = sessList.reduce((acc, s) => acc + s.questions, 0);
            const totalC = sessList.reduce((acc, s) => acc + s.correct, 0);
            const totalW = sessList.reduce((acc, s) => acc + s.wrong, 0);
            const totalE = sessList.reduce((acc, s) => acc + s.empty, 0);
            const totalNet = sessList.reduce((acc, s) => acc + s.net, 0);
            const totalDur = sessList.reduce((acc, s) => acc + s.durationSeconds, 0);
            const totalUnderstanding = sessList.reduce((acc, s) => acc + (s.understandingScore || 0), 0);
            const totalFocus = sessList.reduce((acc, s) => acc + (s.focusScore || 0), 0);
            const finishedCount = sessList.filter(s => s.isFinished).length;
            
            const accuracy = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
            const dbs = totalDur > 0 ? totalQ / (totalDur/60) : 0;
            const avgUnderstanding = sessList.length > 0 ? totalUnderstanding / sessList.length : 0;
            const avgFocus = sessList.length > 0 ? totalFocus / sessList.length : 0;

            return {
                questions: totalQ, correct: totalC, wrong: totalW, empty: totalE,
                net: parseFloat(totalNet.toFixed(2)), accuracy: parseFloat(accuracy.toFixed(1)),
                duration: activeMode === 'lecture' ? `${Math.floor(totalDur/60)}dk` : `${Math.floor(totalDur/3600)}s ${Math.floor((totalDur%3600)/60)}dk`,
                dbs: parseFloat(dbs.toFixed(2)),
                understanding: parseFloat(avgUnderstanding.toFixed(1)),
                focus: parseFloat(avgFocus.toFixed(1)),
                finishedCount,
                sessionCount: sessList.length
            };
        };

        let activeStats = calcStats(displaySessions);
        let availableTopics: string[] = [];
        if (selectedSubject && focusedSessionIndex === -1) {
            const allTopics = new Set<string>();
            displaySessions.forEach(s => {
                if (s.topicStats) s.topicStats.forEach(t => allTopics.add(t.topic));
                else allTopics.add(s.config.topic);
            });
            availableTopics = Array.from(allTopics);
            if (topicIndex >= 0 && topicIndex < availableTopics.length) {
                const targetTopic = availableTopics[topicIndex];
                rightSubtitle = targetTopic;
                let tQ=0, tC=0, tW=0, tE=0, tDur=0;
                displaySessions.forEach(s => {
                    if (s.topicStats) {
                        const stat = s.topicStats.find(t => t.topic === targetTopic);
                        if (stat) { tQ += stat.questions; tC += stat.correct; tW += stat.wrong; tE += stat.empty; tDur += (stat.durationSeconds || 0); }
                    } else if (s.config.topic === targetTopic) {
                        tQ += s.questions; tC += s.correct; tW += s.wrong; tE += s.empty; tDur += s.durationSeconds;
                    }
                });
                const tNet = tC - (tW / 4);
                const tAcc = tQ > 0 ? (tC / tQ) * 100 : 0;
                const tDbs = tDur > 0 ? tQ / (tDur/60) : 0;
                
                const topicSessions = displaySessions.filter(s => s.config.topic === targetTopic || (s.topicStats && s.topicStats.some(ts => ts.topic === targetTopic)));
                const tUnderstanding = topicSessions.reduce((acc, s) => acc + (s.understandingScore || 0), 0) / (topicSessions.length || 1);
                const tFocus = topicSessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / (topicSessions.length || 1);
                const tFinished = topicSessions.filter(s => s.isFinished).length;

                activeStats = {
                    questions: tQ, correct: tC, wrong: tW, empty: tE, net: parseFloat(tNet.toFixed(2)),
                    accuracy: parseFloat(tAcc.toFixed(1)), duration: `${Math.floor(tDur/3600)}s ${Math.floor((tDur%3600)/60)}dk`, dbs: parseFloat(tDbs.toFixed(2)),
                    understanding: parseFloat(tUnderstanding.toFixed(1)),
                    focus: parseFloat(tFocus.toFixed(1)),
                    finishedCount: tFinished,
                    sessionCount: topicSessions.length
                };
            }
        }

        return {
            periodTitle: pTitle, sessionTitle: leftTitle, statsTitle: rightTitle, statsSubtitle: rightSubtitle,
            subjectList, activeStats, availableTopics, totalSessions: filteredSessions.length, filteredSessions,
            isSessionPending, activeSessionRaw
        };
    }, [selectionKey, viewDate, calendarView, selectedSubject, topicIndex, focusedSessionIndex, isDevMode, refreshTrigger, weeks, isTimeTarget, activeMode]);

    const handleTopicCycle = (delta: number, topics: string[]) => {
        if (!selectedSubject) return; 
        const maxIndex = topics.length - 1;
        let nextIndex = topicIndex + delta;
        if (nextIndex < -1) nextIndex = maxIndex;
        if (nextIndex > maxIndex) nextIndex = -1;
        setTopicIndex(nextIndex);
    };

    const handleSessionCycle = (delta: number) => {
        if (filteredSessions.length === 0) return;
        const maxIndex = filteredSessions.length - 1;
        let nextIndex = focusedSessionIndex + delta;
        if (nextIndex < -1) nextIndex = maxIndex;
        if (nextIndex > maxIndex) nextIndex = -1;
        setFocusedSessionIndex(nextIndex);
        setSelectedSubject(null);
        setTopicIndex(-1);
    };

    const handleListClick = (item: { name: string, isMock?: boolean, sessionId?: string }) => {
        if (item.isMock && item.sessionId) {
            // Find the index of this exact session
            const idx = filteredSessions.findIndex(s => s.id === item.sessionId);
            if (idx !== -1) {
                setFocusedSessionIndex(idx);
                setSelectedSubject(null);
            }
        } else {
            // It's a subject, aggregate view
            setSelectedSubject(item.name);
            setFocusedSessionIndex(-1);
        }
        setTopicIndex(-1);
    };

    const getModalSequence = (date: Date) => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const target = new Date(date);
        target.setHours(0,0,0,0);
        const isFuture = target > now;
        const isToday = target.getTime() === now.getTime();
        const dayInfo = monthData.find(d => d && d.date.toDateString() === date.toDateString()) as DayData;
        const hasPending = dayInfo?.hasPendingMock;
        const sequence: ('pending' | 'manual' | 'plan')[] = [];
        if (isFuture) sequence.push('plan');
        else if (isToday) { if (hasPending) sequence.push('pending'); sequence.push('manual'); sequence.push('plan'); }
        else { if (hasPending) sequence.push('pending'); sequence.push('manual'); }
        return { sequence, hasPending, pendingSession: dayInfo?.pendingMockSession };
    };

    const cycleModalType = (delta: number) => {
        if (!selectedModalDate) return;
        const { sequence, pendingSession } = getModalSequence(selectedModalDate);
        if (sequence.length <= 1) return; 
        const currentIndex = sequence.indexOf(activeModalType as any);
        let nextIndex = currentIndex + delta;
        if (nextIndex < 0) nextIndex = sequence.length - 1;
        if (nextIndex >= sequence.length) nextIndex = 0;
        const nextType = sequence[nextIndex];
        setActiveModalType(nextType);
        if (nextType === 'pending' && pendingSession) setSelectedPendingSession(pendingSession);
    };

    const saveManualSession = (result: SessionResult) => {
        if (selectedModalDate) {
            sessionService.addSession(result, selectedModalDate);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const savePlanSession = (plan: PlannedSession) => {
        sessionService.addPlannedSession(plan);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleUpdateMock = (updated: StoredSession) => {
        sessionService.updateSession(updated);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleDeleteSession = async () => {
        if (focusedSessionIndex !== -1 && deleteConfirmInput === 'EVET') {
            const sessionToDelete = filteredSessions[focusedSessionIndex];
            if (sessionToDelete && !sessionToDelete.id.startsWith('mock_')) {
                await sessionService.deleteSession(sessionToDelete.id);
                setFocusedSessionIndex(-1);
                setRefreshTrigger(prev => prev + 1);
            }
            setShowDeleteConfirm(false);
            setDeleteConfirmInput('');
        }
    };

    return (
        <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar font-sans relative flex flex-col">
            <div className="flex justify-center pt-6 mb-3 px-4 flex-shrink-0">
                <div className="bg-[#A8C9D5] rounded-full px-2 py-1.5 flex items-center gap-3 shadow-sm w-full max-w-sm justify-between">
                    <button onClick={() => calendarView === 'month' ? handleMonthChange(-1) : handleYearChange(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition">
                        <ChevronLeft className="text-[#3D5A60] w-5 h-5" />
                    </button>
                    <button onMouseDown={handleHeaderTitleDown} onMouseUp={handleHeaderTitleUp} onMouseLeave={handleHeaderTitleUp} onTouchStart={handleHeaderTitleDown} onTouchEnd={handleHeaderTitleUp} onClick={handleHeaderTitleClick} className="flex-1 text-center select-none active:scale-95 transition-transform">
                        <h2 className="text-lg font-bold text-[#2D3A31] hover:opacity-70 transition-opacity">
                            {calendarView === 'month' ? `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}` : `${viewDate.getFullYear()}`}
                        </h2>
                    </button>
                    <button onClick={() => calendarView === 'month' ? handleMonthChange(1) : handleYearChange(1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="px-4 flex flex-col items-center pb-3 min-h-[320px]">
                {calendarView === 'month' && (
                    <>
                        <div className="grid grid-cols-8 gap-0 w-full max-w-sm mb-1.5 animate-fadeIn">
                            <span className="w-7"></span> 
                            {DAYS.map((d, i) => {
                                const isSelected = selectionKey === `weekday-${i}`;
                                return <button key={d} onClick={() => selectWeekday(i)} className={`text-[9px] uppercase font-bold py-0.5 rounded-md transition-colors ${isSelected ? 'bg-[#2D3A31] text-white' : 'text-[#888] hover:bg-black/5'}`}>{d}</button>;
                            })}
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-sm relative animate-fadeIn">
                            {weeks.map((week, wIdx) => {
                                const firstDay = week.find(d => d);
                                const weekNum = firstDay ? getWeekNumber(firstDay.date) : 0;
                                const isWeekSelected = selectionKey === `week-${wIdx}-${viewDate.getMonth()}`;
                                const weekTotalSeconds = week.reduce((acc, c) => {
                                    if (c && !c.isDisabled && !c.isFuture) return acc + (c.durationSeconds || 0);
                                    return acc;
                                }, 0);
                                const weekTotalQuestions = week.reduce((acc, c) => {
                                    if (c && !c.isDisabled && !c.isFuture) return acc + (activeMode === 'question' ? c.val : 0);
                                    return acc;
                                }, 0);
                                
                                const displayWeekTotal = activeMode === 'lecture' || isTimeTarget 
                                    ? (weekTotalSeconds / 3600).toFixed(1) + 's' 
                                    : Math.round(weekTotalQuestions);
                                return (
                                    <div key={wIdx} className="grid grid-cols-8 gap-0 items-center relative">
                                        <div className="flex flex-col items-center justify-center -mt-3">
                                            <button onClick={() => selectWeek(wIdx)} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all z-10 bg-[#E5E7EB]/50 ${isWeekSelected ? 'border-[#4ADE80] text-[#2D3A31]' : 'border-gray-300 text-gray-500'}`}>H{weekNum}</button>
                                            {showAmounts && <span className="text-[7px] text-[#5A4A42] font-bold mt-0.5">{weekTotalSeconds > 0 || weekTotalQuestions > 0 ? displayWeekTotal : '-'}<span className="text-[5px] opacity-70">/{weeklyTargetValue}</span></span>}
                                        </div>
                                        {week.map((day, dIdx) => {
                                            let localKey = '';
                                            if (day) localKey = getLocalISODate(day.date);
                                            const isSelected = day ? selectionKey === localKey : false;
                                            const colorClass = day ? getStatusColor(day.status, isSelected) : '';
                                            const isInteractive = day && !day.isDisabled;
                                            const hasPlans = day?.plans && day.plans.length > 0;
                                            const hasPendingMock = day?.hasPendingMock;
                                            return (
                                                <div key={dIdx} className="relative flex flex-col items-center h-10 justify-start">
                                                    {day ? (
                                                        <>
                                                            <button onMouseDown={() => isInteractive && handleCellTouchStart(day)} onMouseUp={handleCellTouchEnd} onMouseLeave={handleCellTouchEnd} onTouchStart={() => isInteractive && handleCellTouchStart(day)} onTouchEnd={handleCellTouchEnd} onClick={() => isInteractive && handleClick(day)} disabled={!isInteractive} className={`w-8 h-8 rounded-full flex items-center justify-center relative transition-transform active:scale-95 z-0 select-none ${colorClass} ${!isInteractive ? 'opacity-40 cursor-default' : 'shadow-sm'} ${isSelected ? 'ring-2 ring-[#2D3A31] ring-offset-1' : ''} ${hasPlans ? 'ring-2 ring-blue-300 ring-offset-0 border-2 border-white' : ''}`}>
                                                                <span className="text-xs font-bold">{day.date.getDate()}</span>
                                                                {day.val === maxVal && !day.isFuture && day.val > 0 && <span className="absolute -top-1.5 text-xs drop-shadow-sm">👑</span>}
                                                                {day.status === 'sick' && <span className="absolute inset-0 flex items-center justify-center text-sm">🤒</span>}
                                                                {day.status === 'rest' && <span className="absolute -top-2 text-lg drop-shadow-sm z-20">🌴</span>}
                                                                {day.status === 'rest' && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-[#8B4513]">||</span></div>} 
                                                                {day.status === 'saved' && <div className="absolute inset-0 flex items-center justify-center"><Rewind className="w-3 h-3 fill-[#2D3A31] rotate-180" /></div>}
                                                                {hasPlans && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center border border-white"><Clock className="w-1.5 h-1.5 text-white" /></div>}
                                                                {hasPendingMock && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                                                            </button>
                                                            {showAmounts && isInteractive && !day.isFuture && day.status !== 'rest' && day.status !== 'sick' && day.status !== 'saved' && (
                                                                <span className="text-[8px] font-bold text-gray-500 mt-0.5">
                                                                    {activeMode === 'lecture' && day.val > 0 ? `${day.val}s` : day.val}
                                                                </span>
                                                            )}
                                                            {day.isFuture && !hasPlans && <span className="text-[8px] font-bold text-gray-300 mt-0.5">-</span>}
                                                        </>
                                                    ) : <div className="w-8 h-8" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {calendarView === 'year' && (
                    <div className="grid grid-cols-4 gap-3 w-full max-w-sm mt-6 animate-fadeIn">
                        {MONTHS.map((m, idx) => {
                            const isCurrentMonth = idx === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();
                            return <button key={m} onClick={() => { const newDate = new Date(viewDate); newDate.setMonth(idx); setViewDate(newDate); setCalendarView('month'); setSelectionKey(''); setFocusedSessionIndex(-1); }} className={`h-16 rounded-xl flex flex-col items-center justify-center shadow-sm border-2 transition-all active:scale-95 ${isCurrentMonth ? 'bg-[#A8C9D5] border-teal-600 text-[#2D3A31]' : 'bg-white border-transparent hover:bg-orange-50 text-gray-600'}`}><span className="font-bold text-xs">{m.substring(0, 3)}</span></button>;
                        })}
                    </div>
                )}
            </div>

            {calendarView === 'month' && (
                <div className="bg-[#FFFBEB] px-4 py-1.5 flex justify-between items-center border-t border-orange-100 flex-shrink-0 animate-fadeIn">
                    <div className="flex gap-2.5 text-[9px] text-gray-500 font-bold overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 min-w-fit"><span>🤒</span> Hastalık</div>
                        <div className="flex items-center gap-1 min-w-fit"><span>🌴</span> Dinlenme</div>
                        <div className="flex items-center gap-1 min-w-fit"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Plan</div>
                        <div className="flex items-center gap-1 min-w-fit"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Bekleyen</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-orange-100/50 p-0.5 rounded-lg border border-orange-200/50">
                            <button 
                                onClick={() => setActiveMode('question')}
                                className={`p-1 rounded-md transition-all ${activeMode === 'question' ? 'bg-[#2D3A31] text-white shadow-sm' : 'text-gray-400 hover:text-[#2D3A31]'}`}
                                title="Soru Çözümü"
                            >
                                <Feather className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => setActiveMode('lecture')}
                                className={`p-1 rounded-md transition-all ${activeMode === 'lecture' ? 'bg-[#2D3A31] text-white shadow-sm' : 'text-gray-400 hover:text-[#2D3A31]'}`}
                                title="Konu Çalışma"
                            >
                                <BookOpen className="w-3 h-3" />
                            </button>
                        </div>
                        <button onClick={() => setShowAmounts(!showAmounts)} className="p-1 hover:bg-black/5 rounded-md transition-colors">{showAmounts ? <Eye className="w-3.5 h-3.5 text-[#2D3A31]" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}</button>
                    </div>
                </div>
            )}

            {subjectList && (
                <div className="bg-[#FFFACD] rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 pb-28 border-t border-orange-100 animate-fadeIn mt-3 flex-shrink-0 w-full">
                    <div className="bg-[#A8C9D5] rounded-t-[24px] p-2.5 px-5 flex justify-between items-center -mt-4 -mx-4 mb-3 w-[calc(100%+32px)] shadow-sm">
                        <span className="font-bold text-[#2D3A31] text-base">{periodTitle}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] italic text-[#2D3A31] opacity-70 font-medium">Özet</span>
                            <span className="text-[9px] font-bold text-[#5A4A42] bg-white/40 px-1.5 rounded mt-0.5">{totalSessions} Oturum</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1/3 flex flex-col gap-1.5 relative">
                            <div className="bg-[#FDE8A8] border border-orange-200 rounded-lg px-1 flex items-center justify-between h-[32px] shadow-sm relative z-10">
                                <button onClick={() => handleSessionCycle(-1)} disabled={totalSessions === 0} className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 flex-shrink-0"><ChevronLeft className="w-2.5 h-2.5 text-[#5A4A42]" /></button>
                                <span className="font-extrabold text-[#2D3A31] text-[10px] truncate w-full text-center px-1">{sessionTitle}</span>
                                <button onClick={() => handleSessionCycle(1)} disabled={totalSessions === 0} className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 flex-shrink-0"><ChevronRight className="w-2.5 h-2.5 text-[#5A4A42]" /></button>
                            </div>
                            <div className="absolute top-[38px] bottom-0 left-0 right-0 flex flex-col gap-1 overflow-y-auto no-scrollbar z-0">
                                {subjectList.length > 0 ? subjectList.map((s, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleListClick(s)}
                                        className={`flex justify-between items-center px-1.5 py-1 rounded-md text-[9px] border transition-colors flex-shrink-0 ${(selectedSubject === s.name || (focusedSessionIndex !== -1 && activeSessionRaw?.id === s.sessionId)) ? 'bg-white border-[#2D3A31] text-[#2D3A31] shadow-sm font-bold' : 'bg-white/50 text-gray-600 border-white/60 hover:bg-white/80'}`}
                                    >
                                        <span className="truncate max-w-[60px]">{s.name}</span>
                                        <span className="font-bold">{activeMode === 'lecture' ? `${s.val}dk` : s.val}</span>
                                    </button>
                                )) : <div className="text-[9px] text-center opacity-50 italic">Veri yok</div>}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                            <div className="bg-[#FDE8A8] border border-orange-200 rounded-lg px-1 flex items-center justify-between min-h-[32px] py-1 shadow-sm relative">
                                <button onClick={() => selectedSubject && handleTopicCycle(-1, availableTopics || [])} disabled={!selectedSubject || !availableTopics || availableTopics.length === 0 || focusedSessionIndex !== -1} className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 flex-shrink-0"><ChevronLeft className="w-2.5 h-2.5 text-[#5A4A42]" /></button>
                                <div className="flex flex-col items-center justify-center leading-tight overflow-hidden px-1">
                                    <span className="font-extrabold text-[#2D3A31] text-[10px] truncate w-full text-center">{statsTitle}</span>
                                    <span className="text-[8px] font-medium text-[#5A4A42] opacity-80 w-full text-center -mt-0.5 break-words">{statsSubtitle}</span>
                                </div>
                                {focusedSessionIndex !== -1 && activeSessionRaw && !activeSessionRaw.id.startsWith('mock_') && <button onClick={() => setShowDeleteConfirm(true)} className="p-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200 absolute right-6 top-1/2 -translate-y-1/2 shadow-sm transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>}
                                <button onClick={() => selectedSubject && handleTopicCycle(1, availableTopics || [])} disabled={!selectedSubject || !availableTopics || availableTopics.length === 0 || focusedSessionIndex !== -1} className="p-1 rounded-full hover:bg-black/5 disabled:opacity-30 flex-shrink-0"><ChevronRight className="w-2.5 h-2.5 text-[#5A4A42]" /></button>
                            </div>
                            <div className="bg-[#A8C9D5]/20 border border-[#A8C9D5]/30 rounded-xl p-2.5 flex flex-col flex-1 relative overflow-hidden">
                                {isSessionPending && (
                                    <div className="absolute inset-0 bg-[#A8C9D5]/20 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-center p-1.5">
                                        <div className="bg-blue-100/80 px-1.5 py-0.5 rounded-md border border-blue-200 shadow-sm mb-1.5"><span className="text-[9px] font-extrabold text-blue-800 uppercase tracking-tighter">Sonuç Bekleniyor</span></div>
                                        <span className="text-[7px] font-bold text-blue-700 opacity-80 leading-tight mb-2">Henüz açıklanmadı</span>
                                        {activeSessionRaw && <button onClick={() => { setSelectedPendingSession(activeSessionRaw); setActiveModalType('pending'); }} className="flex items-center gap-1 bg-white border border-blue-200 px-2.5 py-1 rounded-full shadow-sm active:scale-95 transition-transform"><Edit3 className="w-2.5 h-2.5 text-blue-600" /><span className="text-[9px] font-bold text-blue-700">Sonuç Gir</span></button>}
                                    </div>
                                )}
                                <div className={`text-[10px] space-y-0.5 text-gray-600 flex-1 w-full transition-opacity ${isSessionPending ? 'opacity-30' : 'opacity-100'}`}>
                                    <div className="flex justify-between border-b border-gray-400/20 pb-0.5"><span>Süre</span> <span className="font-bold text-[#2D3A31] font-mono">{activeStats.duration}</span></div>
                                    
                                    {activeMode === 'question' ? (
                                        <>
                                            <div className="flex justify-between border-b border-gray-400/20 pb-0.5"><span>Çözülen</span> <span className="font-bold text-[#2D3A31]">{activeStats.questions}</span></div>
                                            <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
                                                <div className="flex flex-col items-center"><span className="text-[8px] text-green-700 font-bold opacity-70">D</span><span className="text-[11px] font-bold text-green-800">{activeStats.correct}</span></div>
                                                <div className="flex flex-col items-center border-x border-gray-300/30"><span className="text-[8px] text-red-600 font-bold opacity-70">Y</span><span className="text-[11px] font-bold text-red-700">{activeStats.wrong}</span></div>
                                                <div className="flex flex-col items-center"><span className="text-[8px] text-gray-500 font-bold opacity-70">B</span><span className="text-[11px] font-bold text-gray-600">{activeStats.empty}</span></div>
                                            </div>
                                            <div className="flex justify-between pt-0.5 mt-0.5 border-t border-gray-400/30"><span className="font-bold text-[#2D3A31]">Net</span><span className="font-bold bg-white/60 px-1 rounded text-[#2D3A31]">{Number(activeStats.net.toFixed(2))}</span></div>
                                            <div className="flex justify-between pt-0.5 mt-0.5"><div className="flex items-center gap-1"><span className="font-bold text-[#2D3A31]">DBS</span></div><span className="font-bold text-[#2D3A31]">{activeStats.dbs}</span></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between border-b border-gray-400/20 pb-0.5"><span>Anlama</span> <span className="font-bold text-[#2D3A31]">{activeStats.understanding}/5</span></div>
                                            <div className="flex justify-between border-b border-gray-400/20 pb-0.5"><span>Odak</span> <span className="font-bold text-[#2D3A31]">{activeStats.focus}/5</span></div>
                                            <div className="flex justify-between border-b border-gray-400/20 pb-0.5"><span>Tamamlanan</span> <span className="font-bold text-[#2D3A31]">{activeStats.finishedCount}</span></div>
                                            <div className="flex justify-between pt-0.5 mt-0.5 border-t border-gray-400/30"><span className="font-bold text-[#2D3A31]">Oturum</span><span className="font-bold text-[#2D3A31]">{activeStats.sessionCount}</span></div>
                                        </>
                                    )}
                                </div>
                                {activeMode === 'question' ? (
                                    <div className={`w-12 h-12 mx-auto mt-1.5 relative flex-shrink-0 transition-opacity ${isSessionPending ? 'opacity-10' : 'opacity-100'}`}>
                                        <svg viewBox="0 0 32 32" className="transform -rotate-90 w-full h-full drop-shadow-sm"><circle r="16" cx="16" cy="16" fill="#2D9CDB" strokeDasharray={`${activeStats.accuracy} 100`} /><circle r="16" cx="16" cy="16" fill="transparent" stroke="#F2C94C" strokeWidth="32" strokeDasharray="100 100" className="transform rotate-[270deg] origin-center -z-10 opacity-30" /></svg>
                                        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-md">%{Number(activeStats.accuracy.toFixed(1))}</div>
                                    </div>
                                ) : (
                                    <div className={`w-12 h-12 mx-auto mt-1.5 relative flex-shrink-0 transition-opacity flex items-center justify-center`}>
                                        <div className="w-10 h-10 bg-[#2D3A31] rounded-full flex items-center justify-center shadow-sm">
                                            <BookOpen className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeModalType === 'pending' && selectedPendingSession && <UpdateMockResultModal session={selectedPendingSession} onClose={closeModals} onSave={handleUpdateMock} onCycle={getModalSequence(selectedModalDate!).sequence.length > 1 ? cycleModalType : undefined} />}
            {activeModalType === 'manual' && selectedModalDate && <ManualSessionModal user={user} date={selectedModalDate} onClose={closeModals} onSave={saveManualSession} onCycle={getModalSequence(selectedModalDate).sequence.length > 1 ? cycleModalType : undefined} />}
            {activeModalType === 'plan' && selectedModalDate && <PlanSessionModal date={selectedModalDate} onClose={closeModals} onSave={savePlanSession} onCycle={getModalSequence(selectedModalDate).sequence.length > 1 ? cycleModalType : undefined} />}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-[40px] p-8 shadow-2xl w-full max-w-sm flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><Trash2 className="w-8 h-8 text-red-500" /></div>
                        <h2 className="text-2xl font-bold text-[#2D3A31] mb-2 text-center">Oturumu Sil</h2>
                        <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">Bu oturumu kalıcı olarak silmek istediğinize emin misiniz? <br/>Lütfen onaylamak için <b>EVET</b> yazın.</p>
                        <input type="text" value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} placeholder="EVET yazın" className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 font-bold text-center text-[#2D3A31] outline-none focus:border-red-200 transition-colors mb-6" />
                        <div className="flex gap-4 w-full">
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmInput(''); }} className="flex-1 py-4 rounded-2xl border border-gray-200 font-extrabold text-gray-500 text-sm hover:bg-gray-50 transition-colors">Vazgeç</button>
                            <button onClick={handleDeleteSession} disabled={deleteConfirmInput !== 'EVET'} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-extrabold text-sm hover:bg-red-600 transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:grayscale">Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
