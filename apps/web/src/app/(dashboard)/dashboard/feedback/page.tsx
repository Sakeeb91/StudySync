"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  submitFeedback,
  getUserFeedback,
  FeedbackType,
  FeedbackCategory,
  BetaFeedback,
} from "@/lib/api";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "BUG_REPORT", label: "Bug Report", icon: Bug, description: "Something isn't working correctly" },
  { value: "FEATURE_REQUEST", label: "Feature Request", icon: Lightbulb, description: "Suggest a new feature or improvement" },
  { value: "GENERAL", label: "General Feedback", icon: MessageSquare, description: "Share your thoughts and ideas" },
  { value: "USABILITY", label: "Usability Issue", icon: AlertCircle, description: "Hard to use or confusing interface" },
  { value: "PERFORMANCE", label: "Performance Issue", icon: Clock, description: "Slow loading or laggy behavior" },
];

const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "UPLOAD", label: "Content Upload" },
  { value: "FLASHCARDS", label: "Flashcards" },
  { value: "QUIZZES", label: "Quizzes" },
  { value: "KNOWLEDGE_GRAPH", label: "Knowledge Graph" },
  { value: "UI_UX", label: "User Interface" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "AUTHENTICATION", label: "Account/Login" },
  { value: "OTHER", label: "Other" },
];

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    type: "" as FeedbackType | "",
    category: "" as FeedbackCategory | "",
    title: "",
    content: "",
    rating: "",
  });

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    try {
      const res = await getUserFeedback();
      setFeedback(res.feedback);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.category || !formData.content) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitFeedback({
        type: formData.type,
        category: formData.category,
        title: formData.title || undefined,
        content: formData.content,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });

      setSubmitSuccess(true);
      setFormData({
        type: "",
        category: "",
        title: "",
        content: "",
        rating: "",
      });

      // Reload feedback list
      loadFeedback();

      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve StudySync by sharing your thoughts, reporting bugs, or suggesting features.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">New Feedback</TabsTrigger>
          <TabsTrigger value="history">
            My Feedback
            {feedback.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {feedback.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          {submitSuccess && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-green-800 dark:text-green-200">
                  Thank you! Your feedback has been submitted successfully.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Submit New Feedback</CardTitle>
              <CardDescription>
                Your feedback is valuable and helps us make StudySync better for everyone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Feedback Type Selection */}
                <div className="space-y-3">
                  <Label>What type of feedback is this? *</Label>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {FEEDBACK_TYPES.map(({ value, label, icon: Icon, description }) => (
                      <Card
                        key={value}
                        className={`cursor-pointer transition-all hover:border-primary ${
                          formData.type === value ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => setFormData({ ...formData, type: value })}
                      >
                        <CardContent className="flex items-start gap-3 p-4">
                          <Icon className={`h-5 w-5 mt-0.5 ${
                            formData.type === value ? "text-primary" : "text-muted-foreground"
                          }`} />
                          <div>
                            <h4 className="font-medium text-sm">{label}</h4>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Which area does this relate to? *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as FeedbackCategory })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_CATEGORIES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of your feedback"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Details *</Label>
                  <Textarea
                    id="content"
                    placeholder={
                      formData.type === "BUG_REPORT"
                        ? "Please describe the bug, what you expected to happen, and what actually happened..."
                        : formData.type === "FEATURE_REQUEST"
                        ? "Describe the feature you'd like to see and how it would help you..."
                        : "Share your thoughts, ideas, or suggestions..."
                    }
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <Label>How would you rate your experience with this area? (optional)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={formData.rating === num.toString() ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                        onClick={() => setFormData({ ...formData, rating: num.toString() })}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">1 = Poor, 5 = Excellent</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Feedback History</CardTitle>
              <CardDescription>
                Track the status of all the feedback you&apos;ve submitted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>You haven&apos;t submitted any feedback yet.</p>
                  <p className="text-sm">
                    Switch to the &quot;New Feedback&quot; tab to share your thoughts!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <FeedbackItem key={item.id} feedback={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedbackItem({ feedback }: { feedback: BetaFeedback }) {
  const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
    BUG_REPORT: { icon: Bug, color: "text-red-500" },
    FEATURE_REQUEST: { icon: Lightbulb, color: "text-yellow-500" },
    GENERAL: { icon: MessageSquare, color: "text-blue-500" },
    USABILITY: { icon: AlertCircle, color: "text-orange-500" },
    PERFORMANCE: { icon: Clock, color: "text-purple-500" },
  };

  const config = typeConfig[feedback.type] || { icon: MessageSquare, color: "text-gray-500" };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border">
      <div className={`mt-0.5 ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline">{feedback.type.replace("_", " ")}</Badge>
          <Badge variant="secondary">{feedback.category}</Badge>
          <FeedbackStatusBadge status={feedback.status} />
          {feedback.rating && (
            <Badge variant="outline">
              Rating: {feedback.rating}/5
            </Badge>
          )}
        </div>
        {feedback.title && (
          <h4 className="font-medium">{feedback.title}</h4>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {feedback.content}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Submitted {new Date(feedback.createdAt).toLocaleDateString()} at{" "}
          {new Date(feedback.createdAt).toLocaleTimeString()}
        </p>
        {feedback.resolution && (
          <div className="mt-3 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Response:</p>
            <p className="text-sm text-muted-foreground">{feedback.resolution}</p>
            {feedback.resolvedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Resolved on {new Date(feedback.resolvedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    NEW: { variant: "secondary", label: "New" },
    REVIEWING: { variant: "outline", label: "Under Review" },
    IN_PROGRESS: { variant: "default", label: "In Progress" },
    RESOLVED: { variant: "default", label: "Resolved" },
    WONT_FIX: { variant: "secondary", label: "Won't Fix" },
    DUPLICATE: { variant: "secondary", label: "Duplicate" },
  };

  const config = variants[status] || { variant: "secondary" as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
