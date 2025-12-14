"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Verify the checkout session (optional - Stripe webhook handles the actual subscription)
    const verifySession = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // Give Stripe webhook a moment to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsVerifying(false);
      } catch {
        setError("Unable to verify your subscription. Please check your account.");
        setIsVerifying(false);
      }
    };

    verifySession();
  }, [sessionId]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <h2 className="text-xl font-semibold">Processing your subscription...</h2>
              <p className="text-muted-foreground">
                Please wait while we set up your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Something went wrong</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/subscription">View Subscription</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Welcome to Premium!</CardTitle>
          <CardDescription className="text-base">
            Your subscription has been activated successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              You now have access to:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Unlimited courses and study materials
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Unlimited AI-generated flashcards
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Advanced quiz generation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Knowledge graph visualization
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Detailed analytics and progress tracking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Priority support
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/subscription">
                Manage Subscription
              </Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            A confirmation email has been sent to your registered email address.
            If you have any questions, please contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
