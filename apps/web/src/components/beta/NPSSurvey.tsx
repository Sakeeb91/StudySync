"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/api";

interface NPSSurveyProps {
  onClose?: () => void;
  onSubmit?: (score: number) => void;
  showAfterMs?: number;
  storageKey?: string;
}

export function NPSSurvey({
  onClose,
  onSubmit,
  showAfterMs = 0,
  storageKey = "nps_survey_shown",
}: NPSSurveyProps) {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState<"score" | "feedback" | "thanks">("score");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if survey was already shown
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem(storageKey);
      const lastShown = shown ? new Date(shown) : null;
      const now = new Date();

      // Don't show if shown in the last 30 days
      if (lastShown && (now.getTime() - lastShown.getTime()) < 30 * 24 * 60 * 60 * 1000) {
        return;
      }

      const timer = setTimeout(() => {
        setVisible(true);
      }, showAfterMs);

      return () => clearTimeout(timer);
    }
  }, [showAfterMs, storageKey]);

  const handleScoreSelect = (selectedScore: number) => {
    setScore(selectedScore);
    setStep("feedback");
  };

  const handleSubmit = async () => {
    if (score === null) return;

    setSubmitting(true);

    try {
      await submitFeedback({
        type: "NPS_SURVEY",
        category: "OTHER",
        title: `NPS Score: ${score}`,
        content: feedback || `NPS score submitted: ${score}`,
        npsScore: score,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });

      // Mark as shown
      localStorage.setItem(storageKey, new Date().toISOString());

      setStep("thanks");
      onSubmit?.(score);

      // Close after showing thanks
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 2000);
    } catch (error) {
      console.error("Failed to submit NPS:", error);
      // Still mark as shown to avoid annoying users
      localStorage.setItem(storageKey, new Date().toISOString());
      setVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    localStorage.setItem(storageKey, new Date().toISOString());
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md">
      <Card className="shadow-xl border-2">
        <CardContent className="pt-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {step === "score" && (
            <div className="space-y-4">
              <div className="pr-8">
                <h3 className="font-semibold text-lg">
                  How likely are you to recommend StudySync to a friend?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your feedback helps us improve the product.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      variant={score === num ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 ${
                        num <= 6
                          ? "hover:border-red-500 hover:text-red-500"
                          : num <= 8
                          ? "hover:border-yellow-500 hover:text-yellow-500"
                          : "hover:border-green-500 hover:text-green-500"
                      }`}
                      onClick={() => handleScoreSelect(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>
            </div>
          )}

          {step === "feedback" && (
            <div className="space-y-4">
              <div className="pr-8">
                <h3 className="font-semibold text-lg">
                  {score !== null && score <= 6
                    ? "We're sorry to hear that. What could we do better?"
                    : score !== null && score <= 8
                    ? "Thanks! What would make your experience even better?"
                    : "Awesome! What do you love most about StudySync?"}
                </h3>
              </div>

              <Textarea
                placeholder="Share your thoughts (optional)..."
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setStep("score")}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Sending..." : "Submit"}
                  {!submitting && <Send className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {step === "thanks" && (
            <div className="py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-3">
                <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-lg">Thank you!</h3>
              <p className="text-muted-foreground text-sm">
                Your feedback helps us make StudySync better.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook to track when to show NPS survey
export function useNPSSurvey(options: {
  triggerAfterSessions?: number;
  triggerAfterDays?: number;
  enabled?: boolean;
}) {
  const { triggerAfterSessions = 5, triggerAfterDays = 7, enabled = true } = options;
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const storageKey = "nps_session_count";
    const firstVisitKey = "nps_first_visit";

    // Track session count
    let sessionCount = parseInt(localStorage.getItem(storageKey) || "0");
    sessionCount++;
    localStorage.setItem(storageKey, sessionCount.toString());

    // Track first visit
    let firstVisit = localStorage.getItem(firstVisitKey);
    if (!firstVisit) {
      firstVisit = new Date().toISOString();
      localStorage.setItem(firstVisitKey, firstVisit);
    }

    // Check if conditions are met
    const daysSinceFirstVisit = Math.floor(
      (new Date().getTime() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24)
    );

    const meetsConditions =
      sessionCount >= triggerAfterSessions && daysSinceFirstVisit >= triggerAfterDays;

    // Check if already shown recently
    const lastShown = localStorage.getItem("nps_survey_shown");
    const notRecentlyShown = !lastShown ||
      (new Date().getTime() - new Date(lastShown).getTime()) > 30 * 24 * 60 * 60 * 1000;

    setShouldShow(meetsConditions && notRecentlyShown);
  }, [enabled, triggerAfterDays, triggerAfterSessions]);

  return shouldShow;
}
