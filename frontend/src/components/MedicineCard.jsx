import React from 'react';
import { Pill, Check, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const MedicineCard = ({ reminder, onStatusChange, lang = 'en' }) => {
  const { _id, medicineId, time, status, takenAt, snoozeCount } = reminder;

  // Safety fallback if populated object is missing
  if (!medicineId) return null;

  const { name, dosage, beforeAfterFood, stock, stockAlertThreshold, prescriptionFile, prescriptionFileName } = medicineId;

  const isLowStock = stock <= stockAlertThreshold;

  // Simple feedback audio trigger
  const playClickSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // Double ding
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 300);
      } else {
        // Standard blip
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 150);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleTake = () => {
    playClickSound('success');
    onStatusChange(_id, 'taken');
  };

  const handleSnooze = () => {
    playClickSound('snooze');
    onStatusChange(_id, 'snoozed');
  };

  const getFoodText = (rel) => {
    if (rel === 'before') return lang === 'es' ? 'Antes de Comer' : lang === 'hi' ? 'भोजन से पहले' : 'Before Food';
    if (rel === 'after') return lang === 'es' ? 'Después de Comer' : lang === 'hi' ? 'भोजन के बाद' : 'After Food';
    if (rel === 'with') return lang === 'es' ? 'Con la Comida' : lang === 'hi' ? 'भोजन के साथ' : 'With Food';
    return lang === 'es' ? 'Cualquier hora' : lang === 'hi' ? 'कभी भी' : 'Anytime';
  };

  const getStatusColor = () => {
    if (status === 'taken') return 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 text-[#16a34a]';
    if (status === 'missed') return 'border-red-500 bg-red-500/5 dark:bg-red-500/10 text-red-600 dark:text-red-400';
    if (status === 'snoozed') return 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#121212] text-neutral-800 dark:text-neutral-200';
    return 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1f1f1f] text-neutral-955 dark:text-white';
  };

  return (
    <div className={`w-full border rounded-3xl p-6 shadow-sm transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side Info */}
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
            status === 'taken' ? 'bg-[#16a34a] text-white' : 'bg-neutral-100 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300'
          }`}>
            <Pill className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase leading-tight">{name}</h3>
            <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
              <span>{dosage}</span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-[#121212] text-neutral-700 dark:text-neutral-350 rounded-lg text-sm border border-neutral-200 dark:border-neutral-800">
                {getFoodText(beforeAfterFood)}
              </span>
            </p>
            <p className="text-md font-bold text-neutral-600 dark:text-neutral-400 mt-2 flex items-center gap-1">
              <Clock className="w-5 h-5" />
              <span>{lang === 'es' ? 'Hora programada:' : lang === 'hi' ? 'समय:' : 'Scheduled:'} <strong className="text-lg">{time}</strong></span>
              {snoozeCount > 0 && <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-200 dark:bg-[#2d2d2d] text-neutral-800 dark:text-neutral-300 rounded-md">Snoozed {snoozeCount}x</span>}
            </p>
            {prescriptionFile && (
              <div className="mt-3">
                <a
                  href={prescriptionFile}
                  download={prescriptionFileName || `${name}_prescription`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#121212] dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View Prescription ({prescriptionFileName || 'File'})</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Options & Stock */}
        <div className="flex flex-col items-end gap-3 justify-center min-w-[200px]">
          {isLowStock && (
            <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-black">
              <AlertTriangle className="w-4 h-4" />
              <span>{lang === 'es' ? 'Stock Bajo:' : lang === 'hi' ? 'स्टॉक कम:' : 'Low Stock:'} {stock} left</span>
            </span>
          )}

          <div className="w-full">
            {status === 'taken' ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-[#16a34a] text-white font-extrabold text-xl rounded-2xl border border-transparent">
                <Check className="w-7 h-7" />
                <span>
                  {lang === 'es' ? '¡Tomada!' : lang === 'hi' ? 'ले ली!' : 'Taken!'}
                  {takenAt && <span className="text-xs block font-medium">at {new Date(takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                </span>
              </div>
            ) : status === 'missed' ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-[#dc2626] text-white font-extrabold text-xl rounded-2xl border border-transparent">
                <AlertTriangle className="w-7 h-7" />
                <span>{lang === 'es' ? 'Omitida' : lang === 'hi' ? 'छूट गई' : 'Missed'}</span>
              </div>
            ) : (
              <div className="flex flex-row md:flex-col lg:flex-row gap-2 w-full">
                <button
                  onClick={handleSnooze}
                  className="flex-1 btn-elderly py-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#2d2d2d] dark:hover:bg-[#3d3d3d] text-neutral-800 dark:text-white text-lg rounded-2xl border border-neutral-300 dark:border-neutral-700"
                >
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                  <span>{lang === 'es' ? 'Posponer' : lang === 'hi' ? 'सूज़' : 'Snooze'}</span>
                </button>
                <button
                  onClick={handleTake}
                  className="flex-1 btn-elderly py-4 bg-[#16a34a] hover:bg-[#15803d] text-white text-xl rounded-2xl border border-transparent"
                >
                  <Check className="w-6 h-6" />
                  <span>{lang === 'es' ? 'Tomar' : lang === 'hi' ? 'लें' : 'Take'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineCard;
