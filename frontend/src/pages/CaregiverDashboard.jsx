import React, { useState, useEffect } from 'react';
import { User, Mail, ShieldAlert, CheckCircle, AlertTriangle, Link2, MapPin, Check } from 'lucide-react';
import { caregiverAPI, sosAPI } from '../services/api';
import { translations } from '../services/translations';

const CaregiverDashboard = ({ lang = 'en' }) => {
  const [patients, setPatients] = useState([]);
  const [patientEmailInput, setPatientEmailInput] = useState('');
  const [activeSOSAlerts, setActiveSOSAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const t = translations[lang];

  const fetchData = async () => {
    try {
      // Get caregiver patients overview
      const data = await caregiverAPI.getOverview();
      setPatients(data.overview);

      // Get active emergency alerts
      const sosData = await sosAPI.getActive();
      setActiveSOSAlerts(sosData.alerts);
    } catch (err) {
      console.error('Error fetching caregiver overview details:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for SOS updates every 10 seconds for real-time monitoring
    const interval = setInterval(fetchData, 10000);
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

  const handleResolveSOS = async (alertId) => {
    try {
      await sosAPI.resolve(alertId);
      fetchData();
    } catch (err) {
      console.error('Error resolving SOS:', err);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-4xl font-black text-neutral-900 dark:text-white uppercase">{t.caregiverPortal}</h1>
        <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400 mt-1">Monitor patients compliance and respond to emergencies.</p>
      </div>

      {/* Emergency Alerts Panel */}
      {activeSOSAlerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse">
          <div className="flex items-center gap-3 text-red-650 dark:text-red-400">
            <ShieldAlert className="w-10 h-10 flex-shrink-0" />
            <h2 className="text-2xl md:text-3xl font-black uppercase">
              {lang === 'es' ? '¡ALERTAS DE EMERGENCIA ACTIVAS!' : lang === 'hi' ? 'सक्रिय आपातकालीन अलर्ट!' : 'ACTIVE EMERGENCY SOS ALERTS!'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSOSAlerts.map((alert) => (
              <div key={alert._id} className="bg-white dark:bg-[#121212] border border-red-500 rounded-2xl p-5 text-neutral-900 dark:text-white flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">{alert.userId?.name}</h3>
                  <p className="text-sm font-bold text-neutral-500 mt-1">Phone: {alert.userId?.phone || 'No phone'}</p>
                  
                  {alert.location?.latitude && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 font-extrabold">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${alert.location.latitude},${alert.location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-md"
                      >
                        View Live Location on Map
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleResolveSOS(alert._id)}
                  className="w-full py-3 bg-red-650 hover:bg-red-700 text-white font-extrabold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>{t.resolveAlert}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Overview & Link tools */}
        <div className="lg:col-span-1 space-y-6">
          {/* Link Patient Widget */}
          <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-[#16a34a]" />
              <span>{t.addPatient}</span>
            </h2>

            {errorMsg && <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-655 dark:text-red-400 rounded-xl font-bold text-sm">{errorMsg}</div>}
            {successMsg && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500 text-emerald-655 dark:text-emerald-400 rounded-xl font-bold text-sm">{successMsg}</div>}

            <form onSubmit={handleLinkPatient} className="space-y-4">
              <input
                type="email"
                value={patientEmailInput}
                onChange={(e) => setPatientEmailInput(e.target.value)}
                required
                className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a] dark:focus:border-[#16a34a]"
                placeholder="patient@email.com"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-elderly py-4 bg-[#16a34a] hover:bg-[#15803d] text-white text-lg rounded-2xl transition-all"
              >
                <span>{loading ? '...' : t.linkButton}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Patients Compliance List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <User className="w-7 h-7 text-[#16a34a]" />
            <span>{t.overview}</span>
          </h2>

          {patients.length === 0 ? (
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl p-10 text-center font-bold text-lg text-neutral-500 bg-white dark:bg-[#1f1f1f]">
              <Mail className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
              <p>{t.noPatients}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((pat) => (
                <div key={pat.patient.id} className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                  {/* Info details */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white">{pat.patient.name}</h3>
                    <p className="text-md font-bold text-neutral-550">{pat.patient.email}</p>
                    <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                      Emergency contact: <strong>{pat.patient.emergencyContactName} ({pat.patient.emergencyContactPhone})</strong>
                    </p>
                  </div>

                  {/* Compliance Rate & Logs info */}
                  <div className="flex flex-col items-start md:items-end justify-center gap-3 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                      <span className="text-lg font-black text-neutral-900 dark:text-white">
                        {t.todayProgress}: {pat.todayStats.taken} / {pat.todayStats.total}
                      </span>
                    </div>

                    {pat.todayStats.missed > 0 && (
                      <div className="flex items-center gap-2 text-red-500 font-extrabold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>{pat.todayStats.missed} Missed Doses today!</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaregiverDashboard;
