"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Plus,
  TrendingUp,
  Upload,
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
import { Badge } from "@/components/ui/badge";

// Stats Card Component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp
              className={`h-3 w-3 mr-1 ${
                trend.positive ? "text-green-500" : "text-red-500 rotate-180"
              }`}
            />
            <span
              className={`text-xs ${
                trend.positive ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.value}% from last week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Recent Course Card
function RecentCourseCard({
  title,
  progress,
  lastStudied,
  materials,
}: {
  title: string;
  progress: number;
  lastStudied: string;
  materials: number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <GraduationCap className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {progress}%
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastStudied}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {materials} materials
          </span>
        </div>
      </div>
    </div>
  );
}

// Due Item Card
function DueItemCard({
  type,
  title,
  dueDate,
  isOverdue,
}: {
  type: "flashcard" | "quiz";
  title: string;
  dueDate: string;
  isOverdue: boolean;
}) {
  const Icon = type === "flashcard" ? Brain : ClipboardList;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          isOverdue ? "bg-destructive/10" : "bg-accent"
        }`}
      >
        <Icon
          className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-accent-foreground"}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{title}</h4>
        <p
          className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {dueDate}
        </p>
      </div>
      <Badge variant={isOverdue ? "destructive" : "secondary"}>
        {type === "flashcard" ? "Review" : "Quiz"}
      </Badge>
    </div>
  );
}

export default function DashboardPage() {
  // Mock data - will be replaced with API calls
  const stats = {
    courses: 5,
    flashcards: 248,
    quizzes: 12,
    studyStreak: 7,
  };

  const recentCourses = [
    {
      title: "Biology 101 - Cell Structure",
      progress: 75,
      lastStudied: "2 hours ago",
      materials: 12,
    },
    {
      title: "Chemistry - Organic Compounds",
      progress: 45,
      lastStudied: "Yesterday",
      materials: 8,
    },
    {
      title: "Physics - Thermodynamics",
      progress: 30,
      lastStudied: "3 days ago",
      materials: 15,
    },
  ];

  const dueItems = [
    {
      type: "flashcard" as const,
      title: "Biology - Mitochondria Functions",
      dueDate: "Due today",
      isOverdue: false,
    },
    {
      type: "quiz" as const,
      title: "Chemistry Chapter 4 Quiz",
      dueDate: "Overdue by 2 days",
      isOverdue: true,
    },
    {
      type: "flashcard" as const,
      title: "Physics - Newton's Laws",
      dueDate: "Due tomorrow",
      isOverdue: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your study progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/courses">
              <GraduationCap className="mr-2 h-4 w-4" />
              Browse Courses
            </Link>
          </Button>
          <Button asChild>
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Notes
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Courses"
          value={stats.courses}
          description="Courses you're enrolled in"
          icon={GraduationCap}
        />
        <StatsCard
          title="Flashcards"
          value={stats.flashcards}
          description="Total flashcards created"
          icon={Brain}
          trend={{ value: 12, positive: true }}
        />
        <StatsCard
          title="Quizzes Taken"
          value={stats.quizzes}
          description="This month"
          icon={ClipboardList}
          trend={{ value: 8, positive: true }}
        />
        <StatsCard
          title="Study Streak"
          value={`${stats.studyStreak} days`}
          description="Keep it going!"
          icon={Zap}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Courses */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>
                Continue where you left off
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCourses.map((course, index) => (
              <RecentCourseCard key={index} {...course} />
            ))}
          </CardContent>
        </Card>

        {/* Due Items */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Due Soon</CardTitle>
              <CardDescription>
                Items that need your attention
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/flashcards">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueItems.map((item, index) => (
              <DueItemCard key={index} {...item} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Jump into your study activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/upload">
                <Upload className="h-6 w-6" />
                <span>Upload Notes</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/flashcards/study">
                <Brain className="h-6 w-6" />
                <span>Study Flashcards</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/quizzes/new">
                <ClipboardList className="h-6 w-6" />
                <span>Take a Quiz</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/courses/new">
                <Plus className="h-6 w-6" />
                <span>Add Course</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
