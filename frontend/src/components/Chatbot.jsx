import React, { useState, useEffect, useRef } from 'react';
import { Send, Volume2, Mic, MicOff, AlertCircle } from 'lucide-react';
import { aiAPI } from '../services/api';
import { speak, getSpeechRecognition } from '../services/voiceService';
import { translations } from '../services/translations';

const Chatbot = ({ lang = 'en', voiceSpeed = 0.85 }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 
        lang === 'es' 
          ? '¡Hola! Soy tu asistente MediCare AI. ¿Tienes alguna pregunta sobre tus dosis de medicina o cómo te sientes hoy?' 
          : lang === 'hi'
          ? 'नमस्ते! मैं आपका मेडीकेयर एआई सहायक हूँ। क्या आपके पास दवा की खुराक या आज कैसा महसूस कर रहे हैं, इस बारे में कोई प्रश्न है?'
          : 'Hello! I am your MediCare AI assistant. Do you have any questions about your medicine doses, food rules, or how you are feeling today?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const rec = getSpeechRecognition();
    if (rec) {
      rec.onstart = () => setIsListening(true);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputText('');
    setLoading(true);

    try {
      const data = await aiAPI.chat(userText);
      setMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
      
      // Auto-speak response for convenience
      speak(data.answer, lang, voiceSpeed);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errorMsg = 
        lang === 'es' 
          ? 'Lo siento, he tenido un problema de conexión. Consulta con tu médico o cuidador.'
          : lang === 'hi'
          ? 'क्षमा करें, कनेक्शन में कोई समस्या है। कृपया अपने डॉक्टर या केयरगिवर से संपर्क करें।'
          : 'I am sorry, I ran into a connection issue. Please consult your doctor or caregiver.';
      setMessages(prev => [...prev, { sender: 'ai', text: errorMsg }]);
      speak(errorMsg, lang, voiceSpeed);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (!recognition) {
      alert('Voice recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-3xl bg-white dark:bg-[#1f1f1f] overflow-hidden shadow-sm">
      {/* Title */}
      <div className="bg-white dark:bg-[#121212] text-neutral-900 dark:text-white p-4 font-black flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xl md:text-2xl">
          {lang === 'es' ? 'Chat Asistente IA' : lang === 'hi' ? 'एआई चैट सहायक' : 'MediCare AI Chat'}
        </span>
        <Volume2 className="w-6 h-6 text-[#16a34a] animate-pulse" />
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
              <p className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {msg.sender === 'ai' && (
                <button
                  onClick={() => speak(msg.text, lang, voiceSpeed)}
                  aria-label="Speak response"
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-[#121212] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-350 dark:border-neutral-750 rounded-xl font-bold text-sm transition-all"
                >
                  <Volume2 className="w-5 h-5 text-[#16a34a]" />
                  <span>{lang === 'es' ? 'Escuchar' : lang === 'hi' ? 'सुनें' : 'Read Aloud'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 italic text-neutral-500 dark:text-neutral-400 font-bold text-lg animate-pulse">
              {lang === 'es' ? 'Pensando...' : lang === 'hi' ? 'सोच रहा हूँ...' : 'MediCare AI is thinking...'}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-[#1f1f1f] border-t border-neutral-200 dark:border-neutral-800 flex gap-3 items-center">
        <button
          type="button"
          onClick={toggleMic}
          aria-label="Voice input"
          className={`p-4 rounded-2xl border shadow-sm transition-all ${
            isListening 
              ? 'bg-red-650 hover:bg-red-700 text-white animate-pulse border-transparent' 
              : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#121212] dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
          }`}
        >
          {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
        </button>

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
