// LocalStorage cache keys
const MEDICINES_KEY = 'medicare_offline_medicines';
const REMINDERS_PREFIX = 'medicare_offline_reminders_';
const SYNC_QUEUE_KEY = 'medicare_sync_queue';

export const offlineService = {
  // Medicines Cache
  saveMedicines: (medicines) => {
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
  },
  
  getCachedMedicines: () => {
    const data = localStorage.getItem(MEDICINES_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Reminders Cache
  saveReminders: (dateStr, reminders) => {
    localStorage.setItem(`${REMINDERS_PREFIX}${dateStr}`, JSON.stringify(reminders));
  },

  getCachedReminders: (dateStr) => {
    const data = localStorage.getItem(`${REMINDERS_PREFIX}${dateStr}`);
    return data ? JSON.parse(data) : null;
  },

  // Sync Queue management
  queueStatusUpdate: (logId, status) => {
    const queue = offlineService.getSyncQueue();
    // Check if logId is already in queue; overwrite if so
    const existingIndex = queue.findIndex(item => item.logId === logId);
    
    if (existingIndex !== -1) {
      queue[existingIndex].status = status;
      queue[existingIndex].timestamp = Date.now();
    } else {
      queue.push({ logId, status, timestamp: Date.now() });
    }
    
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  getSyncQueue: () => {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  clearSyncQueue: () => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },

  removeFromQueue: (logId) => {
    const queue = offlineService.getSyncQueue();
    const updated = queue.filter(item => item.logId !== logId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  },

  // Sync queue to server
  syncOfflineData: async (updateStatusAPI) => {
    if (!navigator.onLine) return { synced: false, message: 'Still offline' };

    const queue = offlineService.getSyncQueue();
    if (queue.length === 0) return { synced: true, message: 'Queue empty' };

    console.log(`Syncing ${queue.length} offline updates to server...`);
    const errors = [];

    for (const item of queue) {
      try {
        await updateStatusAPI(item.logId, item.status);
        offlineService.removeFromQueue(item.logId);
      } catch (err) {
        console.error(`Failed to sync log ${item.logId}:`, err.message);
        errors.push(item.logId);
      }
    }

    if (errors.length > 0) {
      return { synced: false, message: `Failed to sync ${errors.length} items`, errors };
    }

    return { synced: true, message: 'All items synced successfully' };
  }
};
