"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getCurrentSubscription, getSubscriptionUsage } from "@/lib/subscription-api";

export type SubscriptionTier = "FREE" | "PREMIUM" | "STUDENT_PLUS" | "UNIVERSITY";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING" | "INCOMPLETE" | "INCOMPLETE_EXPIRED" | "INACTIVE";

interface SubscriptionContextType {
  // Subscription data
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;

  // Usage data
  usage: {
    flashcardSets: { used: number; limit: number | null };
    quizzes: { used: number; limit: number | null };
    courses: { used: number; limit: number | null };
    uploads: { used: number; limit: number | null };
  } | null;

  // Feature access
  hasFeature: (feature: string) => boolean;
  canAccess: (requiredTier: SubscriptionTier) => boolean;

  // State management
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const defaultUsage = {
  flashcardSets: { used: 0, limit: 3 },
  quizzes: { used: 0, limit: 5 },
  courses: { used: 0, limit: 1 },
  uploads: { used: 0, limit: 5 },
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const tierHierarchy: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  STUDENT_PLUS: 2,
  UNIVERSITY: 3,
};

const tierFeatures: Record<SubscriptionTier, string[]> = {
  FREE: ["basic_flashcards", "basic_quizzes", "single_course"],
  PREMIUM: [
    "basic_flashcards", "basic_quizzes", "single_course",
    "unlimited_courses", "unlimited_flashcards", "unlimited_quizzes",
    "knowledge_graph", "analytics", "priority_support", "advanced_ai"
  ],
  STUDENT_PLUS: [
    "basic_flashcards", "basic_quizzes", "single_course",
    "unlimited_courses", "unlimited_flashcards", "unlimited_quizzes",
    "knowledge_graph", "analytics", "priority_support", "advanced_ai",
    "exam_prediction", "assignment_help", "ai_tutoring"
  ],
  UNIVERSITY: [
    "basic_flashcards", "basic_quizzes", "single_course",
    "unlimited_courses", "unlimited_flashcards", "unlimited_quizzes",
    "knowledge_graph", "analytics", "priority_support", "advanced_ai",
    "exam_prediction", "assignment_help", "ai_tutoring",
    "admin_dashboard", "bulk_licenses", "custom_branding"
  ],
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [tier, setTier] = useState<SubscriptionTier>("FREE");
  const [status, setStatus] = useState<SubscriptionStatus>("INACTIVE");
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [usage, setUsage] = useState<SubscriptionContextType["usage"]>(defaultUsage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isActive = status === "ACTIVE" || status === "TRIALING";

  const hasFeature = useCallback(
    (feature: string) => tierFeatures[tier]?.includes(feature) ?? false,
    [tier]
  );

  const canAccess = useCallback(
    (requiredTier: SubscriptionTier) => tierHierarchy[tier] >= tierHierarchy[requiredTier],
    [tier]
  );

  const refresh = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [subscriptionData, usageData] = await Promise.all([
        getCurrentSubscription().catch(() => null),
        getSubscriptionUsage().catch(() => null),
      ]);

      if (subscriptionData) {
        setTier(subscriptionData.tier as SubscriptionTier);
        setStatus(subscriptionData.status as SubscriptionStatus);
        setIsTrialing(subscriptionData.isTrialing || false);
        setTrialDaysRemaining(subscriptionData.trialDaysRemaining ?? null);
        setCurrentPeriodEnd(subscriptionData.currentPeriodEnd ?? null);
        setCancelAtPeriodEnd(subscriptionData.cancelAtPeriodEnd || false);
      }

      if (usageData) {
        setUsage({
          flashcardSets: {
            used: usageData.flashcardSets?.used ?? 0,
            limit: usageData.flashcardSets?.limit ?? null,
          },
          quizzes: {
            used: usageData.quizzes?.used ?? 0,
            limit: usageData.quizzes?.limit ?? null,
          },
          courses: {
            used: usageData.courses?.used ?? 0,
            limit: usageData.courses?.limit ?? null,
          },
          uploads: {
            used: usageData.uploads?.used ?? 0,
            limit: usageData.uploads?.limit ?? null,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for storage events (login/logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refresh]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        status,
        isActive,
        isTrialing,
        trialDaysRemaining,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        usage,
        hasFeature,
        canAccess,
        isLoading,
        error,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
