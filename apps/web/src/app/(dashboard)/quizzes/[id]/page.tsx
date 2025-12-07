"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Flag,
  Loader2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  startQuizAttempt,
  submitQuiz,
  type Question,
  type QuizAttempt,
  type AnswerResult,
} from "@/lib/api";

interface QuizData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  passingScore: number;
  questions: Question[];
}

interface QuizState {
  currentQuestion: number;
  answers: Record<string, string>;
  flagged: Set<string>;
  isSubmitted: boolean;
  startTime: number;
}

// Timer Component
function Timer({
  seconds,
  onTimeUp,
}: {
  seconds: number;
  onTimeUp: () => void;
}) {
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
        isLow
          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          : "bg-muted"
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
  answers: Record<string, string>;
  flagged: Set<string>;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((q, index) => {
        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
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
  const labels = ["A", "B", "C", "D", "E", "F"];

  return (
    <button
      onClick={onSelect}
      disabled={showResult}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
        !showResult && "hover:border-primary hover:bg-primary/5",
        isSelected && !showResult && "border-primary bg-primary/5",
        showResult &&
          isCorrect &&
          "border-green-500 bg-green-50 dark:bg-green-900/20",
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
  score,
  totalQuestions,
  correctCount,
  passed,
  passingScore,
  timeSpent,
  onReview,
  onRetake,
}: {
  score: number;
  totalQuestions: number;
  correctCount: number;
  passed: boolean;
  passingScore: number;
  timeSpent: number;
  onReview: () => void;
  onRetake: () => void;
}) {
  const getGrade = () => {
    if (score >= 90) return { grade: "A", color: "text-green-600" };
    if (score >= 80) return { grade: "B", color: "text-blue-600" };
    if (score >= 70) return { grade: "C", color: "text-yellow-600" };
    if (score >= 60) return { grade: "D", color: "text-orange-600" };
    return { grade: "F", color: "text-red-600" };
  };

  const { grade, color } = getGrade();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

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
          <p className="text-3xl font-bold mt-2">{score}%</p>
          <p className="text-muted-foreground mt-1">
            {correctCount} out of {totalQuestions} correct
          </p>
          <Badge
            variant={passed ? "success" : "destructive"}
            className="mt-2"
          >
            {passed ? "Passed" : "Failed"} (min: {passingScore}%)
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Performance</span>
            <span>{score}%</span>
          </div>
          <Progress
            value={score}
            className={cn(
              "h-3",
              score >= 70
                ? "[&>div]:bg-green-500"
                : score >= 50
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-red-500"
            )}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {correctCount}
            </p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {totalQuestions - correctCount}
            </p>
            <p className="text-sm text-muted-foreground">Incorrect</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{formatTime(timeSpent)}</p>
            <p className="text-sm text-muted-foreground">Time</p>
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
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [quizData, setQuizData] = React.useState<QuizData | null>(null);
  const [attempt, setAttempt] = React.useState<QuizAttempt | null>(null);
  const [results, setResults] = React.useState<{
    score: number;
    passed: boolean;
    answers: AnswerResult[];
    summary: { total: number; correct: number; incorrect: number };
    timeSpent: number;
  } | null>(null);

  const [state, setState] = React.useState<QuizState>({
    currentQuestion: 0,
    answers: {},
    flagged: new Set(),
    isSubmitted: false,
    startTime: Date.now(),
  });
  const [isReviewing, setIsReviewing] = React.useState(false);

  // Start quiz attempt on mount
  React.useEffect(() => {
    const startQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await startQuizAttempt(quizId);

        setQuizData(response.quiz);
        setAttempt(response.attempt);
        setState((prev) => ({
          ...prev,
          startTime: Date.now(),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start quiz");
      } finally {
        setLoading(false);
      }
    };

    startQuiz();
  }, [quizId]);

  const questions = quizData?.questions || [];
  const currentQ = questions[state.currentQuestion];

  const handleAnswer = (answer: string) => {
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

  const handleSubmit = async () => {
    if (!attempt || !quizData) return;

    try {
      setSubmitting(true);

      const timeSpent = Math.floor((Date.now() - state.startTime) / 1000);

      // Convert answers to array format
      const answersArray = Object.entries(state.answers).map(([questionId, userAnswer]) => ({
        questionId,
        userAnswer,
      }));

      const response = await submitQuiz(quizId, attempt.id, {
        answers: answersArray,
        timeSpent,
      });

      setResults({
        score: response.result.score,
        passed: response.result.passed,
        answers: response.result.answers,
        summary: response.result.summary,
        timeSpent,
      });

      setState((prev) => ({ ...prev, isSubmitted: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    handleSubmit();
  };

  const handleRetake = () => {
    // Reload the page to start a new attempt
    router.refresh();
    window.location.reload();
  };

  const handleReview = () => {
    setState((prev) => ({ ...prev, currentQuestion: 0 }));
    setIsReviewing(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-full" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-8 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-10 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/quizzes">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive text-lg">{error}</p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizData || !currentQ) {
    return null;
  }

  const answeredCount = Object.values(state.answers).filter(a => a !== "").length;
  const progress = (answeredCount / questions.length) * 100;
  const timeLimit = quizData.timeLimit ? quizData.timeLimit * 60 : 30 * 60; // Default 30 min

  // Get result for current question when reviewing
  const currentResult = results?.answers.find((a) => a.questionId === currentQ.id);

  // Show results if submitted and not reviewing
  if (state.isSubmitted && !isReviewing && results) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/quizzes">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
        <ResultsSummary
          score={results.score}
          totalQuestions={results.summary.total}
          correctCount={results.summary.correct}
          passed={results.passed}
          passingScore={quizData.passingScore}
          timeSpent={results.timeSpent}
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
            <Timer seconds={timeLimit} onTimeUp={handleTimeUp} />
          )}
          {isReviewing && <Badge variant="secondary">Reviewing</Badge>}
        </div>
      </div>

      {/* Quiz Title */}
      <div>
        <h1 className="text-2xl font-bold">{quizData.title}</h1>
        {quizData.description && (
          <p className="text-muted-foreground">{quizData.description}</p>
        )}
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
                    {currentQ.type === "MULTIPLE_CHOICE"
                      ? "Multiple Choice"
                      : currentQ.type === "TRUE_FALSE"
                        ? "True/False"
                        : currentQ.type === "SHORT_ANSWER"
                          ? "Short Answer"
                          : "Essay"}
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
              {/* Multiple Choice / True-False Options */}
              {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE") &&
                currentQ.options?.map((option, index) => {
                  const isSelected = state.answers[currentQ.id] === String(index);
                  const isCorrect =
                    isReviewing && currentResult?.correctAnswer === String(index);
                  const isWrong =
                    isReviewing &&
                    isSelected &&
                    currentResult?.correctAnswer !== String(index);

                  return (
                    <AnswerOption
                      key={index}
                      option={option}
                      index={index}
                      isSelected={isSelected}
                      isCorrect={isCorrect}
                      isWrong={isWrong}
                      showResult={isReviewing}
                      onSelect={() => handleAnswer(String(index))}
                    />
                  );
                })}

              {/* Short Answer / Essay */}
              {(currentQ.type === "SHORT_ANSWER" || currentQ.type === "ESSAY") && (
                <Textarea
                  placeholder={
                    currentQ.type === "SHORT_ANSWER"
                      ? "Enter your answer..."
                      : "Write your essay response..."
                  }
                  value={state.answers[currentQ.id] || ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  disabled={state.isSubmitted}
                  rows={currentQ.type === "ESSAY" ? 8 : 3}
                  className={cn(
                    isReviewing &&
                      currentResult?.isCorrect &&
                      "border-green-500",
                    isReviewing &&
                      !currentResult?.isCorrect &&
                      "border-red-500"
                  )}
                />
              )}

              {/* Explanation (shown after submission) */}
              {isReviewing && currentResult && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {currentResult.isCorrect ? (
                          <Badge variant="success">Correct</Badge>
                        ) : (
                          <Badge variant="destructive">Incorrect</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          +{currentResult.points} points
                        </span>
                      </div>
                      {!currentResult.isCorrect && (
                        <p className="text-sm mb-2">
                          <span className="font-medium">Correct answer: </span>
                          {currentQ.type === "MULTIPLE_CHOICE" ||
                          currentQ.type === "TRUE_FALSE"
                            ? currentQ.options?.[parseInt(currentResult.correctAnswer)]
                            : currentResult.correctAnswer}
                        </p>
                      )}
                      {currentResult.explanation && (
                        <>
                          <p className="font-medium">Explanation</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {currentResult.explanation}
                          </p>
                        </>
                      )}
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

            {state.currentQuestion === questions.length - 1 &&
            !state.isSubmitted ? (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Quiz
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
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
                <Button
                  className="w-full mt-4"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Quiz"
                  )}
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
