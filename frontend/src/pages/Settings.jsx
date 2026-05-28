import React, { useState } from 'react';
import { Settings as SettingsIcon, Languages, SunMoon, Volume2, Save, UserCheck, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { translations } from '../services/translations';
import { speak } from '../services/voiceService';

const Settings = ({ user, setSession, lang = 'en', setLang, darkMode, setDarkMode, voiceSpeed, setVoiceSpeed }) => {
  const [phone, setPhone] = useState(user.phone || '');
  const [caregiverEmail, setCaregiverEmail] = useState(user.caregiverId?.email || '');
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone || '');
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(user.voiceAssistantActive !== false);
  
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
      const data = await authAPI.updatePreferences({
        language: lang,
        theme: darkMode ? 'dark' : 'light',
        phone,
        caregiverEmail: user.role === 'elderly' ? caregiverEmail : undefined,
        emergencyContactName: user.role === 'elderly' ? emergencyContactName : undefined,
        emergencyContactPhone: user.role === 'elderly' ? emergencyContactPhone : undefined,
        voiceAssistantActive
      });

      // Update local storage and session state
      const updatedUser = {
        ...user,
        phone: data.user.phone,
        caregiverId: data.user.caregiverId,
        emergencyContactName: data.user.emergencyContactName,
        emergencyContactPhone: data.user.emergencyContactPhone,
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
          <div className="grid grid-cols-3 gap-2">
            {['en', 'es', 'hi'].map((l) => (
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
                {l === 'en' ? 'English' : l === 'es' ? 'Español' : 'हिंदी'}
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
            <span>{lang === 'es' ? 'Asistente de Voz' : lang === 'hi' ? 'आवाज सहायक' : 'Voice Assistant'}</span>
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
              {lang === 'es' ? 'ACTIVADO' : lang === 'hi' ? 'चालू' : 'ON (Enabled)'}
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
              {lang === 'es' ? 'DESACTIVADO' : lang === 'hi' ? 'बंद' : 'OFF (Disabled)'}
            </button>
          </div>
        </div>

        {/* Emergency Contacts Widget */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#16a34a]" />
            <span>{lang === 'es' ? 'Contactos & Enlaces' : lang === 'hi' ? 'संपर्क और कनेक्शन' : 'Emergency Contacts & Connections'}</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500"
              />
            </div>

            {user.role === 'elderly' && (
              <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <div>
                  <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.caregiverEmail}</label>
                  <input
                    type="email"
                    value={caregiverEmail}
                    onChange={(e) => setCaregiverEmail(e.target.value)}
                    className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.emergencyContactName}</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t.emergencyContactPhone}</label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
