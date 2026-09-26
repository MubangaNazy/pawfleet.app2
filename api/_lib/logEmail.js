// Shared by api/send-email.js and api/send-receipt.js. In api/_lib so Vercel never turns it into its
// own route (anything under an underscore-prefixed folder in api/ is excluded from routing).
// Never allowed to block or fail the actual email send — logging is best-effort only.
export async function logEmail({ to, template, subject, status, error, resendId }) {
  try {
    const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return;
    await fetch(`${url}/rest/v1/email_log`, {
      method: 'POST',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ to_email: to, template, subject, status, error: error || null, resend_id: resendId || null }),
    });
  } catch (err) {
    console.error('logEmail failed (non-fatal):', err);
  }
}
