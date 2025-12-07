"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ChevronLeft,
  RotateCcw,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
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
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
  timesReviewed: number;
  lastReviewedAt?: string;
}

// Flashcard Component with flip animation
function FlashcardCard({
  card,
  isFlipped,
  onFlip,
}: {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      className="perspective-1000 w-full max-w-2xl mx-auto cursor-pointer"
      onClick={onFlip}
    >
      <div
        className={cn(
          "relative w-full h-[400px] transition-transform duration-500 preserve-3d",
          isFlipped && "rotate-y-180"
        )}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden">
          <Card className="h-full flex flex-col">
            <CardHeader className="text-center border-b">
              <CardDescription className="flex items-center justify-center gap-2">
                <Brain className="h-4 w-4" />
                Question
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-8">
              <p className="text-xl md:text-2xl text-center font-medium">
                {card.front}
              </p>
            </CardContent>
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Click to reveal answer
            </div>
          </Card>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <Card className="h-full flex flex-col bg-primary/5">
            <CardHeader className="text-center border-b">
              <CardDescription className="flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" />
                Answer
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-8">
              <p className="text-xl md:text-2xl text-center font-medium">
                {card.back}
              </p>
            </CardContent>
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              How well did you know this?
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function StudyProgress({
  current,
  total,
  correct,
  incorrect,
}: {
  current: number;
  total: number;
  correct: number;
  incorrect: number;
}) {
  const progress = ((current) / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Card {current + 1} of {total}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-4 w-4" />
            {correct}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <X className="h-4 w-4" />
            {incorrect}
          </span>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// Difficulty Button Component
function DifficultyButton({
  label,
  description,
  icon: Icon,
  onClick,
  color,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        "flex-1 h-auto py-4 flex flex-col items-center gap-2 hover:border-2 transition-all",
        color
      )}
      onClick={onClick}
    >
      <Icon className="h-6 w-6" />
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </Button>
  );
}

export default function FlashcardStudyPage() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [incorrectCount, setIncorrectCount] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  // Mock flashcards
  const flashcards: Flashcard[] = [
    {
      id: "1",
      front: "What is the powerhouse of the cell?",
      back: "The mitochondria - responsible for producing ATP through cellular respiration.",
      difficulty: "easy",
      timesReviewed: 5,
    },
    {
      id: "2",
      front: "What is the function of the ribosome?",
      back: "Ribosomes synthesize proteins by translating messenger RNA (mRNA) into amino acid sequences.",
      difficulty: "medium",
      timesReviewed: 3,
    },
    {
      id: "3",
      front: "Describe the structure of the cell membrane.",
      back: "The cell membrane is a phospholipid bilayer with embedded proteins, cholesterol, and carbohydrates. It's selectively permeable.",
      difficulty: "hard",
      timesReviewed: 2,
    },
    {
      id: "4",
      front: "What is osmosis?",
      back: "Osmosis is the movement of water molecules across a semipermeable membrane from an area of lower solute concentration to higher solute concentration.",
      difficulty: "medium",
      timesReviewed: 4,
    },
    {
      id: "5",
      front: "What is the difference between prokaryotic and eukaryotic cells?",
      back: "Prokaryotic cells lack a nucleus and membrane-bound organelles (bacteria). Eukaryotic cells have a nucleus and membrane-bound organelles (plants, animals, fungi).",
      difficulty: "hard",
      timesReviewed: 1,
    },
  ];

  const currentCard = flashcards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleResponse = (response: "again" | "hard" | "good" | "easy") => {
    if (response === "again" || response === "hard") {
      setIncorrectCount((prev) => prev + 1);
    } else {
      setCorrectCount((prev) => prev + 1);
    }

    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setIsComplete(false);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  // Completion Screen
  if (isComplete) {
    const accuracy = Math.round((correctCount / flashcards.length) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Study Session Complete!</CardTitle>
            <CardDescription>
              Great job! Here&apos;s how you did.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{flashcards.length}</p>
                <p className="text-sm text-muted-foreground">Cards Reviewed</p>
              </div>
              <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {correctCount}
                </p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {incorrectCount}
                </p>
                <p className="text-sm text-muted-foreground">Need Review</p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="text-center p-6 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">Accuracy</p>
              <p className="text-5xl font-bold text-primary">{accuracy}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                {accuracy >= 80
                  ? "Excellent! You're mastering this material."
                  : accuracy >= 60
                    ? "Good progress! Keep reviewing."
                    : "Keep practicing - you'll get there!"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRestart}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Study Again
              </Button>
              <Button className="flex-1" asChild>
                <Link href="/flashcards">
                  <Check className="mr-2 h-4 w-4" />
                  Finish
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/flashcards">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Flashcards
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
        </div>
      </div>

      {/* Progress */}
      <StudyProgress
        current={currentIndex}
        total={flashcards.length}
        correct={correctCount}
        incorrect={incorrectCount}
      />

      {/* Flashcard */}
      <FlashcardCard
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={handleFlip}
      />

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Use keyboard arrows to navigate
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Response Buttons (shown when flipped) */}
      {isFlipped && (
        <div className="flex gap-3 max-w-2xl mx-auto">
          <DifficultyButton
            label="Again"
            description="< 1 min"
            icon={ThumbsDown}
            onClick={() => handleResponse("again")}
            color="hover:border-red-500 hover:text-red-500"
          />
          <DifficultyButton
            label="Hard"
            description="< 10 min"
            icon={ThumbsDown}
            onClick={() => handleResponse("hard")}
            color="hover:border-orange-500 hover:text-orange-500"
          />
          <DifficultyButton
            label="Good"
            description="1 day"
            icon={ThumbsUp}
            onClick={() => handleResponse("good")}
            color="hover:border-green-500 hover:text-green-500"
          />
          <DifficultyButton
            label="Easy"
            description="4 days"
            icon={Check}
            onClick={() => handleResponse("easy")}
            color="hover:border-blue-500 hover:text-blue-500"
          />
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Press <kbd className="px-2 py-1 bg-muted rounded">Space</kbd> to flip,{" "}
          <kbd className="px-2 py-1 bg-muted rounded">1-4</kbd> to rate difficulty
        </p>
      </div>
    </div>
  );
}
