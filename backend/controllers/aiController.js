const { OpenAI } = require('openai');
const ReminderLog = require('../models/ReminderLog');
const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Resilient habit analyzer checking database connection state
const analyzeHabitsFromDB = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
  const isDbConnected = mongoose.connection.readyState === 1;

  let logs = [];

  if (isDbConnected) {
    logs = await ReminderLog.find({
      userId,
      date: { $gte: startDateStr }
    }).populate('medicineId');
  } else {
    // --- Mock-DB Logic ---
    logs = mockDb.reminderLogs
      .filter(l => l.userId === userId && l.date >= startDateStr)
      .map(log => {
        const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
        return {
          ...log,
          medicineId: medicine || null
        };
      });
  }

  const total = logs.length;
  const missedLogs = logs.filter(l => l.status === 'missed');
  const takenLogs = logs.filter(l => l.status === 'taken');

  const medicineMisses = {};
  const timingMisses = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };

  missedLogs.forEach(log => {
    if (log.medicineId) {
      const name = log.medicineId.name;
      medicineMisses[name] = (medicineMisses[name] || 0) + 1;
    }

    if (log.time) {
      const hour = parseInt(log.time.split(':')[0], 10);
      if (hour >= 5 && hour < 12) timingMisses.morning++;
      else if (hour >= 12 && hour < 17) timingMisses.afternoon++;
      else if (hour >= 17 && hour < 22) timingMisses.evening++;
      else timingMisses.night++;
    }
  });

  let worstTiming = 'None';
  let maxMisses = 0;
  Object.keys(timingMisses).forEach(period => {
    if (timingMisses[period] > maxMisses) {
      maxMisses = timingMisses[period];
      worstTiming = period;
    }
  });

  return {
    total,
    taken: takenLogs.length,
    missed: missedLogs.length,
    medicineMisses,
    timingMisses,
    worstTiming,
    complianceRate: total > 0 ? Math.round((takenLogs.length / total) * 100) : 100
  };
};

// Smart Local NLP Fallback Responder
const getSmartFallbackAnswer = (question) => {
  const query = question.toLowerCase();
  
  let symptomInfo = "";
  let exerciseInfo = "";
  let foodInfo = "";
  let operationalInfo = "";
  let emergencyInfo = "";

  // 1. Symptom Mappings
  if (query.includes('throat') || query.includes('cough') || query.includes('sore')) {
    symptomInfo = "🩺 For throat discomfort or coughing: Rest, stay warm, and drink warm fluids like honey tea or warm water. Avoid cold beverages.";
  } else if (query.includes('cold') || query.includes('flu') || query.includes('fever') || query.includes('temperature')) {
    symptomInfo = "🤒 For cold or fever: Sufficient bed rest is crucial. Monitor your temperature and verify if you have cold medications scheduled on your dashboard.";
  } else if (query.includes('pain') || query.includes('hurt') || query.includes('headache') || query.includes('ache')) {
    symptomInfo = "💊 For body aches or headache: Check if any prescribed pain relievers (like Acetaminophen or Aspirin) are scheduled. Avoid self-medicating with unprescribed pills.";
  } else if (query.includes('dizzy') || query.includes('sick') || query.includes('nausea')) {
    symptomInfo = "⚠️ Feeling dizzy or sick: Sit or lie down immediately to prevent falling. Let your caregiver know so they can watch over you.";
  }

  // 2. Exercise & Weight Mappings
  if (query.includes('exercise') || query.includes('workout') || query.includes('move') || query.includes('activity')) {
    exerciseInfo = "🚶 For seniors, safe and gentle exercises include a 15-20 minute daily walk, light seated stretches, or water aerobics. Avoid lifting heavy weights or strenuous workouts.";
  }
  if (query.includes('weight') || query.includes('gain') || query.includes('lose') || query.includes('diet')) {
    const weightPrefix = query.includes('gain') ? "⚖️ Regarding weight gain: " : "⚖️ Regarding weight management: ";
    exerciseInfo = weightPrefix + "Focus on balanced meals, staying well-hydrated, and gentle daily activities like walking or light yoga. Please discuss any sudden weight changes with your doctor.";
  }

  // 3. Food Mappings
  if (query.includes('food') || query.includes('eat') || query.includes('before') || query.includes('after') || query.includes('meal')) {
    foodInfo = "🍽️ Food rules: 'Before Food' medicines should be taken 30-60 minutes before meals on an empty stomach. 'After Food' medicines should be taken with or after meals to prevent stomach irritation.";
  }

  // 4. Operational Mappings
  if (query.includes('miss') || query.includes('forgot') || query.includes('skip') || query.includes('double')) {
    operationalInfo = "📝 Missed doses: Generally, if it's close to the next scheduled dose, skip the missed one. Never take a double dose to catch up. Let your caregiver know.";
  }

  // 5. Emergency Mappings
  if (query.includes('caregiver') || query.includes('call') || query.includes('sos') || query.includes('emergency') || query.includes('help')) {
    emergencyInfo = "🚨 Emergency: If you need immediate assistance, click the red EMERGENCY SOS button on your screen or say 'Call caregiver' to sound the alarm and share your live coordinates.";
  }

  // Assemble dynamic response
  const parts = [];
  if (symptomInfo) parts.push(symptomInfo);
  if (exerciseInfo) parts.push(exerciseInfo);
  if (foodInfo) parts.push(foodInfo);
  if (operationalInfo) parts.push(operationalInfo);
  if (emergencyInfo) parts.push(emergencyInfo);

  // Default fallback if no keywords match
  if (parts.length === 0) {
    return "Hello! I am your MediCare AI helper. You can ask me questions about your medicine rules (before/after food), what to do if you miss a dose, senior exercises, body aches, throat symptoms, or how to contact your caregiver. How can I help you today?";
  }

  // Combined Warning note
  if (symptomInfo && exerciseInfo) {
    parts.push("⚠️ Caution: Since you are currently experiencing symptoms (like throat discomfort), please prioritize rest and recover fully before engaging in any physical exercises.");
  }

  return parts.join("\n\n");
};

exports.getHabitAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await analyzeHabitsFromDB(userId);

    if (stats.total === 0) {
      return res.json({
        success: true,
        analysis: "We don't have enough medication logs to analyze your habits yet. Please record your daily medicines, and MediCare AI will generate custom insights for you!"
      });
    }

    const promptContext = `
      You are MediCare AI, a gentle health assistant. Analyze the user's medication compliance for the last 30 days:
      - Compliance rate: ${stats.complianceRate}%
      - Total scheduled doses: ${stats.total}
      - Missed doses: ${stats.missed}
      - Missed doses by time of day: Morning: ${stats.timingMisses.morning}, Afternoon: ${stats.timingMisses.afternoon}, Evening: ${stats.timingMisses.evening}, Night: ${stats.timingMisses.night}
      - Missed counts per medicine: ${JSON.stringify(stats.medicineMisses)}
      - Time of day they miss the most: ${stats.worstTiming}

      Generate a brief, elderly-friendly report (3-4 sentences). Summarize their compliance, identify their main failure points, and offer 1 practical friendly suggestion. Keep tone warm, encouraging, and easy to read.
    `;

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: promptContext }],
          max_tokens: 250,
          temperature: 0.7
        });
        return res.json({
          success: true,
          stats,
          analysis: response.choices[0].message.content.trim()
        });
      } catch (err) {
        console.error('OpenAI Error, falling back to local insight:', err.message);
      }
    }

    let fallbackAnalysis = `Your medication compliance rate over the past 30 days is **${stats.complianceRate}%**. `;
    if (stats.missed === 0) {
      fallbackAnalysis += `Outstanding work! You have taken all your scheduled medications on time. Keep up this healthy routine!`;
    } else {
      fallbackAnalysis += `You have missed **${stats.missed}** doses. We noticed that you tend to miss doses most frequently during the **${stats.worstTiming}** period. `;
      
      const mostMissedMed = Object.entries(stats.medicineMisses).sort((a, b) => b[1] - a[1])[0];
      if (mostMissedMed) {
        fallbackAnalysis += `The medicine you miss most is **${mostMissedMed[0]}** (${mostMissedMed[1]} times). `;
      }

      fallbackAnalysis += `*Recommendation:* Try placing your ${stats.worstTiming} medications close to an object you use daily at that time, such as your dinner plate or nightstand, or enable voice alerts!`;
    }

    res.json({
      success: true,
      stats,
      analysis: fallbackAnalysis
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error generating habit analysis', error: error.message });
  }
};

exports.askChatbot = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    const systemPrompt = `
      You are "MediCare AI", a friendly, empathetic virtual medical assistant for elderly patients. 
      - Answer their question in a simple, clear, reassuring manner.
      - Use simple words and short sentences.
      - DO NOT prescribe new drugs, change dosages, or offer definitive medical diagnoses.
      - Always advise consulting their doctor or caregiver for serious issues.
    `;

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          max_tokens: 300,
          temperature: 0.5
        });
        return res.json({
          success: true,
          answer: response.choices[0].message.content.trim()
        });
      } catch (err) {
        console.error('OpenAI Chat Error, falling back to local chatbot:', err.message);
      }
    }

    // Call the dynamic Local NLP fallback responder
    const answer = getSmartFallbackAnswer(question);

    res.json({
      success: true,
      answer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error from chatbot', error: error.message });
  }
};
