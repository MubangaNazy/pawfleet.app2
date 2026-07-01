import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

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
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
}

export function identifyUser(id: string, name: string, role: string) {
  posthog.identify(id, { name, role });
  Sentry.setUser({ id, username: name });
}

export function clearUser() {
  posthog.reset();
  Sentry.setUser(null);
}

export function trackEvent(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}
