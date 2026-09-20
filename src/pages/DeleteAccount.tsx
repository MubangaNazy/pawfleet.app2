import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Smartphone, Trash2 } from 'lucide-react';

const EMAIL = 'pawfleetapp@gmail.com';
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Delete my PawFleet account')}&body=${encodeURIComponent(
  'Please delete my PawFleet account.\n\nName on the account:\nEmail or phone number I registered with:\n\nI understand this cannot be undone.',
)}`;

/** Public page (no login needed): how to delete a PawFleet account and what happens to the data. */
export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold mb-6" style={{ color: '#2B8A50' }}>
          <ArrowLeft className="w-4 h-4" /> Back to PawFleet
        </Link>

        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><Trash2 className="w-7 h-7 text-danger" /></div>
        <h1 className="text-3xl font-extrabold" style={{ color: '#1B4332' }}>Delete your PawFleet account</h1>
        <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
          You can delete your account and personal data at any time. Deleting cannot be undone.
        </p>

        <h2 className="text-lg font-bold text-ink mt-8 mb-3">Option 1: in the app (fastest)</h2>
        <ol className="space-y-2 text-sm text-ink-secondary list-decimal pl-5 leading-relaxed">
          <li>Open PawFleet and log in.</li>
          <li>Go to your <strong>Profile</strong>.</li>
          <li>Tap <strong>Delete my account</strong>.</li>
          <li>Type <strong>DELETE</strong> and confirm. It happens straight away.</li>
        </ol>

        <h2 className="text-lg font-bold text-ink mt-8 mb-3">Option 2: ask us by email</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-3">
          If you can no longer log in, email us from the address you registered with, or tell us the phone number on your account. We will confirm it is you and delete the account within 30 days.
        </p>
        <a href={MAILTO} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <Mail className="w-4 h-4" /> Email {EMAIL}
        </a>

        <h2 className="text-lg font-bold text-ink mt-8 mb-3">What gets deleted</h2>
        <ul className="space-y-1.5 text-sm text-ink-secondary list-disc pl-5 leading-relaxed">
          <li>Your login, name, phone number and email address</li>
          <li>Your profile photo and, for walkers, your ID card photo</li>
          <li>Pets that have no booking history, and their photos</li>
          <li>Messages you sent, notifications and community posts</li>
          <li>Your saved location and any shop products you listed</li>
        </ul>

        <h2 className="text-lg font-bold text-ink mt-8 mb-3">What we keep, and why</h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Completed walks and payment records are kept as anonymous records. Names, addresses, notes and routes are removed. We keep them because other people's earnings and our financial records depend on them. Pets that appear in a completed booking are kept without their name, photo or notes. Open bookings you have not finished are cancelled.
        </p>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-surface-secondary px-4 py-4">
          <Smartphone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#2B8A50' }} />
          <p className="text-xs text-ink-secondary leading-relaxed">
            Deleting your account does not cancel a subscription you paid for outside the app. Questions? Email <a className="font-semibold" style={{ color: '#2B8A50' }} href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        </div>

        <p className="text-xs text-ink-muted mt-8">
          Read our <Link to="/privacy-policy" className="font-semibold" style={{ color: '#2B8A50' }}>privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
