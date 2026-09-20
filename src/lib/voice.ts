/**
 * Spoken directions using the phone's built-in text-to-speech. No account, no download, no cost.
 * Phones only allow speech after the user has tapped something, so call `primeVoice()` from the tap
 * that starts a walk.
 */

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const PREF_KEY = 'pawfleet_voice';
const native = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export const voiceSupported = (): boolean =>
  native() || (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');

export const getVoicePref = (): boolean => {
  try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
};

export const setVoicePref = (on: boolean) => {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
  if (!on) stopSpeaking();
};

function pickVoice(): SpeechSynthesisVoice | null {
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null;
  return list.find(v => /^en[-_](ZM|ZA|GB)/i.test(v.lang)) ?? list.find(v => /^en/i.test(v.lang)) ?? null;
}

/** Say something now. By default it cuts off whatever was being said, so directions never queue up late. */
export function speak(text: string, opts: { interrupt?: boolean } = {}) {
  if (!voiceSupported() || !text) return;
  if (native()) {
    // The phone's own speech engine keeps working with the screen off; the browser one does not.
    TextToSpeech.speak({ text, lang: 'en-GB', rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient', queueStrategy: opts.interrupt === false ? 1 : 0 }).catch(() => {});
    return;
  }
  try {
    const synth = window.speechSynthesis;
    if (opts.interrupt !== false) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-GB'; }
    u.rate = 0.98;
    u.volume = 1;
    synth.speak(u);
  } catch { /* speech blocked or unavailable */ }
}

export function stopSpeaking() {
  if (!voiceSupported()) return;
  if (native()) { TextToSpeech.stop().catch(() => {}); return; }
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

/** Unlock speech from inside a tap handler. */
export function primeVoice(text = 'Voice directions on') {
  speak(text);
}
