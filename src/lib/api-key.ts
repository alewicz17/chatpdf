"use client";

import { useSyncExternalStore } from "react";

/** La chiave personale vale per tutti i documenti, non solo per quello aperto. */
const API_KEY_STORAGE_KEY = "chatpdf:generation-api-key";

/**
 * La chiave personale vive in localStorage: e' uno store esterno a React, letto con
 * `useSyncExternalStore` cosi' resta allineata tra la navbar, la chat e le altre schede.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error("Lettura della chiave API salvata fallita:", error);
    return null;
  }
}

/** Sul server non esiste localStorage: si parte sempre dalla chiave di default. */
function getServerSnapshot(): string | null {
  return null;
}

/** Chiave personale in uso, `null` quando si usa quella di default del server. */
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Salva la chiave personale oppure la rimuove passando `null`. */
export function writeApiKey(apiKey: string | null): void {
  try {
    if (apiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Salvataggio della chiave API fallito:", error);
  }

  // L'evento `storage` non arriva alla scheda che scrive: si notifica a mano.
  listeners.forEach((listener) => listener());
}
