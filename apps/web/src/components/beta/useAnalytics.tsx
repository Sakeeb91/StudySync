"use client";

import { useEffect, useCallback, useRef } from "react";
import { trackEvent, trackBatchEvents, TrackEventParams } from "@/lib/api";

// Generate or get session ID
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

// Event queue for batching
let eventQueue: TrackEventParams[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL = 5000; // Flush every 5 seconds
const MAX_QUEUE_SIZE = 20; // Flush if queue reaches this size

function flushEvents() {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  trackBatchEvents(events).catch((err) => {
    console.warn("Failed to send analytics events:", err);
    // Re-add events to queue on failure
    eventQueue = [...events, ...eventQueue].slice(0, MAX_QUEUE_SIZE * 2);
  });
}

function scheduleFlush() {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushEvents();
    flushTimeout = null;
  }, FLUSH_INTERVAL);
}

function queueEvent(event: TrackEventParams) {
  eventQueue.push(event);

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
  } else {
    scheduleFlush();
  }
}

// Analytics hook
export function useAnalytics() {
  const sessionId = useRef<string>("");

  useEffect(() => {
    sessionId.current = getSessionId();

    // Flush on page unload
    const handleUnload = () => {
      flushEvents();
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const track = useCallback(
    (eventType: string, eventName: string, properties?: Record<string, unknown>) => {
      const event: TrackEventParams = {
        eventType,
        eventName,
        properties,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        sessionId: sessionId.current,
      };

      queueEvent(event);
    },
    []
  );

  const trackImmediate = useCallback(
    async (eventType: string, eventName: string, properties?: Record<string, unknown>) => {
      const event: TrackEventParams = {
        eventType,
        eventName,
        properties,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        sessionId: sessionId.current,
      };

      try {
        await trackEvent(event);
      } catch (err) {
        console.warn("Failed to track event:", err);
      }
    },
    []
  );

  // Common tracking functions
  const trackPageView = useCallback(
    (pageName: string, properties?: Record<string, unknown>) => {
      track("page_view", pageName, {
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        ...properties,
      });
    },
    [track]
  );

  const trackFeatureUsed = useCallback(
    (featureName: string, properties?: Record<string, unknown>) => {
      track("feature_used", featureName, properties);
    },
    [track]
  );

  const trackButtonClick = useCallback(
    (buttonName: string, properties?: Record<string, unknown>) => {
      track("button_click", buttonName, properties);
    },
    [track]
  );

  const trackFormSubmit = useCallback(
    (formName: string, properties?: Record<string, unknown>) => {
      track("form_submit", formName, properties);
    },
    [track]
  );

  const trackError = useCallback(
    (errorName: string, properties?: Record<string, unknown>) => {
      trackImmediate("error", errorName, properties);
    },
    [trackImmediate]
  );

  const trackSearch = useCallback(
    (query: string, properties?: Record<string, unknown>) => {
      track("search", "search_performed", { query, ...properties });
    },
    [track]
  );

  const trackUpload = useCallback(
    (fileType: string, properties?: Record<string, unknown>) => {
      track("upload", "file_uploaded", { fileType, ...properties });
    },
    [track]
  );

  const trackStudySession = useCallback(
    (sessionType: string, properties?: Record<string, unknown>) => {
      track("study", sessionType, properties);
    },
    [track]
  );

  const trackQuizAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      track("quiz", action, properties);
    },
    [track]
  );

  const trackFlashcardAction = useCallback(
    (action: string, properties?: Record<string, unknown>) => {
      track("flashcard", action, properties);
    },
    [track]
  );

  return {
    track,
    trackImmediate,
    trackPageView,
    trackFeatureUsed,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    trackSearch,
    trackUpload,
    trackStudySession,
    trackQuizAction,
    trackFlashcardAction,
  };
}

// Page View Tracker Component
export function PageViewTracker({ pageName }: { pageName: string }) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(pageName);
  }, [pageName, trackPageView]);

  return null;
}

// Click Tracker HOC
export function withClickTracking<P extends object>(
  Component: React.ComponentType<P>,
  trackingName: string
) {
  return function TrackedComponent(props: P & { onClick?: () => void }) {
    const { trackButtonClick } = useAnalytics();

    const handleClick = () => {
      trackButtonClick(trackingName);
      props.onClick?.();
    };

    return <Component {...props} onClick={handleClick} />;
  };
}
