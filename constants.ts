import { Home, BookOpen, User, BarChart2, Calendar, Scroll, Feather } from 'lucide-react';
import { Book } from './types';

export const APP_NAME = "Studya";

// DATE CONFIGURATION
// Dynamic dates relative to real-world "Today" so the app always feels live
const now = new Date();
export const SIMULATED_TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // End of today

/**
 * Returns a date set to UTC noon to avoid timezone shifts when generating deterministic mock data.
 */
export const getStableDate = (date: Date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
};

// Enable app interaction from Jan 1st of previous year (allows viewing past semester)
export const APP_START_DATE = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0); 

// Mock Data generation starts specifically from Aug 14 of the previous year (relative to semester cycle)
export const MOCK_START_DATE = new Date(now.getFullYear() - (now.getMonth() < 7 ? 1 : 0), 7, 14, 0, 0, 0); 

// Library Data
export const LIBRARY_TABS = ['Tümü', 'Bitenler', 'İstek', 'Favoriler'];

export const LECTURE_SOURCES = [
  'YouTube',
  'MEB Kitabı',
  'Özel Ders',
  'Dershane',
  'Notlar',
  'Konu Anlatım Kitabı',
  'Diğer'
];

export const BOOK_SUBJECTS = [
  'Türkçe',
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce'
];

export const MOCK_NOTES = [
  "Paragraf taktikleri üzerine yoğunlaşıldı.",
  "Türev alma kuralları tekrar edildi.",
  "Deneme analizi yapıldı, geometri eksikleri tespit edildi.",
  "Kelime çalışması yapıldı.",
  "Tarih notları çıkarıldı.",
  "Fizik optik konusuna bakıldı.",
  "Biyoloji sistemler tekrarı.",
  "Kimya organik giriş.",
  "Limit süreklilik soru çözümü.",
  "Dil bilgisi karma test."
];

// SHARED DATA GENERATOR
// Returns deterministic data for a specific date so Calendar and Stats match
export const getMockDayData = (date: Date) => {
    // 1. Check Limits using stable UTC comparisons
    const utcDate = getStableDate(date);
    const utcStart = getStableDate(APP_START_DATE);
    const utcMockStart = getStableDate(MOCK_START_DATE);
    const utcToday = getStableDate(SIMULATED_TODAY);

    const isBeforeAppStart = utcDate < utcStart;
    const isFuture = utcDate > utcToday;

    if (isBeforeAppStart || isFuture) {
        return {
            val: 0,
            status: isFuture ? 'none' : 'disabled',
            correct: 0,
            wrong: 0,
            empty: 0,
            net: 0,
            durationSeconds: 0,
            subjects: [] as {name: string, val: number}[],
            sessionCount: 0,
            notes: [] as string[]
        };
    }

    // Mock Data Limit (Semester Start)
    if (utcDate < utcMockStart) {
         return {
            val: 0,
            status: 'none',
            correct: 0,
            wrong: 0,
            empty: 0,
            net: 0,
            durationSeconds: 0,
            subjects: [] as {name: string, val: number}[],
            sessionCount: 0,
            notes: [] as string[]
        };
    }

    // 2. Deterministic Random based on Date (Timezone Agnostic)
    const y = utcDate.getUTCFullYear();
    const m = utcDate.getUTCMonth();
    const d = utcDate.getUTCDate();
    
    const seed = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    const rand = (max: number) => Math.abs((hash = (hash * 16807) % 2147483647)) % max;

    // 3. Generate Stats
    const typeRoll = rand(100);
    let status = 'none';
    let val = 0;

    if (typeRoll < 5) status = 'sick';
    else if (typeRoll < 10) status = 'rest';
    else if (typeRoll < 15) status = 'saved';
    else if (typeRoll < 25) status = 'none';
    else {
        val = rand(300) + 20;
        if (val > 200) status = 'high';
        else if (val > 100) status = 'medium';
        else status = 'low';
    }

    if (status === 'sick' || status === 'rest' || status === 'saved' || status === 'none') {
        val = 0;
    }

    // Detailed breakdown
    const correct = Math.floor(val * (0.6 + (rand(30) / 100)));
    const wrong = Math.floor((val - correct) * 0.7);
    const empty = val - correct - wrong;
    const net = correct - (wrong / 4);
    
    // Vary speed: 45 to 90 seconds per question (DBS 0.66 to 1.33)
    // This ensures reasonable DBS values
    const secPerQ = 45 + rand(45);
    const durationSeconds = Math.floor(val * secPerQ);

    // 4. Distribute across 1-3 random subjects
    const subjects: {name: string, val: number}[] = [];
    let sessionCount = 0;

    if (val > 0) {
        sessionCount = (rand(3)) + 1; // 1 to 3 sessions simulated
        const numSubjects = sessionCount; // Assuming 1 session per subject change for simplicity in mock
        let remainingVal = val;
        
        // Pick random unique start index
        const startIndex = rand(BOOK_SUBJECTS.length);
        
        for (let i = 0; i < numSubjects; i++) {
            const subjectName = BOOK_SUBJECTS[(startIndex + i * 3) % BOOK_SUBJECTS.length]; // *3 to scatter them
            let subVal = 0;
            
            if (i === numSubjects - 1) {
                subVal = remainingVal;
            } else {
                // Give a chunk
                subVal = Math.floor(remainingVal * (0.3 + (rand(40)/100)));
                if (subVal === 0) subVal = 1;
            }
            
            remainingVal -= subVal;
            subjects.push({ name: subjectName, val: subVal });
        }
    }

    // 5. Generate Lecture Mock Data (since 2026-01-01)
    const lectureStartDate = new Date(2026, 0, 1);
    let lectureDurationSeconds = 0;
    const lectureSubjects: { name: string, durationSeconds: number, topic: string }[] = [];

    if (date >= lectureStartDate && date <= SIMULATED_TODAY) {
        const lectureRoll = rand(100);
        if (lectureRoll > 40) { // 60% chance of having a lecture session
            const numLectures = (rand(2)) + 1; // 1 to 2 sessions
            for (let i = 0; i < numLectures; i++) {
                const subIndex = rand(BOOK_SUBJECTS.length);
                const subName = BOOK_SUBJECTS[subIndex];
                const duration = (rand(60) + 30) * 60; // 30 to 90 minutes
                lectureDurationSeconds += duration;
                
                const topics = SESSION_TOPICS[subName] || ['Genel'];
                const topic = topics[rand(topics.length)];
                
                lectureSubjects.push({
                    name: subName,
                    durationSeconds: duration,
                    topic
                });
            }
        }
    }

    // 6. Generate Random Notes
    const noteCount = (val > 0 || lectureDurationSeconds > 0) ? (rand(2) + 1) : 0; 
    const notes: string[] = [];
    if (val > 0 || lectureDurationSeconds > 0) {
        for(let i=0; i<noteCount; i++) {
            notes.push(MOCK_NOTES[rand(MOCK_NOTES.length)]);
        }
    }

    return {
        val,
        status,
        correct,
        wrong,
        empty,
        net,
        durationSeconds,
        subjects,
        sessionCount,
        notes,
        lectureDurationSeconds,
        lectureSubjects
    };
};

export const getDevMockExams = (year: number) => [
    {
        id: 'dev_mock_1',
        completedAt: new Date(year, 9, 25, 10, 30).toISOString(), // Oct 25
        net: 65.5,
        questions: 120,
        correct: 70, wrong: 18, empty: 32, accuracy: 58,
        durationSeconds: 120 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: '3D Yayınları' }
    },
    {
        id: 'dev_mock_2',
        completedAt: new Date(year, 10, 5, 14, 0).toISOString(), // Nov 5
        net: 72.75,
        questions: 120,
        correct: 78, wrong: 21, empty: 21, accuracy: 65,
        durationSeconds: 125 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: 'Bilgi Sarmal' }
    },
    {
        id: 'dev_mock_3',
        completedAt: new Date(year, 10, 15, 9, 15).toISOString(), // Nov 15
        net: 81.0,
        questions: 120,
        correct: 85, wrong: 16, empty: 19, accuracy: 70,
        durationSeconds: 130 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: 'Orijinal' }
    },
    {
        id: 'dev_mock_4',
        completedAt: new Date(year, 10, 22, 10, 30).toISOString(), // Nov 22 - Bad
        net: 55.5,
        questions: 120,
        correct: 60, wrong: 18, empty: 42, accuracy: 50,
        durationSeconds: 135 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: 'Apotsuz' }
    },
    {
        id: 'dev_mock_5',
        completedAt: new Date(year, 11, 1, 13, 0).toISOString(), // Dec 1 - Very Good
        net: 105.0,
        questions: 120,
        correct: 108, wrong: 12, empty: 0, accuracy: 90,
        durationSeconds: 110 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: 'Kolay Yayın' }
    },
    {
        id: 'dev_mock_6',
        completedAt: new Date(year, 11, 8, 9, 0).toISOString(), // Dec 8 - Very Bad
        net: 42.5,
        questions: 120,
        correct: 50, wrong: 30, empty: 40, accuracy: 41,
        durationSeconds: 100 * 60,
        config: { isMockTest: true, examType: 'TYT', subject: 'TYT Genel', publisher: 'Zor Yayın' }
    }
];

export const GRADES = [
  { value: 9, label: '9' },
  { value: 10, label: '10' },
  { value: 11, label: '11' },
  { value: 12, label: '12' },
  { value: 13, label: 'Mezun' },
];

export const EXAMS = [
  { id: 'TYT', label: 'TYT', type: 'basic' },
  { id: 'AYT-SAY', label: 'AYT-Say', type: 'field' },
  { id: 'AYT-SOZ', label: 'AYT-Söz', type: 'field' },
  { id: 'AYT-EA', label: 'AYT-EA', type: 'field' },
  { id: 'YDT', label: 'YDT', type: 'field' },
];

export const AVATARS = [
  "https://picsum.photos/id/64/200/200",
  "https://picsum.photos/id/177/200/200",
  "https://picsum.photos/id/237/200/200", 
  "https://picsum.photos/id/433/200/200", 
  "https://picsum.photos/id/593/200/200", 
  "https://picsum.photos/id/659/200/200", 
];

// Navigation translated
export const NAV_ITEMS = [
  { label: 'Kütüphane', icon: BookOpen, id: 'library' },
  { label: 'Takvim', icon: Calendar, id: 'calendar' },
  { label: 'Ana Sayfa', icon: Home, id: 'home' },
  { label: 'İstatistik', icon: BarChart2, id: 'stats' },
  { label: 'Profil', icon: User, id: 'profile' },
];

// Home Page Data Translated
export const TODAY_PLANS = [
  { id: 1, subject: 'Türkçe', time: '17:45', icon: Scroll },
  { id: 2, subject: 'Tarih', time: '20:30', icon: Feather },
];

export const BOOKS: Book[] = [
  // Türkçe
  { 
    id: 1, 
    title: '345 Türkçe', 
    progress: 74.3, 
    color: '#FFF8E7', 
    category: 'Türkçe',
    year: 2024,
    isFavorite: true,
    totalQuestions: 820,
    solvedQuestions: 609,
    lastSolvedDate: '29.08.2025 Cum',
    timeSpent: '7s 04d',
    qpm: 0.69,
    accuracy: 87,
    rating: 4,
    examTypes: ['TYT'],
    topics: [
      { label: 'Paragraf', progress: 93 },
      { label: 'Sözcükte Anlam', progress: 48 },
      { label: 'Dil Bilgisi', progress: 64 },
      { label: 'Noktalama', progress: 20 },
    ]
  },
  { 
    id: 2, 
    title: 'Limit Türkçe', 
    progress: 22, 
    color: '#FFF8E7', 
    category: 'Türkçe',
    year: 2025,
    isFavorite: false,
    totalQuestions: 900,
    solvedQuestions: 198,
    lastSolvedDate: '20.08.2025',
    timeSpent: '3s 20d',
    qpm: 0.8,
    accuracy: 90,
    rating: 5,
    examTypes: ['TYT'],
    topics: [
      { label: 'Yazım Kuralları', progress: 30 },
      { label: 'Cümle Türleri', progress: 15 },
    ]
  },

  // Matematik
  { 
    id: 3, 
    title: '3D Matematik', 
    progress: 10, 
    color: '#FFF8E7', 
    category: 'Matematik',
    year: 2024,
    isFavorite: true,
    totalQuestions: 1200,
    solvedQuestions: 120,
    lastSolvedDate: '28.08.2025 Per',
    timeSpent: '2s 15d',
    qpm: 1.2,
    accuracy: 65,
    rating: 3,
    examTypes: ['AYT'],
    topics: [
      { label: 'Fonksiyonlar', progress: 15 },
      { label: 'Polinomlar', progress: 5 },
    ]
  },
  {
    id: 4,
    title: 'Acil Matematik',
    progress: 45, 
    color: '#FFF8E7', 
    category: 'Matematik',
    year: 2025,
    isFavorite: false,
    totalQuestions: 1500,
    solvedQuestions: 675,
    lastSolvedDate: '25.08.2025',
    timeSpent: '8s 30d',
    qpm: 1.1,
    accuracy: 78,
    rating: 4,
    examTypes: ['AYT'],
    topics: [
      { label: 'Türev', progress: 40 },
      { label: 'İntegral', progress: 20 },
    ]
  },

  // Biyoloji
  { 
    id: 5, 
    title: 'Palme Biyoloji', 
    progress: 5, 
    color: '#FFF8E7', 
    category: 'Biyoloji',
    year: 2024,
    isFavorite: false,
    totalQuestions: 800,
    solvedQuestions: 40,
    lastSolvedDate: '15.08.2025',
    timeSpent: '45d',
    qpm: 0.9,
    accuracy: 80,
    rating: 0,
    examTypes: ['TYT', 'AYT'],
    topics: []
  },
  { 
    id: 6, 
    title: 'Biyotik', 
    progress: 0, 
    color: '#FFF8E7', 
    category: 'Biyoloji',
    year: 2025,
    isFavorite: false,
    totalQuestions: 600,
    solvedQuestions: 0,
    lastSolvedDate: '-',
    timeSpent: '0d',
    qpm: 0,
    accuracy: 0,
    rating: 0,
    examTypes: ['TYT'],
    topics: []
  },

  // Fizik
  {
    id: 7,
    title: 'Karaağaç Fizik',
    progress: 12,
    color: '#FFF8E7', 
    category: 'Fizik',
    year: 2024,
    isFavorite: false,
    totalQuestions: 950,
    solvedQuestions: 114,
    lastSolvedDate: '27.08.2025',
    timeSpent: '2s',
    qpm: 1.5,
    accuracy: 60,
    rating: 3,
    examTypes: ['TYT', 'AYT'],
    topics: []
  },

  // Kimya
  {
    id: 8,
    title: 'Aydın Kimya',
    progress: 60,
    color: '#FFF8E7', 
    category: 'Kimya',
    year: 2024,
    isFavorite: true,
    totalQuestions: 700,
    solvedQuestions: 420,
    lastSolvedDate: '29.08.2025',
    timeSpent: '5s',
    qpm: 0.8,
    accuracy: 85,
    rating: 5,
    examTypes: ['AYT'],
    topics: []
  },

  // Tarih
  {
    id: 9,
    title: 'Benim Hocam Tarih',
    progress: 30,
    color: '#FFF8E7', 
    category: 'Tarih',
    year: 2024,
    isFavorite: false,
    totalQuestions: 1100,
    solvedQuestions: 330,
    lastSolvedDate: '26.08.2025',
    timeSpent: '4s',
    qpm: 0.6,
    accuracy: 92,
    rating: 4,
    examTypes: ['TYT'],
    topics: []
  },

  // Coğrafya
  {
    id: 10,
    title: 'Yavuz Tuna Coğrafya',
    progress: 88,
    color: '#FFF8E7', 
    category: 'Coğrafya',
    year: 2023,
    isFavorite: false,
    totalQuestions: 500,
    solvedQuestions: 440,
    lastSolvedDate: '30.08.2025',
    timeSpent: '6s',
    qpm: 0.5,
    accuracy: 95,
    rating: 5,
    examTypes: ['TYT'],
    topics: []
  },

  // Felsefe
  { 
    id: 11, 
    title: 'Felsefe Deposu', 
    progress: 0, 
    color: '#FFF8E7', 
    category: 'Felsefe',
    year: 2025,
    isFavorite: false,
    totalQuestions: 300,
    solvedQuestions: 0,
    lastSolvedDate: '-',
    timeSpent: '0d',
    qpm: 0,
    accuracy: 0,
    rating: 0,
    examTypes: ['TYT'],
    topics: []
  },

  // Din Kültürü
  {
    id: 12,
    title: 'Din Kültürü El Kitabı',
    progress: 100,
    color: '#FFF8E7', 
    category: 'Din Kültürü ve Ahlak Bilgisi',
    year: 2024,
    isFavorite: false,
    totalQuestions: 200,
    solvedQuestions: 200,
    lastSolvedDate: '10.08.2025',
    timeSpent: '2s',
    qpm: 0.4,
    accuracy: 98,
    rating: 5,
    examTypes: ['TYT'],
    topics: []
  },

  // İngilizce
  {
    id: 13,
    title: 'YDS Road to Success',
    progress: 15,
    color: '#FFF8E7', 
    category: 'İngilizce',
    year: 2025,
    isFavorite: true,
    totalQuestions: 2000,
    solvedQuestions: 300,
    lastSolvedDate: '28.08.2025',
    timeSpent: '5s',
    qpm: 1.0,
    accuracy: 70,
    rating: 4,
    examTypes: ['YDT'],
    topics: []
  }
];

export const STRENGTHS_DATA = [
  { subject: 'Türkçe', score: 93, status: 'gold' },
  { subject: 'Felsefe', score: 91, status: 'silver' },
  { subject: 'Coğrafya', score: 90, status: 'bronze' },
  { subject: 'Biyoloji', score: 79, status: 'none' },
];

export const SUBTOPIC_DATA = [
  { label: 'Noktalama', time: '1s 12dk', q: 107, speed: 1.08, correct: 74, wrong: 10, empty: 23 },
  { label: 'Deyimler', time: '54dk', q: 52, speed: 1.03, correct: 44, wrong: 4, empty: 4 },
];

export const STUDY_GRAPH_POINTS = [
  { date: 'Eyl 2', val: 5 },
  { date: 'Eyl 9', val: 10 },
  { date: 'Eyl 12', val: 7 },
  { date: 'Eyl 16', val: 15 },
  { date: 'Eyl 23', val: 3 },
  { date: 'Eyl 30', val: 12 },
];

// Session Data
export const SESSION_SUBJECTS = [
  'Türkçe',
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce'
];

// Separated Database for TYT Topics
export const TYT_TOPICS: Record<string, string[]> = {
  'Türkçe': [
    'Sözcükte Anlam', 'Söz Yorumu', 'Deyim ve Atasözü', 'Cümlede Anlam', 'Paragraf',
    'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Sözcükte Yapı/Ekler',
    'Sözcük Türleri', 'İsimler', 'Zamirler', 'Sıfatlar', 'Zarflar', 'Edat – Bağlaç – Ünlem',
    'Fiiller', 'Sözcük Grupları', 'Cümlenin Ögeleri', 'Cümle Türleri', 'Anlatım Bozukluğu'
  ],
  'Coğrafya': [
    'Doğa ve İnsan', 'Dünya’nın Şekli ve Hareketleri', 'Coğrafi Konum', 'Harita Bilgisi',
    'Atmosfer ve Sıcaklık', 'İklimler', 'Basınç ve Rüzgarlar', 'Nem, Yağış ve Buharlaşma',
    'İç Kuvvetler / Dış Kuvvetler', 'Su – Toprak ve Bitkiler', 'Nüfus', 'Göç', 'Yerleşme',
    'Türkiye’nin Yer Şekilleri', 'Ekonomik Faaliyetler', 'Bölgeler',
    'Uluslararası Ulaşım Hatları', 'Çevre ve Toplum', 'Doğal Afetler'
  ],
  'Tarih': [
    'Tarih ve Zaman', 'İnsanlığın İlk Dönemleri', 'Orta Çağ’da Dünya',
    'İlk ve Orta Çağlarda Türk Dünyası', 'İslam Medeniyetinin Doğuşu',
    'Türklerin İslamiyet’i Kabulü ve İlk Türk İslam Devletleri',
    'Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi', 'Beylikten Devlete Osmanlı Siyaseti',
    'Devletleşme Sürecinde Savaşçılar ve Askerler', 'Beylikten Devlete Osmanlı Medeniyeti',
    'Dünya Gücü Osmanlı', 'Sultan ve Osmanlı Merkez Teşkilatı', 'Klasik Çağda Osmanlı Toplum Düzeni',
    'Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti', 'Değişim Çağında Avrupa ve Osmanlı',
    'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)',
    'Devrimler Çağında Değişen Devlet-Toplum İlişkileri', 'Sermaye ve Emek',
    'XIX. ve XX. Yüzyılda Değişen Gündelik Hayat', 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya',
    'Milli Mücadele', 'Atatürkçülük ve Türk İnkılabı'
  ],
  'Matematik': [
    'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB – EKOK',
    'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar',
    'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran Orantı', 'Denklem Çözme', 'Problemler',
    'Kümeler – Kartezyen Çarpım', 'Mantık', 'Fonskiyonlar', 'Polinomlar',
    '2.Dereceden Denklemler', 'Permütasyon ve Kombinasyon', 'Olasılık', 'Veri – İstatistik'
  ],
  'Fizik': [
    'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Sıvıların Kaldırma Kuvveti', 'Basınç',
    'Isı, Sıcaklık ve Genleşme', 'Hareket ve Kuvvet', 'Dinamik', 'İş, Güç ve Enerji',
    'Elektrik', 'Manyetizma', 'Dalgalar', 'Optik'
  ],
  'Kimya': [
    'Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler',
    'Maddenin Halleri', 'Doğa ve Kimya', 'Kimyanın Temel Kanunları',
    'Kimyasal Hesaplamalar', 'Karışımlar', 'Asit, Baz ve Tuz', 'Kimya Her Yerde'
  ],
  'Biyoloji': [
    'Canlıların Ortak Özellikleri', 'Canlıların Temel Bileşenleri', 'Hücre ve Organelleri',
    'Hücre Zarından Madde Geçişi', 'Canlıların Sınıflandırılması', 'Mitoz ve Eşeysiz Üreme',
    'Mayoz ve Eşeyli Üreme', 'Kalıtım', 'Ekosistem Ekolojisi', 'Güncel Çevre Sorunları'
  ],
  'Din Kültürü ve Ahlak Bilgisi': [
    'Bilgi ve İnanç', 'İslam ve İbadet', 'Ahlak ve Değerler', 'Allah İnsan İlişkisi',
    'Hz. Muhammed (S.A.V.)', 'Vahiy ve Akıl', 'İslam Düşüncesinde Yorumlar, Mezhepler',
    'Din, Kültür ve Medeniyet', 'İslam ve Bilim, Estetik, Barış', 'Yaşayan Dinler'
  ],
  'Felsefe': [
    'Felsefeyi Tanıma', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi',
    'Sanat Felsefesi', 'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi',
    'İlk Çağ Felsefesi', '2. Yüzyıl ve 15. Yüzyıl Felsefeleri',
    '15. Yüzyıl ve 17. Yüzyıl Felsefeleri', '18. Yüzyıl ve 19. Yüzyıl Felsefeleri',
    '20. Yüzyıl Felsefesi'
  ],
  'Geometri': [
    'Temel Kavramlar', 'Doğruda Açılar', 'Üçgende Açılar', 'Eşkenar Üçgen', 'Açıortay',
    'Kenarortay', 'Eşlik ve Benzerlik', 'Üçgende Alan', 'Üçgende Benzerlik',
    'Açı Kenar Bağıntıları', 'Çokgenler', 'Özel Dörtgenler', 'Çember ve Daire',
    'Analitik Geometri', 'Katı Cisimler', 'Çember Analitiği'
  ]
};

// Separated Database for AYT Topics
export const AYT_TOPICS: Record<string, string[]> = {
  'Türkçe': [
    'Anlam Bilgisi', 'Dil Bilgisi', 'Güzel Sanatlar ve Edebiyat', 'Metinlerin Sınıflandırılması',
    'Şiir Bilgisi', 'Edebi Sanatlar', 'Türk Edebiyatı Dönemleri', 'Edebiyat Akımları'
  ],
  'Tarih': [
    'İnsanlığın İlk Dönemleri', 'Orta Çağda Dünya', 'İlk ve Orta Çağlarda Türk Dünyası',
    'İslam Medeniyetinin Doğuşu', 'Türklerin İslamiyet’i Kabulü ve İlk Türk İslam Devletleri',
    'Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiye’si', 'Beylikten Devlete Osmanlı Siyaseti (1302-1453)',
    'Stateleşme Sürecinde Savaşçılar ve Askerler', 'Beylikten Devlete Osmanlı Medeniyeti',
    'Dünya Gücü Osmanlı (1453-1595)', 'Sultan ve Osmanlı Merkez Teşkilatı',
    'Klasik Çağda Osmanlı Toplum Düzeni (1595-1774)', 'Değişim Çağında Avrupa ve Osmanlı',
    'Uluslararası İlişkilerde Denge Stratejileri (1774-1914)', 'Devrimler Çağında Değişen Devlet-Toplum İlişkileri',
    'Sermaye ve Emek', '19. Ve 20. Yüzyılda Değişen Gündelik Hayat',
    '20. Yüzyıl Başlarında Osmanlı Devleti ve Dünya', 'Millî Mücadele', 'Atatürkçülük ve Türk İnkılabı',
    'İki Savaş Arasındaki Dönemde Türkiye ve Dünya', '2. Dünya Savaşı Sürecinde Türkiye ve Dünya',
    '2. Dünya Savaşı Sonrasında Türkiye ve Dünya', 'Toplumsal Devrim Çağında Dünya ve Türkiye',
    '21. Yüzyılın Eşiğinde Türkiye ve Dünya'
  ],
  'Coğrafya': [
    'Ekosistem', 'Nüfus Politikaları', 'Türkiye’de Nüfus ve Yerleşme', 'Ekonomik Faaliyetler ve Doğal Kaynaklar',
    'Göç ve Şehirleşme', 'Türkiye Ekonomisi', 'Geçmişten Geleceğe Şehir ve Ekonomi',
    'Türkiye’nin İşlevsel Bölgeleri ve Kalkınma Projeleri', 'Hizmet Sektörünün Ekonomideki Yeri',
    'Küresel Ticaret', 'Bölgeler ve Ülkeler', 'Çevre ve Toplum'
  ],
  'Matematik': [
    'Trigonometri', 'Analitik Geometri', 'Fonksiyonlarda Uygulamalar', 'Denklem ve Eşitsizlik Sistemleri',
    'Çember ve Daire', 'Uzay Geometri', 'Üstel ve Logaritmik Fonksiyonlar', 'Diziler',
    'Dönüşümler', 'Türev', 'İntegral'
  ],
  'Geometri': [
    'Temel Kavramlar', 'Doğruda Açılar', 'Üçgende Açılar', 'Özel Üçgenler', 'Açıortay',
    'Kenarortay', 'Üçgende Alan', 'Üçgende Benzerlik', 'Açı Kenar Bağıntıları', 'Çokgenler',
    'Özel Dörtgenler', 'Dörtgenler', 'Çember ve Daire', 'Analitik Geometri',
    'Katı Cisimler (Uzay Geometri)', 'Çemberin Analitiği'
  ],
  'Fizik': [
    'Kuvvet ve Hareket', 'Elektrik ve Manyetizma', 'Çembersel Hareket', 'Basit harmonik hareket',
    'Dalga Mekaniği', 'Atom Fiziğine Giriş ve Radyoaktivite', 'Modern Fizik',
    'Modern Fiziğin Teknolojideki Uygulamaları'
  ],
  'Kimya': [
    'Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler ve Çözünürlük', 'Kimyasal Tepkimelerde Enerji',
    'Kimyasal Tepkimelerde Hız', 'Kimyasal Tepkimelerde Denge', 'Kimya ve Elektrik',
    'Karbon Kimyasına Giriş', 'Organik Bileşikler', 'Enerji Kaynakları ve Bilimsel Gelişimler'
  ],
  'Biyoloji': [
    'İnsan Fizyolojisi', 'Komünite ve Popülasyon Ekolojisi', 'Genden Proteine',
    'Canlılarda Enerji Dönüşümleri', 'Bitki Biyolojisi', 'Canlılar ve Çevre'
  ],
  'Felsefe': [
    'Felsefeyi Tanıma', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi', 'Sanat Felsefesi',
    'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi', 'İlk Çağ Felsefesi',
    'MÖ 6. Yüzyıl-MS. Yüzyıl Felsefesi', 'MS 2. Yüzyıl-MS 25.Yüzyıl Felsefesi',
    '15. Yüzyıl-17.Yüzyıl Felsefesi', '18. Yüzyıl-19.Yüzyıl Felsefesi', '20. Yüzyıl Felsefesi'
  ],
  'Din Kültürü ve Ahlak Bilgisi': [
    'Dünya ve Ahiret', 'Kur’an’a Göre Hz. Muhammed', 'Kur’an’da Bazı Kavramlar', 'Kur’an’dan Mesajlar',
    'İnançla İlgili Meseleler', 'İslam ve Bilim', 'Anadolu\'da İslam',
    'İslam Düşüncesinde Tasavvufi Yorumlar ve Mezhepler', 'Güncel Dini Meseleler', 'Yaşayan Dinler'
  ]
};

// YDT Topics (Foreign Language)
export const YDT_TOPICS: Record<string, string[]> = {
  'İngilizce': [
    'Kelime Bilgisi',
    'Dilbilgisi',
    'Okuduğunu Anlama',
    'Çeviri'
  ]
};

// Map current session topics to all topics (Merged Unique)
const ALL_SUBJECTS = [...new Set([...Object.keys(TYT_TOPICS), ...Object.keys(AYT_TOPICS), ...Object.keys(YDT_TOPICS)])];
export const SESSION_TOPICS: Record<string, string[]> = {};
ALL_SUBJECTS.forEach(sub => {
    const set = new Set([
        ...(TYT_TOPICS[sub] || []),
        ...(AYT_TOPICS[sub] || []),
        ...(YDT_TOPICS[sub] || [])
    ]);
    SESSION_TOPICS[sub] = Array.from(set);
});

export const MOODS = ['İlhamlı', 'Uykulu', 'Enerjik', 'Stresli', 'Sakin'];
export const LOCATIONS = ['Kütüphane', 'Ev', 'Okul', 'Kafe'];
export const PRESETS = ['Varsayılan', 'Pomodoro', 'Hızlı Test', 'Deneme'];

export const MOTIVATIONAL_QUOTES = [
  "With great power comes great responsibility",
  "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
  "Gelecek, bugünden hazırlananlara aittir.",
  "Yorgun olduğunda dinlen, vazgeçme.",
  "Kendine inan, başarının yarısı budur."
];