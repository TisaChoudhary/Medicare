import React, { useState } from 'react';
import { LogIn, Key, Mail } from 'lucide-react';
import { authAPI } from '../services/api';
import { translations } from '../services/translations';

const Login = ({ setSession, lang = 'en', setLang, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = translations[lang];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem('medicare_token', data.token);
      localStorage.setItem('medicare_user', JSON.stringify(data.user));
      
      // Pass session state up
      setSession({ token: data.token, user: data.user });
    } catch (err) {
      console.error(err);
      const failText = err.response?.data?.message || 'Login failed. Please check credentials.';
      setErrorMsg(failText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0f0f0f] flex flex-col justify-center items-center p-4">
      {/* Language Toggle on top */}
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
          <h1 className="text-4xl md:text-5xl font-black text-[#16a34a] dark:text-white uppercase tracking-tight">{t.title}</h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 font-semibold mt-2">{t.slogan}</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 rounded-2xl font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-lg font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="e.g. name@email.com"
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
              className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-lg font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-elderly py-5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-2xl rounded-3xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-6 h-6" />
            <span>{loading ? '...' : t.login}</span>
          </button>
        </form>

        <div className="mt-8 text-center border-t border-neutral-200 dark:border-neutral-800 pt-6">
          <button
            onClick={() => onNavigate('signup')}
            className="text-lg md:text-xl font-black text-[#16a34a] hover:text-[#15803d] dark:text-[#16a34a] underline"
          >
            {t.noAccount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
