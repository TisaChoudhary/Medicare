import React, { useState, useEffect } from 'react';
import { Home, Pill, Brain, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { translations } from './services/translations';
import { speak } from './services/voiceService';
import { reminderAPI } from './services/api';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ElderlyDashboard from './pages/ElderlyDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import MedicineManager from './pages/MedicineManager';
import Settings from './pages/Settings';
import Chatbot from './components/Chatbot';
import VoiceAssistant from './components/VoiceAssistant';
import PrescriptionAnalyzer from './pages/PrescriptionAnalyzer';
import { Sparkles } from 'lucide-react';

const App = () => {
  const [session, setSession] = useState({ token: null, user: null });
  const [lang, setLang] = useState('en');
  const [darkMode, setDarkMode] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(0.85);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'medicines', 'chatbot', 'settings'

  // Load session from localStorage on startup
  useEffect(() => {
    const token = localStorage.getItem('medicare_token');
    const user = localStorage.getItem('medicare_user');
    const storedTheme = localStorage.getItem('medicare_theme');
    
    if (storedTheme) {
      setDarkMode(storedTheme === 'dark');
    } else if (token && user) {
      const parsedUser = JSON.parse(user);
      setDarkMode(parsedUser.theme === 'dark');
    }

    if (token && user) {
      const parsedUser = JSON.parse(user);
      setSession({ token, user: parsedUser });
      setLang(parsedUser.language || 'en');
    }
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('medicare_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('medicare_theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user');
    setSession({ token: null, user: null });
    speak("Logged out successfully.", lang, voiceSpeed);
  };

  // Voice Command routing hook
  const handleVoiceCommand = async (command, spokenText) => {
    console.log('Orchestrating command:', command);

    if (command === 'SHOW_MEDICINES') {
      setCurrentPage('medicines');
      speak("Opening medicine list.", lang, voiceSpeed);
    } else if (command === 'SHOW_DASHBOARD') {
      setCurrentPage('dashboard');
      speak("Opening home dashboard.", lang, voiceSpeed);
    } else if (command === 'OPEN_CHATBOT') {
      setCurrentPage('chatbot');
      speak("Opening AI chatbot assistant.", lang, voiceSpeed);

    } else if (command === 'CHECK_STATUS') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const data = await reminderAPI.getToday(todayStr);
        const pending = data.reminders.filter(r => r.status === 'pending' || r.status === 'snoozed');
        
        let report = '';
        if (pending.length === 0) {
          report = lang === 'es' ? 'Has tomado todas tus medicinas por hoy. ¡Buen trabajo!' : lang === 'hi' ? 'आपने आज की सभी दवाइयाँ ले ली हैं। बहुत बढ़िया!' : 'You have taken all your medicines for today. Great job!';
        } else {
          report = lang === 'es' 
            ? `Te quedan ${pending.length} dosis pendientes hoy. Su próxima medicina es ${pending[0].medicineId.name}.` 
            : lang === 'hi' 
            ? `आज आपकी ${pending.length} दवाइयां बची हैं। अगली दवा ${pending[0].medicineId.name} है।`
            : `You have ${pending.length} pending doses remaining today. Your next scheduled medicine is ${pending[0].medicineId.name}.`;
        }
        speak(report, lang, voiceSpeed);
      } catch (err) {
        speak("Unable to check status right now.", lang, voiceSpeed);
      }
    }
  };

  // If not logged in, render authentication forms
  if (!session.token) {
    if (currentPage === 'signup') {
      return (
        <Signup
          setSession={setSession}
          lang={lang}
          setLang={setLang}
          voiceSpeed={voiceSpeed}
          onNavigate={setCurrentPage}
        />
      );
    }
    return (
      <Login
        setSession={setSession}
        lang={lang}
        setLang={setLang}
        voiceSpeed={voiceSpeed}
        onNavigate={setCurrentPage}
      />
    );
  }

  const userRole = session.user?.role;
  const t = translations[lang];

  // Render active page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return userRole === 'caregiver' 
          ? <CaregiverDashboard lang={lang} />
          : <ElderlyDashboard user={session.user} lang={lang} voiceSpeed={voiceSpeed} />;
      case 'medicines':
        return <MedicineManager user={session.user} lang={lang} />;
      case 'chatbot':
        return <Chatbot lang={lang} voiceSpeed={voiceSpeed} />;
      case 'analyzer':
        return <PrescriptionAnalyzer user={session.user} lang={lang} voiceSpeed={voiceSpeed} />;
      case 'settings':
        return (
          <Settings
            user={session.user}
            setSession={setSession}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            voiceSpeed={voiceSpeed}
            setVoiceSpeed={setVoiceSpeed}
          />
        );
      default:
        return userRole === 'caregiver' ? <CaregiverDashboard lang={lang} /> : <ElderlyDashboard user={session.user} lang={lang} voiceSpeed={voiceSpeed} />;
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-[#f5f5f5] dark:bg-[#0f0f0f] text-neutral-900 dark:text-white transition-colors duration-200">
      {/* Top Navigation Header */}
      <header className="bg-white dark:bg-[#121212] text-neutral-900 dark:text-white p-4 sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight uppercase text-[#16a34a] dark:text-white">{t.title}</span>
          <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider hidden sm:inline-block">
            {userRole === 'caregiver' ? 'Caregiver Portal' : 'Patient Portal'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-md font-bold hidden md:inline">{session.user?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-extrabold rounded-xl border border-neutral-300 dark:border-transparent text-sm shadow-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="container mx-auto px-4 py-6">
        {renderPage()}
      </main>

      {/* Bottom Sticky Accessible Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] border-t border-neutral-200 dark:border-neutral-800 p-3 z-40 flex justify-around shadow-lg">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
            currentPage === 'dashboard' 
              ? 'bg-[#16a34a] border-[#16a34a] text-white font-black shadow-sm scale-105' 
              : 'border-transparent text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Home className="w-8 h-8" />
          <span className="text-sm mt-1">{t.dashboard}</span>
        </button>

        <button
          onClick={() => setCurrentPage('medicines')}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
            currentPage === 'medicines' 
              ? 'bg-[#16a34a] border-[#16a34a] text-white font-black shadow-sm scale-105' 
              : 'border-transparent text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Pill className="w-8 h-8" />
          <span className="text-sm mt-1">{lang === 'es' ? 'Medicinas' : lang === 'hi' ? 'दवाइयां' : 'Medicines'}</span>
        </button>

        {userRole === 'elderly' && (
          <>
            <button
              onClick={() => setCurrentPage('chatbot')}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                currentPage === 'chatbot' 
                  ? 'bg-[#16a34a] border-[#16a34a] text-white font-black shadow-sm scale-105' 
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Sparkles className="w-8 h-8" />
              <span className="text-sm mt-1">AI Chat</span>
            </button>

            <button
              onClick={() => setCurrentPage('analyzer')}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
                currentPage === 'analyzer' 
                  ? 'bg-[#16a34a] border-[#16a34a] text-white font-black shadow-sm scale-105' 
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Brain className="w-8 h-8" />
              <span className="text-sm mt-1">AI Analyzer</span>
            </button>
          </>
        )}

        <button
          onClick={() => setCurrentPage('settings')}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${
            currentPage === 'settings' 
              ? 'bg-[#16a34a] border-[#16a34a] text-white font-black shadow-sm scale-105' 
              : 'border-transparent text-neutral-500 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <SettingsIcon className="w-8 h-8" />
          <span className="text-sm mt-1">{t.settings}</span>
        </button>
      </nav>

      {/* Voice Recognition Floating Assistant (Elderly specific overlay) */}
      {userRole === 'elderly' && session.user?.voiceAssistantActive !== false && (
        <VoiceAssistant
          lang={lang}
          onCommand={handleVoiceCommand}
          voiceSpeed={voiceSpeed}
        />
      )}
    </div>
  );
};

export default App;
