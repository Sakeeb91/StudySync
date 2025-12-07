"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  Clock,
  Filter,
  Folder,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  SortAsc,
  Sparkles,
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

interface FlashcardSet {
  id: string;
  title: string;
  course: string;
  courseId: string;
  totalCards: number;
  masteredCards: number;
  dueCards: number;
  lastStudied: string;
  createdAt: string;
  difficulty: "easy" | "medium" | "hard";
}

// Flashcard Set Card Component
function FlashcardSetCard({ set }: { set: FlashcardSet }) {
  const masteryPercentage = Math.round((set.masteredCards / set.totalCards) * 100);

  const difficultyColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{set.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  {set.course}
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
              <DropdownMenuItem>Edit Set</DropdownMenuItem>
              <DropdownMenuItem>Add Cards</DropdownMenuItem>
              <DropdownMenuItem>Reset Progress</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete Set</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mastery Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-muted-foreground">Mastery</span>
            <span className="text-sm font-medium">{masteryPercentage}%</span>
          </div>
          <Progress value={masteryPercentage} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold">{set.totalCards}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <span className="text-lg font-semibold text-green-600">{set.masteredCards}</span>
            <span className="text-xs text-muted-foreground">Mastered</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <span className={`text-lg font-semibold ${set.dueCards > 0 ? "text-orange-600" : ""}`}>
              {set.dueCards}
            </span>
            <span className="text-xs text-muted-foreground">Due</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {set.lastStudied}
          </div>
          <Badge className={difficultyColors[set.difficulty]}>
            {set.difficulty}
          </Badge>
        </div>

        {/* Study Button */}
        <Button className="w-full" asChild>
          <Link href={`/flashcards/${set.id}/study`}>
            <Play className="mr-2 h-4 w-4" />
            Study Now
            {set.dueCards > 0 && (
              <Badge variant="secondary" className="ml-2">
                {set.dueCards} due
              </Badge>
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function FlashcardsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("due");

  // Mock data
  const flashcardSets: FlashcardSet[] = [
    {
      id: "1",
      title: "Cell Biology - Organelles",
      course: "Biology 101",
      courseId: "1",
      totalCards: 25,
      masteredCards: 18,
      dueCards: 5,
      lastStudied: "2 hours ago",
      createdAt: "2024-01-15",
      difficulty: "medium",
    },
    {
      id: "2",
      title: "Organic Chemistry - Functional Groups",
      course: "Chemistry",
      courseId: "2",
      totalCards: 32,
      masteredCards: 12,
      dueCards: 15,
      lastStudied: "Yesterday",
      createdAt: "2024-01-10",
      difficulty: "hard",
    },
    {
      id: "3",
      title: "Physics - Newton's Laws",
      course: "Physics",
      courseId: "3",
      totalCards: 15,
      masteredCards: 15,
      dueCards: 0,
      lastStudied: "3 days ago",
      createdAt: "2024-01-05",
      difficulty: "easy",
    },
    {
      id: "4",
      title: "Calculus - Integration Rules",
      course: "Mathematics",
      courseId: "4",
      totalCards: 40,
      masteredCards: 35,
      dueCards: 3,
      lastStudied: "1 week ago",
      createdAt: "2023-12-01",
      difficulty: "hard",
    },
    {
      id: "5",
      title: "WWII - Key Events Timeline",
      course: "History",
      courseId: "5",
      totalCards: 28,
      masteredCards: 20,
      dueCards: 8,
      lastStudied: "4 days ago",
      createdAt: "2024-01-08",
      difficulty: "medium",
    },
  ];

  const filteredSets = flashcardSets.filter((set) =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCards = flashcardSets.reduce((acc, set) => acc + set.totalCards, 0);
  const totalMastered = flashcardSets.reduce((acc, set) => acc + set.masteredCards, 0);
  const totalDue = flashcardSets.reduce((acc, set) => acc + set.dueCards, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">
            Review and master your study materials.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/flashcards/study">
              <Play className="mr-2 h-4 w-4" />
              Quick Study
            </Link>
          </Button>
          <Button asChild>
            <Link href="/flashcards/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Set
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Flashcard Sets</CardDescription>
            <CardTitle className="text-2xl">{flashcardSets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cards</CardDescription>
            <CardTitle className="text-2xl">{totalCards}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mastered</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {totalMastered}
              <span className="text-sm text-muted-foreground font-normal ml-1">
                ({Math.round((totalMastered / totalCards) * 100)}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={totalDue > 0 ? "border-orange-200 dark:border-orange-800" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Due for Review</CardDescription>
            <CardTitle className={`text-2xl ${totalDue > 0 ? "text-orange-600" : ""}`}>
              {totalDue}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Study CTA */}
      {totalDue > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Time to study!</h3>
                <p className="text-sm text-muted-foreground">
                  You have {totalDue} cards due for review across {flashcardSets.filter(s => s.dueCards > 0).length} sets.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/flashcards/study">
                <Play className="mr-2 h-4 w-4" />
                Start Review Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search flashcard sets..."
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
              <SelectItem value="due">Due First</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="mastery">Mastery</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Flashcard Sets Grid */}
      {filteredSets.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSets.map((set) => (
            <FlashcardSetCard key={set.id} set={set} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No flashcard sets found</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? "No sets match your search criteria."
                : "Create your first flashcard set or upload study materials to generate them automatically."}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" asChild>
                  <Link href="/upload">Upload Notes</Link>
                </Button>
                <Button asChild>
                  <Link href="/flashcards/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Set
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
