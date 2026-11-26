import { supabase } from './supabase';
import { prepareImage, uploadDataUrlToStorage } from './image';

// Photos and short updates inside a walk's chat (table `messages`). Both the walker and the owner use
// these, so pickup photos, mid-walk photos and owner photos all land in the same conversation.

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

export async function sendWalkText(walkId: string, senderId: string, text: string): Promise<string | null> {
  const { error } = await supabase.from('messages').insert({ id: newId(), walk_id: walkId, sender_id: senderId, text });
  return error ? error.message : null;
}

/** Shrinks, uploads and posts one photo to the walk chat. Returns the hosted URL. */
export async function sendWalkPhoto(walkId: string, senderId: string, file: File): Promise<{ url?: string; id?: string; error?: string }> {
  try {
    const dataUrl = await prepareImage(file, { maxDim: 1024, quality: 0.8, maxBytes: 260_000 });
    const msgId = newId();
    const hosted = await uploadDataUrlToStorage('chat-images', `${walkId}/${msgId}.jpg`, dataUrl);
    // If storage is unreachable, keep the (small) inline photo rather than lose it.
    const { error } = await supabase.from('messages').insert({ id: msgId, walk_id: walkId, sender_id: senderId, text: hosted || dataUrl });
    if (error) return { error: error.message };
    return { url: hosted || dataUrl, id: msgId };
  } catch {
    return { error: 'That photo could not be sent. Try again.' };
  }
}
