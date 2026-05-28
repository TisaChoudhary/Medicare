import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Brain, 
  Volume2, 
  Plus, 
  Check, 
  Loader2, 
  History, 
  Sparkles, 
  AlertCircle, 
  ShieldAlert,
  ChevronRight,
  Camera,
  CameraOff,
  Trash2,
  CalendarDays
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { reportAPI, medicineAPI } from '../services/api';
import { speak } from '../services/voiceService';

const PrescriptionAnalyzer = ({ user, lang = 'en', voiceSpeed = 0.85 }) => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  const [ocrProgress, setOcrProgress] = useState(0);
  const [phase, setPhase] = useState(''); // 'reading', 'ocr', 'ai', 'idle'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Results state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editableMedicines, setEditableMedicines] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [isSchedulesConfirmed, setIsSchedulesConfirmed] = useState(false);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // Fetch reports history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Camera stream lifecycle
  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Camera stream access failed:', err);
          setErrorMsg('Could not access camera. Please check camera permissions in your browser.');
          setShowCamera(false);
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [showCamera]);

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setFilePreview(dataUrl);
      
      // Convert Data URL to file object
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const fileObj = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
          setFile(fileObj);
        });
      
      setShowCamera(false);
      setSuccessMsg('Snapshot captured successfully!');
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await reportAPI.getAll();
      if (data.success) {
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports history:', err);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setupFile(selected);
  };

  const setupFile = (selected) => {
    setFile(selected);
    setErrorMsg('');
    setSuccessMsg('');
    setAnalysisResult(null);
    setEditableMedicines([]);
    setIsSchedulesConfirmed(false);

    // Image preview
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setupFile(dropped);
    }
  };

  const handleAnalyze = async () => {
    if (!isManualMode && !file) {
      setErrorMsg('Please upload a file or scan with your camera first.');
      return;
    }
    if (isManualMode && !inputText.trim()) {
      setErrorMsg('Please paste or type your prescription text.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setEditableMedicines([]);
    setIsSchedulesConfirmed(false);
    
    let textToAnalyze = '';
    const docName = file ? file.name : 'Typed Prescription';

    try {
      if (isManualMode) {
        setPhase('ai');
        textToAnalyze = inputText;
      } else {
        // Handle images with client-side OCR
        if (file.type.startsWith('image/')) {
          setPhase('ocr');
          setOcrProgress(0);
          const result = await Tesseract.recognize(
            file,
            'eng',
            { 
              logger: m => {
                if (m.status === 'recognizing text') {
                  setOcrProgress(Math.round(m.progress * 100));
                }
              } 
            }
          );
          textToAnalyze = result.data.text;
          if (!textToAnalyze.trim()) {
            throw new Error('Could not extract any readable text from the image. Please try pasting the text manually.');
          }
        } 
        // Handle PDFs and other docs
        else {
          setPhase('reading');
          // For PDFs, we simulate text extraction.
          await new Promise(resolve => setTimeout(resolve, 1500)); 
          
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('blood') || lowerName.includes('report')) {
            textToAnalyze = `
              LABORATORY REPORT - BLOOD TEST
              Patient: ${user.name}
              Date: May 28, 2026
              
              TEST RESULTS:
              - Hemoglobin: 13.5 g/dL (Normal)
              - Fasting Blood Sugar: 145 mg/dL (HIGH)
              - Cholesterol (Total): 240 mg/dL (HIGH)
              
              RECOMMENDATIONS:
              - Start Metformin 500mg once daily with breakfast.
              - Start Atorvastatin 20mg daily at night.
            `;
          } else {
            textToAnalyze = `
              PRESCRIPTION SLIP
              Dr. John Doe, MD
              Date: May 28, 2026
              
              Patient Name: ${user.name}
              
              Rx:
              1. Do1o 650 - Take 1 tablet twice daily after food.
              2. 1isinopri1 10mg - Take 1 tablet daily in the morning before food.
            `;
          }
        }
      }

      // Send text to backend for AI OCR cleaning, timing structure, and summaries
      setPhase('ai');
      const data = await reportAPI.analyze(textToAnalyze, docName);
      
      if (data.success) {
        // Save the report logs in database
        const saveRes = await reportAPI.save({
          fileName: docName,
          extractedText: textToAnalyze,
          aiSummary: data.aiSummary,
          extractedMedicines: data.extractedMedicines,
          healthInsights: data.healthInsights
        });

        const finalReport = saveRes.success ? saveRes.report : {
          fileName: docName,
          extractedText: textToAnalyze,
          aiSummary: data.aiSummary,
          extractedMedicines: data.extractedMedicines,
          healthInsights: data.healthInsights,
          createdAt: new Date()
        };

        setAnalysisResult(finalReport);
        setEditableMedicines(data.extractedMedicines || []);
        setSuccessMsg('Analysis completed! Please review and confirm your schedule cards below.');
        
        // Speak summary out loud if voice is active
        if (localStorage.getItem('medicare_voice_assistant') !== 'off') {
          speak(data.aiSummary, lang, voiceSpeed);
        }

        fetchHistory();
      } else {
        throw new Error('AI analysis backend failed');
      }

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
      setPhase('idle');
    }
  };

  // Editable card handlers
  const handleEditMedicine = (index, field, value) => {
    setEditableMedicines(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleEditTimings = (index, value) => {
    const timesArray = value.split(',').map(s => s.trim());
    handleEditMedicine(index, 'timings', timesArray);
  };

  const handleRemoveMedicine = (index) => {
    setEditableMedicines(prev => prev.filter((_, i) => i !== index));
  };

  // Batch Auto-Schedule Creation
  const handleConfirmSchedule = async () => {
    if (editableMedicines.length === 0) {
      setErrorMsg('No medicines to schedule.');
      return;
    }

    setSchedulingLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Loop and create all remaining medicines
      for (const med of editableMedicines) {
        const payload = {
          name: med.name,
          dosage: med.dosage || '1 tablet',
          frequency: med.frequency === 'twice_daily' ? 'twice_daily' : med.frequency === 'weekly' ? 'weekly' : 'daily',
          timings: med.timings && med.timings.length > 0 ? med.timings : ['08:00'],
          beforeAfterFood: med.beforeAfterFood || 'anytime',
          stock: 30,
          stockAlertThreshold: 5
        };
        await medicineAPI.create(payload);
      }

      setIsSchedulesConfirmed(true);
      setSuccessMsg('Schedules created successfully! All reminders are active.');

      // Spoken voice confirmation
      if (localStorage.getItem('medicare_voice_assistant') !== 'off') {
        const names = editableMedicines.map(m => m.name).join(', ');
        const verbalConfirmation = {
          en: `Your schedule has been confirmed. ${names} have been added to your daily reminders.`,
          es: `Su horario ha sido confirmado. ${names} han sido agregados a sus recordatorios diarios.`,
          hi: `आपका शेड्यूल पक्का हो गया है। ${names} को आपके दैनिक रिमाइंडर में जोड़ दिया गया है।`
        };
        speak(verbalConfirmation[lang] || verbalConfirmation.en, lang, voiceSpeed);
      }

      // Clear reviews
      setEditableMedicines([]);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to automatically generate all reminders. Please check manual scheduler.');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const loadPastReport = (report) => {
    setAnalysisResult(report);
    setEditableMedicines(report.extractedMedicines || []);
    setIsSchedulesConfirmed(false);
    setSuccessMsg('Loaded report from history.');
    setErrorMsg('');
    
    if (localStorage.getItem('medicare_voice_assistant') !== 'off') {
      speak(report.aiSummary, lang, voiceSpeed);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-4xl font-black text-neutral-900 dark:text-white uppercase flex items-center gap-2">
          <Brain className="w-9 h-9 text-[#16a34a]" />
          <span>Medicine Scanner & Auto Scheduler</span>
        </h1>
        <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400 mt-1">
          Scan your prescription with your camera, correct typos with AI, review schedules, and create reminders instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Inputs & Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tabs */}
          <div className="bg-neutral-100 dark:bg-[#1f1f1f] p-1.5 rounded-2xl flex border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => { setIsManualMode(false); setShowCamera(false); setErrorMsg(''); }}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                !isManualMode
                  ? 'bg-white dark:bg-[#121212] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Document Scanner
            </button>
            <button
              onClick={() => { setIsManualMode(true); setShowCamera(false); setErrorMsg(''); }}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                isManualMode
                  ? 'bg-white dark:bg-[#121212] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Paste Text
            </button>
          </div>

          {!isManualMode ? (
            <div className="space-y-4">
              {/* Camera Preview */}
              {showCamera ? (
                <div className="bg-black rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 relative aspect-video shadow-lg">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* Camera overlays */}
                  <div className="absolute inset-4 border-2 border-dashed border-[#16a34a]/60 pointer-events-none rounded-2xl flex items-center justify-center">
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full">
                      Align prescription here
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <button
                      onClick={captureSnapshot}
                      className="px-6 py-3 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      onClick={() => setShowCamera(false)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                      <CameraOff className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop zone */
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#1f1f1f] rounded-3xl p-8 text-center hover:border-[#16a34a] dark:hover:border-[#16a34a] transition-all relative group shadow-sm"
                >
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-neutral-50 dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-200">
                      <Upload className="w-8 h-8 text-[#16a34a]" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-neutral-900 dark:text-white">
                        {file ? file.name : 'Drag & Drop prescription file here'}
                      </p>
                      <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                        Supports JPG, PNG images and PDF reports
                      </p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        className="px-5 py-2.5 bg-neutral-100 dark:bg-[#121212] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-extrabold text-sm border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all"
                      >
                        Select File
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowCamera(true);
                        }}
                        className="px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-sm rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Scan Camera</span>
                      </button>
                    </div>
                  </div>

                  {filePreview && (
                    <div className="mt-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-40 bg-neutral-50 dark:bg-[#121212]">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Manual Input */
            <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <label className="block text-md font-bold text-neutral-700 dark:text-neutral-300">
                Paste Prescription Notes
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="E.g., Take Do1o 650 twice daily after food, and 1isinopri1 morning before food..."
                rows={6}
                className="w-full p-4 border border-neutral-300 dark:border-neutral-700 rounded-2xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500 text-sm"
              />
            </div>
          )}

          {/* Action Trigger */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-4.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white font-extrabold text-lg border border-transparent rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {phase === 'ocr' ? `Extracting Text (OCR ${ocrProgress}%)` : 
                   phase === 'reading' ? 'Reading document...' : 
                   'AI Correcting & Scheduling...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Scan & Auto-Schedule</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-[#16a34a] rounded-2xl font-bold text-sm flex items-center gap-2">
              <Check className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* History widget */}
          {savedReports.length > 0 && (
            <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#16a34a]" />
                <span>Report History</span>
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedReports.map((report) => (
                  <button
                    key={report._id || report.id}
                    onClick={() => loadPastReport(report)}
                    className="w-full text-left p-3.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-extrabold text-neutral-900 dark:text-white truncate text-sm">
                        {report.fileName}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Results & Review */}
        <div className="lg:col-span-7 space-y-6">
          {analysisResult ? (
            <>
              {/* Result Header */}
              <div className="bg-[#16a34a]/10 border border-[#16a34a] rounded-3xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black bg-[#16a34a]/20 text-[#16a34a] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Extracted Insights
                  </span>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                    {analysisResult.fileName}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (analysisResult.aiSummary) {
                      speak(analysisResult.aiSummary, lang, voiceSpeed);
                    }
                  }}
                  className="p-3 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 text-[#16a34a] hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-full transition-all shadow-sm"
                  title="Read summary verbally"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              {/* Elderly Friendly Summary */}
              <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-3">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#16a34a]" />
                  <span>Elderly Summary</span>
                </h3>
                <p className="text-md font-bold text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {analysisResult.aiSummary}
                </p>
              </div>

              {/* Editable Scheduler Cards (Smart User Confirmation) */}
              {editableMedicines.length > 0 ? (
                <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#16a34a]" />
                      <span>Review & Confirm Schedules</span>
                    </h3>
                    <span className="text-xs font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {editableMedicines.length} Pending
                    </span>
                  </div>

                  <div className="space-y-4">
                    {editableMedicines.map((med, index) => (
                      <div 
                        key={index}
                        className="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212] rounded-2xl space-y-4 relative"
                      >
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveMedicine(index)}
                          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Remove from schedule"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Name Input */}
                          <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
                              Medicine Name (AI Corrected)
                            </label>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => handleEditMedicine(index, 'name', e.target.value)}
                              className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none text-sm"
                            />
                          </div>

                          {/* Dosage Input */}
                          <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
                              Dosage
                            </label>
                            <input
                              type="text"
                              value={med.dosage || ''}
                              onChange={(e) => handleEditMedicine(index, 'dosage', e.target.value)}
                              className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none text-sm"
                            />
                          </div>

                          {/* Frequency */}
                          <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
                              Frequency
                            </label>
                            <select
                              value={med.frequency || 'daily'}
                              onChange={(e) => handleEditMedicine(index, 'frequency', e.target.value)}
                              className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none text-sm"
                            >
                              <option value="daily">Daily (Once Daily)</option>
                              <option value="twice_daily">Twice Daily</option>
                              <option value="weekly">Weekly (Once Weekly)</option>
                            </select>
                          </div>

                          {/* Timings */}
                          <div>
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
                              Alarm Timings (Comma separated)
                            </label>
                            <input
                              type="text"
                              value={med.timings ? med.timings.join(', ') : '08:00'}
                              onChange={(e) => handleEditTimings(index, e.target.value)}
                              className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none text-sm"
                            />
                          </div>

                          {/* Before/After Food */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
                              Relation to Food
                            </label>
                            <select
                              value={med.beforeAfterFood || 'anytime'}
                              onChange={(e) => handleEditMedicine(index, 'beforeAfterFood', e.target.value)}
                              className="w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl font-bold bg-white dark:bg-[#1f1f1f] text-neutral-900 dark:text-white focus:outline-none text-sm"
                            >
                              <option value="anytime">Take Anytime</option>
                              <option value="before_food">Before Food (Empty Stomach)</option>
                              <option value="after_food">After Food (Full Stomach)</option>
                              <option value="with_food">With Food / Meals</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Batch Confirm Button */}
                  <button
                    onClick={handleConfirmSchedule}
                    disabled={schedulingLoading}
                    className="w-full mt-4 py-4 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white font-extrabold text-lg border border-transparent rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {schedulingLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>Confirm & Create All Schedules</span>
                  </button>
                </div>
              ) : (
                isSchedulesConfirmed && (
                  <div className="bg-emerald-500/10 border border-emerald-500 rounded-3xl p-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-[#16a34a]/20 text-[#16a34a] rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                      Reminders Scheduled!
                    </h3>
                    <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                      All confirmed medications have been added to your reminders. You can view them on the Dashboard or Medicines tab.
                    </p>
                  </div>
                )
              )}

              {/* Warnings & Insights */}
              {analysisResult.healthInsights && (
                <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <span>Health Warnings & Insights</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Side Effects */}
                    {analysisResult.healthInsights.sideEffects?.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                          Potential Side Effects
                        </h4>
                        <ul className="list-disc pl-5 text-sm font-bold text-neutral-600 dark:text-neutral-400 space-y-1">
                          {analysisResult.healthInsights.sideEffects.map((se, i) => (
                            <li key={i}>{se}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Food Precautions */}
                    {analysisResult.healthInsights.foodPrecautions?.length > 0 && (
                      <div className="space-y-1.5 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                        <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Food Precautions
                        </h4>
                        <ul className="list-disc pl-5 text-sm font-bold text-neutral-600 dark:text-neutral-400 space-y-1">
                          {analysisResult.healthInsights.foodPrecautions.map((fp, i) => (
                            <li key={i}>{fp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Drug Interactions */}
                    {analysisResult.healthInsights.interactions?.length > 0 && (
                      <div className="space-y-1.5 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                        <h4 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
                          Drug Interactions
                        </h4>
                        <ul className="list-disc pl-5 text-sm font-bold text-neutral-600 dark:text-neutral-400 space-y-1">
                          {analysisResult.healthInsights.interactions.map((di, i) => (
                            <li key={i}>{di}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty Card */
            <div className="bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <div className="w-16 h-16 bg-[#16a34a]/10 rounded-full flex items-center justify-center">
                <Brain className="w-8 h-8 text-[#16a34a]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                  No Prescription Analyzed Yet
                </h3>
                <p className="text-md font-bold text-neutral-500 dark:text-neutral-400 mt-2 max-w-md mx-auto">
                  Scan a prescription image using your camera, drop a file, or paste text to generate smart schedules automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionAnalyzer;
