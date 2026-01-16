import { loadDb, saveDb } from '../models/webhookLogModel.js';

let ioRef = null;

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const setSocketIo = io => {
  ioRef = io;
};

export const getWebhookSettings = (req, res, next) => {
  try {
    const db = loadDb();
    res.status(200).json({ enabled: db.enabled });
  } catch (error) {
    next(error);
  }
};

export const updateWebhookSettings = (req, res, next) => {
  try {
    const db = loadDb();
    const body = req.body || {};
    const enabled =
      typeof body.enabled === 'boolean' ? body.enabled : db.enabled ?? true;
    db.enabled = enabled;
    saveDb(db);
    res.status(200).json({ enabled });
  } catch (error) {
    next(error);
  }
};

export const getWebhookLogs = (req, res, next) => {
  try {
    const db = loadDb();
    res.status(200).json({ logs: db.logs || [] });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = (req, res, next) => {
  try {
    const payload = req.body ?? {};
    console.log('Webhook received!');
    console.log(JSON.stringify(payload, null, 2));

    const db = loadDb();

    const eventRaw =
      (payload && typeof payload.event === 'string' && payload.event) ||
      (payload && typeof payload.type === 'string' && payload.type) ||
      'unknown';

    const deviceId =
      payload && typeof payload.device_id === 'string'
        ? payload.device_id
        : undefined;

    let preview = '';
    try {
      const p =
        payload &&
        payload.payload &&
        typeof payload.payload === 'object' &&
        payload.payload !== null
          ? payload.payload
          : null;
      if (p && typeof p.body === 'string') {
        preview = p.body.slice(0, 120);
      } else if (p && typeof p.text === 'string') {
        preview = p.text.slice(0, 120);
      } else {
        preview = JSON.stringify(payload).slice(0, 120);
      }
    } catch {
      preview = '';
    }

    const logEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      event: eventRaw,
      device_id: deviceId,
      preview,
    };

    const logs = Array.isArray(db.logs) ? db.logs : [];
    logs.unshift(logEntry);
    db.logs = logs.slice(0, 5000);
    saveDb(db);

    if (db.enabled !== false && ioRef) {
      ioRef.emit('gowa-event', payload);
    }

    res.status(200).json({ status: 'received' });
  } catch (error) {
    next(error);
  }
};
