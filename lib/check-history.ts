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
  labelFileUrl?: string;
  hscbFileUrl?: string;
  barcodeFileUrl?: string;
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
    label_file_url: session.labelFileUrl,
    hscb_file_url: session.hscbFileUrl,
    barcode_file_url: session.barcodeFileUrl,
  }).then(({ error }) => {
    if (error) console.warn('Supabase save failed (data is still in localStorage):', error.message);
    else console.log('✅ Check session saved to Supabase');
  });
}

/**
 * Delete a check session by ID from localStorage and Supabase
 */
export async function deleteCheckSession(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Delete from localStorage
  const existing = getCheckSessions();
  const filtered = existing.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  // 2. Delete from Supabase
  try {
    await supabase.from('check_sessions').delete().eq('id', id);
  } catch (error) {
    console.error('Failed to delete from Supabase:', error);
  }
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
 * Get a single check session by ID (localStorage first, then Supabase)
 */
export function getCheckSessionById(id: string): SavedCheckSession | null {
  const sessions = getCheckSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Get a single check session by ID from Supabase
 */
export async function getCheckSessionByIdFromSupabase(id: string): Promise<SavedCheckSession | null> {
  try {
    const { data, error } = await supabase
      .from('check_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return mapSupabaseRow(data);
  } catch {
    return null;
  }
}

/**
 * Get all check sessions from Supabase
 */
export async function getCheckSessionsFromSupabase(): Promise<SavedCheckSession[]> {
  try {
    const { data, error } = await supabase
      .from('check_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map(mapSupabaseRow);
  } catch {
    return [];
  }
}

function mapSupabaseRow(row: Record<string, unknown>): SavedCheckSession {
  return {
    id: row.id as string,
    productName: row.product_name as string,
    brandId: row.brand_id as string,
    brandName: row.brand_name as string,
    labelType: row.label_type as '>20ml' | '<20ml',
    volume: row.volume as string,
    volumeFormatted: row.volume_formatted as string,
    status: row.status as 'pass' | 'fail' | 'warning',
    createdAt: row.created_at as string,
    checkedBy: row.checked_by as string || 'GPT-4o Vision',
    totalErrors: row.total_errors as number || 0,
    totalWarnings: row.total_warnings as number || 0,
    totalOk: row.total_ok as number || 0,
    aiResult: row.ai_result as Record<string, unknown> || {},
    labelFileUrl: row.label_file_url as string,
    hscbFileUrl: row.hscb_file_url as string,
    barcodeFileUrl: row.barcode_file_url as string,
  };
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
    labelFileUrl: saved.labelFileUrl,
    hscbFileUrl: saved.hscbFileUrl,
    barcodeFileUrl: saved.barcodeFileUrl,
    barcodeResult: undefined,
    contentItems: [],
    totalErrors: saved.totalErrors,
    totalWarnings: saved.totalWarnings,
    totalOk: saved.totalOk,
  };
}
