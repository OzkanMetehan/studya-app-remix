
import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onSave: (moodName: string) => void;
  initialValue?: string;
}

const MoodModal: React.FC<Props> = ({ onClose, onSave, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-[#FFFBEB] w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-fadeIn">
                <h3 className="text-lg font-bold text-[#5A4A42] mb-4 text-center">
                {initialValue ? 'Hissi Düzenle' : 'Yeni His Ekle'}
                </h3>
                
                <input 
                type="text" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="His adı (Örn: Odaklanmış)"
                className="w-full bg-white border-2 border-orange-100 rounded-xl px-4 py-3 font-bold text-[#5A4A42] outline-none focus:border-orange-300 transition-colors mb-6 text-center shadow-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />

                <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    İptal
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!value.trim()}
                    className="flex-1 bg-[#2D3A31] text-white py-2.5 rounded-xl font-bold hover:bg-[#3D4A41] transition-colors disabled:opacity-50"
                >
                    Kaydet
                </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MoodModal;
