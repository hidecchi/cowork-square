"use client";

import { useEffect, useRef } from "react";

function isStandaloneDisplay(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function trapHistory(): void {
  window.history.pushState({ kiosk: true }, "", window.location.href);
}

export function useKioskBackLock(onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isStandaloneDisplay()) return;

    trapHistory();

    const onPopState = () => {
      trapHistory();
      onBackRef.current();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) trapHistory();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
}
