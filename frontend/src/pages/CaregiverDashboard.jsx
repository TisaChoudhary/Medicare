import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  Link2, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  Calendar, 
  Trash2,
  Clock
} from 'lucide-react';
import { caregiverAPI, reminderAPI } from '../services/api';
import { translations } from '../services/translations';

const CaregiverDashboard = ({ lang = 'en' }) => {
  const [patients, setPatients] = useState([]);
  const [patientEmailInput, setPatientEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Expansion and detail logs
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [patientReminders, setPatientReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  const t = translations[lang];

  const fetchData = async () => {
    try {
      const data = await caregiverAPI.getOverview();
      setPatients(data.overview || []);
    } catch (err) {
      console.error('Error fetching caregiver overview details:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 15 seconds
    const interval = setInterval(fetchData, 15005);
    return () => clearInterval(interval);
  }, []);

  const handleLinkPatient = async (e) => {
    e.preventDefault();
    if (!patientEmailInput.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await caregiverAPI.linkPatient(patientEmailInput.trim());
      setSuccessMsg(data.message);
      setPatientEmailInput('');
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to link patient. Confirm email exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkPatient = async (e, patientId) => {
    e.stopPropagation(); // Prevent card expansion toggle
    if (!window.confirm(lang === 'es' ? '¿Está seguro de que desea desvincular a este paciente?' : lang === 'hi' ? 'क्या आप इस मरीज को अनलिंक करना चाहते हैं?' : 'Are you sure you want to unlink this patient?')) return;

    try {
      await caregiverAPI.unlinkPatient(patientId);
      setSuccessMsg(lang === 'es' ? 'Paciente desvinculado con éxito.' : lang === 'hi' ? 'मरीज को सफलतापूर्वक अनलिंक कर दिया गया।' : 'Successfully unlinked patient.');
      setPatients(prev => prev.filter(p => p.patient.id !== patientId));
      if (expandedPatientId === patientId) {
        setExpandedPatientId(null);
        setPatientReminders([]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to unlink patient.');
    }
  };

  const handleToggleExpand = async (patientId) => {
    if (expandedPatientId === patientId) {
      setExpandedPatientId(null);
      setPatientReminders([]);
      return;
    }

    setExpandedPatientId(patientId);
    setPatientReminders([]);
    setRemindersLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await reminderAPI.getToday(todayStr, patientId);
      setPatientReminders(data.reminders || []);
    } catch (err) {
      console.error('Error fetching patient reminders:', err);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Calculations for Metrics Row
  const totalPatients = patients.length;
  
  const totalTaken = patients.reduce((acc, p) => acc + p.todayStats.taken, 0);
  const totalMeds = patients.reduce((acc, p) => acc + p.todayStats.total, 0);
  const avgCompliance = totalMeds > 0 ? Math.round((totalTaken / totalMeds) * 100) : 0;
  
  const totalMissed = patients.reduce((acc, p) => acc + p.todayStats.missed, 0);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Title Header with Refresh Button */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{t.caregiverPortal}</h1>
          <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor patient adherence, check daily medication logs, and manage links.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm"
          title="Refresh statistics"
        >
          <RefreshCw className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Active Patients */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-850 p-6 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#16a34a]/5 rounded-full filter blur-xl" />
          <div className="w-14 h-14 bg-[#16a34a]/10 rounded-2xl flex items-center justify-center text-[#16a34a] shrink-0">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-450 uppercase tracking-widest">Active Patients</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{totalPatients}</h3>
          </div>
        </div>

        {/* KPI 2: Avg Adherence */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-850 p-6 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-xl" />
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-[#16a34a] shrink-0">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-450 uppercase tracking-widest">Avg Compliance</p>
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{avgCompliance}%</h3>
          </div>
        </div>

        {/* KPI 3: Missed Alarms */}
        <div className={`border p-6 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden transition-all ${
          totalMissed > 0 
            ? 'bg-red-500/5 border-red-200 dark:border-red-900/30' 
            : 'bg-white dark:bg-[#1f1f1f] border-neutral-200 dark:border-neutral-850'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full filter blur-xl" />
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            totalMissed > 0 ? 'bg-red-500/10 text-red-650' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
          }`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-450 uppercase tracking-widest">Missed Doses Today</p>
            <h3 className={`text-3xl font-black mt-1 ${totalMissed > 0 ? 'text-red-650' : 'text-neutral-900 dark:text-white'}`}>{totalMissed}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Link Patient Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-[#16a34a]" />
              <span>{t.addPatient}</span>
            </h2>

            {errorMsg && <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500 text-red-650 dark:text-red-400 rounded-2xl font-bold text-sm">{errorMsg}</div>}
            {successMsg && <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500 text-emerald-650 dark:text-[#16a34a] rounded-2xl font-bold text-sm">{successMsg}</div>}

            <form onSubmit={handleLinkPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-neutral-450 uppercase tracking-wider mb-2">Patient Email Address</label>
                <input
                  type="email"
                  value={patientEmailInput}
                  onChange={(e) => setPatientEmailInput(e.target.value)}
                  required
                  className="w-full p-3.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a] text-sm"
                  placeholder="e.g. senior@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-md rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{loading ? '...' : t.linkButton}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Patients List & Dropdowns */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <User className="w-7 h-7 text-[#16a34a]" />
            <span>{t.overview}</span>
          </h2>

          {patients.length === 0 ? (
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl p-12 text-center font-bold text-lg text-neutral-500 bg-white dark:bg-[#1f1f1f]">
              <Mail className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
              <p>{t.noPatients}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((pat) => {
                const isExpanded = expandedPatientId === pat.patient.id;
                const completionPercentage = pat.todayStats.total > 0 
                  ? Math.round((pat.todayStats.taken / pat.todayStats.total) * 100) 
                  : 0;

                return (
                  <div 
                    key={pat.patient.id} 
                    className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden transition-all"
                  >
                    {/* Collapsed Top Header Block */}
                    <div 
                      onClick={() => handleToggleExpand(pat.patient.id)}
                      className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 pr-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-neutral-900 dark:text-white truncate">{pat.patient.name}</h3>
                          <button
                            onClick={(e) => handleUnlinkPatient(e, pat.patient.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Unlink patient"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-neutral-450 truncate">{pat.patient.email}</p>
                        
                        {/* Emergency Quick-Info */}
                        {(pat.patient.emergencyContactName || pat.patient.emergencyContactPhone) && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-450 mt-1">
                            <Phone className="w-3.5 h-3.5 text-[#16a34a]" />
                            <span>
                              Emergency contact: <strong>{pat.patient.emergencyContactName} ({pat.patient.emergencyContactPhone})</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Compliance stats & expand arrow */}
                      <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end shrink-0">
                        <div className="space-y-1.5 text-left md:text-right min-w-[140px]">
                          <div className="flex items-center gap-1.5 md:justify-end text-sm font-black text-neutral-900 dark:text-white">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>{t.todayProgress}: {pat.todayStats.taken}/{pat.todayStats.total}</span>
                          </div>
                          
                          {/* Missed tag */}
                          {pat.todayStats.missed > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-red-650 bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{pat.todayStats.missed} Missed</span>
                            </span>
                          )}

                          {/* Progress bar */}
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className="bg-[#16a34a] h-full rounded-full transition-all duration-300"
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Dropdown Arrow */}
                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-full border border-neutral-150 dark:border-neutral-750 shrink-0 text-neutral-500">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Logs Block */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#191919] p-6 space-y-4">
                        <h4 className="text-md font-black text-neutral-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                          <Calendar className="w-4.5 h-4.5 text-[#16a34a]" />
                          <span>Live Medication Log</span>
                        </h4>

                        {remindersLoading ? (
                          <div className="py-8 text-center text-sm font-bold text-neutral-450">Loading schedules...</div>
                        ) : patientReminders.length === 0 ? (
                          <div className="py-8 text-center text-sm font-bold text-neutral-450">No schedules set up for this patient today.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {patientReminders.map(rem => {
                              const isTaken = rem.status === 'taken';
                              const isMissed = rem.status === 'missed';
                              const isSnoozed = rem.status === 'snoozed';
                              
                              let statusBadgeClass = 'bg-neutral-100 text-neutral-600 border-neutral-200';
                              if (isTaken) statusBadgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                              if (isMissed) statusBadgeClass = 'bg-red-500/10 text-red-650 border-red-500/20';
                              if (isSnoozed) statusBadgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20';

                              return (
                                <div 
                                  key={rem._id}
                                  className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center justify-between shadow-xs"
                                >
                                  <div className="min-w-0 pr-2 space-y-1">
                                    <p className="font-extrabold text-neutral-900 dark:text-white truncate">{rem.medicineId.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-neutral-400 font-bold">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-[#16a34a]" />
                                        <span>{rem.time}</span>
                                      </span>
                                      <span>{rem.medicineId.dosage}</span>
                                    </div>
                                  </div>

                                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider shrink-0 ${statusBadgeClass}`}>
                                    {rem.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaregiverDashboard;
