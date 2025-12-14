"use client";

import Link from "next/link";
import { XCircle, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Checkout Canceled</CardTitle>
          <CardDescription className="text-base">
            Your checkout was canceled. No charges have been made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              If you experienced any issues during checkout or have questions about our plans,
              we&apos;re here to help. You can also continue using StudySync with your current plan.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-sm">What would you like to do?</h3>

            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href="/pricing">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Pricing
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Continue with Free Plan
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3 text-sm">
              <MessageCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Need help deciding?</p>
                <p className="text-muted-foreground">
                  Our team is happy to answer any questions about which plan is right for you.{" "}
                  <Link href="/contact" className="text-primary hover:underline">
                    Contact us
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can upgrade to a premium plan at any time from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
