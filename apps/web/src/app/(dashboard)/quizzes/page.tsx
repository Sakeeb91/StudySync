"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  ClipboardList,
  Filter,
  Folder,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  SortAsc,
  Target,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getQuizzes,
  deleteQuiz,
  getUserQuizStats,
  type Quiz,
} from "@/lib/api";

interface QuizWithStats extends Quiz {
  difficulty?: "easy" | "medium" | "hard";
  status?: "not_started" | "in_progress" | "completed";
}

// Derive quiz status and difficulty from data
function deriveQuizStatus(quiz: Quiz): { status: "not_started" | "in_progress" | "completed"; difficulty: "easy" | "medium" | "hard" } {
  // Derive status based on attempts
  let status: "not_started" | "in_progress" | "completed" = "not_started";
  if (quiz._count?.attempts && quiz._count.attempts > 0) {
    if (quiz.bestScore !== null && quiz.bestScore !== undefined) {
      status = "completed";
    } else {
      status = "in_progress";
    }
  }

  // Derive difficulty based on time limit and question count
  let difficulty: "easy" | "medium" | "hard" = "medium";
  const questionCount = quiz._count?.questions || 0;
  const timeLimit = quiz.timeLimit || 0;

  if (timeLimit > 0 && questionCount > 0) {
    const timePerQuestion = timeLimit / questionCount;
    if (timePerQuestion > 2) {
      difficulty = "easy";
    } else if (timePerQuestion < 1) {
      difficulty = "hard";
    }
  } else if (questionCount > 20) {
    difficulty = "hard";
  } else if (questionCount < 10) {
    difficulty = "easy";
  }

  return { status, difficulty };
}

// Quiz Card Component
function QuizCard({
  quiz,
  onDelete
}: {
  quiz: QuizWithStats;
  onDelete: (id: string) => void;
}) {
  const { status, difficulty } = deriveQuizStatus(quiz);

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

  const questionCount = quiz._count?.questions || 0;
  const attemptCount = quiz._count?.attempts || 0;
  const bestScore = quiz.bestScore || 0;

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
                {quiz.tags && quiz.tags.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Folder className="h-3 w-3 mr-1" />
                    {quiz.tags[0]}
                  </Badge>
                )}
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
              <DropdownMenuItem asChild>
                <Link href={`/quizzes/${quiz.id}/edit`}>Edit Quiz</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quizzes/${quiz.id}/results`}>View Results</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(quiz.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Quiz
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quiz Info */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{questionCount}</span>
            <span className="text-xs text-muted-foreground">Questions</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{quiz.timeLimit || "-"}</span>
            <span className="text-xs text-muted-foreground">Minutes</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">
              {bestScore > 0 ? `${bestScore}%` : "-"}
            </span>
            <span className="text-xs text-muted-foreground">Best</span>
          </div>
        </div>

        {/* Best Score Progress (if attempted) */}
        {bestScore > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Best Score</span>
              <span className="text-sm font-medium">{bestScore}%</span>
            </div>
            <Progress
              value={bestScore}
              className={`h-2 ${
                bestScore >= 80
                  ? "[&>div]:bg-green-500"
                  : bestScore >= 60
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-red-500"
              }`}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Badge variant={statusBadge[status].variant}>
              {statusBadge[status].label}
            </Badge>
            {attemptCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {attemptCount} attempt{attemptCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Badge className={difficultyColors[difficulty]}>
            {difficulty}
          </Badge>
        </div>

        {/* Action Button */}
        <Button className="w-full" asChild>
          <Link href={`/quizzes/${quiz.id}`}>
            <Play className="mr-2 h-4 w-4" />
            {status === "not_started" ? "Start Quiz" : "Continue"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for quiz cards
function QuizCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function QuizzesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("recent");
  const [quizzes, setQuizzes] = React.useState<Quiz[]>([]);
  const [stats, setStats] = React.useState({
    total: 0,
    completed: 0,
    totalAttempts: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [quizToDelete, setQuizToDelete] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Fetch quizzes
  const fetchQuizzes = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [quizzesResponse, statsResponse] = await Promise.all([
        getQuizzes({ search: searchQuery || undefined }),
        getUserQuizStats(),
      ]);

      setQuizzes(quizzesResponse.quizzes);
      setStats({
        total: quizzesResponse.pagination.total,
        completed: quizzesResponse.quizzes.filter(q => (q._count?.attempts || 0) > 0).length,
        totalAttempts: statsResponse.stats.totalAttempts,
        avgScore: statsResponse.stats.averageScore,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Handle delete
  const handleDeleteClick = (id: string) => {
    setQuizToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;

    try {
      setDeleting(true);
      await deleteQuiz(quizToDelete);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete));
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    }
  };

  // Sort quizzes
  const sortedQuizzes = React.useMemo(() => {
    const sorted = [...quizzes];
    switch (sortBy) {
      case "score":
        return sorted.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
      case "name":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "questions":
        return sorted.sort((a, b) => (b._count?.questions || 0) - (a._count?.questions || 0));
      case "recent":
      default:
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  }, [quizzes, sortBy]);

  // Filter by search
  const filteredQuizzes = sortedQuizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.completed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attempts</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.totalAttempts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : stats.avgScore > 0 ? (
                `${stats.avgScore}%`
              ) : (
                "-"
              )}
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
              <SelectItem value="questions">Questions</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-6">
            <p className="text-destructive">{error}</p>
            <Button variant="link" onClick={fetchQuizzes}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <QuizCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Quizzes Grid */}
      {!loading && !error && filteredQuizzes.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredQuizzes.length === 0 && (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quiz? This action cannot be undone.
              All questions and attempt history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
