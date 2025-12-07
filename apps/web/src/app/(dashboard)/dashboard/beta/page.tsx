"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Users,
  MessageSquare,
  Star,
  CheckCircle2,
  Gift,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBetaTesterStatus, getUserFeedback, getEnabledFeatures, BetaTester, BetaFeedback, BetaFeature } from "@/lib/api";

export default function BetaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [betaTester, setBetaTester] = useState<BetaTester | null>(null);
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [features, setFeatures] = useState<BetaFeature[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [statusRes, feedbackRes, featuresRes] = await Promise.all([
          getBetaTesterStatus(),
          getUserFeedback().catch(() => ({ feedback: [] })),
          getEnabledFeatures().catch(() => ({ features: [] })),
        ]);

        setIsBetaTester(statusRes.isBetaTester);
        if (statusRes.betaTester) {
          setBetaTester(statusRes.betaTester);
        }
        setFeedback(feedbackRes.feedback);
        setFeatures(featuresRes.features);
      } catch (error) {
        console.error("Failed to load beta data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isBetaTester) {
    return <NotABetaTesterView />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beta Program</h1>
          <p className="text-muted-foreground">
            Welcome to the StudySync Beta Program. Thank you for helping us improve!
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/feedback">
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Feedback
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={betaTester?.status === "ACTIVE" ? "default" : "secondary"}>
                {betaTester?.status || "Unknown"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Joined {betaTester?.joinedAt ? new Date(betaTester.joinedAt).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cohort</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{betaTester?.cohort || "General"}</div>
            <p className="text-xs text-muted-foreground">Testing group</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedback.length}</div>
            <p className="text-xs text-muted-foreground">
              {feedback.filter((f) => f.status === "RESOLVED").length} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features Enabled</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{features.length}</div>
            <p className="text-xs text-muted-foreground">Early access features</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="features" className="space-y-4">
        <TabsList>
          <TabsTrigger value="features">Beta Features</TabsTrigger>
          <TabsTrigger value="feedback">My Feedback</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enabled Beta Features</CardTitle>
              <CardDescription>
                Features you have early access to as a beta tester
              </CardDescription>
            </CardHeader>
            <CardContent>
              {features.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No special beta features enabled yet.</p>
                  <p className="text-sm">New features will appear here as they become available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {features.map((feature) => (
                    <div
                      key={feature.name}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{feature.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {feature.description || "New experimental feature"}
                        </p>
                      </div>
                      <Badge>Beta</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User-specific features */}
          {betaTester?.featuresEnabled && betaTester.featuresEnabled.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Feature Flags</CardTitle>
                <CardDescription>
                  Features specifically enabled for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {betaTester.featuresEnabled.map((feature) => (
                    <Badge key={feature} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Feedback History</CardTitle>
              <CardDescription>
                Track the status of your submitted feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedback.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>You haven&apos;t submitted any feedback yet.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/feedback">Send Feedback</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{item.type.replace("_", " ")}</Badge>
                          <Badge variant="secondary">{item.category}</Badge>
                          <FeedbackStatusBadge status={item.status} />
                        </div>
                        <h4 className="font-medium">{item.title || "Feedback"}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                        {item.resolution && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <strong>Resolution:</strong> {item.resolution}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beta Tester Rewards</CardTitle>
              <CardDescription>
                Earn rewards for participating in the beta program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Free Premium Access</h4>
                    <p className="text-sm text-muted-foreground">
                      Enjoy premium features free during the beta period
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Founding Member Badge</h4>
                    <p className="text-sm text-muted-foreground">
                      Exclusive badge for early supporters
                    </p>
                  </div>
                  <Badge variant="default">Earned</Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Launch Discount</h4>
                    <p className="text-sm text-muted-foreground">
                      50% off first year when we launch
                    </p>
                  </div>
                  <Badge variant="secondary">Upcoming</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Feedback Milestone Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Submit 5 feedback items</span>
                    <span>{Math.min(feedback.length, 5)}/5</span>
                  </div>
                  <Progress value={(Math.min(feedback.length, 5) / 5) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotABetaTesterView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <FlaskConical className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Join the Beta Program</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You&apos;re not currently enrolled in the beta program. Apply now to get early access
        to new features and help shape the future of StudySync!
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/beta">
            Apply for Beta Access
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FeedbackStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    NEW: { variant: "secondary", label: "New" },
    REVIEWING: { variant: "outline", label: "Reviewing" },
    IN_PROGRESS: { variant: "default", label: "In Progress" },
    RESOLVED: { variant: "default", label: "Resolved" },
    WONT_FIX: { variant: "secondary", label: "Won't Fix" },
    DUPLICATE: { variant: "secondary", label: "Duplicate" },
  };

  const config = variants[status] || { variant: "secondary" as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
