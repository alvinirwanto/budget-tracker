"use client";

import { useEffect, useRef } from "react";

/**
 * While a sheet or dialog is open it owns one history entry, so the phone's back button
 * (or back gesture) closes it instead of leaving the page. Closing it any other way
 * removes that entry again, so history never fills up with leftovers.
 */
const open: { id: string; close: () => void }[] = [];
let skip = 0; // popstate events we caused ourselves
let undo = 0; // entries waiting to be removed
let listening = false;

function onPop() {
  if (skip > 0) {
    skip--;
    return;
  }
  open.pop()?.close();
}

function removeEntries() {
  const n = undo;
  undo = 0;
  if (n > 0) {
    skip += n;
    history.go(-n);
  }
}

export function useBackClose(isOpen: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const id = Math.random().toString(36).slice(2);
    if (!listening) {
      window.addEventListener("popstate", onPop);
      listening = true;
    }
    // Keep the page's own history state, so the router still recognises this entry.
    history.pushState({ ...(history.state ?? {}), __sheet: id }, "", location.href);
    open.push({ id, close: () => closeRef.current() });
    return () => {
      const i = open.findIndex((o) => o.id === id);
      // Not in the list: back already took it. Otherwise it was closed another way, so drop our entry
      // (unless the page has moved on, then the entry is not ours to remove).
      if (i === -1) return;
      open.splice(i, 1);
      if (history.state?.__sheet === id || undo > 0) {
        if (undo === 0) queueMicrotask(removeEntries);
        undo++;
      }
    };
  }, [isOpen]);
}
