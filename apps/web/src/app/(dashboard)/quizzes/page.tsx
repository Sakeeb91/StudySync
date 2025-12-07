"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  ClipboardList,
  Filter,
  Folder,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  SortAsc,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Quiz {
  id: string;
  title: string;
  course: string;
  courseId: string;
  questions: number;
  duration: number;
  attempts: number;
  bestScore: number;
  lastAttempt?: string;
  difficulty: "easy" | "medium" | "hard";
  status: "not_started" | "in_progress" | "completed";
}

// Quiz Card Component
function QuizCard({ quiz }: { quiz: Quiz }) {
  const difficultyColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  const statusBadge = {
    not_started: { label: "Not Started", variant: "secondary" as const },
    in_progress: { label: "In Progress", variant: "warning" as const },
    completed: { label: "Completed", variant: "success" as const },
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  {quiz.course}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Quiz</DropdownMenuItem>
              <DropdownMenuItem>View Results</DropdownMenuItem>
              <DropdownMenuItem>Reset Progress</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete Quiz</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quiz Info */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{quiz.questions}</span>
            <span className="text-xs text-muted-foreground">Questions</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{quiz.duration}</span>
            <span className="text-xs text-muted-foreground">Minutes</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">
              {quiz.bestScore > 0 ? `${quiz.bestScore}%` : "-"}
            </span>
            <span className="text-xs text-muted-foreground">Best</span>
          </div>
        </div>

        {/* Best Score Progress (if attempted) */}
        {quiz.bestScore > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Best Score</span>
              <span className="text-sm font-medium">{quiz.bestScore}%</span>
            </div>
            <Progress
              value={quiz.bestScore}
              className={`h-2 ${
                quiz.bestScore >= 80
                  ? "[&>div]:bg-green-500"
                  : quiz.bestScore >= 60
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-red-500"
              }`}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge[quiz.status].variant}>
              {statusBadge[quiz.status].label}
            </Badge>
            {quiz.attempts > 0 && (
              <span className="text-xs text-muted-foreground">
                {quiz.attempts} attempt{quiz.attempts > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Badge className={difficultyColors[quiz.difficulty]}>
            {quiz.difficulty}
          </Badge>
        </div>

        {/* Action Button */}
        <Button className="w-full" asChild>
          <Link href={`/quizzes/${quiz.id}`}>
            <Play className="mr-2 h-4 w-4" />
            {quiz.status === "not_started" ? "Start Quiz" : "Continue"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuizzesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("recent");

  // Mock data
  const quizzes: Quiz[] = [
    {
      id: "1",
      title: "Cell Biology - Chapter 1",
      course: "Biology 101",
      courseId: "1",
      questions: 15,
      duration: 20,
      attempts: 2,
      bestScore: 85,
      lastAttempt: "2 hours ago",
      difficulty: "medium",
      status: "completed",
    },
    {
      id: "2",
      title: "Organic Chemistry Basics",
      course: "Chemistry",
      courseId: "2",
      questions: 20,
      duration: 30,
      attempts: 1,
      bestScore: 65,
      lastAttempt: "Yesterday",
      difficulty: "hard",
      status: "completed",
    },
    {
      id: "3",
      title: "Newton's Laws of Motion",
      course: "Physics",
      courseId: "3",
      questions: 10,
      duration: 15,
      attempts: 0,
      bestScore: 0,
      difficulty: "easy",
      status: "not_started",
    },
    {
      id: "4",
      title: "Integration Techniques",
      course: "Mathematics",
      courseId: "4",
      questions: 25,
      duration: 45,
      attempts: 3,
      bestScore: 92,
      lastAttempt: "1 week ago",
      difficulty: "hard",
      status: "completed",
    },
    {
      id: "5",
      title: "World War II Events",
      course: "History",
      courseId: "5",
      questions: 20,
      duration: 25,
      attempts: 1,
      bestScore: 75,
      lastAttempt: "4 days ago",
      difficulty: "medium",
      status: "in_progress",
    },
  ];

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: quizzes.length,
    completed: quizzes.filter((q) => q.status === "completed").length,
    totalAttempts: quizzes.reduce((acc, q) => acc + q.attempts, 0),
    avgScore:
      quizzes.filter((q) => q.bestScore > 0).length > 0
        ? Math.round(
            quizzes.filter((q) => q.bestScore > 0).reduce((acc, q) => acc + q.bestScore, 0) /
              quizzes.filter((q) => q.bestScore > 0).length
          )
        : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">
            Test your knowledge with AI-generated quizzes.
          </p>
        </div>
        <Button asChild>
          <Link href="/quizzes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Quiz
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Quizzes</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attempts</CardDescription>
            <CardTitle className="text-2xl">{stats.totalAttempts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-2xl">
              {stats.avgScore > 0 ? `${stats.avgScore}%` : "-"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="score">Best Score</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No quizzes found</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? "No quizzes match your search criteria."
                : "Create your first quiz or upload study materials to generate them automatically."}
            </p>
            {!searchQuery && (
              <Button className="mt-4" asChild>
                <Link href="/quizzes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quiz
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
