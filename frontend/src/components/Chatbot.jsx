import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { aiAPI } from '../services/api';
import { translations } from '../services/translations';

const TypewriterText = ({ text, speed = 15, onCharTyped }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const next = prev + text.charAt(index);
        index++;
        if (index >= text.length) {
          clearInterval(interval);
        }
        if (onCharTyped) {
          onCharTyped();
        }
        return next;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

const Chatbot = ({ lang = 'en' }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 
        lang === 'hi'
          ? 'नमस्ते! मैं आपका मेडीकेयर एआई सहायक हूँ। क्या आपके पास दवा की खुराक या आज कैसा महसूस कर रहे हैं, इस बारे में कोई प्रश्न है?'
          : 'Hello! I am your MediCare AI assistant. Do you have any questions about your medicine doses, food rules, or how you are feeling today?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputText('');
    setLoading(true);

    try {
      const data = await aiAPI.chat(userText, lang);
      setMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMsg = 
        lang === 'hi'
          ? 'क्षमा करें, कनेक्शन में कोई समस्या है। कृपया अपने डॉक्टर या केयरगिवर से संपर्क करें।'
          : 'I am sorry, I ran into a connection issue. Please consult your doctor or caregiver.';
      setMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-[#1f1f1f] overflow-hidden shadow-sm">
      {/* Title */}
      <div className="bg-white dark:bg-[#121212] text-neutral-900 dark:text-white p-4 font-black flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xl md:text-2xl">
          {lang === 'hi' ? 'एआई चैट सहायक' : 'MediCare AI Chat'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-[#121212]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 border shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#16a34a] text-white border-transparent font-bold'
                  : 'bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-800 font-semibold'
              }`}
            >
              <p className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap">
                {index === messages.length - 1 && msg.sender === 'ai' ? (
                  <TypewriterText text={msg.text} onCharTyped={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })} />
                ) : (
                  msg.text
                )}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 italic text-neutral-500 dark:text-neutral-400 font-bold text-lg animate-pulse">
              {lang === 'hi' ? 'सोच रहा हूँ...' : 'MediCare AI is thinking...'}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-[#1f1f1f] border-t border-neutral-200 dark:border-neutral-800 flex gap-3 items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={translations[lang].askPlaceholder}
          className="flex-1 p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl text-lg md:text-xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-lg rounded-2xl border border-transparent shadow-sm disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all"
        >
          <Send className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
