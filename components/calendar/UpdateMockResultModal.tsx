
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Save, AlertCircle } from 'lucide-react';
import { StoredSession } from '../../services/sessionService';
import { TopicStat } from '../../types';

interface Props {
  session: StoredSession;
  onClose: () => void;
  onSave: (updatedSession: StoredSession) => void;
  onCycle?: (delta: number) => void;
}

interface TopicInput {
  q: string;
  c: string;
  w: string;
  e: string;
}

const UpdateMockResultModal: React.FC<Props> = ({ session, onClose, onSave, onCycle }) => {
  const topics = session.topicStats?.map(t => t.topic) || [session.config.subject];
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const currentTopic = topics[currentTopicIdx];

  const [topicData, setTopicData] = useState<Record<string, TopicInput>>(() => {
    const initial: Record<string, TopicInput> = {};
    if (session.topicStats) {
      session.topicStats.forEach(t => {
        initial[t.topic] = { 
          q: t.questions.toString(), 
          c: t.correct > 0 ? t.correct.toString() : '', 
          w: t.wrong > 0 ? t.wrong.toString() : '', 
          e: t.empty > 0 ? t.empty.toString() : '' 
        };
      });
    } else {
        initial[session.config.subject] = { q: session.questions.toString(), c: '', w: '', e: '' };
    }
    return initial;
  });

  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (topic: string, field: keyof TopicInput, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setTopicData(prev => ({
      ...prev,
      [topic]: { ...prev[topic], [field]: value }
    }));
    if (error) setError(null);
  };

  const handleSave = () => {
    let grandTotalQ = 0;
    let grandTotalC = 0;
    let grandTotalW = 0;
    let grandTotalE = 0;
    const computedStats: TopicStat[] = [];

    for (const topic of topics) {
      const raw = topicData[topic];
      const q = parseInt(raw.q) || 0;

      if (q <= 0) {
        // Skip subjects with 0 questions in mock tests
        continue;
      }

      const hasC = raw.c !== '';
      const hasW = raw.w !== '';
      const hasE = raw.e !== '';
      let c = hasC ? (parseInt(raw.c) || 0) : 0;
      let w = hasW ? (parseInt(raw.w) || 0) : 0;
      let e = hasE ? (parseInt(raw.e) || 0) : 0;

      // Autofill Logic
      if (hasC && hasW && !hasE) e = q - c - w;
      else if (hasC && hasE && !hasW) w = q - c - e;
      else if (hasW && hasE && !hasC) c = q - w - e;
      else if (hasC && !hasW && !hasE) { w = 0; e = q - c; }
      else if (hasW && !hasC && !hasE) { c = 0; e = q - w; }
      else if (hasE && !hasC && !hasW) { c = 0; w = 0; e = q; }
      else if (!hasC && !hasW && !hasE) { c = 0; w = 0; e = q; }

      if (c < 0 || w < 0 || e < 0 || (c + w + e) !== q) {
        setError(`${topic}: Değerlerin toplamı (${c + w + e}) soru sayısına (${q}) eşit olmalıdır.`);
        return;
      }

      grandTotalQ += q;
      grandTotalC += c;
      grandTotalW += w;
      grandTotalE += e;

      computedStats.push({
        topic,
        questions: q,
        correct: c,
        wrong: w,
        empty: e,
        durationSeconds: session.topicStats?.find(t => t.topic === topic)?.durationSeconds || (session.durationSeconds / topics.length)
      });
    }

    if (grandTotalQ > 0 && (grandTotalC + grandTotalW === 0)) {
      setError("En az 1 soruyu Doğru veya Yanlış olarak işaretlemelisiniz.");
      return;
    }

    const net = grandTotalC - (grandTotalW / 4);
    const acc = grandTotalQ > 0 ? (grandTotalC / grandTotalQ) * 100 : 0;

    const updated: StoredSession = {
      ...session,
      isPendingResult: false,
      questions: grandTotalQ,
      correct: grandTotalC,
      wrong: grandTotalW,
      empty: grandTotalE,
      net: parseFloat(net.toFixed(2)),
      accuracy: Math.round(acc),
      topicStats: computedStats
    };

    onSave(updated);
    onClose();
  };

  const currentStats = topicData[currentTopic];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-[#FFFBEB] w-full max-w-sm rounded-[30px] p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6 relative">
            <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    {onCycle && (
                        <button onClick={() => onCycle(-1)} className="text-[#5A4A42] hover:bg-black/5 rounded-full p-1 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h2 className="text-xl font-bold text-[#5A4A42]">Sonuçları Gir</h2>
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

        <div className="bg-orange-100/50 p-3 rounded-xl mb-6 text-center">
            <span className="text-xs font-bold text-[#5A4A42] block">{session.config.subject}</span>
            <span className="text-[10px] text-[#5A4A42]/60 font-medium">{session.config.publisher || 'Genel Yayın'}</span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded-lg text-[10px] font-bold mb-4 flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-50 mb-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <button 
                onClick={() => setCurrentTopicIdx(prev => Math.max(0, prev - 1))}
                className={`p-1 rounded-full hover:bg-gray-100 ${currentTopicIdx === 0 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ChevronLeft className="w-4 h-4 text-[#5A4A42]" />
            </button>
            <span className="text-xs font-extrabold text-[#5A4A42] truncate px-2">{currentTopic}</span>
            <button 
                onClick={() => setCurrentTopicIdx(prev => Math.min(topics.length - 1, prev + 1))}
                className={`p-1 rounded-full hover:bg-gray-100 ${currentTopicIdx === topics.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <ChevronRight className="w-4 h-4 text-[#5A4A42]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1 mb-0.5">Soru</label>
                <input 
                  type="text" inputMode="numeric" value={currentStats.q} 
                  onChange={e => handleInputChange(currentTopic, 'q', e.target.value)}
                  className="bg-gray-100 border-none rounded-lg h-8 text-center font-bold text-[#5A4A42] text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-red-500 uppercase ml-1 mb-0.5">Yanlış</label>
                <input 
                  type="text" inputMode="numeric" value={currentStats.w} 
                  placeholder="0"
                  onChange={e => handleInputChange(currentTopic, 'w', e.target.value)}
                  className="bg-[#FCEBB6] border-none rounded-lg h-8 text-center font-bold text-[#5A4A42] text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-green-600 uppercase ml-1 mb-0.5">Doğru</label>
                <input 
                  type="text" inputMode="numeric" value={currentStats.c} 
                  placeholder="0"
                  onChange={e => handleInputChange(currentTopic, 'c', e.target.value)}
                  className="bg-[#FCEBB6] border-none rounded-lg h-8 text-center font-bold text-[#5A4A42] text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1 mb-0.5">Boş</label>
                <input 
                  type="text" inputMode="numeric" value={currentStats.e} 
                  placeholder="0"
                  onChange={e => handleInputChange(currentTopic, 'e', e.target.value)}
                  className="bg-[#FCEBB6] border-none rounded-lg h-8 text-center font-bold text-[#5A4A42] text-sm"
                />
              </div>
            </div>
          </div>
          
          {topics.length > 1 && (
              <div className="flex justify-center gap-1 mt-4">
                  {topics.map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${i === currentTopicIdx ? 'bg-orange-400' : 'bg-gray-200'}`} />
                  ))}
              </div>
          )}
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#2D3A31] hover:bg-[#3D4A41] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          Sonuçları Kaydet
        </button>
      </div>
    </div>
  );
};

export default UpdateMockResultModal;
