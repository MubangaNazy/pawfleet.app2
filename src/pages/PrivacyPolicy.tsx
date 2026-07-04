import { useNavigate } from 'react-router-dom';
import PawFleetLogo from '../components/ui/PawFleetLogo';

type Section = { id: string; title: string; body: string[] };

const PRIVACY: Section[] = [
  {
    id: 'collect',
    title: '1. Information We Collect',
    body: [
      'Account information: name, phone number, and email address when you register.',
      'Location data: GPS coordinates collected during active dog walks to provide live tracking. Location is only shared between the booked owner and walker for that walk.',
      'Pet information: dog names, breeds, ages, and any notes you add to dog profiles.',
      'Payment information: mobile money phone numbers used to initiate payments. We do not store card numbers or PIN codes.',
      'Usage data: pages visited and actions taken within the app, used only to improve the service.',
    ],
  },
  {
    id: 'use',
    title: '2. How We Use Your Information',
    body: [
      'To match dog owners with available walkers in Lusaka.',
      'To enable real-time walk tracking between owners and walkers.',
      'To process payments via Airtel Money, MTN MoMo, or Zamtel Kwacha.',
      'To send booking confirmations and status notifications.',
      'To display community leaderboards (walker names and walk counts only — no financial details are shared publicly).',
    ],
  },
  {
    id: 'share',
    title: '3. Information Sharing',
    body: [
      'We do not sell your personal information to third parties.',
      'Walker name and profile photo are visible to owners who book a walk, and vice versa.',
      'Payment amounts are visible to the admin for reconciliation purposes.',
      'We use the following third-party processors, all bound by their own privacy policies: Supabase (database, supabase.com), Lenco (mobile payments, lenco.co), Sentry (error monitoring, sentry.io), PostHog (analytics, posthog.com), Resend (receipt emails, resend.com), and Firebase (push notifications, firebase.google.com). Some of these services store data on servers outside Zambia (primarily the United States), as disclosed under Zambia\'s Data Protection Act 2021.',
    ],
  },
  {
    id: 'security',
    title: '4. Data Security',
    body: [
      'All data is transmitted over HTTPS.',
      'Passwords are stored using industry-standard hashing via Supabase Auth — we never store plain-text passwords.',
      'Location data is only retained for the duration of an active walk session.',
      'You can request deletion of your account and associated data by contacting us at mubangachanda004@gmail.com.',
    ],
  },
  {
    id: 'retention',
    title: '5. Data Retention',
    body: [
      'Account data is retained for as long as your account is active.',
      'Walk history is retained to provide earnings and booking records.',
      'You may request deletion of your data at any time.',
    ],
  },
  {
    id: 'rights',
    title: '6. Your Rights',
    body: [
      'You have the right to access, correct, or delete the personal information we hold about you.',
      'You may withdraw consent for location tracking by ending the active walk session.',
      'To exercise any of these rights, contact us at mubangachanda004@gmail.com.',
    ],
  },
  {
    id: 'contact',
    title: '7. Contact',
    body: [
      'PawFleet is operated in Lusaka, Zambia.',
      'For any privacy concerns: mubangachanda004@gmail.com',
      'Phone / WhatsApp: +260 574 800 304',
      'This policy was last updated on 16 June 2026.',
    ],
  },
  {
    id: 'safety',
    title: '8. Report a Safety Issue',
    body: [
      'Your safety and the safety of your pet is our top priority.',
      'If you experience or witness any unsafe behaviour — including aggressive animals, walker misconduct, or any incident during a walk — please report it immediately.',
      'Emergency contact: +260 574 800 304 (call or WhatsApp)',
      'Email: mubangachanda004@gmail.com — use the subject line "Safety Report".',
      'All safety reports are treated confidentially and investigated within 24 hours. Accounts involved in verified safety incidents may be suspended pending review.',
    ],
  },
];

const TERMS: Section[] = [
  {
    id: 't-agree',
    title: '1. Agreement to Terms',
    body: [
      'By creating a PawFleet account, you agree to these Terms of Service. If you do not agree, please do not use the app.',
    ],
  },
  {
    id: 't-service',
    title: '2. The Service',
    body: [
      'PawFleet connects dog owners with independent dog walkers in Lusaka, Zambia.',
      'PawFleet is a platform provider. Walkers are independent contractors, not PawFleet employees.',
      'We do not guarantee the availability of walkers at any given time.',
    ],
  },
  {
    id: 't-owners',
    title: '3. Owner Responsibilities',
    body: [
      'You must provide accurate information about your dog, including any health conditions, behavioural issues, or vaccination status.',
      'You are responsible for ensuring your dog is safe to walk and up to date with rabies vaccination.',
      'Payment is due to the walker after the service is completed, either in cash or via mobile money.',
    ],
  },
  {
    id: 't-walkers',
    title: '4. Walker Responsibilities',
    body: [
      'Walkers must accept only walks they can safely complete.',
      'You must keep the live GPS active during the walk so the owner can track progress.',
      'Any incidents involving the dog (injury, escape, illness) must be reported to the owner immediately.',
      'PawFleet reserves the right to remove walkers who receive consistently poor ratings.',
    ],
  },
  {
    id: 't-payments',
    title: '5. Payments',
    body: [
      'Shop purchases may be paid online via Airtel Money, MTN MoMo, or Zamtel Kwacha at checkout.',
      'Walk and grooming payments are made directly from owner to walker after the service.',
      'All prices are in Zambian Kwacha (ZMW). No refunds are provided once a walk has been completed.',
      'Disputed payments should be reported within 48 hours to mubangachanda004@gmail.com.',
    ],
  },
  {
    id: 't-liability',
    title: '6. Limitation of Liability',
    body: [
      'PawFleet is not liable for injuries to dogs, walkers, or third parties during a walk.',
      'PawFleet is not responsible for payment disputes between owners and walkers.',
      'The platform is provided "as is" without warranty of uptime or availability.',
    ],
  },
  {
    id: 't-termination',
    title: '7. Termination',
    body: [
      'We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform.',
      'You may delete your account at any time by contacting us.',
    ],
  },
  {
    id: 't-changes',
    title: '8. Changes to Terms',
    body: [
      'We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance.',
      'Last updated: 16 June 2026.',
    ],
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <PawFleetLogo size={28} />
            <span className="text-sm font-bold" style={{ color: '#1B4332' }}>PawFleet</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-semibold px-4 py-2 rounded-xl border transition-colors hover:bg-gray-50"
            style={{ color: '#2B8A50', borderColor: '#e5e7eb' }}
          >
            ← Back
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-10 pb-20 space-y-14">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: '#1B4332' }}>Privacy & Terms</h1>
          <p className="text-sm" style={{ color: '#777' }}>PawFleet · Lusaka, Zambia · Last updated 16 June 2026</p>
        </div>

        {/* Jump links */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['Privacy Policy', 'Terms of Service'].map(label => (
            <a key={label}
              href={`#${label === 'Privacy Policy' ? 'privacy' : 'terms'}`}
              className="text-xs font-bold px-4 py-2 rounded-full border transition-colors hover:bg-[#EBF5EF]"
              style={{ color: '#2B8A50', borderColor: '#2B8A50' }}>
              {label}
            </a>
          ))}
        </div>

        {/* Privacy Policy */}
        <section id="privacy">
          <h2 className="text-2xl font-extrabold mb-6 pb-3 border-b" style={{ color: '#1B4332', borderColor: '#e5e7eb' }}>
            Privacy Policy
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#555' }}>
            PawFleet ("we", "us", "our") is committed to protecting your privacy. This policy explains what data we
            collect, why we collect it, and how we keep it safe.
          </p>
          <div className="space-y-6">
            {PRIVACY.map(s => (
              <div key={s.id} id={s.id}>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1B4332' }}>{s.title}</h3>
                <ul className="space-y-1.5">
                  {s.body.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: '#444' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Terms of Service */}
        <section id="terms">
          <h2 className="text-2xl font-extrabold mb-6 pb-3 border-b" style={{ color: '#1B4332', borderColor: '#e5e7eb' }}>
            Terms of Service
          </h2>
          <div className="space-y-6">
            {TERMS.map(s => (
              <div key={s.id} id={s.id}>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1B4332' }}>{s.title}</h3>
                <ul className="space-y-1.5">
                  {s.body.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: '#444' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Contact box */}
        <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: '#EBF5EF' }}>
          <p className="font-bold text-sm" style={{ color: '#1B4332' }}>Questions about this policy?</p>
          <a href="mailto:mubangachanda004@gmail.com"
            className="text-sm font-semibold"
            style={{ color: '#2B8A50' }}>
            mubangachanda004@gmail.com
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center" style={{ borderColor: '#e5e7eb' }}>
        <p className="text-xs" style={{ color: '#999' }}>© 2026 PawFleet · Lusaka, Zambia</p>
      </footer>
    </div>
  );
}
