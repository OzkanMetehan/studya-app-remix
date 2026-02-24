import React, { useState } from 'react';
import { X, Check, Camera, AlertCircle } from 'lucide-react';
import { UserModel } from '../../types';
import { GRADES, EXAMS, AVATARS } from '../../constants';

interface Props {
  user: UserModel;
  onClose: () => void;
  onSave: (updates: Partial<UserModel>) => void;
}

const EditProfileModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [name, setName] = useState(user.name);
  const [grade, setGrade] = useState(user.grade || 12);
  const [targetExams, setTargetExams] = useState<string[]>(user.targetExams || []);
  const [targetUni, setTargetUni] = useState(user.targetUni || '');
  const [targetDept, setTargetDept] = useState(user.targetDept || '');
  
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Name Change Limit
  const nameChangesRemaining = user.nameChangesRemaining !== undefined ? user.nameChangesRemaining : 3;
  const isNameChanged = name.trim() !== user.name;
  const canChangeName = nameChangesRemaining > 0;

  const toggleExam = (id: string) => {
    if (targetExams.includes(id)) {
      setTargetExams(targetExams.filter(e => e !== id));
    } else {
      setTargetExams([...targetExams, id]);
    }
  };

  const handleSave = () => {
    // Determine if the user has defined a goal
    const hasGoal = targetUni.trim().length > 0 && targetDept.trim().length > 0;
    
    // Check name change logic
    let finalName = user.name;
    let finalRemaining = nameChangesRemaining;

    if (isNameChanged) {
        if (canChangeName) {
            finalName = name.trim();
            finalRemaining = nameChangesRemaining - 1;
        } else {
            // Should be blocked by UI, but safety check
            return;
        }
    }

    onSave({
      name: finalName,
      grade,
      targetExams,
      targetUni,
      targetDept,
      isTargetUndecided: !hasGoal,
      nameChangesRemaining: finalRemaining,
      avatarUrl: avatarUrl
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-neu-1 w-full max-w-sm rounded-[30px] p-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-type-1">Profili Düzenle</h2>
          <button onClick={onClose} className="bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
        </div>

        <div className="space-y-4">
            
          {/* Avatar Changer - Top Center */}
          <div className="flex justify-center mb-2">
             <div className="relative">
                 <div 
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="w-24 h-24 rounded-full bg-white border-[4px] border-white shadow-md cursor-pointer overflow-hidden relative group"
                 >
                     {avatarUrl ? (
                         <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                         <div className="w-full h-full bg-gray-200" />
                     )}
                     <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="w-8 h-8 text-white drop-shadow-md" />
                     </div>
                 </div>
                 <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-100 pointer-events-none">
                     <Camera className="w-4 h-4 text-gray-500" />
                 </div>
                 
                 {/* Avatar Picker Dropdown */}
                 {showAvatarPicker && (
                     <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-xl shadow-xl z-50 grid grid-cols-3 gap-2 w-48 border border-gray-100">
                         {AVATARS.map((url, i) => (
                             <button 
                                key={i}
                                onClick={() => {
                                    setAvatarUrl(url);
                                    setShowAvatarPicker(false);
                                }}
                                className={`w-12 h-12 rounded-full overflow-hidden border-2 ${avatarUrl === url ? 'border-orange-400' : 'border-transparent hover:border-gray-200'}`}
                             >
                                 <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                             </button>
                         ))}
                     </div>
                 )}
             </div>
          </div>

          {/* Name */}
          <div>
             <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-[#888] ml-2 uppercase">İsim</label>
                <span className={`text-[9px] font-bold ${nameChangesRemaining > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {nameChangesRemaining} hakkın kaldı
                </span>
             </div>
             <input 
               type="text" 
               value={name} 
               onChange={(e) => setName(e.target.value)}
               placeholder="İsminiz"
               disabled={!canChangeName}
               className={`w-full h-10 bg-white rounded-xl px-4 font-bold text-type-1 text-sm border outline-none transition-colors ${!canChangeName ? 'opacity-60 cursor-not-allowed border-gray-200' : 'border-orange-100 focus:border-orange-300'}`}
             />
             {!canChangeName && (
                 <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-medium px-2">
                     <AlertCircle className="w-3 h-3" />
                     <span>İsim değiştirme hakkınız doldu.</span>
                 </div>
             )}
          </div>

          <div className="flex gap-4">
              {/* Grade */}
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-[#888] ml-2 block mb-1 uppercase">Sınıf</label>
                 <div className="relative">
                    <select 
                        value={grade} 
                        onChange={(e) => setGrade(parseInt(e.target.value))}
                        className="w-full h-10 bg-white rounded-xl px-3 font-bold text-sm text-type-1 border border-orange-100 outline-none appearance-none"
                    >
                        {GRADES.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                 </div>
              </div>

              {/* Exams */}
              <div className="flex-[1.5]">
                 <label className="text-[10px] font-bold text-[#888] ml-2 block mb-1 uppercase">Sınav Hedefleri</label>
                 <div className="flex flex-wrap gap-1.5">
                   {EXAMS.map(e => {
                     const isSelected = targetExams.includes(e.id);
                     return (
                       <button
                         key={e.id}
                         onClick={() => toggleExam(e.id)}
                         className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex-1 text-center ${
                           isSelected 
                           ? 'bg-acc-1 border-[#6E9C9E] text-white shadow-sm' 
                           : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                         }`}
                       >
                         {e.label}
                       </button>
                     );
                   })}
                 </div>
              </div>
          </div>

          {/* Compact Target Goal */}
          <div className="bg-white/60 p-3 rounded-2xl border border-orange-100/50">
             <label className="text-[10px] font-bold text-[#888] block mb-2 text-center uppercase tracking-wide">Hedef</label>
             <div className="flex gap-2">
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-bold text-[#888] ml-1">Üniversite</label>
                 <input 
                   type="text" 
                   value={targetUni}
                   onChange={(e) => setTargetUni(e.target.value)}
                   className="w-full h-9 bg-white rounded-lg px-2 font-bold text-type-1 text-xs border border-gray-100 outline-none focus:border-orange-200 transition-colors"
                 />
               </div>
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-bold text-[#888] ml-1">Bölüm</label>
                 <input 
                   type="text" 
                   value={targetDept}
                   onChange={(e) => setTargetDept(e.target.value)}
                   className="w-full h-9 bg-white rounded-lg px-2 font-bold text-type-1 text-xs border border-gray-100 outline-none focus:border-orange-200 transition-colors"
                 />
               </div>
             </div>
          </div>

        </div>

        <button 
          onClick={handleSave}
          disabled={isNameChanged && !canChangeName}
          className="w-full mt-6 bg-[#2D3A31] hover:bg-[#3D4A41] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <Check className="w-5 h-5" />
          Kaydet
        </button>

      </div>
    </div>
  );
};

export default EditProfileModal;