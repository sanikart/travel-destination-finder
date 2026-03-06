import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { SavedDestination } from '@/lib/types';

const SAVED_FILE = path.join(process.cwd(), '.logs', 'saved-destinations.json');
const CLICK_FILE = path.join(process.cwd(), '.logs', 'recommendation-clicks.ndjson');

async function ensureLogsDir(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), '.logs'), { recursive: true });
}

export async function readSavedDestinations(): Promise<SavedDestination[]> {
  await ensureLogsDir();
  try {
    const raw = await fs.readFile(SAVED_FILE, 'utf8');
    return JSON.parse(raw) as SavedDestination[];
  } catch {
    return [];
  }
}

export async function writeSavedDestinations(items: SavedDestination[]): Promise<void> {
  await ensureLogsDir();
  await fs.writeFile(SAVED_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export async function appendRecommendationClick(event: Record<string, unknown>): Promise<void> {
  await ensureLogsDir();
  await fs.appendFile(CLICK_FILE, `${JSON.stringify(event)}\n`, 'utf8');
}
