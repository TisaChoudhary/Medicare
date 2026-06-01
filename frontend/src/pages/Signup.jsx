import React, { useState } from 'react';
import { UserPlus, User, Mail, Key, Phone, ShieldAlert } from 'lucide-react';
import { authAPI } from '../services/api';
import { translations } from '../services/translations';
import { speak } from '../services/voiceService';

const Signup = ({ setSession, lang = 'en', setLang, voiceSpeed = 0.85, onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('elderly'); // default
  const [phone, setPhone] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = translations[lang];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await authAPI.signup({
        name,
        email,
        password,
        role,
        phone,
        caregiverEmail: role === 'elderly' ? caregiverEmail : undefined,
        emergencyContactName: role === 'elderly' ? emergencyContactName : undefined,
        emergencyContactPhone: role === 'elderly' ? emergencyContactPhone : undefined,
      });

      localStorage.setItem('medicare_token', data.token);
      localStorage.setItem('medicare_user', JSON.stringify(data.user));

      const welcome = {
        en: `Welcome to MediCare AI, ${data.user.name}!`,
        es: `¡Bienvenido a MediCare AI, ${data.user.name}!`,
        hi: `मेडीकेयर एआई में आपका स्वागत है, ${data.user.name}!`
      };
      speak(welcome[lang] || welcome.en, lang, voiceSpeed);

      setSession({ token: data.token, user: data.user });
    } catch (err) {
      console.error(err);
      const failText = err.response?.data?.message || 'Registration failed. Please check inputs.';
      setErrorMsg(failText);
      speak(failText, lang, voiceSpeed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0f0f0f] flex flex-col justify-center items-center p-4 py-12">
      {/* Language Toggle */}
      <div className="mb-6 flex gap-3">
        {['en', 'hi'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-2 border font-bold rounded-xl text-md transition-all ${
              lang === l 
                ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                : 'bg-white dark:bg-[#1f1f1f] text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {l === 'en' ? 'English' : 'हिंदी'}
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-[#16a34a] dark:text-white uppercase tracking-tight">{t.signup}</h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 font-semibold mt-2">{t.slogan}</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 rounded-2xl font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role selector */}
          <div>
            <label className="block text-lg font-black text-neutral-900 dark:text-white mb-2">{t.role}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('elderly')}
                className={`py-3 font-extrabold text-lg border rounded-2xl transition-all ${
                  role === 'elderly' 
                    ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                    : 'bg-neutral-100 dark:bg-[#121212] text-neutral-700 dark:text-neutral-350 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {t.elderly}
              </button>
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`py-3 font-extrabold text-lg border rounded-2xl transition-all ${
                  role === 'caregiver' 
                    ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                    : 'bg-neutral-100 dark:bg-[#121212] text-neutral-700 dark:text-neutral-350 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {t.caregiver}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-lg font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-[#16a34a]" />
              <span>{t.name}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-md font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-lg font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#16a34a]" />
              <span>{t.email}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-md font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="e.g. john@email.com"
            />
          </div>

          <div>
            <label className="block text-lg font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#16a34a]" />
              <span>{t.password}</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-md font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-lg font-black text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#16a34a]" />
              <span>{t.phone}</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-md font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="e.g. +1 234 567 890"
            />
          </div>

          {/* Elderly specific fields */}
          {role === 'elderly' && (
            <div className="space-y-4 border border-dashed border-neutral-300 dark:border-neutral-700 p-4 rounded-2xl bg-neutral-50 dark:bg-[#121212]">
              <h3 className="font-extrabold text-md text-[#16a34a] flex items-center gap-1">
                <ShieldAlert className="w-5 h-5" />
                <span>Elderly Settings (Care & SOS)</span>
              </h3>
              
              <div>
                <label className="block text-md font-bold text-neutral-800 dark:text-neutral-355 mb-1">{t.caregiverEmail}</label>
                <input
                  type="email"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  className="w-full p-3 border border-neutral-350 dark:border-neutral-700 rounded-xl text-md font-semibold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                  placeholder="caregiver@email.com"
                />
              </div>

              <div>
                <label className="block text-md font-bold text-neutral-800 dark:text-neutral-355 mb-1">{t.emergencyContactName}</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full p-3 border border-neutral-350 dark:border-neutral-700 rounded-xl text-md font-semibold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                  placeholder="e.g. Daughter"
                />
              </div>

              <div>
                <label className="block text-md font-bold text-neutral-800 dark:text-neutral-355 mb-1">{t.emergencyContactPhone}</label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full p-3 border border-neutral-350 dark:border-neutral-700 rounded-xl text-md font-semibold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                  placeholder="e.g. +1 555 1234"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-elderly py-5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-2xl rounded-3xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-6 h-6" />
            <span>{loading ? '...' : t.signup}</span>
          </button>
        </form>

        <div className="mt-8 text-center border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <button
            onClick={() => onNavigate('login')}
            className="text-lg md:text-xl font-black text-[#16a34a] hover:text-[#15803d] dark:text-[#16a34a] underline"
          >
            {t.hasAccount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
