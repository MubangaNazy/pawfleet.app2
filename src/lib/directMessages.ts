import { useEffect, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Inbox for person-to-person chat. Loads every conversation the signed-in user is part of,
 * keeps it live, and tracks what has been read on this device.
 */

export interface DmRow { id: string; conversation_id: string; sender_id: string; text: string; created_at: string }
export interface Conversation { otherId: string; last: DmRow; unread: number }
export interface InboxState { conversations: Conversation[]; unreadTotal: number; loaded: boolean }

let uid = '';
let rows: DmRow[] = [];
let readMap: Record<string, string> = {};
let snapshot: InboxState = { conversations: [], unreadTotal: 0, loaded: false };
let loaded = false;
let channel: RealtimeChannel | null = null;
let poll: ReturnType<typeof setInterval> | null = null;
let users = 0;
const listeners = new Set<() => void>();

const readKey = () => `pawfleet_dm_read_${uid}`;
// Conversation ids are "<uuid>_<uuid>" (sorted), and uuids contain no underscores.
const otherOf = (r: DmRow) => r.conversation_id.split('_').find(p => p !== uid) ?? '';

function recompute() {
  const byOther = new Map<string, DmRow[]>();
  rows.forEach(r => {
    const o = otherOf(r);
    if (!o) return;
    (byOther.get(o) ?? byOther.set(o, []).get(o)!).push(r);
  });
  const conversations: Conversation[] = [];
  let unreadTotal = 0;
  byOther.forEach((list, otherId) => {
    const lastRead = readMap[otherId] ?? '';
    const unread = list.filter(r => r.sender_id !== uid && r.created_at > lastRead).length;
    const last = list.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
    conversations.push({ otherId, last, unread });
    unreadTotal += unread;
  });
  conversations.sort((a, b) => (a.last.created_at < b.last.created_at ? 1 : -1));
  snapshot = { conversations, unreadTotal, loaded };
  listeners.forEach(f => f());
}

export async function refreshDirectMessages() {
  if (!uid) return;
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id,conversation_id,sender_id,text,created_at')
    .like('conversation_id', `%${uid}%`)
    .order('created_at', { ascending: false })
    .limit(400);
  if (error) { console.warn('inbox load:', error.message); return; }
  rows = data ?? [];
  loaded = true;
  recompute();
}

/** Mark a conversation read up to its newest message (or `upTo`, if the open chat knows a newer time). */
export function markDirectRead(otherId: string, upTo?: string) {
  if (!uid || !otherId) return;
  const newest = rows.filter(r => otherOf(r) === otherId).reduce((m, r) => (r.created_at > m ? r.created_at : m), '');
  const stamp = [readMap[otherId] ?? '', newest, upTo ?? ''].reduce((a, b) => (a > b ? a : b));
  if (!stamp || stamp === readMap[otherId]) return;
  readMap = { ...readMap, [otherId]: stamp };
  try { localStorage.setItem(readKey(), JSON.stringify(readMap)); } catch { /* private mode */ }
  recompute();
}

function start(userId: string) {
  if (uid !== userId) {
    stop(true);
    uid = userId;
    rows = []; loaded = false;
    try { readMap = JSON.parse(localStorage.getItem(readKey()) || '{}'); } catch { readMap = {}; }
  }
  refreshDirectMessages();
  if (!channel) {
    channel = supabase.channel(`dm-inbox-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        const r = payload.new as DmRow;
        if (!r?.conversation_id?.includes(uid) || rows.some(x => x.id === r.id)) return;
        rows = [r, ...rows];
        recompute();
      })
      .subscribe();
  }
  // Safety net in case realtime is not enabled for this table.
  if (!poll) poll = setInterval(refreshDirectMessages, 30_000);
}

function stop(force = false) {
  if (!force && users > 0) return;
  if (channel) { supabase.removeChannel(channel); channel = null; }
  if (poll) { clearInterval(poll); poll = null; }
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => snapshot;

/** Live list of conversations plus the total unread count. */
export function useDirectInbox(userId: string | undefined): InboxState {
  useEffect(() => {
    if (!userId) return;
    users++;
    start(userId);
    return () => { users--; stop(); };
  }, [userId]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
