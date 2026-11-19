"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile (explicit rendering). Only the PUBLIC site key is used here; the secret key
// stays on the server (src/lib/leads/turnstile.ts). "interaction-only" keeps the widget invisible
// unless Cloudflare needs the visitor to do something. The script is loaded when this step opens.

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string;
  locale: string;
  /** Change this number to get a fresh challenge (tokens are single use). */
  resetNonce: number;
  onToken: (token: string | null) => void;
  label: string;
  loadingLabel: string;
};

export function TurnstileWidget({
  siteKey,
  locale,
  resetNonce,
  onToken,
  label,
  loadingLabel,
}: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          theme: "dark",
          language: locale,
          appearance: "interaction-only",
          callback: (token: string) => {
            setReady(true);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, locale]);

  useEffect(() => {
    if (resetNonce > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetNonce]);

  return (
    <div>
      <div ref={container} aria-label={label} />
      {!ready && (
        <p className="text-xs text-sand/50" role="status">
          {loadingLabel}
        </p>
      )}
    </div>
  );
}
