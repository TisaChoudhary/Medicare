# MediCare AI - Medical Reminder System

MediCare AI is a full-stack, voice-enabled, AI-powered medical reminder application designed specifically for elderly users and their caregivers. It features a modern, high-contrast, large-font user interface with complete speech synthesis, spoken voice commands, live offline support, automated stock tracking, emergency SOS alerts, and personalized AI health assistant summaries.

---

## 🌟 Key Features

1. **Elderly-Friendly UI**: High-contrast contrast palettes, large touch buttons, legible typography (Google Fonts Outfit), and direct tab navigation.
2. **Web Speech API integration**: 
   - **Voice commands** ("Show medicines", "Did I take medicine", "Call caregiver") supported in English, Spanish, and Hindi.
   - **Speech synthesis** readouts for prompts, intake checklists, and alarms.
3. **Emergency SOS System**: One-click distress alarm that sounds a synthetic siren using Web Audio API, retrieves coordinates via the Geolocation API, and registers active logs for caregiver supervision.
4. **Caregiver Portal**: Allows link authorization using patient emails, today's compliance summaries, active SOS map navigation, and remaining medicine stocks.
5. **AI Insights & Habit Chatbot**: Powered by OpenAI with fail-safe rule engines calculating 30-day compliance percentages and period-based failures (e.g. morning vs evening skips).
6. **Robust Offline Support**: LocalStorage queue that caches medication checklists offline and auto-syncs changes when internet connection is restored.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose).
- **Authentication**: JWT token authorization.
- **Voice APIs**: HTML5 Speech Synthesis and Speech Recognition.
- **SOS Alarms**: HTML5 Geolocation API, Web Audio API synthesizer.

---

## 📁 Project Directory Structure

```text
├── backend/
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── authController.js
│   │   ├── caregiverController.js
│   │   ├── medicineController.js
│   │   ├── reminderController.js
│   │   └── sosController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── EmergencyAlert.js
│   │   ├── Medicine.js
│   │   ├── ReminderLog.js
│   │   └── User.js
│   ├── routes/
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── caregiver.js
│   │   ├── medicines.js
│   │   ├── reminders.js
│   │   └── sos.js
│   ├── .env.example
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Chatbot.jsx
    │   │   ├── EmergencySOS.jsx
    │   │   ├── MedicineCard.jsx
    │   │   └── VoiceAssistant.jsx
    │   ├── pages/
    │   │   ├── CaregiverDashboard.jsx
    │   │   ├── ElderlyDashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── MedicineManager.jsx
    │   │   ├── Settings.jsx
    │   │   └── Signup.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   ├── offlineService.js
    │   │   ├── translations.js
    │   │   └── voiceService.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── package.json
```

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- Node.js (version 16 or above)
- MongoDB instance running locally (port 27017) or a MongoDB Atlas connection string.

### 1. Backend Server Setup
1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the server dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Customize connection URIs, PORT, and add your `OPENAI_API_KEY` (if using OpenAI services).
4. Run the server:
   ```bash
   npm start
   ```
   The backend should launch on port `5000`.

### 2. Frontend React Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the UI packages:
   ```bash
   npm install
   ```
3. Start the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```
   The frontend should launch on port `5173`. Open `http://localhost:5173` in your browser.

---

## 🗣️ Supported Voice Commands

To toggle listening, click the **large yellow microphone button** in the bottom-right corner. It will say *"How can I help you?"* and display a *"Listening..."* bubble.

| Command | Action Performed | Supported Languages |
| :--- | :--- | :--- |
| **"Show medicines"** | Navigates to the medicine listing manager. | English, Spanish, Hindi |
| **"Did I take medicine?"** | Analyzes today's checklist and reads compliance progress out loud. | English, Spanish, Hindi |
| **"Call caregiver"** / **"SOS"** | Sound alarm, fetches GPS coordinate metrics and notifies caregiver. | English, Spanish, Hindi |
| **"Open chatbot"** | Opens the conversational AI chat interface. | English, Spanish, Hindi |
| **"Go home"** | Navigates back to the main patient dashboard. | English, Spanish, Hindi |

---

## 📡 API Reference endpoints

All endpoints (except auth routes) require standard JWT token validation headers in format `Authorization: Bearer <JWT_Token>`.

### Authentication Router (`/api/auth`)
- `POST /signup` : Create patient or caregiver accounts.
- `POST /login` : Authenticate credentials and return token payloads.
- `GET /me` : Fetch the logged-in user profile.
- `PUT /preferences` : Update language values, dark/light theme, and caregiver link mappings.

### Medicines Router (`/api/medicines`)
- `POST /` : Create a medicine configuration.
- `GET /` : Retrieve active medications.
- `GET /:id` : Retrieve specific medicine information.
- `PUT /:id` : Update details or top-up stocks.
- `DELETE /:id` : Perform soft deletes to protect history logs.

### Reminders Router (`/api/reminders`)
- `GET /today` : Retrieve daily medicine checklists. Auto-generates log templates if missing.
- `PUT /status/:logId` : Mark as `taken`, `missed`, or `snoozed`. Decrements stock on taken updates.
- `GET /history` : Fetch historical records.
- `GET /summary` : Calculate weekly percentage metrics and stock threshold alerts.

### SOS Emergency Router (`/api/sos`)
- `POST /trigger` : Log active emergency flags and coordinates.
- `GET /active` : List pending SOS signals (filtered by links).
- `PUT /resolve/:alertId` : Resolve and dismiss active SOS.

### AI Assistant Router (`/api/ai`)
- `GET /analysis` : Calculate compliance stats and return OpenAI insights or rule templates.
- `POST /chat` : Ask health assistance questions.
