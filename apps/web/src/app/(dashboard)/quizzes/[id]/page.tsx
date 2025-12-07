"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Flag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

interface QuizState {
  currentQuestion: number;
  answers: Record<string, string | number>;
  flagged: Set<string>;
  isSubmitted: boolean;
  timeRemaining: number;
}

// Timer Component
function Timer({ seconds, onTimeUp }: { seconds: number; onTimeUp: () => void }) {
  const [timeLeft, setTimeLeft] = React.useState(seconds);

  React.useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const isLow = timeLeft < 60;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono",
        isLow ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-muted"
      )}
    >
      <Clock className="h-4 w-4" />
      <span>
        {minutes.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

// Question Navigator
function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  flagged,
  onSelect,
}: {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string | number>;
  flagged: Set<string>;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((q, index) => {
        const isAnswered = answers[q.id] !== undefined;
        const isFlagged = flagged.has(q.id);
        const isCurrent = index === currentIndex;

        return (
          <button
            key={q.id}
            onClick={() => onSelect(index)}
            className={cn(
              "relative h-10 w-10 rounded-lg text-sm font-medium transition-colors",
              isCurrent && "ring-2 ring-primary ring-offset-2",
              isAnswered
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
              !isAnswered && !isCurrent && "text-muted-foreground"
            )}
          >
            {index + 1}
            {isFlagged && (
              <Flag className="absolute -top-1 -right-1 h-3 w-3 text-orange-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Answer Option Component
function AnswerOption({
  option,
  index,
  isSelected,
  isCorrect,
  isWrong,
  showResult,
  onSelect,
}: {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  showResult: boolean;
  onSelect: () => void;
}) {
  const labels = ["A", "B", "C", "D", "E"];

  return (
    <button
      onClick={onSelect}
      disabled={showResult}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
        !showResult && "hover:border-primary hover:bg-primary/5",
        isSelected && !showResult && "border-primary bg-primary/5",
        showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
        showResult && isWrong && "border-red-500 bg-red-50 dark:bg-red-900/20"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
          isSelected && !showResult && "bg-primary text-primary-foreground",
          !isSelected && !showResult && "bg-muted",
          showResult && isCorrect && "bg-green-500 text-white",
          showResult && isWrong && "bg-red-500 text-white"
        )}
      >
        {showResult && isCorrect ? (
          <Check className="h-4 w-4" />
        ) : showResult && isWrong ? (
          <X className="h-4 w-4" />
        ) : (
          labels[index]
        )}
      </span>
      <span className="flex-1">{option}</span>
    </button>
  );
}

// Results Summary Component
function ResultsSummary({
  questions,
  answers,
  onReview,
  onRetake,
}: {
  questions: Question[];
  answers: Record<string, string | number>;
  onReview: () => void;
  onRetake: () => void;
}) {
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctAnswer
  ).length;
  const percentage = Math.round((correctCount / questions.length) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { grade: "A", color: "text-green-600" };
    if (percentage >= 80) return { grade: "B", color: "text-blue-600" };
    if (percentage >= 70) return { grade: "C", color: "text-yellow-600" };
    if (percentage >= 60) return { grade: "D", color: "text-orange-600" };
    return { grade: "F", color: "text-red-600" };
  };

  const { grade, color } = getGrade();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
        <CardDescription>Here are your results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score */}
        <div className="text-center p-6 rounded-lg bg-primary/5">
          <p className={`text-6xl font-bold ${color}`}>{grade}</p>
          <p className="text-3xl font-bold mt-2">{percentage}%</p>
          <p className="text-muted-foreground mt-1">
            {correctCount} out of {questions.length} correct
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Performance</span>
            <span>{percentage}%</span>
          </div>
          <Progress
            value={percentage}
            className={cn(
              "h-3",
              percentage >= 70
                ? "[&>div]:bg-green-500"
                : percentage >= 50
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-red-500"
            )}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {correctCount}
            </p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {questions.length - correctCount}
            </p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{questions.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={onReview}>
            Review Answers
          </Button>
          <Button variant="outline" className="flex-1" onClick={onRetake}>
            Retake Quiz
          </Button>
          <Button className="flex-1" asChild>
            <Link href="/quizzes">
              <Check className="mr-2 h-4 w-4" />
              Done
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuizPage() {
  const [state, setState] = React.useState<QuizState>({
    currentQuestion: 0,
    answers: {},
    flagged: new Set(),
    isSubmitted: false,
    timeRemaining: 20 * 60, // 20 minutes
  });
  const [isReviewing, setIsReviewing] = React.useState(false);

  // Mock questions
  const questions: Question[] = [
    {
      id: "1",
      type: "multiple_choice",
      question: "What is the primary function of mitochondria?",
      options: [
        "Protein synthesis",
        "ATP production",
        "DNA replication",
        "Cell division",
      ],
      correctAnswer: 1,
      explanation:
        "Mitochondria are often called the 'powerhouse of the cell' because they generate most of the cell's ATP through cellular respiration.",
    },
    {
      id: "2",
      type: "multiple_choice",
      question: "Which organelle is responsible for protein synthesis?",
      options: ["Golgi apparatus", "Lysosome", "Ribosome", "Endoplasmic reticulum"],
      correctAnswer: 2,
      explanation:
        "Ribosomes are responsible for translating mRNA into amino acid sequences to create proteins.",
    },
    {
      id: "3",
      type: "true_false",
      question: "The cell membrane is composed of a single layer of phospholipids.",
      options: ["True", "False"],
      correctAnswer: 1,
      explanation:
        "The cell membrane is composed of a phospholipid bilayer (two layers), not a single layer.",
    },
    {
      id: "4",
      type: "multiple_choice",
      question: "What is the process by which water moves across a semipermeable membrane?",
      options: ["Diffusion", "Osmosis", "Active transport", "Facilitated diffusion"],
      correctAnswer: 1,
      explanation:
        "Osmosis is the movement of water molecules across a semipermeable membrane from an area of lower solute concentration to higher concentration.",
    },
    {
      id: "5",
      type: "multiple_choice",
      question: "Which structure is NOT found in prokaryotic cells?",
      options: ["Ribosomes", "Cell membrane", "Nucleus", "Cytoplasm"],
      correctAnswer: 2,
      explanation:
        "Prokaryotic cells lack a true nucleus. Their DNA is found in a region called the nucleoid, which is not membrane-bound.",
    },
  ];

  const currentQ = questions[state.currentQuestion];

  const handleAnswer = (answer: string | number) => {
    if (state.isSubmitted && !isReviewing) return;

    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQ.id]: answer },
    }));
  };

  const handleFlag = () => {
    setState((prev) => {
      const newFlagged = new Set(prev.flagged);
      if (newFlagged.has(currentQ.id)) {
        newFlagged.delete(currentQ.id);
      } else {
        newFlagged.add(currentQ.id);
      }
      return { ...prev, flagged: newFlagged };
    });
  };

  const handleNavigation = (direction: "prev" | "next") => {
    setState((prev) => ({
      ...prev,
      currentQuestion:
        direction === "prev"
          ? Math.max(0, prev.currentQuestion - 1)
          : Math.min(questions.length - 1, prev.currentQuestion + 1),
    }));
  };

  const handleSubmit = () => {
    setState((prev) => ({ ...prev, isSubmitted: true }));
  };

  const handleTimeUp = () => {
    handleSubmit();
  };

  const handleRetake = () => {
    setState({
      currentQuestion: 0,
      answers: {},
      flagged: new Set(),
      isSubmitted: false,
      timeRemaining: 20 * 60,
    });
    setIsReviewing(false);
  };

  const handleReview = () => {
    setState((prev) => ({ ...prev, currentQuestion: 0 }));
    setIsReviewing(true);
  };

  const answeredCount = Object.keys(state.answers).length;
  const progress = (answeredCount / questions.length) * 100;

  // Show results if submitted and not reviewing
  if (state.isSubmitted && !isReviewing) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/quizzes">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
        <ResultsSummary
          questions={questions}
          answers={state.answers}
          onReview={handleReview}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/quizzes">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Exit Quiz
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          {!state.isSubmitted && (
            <Timer seconds={state.timeRemaining} onTimeUp={handleTimeUp} />
          )}
          {isReviewing && (
            <Badge variant="secondary">Reviewing</Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>
            Question {state.currentQuestion + 1} of {questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {currentQ.type === "multiple_choice"
                      ? "Multiple Choice"
                      : currentQ.type === "true_false"
                        ? "True/False"
                        : "Short Answer"}
                  </Badge>
                  <CardTitle className="text-xl">{currentQ.question}</CardTitle>
                </div>
                <Button
                  variant={state.flagged.has(currentQ.id) ? "default" : "outline"}
                  size="icon"
                  onClick={handleFlag}
                  disabled={state.isSubmitted}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentQ.options?.map((option, index) => {
                const isSelected = state.answers[currentQ.id] === index;
                const isCorrect =
                  (state.isSubmitted || isReviewing) &&
                  index === currentQ.correctAnswer;
                const isWrong =
                  (state.isSubmitted || isReviewing) &&
                  isSelected &&
                  index !== currentQ.correctAnswer;

                return (
                  <AnswerOption
                    key={index}
                    option={option}
                    index={index}
                    isSelected={isSelected}
                    isCorrect={isCorrect}
                    isWrong={isWrong}
                    showResult={state.isSubmitted || isReviewing}
                    onSelect={() => handleAnswer(index)}
                  />
                );
              })}

              {/* Explanation (shown after submission) */}
              {(state.isSubmitted || isReviewing) && currentQ.explanation && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Explanation</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentQ.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handleNavigation("prev")}
              disabled={state.currentQuestion === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {state.currentQuestion === questions.length - 1 && !state.isSubmitted ? (
              <Button onClick={handleSubmit}>
                Submit Quiz
                <Check className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleNavigation("next")}
                disabled={state.currentQuestion === questions.length - 1}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionNavigator
                questions={questions}
                currentIndex={state.currentQuestion}
                answers={state.answers}
                flagged={state.flagged}
                onSelect={(index) =>
                  setState((prev) => ({ ...prev, currentQuestion: index }))
                }
              />

              {/* Legend */}
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-primary" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-muted" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-orange-500" />
                  <span>Flagged</span>
                </div>
              </div>

              {/* Submit Button (visible in sidebar too) */}
              {!state.isSubmitted && (
                <Button className="w-full mt-4" onClick={handleSubmit}>
                  Submit Quiz
                </Button>
              )}

              {isReviewing && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setIsReviewing(false)}
                >
                  View Results
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
