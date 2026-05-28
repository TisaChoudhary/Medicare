import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { sosAPI } from '../services/api';
import { speak } from '../services/voiceService';

const EmergencySOS = ({ lang = 'en', voiceSpeed = 0.85 }) => {
  const [isAlerting, setIsAlerting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [alertStatus, setAlertStatus] = useState(''); // '', 'triggering', 'sent', 'error'
  const countdownTimer = useRef(null);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);

  // Clean up timers and audio on unmount
  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      stopSiren();
    };
  }, []);

  // Siren Sound Generator using Web Audio API
  const startSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Pitch in Hz
      
      // Siren frequency modulation effect
      const now = ctx.currentTime;
      osc.frequency.linearRampToValueAtTime(880, now + 0.5);
      osc.frequency.linearRampToValueAtTime(440, now + 1.0);
      osc.frequency.loop = true;

      // Connect nodes
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime); // moderate volume

      osc.start();
      oscillatorRef.current = osc;

      // Periodically sweep the pitch to sound like an ambulance siren
      let toggle = false;
      const interval = setInterval(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          clearInterval(interval);
          return;
        }
        const time = audioCtxRef.current.currentTime;
        osc.frequency.cancelScheduledValues(time);
        osc.frequency.setValueAtTime(osc.frequency.value, time);
        osc.frequency.exponentialRampToValueAtTime(toggle ? 600 : 900, time + 0.4);
        toggle = !toggle;
      }, 500);

    } catch (e) {
      console.error('Failed to play synthetic siren audio:', e);
    }
  };

  const stopSiren = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.error('Error closing audio context:', e);
    }
  };

  const cancelSOS = () => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
    setIsAlerting(false);
    setAlertStatus('');
    stopSiren();

    const cancelSpeak = {
      en: "Emergency cancelled.",
      es: "Emergencia cancelada.",
      hi: "आपातकाल रद्द कर दिया गया।"
    };
    speak(cancelSpeak[lang] || cancelSpeak.en, lang, voiceSpeed);
  };

  const handleSOSClick = () => {
    if (isAlerting) return;

    setIsAlerting(true);
    setAlertStatus('triggering');
    setCountdown(3);

    // Speak initial count
    const initialText = {
      en: "Triggering SOS emergency in 3 seconds. Tap cancel to stop.",
      es: "Activando emergencia SOS en 3 segundos. Toque cancelar para detener.",
      hi: "तीन सेकंड में आपातकालीन अलार्म बज जाएगा। रोकने के लिए कैंसल दबाएं।"
    };
    speak(initialText[lang] || initialText.en, lang, voiceSpeed);

    let currentCount = 3;
    countdownTimer.current = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);

      if (currentCount > 0) {
        speak(String(currentCount), lang, voiceSpeed);
      } else {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        triggerFinalAlert();
      }
    }, 1000);
  };

  const triggerFinalAlert = () => {
    setCountdown(null);
    startSiren();

    const emergencyVoice = {
      en: "Sending emergency alert. Calling caregiver.",
      es: "Enviando alerta de emergencia. Llamando a su cuidador.",
      hi: "आपातकालीन चेतावनी भेजी जा रही है। केयरगिवर से संपर्क किया जा रहा है।"
    };
    speak(emergencyVoice[lang] || emergencyVoice.en, lang, voiceSpeed);

    // Get live coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          sendAlertToServer(latitude, longitude);
        },
        async (error) => {
          console.warn('Geolocation failed or permission denied:', error.message);
          // Send alert without coordinates if permission denied
          sendAlertToServer(null, null);
        }
      );
    } else {
      sendAlertToServer(null, null);
    }
  };

  const sendAlertToServer = async (lat, lng) => {
    try {
      await sosAPI.trigger(lat, lng);
      setAlertStatus('sent');
    } catch (err) {
      console.error('Failed to trigger SOS on server:', err.message);
      setAlertStatus('error');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {!isAlerting ? (
        <button
          onClick={handleSOSClick}
          className="w-full max-w-md h-36 md:h-44 rounded-3xl bg-red-650 hover:bg-red-700 text-white font-black text-2xl md:text-3xl border border-transparent flex flex-col items-center justify-center gap-2 shadow-lg transition-all active:scale-95 sos-pulse-animation"
        >
          <ShieldAlert className="w-12 md:w-16 h-12 md:h-16 text-white" />
          <span>
            {lang === 'es' ? 'EMERGENCIA SOS' : lang === 'hi' ? 'इमरजेंसी SOS' : 'EMERGENCY SOS'}
          </span>
        </button>
      ) : (
        <div className="w-full max-w-md bg-[#1f1f1f] border border-red-500 rounded-3xl p-6 text-center text-white shadow-md">
          <div className="animate-pulse flex justify-center mb-4 text-red-500">
            <ShieldAlert className="w-16 h-16" />
          </div>

          {countdown !== null ? (
            <div>
              <h3 className="text-3xl font-black mb-2 text-red-400">
                {lang === 'es' ? 'INICIANDO SOS' : lang === 'hi' ? 'SOS प्रारंभ हो रहा है' : 'STARTING SOS'}
              </h3>
              <p className="text-6xl font-black text-white">{countdown}</p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-black text-red-500 mb-2 uppercase animate-bounce">
                {lang === 'es' ? '¡SOS ACTIVADO!' : lang === 'hi' ? 'SOS सक्रिय है!' : 'SOS ACTIVATED!'}
              </h3>
              <p className="text-lg font-bold text-neutral-300">
                {alertStatus === 'sent' 
                  ? (lang === 'es' ? 'Ubicación enviada. Ayuda en camino.' : lang === 'hi' ? 'लोकेशन भेजी गई। सहायता आ रही है।' : 'Location sent. Help is on the way.')
                  : (lang === 'es' ? 'Enviando señal de ayuda...' : lang === 'hi' ? 'सहायता संकेत भेजा जा रहा है...' : 'Sending distress signal...')}
              </p>
            </div>
          )}

          <button
            onClick={cancelSOS}
            className="mt-6 w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-xl rounded-2xl border border-neutral-700 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
            <span>
              {lang === 'es' ? 'CANCELAR REMITENTE' : lang === 'hi' ? 'रद्द करें (Cancel)' : 'CANCEL ALARM'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EmergencySOS;
