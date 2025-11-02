// components/termly-script.tsx
"use client"

import Script from "next/script"
import { useEffect } from "react"

declare global {
  interface Window {
    Termly?: {
      displayPreferenceModal?: () => void;
      displayBanner?: () => void;
    };
  }
}

export default function TermlyScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set up click handlers for preference links
    const setupPreferenceHandlers = () => {
      const handlePreferenceClick = (e: Event) => {
        e.preventDefault();
        if (window.Termly?.displayPreferenceModal) {
          window.Termly.displayPreferenceModal();
        }
      };

      document.querySelectorAll('.termly-display-preferences').forEach((el) => {
        el.removeEventListener('click', handlePreferenceClick);
        el.addEventListener('click', handlePreferenceClick);
      });
    };

    let checkTermly: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;
    let bannerChecked = false;

    // Check when Termly loads (one-time check)
    checkTermly = setInterval(() => {
      if (window.Termly) {
        setupPreferenceHandlers();
        clearInterval(checkTermly!);
        checkTermly = null;

        // One-time banner check after Termly loads
        if (!bannerChecked) {
          bannerChecked = true;
          setTimeout(() => {
            const termlyBanner = document.querySelector('[id*="termly"], [class*="termly"], [data-termly]');
            const hasConsentCookie = document.cookie.includes('termly') || 
                                     localStorage.getItem('termly-consent') !== null;
            
            if (!termlyBanner && !hasConsentCookie && window.Termly?.displayBanner) {
              try {
                window.Termly.displayBanner();
              } catch {
                // Silently fail - Termly will show banner on its own
              }
            }
          }, 1000);
        }
      }
    }, 100);

    // Timeout after 5 seconds
    timeout = setTimeout(() => {
      if (checkTermly) {
        clearInterval(checkTermly);
        checkTermly = null;
      }
    }, 5000);

    // Cleanup
    return () => {
      if (checkTermly) clearInterval(checkTermly);
      if (timeout) clearTimeout(timeout);
    };
  }, []); // Empty deps - only run once

  return (
    <Script
      id="termly-consent-banner"
      src="https://app.termly.io/embed.min.js"
      data-auto-block="on"
      data-website-uuid="ba09ca99-2e6c-4e83-adca-6b3e27ffe054"
      strategy="afterInteractive"
      onError={() => {
        // Termly script failed to load - will attempt to load on next page navigation
      }}
    />
  )
}
