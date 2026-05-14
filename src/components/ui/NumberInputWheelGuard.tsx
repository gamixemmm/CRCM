"use client";

import { useEffect } from "react";

export default function NumberInputWheelGuard() {
  useEffect(() => {
    const preventNumberInputWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const input = target.closest('input[type="number"]');
      if (input) {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", preventNumberInputWheel, { capture: true, passive: false });
    return () => {
      document.removeEventListener("wheel", preventNumberInputWheel, { capture: true });
    };
  }, []);

  return null;
}
