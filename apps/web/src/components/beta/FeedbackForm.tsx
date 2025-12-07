"use client";

import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitFeedback, FeedbackType, FeedbackCategory } from "@/lib/api";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: React.ElementType }[] = [
  { value: "BUG_REPORT", label: "Bug Report", icon: Bug },
  { value: "FEATURE_REQUEST", label: "Feature Request", icon: Lightbulb },
  { value: "GENERAL", label: "General Feedback", icon: MessageSquare },
  { value: "USABILITY", label: "Usability Issue", icon: MessageSquare },
  { value: "PERFORMANCE", label: "Performance Issue", icon: MessageSquare },
];

const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "UPLOAD", label: "Content Upload" },
  { value: "FLASHCARDS", label: "Flashcards" },
  { value: "QUIZZES", label: "Quizzes" },
  { value: "KNOWLEDGE_GRAPH", label: "Knowledge Graph" },
  { value: "UI_UX", label: "User Interface" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "AUTHENTICATION", label: "Authentication" },
  { value: "OTHER", label: "Other" },
];

interface FeedbackFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function FeedbackForm({ trigger, onSuccess }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    type: "" as FeedbackType | "",
    category: "" as FeedbackCategory | "",
    title: "",
    content: "",
    rating: "",
  });

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

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setFormData({
          type: "",
          category: "",
          title: "",
          content: "",
          rating: "",
        });
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      category: "",
      title: "",
      content: "",
      rating: "",
    });
    setError("");
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve StudySync by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4">
              <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">Thank you!</h3>
            <p className="text-muted-foreground">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={formData.type === value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setFormData({ ...formData, type: value })}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
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
                placeholder="Please describe your feedback in detail..."
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>How would you rate this feature/area? (optional)</Label>
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
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Floating Feedback Button Component
export function FloatingFeedbackButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <FeedbackForm
        trigger={
          <Button size="lg" className="rounded-full shadow-lg">
            <MessageSquare className="mr-2 h-5 w-5" />
            Feedback
          </Button>
        }
      />
    </div>
  );
}
