"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  Clock,
  FileText,
  Filter,
  GraduationCap,
  MoreHorizontal,
  Plus,
  Search,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  materials: number;
  flashcards: number;
  quizzes: number;
  lastStudied: string;
  createdAt: string;
  category: string;
  status: "active" | "completed" | "archived";
}

// Course Card Component
function CourseCard({ course }: { course: Course }) {
  const statusColors = {
    active: "bg-green-500",
    completed: "bg-blue-500",
    archived: "bg-gray-500",
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {course.category}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Course</DropdownMenuItem>
              <DropdownMenuItem>View Materials</DropdownMenuItem>
              <DropdownMenuItem>Generate Flashcards</DropdownMenuItem>
              <DropdownMenuItem>Create Quiz</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Archive Course</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2 mt-2">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-lg font-semibold">{course.materials}</span>
              <span className="text-xs text-muted-foreground">Materials</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <Brain className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-lg font-semibold">{course.flashcards}</span>
              <span className="text-xs text-muted-foreground">Flashcards</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <BookOpen className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-lg font-semibold">{course.quizzes}</span>
              <span className="text-xs text-muted-foreground">Quizzes</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {course.lastStudied}
        </div>
        <div className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${statusColors[course.status]}`} />
          <span className="text-xs capitalize">{course.status}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          Create your first course to start organizing your study materials and tracking your progress.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("recent");

  // Mock data - will be replaced with API calls
  const courses: Course[] = [
    {
      id: "1",
      title: "Biology 101 - Cell Structure & Function",
      description: "Introduction to cellular biology, covering cell organelles, membrane transport, and cellular processes.",
      progress: 75,
      materials: 12,
      flashcards: 85,
      quizzes: 4,
      lastStudied: "2 hours ago",
      createdAt: "2024-01-15",
      category: "Biology",
      status: "active",
    },
    {
      id: "2",
      title: "Chemistry - Organic Compounds",
      description: "Study of organic chemistry including hydrocarbons, functional groups, and reaction mechanisms.",
      progress: 45,
      materials: 8,
      flashcards: 62,
      quizzes: 3,
      lastStudied: "Yesterday",
      createdAt: "2024-01-10",
      category: "Chemistry",
      status: "active",
    },
    {
      id: "3",
      title: "Physics - Thermodynamics",
      description: "Laws of thermodynamics, heat transfer, and energy systems in physics.",
      progress: 30,
      materials: 15,
      flashcards: 45,
      quizzes: 2,
      lastStudied: "3 days ago",
      createdAt: "2024-01-05",
      category: "Physics",
      status: "active",
    },
    {
      id: "4",
      title: "Mathematics - Calculus II",
      description: "Advanced calculus covering integration techniques, sequences, and series.",
      progress: 100,
      materials: 20,
      flashcards: 120,
      quizzes: 8,
      lastStudied: "1 week ago",
      createdAt: "2023-12-01",
      category: "Mathematics",
      status: "completed",
    },
    {
      id: "5",
      title: "History - World War II",
      description: "Comprehensive study of World War II events, causes, and consequences.",
      progress: 60,
      materials: 10,
      flashcards: 75,
      quizzes: 5,
      lastStudied: "4 days ago",
      createdAt: "2024-01-08",
      category: "History",
      status: "active",
    },
  ];

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCourses = filteredCourses.filter((c) => c.status === "active");
  const completedCourses = filteredCourses.filter((c) => c.status === "completed");
  const archivedCourses = filteredCourses.filter((c) => c.status === "archived");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and track your learning progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
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
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Courses Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeCourses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <CourseCard course={course} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {completedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <CourseCard course={course} />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No completed courses yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedCourses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {archivedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <CourseCard course={course} />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No archived courses</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
