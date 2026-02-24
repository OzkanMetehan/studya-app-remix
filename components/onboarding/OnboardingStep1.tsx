import React from 'react';
import { Camera } from 'lucide-react';
import { UserModel } from '../../types';
import { AVATARS } from '../../constants';

interface Props {
  data: Partial<UserModel>;
  onUpdate: (data: Partial<UserModel>) => void;
}

const OnboardingStep1: React.FC<Props> = ({ data, onUpdate }) => {
  const [showPicker, setShowPicker] = React.useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 24) return;
    const allowedPattern = /^[a-zA-Z0-9\s_\-çÇğĞıİöÖşŞüÜ]*$/;

    if (allowedPattern.test(val)) {
      onUpdate({ name: val });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full animate-fadeIn pt-16">
      
      {/* Avatar Circle - Fixed Position and Larger Size (w-40 h-40) */}
      <div className="relative mb-12">
        <div 
          onClick={() => setShowPicker(!showPicker)}
          className="w-40 h-40 rounded-full bg-white border-[6px] border-white shadow-lg flex items-center justify-center cursor-pointer relative"
        >
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-white" />
          )}
          
          {/* Small edit circle */}
          <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100">
             <Camera className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        {/* Picker Dropdown */}
        {showPicker && (
          <div className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-xl w-64 grid grid-cols-3 gap-2 z-50">
            {AVATARS.map((url, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  onUpdate({ avatarUrl: url });
                  setShowPicker(false);
                }}
                className="w-16 h-16 rounded-full overflow-hidden border hover:border-accent"
              >
                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Spaced Out */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#3D3D3D] mb-3 whitespace-nowrap">
                Studya'ya Hoş Geldin!
            </h1>
            <p className="text-base text-[#666] font-medium">
                Profilini oluşturalım.
            </p>
        </div>

        <div className="w-72 flex flex-col items-center mt-10">
            <p className="text-[#666] text-sm mb-3 font-medium">Sana nasıl hitap edelim?</p>
            
            <input
            type="text"
            value={data.name || ''}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder="İsim giriniz"
            className="w-full bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl text-center text-gray-800 placeholder-gray-400 placeholder:font-light placeholder:italic outline-none focus:ring-2 focus:ring-blob-orange/50 shadow-sm text-xl font-bold"
            autoFocus
            />
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep1;