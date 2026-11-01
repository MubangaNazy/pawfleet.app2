import * as Sentry from '@sentry/react';
import type { PostHog } from 'posthog-js';

// PostHog loads a moment after the page does; anything logged before then waits for it.
let posthogReady: Promise<PostHog | null> = Promise.resolve(null);

export function initMonitoring() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      replaysOnErrorSampleRate: 1.0,
      integrations: [Sentry.browserTracingIntegration()],
    });
  }

  if (posthogKey) {
    posthogReady = new Promise(done => setTimeout(done, 3000))
      .then(() => import('posthog-js'))
      .then(({ default: posthog }) => {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: 'identified_only',
          capture_pageview: true,
          capture_pageleave: true,
        });
        return posthog;
      })
      .catch(() => null);
  }
}

export function identifyUser(id: string, name: string, role: string) {
  posthogReady.then(p => p?.identify(id, { name, role }));
  Sentry.setUser({ id, username: name });
}

export function clearUser() {
  posthogReady.then(p => p?.reset());
  Sentry.setUser(null);
}

export function trackEvent(event: string, props?: Record<string, unknown>) {
  posthogReady.then(p => p?.capture(event, props));
}
