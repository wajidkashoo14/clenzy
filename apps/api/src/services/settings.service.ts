import type { PublicSettings, UpdateSettingsInput } from '@clenzy/shared';
import { publicSettingsSchema } from '@clenzy/shared';
import {
  Settings,
  SETTINGS_DEFAULTS,
  SETTINGS_ID,
  type SettingsDocument,
} from '../models/Settings.js';
import { logAudit } from './auditLog.service.js';

interface Actor {
  id: string;
  role: string;
}

/** Read on nearly every request once consumers exist — see docs/DATABASE.md "settings". */
const CACHE_TTL_MS = 60_000;
let cached: { doc: SettingsDocument; expiresAt: number } | null = null;

async function loadSettings(): Promise<SettingsDocument> {
  const existing = await Settings.findById(SETTINGS_ID).lean();
  if (existing) return existing;
  const created = await Settings.findByIdAndUpdate(
    SETTINGS_ID,
    { $setOnInsert: { _id: SETTINGS_ID, ...SETTINGS_DEFAULTS } },
    { upsert: true, new: true },
  ).lean();
  return created;
}

/** Cached for 60s — call `invalidateSettingsCache()` after a write. */
export async function getSettings(): Promise<SettingsDocument> {
  if (cached && cached.expiresAt > Date.now()) return cached.doc;
  const doc = await loadSettings();
  cached = { doc, expiresAt: Date.now() + CACHE_TTL_MS };
  return doc;
}

function invalidateSettingsCache(): void {
  cached = null;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const settings = await getSettings();
  return publicSettingsSchema.parse(settings);
}

export async function updateSettings(
  actor: Actor,
  input: UpdateSettingsInput,
): Promise<SettingsDocument> {
  const before = await loadSettings();
  const updated = await Settings.findByIdAndUpdate(
    SETTINGS_ID,
    { $set: input },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  invalidateSettingsCache();

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'settings.update',
    entityType: 'Settings',
    entityId: SETTINGS_ID,
    before,
    after: updated,
  });
  return updated;
}
