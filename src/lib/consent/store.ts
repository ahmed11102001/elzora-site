"use client";

// The visitor's decision, kept in localStorage (it has to outlive the tab, and a consent record is
// itself strictly necessary). A tiny external store so the banner, the footer link, the tracking
// loader and the attribution capture all see the same value.

import { useSyncExternalStore } from "react";
import {
  CONSENT_STORAGE_KEY,
  createConsent,
  parseConsent,
  type ConsentChoice,
  type StoredConsent,
} from "./consent";

export type ConsentState = {
  /** False on the server and during hydration: nothing should be decided from it yet. */
  ready: boolean;
  /** The saved decision, or null while the visitor has not decided (or it expired). */
  stored: StoredConsent | null;
  /** True when the visitor asked to change the choice (footer link). */
  panelOpen: boolean;
};

const SERVER_STATE: ConsentState = { ready: false, stored: null, panelOpen: false };
let state: ConsentState = SERVER_STATE;
const listeners = new Set<() => void>();

function readStorage(): StoredConsent | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY), Date.now());
  } catch {
    return null; // storage blocked: the visitor is simply asked every time
  }
}

function set(next: ConsentState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function load() {
  if (state.ready || typeof window === "undefined") return;
  state = { ready: true, stored: readStorage(), panelOpen: false };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) set({ ...state, ready: true, stored: readStorage() });
  };
  window.addEventListener("storage", onStorage); // a decision made in another tab
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => SERVER_STATE;

export function useConsentState(): ConsentState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function saveConsent(choice: ConsentChoice) {
  const stored = createConsent(choice, Date.now());
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Blocked storage: the choice still applies to this page view.
  }
  set({ ready: true, stored, panelOpen: false });
}

export function openConsentSettings() {
  load();
  set({ ...state, ready: true, panelOpen: true });
}

export function closeConsentSettings() {
  set({ ...state, panelOpen: false });
}
