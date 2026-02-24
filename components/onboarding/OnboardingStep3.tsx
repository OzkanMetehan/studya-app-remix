

import React from 'react';
import { UserModel } from '../../types';
import { EXAMS } from '../../constants';
import { Check } from 'lucide-react';

interface Props {
  data: Partial<UserModel>;
  onUpdate: (data: Partial<UserModel>) => void;
}

const OnboardingStep3: React.FC<Props> = ({ data, onUpdate }) => {
  
  const toggleExam = (examId: string) => {
    const current = data.targetExams || [];
    const exists = current.includes(examId);
    let updated: string[];
    if (exists) updated = current.filter(id => id !== examId);
    else updated = [...current, examId];
    onUpdate({ targetExams: updated });
  };

  const toggleUndecided = () => {
    const newVal = !data.isTargetUndecided;
    if (newVal) {
        // Clear inputs if they decide they are undecided
        onUpdate({ isTargetUndecided: newVal, targetUni: '', targetDept: '' });
    } else {
        onUpdate({ isTargetUndecided: newVal });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full animate-fadeIn pt-16">
      
      {/* Avatar - Fixed Position and Size (w-40 h-40) Matches Step 1 & 2 */}
      {/* Reduced margin for compact fit */}
      <div className="relative mb-6 flex-shrink-0">
        <div className="w-40 h-40 rounded-full bg-white border-[6px] border-white shadow-lg flex items-center justify-center relative">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-white" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full px-6">
        {/* Text Content */}
        <div className="text-center mb-1">
            <h1 className="text-xl font-extrabold text-[#3D3D3D] mb-1 leading-tight">
                Hoş geldin<br/>{data.name}!
            </h1>
            <p className="text-sm text-[#666] font-medium">
                Süper, son olarak hedefini seç!
            </p>
        </div>

        {/* Exam Pills Cloud - Smaller size */}
        <div className="w-full max-w-[320px] flex flex-wrap justify-center gap-2 mb-1">
            {EXAMS.map((exam) => {
            const isSelected = data.targetExams?.includes(exam.id);
            
            return (
                <button
                key={exam.id}
                onClick={() => toggleExam(exam.id)}
                className={`
                    px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm
                    bg-[#EAF6FA] border-2
                    ${isSelected 
                    ? 'border-orange-400 text-gray-800 scale-105 shadow-md' 
                    : 'border-[#EAF6FA] text-gray-500 hover:border-[#A8C9D5]'
                    }
                `}
                >
                {exam.label}
                </button>
            );
            })}
        </div>

        {/* Sentence Builder - Smaller Card Size */}
        <div className="w-full text-center">
            <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 inline-block shadow-sm border border-white/40 transition-opacity duration-300">
                <div className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 font-bold text-xs leading-relaxed max-w-[260px] mx-auto ${data.isTargetUndecided ? 'opacity-40 pointer-events-none grayscale' : 'text-[#555]'}`}>
                    <span>Hedefim</span>
                    
                    <input 
                        type="text" 
                        value={data.targetUni || ''}
                        onChange={(e) => onUpdate({ targetUni: e.target.value })}
                        onKeyDown={handleKeyDown}
                        disabled={data.isTargetUndecided}
                        className="bg-transparent border-b-2 border-gray-400/50 w-24 text-center text-[#3D3D3D] focus:outline-none focus:border-orange-400 transition-colors py-0 text-xs font-bold disabled:border-transparent"
                    />
                    
                    <span>üniversitesi</span>
                    
                    <input 
                        type="text" 
                        value={data.targetDept || ''}
                        onChange={(e) => onUpdate({ targetDept: e.target.value })}
                        onKeyDown={handleKeyDown}
                        disabled={data.isTargetUndecided}
                        className="bg-transparent border-b-2 border-gray-400/50 w-20 text-center text-[#3D3D3D] focus:outline-none focus:border-orange-400 transition-colors py-0 text-xs font-bold disabled:border-transparent"
                    />
                    
                    <span>bölümü.</span>
                </div>

                {/* Undecided Toggle - More compact */}
                <div className="mt-3 pt-3 border-t border-gray-400/10 flex items-center justify-center gap-2 cursor-pointer group" onClick={toggleUndecided}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${data.isTargetUndecided ? 'bg-orange-400 border-orange-400' : 'border-gray-400 bg-white'}`}>
                        {data.isTargetUndecided && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <span className="text-[10px] text-[#555] font-medium group-hover:text-[#333]">Henüz karar vermedim</span>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default OnboardingStep3;