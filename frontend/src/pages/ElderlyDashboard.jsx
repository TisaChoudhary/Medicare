import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, CloudOff, Wifi, Info, Brain } from 'lucide-react';
import { reminderAPI } from '../services/api';
import { speak } from '../services/voiceService';
import { offlineService } from '../services/offlineService';
import { translations } from '../services/translations';
import MedicineCard from '../components/MedicineCard';
import EmergencySOS from '../components/EmergencySOS';

const ElderlyDashboard = ({ user, lang = 'en', voiceSpeed = 0.85 }) => {
  const [reminders, setReminders] = useState([]);
  const [nextTimer, setNextTimer] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [healthInsights, setHealthInsights] = useState('');
  const [syncing, setSyncing] = useState(false);

  const t = translations[lang];

  // Fetch reminders logic with offline fallback
  const fetchReminders = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!navigator.onLine) {
      const cached = offlineService.getCachedReminders(todayStr);
      if (cached) {
        setReminders(cached);
      }
      return;
    }

    try {
      const data = await reminderAPI.getToday(todayStr);
      setReminders(data.reminders);
      
      // Save cache
      offlineService.saveReminders(todayStr, data.reminders);
    } catch (err) {
      console.error('Error fetching today reminders:', err);
      // fallback to cache
      const cached = offlineService.getCachedReminders(todayStr);
      if (cached) setReminders(cached);
    }
  };

  // Sync handler when coming online
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setSyncing(true);
      try {
        await offlineService.syncOfflineData(reminderAPI.updateStatus);
        await fetchReminders();
      } catch (err) {
        console.error(err);
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    fetchReminders();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vocal Greeting upon startup
  useEffect(() => {
    if (reminders.length > 0) {
      const pendingCount = reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length;
      
      let speechGreeting = '';
      if (lang === 'es') {
        speechGreeting = `Hola ${user.name}. Tienes ${pendingCount} medicamentos pendientes para hoy.`;
      } else if (lang === 'hi') {
        speechGreeting = `नमस्ते ${user.name}। आज आपके पास लेने के लिए ${pendingCount} दवाइयां बची हैं।`;
      } else {
        speechGreeting = `Hello ${user.name}. You have ${pendingCount} pending medications for today.`;
      }

      speak(speechGreeting, lang, voiceSpeed);
    }
  }, [reminders.length, lang]);

  // Live Timer for Next Medication
  useEffect(() => {
    const updateTimer = () => {
      if (reminders.length === 0) {
        setNextTimer('');
        return;
      }

      // Find first pending or snoozed reminder that is scheduled
      const now = new Date();
      const nowHours = now.getHours();
      const nowMins = now.getMinutes();
      const currentTimeVal = nowHours * 60 + nowMins;

      let nextReminder = null;
      let minDiff = Infinity;

      reminders.forEach(r => {
        if (r.status === 'pending' || r.status === 'snoozed') {
          const [h, m] = r.time.split(':').map(Number);
          const timeVal = h * 60 + m;
          
          // Compute differences
          let diff = timeVal - currentTimeVal;
          if (diff < 0) {
            // For next day, but keep in context of today's list ordering
            diff += 24 * 60;
          }
          
          if (diff < minDiff) {
            minDiff = diff;
            nextReminder = r;
          }
        }
      });

      if (nextReminder) {
        const hoursLeft = Math.floor(minDiff / 60);
        const minsLeft = minDiff % 60;
        
        let timerStr = '';
        if (hoursLeft > 0) {
          timerStr += `${hoursLeft}h `;
        }
        timerStr += `${minsLeft}m (${nextReminder.medicineId.name} at ${nextReminder.time})`;
        setNextTimer(timerStr);
      } else {
        setNextTimer(lang === 'es' ? 'Ninguna pendiente' : lang === 'hi' ? 'कोई बकाया नहीं' : 'All done for today!');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [reminders, lang]);

  const handleStatusChange = async (logId, status) => {
    // Optimistic UI update
    const updatedReminders = reminders.map(r => {
      if (r._id === logId) {
        return {
          ...r,
          status,
          takenAt: status === 'taken' ? new Date() : null,
          snoozeCount: status === 'snoozed' ? r.snoozeCount + 1 : r.snoozeCount
        };
      }
      return r;
    });
    setReminders(updatedReminders);

    const todayStr = new Date().toISOString().split('T')[0];
    offlineService.saveReminders(todayStr, updatedReminders);

    if (!navigator.onLine) {
      offlineService.queueStatusUpdate(logId, status);
      return;
    }

    try {
      await reminderAPI.updateStatus(logId, status);
      // Reload details to sync stock deduction
      fetchReminders();
    } catch (err) {
      console.error('Failed to update status on server, queueing offline:', err);
      offlineService.queueStatusUpdate(logId, status);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-4xl mx-auto">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="flex items-center gap-3 bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-white p-5 rounded-2xl font-bold text-lg md:text-xl">
          <CloudOff className="w-8 h-8 flex-shrink-0 text-red-500" />
          <span>{lang === 'es' ? 'Estás desconectado. Los cambios se guardarán localmente.' : lang === 'hi' ? 'आप ऑफलाइन हैं। जानकारी सुरक्षित रूप से सेव हो रही है।' : 'Offline mode. Changes are saved locally.'}</span>
        </div>
      )}

      {/* Syncing indicator */}
      {syncing && (
        <div className="flex items-center gap-3 bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 text-[#16a34a] p-5 rounded-2xl font-bold text-lg">
          <Wifi className="w-8 h-8 animate-bounce text-[#16a34a]" />
          <span>Syncing offline updates to cloud...</span>
        </div>
      )}

      {/* Top Header Card with Timer */}
      <div className="bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black">{lang === 'es' ? '¡Hola!' : lang === 'hi' ? 'नमस्ते!' : 'Welcome back,'} {user.name}</h2>
          <p className="text-lg font-bold text-[#16a34a] dark:text-[#16a34a] mt-1 flex items-center gap-1.5">
            <Volume2 className="w-5 h-5 animate-pulse text-[#16a34a]" />
            <span>{t.voiceCommandInfo}</span>
          </p>
        </div>
        
        {nextTimer && (
          <div className="bg-neutral-50 dark:bg-[#121212] px-6 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-extrabold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{t.nextDose}</p>
            <p className="text-xl md:text-2xl font-black text-[#16a34a]">{nextTimer}</p>
          </div>
        )}
      </div>

      {/* Daily Medicines list */}
      <div className="space-y-4">
        <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
          <span>{t.todayMeds}</span>
          <span className="text-sm bg-emerald-500/10 dark:bg-emerald-500/20 text-[#16a34a] px-3 py-1 rounded-full font-bold">
            {reminders.filter(r => r.status === 'taken').length} / {reminders.length}
          </span>
        </h3>

        {reminders.length === 0 ? (
          <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl p-10 text-center font-bold text-xl text-neutral-500 dark:text-neutral-400">
            <Info className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
            <p>{t.noMeds}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reminders.map((rem) => (
              <MedicineCard
                key={rem._id}
                reminder={rem}
                onStatusChange={handleStatusChange}
                lang={lang}
                voiceSpeed={voiceSpeed}
              />
            ))}
          </div>
        )}
      </div>

      {/* Emergency SOS widget */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <EmergencySOS lang={lang} voiceSpeed={voiceSpeed} />
      </div>
    </div>
  );
};

export default ElderlyDashboard;
