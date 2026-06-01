export const speak = (text, lang = 'en', speed = 0.85) => {
  if (!('speechSynthesis' in window)) return;

  // Check if voice assistant is active in localStorage
  const voiceAssistant = localStorage.getItem('medicare_voice_assistant');
  // If explicitly disabled, don't speak
  if (voiceAssistant === 'off') {
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language
  if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-US';
  }

  // Set speed/rate
  utterance.rate = speed;

  // Retrieve saved custom voice
  const savedVoiceName = localStorage.getItem('medicare_voice_name');
  const voices = window.speechSynthesis.getVoices();
  
  if (savedVoiceName) {
    const selectedVoice = voices.find(v => v.name === savedVoiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  } else {
    // Default fallback to natural/pleasant English or Hindi voice
    if (lang === 'hi') {
      const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi') || v.lang.startsWith('hi'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      // Find a pleasant English voice
      const pleasantVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') || 
        v.name.includes('Zira') ||
        v.name.includes('Hazel') ||
        (v.lang.startsWith('en') && v.name.includes('Natural'))
      );
      if (pleasantVoice) utterance.voice = pleasantVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
};
