"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  GraduationCap,
  Loader2,
  Sparkles,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "Welcome to StudySync",
    description: "Let's get you set up for success",
  },
  {
    id: 2,
    title: "What are you studying?",
    description: "Help us personalize your experience",
  },
  {
    id: 3,
    title: "Set your goals",
    description: "What do you want to achieve?",
  },
  {
    id: 4,
    title: "You're all set!",
    description: "Ready to start learning",
  },
];

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Welcome to StudySync!</h2>
        <p className="text-muted-foreground mt-2">
          We&apos;re excited to help you transform your study materials into
          powerful learning tools.
        </p>
      </div>

      <div className="grid gap-4 text-left">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <Upload className="h-6 w-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium">Upload Your Notes</h3>
            <p className="text-sm text-muted-foreground">
              Import PDFs, documents, or images of your study materials.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <Brain className="h-6 w-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium">AI-Generated Flashcards</h3>
            <p className="text-sm text-muted-foreground">
              Automatically create flashcards from your content.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <Target className="h-6 w-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium">Smart Quizzes</h3>
            <p className="text-sm text-muted-foreground">
              Test your knowledge with adaptive quizzes.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={onNext} className="w-full">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// Step 2: Subject Selection
function SubjectStep({
  onNext,
  onBack,
}: {
  onNext: (data: string[]) => void;
  onBack: () => void;
}) {
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);

  const subjects = [
    { id: "biology", label: "Biology", icon: "🧬" },
    { id: "chemistry", label: "Chemistry", icon: "⚗️" },
    { id: "physics", label: "Physics", icon: "⚛️" },
    { id: "mathematics", label: "Mathematics", icon: "📐" },
    { id: "history", label: "History", icon: "📜" },
    { id: "literature", label: "Literature", icon: "📚" },
    { id: "languages", label: "Languages", icon: "🌍" },
    { id: "computer-science", label: "Computer Science", icon: "💻" },
    { id: "medicine", label: "Medicine", icon: "🏥" },
    { id: "law", label: "Law", icon: "⚖️" },
    { id: "business", label: "Business", icon: "📊" },
    { id: "other", label: "Other", icon: "📝" },
  ];

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">What are you studying?</h2>
        <p className="text-muted-foreground mt-2">
          Select all subjects that apply. We&apos;ll customize your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {subjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.id);
          return (
            <button
              key={subject.id}
              onClick={() => toggleSubject(subject.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <span className="text-2xl">{subject.icon}</span>
              <span className="text-sm font-medium">{subject.label}</span>
              {isSelected && (
                <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => onNext(selectedSubjects)}
          disabled={selectedSubjects.length === 0}
          className="flex-1"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Goals
function GoalsStep({
  onNext,
  onBack,
}: {
  onNext: (data: string) => void;
  onBack: () => void;
}) {
  const [selectedGoal, setSelectedGoal] = React.useState<string>("");
  const [studyTime, setStudyTime] = React.useState<string>("30");

  const goals = [
    {
      id: "exam-prep",
      label: "Exam Preparation",
      description: "Preparing for upcoming exams",
      icon: GraduationCap,
    },
    {
      id: "daily-review",
      label: "Daily Review",
      description: "Regular study and retention",
      icon: BookOpen,
    },
    {
      id: "quick-learning",
      label: "Quick Learning",
      description: "Learn new topics efficiently",
      icon: Zap,
    },
    {
      id: "deep-understanding",
      label: "Deep Understanding",
      description: "Master complex subjects",
      icon: Brain,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Set your study goals</h2>
        <p className="text-muted-foreground mt-2">
          What&apos;s your primary learning objective?
        </p>
      </div>

      <div className="grid gap-3">
        {goals.map((goal) => {
          const isSelected = selectedGoal === goal.id;
          const Icon = goal.icon;
          return (
            <button
              key={goal.id}
              onClick={() => setSelectedGoal(goal.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{goal.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {goal.description}
                </p>
              </div>
              {isSelected && <Check className="h-5 w-5 text-primary ml-auto" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Daily study time (minutes)</Label>
        <div className="flex gap-2">
          {["15", "30", "45", "60", "90"].map((time) => (
            <button
              key={time}
              onClick={() => setStudyTime(time)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                studyTime === time
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted hover:border-primary/50"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => onNext(selectedGoal)}
          disabled={!selectedGoal}
          className="flex-1"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 4: Complete
function CompleteStep({ onFinish }: { onFinish: () => void }) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFinish = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onFinish();
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
        <p className="text-muted-foreground mt-2">
          Your account is ready. Let&apos;s start your learning journey!
        </p>
      </div>

      <Card className="text-left">
        <CardHeader>
          <CardTitle className="text-lg">Quick tips to get started:</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              1
            </span>
            <span className="text-sm">
              Upload your first study material from the Upload page
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              2
            </span>
            <span className="text-sm">
              Create your first course to organize your materials
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              3
            </span>
            <span className="text-sm">
              Start studying with AI-generated flashcards and quizzes
            </span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleFinish} className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up your account...
          </>
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [, setOnboardingData] = React.useState({
    subjects: [] as string[],
    goal: "",
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {steps[currentStep - 1].title}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {currentStep === 1 && <WelcomeStep onNext={handleNext} />}
            {currentStep === 2 && (
              <SubjectStep
                onNext={(subjects) => {
                  setOnboardingData((prev) => ({ ...prev, subjects }));
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <GoalsStep
                onNext={(goal) => {
                  setOnboardingData((prev) => ({ ...prev, goal }));
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && <CompleteStep onFinish={handleFinish} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
