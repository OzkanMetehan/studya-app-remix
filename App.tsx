
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserModel, DEFAULT_USER_MODEL } from './types';
import { authService } from './services/authService';
import { sessionService } from './services/sessionService';
import { bookService } from './services/bookService';
import OnboardingStep1 from './components/onboarding/OnboardingStep1';
import OnboardingStep2 from './components/onboarding/OnboardingStep2';
import OnboardingStep3 from './components/onboarding/OnboardingStep3';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  // Application State
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true); // Initial load
  const [isLoading, setIsLoading] = useState(false); // Action loading
  
  // Dev Mode State
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Onboarding State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserModel>>(DEFAULT_USER_MODEL);
  const [lang, setLang] = useState<'TR'|'EN'>('TR');

  // Warning Toast State
  const [warningToast, setWarningToast] = useState<{msg: string, id: number} | null>(null);

  // Initialize App (Auth & Data)
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Load User
        const user = await authService.loadUser();
        if (user) {
          setFormData(user);
          setIsOnboarded(true);
        }

        // 2. Load Sessions (Cache Warmup)
        await sessionService.init();

        // 3. Load Dev Mode Setting
        const devMode = await authService.getDevMode();
        setIsDevMode(devMode);

        // 4. Load Books
        await bookService.init(devMode);

        // 5. Load Preferences
        // Enforce Rubik font globally
        document.body.style.fontFamily = "'Rubik', sans-serif";

        const savedSize = localStorage.getItem('studya_pref_font_size');
        if (savedSize) {
          const sizeIndex = parseInt(savedSize);
          if (sizeIndex === 1) document.documentElement.style.fontSize = '17px'; 
          else if (sizeIndex === 2) document.documentElement.style.fontSize = '18px'; 
          else document.documentElement.style.fontSize = '16px'; 
        }

      } catch (e) {
        console.error("Initialization error", e);
      } finally {
        setIsAppLoading(false);
      }
    };

    initApp();
  }, []);

  const toggleDevMode = async (enabled: boolean) => {
    setIsDevMode(enabled);
    await authService.setDevMode(enabled);
    // Re-init book service to handle mock data visibility
    await bookService.init(enabled);
  };

  useEffect(() => {
    if (warningToast) {
      const timer = setTimeout(() => {
        setWarningToast(null);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [warningToast]);

  const updateFormData = async (newData: Partial<UserModel>) => {
    // If we have a full user (uid exists), we save immediately
    if (formData.uid) {
       const updatedUser = { ...formData, ...newData } as UserModel;
       setFormData(updatedUser);
       await authService.saveUser(updatedUser);
    } else {
       // Just update local state during onboarding
       setFormData((prev) => ({ ...prev, ...newData }));
    }
  };

  const showToast = (msg: string) => {
    setWarningToast({ msg, id: Date.now() });
  };

  const handleNext = async () => {
    // Validation Logic
    if (currentStep === 0) {
      const name = formData.name || '';
      const letterCount = (name.match(/[a-zA-ZçÇğĞıİöÖşŞüÜ]/g) || []).length;
      
      if (letterCount < 3) {
        showToast("İsim en az 3 harf içermelidir");
        return;
      }
    } else if (currentStep === 1) {
      if (!formData.grade) {
          showToast("Lütfen bir sınıf seçiniz.");
          return;
      }
    } else if (currentStep === 2) {
       if (!formData.targetExams || formData.targetExams.length === 0) {
           showToast("Lütfen en az bir sınav hedefi seçiniz.");
           return;
       }
       
       const isDecided = !formData.isTargetUndecided;
       if (isDecided) {
           if (!formData.targetUni || !formData.targetDept || formData.targetUni.length < 2 || formData.targetDept.length < 2) {
               showToast("Lütfen hedef üniversite ve bölümü giriniz.");
               return;
           }
       }
    }

    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final Step logic
      if (!formData.name) return;
      
      setIsLoading(true);
      try {
        // Create actual user in storage
        const newUser = await authService.createUser(formData);
        setFormData(newUser);
        setIsOnboarded(true);
      } catch (error) {
        console.error("Onboarding failed", error);
        showToast("Bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  if (isAppLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FFF3DA]">
         <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (isOnboarded && formData.uid) {
    return (
      <Dashboard 
        user={formData as UserModel} 
        onUpdateUser={updateFormData} 
        isDevMode={isDevMode}
        onToggleDevMode={toggleDevMode}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[url('https://i.imgur.com/lqiXBci.png')] bg-cover bg-center bg-no-repeat">
      
      {/* MAIN CONTAINER */}
      <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10">
        
        {/* HEADER */}
        <header className="absolute top-0 left-0 w-full px-4 py-4 flex justify-between items-start z-20 pointer-events-none">
          {/* Back Button */}
          <button 
            onClick={handleBack} 
            className={`w-10 h-10 flex items-center justify-center transition-opacity pointer-events-auto mt-2 text-[#555] ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 5L7 12L16 19Z" />
            </svg>
          </button>

          {/* Language Toggle - Positioned closer to corner */}
          <button 
            onClick={() => setLang(lang === 'TR' ? 'EN' : 'TR')}
            className="flex items-center gap-1 mt-1 mr-1 pointer-events-auto transform scale-90 origin-top-right"
          >
            <span className={`text-[10px] font-bold ${lang === 'EN' ? 'text-[#333]' : 'text-gray-400'}`}>EN</span>
            <div className={`w-7 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${lang === 'TR' ? 'bg-[#F2A58C]' : 'bg-gray-300'}`}>
               <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transform transition-transform ${lang === 'TR' ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
            <span className={`text-[10px] font-bold ${lang === 'TR' ? 'text-[#333]' : 'text-gray-400'}`}>TR</span>
          </button>
        </header>

        {/* CONTENT & ACTION AREA - Scrollable */}
        <div className="flex-1 flex flex-col w-full overflow-y-auto no-scrollbar relative z-10">
            
            {/* Steps Container */}
            <div className="flex-1 flex flex-col w-full min-h-[400px]">
                {currentStep === 0 && <OnboardingStep1 data={formData} onUpdate={updateFormData} />}
                {currentStep === 1 && <OnboardingStep2 data={formData} onUpdate={updateFormData} />}
                {currentStep === 2 && <OnboardingStep3 data={formData} onUpdate={updateFormData} />}
            </div>

            {/* ACTION BUTTON - Static relative to content flow (at bottom) */}
            <div className="w-full flex justify-center items-center py-8 flex-shrink-0">
                <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="w-24 h-24 bg-[#555] rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white/20"
                >
                    {isLoading ? (
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" className="ml-2">
                        <path d="M5.5 3.5L19.5 12L5.5 20.5V3.5Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                    </svg>
                    )}
                </button>
            </div>
        </div>

        {/* WARNING TOAST */}
        {warningToast && (
             <div key={warningToast.id} className="absolute bottom-36 left-0 w-full flex justify-center z-50 pointer-events-none">
                <div className="bg-[#E74C3C] text-white px-6 py-3 rounded-2xl shadow-xl animate-flyOut flex items-center gap-3 backdrop-blur-sm border border-white/20">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="font-bold text-xs">!</span>
                    </div>
                    <span className="font-medium text-sm">{warningToast.msg}</span>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default App;
