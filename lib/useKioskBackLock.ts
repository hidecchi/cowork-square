"use client";

import { useLayoutEffect, useRef } from "react";

export function useKioskBackLock(onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useLayoutEffect(() => {
    const fire = () => {
      onBackRef.current();
    };
    window.addEventListener("kioskback", fire);
    return () => {
      window.removeEventListener("kioskback", fire);
    };
  }, []);
}
