import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, CloudOff, Wifi, Info, Brain, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { reminderAPI } from '../services/api';
import { speak } from '../services/voiceService';
import { offlineService } from '../services/offlineService';
import { translations } from '../services/translations';
import MedicineCard from '../components/MedicineCard';

const ElderlyDashboard = ({ user, lang = 'en', voiceSpeed = 0.85 }) => {
  const [reminders, setReminders] = useState([]);
  const [nextTimer, setNextTimer] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [healthInsights, setHealthInsights] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState([]);

  const t = translations[lang];

  // Request notifications permission and update FCM token
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          reminderAPI.saveFcmToken('mock_fcm_token_patient_' + user._id)
            .catch(err => console.error('Failed to save mock FCM token:', err));
        }
      });
    }
  }, [user._id]);

  // Poll for due notifications
  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const data = await reminderAPI.getNotifications();
        if (data.success && data.notifications.length > 0) {
          // Find which notifications are new (not already in activeNotifications)
          const newNotifications = data.notifications.filter(
            n => !activeNotifications.some(existing => existing._id === n._id)
          );

          if (newNotifications.length > 0) {
            newNotifications.forEach(n => {
              const medName = n.medicineId?.name || 'Medication';
              const medDosage = n.medicineId?.dosage || '1 dose';
              const title = `💊 Medicine Reminder`;
              const body = `Time to take: ${medName} - Dosage: ${medDosage}`;

              // Trigger system notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(title, {
                  body: body,
                  icon: '/vite.svg',
                  tag: n._id
                });
                notification.onclick = () => {
                  window.focus();
                };
              }

              // Speak text alert
              const alertText = `Reminder: Time to take your medicine, ${medName}. Dosage is ${medDosage}.`;
              speak(alertText, lang, voiceSpeed);
            });

            setActiveNotifications(data.notifications);
          }
        } else {
          setActiveNotifications([]);
        }
      } catch (err) {
        console.error('Error polling notifications:', err);
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [activeNotifications, lang, voiceSpeed]);

  const handleNotificationAction = async (logId, action) => {
    try {
      await reminderAPI.postAction(logId, action);
      setActiveNotifications(prev => prev.filter(n => n._id !== logId));
      fetchReminders();
      
      if (action === 'taken') {
        speak('Medicine marked as taken.', lang, voiceSpeed);
      } else {
        speak('Medicine snoozed for 10 minutes.', lang, voiceSpeed);
      }
    } catch (err) {
      console.error('Failed to handle notification action:', err);
    }
  };

  const slotNames = {
    en: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' },
    es: { morning: 'Mañana', afternoon: 'Tarde', evening: 'Tarde/Noche', night: 'Noche' },
    hi: { morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम', night: 'रात' }
  };

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

  const triggerAudioBriefing = () => {
    const total = reminders.length;
    const taken = reminders.filter(r => r.status === 'taken').length;
    const pending = reminders.filter(r => r.status === 'pending' || r.status === 'snoozed');

    let brief = '';
    if (lang === 'es') {
      if (total === 0) {
        brief = "No tienes medicamentos programados para hoy.";
      } else {
        brief = `Has tomado ${taken} de un total de ${total} medicamentos hoy. `;
        if (pending.length === 0) {
          brief += "¡Buen trabajo! Has terminado por hoy.";
        } else {
          brief += `Te quedan ${pending.length} dosis pendientes. Tu próxima dosis es ${pending[0].medicineId.name} a las ${pending[0].time}.`;
        }
      }
    } else if (lang === 'hi') {
      if (total === 0) {
        brief = "आज आपकी कोई दवा निर्धारित नहीं है।";
      } else {
        brief = `आपने आज ${total} में से ${taken} दवाइयां ले ली हैं। `;
        if (pending.length === 0) {
          brief += "बहुत बढ़िया! आज का काम पूरा हो गया।";
        } else {
          brief += `आपकी ${pending.length} खुराकें बची हैं। अगली दवा ${pending[0].medicineId.name} है, जिसे ${pending[0].time} बजे लेना है।`;
        }
      }
    } else {
      if (total === 0) {
        brief = "You have no medications scheduled for today.";
      } else {
        brief = `You have taken ${taken} out of ${total} medications today. `;
        if (pending.length === 0) {
          brief += "Excellent job! You are all done for today.";
        } else {
          brief += `You have ${pending.length} pending doses remaining. Your next scheduled dose is ${pending[0].medicineId.name} at ${pending[0].time}.`;
        }
      }
    }

    speak(brief, lang, voiceSpeed);
  };

  // Group reminders by slot
  const morningReminders = reminders.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 5 && hour < 12;
  });
  const afternoonReminders = reminders.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 12 && hour < 17;
  });
  const eveningReminders = reminders.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 17 && hour < 21;
  });
  const nightReminders = reminders.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 21 || hour < 5;
  });

  const timeSlots = [
    { id: 'morning', title: slotNames[lang]?.morning || 'Morning', icon: <Sunrise className="w-5 h-5 text-amber-500" />, items: morningReminders },
    { id: 'afternoon', title: slotNames[lang]?.afternoon || 'Afternoon', icon: <Sun className="w-5 h-5 text-orange-500" />, items: afternoonReminders },
    { id: 'evening', title: slotNames[lang]?.evening || 'Evening', icon: <Sunset className="w-5 h-5 text-indigo-500" />, items: eveningReminders },
    { id: 'night', title: slotNames[lang]?.night || 'Night', icon: <Moon className="w-5 h-5 text-blue-500" />, items: nightReminders },
  ];

  const total = reminders.length;
  const taken = reminders.filter(r => r.status === 'taken').length;
  const missed = reminders.filter(r => r.status === 'missed').length;
  const upcoming = reminders.filter(r => r.status === 'pending' || r.status === 'snoozed').length;
  const percent = total > 0 ? Math.round((taken / total) * 100) : 0;

  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-4xl mx-auto">
      {/* Active Notification Banner alerts */}
      {activeNotifications.length > 0 && (
        <div className="space-y-4">
          {activeNotifications.map(notif => (
            <div 
              key={notif._id}
              className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-500/50 rounded-3xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse"
            >
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl shadow-sm shrink-0">
                  💊
                </div>
                <div>
                  <h4 className="text-2xl font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight">Medicine Reminder</h4>
                  <p className="text-lg font-bold text-neutral-850 dark:text-neutral-250 mt-1">
                    Time to take: <strong className="text-amber-600 dark:text-amber-300 font-extrabold">{notif.medicineId?.name}</strong> (Dosage: {notif.medicineId?.dosage})
                  </p>
                  <p className="text-sm font-bold text-neutral-500 dark:text-neutral-450 mt-0.5">Scheduled at: {notif.time}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleNotificationAction(notif._id, 'taken')}
                  className="flex-1 md:flex-none px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Mark as Taken
                </button>
                <button
                  onClick={() => handleNotificationAction(notif._id, 'snooze')}
                  className="flex-1 md:flex-none px-6 py-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-lg rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Snooze 10 Min
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="flex items-center gap-3 bg-neutral-100 dark:bg-[#1f1f1f] border border-neutral-350 dark:border-neutral-700 text-neutral-800 dark:text-white p-5 rounded-2xl font-bold text-lg md:text-xl">
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

      {/* Top Header Card with Circular Progress and Timer */}
      <div className="bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white rounded-3xl p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-6 relative overflow-hidden">
        {/* Decorative subtle background gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex-1 flex flex-col justify-between space-y-6 z-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">{lang === 'es' ? '¡Hola!' : lang === 'hi' ? 'नमस्ते!' : 'Welcome back,'} <span className="text-[#16a34a]">{user.name}</span></h2>
            <p className="text-md font-bold text-neutral-500 dark:text-neutral-450 mt-1.5 flex items-center gap-1.5">
              <Volume2 className="w-5 h-5 text-[#16a34a] shrink-0" />
              <span>{t.voiceCommandInfo}</span>
            </p>
          </div>

          <button
            onClick={triggerAudioBriefing}
            className="self-start flex items-center gap-2 px-5 py-3 bg-[#16a34a]/10 hover:bg-[#16a34a]/20 text-[#16a34a] font-extrabold rounded-2xl transition-all shadow-sm group border border-emerald-500/20"
          >
            <Volume2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>{lang === 'es' ? 'Escuchar informe diario' : lang === 'hi' ? 'दैनिक विवरण सुनें' : 'Listen to Daily Briefing'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 z-10">
          {/* Radial progress ring */}
          <div className="flex items-center gap-4 bg-neutral-50 dark:bg-[#121212] p-4 rounded-3xl border border-neutral-100 dark:border-neutral-850">
            <div className="relative flex items-center justify-center w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="text-neutral-200 dark:text-neutral-800"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="text-[#16a34a] transition-all duration-500 ease-out"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-black text-neutral-900 dark:text-white">{percent}%</span>
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">Taken</p>
              </div>
            </div>
            <div className="pr-4 space-y-1">
              <p className="text-xl font-black text-neutral-900 dark:text-white">{taken} / {total} Taken</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full font-bold">
                  {upcoming} Pending
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full font-bold">
                  {missed} Missed
                </span>
              </div>
            </div>
          </div>

          {nextTimer && (
            <div className="bg-neutral-50 dark:bg-[#121212] px-6 py-5 rounded-3xl border border-neutral-150 dark:border-neutral-850 self-stretch flex flex-col justify-center min-w-[150px]">
              <p className="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{t.nextDose}</p>
              <p className="text-lg md:text-xl font-black text-[#16a34a] mt-1">{nextTimer}</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Medicines timeline */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
          <span>{t.todayMeds}</span>
        </h3>

        {reminders.length === 0 ? (
          <div className="border border-dashed border-neutral-350 dark:border-neutral-700 bg-white dark:bg-[#1f1f1f] rounded-3xl p-12 text-center font-bold text-xl text-neutral-500 dark:text-neutral-400">
            <Info className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
            <p>{t.noMeds}</p>
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-y-2 before:left-8 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
            {timeSlots.map(slot => {
              if (slot.items.length === 0) return null; // Only show active slots

              return (
                <div key={slot.id} className="relative pl-16 space-y-4">
                  {/* Timeline node icon */}
                  <div className="absolute left-3.5 top-0 w-9 h-9 rounded-full bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-sm z-10">
                    {slot.icon}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{slot.title}</span>
                      <span className="text-xs bg-emerald-500/10 dark:bg-emerald-500/20 text-[#16a34a] px-2 py-0.5 rounded-full font-bold">
                        {slot.items.filter(r => r.status === 'taken').length} / {slot.items.length}
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {slot.items.map((rem) => (
                      <MedicineCard
                        key={rem._id}
                        reminder={rem}
                        onStatusChange={handleStatusChange}
                        lang={lang}
                        voiceSpeed={voiceSpeed}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElderlyDashboard;
