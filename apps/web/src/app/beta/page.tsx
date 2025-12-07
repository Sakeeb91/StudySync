"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  Star,
  Users,
  Zap,
  MessageSquare,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitBetaApplication } from "@/lib/api";

const STUDY_TOOLS = [
  "Anki",
  "Quizlet",
  "Notion",
  "Google Docs",
  "Evernote",
  "OneNote",
  "Obsidian",
  "Roam Research",
  "Paper Notes",
  "Other",
];

const REFERRAL_SOURCES = [
  "Social Media (TikTok, Instagram, Twitter)",
  "Friend or Classmate",
  "Professor or University",
  "Google Search",
  "Reddit",
  "YouTube",
  "Other",
];

export default function BetaPage() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    university: "",
    major: "",
    yearOfStudy: "",
    studyHoursPerWeek: "",
    painPoints: "",
    referralSource: "",
  });

  const handleToolToggle = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");
    setErrorMessage("");

    try {
      await submitBetaApplication({
        email: formData.email,
        name: formData.name,
        university: formData.university,
        major: formData.major || undefined,
        yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : undefined,
        studyHoursPerWeek: formData.studyHoursPerWeek
          ? parseInt(formData.studyHoursPerWeek)
          : undefined,
        currentTools: selectedTools,
        painPoints: formData.painPoints || undefined,
        referralSource: formData.referralSource || undefined,
      });
      setFormState("success");
    } catch (error) {
      setFormState("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  if (formState === "success") {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="container max-w-lg text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Application Submitted!</h1>
            <p className="text-muted-foreground mb-8">
              Thank you for applying to the StudySync Beta Program. We&apos;ll review your
              application and get back to you soon. Check your email for updates!
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Limited Beta Access
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Be Among the First to{" "}
              <span className="text-primary">Transform How You Study</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Join our exclusive beta program and help shape the future of AI-powered learning.
              Get early access to cutting-edge features and provide valuable feedback.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl opacity-50" />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">Beta Tester Benefits</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Early Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Be the first to try new AI-powered features before they&apos;re released to the
                  public.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Free Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Get free access to premium features during the beta period and special pricing
                  after launch.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Direct Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Your feedback directly shapes the product. Join our community and help us build
                  the best study tool.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section className="py-16">
        <div className="container max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Apply for Beta Access</CardTitle>
              <p className="text-muted-foreground text-center">
                Fill out the form below to join our beta testing program.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@university.edu"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* University Info */}
                <div className="space-y-2">
                  <Label htmlFor="university">University/College *</Label>
                  <Input
                    id="university"
                    placeholder="e.g., University of California, Berkeley"
                    required
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="major">Major/Field of Study</Label>
                    <Input
                      id="major"
                      placeholder="e.g., Computer Science"
                      value={formData.major}
                      onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearOfStudy">Year of Study</Label>
                    <Select
                      value={formData.yearOfStudy}
                      onValueChange={(value) => setFormData({ ...formData, yearOfStudy: value })}
                    >
                      <SelectTrigger id="yearOfStudy">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year / Freshman</SelectItem>
                        <SelectItem value="2">2nd Year / Sophomore</SelectItem>
                        <SelectItem value="3">3rd Year / Junior</SelectItem>
                        <SelectItem value="4">4th Year / Senior</SelectItem>
                        <SelectItem value="5">Graduate Student</SelectItem>
                        <SelectItem value="6">PhD Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Study Habits */}
                <div className="space-y-2">
                  <Label htmlFor="studyHours">Hours Spent Studying Per Week</Label>
                  <Select
                    value={formData.studyHoursPerWeek}
                    onValueChange={(value) =>
                      setFormData({ ...formData, studyHoursPerWeek: value })
                    }
                  >
                    <SelectTrigger id="studyHours">
                      <SelectValue placeholder="Select hours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Less than 5 hours</SelectItem>
                      <SelectItem value="10">5-10 hours</SelectItem>
                      <SelectItem value="20">10-20 hours</SelectItem>
                      <SelectItem value="30">20-30 hours</SelectItem>
                      <SelectItem value="40">30+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Tools */}
                <div className="space-y-2">
                  <Label>Current Study Tools (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {STUDY_TOOLS.map((tool) => (
                      <Badge
                        key={tool}
                        variant={selectedTools.includes(tool) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleToolToggle(tool)}
                      >
                        {selectedTools.includes(tool) && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Pain Points */}
                <div className="space-y-2">
                  <Label htmlFor="painPoints">
                    What are your biggest challenges with studying?
                  </Label>
                  <Textarea
                    id="painPoints"
                    placeholder="Tell us about the problems you face when studying..."
                    rows={4}
                    value={formData.painPoints}
                    onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
                  />
                </div>

                {/* Referral Source */}
                <div className="space-y-2">
                  <Label htmlFor="referralSource">How did you hear about StudySync?</Label>
                  <Select
                    value={formData.referralSource}
                    onValueChange={(value) =>
                      setFormData({ ...formData, referralSource: value })
                    }
                  >
                    <SelectTrigger id="referralSource">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Message */}
                {formState === "error" && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg" disabled={formState === "loading"}>
                  {formState === "loading" ? (
                    "Submitting..."
                  ) : (
                    <>
                      Apply for Beta Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By applying, you agree to receive emails about the beta program and provide
                  feedback to help improve StudySync.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What We're Testing Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8">What We&apos;re Testing</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <FeatureItem
              icon={Brain}
              title="AI Flashcard Generation"
              description="Upload your notes and get instant, intelligent flashcards."
            />
            <FeatureItem
              icon={ClipboardList}
              title="Smart Quizzes"
              description="Auto-generated quizzes that adapt to your learning level."
            />
            <FeatureItem
              icon={Star}
              title="Spaced Repetition"
              description="Optimized review schedules for maximum retention."
            />
            <FeatureItem
              icon={BookOpen}
              title="Knowledge Graphs"
              description="Visualize connections between concepts."
            />
            <FeatureItem
              icon={Zap}
              title="Quick Upload"
              description="Support for PDFs, images, and documents."
            />
            <FeatureItem
              icon={Users}
              title="Study Analytics"
              description="Track your progress and identify weak areas."
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">StudySync</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} StudySync. All rights reserved.</p>
      </div>
    </footer>
  );
}
