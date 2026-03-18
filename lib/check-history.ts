/**
 * Check Session History — persists results in localStorage + Supabase
 */

import { CheckSession } from '@/types';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'labelcheck_history';

export interface SavedCheckSession {
  id: string;
  productName: string;
  brandId: string;
  brandName: string;
  labelType: '>20ml' | '<20ml';
  volume: string;
  volumeFormatted: string;
  status: 'pass' | 'fail' | 'warning';
  createdAt: string;
  checkedBy: string;
  totalErrors: number;
  totalWarnings: number;
  totalOk: number;
  aiResult: Record<string, unknown>;
  labelFileUrl: string | null;
}

/**
 * Save a check session to localStorage AND Supabase
 */
export function saveCheckSession(session: SavedCheckSession): void {
  if (typeof window === 'undefined') return;

  // 1. Save to localStorage (instant, always works)
  const existing = getCheckSessions();
  existing.unshift(session);
  const trimmed = existing.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  // 2. Save to Supabase (background, fire-and-forget)
  supabase.from('check_sessions').insert({
    id: session.id,
    product_name: session.productName,
    brand_id: session.brandId,
    brand_name: session.brandName,
    label_type: session.labelType,
    volume: session.volume,
    volume_formatted: session.volumeFormatted,
    status: session.status,
    created_at: session.createdAt,
    checked_by: session.checkedBy,
    total_errors: session.totalErrors,
    total_warnings: session.totalWarnings,
    total_ok: session.totalOk,
    ai_result: session.aiResult,
    content_items: session.aiResult?.items || [],
  }).then(({ error }) => {
    if (error) console.warn('Supabase save failed (data is still in localStorage):', error.message);
    else console.log('✅ Check session saved to Supabase');
  });
}

/**
 * Get all saved check sessions from localStorage
 */
export function getCheckSessions(): SavedCheckSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get a single check session by ID
 */
export function getCheckSessionById(id: string): SavedCheckSession | null {
  const sessions = getCheckSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Convert SavedCheckSession to CheckSession (for dashboard compatibility)
 */
export function toCheckSession(saved: SavedCheckSession): CheckSession {
  return {
    id: saved.id,
    productName: saved.productName,
    brandId: saved.brandId,
    brandName: saved.brandName,
    labelType: saved.labelType,
    volume: saved.volume,
    volumeFormatted: saved.volumeFormatted,
    status: saved.status,
    createdAt: saved.createdAt,
    checkedBy: saved.checkedBy,
    labelFileUrl: saved.labelFileUrl || undefined,
    hscbFileUrl: undefined,
    barcodeFileUrl: undefined,
    barcodeResult: undefined,
    contentItems: [],
    totalErrors: saved.totalErrors,
    totalWarnings: saved.totalWarnings,
    totalOk: saved.totalOk,
  };
}
