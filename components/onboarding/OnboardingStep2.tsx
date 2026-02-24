import React, { useRef, useEffect, useState } from 'react';
import { UserModel } from '../../types';
import { GRADES } from '../../constants';

interface Props {
  data: Partial<UserModel>;
  onUpdate: (data: Partial<UserModel>) => void;
}

const ITEM_HEIGHT = 50; 

const OnboardingStep2: React.FC<Props> = ({ data, onUpdate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [localGrade, setLocalGrade] = useState(data.grade || 12);

  useEffect(() => {
    if (scrollRef.current) {
      const index = GRADES.findIndex(g => g.value === localGrade);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    const centerIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const validIndex = Math.max(0, Math.min(centerIndex, GRADES.length - 1));
    const selectedGrade = GRADES[validIndex];

    if (selectedGrade && selectedGrade.value !== localGrade) {
        setLocalGrade(selectedGrade.value);
        onUpdate({ grade: selectedGrade.value });
    }
  };

  const handleItemClick = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full animate-fadeIn pt-16">
      
      {/* Avatar - Fixed Position and Size (w-40 h-40) Matches Step 1 */}
      <div className="relative mb-12">
        <div className="w-40 h-40 rounded-full bg-white border-[6px] border-white shadow-lg flex items-center justify-center relative">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-white" />
          )}
        </div>
      </div>

      {/* Content Spaced Out */}
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#3D3D3D] mb-3 leading-tight">
                Hoş geldin<br/>{data.name}!
            </h1>
            <p className="text-base text-[#666] font-medium">
                Harika! Peki hangi sınıftasın?
            </p>
        </div>

        {/* Scrollable Grade Picker - Slightly larger spacing */}
        <div className="relative w-64 h-[160px] flex items-center justify-center mt-2">
            <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="w-full h-full overflow-y-auto no-scrollbar snap-y snap-mandatory z-10 py-[55px]" 
            style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
            }}
            >
            {GRADES.map((grade, index) => {
                const isSelected = localGrade === grade.value;
                
                return (
                <div 
                    key={grade.value}
                    onClick={() => handleItemClick(index)}
                    className="h-[50px] w-full flex items-center justify-center snap-center cursor-pointer"
                >
                    <div className={`
                        flex items-center justify-center transition-all duration-300 rounded-xl shadow-sm
                        ${isSelected 
                        ? 'w-full h-[46px] bg-white scale-100 z-10' 
                        : 'w-[90%] h-[36px] bg-white scale-90 opacity-60 z-0'
                        }
                    `}>
                        <span className={`
                        font-bold transition-colors
                        ${isSelected ? 'text-2xl text-[#3D3D3D]' : 'text-lg text-gray-500'}
                        `}>
                        {grade.label}
                        </span>
                    </div>
                </div>
                );
            })}
            </div>
        </div>
      </div>

    </div>
  );
};

export default OnboardingStep2;