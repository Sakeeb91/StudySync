"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Search,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "course" | "material" | "flashcard" | "quiz";
  title: string;
  description?: string;
  course?: string;
  matchedText?: string;
  updatedAt: string;
}

// Search Result Card
function SearchResultCard({ result }: { result: SearchResult }) {
  const icons = {
    course: GraduationCap,
    material: FileText,
    flashcard: Brain,
    quiz: ClipboardList,
  };
  const Icon = icons[result.type];

  const typeColors = {
    course: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
    material: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
    flashcard: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
    quiz: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
  };

  const getHref = () => {
    switch (result.type) {
      case "course":
        return `/courses/${result.id}`;
      case "material":
        return `/materials/${result.id}`;
      case "flashcard":
        return `/flashcards/${result.id}`;
      case "quiz":
        return `/quizzes/${result.id}`;
    }
  };

  return (
    <Link href={getHref()}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="flex items-start gap-4 p-4">
          <div className={cn("p-2 rounded-lg", typeColors[result.type])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{result.title}</h3>
              <Badge variant="outline" className="capitalize text-xs">
                {result.type}
              </Badge>
            </div>
            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {result.description}
              </p>
            )}
            {result.matchedText && (
              <p className="text-sm text-muted-foreground mt-1">
                ...{result.matchedText}...
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {result.course && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {result.course}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.updatedAt}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Recent Search Item
function RecentSearchItem({
  query,
  onClick,
  onRemove,
}: {
  query: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between group px-3 py-2 rounded-lg hover:bg-muted">
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Clock className="h-4 w-4" />
        {query}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [recentSearches, setRecentSearches] = React.useState([
    "cell biology",
    "organic chemistry",
    "newton's laws",
  ]);

  // Mock search results
  const allResults: SearchResult[] = [
    {
      id: "1",
      type: "course",
      title: "Biology 101 - Cell Structure & Function",
      description:
        "Introduction to cellular biology, covering cell organelles, membrane transport, and cellular processes.",
      updatedAt: "2 hours ago",
    },
    {
      id: "2",
      type: "material",
      title: "Cell Biology Chapter 1 - Introduction to Cells.pdf",
      course: "Biology 101",
      matchedText: "The cell is the basic unit of life...",
      updatedAt: "Yesterday",
    },
    {
      id: "3",
      type: "flashcard",
      title: "Cell Biology - Organelles",
      description: "25 cards about cell organelles and their functions",
      course: "Biology 101",
      updatedAt: "3 days ago",
    },
    {
      id: "4",
      type: "quiz",
      title: "Cell Biology - Chapter 1 Quiz",
      description: "15 questions covering basic cell structure",
      course: "Biology 101",
      updatedAt: "1 week ago",
    },
    {
      id: "5",
      type: "course",
      title: "Chemistry - Organic Compounds",
      description:
        "Study of organic chemistry including hydrocarbons and functional groups.",
      updatedAt: "Yesterday",
    },
    {
      id: "6",
      type: "flashcard",
      title: "Organic Chemistry - Functional Groups",
      description: "32 cards covering all major functional groups",
      course: "Chemistry",
      updatedAt: "4 days ago",
    },
  ];

  const filteredResults = allResults.filter((result) => {
    if (!query) return false;
    const matchesQuery =
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description?.toLowerCase().includes(query.toLowerCase());
    if (activeTab === "all") return matchesQuery;
    return matchesQuery && result.type === activeTab;
  });

  const resultCounts = {
    all: allResults.filter(
      (r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description?.toLowerCase().includes(query.toLowerCase())
    ).length,
    course: allResults.filter(
      (r) =>
        r.type === "course" &&
        (r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description?.toLowerCase().includes(query.toLowerCase()))
    ).length,
    material: allResults.filter(
      (r) =>
        r.type === "material" &&
        (r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description?.toLowerCase().includes(query.toLowerCase()))
    ).length,
    flashcard: allResults.filter(
      (r) =>
        r.type === "flashcard" &&
        (r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description?.toLowerCase().includes(query.toLowerCase()))
    ).length,
    quiz: allResults.filter(
      (r) =>
        r.type === "quiz" &&
        (r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description?.toLowerCase().includes(query.toLowerCase()))
    ).length,
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)]);
    }
  };

  const removeRecentSearch = (searchToRemove: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== searchToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search courses, materials, flashcards, and quizzes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* No Query State */}
      {!query && (
        <div className="space-y-6">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Searches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentSearches.map((search) => (
                  <RecentSearchItem
                    key={search}
                    query={search}
                    onClick={() => handleSearch(search)}
                    onRemove={() => removeRecentSearch(search)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Access</CardTitle>
              <CardDescription>
                Jump to commonly used sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/courses">
                  <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">My Courses</span>
                  </div>
                </Link>
                <Link href="/materials">
                  <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Study Materials</span>
                  </div>
                </Link>
                <Link href="/flashcards">
                  <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Flashcards</span>
                  </div>
                </Link>
                <Link href="/quizzes">
                  <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                    <ClipboardList className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Quizzes</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Results */}
      {query && (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({resultCounts.all})</TabsTrigger>
              <TabsTrigger value="course">
                Courses ({resultCounts.course})
              </TabsTrigger>
              <TabsTrigger value="material">
                Materials ({resultCounts.material})
              </TabsTrigger>
              <TabsTrigger value="flashcard">
                Flashcards ({resultCounts.flashcard})
              </TabsTrigger>
              <TabsTrigger value="quiz">Quizzes ({resultCounts.quiz})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredResults.length > 0 ? (
            <div className="space-y-3">
              {filteredResults.map((result) => (
                <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
                  We couldn&apos;t find anything matching &quot;{query}&quot;. Try different
                  keywords or check your spelling.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
