import { Preferences } from '@capacitor/preferences';
import { SessionResult, PlannedSession, SessionType } from '../types';
import { bookService } from './bookService';

const STORAGE_KEY = 'yks_odak_sessions';
const PLANNED_KEY = 'yks_odak_planned';

export interface StoredSession extends SessionResult {
  id: string; // ID format: Oturum_MMYYNN or DENOturum_MMYYNN
  completedAt: string; // ISO Date string
}

class SessionService {
  private _sessionCache: StoredSession[] = [];
  private _plannedCache: PlannedSession[] = [];
  private _initialized = false;

  async init() {
    if (this._initialized) return;

    try {
      const sessions = await Preferences.get({ key: STORAGE_KEY });
      if (sessions.value) {
        this._sessionCache = JSON.parse(sessions.value);
      }

      const planned = await Preferences.get({ key: PLANNED_KEY });
      if (planned.value) {
        this._plannedCache = JSON.parse(planned.value);
      }
      
      this._initialized = true;
    } catch (e) {
      console.error("Failed to init session service", e);
      this._sessionCache = [];
      this._plannedCache = [];
    }
  }

  addSession(session: SessionResult, customDate?: Date) {
    const now = customDate || new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    
    const sessionsInSameMonth = this._sessionCache.filter(s => {
        const d = new Date(s.completedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const count = sessionsInSameMonth.length + 1;
    const countStr = count.toString().padStart(2, '0');
    
    let prefix = 'Oturum_';
    if (session.config.isMockTest) {
        prefix = 'DENOturum_';
    } else if (session.config.sessionType === 'lecture') {
        prefix = 'KONUOturum_';
    }

    const id = `${prefix}${month}${year}${countStr}`;

    const entry: StoredSession = {
        ...session,
        id,
        completedAt: now.toISOString()
    };
    
    this._sessionCache.push(entry);
    this.persistSessions();
    if (session.config.sessionType === 'question') {
        bookService.updateBookFromSession(entry);
    }
  }

  async updateSession(updatedSession: StoredSession) {
    const idx = this._sessionCache.findIndex(s => s.id === updatedSession.id);
    if (idx !== -1) {
        this._sessionCache[idx] = updatedSession;
        await this.persistSessions();
        if (!updatedSession.isPendingResult && updatedSession.config.sessionType === 'question') {
            await bookService.updateBookFromSession(updatedSession);
        }
    }
  }

  async deleteSession(id: string) {
      const sessionToDelete = this._sessionCache.find(s => s.id === id);
      if (sessionToDelete) {
          if (sessionToDelete.config.sessionType === 'question') {
              await bookService.removeSessionFromBook(sessionToDelete);
          }
          this._sessionCache = this._sessionCache.filter(s => s.id !== id);
          await this.persistSessions();
      }
  }

  getAllSessions(): StoredSession[] {
    return this._sessionCache;
  }
  
  addPlannedSession(plan: PlannedSession) {
      this._plannedCache.push(plan);
      this.persistPlanned();
  }

  getPlannedSessions(): PlannedSession[] {
      return this._plannedCache;
  }

  getDailyStats(date: Date, type?: SessionType) {
      const sessions = this.getAllSessions();
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth();
      const targetDay = date.getDate();
      
      const dailySessions = sessions.filter(s => {
          const sDate = new Date(s.completedAt);
          const dateMatch = sDate.getFullYear() === targetYear && 
                 sDate.getMonth() === targetMonth && 
                 sDate.getDate() === targetDay;
          if (!dateMatch) return false;
          if (type) return s.config.sessionType === type;
          return true;
      });
      
      return dailySessions.reduce((acc, s) => ({
          val: acc.val + (s.questions || 0),
          correct: acc.correct + (s.correct || 0),
          wrong: acc.wrong + (s.wrong || 0),
          empty: acc.empty + (s.empty || 0),
          net: acc.net + (s.net || 0),
          durationSeconds: acc.durationSeconds + (s.durationSeconds || 0),
          subjects: [...acc.subjects, { name: s.config.subject, val: s.questions || 0 }],
          sessionCount: acc.sessionCount + 1,
          noteCount: acc.noteCount + (s.notes ? s.notes.length : 0)
      }), {
          val: 0, correct: 0, wrong: 0, empty: 0, net: 0, durationSeconds: 0, subjects: [] as {name:string, val:number}[], sessionCount: 0, noteCount: 0
      });
  }
  
  async clear() {
    this._sessionCache = [];
    this._plannedCache = [];
    await Preferences.remove({ key: STORAGE_KEY });
    await Preferences.remove({ key: PLANNED_KEY });
  }

  private async persistSessions() {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(this._sessionCache)
    });
  }

  private async persistPlanned() {
    await Preferences.set({
      key: PLANNED_KEY,
      value: JSON.stringify(this._plannedCache)
    });
  }
}

export const sessionService = new SessionService();