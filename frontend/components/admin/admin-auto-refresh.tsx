"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";

const ADMIN_REFRESH_INTERVAL_MS = 15_000;

export function AdminAutoRefresh() {
  const router = useRouter();
  const refresh = useEffectEvent(() => {
    router.refresh();
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh();
    }, ADMIN_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
