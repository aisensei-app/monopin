'use client';

import { useLayoutEffect } from 'react';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  useLayoutEffect(() => {
    if (!measurementId || document.getElementById('monopin-ga4')) return;
    const script = document.createElement('script');
    script.id = 'monopin-ga4';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer?.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
  }, []);
  return null;
}

export function trackEvent(name: string) {
  if (measurementId && typeof window !== 'undefined') window.gtag?.('event', name);
}
