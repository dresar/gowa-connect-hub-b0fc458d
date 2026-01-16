import fs from 'node:fs';
import path from 'node:path';

const dbDir = path.join(process.cwd(), 'db');
const dbFile = path.join(dbDir, 'webhook.json');

const ensureDb = () => {
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile)) {
      const initial = {
        enabled: true,
        logs: [],
      };
      fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Failed to initialize webhook DB:', error);
  }
};

export const loadDb = () => {
  ensureDb();
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (typeof parsed.enabled !== 'boolean') {
      parsed.enabled = true;
    }
    if (!Array.isArray(parsed.logs)) {
      parsed.logs = [];
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read webhook DB, recreating:', error);
    const fallback = { enabled: true, logs: [] };
    try {
      fs.writeFileSync(dbFile, JSON.stringify(fallback, null, 2), 'utf8');
    } catch {
      console.error('Failed to write fallback webhook DB');
    }
    return fallback;
  }
};

export const saveDb = db => {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save webhook DB:', error);
  }
};

