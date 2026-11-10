// AI Health Assistant — POST /api/ai-health-insight   Authorization: Bearer <the owner's own login token>
// body: { text, dogName?, breed?, age?, recentEntries?: { type, content, createdAt }[] }
//
// The Claude API key is server-only (never a VITE_-prefixed var, never shipped to the browser) --
// the previous version of this feature called Gemini directly from the client with a key embedded in
// the public JS bundle, which anyone could pull out and spend your quota with. Gated on just being a
// real logged-in user (not admin-only) so a random script can't hit it for free, same reasoning.

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are PawFleet's friendly AI pet health assistant for dog owners in Zambia. Give a warm, \
helpful response in 2-3 short sentences, under 80 words, no markdown. Clearly say if the symptom needs urgent vet \
attention. You are not a vet and cannot diagnose -- always point toward a real vet for anything serious or uncertain. \
You may be given the dog's breed, age and recent health journal entries for context -- use them only if genuinely \
relevant (e.g. a breed prone to a condition, or a recent entry that connects to what's being asked now); don't \
force a connection that isn't there.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const anon = clean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const apiKey = clean(process.env.ANTHROPIC_API_KEY);
  if (!url || !anon) return res.status(503).json({ error: 'Not configured. Contact support.' });
  if (!apiKey) return res.status(503).json({ error: 'AI assistant is not switched on yet. Please try again later.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please log in again, then try again.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const text = clean(body?.text).slice(0, 1000); // a hard cap — this is a short symptom description, not an essay
  const dogName = clean(body?.dogName).slice(0, 60) || 'their dog';
  const breed = clean(body?.breed).slice(0, 60);
  const age = Number.isFinite(Number(body?.age)) ? Number(body.age) : null;
  const recentEntries = Array.isArray(body?.recentEntries) ? body.recentEntries.slice(0, 5) : [];
  if (!text) return res.status(400).json({ error: 'Describe what you are seeing first.' });

  const contextLines = [
    breed ? `Breed: ${breed}` : null,
    age != null ? `Age: ${age} year${age === 1 ? '' : 's'}` : null,
    recentEntries.length
      ? `Recent journal entries:\n${recentEntries.map(e => `- [${clean(e?.type)}] ${clean(e?.content).slice(0, 150)} (${clean(e?.createdAt).slice(0, 10)})`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n');

  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ error: 'Your login has expired. Please log in again.' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: contextLines
            ? `${contextLines}\n\nA pet owner described their dog ${dogName}'s health observation: "${text}"`
            : `A pet owner described their dog ${dogName}'s health observation: "${text}"`,
        }],
      }),
    });
    const json = await r.json();
    if (!r.ok) {
      console.error('ai-health-insight (Claude):', json);
      return res.status(502).json({ error: 'The AI assistant is unavailable right now. Please try again shortly.' });
    }
    const reply = json.content?.[0]?.text?.trim();
    if (!reply) return res.status(502).json({ error: 'No response from the AI assistant. Please try again.' });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('ai-health-insight failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
