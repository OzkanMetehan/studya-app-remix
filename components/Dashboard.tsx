
import React, { useState, useRef, useEffect } from 'react';
import { UserModel, SessionConfig, SessionResult } from '../types';
import { NAV_ITEMS } from '../constants';
import { sessionService } from '../services/sessionService';
import HomePage from './HomePage';
import ProfilePage from './ProfilePage';
import CalendarPage from './CalendarPage';
import LibraryPage from './LibraryPage';
import AnalyticsPage from './AnalyticsPage';
import SessionConfigPage from './session/SessionConfigPage';
import ActiveSessionPage from './session/ActiveSessionPage';
import SessionSummaryPage from './session/SessionSummaryPage';

interface Props {
  user: UserModel;
  onUpdateUser: (data: Partial<UserModel>) => void;
  isDevMode: boolean;
  onToggleDevMode: (enabled: boolean) => void;
}

type ViewState = 'main' | 'session-config' | 'session-active' | 'session-summary';

const Dashboard: React.FC<Props> = ({ user, onUpdateUser, isDevMode, onToggleDevMode }) => {
  const [currentTab, setCurrentTab] = useState('home');
  const [viewState, setViewState] = useState<ViewState>('main');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  
  // Keyboard detection state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Handle Hardware Back Button / Browser Back Navigation
  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          if (event.state && event.state.view) {
              setViewState(event.state.view);
          } else {
              setViewState('main');
          }
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Detect Keyboard Opening (Resize)
  useEffect(() => {
      const initialHeight = window.innerHeight;
      
      const handleResize = () => {
          const currentHeight = window.innerHeight;
          // If height shrinks by more than 20%, assume keyboard is open
          if (currentHeight < initialHeight * 0.8) {
              setIsKeyboardOpen(true);
          } else {
              setIsKeyboardOpen(false);
          }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Session Handlers
  const handleStartSessionFlow = () => {
    window.history.pushState({ view: 'session-config' }, '');
    setViewState('session-config');
  };

  const handleSessionConfigured = (config: SessionConfig) => {
    window.history.pushState({ view: 'session-active' }, '');
    setSessionConfig(config);
    setViewState('session-active');
  };

  const handleSessionEnded = (result: SessionResult) => {
    // Replace state so going back from Summary doesn't go to Active (finished)
    window.history.replaceState({ view: 'session-summary' }, '');
    setSessionResult(result);
    setViewState('session-summary');
  };

  const handleReturnHome = (finalResult: SessionResult) => {
    // Save the final result including stats input by user
    // Pass custom date if available for dev/testing
    sessionService.addSession(
        finalResult, 
        finalResult.customDate ? new Date(finalResult.customDate) : undefined
    );
    
    // Reset and return home
    setViewState('main');
    setSessionConfig(null);
    setSessionResult(null);
  };

  // Render Logic
  const renderMainContent = () => {
    switch (currentTab) {
      case 'home': return <HomePage user={user} onStartSession={handleStartSessionFlow} isDevMode={isDevMode} />;
      case 'profile': return <ProfilePage user={user} onUpdateUser={onUpdateUser} isDevMode={isDevMode} onToggleDevMode={onToggleDevMode} />;
      case 'calendar': return <CalendarPage user={user} isDevMode={isDevMode} />;
      case 'library': return <LibraryPage user={user} isDevMode={isDevMode} />;
      case 'stats': return <AnalyticsPage user={user} isDevMode={isDevMode} />;
      default: return <HomePage user={user} onStartSession={handleStartSessionFlow} isDevMode={isDevMode} />;
    }
  };

  // Full Screen Session Views
  if (viewState === 'session-config') {
    // Use history.back() to pop the state we pushed
    return <SessionConfigPage user={user} onStart={handleSessionConfigured} onBack={() => window.history.back()} />;
  }

  if (viewState === 'session-active' && sessionConfig) {
    return <ActiveSessionPage config={sessionConfig} onEndSession={handleSessionEnded} isDevMode={isDevMode} />;
  }

  if (viewState === 'session-summary' && sessionResult) {
    return <SessionSummaryPage user={user} result={sessionResult} onHome={handleReturnHome} />;
  }

  return (
    <div 
        className="h-[100dvh] w-full flex flex-col relative overflow-hidden font-sans bg-[url('https://i.imgur.com/hvIoUYE.png')] bg-cover bg-center bg-no-repeat"
    >
      {/* Active Page Content */}
      {renderMainContent()}

      {/* Fixed Bottom Navigation (Hidden if keyboard is open) */}
      {!isKeyboardOpen && (
        <nav className="fixed bottom-0 left-0 w-full bg-[#FCEBB6] pb-safe rounded-t-[20px] shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-yellow-200 z-50">
            <div className="flex justify-between items-center px-6 py-2">
            {NAV_ITEMS.map((item) => (
                <button 
                key={item.id} 
                onClick={() => setCurrentTab(item.id)}
                className={`
                    p-2.5 rounded-2xl transition-all duration-300
                    ${item.id === currentTab ? 'bg-[#F2D680] shadow-sm transform -translate-y-1' : 'bg-transparent hover:bg-yellow-100/50'}
                `}
                >
                <item.icon className={`w-6 h-6 ${item.id === currentTab ? 'text-[#3D3D3D]' : 'text-[#6B6B6B]'}`} strokeWidth={1.5} />
                </button>
            ))}
            </div>
        </nav>
      )}

    </div>
  );
};

export default Dashboard;
