
import { Preferences } from '@capacitor/preferences';
import { Book, SessionResult } from '../types';
import { BOOKS as MOCK_BOOKS, TYT_TOPICS, AYT_TOPICS, YDT_TOPICS, SESSION_TOPICS } from '../constants';

const BOOK_STORAGE_KEY = 'studya_books';
const MOCK_ID_OFFSET = 10000;

// Helper to parse time strings like "7s 04d" or "45d" into total seconds
const parseTimeSpent = (str: string = ''): number => {
    let total = 0;
    // Extract hours (e.g. "7s")
    const hMatch = str.match(/(\d+)\s*s/);
    if (hMatch) total += parseInt(hMatch[1]) * 3600;
    
    // Extract minutes (e.g. "04d", "45d")
    const mMatch = str.match(/(\d+)\s*d/);
    if (mMatch) total += parseInt(mMatch[1]) * 60;
    
    return total;
};

// Helper to format seconds back to "7s 04d" or "45d"
const formatTimeSpent = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}s ${m.toString().padStart(2, '0')}d`;
    return `${m}d`;
};

class BookService {
  private _books: Book[] = [];
  private _initialized = false;
  private _isDevMode = false;

  async init(isDevMode: boolean) {
    this._isDevMode = isDevMode;
    try {
      const { value } = await Preferences.get({ key: BOOK_STORAGE_KEY });
      if (value) {
        this._books = JSON.parse(value);
      } else {
        this._books = [];
      }
      this._initialized = true;
    } catch (e) {
      console.error("Book service init failed", e);
      this._books = [];
    }
  }

  getBooks(): Book[] {
    const userBooks = [...this._books];
    if (!this._isDevMode) return userBooks;

    const existingIds = new Set(userBooks.map(b => b.id));
    const visibleMocks = MOCK_BOOKS.map(m => ({
        ...m,
        id: m.id + MOCK_ID_OFFSET
    })).filter(m => !existingIds.has(m.id));

    return [...userBooks, ...visibleMocks];
  }

  async addBook(book: Book) {
    this._books.push(book);
    await this.persist();
  }

  async updateBook(book: Book) {
    const index = this._books.findIndex(b => b.id === book.id);
    if (index !== -1) {
      this._books[index] = book;
    } else {
        this._books.push(book);
    }
    await this.persist();
  }

  async removeBook(id: number) {
    this._books = this._books.filter(b => b.id !== id);
    await this.persist();
  }

  /**
   * Deducts session data from book records to maintain consistency after deletion.
   */
  async removeSessionFromBook(session: SessionResult) {
      const bookId = session.config.bookId;
      if (!bookId) return;

      let bookIndex = this._books.findIndex(b => b.id === bookId);
      if (bookIndex === -1) return;

      const book = { ...this._books[bookIndex] };
      const QUESTIONS_PER_TOPIC_ESTIMATE = 150;

      // 1. Revert General Stats
      book.solvedQuestions = Math.max(0, (book.solvedQuestions || 0) - session.questions);
      
      // Revert Time Spent
      const currentSeconds = parseTimeSpent(book.timeSpent);
      book.timeSpent = formatTimeSpent(Math.max(0, currentSeconds - session.durationSeconds));

      // 2. Revert Topic Specific Data
      const sessionTopics = session.topicStats && session.topicStats.length > 0 
          ? session.topicStats 
          : [{ 
              topic: session.config.topic, 
              questions: session.questions,
              correct: session.correct,
              wrong: session.wrong,
              empty: session.empty
            }];

      if (book.topics) {
          sessionTopics.forEach(t => {
              const btIndex = book.topics!.findIndex(bt => bt.label === t.topic);
              if (btIndex !== -1) {
                  const bt = book.topics![btIndex];
                  bt.solvedCount = Math.max(0, (bt.solvedCount || 0) - t.questions);
                  bt.correct = Math.max(0, (bt.correct || 0) - (t.correct || 0));
                  bt.wrong = Math.max(0, (bt.wrong || 0) - (t.wrong || 0));
                  bt.empty = Math.max(0, (bt.empty || 0) - (t.empty || 0));

                  // Recalculate Topic Progress
                  if (bt.totalQuestions !== 0) {
                      const effTotal = bt.totalQuestions || QUESTIONS_PER_TOPIC_ESTIMATE;
                      const totalSolved = (bt.solvedCount || 0) + (bt.externalSolvedCount || 0);
                      bt.progress = Math.min(100, Math.round((totalSolved / effTotal) * 100));
                  }
              }
          });
      }

      // 3. Recalculate Book Total Progress
      const isExplicitTotal = (book.totalQuestions || 0) > 0;
      if (isExplicitTotal) {
          book.progress = Math.min(100, Math.round((book.solvedQuestions / book.totalQuestions!) * 100));
      } else {
          // Re-estimate implicit progress based on topics
          let estimatedTotal = 0;
          const uniqueTopicLabels = new Set<string>();
          book.topics?.forEach(t => uniqueTopicLabels.add(t.label));

          uniqueTopicLabels.forEach(label => {
              const existing = book.topics?.find(t => t.label === label);
              if (existing && existing.totalQuestions) {
                  estimatedTotal += existing.totalQuestions;
              } else {
                  estimatedTotal += QUESTIONS_PER_TOPIC_ESTIMATE;
              }
          });
          
          if (estimatedTotal > 0) {
              book.progress = Math.min(100, Math.round((book.solvedQuestions / estimatedTotal) * 100));
          }
      }

      this._books[bookIndex] = book;
      await this.persist();
  }

  async updateBookFromSession(session: SessionResult) {
      const bookId = session.config.bookId;
      if (!bookId) return;

      let bookIndex = this._books.findIndex(b => b.id === bookId);
      let book: Book;

      if (bookIndex !== -1) {
          book = { ...this._books[bookIndex] };
      } else if (this._isDevMode) {
          const originalId = bookId - MOCK_ID_OFFSET;
          const mock = MOCK_BOOKS.find(m => m.id === originalId);
          if (mock) {
              book = { ...mock, id: bookId };
          } else {
              return;
          }
      } else {
          return;
      }

      const isExplicitTotal = (book.totalQuestions || 0) > 0;
      book.solvedQuestions = (book.solvedQuestions || 0) + session.questions;
      
      if (session.questions > 0) {
          const oldAcc = book.accuracy || 0;
          book.accuracy = Math.round(oldAcc * 0.7 + session.accuracy * 0.3);
      }

      const sessionMins = session.durationSeconds / 60;
      if (sessionMins > 0) {
          const sessionQpm = session.questions / sessionMins;
          const oldQpm = book.qpm || 0;
          book.qpm = parseFloat((oldQpm * 0.7 + sessionQpm * 0.3).toFixed(2));
      }

      const currentSeconds = parseTimeSpent(book.timeSpent);
      book.timeSpent = formatTimeSpent(currentSeconds + session.durationSeconds);

      const dateObj = session.customDate ? new Date(session.customDate) : new Date();
      book.lastSolvedDate = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
      book.lastSolvedAt = dateObj.toISOString();

      const QUESTIONS_PER_TOPIC_ESTIMATE = 150;
      const sessionTopics = session.topicStats && session.topicStats.length > 0 
          ? session.topicStats 
          : [{ 
              topic: session.config.topic, 
              questions: session.questions,
              correct: session.correct,
              wrong: session.wrong,
              empty: session.empty
            }];

      if (!book.topics) book.topics = [];

      sessionTopics.forEach(t => {
          const existingTopicIndex = book.topics!.findIndex(bt => bt.label === t.topic);
          let newSolvedCount = t.questions;
          
          if (existingTopicIndex !== -1) {
              const bt = book.topics![existingTopicIndex];
              const topicTotal = bt.totalQuestions; 
              const currentSolved = bt.solvedCount || 0;
              newSolvedCount = currentSolved + t.questions;
              bt.solvedCount = newSolvedCount;
              bt.correct = (bt.correct || 0) + (t.correct || 0);
              bt.wrong = (bt.wrong || 0) + (t.wrong || 0);
              bt.empty = (bt.empty || 0) + (t.empty || 0);

              if (!isExplicitTotal) {
                  if (topicTotal === 0) {
                      bt.progress = 0;
                  } else {
                      const effTotal = topicTotal || QUESTIONS_PER_TOPIC_ESTIMATE;
                      const totalSolved = newSolvedCount + (bt.externalSolvedCount || 0);
                      bt.progress = Math.min(100, Math.round((totalSolved / effTotal) * 100));
                  }
              } else {
                  if (topicTotal && topicTotal > 0) {
                      const totalSolved = newSolvedCount + (bt.externalSolvedCount || 0);
                      bt.progress = Math.min(100, Math.round((totalSolved / topicTotal) * 100));
                  } else {
                      bt.progress = 0; 
                  }
              }
          } else {
              book.topics!.push({
                  label: t.topic,
                  solvedCount: newSolvedCount,
                  correct: t.correct || 0,
                  wrong: t.wrong || 0,
                  empty: t.empty || 0,
                  progress: isExplicitTotal ? 0 : Math.min(100, Math.round((newSolvedCount / QUESTIONS_PER_TOPIC_ESTIMATE) * 100))
              });
          }
      });

      if (isExplicitTotal) {
          book.progress = Math.min(100, Math.round((book.solvedQuestions / book.totalQuestions!) * 100));
      } else {
          let estimatedTotal = 0;
          const uniqueTopicLabels = new Set<string>();
          book.topics?.forEach(t => uniqueTopicLabels.add(t.label));
          
          uniqueTopicLabels.forEach(label => {
              const existing = book.topics?.find(t => t.label === label);
              if (existing && existing.totalQuestions) {
                  estimatedTotal += existing.totalQuestions;
              } else {
                  estimatedTotal += QUESTIONS_PER_TOPIC_ESTIMATE;
              }
          });
          
          if (estimatedTotal > 0) {
              book.progress = Math.min(100, Math.round((book.solvedQuestions / estimatedTotal) * 100));
          }
      }

      if (bookIndex !== -1) {
          this._books[bookIndex] = book;
      } else {
          this._books.push(book);
      }
      await this.persist();
  }

  private async persist() {
    try {
      await Preferences.set({
        key: BOOK_STORAGE_KEY,
        value: JSON.stringify(this._books)
      });
    } catch (e) {
      console.error("Failed to persist books", e);
    }
  }
}

export const bookService = new BookService();
