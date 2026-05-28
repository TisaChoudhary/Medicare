const MedicalReport = require('../models/MedicalReport');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');
const { OpenAI } = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Helper to run local regex parsing fallback
const parseLocalText = (text) => {
  const query = text.toLowerCase();
  const medicines = [];
  const sideEffects = [];
  const foodPrecautions = [];
  const interactions = [];
  const summaries = [];

  const medDatabase = [
    {
      keywords: ['paracetamol', 'acetaminophen', 'crocin', 'calpol'],
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'twice_daily',
      timings: ['08:00', '20:00'],
      beforeAfterFood: 'after_food',
      summary: 'Paracetamol is used for pain relief and fever reduction.',
      sideEffect: 'Stomach upset if taken on an empty stomach.',
      foodPrecaution: 'Take after meals to protect your stomach.',
      interaction: 'Do not take with other products containing paracetamol.'
    },
    {
      keywords: ['metformin', 'glucophage', 'glycomet'],
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice_daily',
      timings: ['08:00', '20:00'],
      beforeAfterFood: 'after_food',
      summary: 'Metformin helps control blood sugar levels for diabetes.',
      sideEffect: 'Nausea, mild diarrhea, or a metallic taste in the mouth.',
      foodPrecaution: 'Take with or immediately after meals to reduce stomach side effects.',
      interaction: 'Avoid excessive alcohol consumption while taking this.'
    },
    {
      keywords: ['atorvastatin', 'lipitor', 'atorva'],
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'once_daily',
      timings: ['21:00'],
      beforeAfterFood: 'anytime',
      summary: 'Atorvastatin lowers cholesterol levels and protects the heart.',
      sideEffect: 'Mild muscle aches or headache.',
      foodPrecaution: 'Avoid drinking grapefruit juice as it increases drug concentration.',
      interaction: 'Consult your doctor before taking other cholesterol-lowering drugs.'
    },
    {
      keywords: ['amlodipine', 'norvasc', 'amlo'],
      name: 'Amlodipine',
      dosage: '5mg',
      frequency: 'once_daily',
      timings: ['08:00'],
      beforeAfterFood: 'anytime',
      summary: 'Amlodipine relaxes blood vessels to lower high blood pressure.',
      sideEffect: 'Swelling in the ankles or feet, dizziness, or flushing.',
      foodPrecaution: 'Can be taken with or without food.',
      interaction: 'Limit grapefruit intake.'
    },
    {
      keywords: ['lisinopril', 'zestril', 'prinivil'],
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'once_daily',
      timings: ['08:00'],
      beforeAfterFood: 'before_food',
      summary: 'Lisinopril is used to treat high blood pressure and heart failure.',
      sideEffect: 'A dry, persistent cough or lightheadedness.',
      foodPrecaution: 'Avoid salt substitutes containing potassium without asking your doctor.',
      interaction: 'Do not use with potassium supplements unless directed.'
    },
    {
      keywords: ['ibuprofen', 'advil', 'brufen', 'motrin'],
      name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'twice_daily',
      timings: ['12:00', '20:00'],
      beforeAfterFood: 'after_food',
      summary: 'Ibuprofen reduces pain, swelling, and inflammation.',
      sideEffect: 'Heartburn or stomach irritation.',
      foodPrecaution: 'Always take with food or milk to prevent stomach pain.',
      interaction: 'Do not take with other anti-inflammatory medicines or blood thinners.'
    },
    {
      keywords: ['aspirin', 'ecotrin'],
      name: 'Aspirin',
      dosage: '75mg',
      frequency: 'once_daily',
      timings: ['08:00'],
      beforeAfterFood: 'after_food',
      summary: 'Aspirin is used as a blood thinner to prevent heart attacks or strokes.',
      sideEffect: 'Increased tendency to bleed or bruise easily.',
      foodPrecaution: 'Take with food to minimize stomach upset.',
      interaction: 'Avoid taking with other blood thinners unless approved by a physician.'
    }
  ];

  let matched = false;
  medDatabase.forEach(item => {
    const found = item.keywords.some(kw => query.includes(kw));
    if (found) {
      matched = true;
      medicines.push({
        name: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        timings: item.timings,
        beforeAfterFood: item.beforeAfterFood
      });
      summaries.push(item.summary);
      if (item.sideEffect) sideEffects.push(item.sideEffect);
      if (item.foodPrecaution) foodPrecautions.push(item.foodPrecaution);
      if (item.interaction) interactions.push(item.interaction);
    }
  });

  // Regex fallback if no specific keywords match
  if (!matched) {
    // Try to extract any word ending with 'mg' or preceding 'mg'
    const mgRegex = /(\b\w+\b)\s*(\d+\s*mg)/gi;
    let match;
    let count = 0;
    while ((match = mgRegex.exec(text)) !== null && count < 3) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      // Skip common units or prepositions
      if (!['take', 'every', 'with', 'after', 'before', 'and', 'the', 'of'].includes(name.toLowerCase())) {
        medicines.push({
          name: name,
          dosage: match[2],
          frequency: 'once_daily',
          timings: ['09:00'],
          beforeAfterFood: 'anytime'
        });
        count++;
      }
    }

    if (medicines.length === 0) {
      medicines.push({
        name: 'Prescribed Pill',
        dosage: '1 tablet',
        frequency: 'once_daily',
        timings: ['08:00'],
        beforeAfterFood: 'anytime'
      });
    }

    summaries.push('We found medication details in your document. Please verify the exact pill names and times with your caregiver or physician.');
    sideEffects.push('Check the package insert for potential side effects.');
    foodPrecautions.push('Take with water, ideally after food if not specified.');
    interactions.push('Consult your pharmacist before combining with other medications.');
  }

  return {
    aiSummary: summaries.join(' ') || 'The prescription has been analyzed. Please review the extracted medicines list and schedule them as needed.',
    extractedMedicines: medicines,
    healthInsights: {
      sideEffects: sideEffects.length > 0 ? sideEffects : ['None reported. Check prescribing guide.'],
      foodPrecautions: foodPrecautions.length > 0 ? foodPrecautions : ['No special food precautions detected.'],
      interactions: interactions.length > 0 ? interactions : ['No critical interactions flagged. Consult your pharmacist.']
    }
  };
};

exports.analyzePrescriptionText = async (req, res) => {
  try {
    const { text, fileName } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text input is required' });
    }

    const docName = fileName || 'Prescription Document';

    if (openai) {
      try {
        const systemPrompt = `
          You are a professional medical AI assistant specialized in parsing prescription documents and medical reports for elderly patients.
          Analyze the following prescription text and return a valid JSON object ONLY. Do not wrap it in markdown formatting, backticks, or any conversational text. Just return the JSON object directly.
          
          CRITICAL STEP - OCR TYPO CORRECTION:
          Identify and clean common OCR scanning errors in the medicine names. For example, if you see 'Do1o 650' correct it to 'Dolo 650'. If you see '1isinopri1' correct it to 'Lisinopril'. Standardize spelling of medications.
          
          The JSON format must strictly be:
          {
            "aiSummary": "A very simple, friendly, easy-to-understand 2-3 sentence explanation of what this prescription is for (written for an 80-year old user)",
            "extractedMedicines": [
              {
                "name": "Medicine Name (properly capitalized and corrected for OCR typos)",
                "dosage": "dosage string (e.g. 500mg, 1 tablet)",
                "frequency": "frequency string (must be exactly 'daily', 'twice_daily', or 'weekly')",
                "timings": ["HH:MM", "HH:MM"], // 24hr formatted string timings based on frequency. E.g. twice_daily -> ["08:00", "20:00"]. If frequency is daily in morning -> ["08:00"]. If bedtime -> ["21:00"]
                "beforeAfterFood": "food relationship (must be exactly 'before_food', 'after_food', 'with_food', or 'anytime')"
              }
            ],
            "healthInsights": {
              "sideEffects": ["Short elderly-friendly side effect sentence 1", "sentence 2"],
              "foodPrecautions": ["Food precaution sentence 1 (e.g., take with food, avoid grapefruit)"],
              "interactions": ["Simple drug interaction warning sentences if applicable"]
            }
          }
        `;

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3
        });

        const rawResponse = response.choices[0].message.content.trim();
        // Clean up markdown block format if LLM includes it
        const jsonString = rawResponse.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(jsonString);

        return res.json({
          success: true,
          fileName: docName,
          ...parsed
        });
      } catch (err) {
        console.error('OpenAI Analysis failed, falling back to regex: ', err.message);
      }
    }

    // Local fallback
    const localResult = parseLocalText(text);
    return res.json({
      success: true,
      fileName: docName,
      ...localResult
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error analyzing text', error: error.message });
  }
};

exports.saveReport = async (req, res) => {
  try {
    const { fileName, extractedText, aiSummary, extractedMedicines, healthInsights } = req.body;
    const userId = req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!fileName || !extractedText || !aiSummary) {
      return res.status(400).json({ success: false, message: 'Missing required report fields' });
    }

    if (isDbConnected) {
      const report = new MedicalReport({
        userId,
        fileName,
        extractedText,
        aiSummary,
        extractedMedicines: extractedMedicines || [],
        healthInsights: healthInsights || { sideEffects: [], foodPrecautions: [], interactions: [] }
      });
      await report.save();
      return res.status(201).json({ success: true, report });
    } else {
      // --- Mock-DB Logic ---
      const mockReportId = 'mock_report_' + Math.random().toString(36).substr(2, 9);
      const newReport = {
        id: mockReportId,
        _id: mockReportId,
        userId,
        fileName,
        extractedText,
        aiSummary,
        extractedMedicines: extractedMedicines || [],
        healthInsights: healthInsights || { sideEffects: [], foodPrecautions: [], interactions: [] },
        createdAt: new Date()
      };
      mockDb.medicalReports.push(newReport);
      return res.status(201).json({ success: true, report: newReport });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error saving report history', error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const reports = await MedicalReport.find({ userId }).sort({ createdAt: -1 });
      return res.json({ success: true, reports });
    } else {
      // --- Mock-DB Logic ---
      const reports = mockDb.medicalReports
        .filter(r => r.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ success: true, reports });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving reports history', error: error.message });
  }
};
