"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics";

interface TrackEventOnMountProps {
  eventName: AnalyticsEventName;
  params?: AnalyticsEventParams;
}

export function TrackEventOnMount({ eventName, params }: TrackEventOnMountProps) {
  useEffect(() => {
    trackEvent(eventName, params);
  }, [eventName, params]);

  return null;
}
