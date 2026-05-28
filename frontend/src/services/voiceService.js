// Web Speech API wrapper for speech recognition and synthesis

// Speech Synthesis (Text-to-Speech)
export const speak = (text, lang = 'en', rate = 0.85) => {
  // Check if voice assistant is globally disabled in localStorage
  if (localStorage.getItem('medicare_voice_assistant') === 'off') {
    return;
  }

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speaking
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language
  if (lang === 'es') {
    utterance.lang = 'es-ES';
  } else if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-US';
  }

  // Slower rate for elderly users
  utterance.rate = rate; 

  window.speechSynthesis.speak(utterance);
};

// Speech Recognition (Speech-to-Text)
export const getSpeechRecognition = () => {
  // Check if voice assistant is globally disabled in localStorage
  if (localStorage.getItem('medicare_voice_assistant') === 'off') {
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported in this browser.');
    return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  
  return recognition;
};

// Standard Command Parser
export const parseCommand = (transcript, lang = 'en') => {
  const text = transcript.toLowerCase().trim();
  console.log('Voice Command received:', text);

  // English Commands
  if (lang === 'en') {
    if (text.includes('show medicine') || text.includes('view medicine') || text.includes('open medicine')) {
      return { command: 'SHOW_MEDICINES' };
    }
    if (text.includes('did i take') || text.includes('have i taken') || text.includes('medicine status')) {
      return { command: 'CHECK_STATUS' };
    }
    if (text.includes('call caregiver') || text.includes('sos') || text.includes('emergency') || text.includes('help me')) {
      return { command: 'TRIGGER_SOS' };
    }
    if (text.includes('open chatbot') || text.includes('ask ai') || text.includes('talk to ai')) {
      return { command: 'OPEN_CHATBOT' };
    }
    if (text.includes('go home') || text.includes('show dashboard') || text.includes('open dashboard')) {
      return { command: 'SHOW_DASHBOARD' };
    }
  }

  // Spanish Commands
  if (lang === 'es') {
    if (text.includes('mostrar medicina') || text.includes('ver medicina') || text.includes('mis medicinas')) {
      return { command: 'SHOW_MEDICINES' };
    }
    if (text.includes('ya tomé') || text.includes('tome mi medicina') || text.includes('estado de medicina')) {
      return { command: 'CHECK_STATUS' };
    }
    if (text.includes('llamar cuidador') || text.includes('emergencia') || text.includes('auxilio') || text.includes('ayuda')) {
      return { command: 'TRIGGER_SOS' };
    }
    if (text.includes('abrir chatbot') || text.includes('hablar con ia')) {
      return { command: 'OPEN_CHATBOT' };
    }
    if (text.includes('ir a inicio') || text.includes('ver tablero') || text.includes('inicio')) {
      return { command: 'SHOW_DASHBOARD' };
    }
  }

  // Hindi Commands
  if (lang === 'hi') {
    if (text.includes('दवा दिखाओ') || text.includes('दवाइयां') || text.includes('दवा देखो')) {
      return { command: 'SHOW_MEDICINES' };
    }
    if (text.includes('क्या मैंने दवा ली') || text.includes('दवा खा ली') || text.includes('दवा का स्टेटस')) {
      return { command: 'CHECK_STATUS' };
    }
    if (text.includes('सहायता') || text.includes('मदद करो') || text.includes('इमरजेंसी') || text.includes('केयरगिवर को बुलाओ')) {
      return { command: 'TRIGGER_SOS' };
    }
    if (text.includes('चैटबॉट खोलो') || text.includes('एआई से बात')) {
      return { command: 'OPEN_CHATBOT' };
    }
    if (text.includes('होम पर जाओ') || text.includes('डैशबोर्ड खोलो')) {
      return { command: 'SHOW_DASHBOARD' };
    }
  }

  return { command: 'UNKNOWN', text };
};
