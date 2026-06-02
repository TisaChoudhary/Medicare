// Import and configure the Firebase SDK inside the service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
try {
  firebase.initializeApp({
    messagingSenderId: "1234567890" // Placeholder, replaced during runtime if custom FCM keys are configured
  });

  const messaging = firebase.messaging();

  // Customize background notifications
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title || 'Medicine Reminder';
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/vite.svg',
      data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.log('Firebase background messaging setup ignored or failed:', err.message);
}

// Simple fallback for native web push notification events
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Native push event received:', payload);
      const title = payload.title || '💊 Medicine Reminder';
      const options = {
        body: payload.body || 'Time to take your medication',
        icon: '/vite.svg',
        actions: [
          { action: 'taken', title: 'Mark as Taken' },
          { action: 'snooze', title: 'Snooze 10m' }
        ],
        data: payload.data || {}
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const text = event.data.text();
      console.log('Plaintext push event received:', text);
      const options = {
        body: text,
        icon: '/vite.svg'
      };
      event.waitUntil(self.registration.showNotification('💊 Medicine Reminder', options));
    }
  }
});

// Handle notification button clicks (Taken / Snooze)
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  const action = event.action;
  const notification = event.notification;
  notification.close();

  if (!action) return;

  const logId = notification.data ? notification.data.logId : null;
  const actionToken = notification.data ? notification.data.actionToken : null;
  if (!logId) return;

  const API_URL = 'http://localhost:5000/api';
  event.waitUntil(
    fetch(`${API_URL}/reminders/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logId, action, actionToken })
    })
    .then(res => res.json())
    .then(data => {
      console.log('Action successfully registered:', data);
    })
    .catch(err => {
      console.error('Failed to post background action:', err);
    })
  );
});
