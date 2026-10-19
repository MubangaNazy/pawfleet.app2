import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

/** A row for the profile screen linking to Privacy Policy & Terms of Service. Keeps the policy
 * reachable from inside the signed-in app, not only from the pre-login landing/register pages. */
export default function PrivacyTermsRow() {
  return (
    <Link to="/privacy-policy"
      className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-surface-border rounded-2xl hover:bg-surface-hover transition-colors text-left">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
        <ShieldCheck className="w-4 h-4" style={{ color: '#2B8A50' }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Privacy Policy & Terms</p>
        <p className="text-xs text-ink-muted">How we handle your data, and the rules of using PawFleet</p>
      </div>
    </Link>
  );
}
