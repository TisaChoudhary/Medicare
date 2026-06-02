import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Languages, SunMoon, Volume2, Save, UserCheck, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { translations } from '../services/translations';
import { speak } from '../services/voiceService';

const Settings = ({ user, setSession, lang = 'en', setLang, darkMode, setDarkMode, voiceSpeed, setVoiceSpeed }) => {
  const [phone, setPhone] = useState(user.phone || '');
  const [caregiverEmail, setCaregiverEmail] = useState(user.caregiverId?.email || '');
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    if (Array.isArray(user.emergencyContacts) && user.emergencyContacts.length > 0) {
      return user.emergencyContacts.map(c => ({ name: c.name || '', phone: c.phone || '' }));
    }
    if (user.emergencyContactName || user.emergencyContactPhone) {
      return [{ name: user.emergencyContactName || '', phone: user.emergencyContactPhone || '' }];
    }
    return [{ name: '', phone: '' }];
  });
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(user.voiceAssistantActive !== false);
  
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(localStorage.getItem('medicare_voice_name') || '');

  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const t = translations[lang];

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const filteredContacts = emergencyContacts.filter(c => c.name.trim() !== '' || c.phone.trim() !== '');
      const data = await authAPI.updatePreferences({
        language: lang,
        theme: darkMode ? 'dark' : 'light',
        phone,
        caregiverEmail: user.role === 'elderly' ? caregiverEmail : undefined,
        emergencyContacts: user.role === 'elderly' ? filteredContacts : undefined,
        voiceAssistantActive
      });

      // Update local storage and session state
      const updatedUser = {
        ...user,
        phone: data.user.phone,
        caregiverId: data.user.caregiverId,
        emergencyContactName: data.user.emergencyContactName,
        emergencyContactPhone: data.user.emergencyContactPhone,
        emergencyContacts: data.user.emergencyContacts || [],
        language: data.user.language,
        theme: data.user.theme,
        voiceAssistantActive: data.user.voiceAssistantActive
      };

      localStorage.setItem('medicare_user', JSON.stringify(updatedUser));
      localStorage.setItem('medicare_voice_assistant', updatedUser.voiceAssistantActive ? 'on' : 'off');
      setSession(prev => ({ ...prev, user: updatedUser }));

      setSuccessMsg('Settings saved successfully!');
      // Only speak if active
      if (voiceAssistantActive) {
        speak('Settings saved successfully.', lang, voiceSpeed);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-3xl mx-auto">
      {/* Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-4xl font-black text-neutral-900 dark:text-white uppercase flex items-center gap-2">
          <SettingsIcon className="w-9 h-9 text-[#16a34a]" />
          <span>{t.settings}</span>
        </h1>
        <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400 mt-1">Configure language, visual themes, voice helper speed, and emergency contacts.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 rounded-2xl font-bold text-center">{errorMsg}</div>}
        {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-[#16a34a] rounded-2xl font-bold text-center">{successMsg}</div>}

        {/* Translation Preferences */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Languages className="w-6 h-6 text-[#16a34a]" />
            <span>{t.language}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {['en', 'hi'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`py-4 border font-black rounded-xl text-lg transition-all ${
                  lang === l 
                    ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                    : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {l === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <SunMoon className="w-6 h-6 text-[#16a34a]" />
            <span>{t.theme}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDarkMode(false)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                !darkMode 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {t.light}
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                darkMode 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {t.dark}
            </button>
          </div>
        </div>

        {/* Voice Rate Preferences */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-[#16a34a]" />
            <span>{t.voiceSpeed}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVoiceSpeed(0.65)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                voiceSpeed === 0.65 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {t.slow}
            </button>
            <button
              type="button"
              onClick={() => setVoiceSpeed(0.85)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                voiceSpeed === 0.85 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {t.normal}
            </button>
          </div>
        </div>

        {/* Voice Assistant Toggle */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-[#16a34a]" />
            <span>{lang === 'hi' ? 'आवाज सहायक' : 'Voice Assistant'}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVoiceAssistantActive(true)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                voiceAssistantActive 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {lang === 'hi' ? 'चालू' : 'ON (Enabled)'}
            </button>
            <button
              type="button"
              onClick={() => setVoiceAssistantActive(false)}
              className={`py-4 border font-black rounded-xl text-lg transition-all ${
                !voiceAssistantActive 
                  ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                  : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {lang === 'hi' ? 'बंद' : 'OFF (Disabled)'}
            </button>
          </div>
        </div>

        {/* Custom Voice Selection */}
        {voiceAssistantActive && voices.length > 0 && (
          <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-[#16a34a]" />
              <span>{lang === 'hi' ? 'आवाज टोन / स्पीकर' : 'Voice Speaker Tone'}</span>
            </h2>
            <div>
              <label className="block text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-2">
                {lang === 'hi' ? 'उपलब्ध आवाजें चुनें (आपके डिवाइस से):' : 'Select a voice speaker from your device:'}
              </label>
              <select
                value={selectedVoiceName}
                onChange={(e) => {
                  setSelectedVoiceName(e.target.value);
                  localStorage.setItem('medicare_voice_name', e.target.value);
                }}
                className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] text-lg animate-fade-in"
              >
                <option value="">{lang === 'hi' ? 'सिस्टम डिफ़ॉल्ट आवाज' : 'System Default Voice'}</option>
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Emergency Contacts Widget */}
        {user.role === 'elderly' && (
          <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-105 dark:border-neutral-850 pb-3">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-[#16a34a]" />
                <span>{lang === 'hi' ? 'आपातकालीन संपर्क' : 'Emergency Contacts'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEmergencyContacts([...emergencyContacts, { name: '', phone: '' }])}
                className="px-4 py-2 bg-[#16a34a]/10 hover:bg-[#16a34a]/20 text-[#16a34a] font-extrabold text-sm rounded-xl transition-all border border-emerald-500/20 cursor-pointer"
              >
                {lang === 'hi' ? '+ नया संपर्क जोड़ें' : '+ Add Contact'}
              </button>
            </div>

            <div className="space-y-6">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="relative p-5 border border-neutral-150 dark:border-neutral-850 rounded-2xl bg-neutral-50/50 dark:bg-[#181818]/30 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-neutral-450 uppercase tracking-widest">
                      {lang === 'hi' ? `संपर्क ${index + 1}` : `Contact ${index + 1}`}
                    </span>
                    {emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 font-extrabold text-sm cursor-pointer"
                      >
                        {lang === 'hi' ? 'हटाएं' : 'Remove'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.emergencyContactName}</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => {
                          const updated = [...emergencyContacts];
                          updated[index].name = e.target.value;
                          setEmergencyContacts(updated);
                        }}
                        className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                        placeholder={lang === 'hi' ? 'नाम लिखें' : 'Enter name'}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.emergencyContactPhone}</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => {
                          const updated = [...emergencyContacts];
                          updated[index].phone = e.target.value;
                          setEmergencyContacts(updated);
                        }}
                        className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                        placeholder={lang === 'hi' ? 'फ़ोन नंबर लिखें' : 'Enter phone number'}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-elderly py-5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-2xl border border-transparent rounded-3xl transition-all"
        >
          <Save className="w-6 h-6" />
          <span>{loading ? '...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
};

export default Settings;
