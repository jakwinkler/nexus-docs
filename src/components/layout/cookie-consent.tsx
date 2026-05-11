"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentState = "granted" | "denied";

interface ConsentPreferences {
  analytics_storage: ConsentState;
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
  functionality_storage: ConsentState;
  personalization_storage: ConsentState;
  security_storage: ConsentState;
}

const CONSENT_KEY = "nexus-cookie-consent";

const defaultConsent: ConsentPreferences = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "granted",
  personalization_storage: "denied",
  security_storage: "granted",
};

const allGranted: ConsentPreferences = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  functionality_storage: "granted",
  personalization_storage: "granted",
  security_storage: "granted",
};

function pushConsent(preferences: ConsentPreferences) {
  if (typeof window === "undefined") return;

  // Push to GTM dataLayer using Google Consent Mode v2
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "consent_update",
    ...preferences,
  });

  // Also call gtag consent update if available
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", preferences);
  }
}

function saveConsent(preferences: ConsentPreferences) {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ ...preferences, timestamp: new Date().toISOString() })
    );
  } catch {
    // localStorage unavailable
  }
}

function loadConsent(): ConsentPreferences | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate it has the expected shape
    if (parsed.analytics_storage) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] =
    useState<ConsentPreferences>(defaultConsent);

  useEffect(() => {
    setMounted(true);

    // Set default consent state immediately (before GTM loads)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "default_consent",
      ...defaultConsent,
    });

    if (typeof window.gtag === "function") {
      window.gtag("consent", "default", defaultConsent);
    }

    // Check for existing consent
    const saved = loadConsent();
    if (saved) {
      setPreferences(saved);
      pushConsent(saved);
    } else {
      setVisible(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    setPreferences(allGranted);
    saveConsent(allGranted);
    pushConsent(allGranted);
    setVisible(false);
  }, []);

  const denyAll = useCallback(() => {
    saveConsent(defaultConsent);
    pushConsent(defaultConsent);
    setVisible(false);
  }, []);

  const saveCustom = useCallback(() => {
    saveConsent(preferences);
    pushConsent(preferences);
    setVisible(false);
  }, [preferences]);

  function togglePreference(key: keyof ConsentPreferences) {
    // Don't allow toggling essential cookies
    if (key === "functionality_storage" || key === "security_storage") return;
    setPreferences((prev) => ({
      ...prev,
      [key]: prev[key] === "granted" ? "denied" : "granted",
    }));
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2 dark:bg-brand-950">
                <Cookie className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Cookie Preferences
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Google Consent Mode v2
                </p>
              </div>
            </div>
            <button
              onClick={denyAll}
              className="rounded p-1 hover:bg-[var(--color-surface-secondary)] transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-[var(--color-text-muted)]" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            We use cookies to improve your experience and analyse site usage. You can
            accept all cookies, customise your preferences, or reject non-essential cookies.
          </p>

          {/* Detailed preferences (expandable) */}
          {showDetails && (
            <div className="mt-4 space-y-2 rounded-lg border border-[var(--color-border)] p-3">
              <ConsentToggle
                label="Analytics"
                description="Helps us understand how you use the docs"
                checked={preferences.analytics_storage === "granted"}
                onChange={() => togglePreference("analytics_storage")}
              />
              <ConsentToggle
                label="Advertising"
                description="Used for remarketing and ad measurement"
                checked={preferences.ad_storage === "granted"}
                onChange={() => togglePreference("ad_storage")}
              />
              <ConsentToggle
                label="Ad User Data"
                description="Send user data for advertising purposes"
                checked={preferences.ad_user_data === "granted"}
                onChange={() => togglePreference("ad_user_data")}
              />
              <ConsentToggle
                label="Ad Personalisation"
                description="Personalised advertising based on your activity"
                checked={preferences.ad_personalization === "granted"}
                onChange={() => togglePreference("ad_personalization")}
              />
              <ConsentToggle
                label="Personalisation"
                description="Remember your preferences like dark mode"
                checked={preferences.personalization_storage === "granted"}
                onChange={() => togglePreference("personalization_storage")}
              />
              <ConsentToggle
                label="Essential"
                description="Required for the site to function"
                checked={true}
                onChange={() => {}}
                disabled
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={acceptAll}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Accept All
            </button>
            {showDetails ? (
              <button
                onClick={saveCustom}
                className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
              >
                Save Preferences
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
              >
                Customise
              </button>
            )}
            <button
              onClick={denyAll}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Reject All
            </button>
          </div>

          {/* Privacy link */}
          <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
            See our{" "}
            <Link href="/docs/partnership" className="underline hover:text-[var(--color-text-secondary)]">
              privacy policy
            </Link>{" "}
            for more information.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConsentToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-2 py-1.5",
        disabled ? "opacity-60" : "cursor-pointer hover:bg-[var(--color-surface-secondary)]"
      )}
    >
      <div>
        <div className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
          {disabled && (
            <span className="ml-2 text-[10px] font-normal text-[var(--color-text-muted)]">
              Always on
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-muted)]">{description}</div>
      </div>
      <div
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-[var(--color-border)]",
          disabled && "cursor-not-allowed"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </div>
    </label>
  );
}

// Type declarations for GTM dataLayer and gtag
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}
