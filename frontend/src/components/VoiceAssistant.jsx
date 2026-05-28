import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { getSpeechRecognition, parseCommand, speak } from '../services/voiceService';

const VoiceAssistant = ({ lang = 'en', onCommand, voiceSpeed = 0.85 }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');

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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center">
      {isListening && (
        <div className="mb-4 bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white px-6 py-4 rounded-2xl shadow-md border border-neutral-200 dark:border-neutral-800 font-bold max-w-sm text-center animate-bounce">
          <p className="text-xl md:text-2xl text-[#16a34a]">
            {lang === 'es' ? 'Escuchando...' : lang === 'hi' ? 'सुन रहे हैं...' : 'Listening...'}
          </p>
          <p className="text-sm mt-1 text-neutral-500 dark:text-neutral-400 font-medium">
            {getInstructions()}
          </p>
          {transcriptText && (
            <p className="text-md mt-2 text-[#16a34a] italic">"{transcriptText}"</p>
          )}
        </div>
      )}
      <button
        onClick={toggleListening}
        aria-label="Voice Assistant"
        className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
          isListening 
            ? 'bg-red-600 animate-pulse' 
            : 'bg-[#16a34a] hover:bg-[#15803d]'
        }`}
      >
        {isListening ? (
          <Mic className="w-10 h-10 md:w-12 md:h-12" />
        ) : (
          <MicOff className="w-10 h-10 md:w-12 md:h-12" />
        )}
      </button>
      <span className="mt-2 text-xs md:text-sm font-bold bg-neutral-900 dark:bg-[#1f1f1f] text-white px-3 py-1 rounded-full shadow-sm opacity-80 select-none">
        {lang === 'es' ? 'Asistente de Voz' : lang === 'hi' ? 'आवाज सहायक' : 'Voice Assistant'}
      </span>
    </div>
  );
};

export default VoiceAssistant;
