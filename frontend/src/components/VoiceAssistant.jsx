import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { getSpeechRecognition, parseCommand, speak } from '../services/voiceService';

const VoiceAssistant = ({ lang = 'en', onCommand, voiceSpeed = 0.85 }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [showControlCard, setShowControlCard] = useState(false);
  
  const shouldRestartRef = useRef(false);

  // Sync ref with continuousMode state
  useEffect(() => {
    shouldRestartRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    const rec = getSpeechRecognition();
    if (rec) {
      rec.onstart = () => {
        setIsListening(true);
        setTranscriptText('');
      };
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscriptText(transcript);
        
        // Speak feedback of what was heard
        const langFeedback = {
          en: `You said: ${transcript}`,
          es: `Dijiste: ${transcript}`,
          hi: `आपने कहा: ${transcript}`
        };
        speak(langFeedback[lang] || langFeedback.en, lang, voiceSpeed);

        const parsed = parseCommand(transcript, lang);
        if (parsed.command !== 'UNKNOWN') {
          setTimeout(() => {
            onCommand(parsed.command, parsed.text);
          }, 1500);
        } else {
          // If unknown, prompt again or notify
          const errorPrompt = {
            en: "Sorry, I didn't recognize that command. Try 'show medicines', 'did I take medicine' or 'call caregiver'.",
            es: "Lo siento, no reconocí ese comando. Intente 'mostrar medicina', 'ya tomé mi medicina' o 'llamar cuidador'.",
            hi: "क्षमा करें, मुझे यह समझ नहीं आया। 'दवा दिखाओ', 'क्या मैंने दवा ली' या 'सहायता' बोलें।"
          };
          setTimeout(() => {
            speak(errorPrompt[lang] || errorPrompt.en, lang, voiceSpeed);
          }, 1500);
        }
      };
      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
        // Auto-restart if continuous mode is enabled
        if (shouldRestartRef.current) {
          setTimeout(() => {
            try {
              rec.start();
            } catch (e) {
              console.error('Error auto-restarting recognition:', e);
            }
          }, 500);
        }
      };
      setRecognition(rec);
    }
  }, [lang, onCommand, voiceSpeed]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      shouldRestartRef.current = false;
      setContinuousMode(false);
      recognition.stop();
    } else {
      // Voice greeting
      const greeting = {
        en: "How can I help you?",
        es: "¿Cómo puedo ayudarle?",
        hi: "मैं आपकी क्या मदद कर सकता हूँ?"
      };
      speak(greeting[lang] || greeting.en, lang, voiceSpeed);
      
      // Delay listening slightly until synthesis finishes
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error starting recognition:', e);
        }
      }, 1200);
    }
  };

  const getInstructions = () => {
    if (lang === 'es') return "Diga: 'mostrar medicina', 'ya tomé mi medicina', 'llamar cuidador'";
    if (lang === 'hi') return "बोलें: 'दवा दिखाओ', 'क्या मैंने दवा ली', 'मदद करो'";
    return "Say: 'show medicines', 'did I take medicine', 'call caregiver'";
  };

  const handleToggleCard = () => {
    const nextShow = !showControlCard;
    setShowControlCard(nextShow);
    if (nextShow && !isListening) {
      toggleListening();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Voice Control Panel Overlay */}
      {showControlCard && (
        <div className="mb-4 bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white px-5 py-5 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 font-bold w-72 md:w-80 text-center space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <span className="text-md font-black text-neutral-900 dark:text-white">Voice Assistant</span>
            <button 
              onClick={() => setShowControlCard(false)}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={toggleListening}
            className={`w-full py-3.5 rounded-2xl text-md font-extrabold transition-all border flex items-center justify-center gap-2 ${
              isListening
                ? 'bg-red-500/10 text-red-600 border-red-500 hover:bg-red-500/20'
                : 'bg-[#16a34a] hover:bg-[#15803d] text-white border-transparent'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Start Listening</span>
              </>
            )}
          </button>

          <div className="space-y-2">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-black uppercase tracking-wider">
              {isListening ? 'Listening active' : 'Microphone paused'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
              {getInstructions()}
            </p>
            {transcriptText && (
              <div className="p-2.5 bg-neutral-50 dark:bg-[#121212] border border-neutral-100 dark:border-neutral-800 rounded-xl">
                <p className="text-sm text-[#16a34a] italic">"{transcriptText}"</p>
              </div>
            )}
          </div>
          
          {/* Continuous Mode Toggle */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">
              Keep Active (Continuous)
            </span>
            <button
              onClick={() => {
                const nextMode = !continuousMode;
                setContinuousMode(nextMode);
                if (nextMode && !isListening) {
                  toggleListening();
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                continuousMode
                  ? 'bg-[#16a34a] text-white border-transparent'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {continuousMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Button */}
      <button
        onClick={handleToggleCard}
        aria-label="Voice Assistant Panel"
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
          isListening 
            ? 'bg-red-600 animate-pulse' 
            : 'bg-[#16a34a] hover:bg-[#15803d]'
        }`}
      >
        {isListening ? (
          <Mic className="w-8 h-8 md:w-10 h-10" />
        ) : (
          <MicOff className="w-8 h-8 md:w-10 h-10" />
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
