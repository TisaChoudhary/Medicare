import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Edit3, Trash2, Pill, User } from 'lucide-react';
import { medicineAPI, caregiverAPI } from '../services/api';
import { translations } from '../services/translations';

const MedicineManager = ({ user, lang = 'en' }) => {
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [timings, setTimings] = useState(['08:00']);
  const [beforeAfterFood, setBeforeAfterFood] = useState('anytime');
  const [stock, setStock] = useState(30);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(5);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState('');

  const t = translations[lang];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size is too large. Please select a file smaller than 2MB.");
      return;
    }

    setPrescriptionFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPrescriptionFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const fetchPatients = async () => {
    if (user.role === 'caregiver') {
      try {
        const data = await caregiverAPI.getPatients();
        setPatients(data.patients);
        if (data.patients.length > 0) {
          setSelectedPatientId(data.patients[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchMedicines = async () => {
    try {
      const patientId = user.role === 'caregiver' ? selectedPatientId : null;
      const data = await medicineAPI.getAll(patientId);
      setMedicines(data.medicines);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [selectedPatientId]);

  const handleAddTiming = () => {
    setTimings(prev => [...prev, '08:00']);
  };

  const handleRemoveTiming = (index) => {
    setTimings(prev => prev.filter((_, i) => i !== index));
  };

  const handleTimingChange = (index, value) => {
    const updated = [...timings];
    updated[index] = value;
    setTimings(updated);
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setFrequency('daily');
    setTimings(['08:00']);
    setBeforeAfterFood('anytime');
    setStock(30);
    setStockAlertThreshold(5);
    setPrescriptionFile(null);
    setPrescriptionFileName('');
    setIsEditing(false);
    setEditId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !dosage || timings.length === 0) return;

    const payload = {
      name,
      dosage,
      frequency,
      timings,
      beforeAfterFood,
      stock: Number(stock),
      stockAlertThreshold: Number(stockAlertThreshold),
      prescriptionFile,
      prescriptionFileName,
      userId: user.role === 'caregiver' ? selectedPatientId : undefined
    };

    try {
      if (isEditing) {
        await medicineAPI.update(editId, payload);
      } else {
        await medicineAPI.create(payload);
      }
      resetForm();
      fetchMedicines();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (med) => {
    setIsEditing(true);
    setEditId(med._id);
    setName(med.name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setTimings(med.timings);
    setBeforeAfterFood(med.beforeAfterFood);
    setStock(med.stock);
    setStockAlertThreshold(med.stockAlertThreshold);
    setPrescriptionFile(med.prescriptionFile || null);
    setPrescriptionFileName(med.prescriptionFileName || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    try {
      await medicineAPI.delete(id);
      fetchMedicines();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-4xl font-black text-neutral-900 dark:text-white uppercase">{t.manageMeds}</h1>
        <p className="text-lg font-bold text-neutral-550 dark:text-neutral-400 mt-1">Add or update medical timings and tracks stock count.</p>
      </div>

      {/* Patient Selector for Caregivers */}
      {user.role === 'caregiver' && (
        <div className="bg-white dark:bg-[#1f1f1f] text-neutral-905 dark:text-white p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="w-8 h-8 text-[#16a34a]" />
            <span className="text-xl font-black">Select Patient to Manage:</span>
          </div>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white font-bold text-lg md:w-64 focus:outline-none"
          >
            {patients.map(p => (
              <option key={p.patient.id} value={p.patient.id}>{p.patient.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Form: Add/Edit */}
        <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm h-fit">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-6">
            {isEditing ? t.editMed : t.addMed}
          </h2>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.medName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Aspirin"
                className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.dosage}</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  required
                  placeholder="e.g. 1 pill"
                  className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
                />
              </div>
              <div>
                <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.frequency}</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="daily">{t.daily}</option>
                  <option value="weekly">{t.weekly}</option>
                </select>
              </div>
            </div>

            {/* Timings List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300">{t.timings}</label>
                <button
                  type="button"
                  onClick={handleAddTiming}
                  className="flex items-center gap-1 text-[#16a34a] hover:text-[#15803d] font-extrabold text-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Time</span>
                </button>
              </div>

              <div className="space-y-2">
                {timings.map((time, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimingChange(idx, e.target.value)}
                      required
                      className="flex-1 p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white rounded-xl font-bold"
                    />
                    {timings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTiming(idx)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-300 dark:border-red-800 text-red-600 rounded-xl transition-all"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Food relation */}
            <div>
              <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.foodRelation}</label>
              <div className="grid grid-cols-2 gap-2">
                {['before', 'after', 'with', 'anytime'].map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => setBeforeAfterFood(rel)}
                    className={`py-3 px-4 border font-extrabold rounded-xl transition-all ${
                      beforeAfterFood === rel 
                        ? 'bg-[#16a34a] text-white border-transparent shadow-sm' 
                        : 'bg-neutral-50 dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {rel === 'before' && t.beforeFood}
                    {rel === 'after' && t.afterFood}
                    {rel === 'with' && t.withFood}
                    {rel === 'anytime' && t.anytime}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock counts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.stock}</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">{t.alertThreshold}</label>
                <input
                  type="number"
                  value={stockAlertThreshold}
                  onChange={(e) => setStockAlertThreshold(e.target.value)}
                  className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* Prescription File Upload */}
            <div>
              <label className="block text-lg font-extrabold text-neutral-900 dark:text-neutral-300 mb-2">Prescription File (Optional)</label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-[#121212] text-neutral-900 dark:text-white font-bold text-sm"
                />
                {prescriptionFileName && (
                  <div className="flex items-center justify-between bg-neutral-50 dark:bg-[#121212] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-sm font-semibold truncate max-w-[200px] text-neutral-850 dark:text-neutral-200">{prescriptionFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPrescriptionFile(null);
                        setPrescriptionFileName('');
                      }}
                      className="text-xs text-red-650 hover:underline font-bold"
                    >
                      Clear File
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#121212] dark:hover:bg-neutral-800 text-neutral-800 dark:text-white font-extrabold rounded-2xl text-lg border border-neutral-300 dark:border-neutral-700 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 btn-elderly py-4 bg-[#16a34a] hover:bg-[#15803d] text-white text-lg rounded-2xl transition-all flex items-center justify-center gap-2 border border-transparent"
              >
                <Save className="w-5 h-5" />
                <span>{t.save}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right List: Display medicines */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Active Medicines</h2>
          
          {medicines.length === 0 ? (
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl p-10 text-center font-bold text-lg text-neutral-505 bg-white dark:bg-[#1f1f1f]">
              <Pill className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
              <p>No medicines active. Add one using the form.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medicines.map((med) => (
                <div key={med._id} className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#16a34a] dark:text-white uppercase leading-none">{med.name}</h3>
                    <p className="text-sm font-bold text-neutral-500 mt-1">{med.dosage} • {med.timings.join(', ')}</p>
                    <p className="text-xs font-semibold text-neutral-400 mt-1">Stock: {med.stock}</p>
                    {med.prescriptionFile && (
                      <div className="mt-2">
                        <a
                          href={med.prescriptionFile}
                          download={med.prescriptionFileName || `${med.name}_prescription`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-[#121212] dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>View Prescription</span>
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(med)}
                      className="p-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#121212] dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-750 dark:text-neutral-300 rounded-xl transition-all"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(med._id)}
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-300 dark:border-red-800 text-red-600 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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

export default MedicineManager;
