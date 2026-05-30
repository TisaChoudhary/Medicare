# MediCare AI - Medical Reminder System

MediCare AI is a full-stack, voice-enabled, AI-powered medical reminder application designed specifically for elderly users and their caregivers. It features a modern, high-contrast, large-font user interface with complete speech synthesis, spoken voice commands, live offline support, automated stock tracking, and personalized AI health assistant summaries.

---

## 🌟 Key Features

1. **Elderly-Friendly UI**: High-contrast contrast palettes, large touch buttons, legible typography (Google Fonts Outfit), and direct tab navigation. Supports a strict Dark and Light theme optimized to reduce strain.
2. **Web Speech API & Voice Assistant Toggle**: 
   - **Voice commands** ("Show medicines", "Did I take medicine", "Open chatbot", "Go home") supported in English, Spanish, and Hindi.
   - **Speech synthesis** readouts for prompts, intake checklists, and alarms.
   - **Voice Toggle Switch**: A global switch in settings to completely turn ON/OFF voice synthesis and listening overlays.
3. **AI Prescription Analyzer & OCR**:
   - **Client-Side OCR**: Uses `tesseract.js` to parse text locally from PNG/JPG image uploads.
   - **AI Simplified Summary**: Translates doctor prescriptions, blood test results, and reports into layperson terms, extracting medication timings, dosages, warning interactions, and side effects.
   - **One-Click Reminder Integration**: Add extracted medicines directly to your daily scheduler with a single button.
4. **Firebase Push Notifications**: Receives immediate warnings on caregiver dashboards for missed medication habits.
5. **Caregiver Portal**: Allows link authorization using patient emails, today's compliance summaries, and remaining medicine stocks.
6. **AI Insights & Habit Chatbot**: Powered by OpenAI with fail-safe rule engines calculating 30-day compliance percentages and period-based failures (e.g. morning vs evening skips).
7. **Robust Offline Support**: LocalStorage queue that caches medication checklists offline and auto-syncs changes when internet connection is restored.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios, `tesseract.js` (OCR).
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Firebase Admin SDK.
- **Authentication**: JWT token authorization.
- **Voice APIs**: HTML5 Speech Synthesis and Speech Recognition.
- **AI Integrations**: OpenAI API (gpt-3.5-turbo).

---

## 📁 Project Directory Structure

```text
├── backend/
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── authController.js
│   │   ├── caregiverController.js
│   │   ├── medicalReportController.js
│   │   ├── medicineController.js
│   │   └── reminderController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── MedicalReport.js
│   │   ├── Medicine.js
│   │   ├── ReminderLog.js
│   │   ├── User.js
│   │   └── mockDb.js
│   ├── routes/
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── caregiver.js
│   │   ├── medicalReports.js
│   │   ├── medicines.js
│   │   └── reminders.js
│   ├── .env.example
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Chatbot.jsx
    │   │   ├── MedicineCard.jsx
    │   │   └── VoiceAssistant.jsx
    │   ├── pages/
    │   │   ├── CaregiverDashboard.jsx
    │   │   ├── ElderlyDashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── MedicineManager.jsx
    │   │   ├── PrescriptionAnalyzer.jsx
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
   - Customize connection URIs, PORT, and add your API keys:
     ```env
     PORT=5000
     MONGO_URI=mongodb://localhost:27017/medicare-ai
     JWT_SECRET=medicare_default_secret
     OPENAI_API_KEY=your_openai_api_key_here
     FIREBASE_SERVICE_ACCOUNT_PATH=path_to_firebase_service_account.json
     ```
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

To toggle listening, click the **large green microphone button** in the bottom-right corner. It will say *"How can I help you?"* and display a *"Listening..."* bubble. (Note: The floating mic overlay is hidden if the Voice Assistant is toggled OFF in settings).

| Command | Action Performed | Supported Languages |
| :--- | :--- | :--- |
| **"Show medicines"** | Navigates to the medicine listing manager. | English, Spanish, Hindi |
| **"Did I take medicine?"** | Analyzes today's checklist and reads compliance progress out loud. | English, Spanish, Hindi |
| **"Open chatbot"** | Opens the conversational AI chat interface. | English, Spanish, Hindi |
| **"Go home"** | Navigates back to the main patient dashboard. | English, Spanish, Hindi |

---

## 📡 API Reference Endpoints

All endpoints (except auth routes) require standard JWT token validation headers in format `Authorization: Bearer <JWT_Token>`.

### Authentication Router (`/api/auth`)
- `POST /signup` : Create patient or caregiver accounts.
- `POST /login` : Authenticate credentials and return token payloads.
- `GET /me` : Fetch the logged-in user profile.
- `PUT /preferences` : Update language values, dark/light theme, and voice assistant toggle state.

### Medicines Router (`/api/medicines`)
- `POST /` : Create a medicine configuration (supports base64 prescription file uploads).
- `GET /` : Retrieve active medications.
- `GET /:id` : Retrieve specific medicine information.
- `PUT /:id` : Update details or top-up stocks.
- `DELETE /:id` : Perform soft deletes to protect history logs.

### Reminders Router (`/api/reminders`)
- `GET /today` : Retrieve daily medicine checklists. Auto-generates log templates if missing.
- `PUT /status/:logId` : Mark as `taken`, `missed`, or `snoozed`. Decrements stock on taken updates.
- `GET /history` : Fetch historical records.
- `GET /summary` : Calculate weekly percentage metrics and stock threshold alerts.

### AI Assistant Router (`/api/ai`)
- `GET /analysis` : Calculate compliance stats and return OpenAI insights or rule templates.
- `POST /chat` : Ask health assistance questions.

### Medical Reports Router (`/api/reports`)
- `POST /analyze` : Send extracted prescription/report text for AI summary generation and timing extraction.
- `POST /save` : Save analyzed report data to user's history log.
- `GET /` : Retrieve all past report histories for the user.

---

## 📝 Changelog

### v1.2.0 (Latest Release)
* **SOS Panic Feature Removal**: Wiped emergency SOS controllers, routes, models, frontend widgets, layout elements, and voice command actions from the project repository.
* **Continuous Assistant Toggle**: Created toggle options inside floating mic cards enabling continuous listening.

### v1.1.0
* **AI Prescription Analyzer**: Added client-side OCR text extraction using `tesseract.js` and a PDF scanning pipeline. Connects to backend endpoints and OpenAI to output simplified summaries, side effects, and pre-formatted reminder scheduling cards.
* **Global Voice Toggle setting**: Added toggle switches to Settings allowing users to disable the speech engine, which silences synthesis feedback and hides the speech listening overlays.
* **Theme System Correction**: Fixed CSS binding bugs that inverted light and dark themes. Redesigned all inputs, cards, and text styling following minimal Notion and ChatGPT themes.
* **Prescription Upload Mappings**: Supported adding base64 documents directly to medication entries.
