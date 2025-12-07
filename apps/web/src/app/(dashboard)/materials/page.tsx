"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  FileImage,
  FileText,
  FileType,
  Filter,
  Folder,
  Grid3X3,
  List,
  MoreHorizontal,
  Search,
  SortAsc,
  Upload,
  Brain,
  ClipboardList,
  Trash2,
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
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  title: string;
  type: "pdf" | "doc" | "image" | "text";
  course: string;
  courseId: string;
  size: string;
  uploadedAt: string;
  status: "processed" | "processing" | "pending" | "failed";
  flashcardsGenerated: number;
  thumbnail?: string;
}

// File Icon Component
function FileIcon({ type, className }: { type: Material["type"]; className?: string }) {
  const icons = {
    pdf: FileText,
    doc: FileType,
    image: FileImage,
    text: FileText,
  };
  const Icon = icons[type];
  const colors = {
    pdf: "text-red-500",
    doc: "text-blue-500",
    image: "text-green-500",
    text: "text-gray-500",
  };
  return <Icon className={cn("h-8 w-8", colors[type], className)} />;
}

// Status Badge Component
function StatusBadge({ status }: { status: Material["status"] }) {
  const variants = {
    processed: "success" as const,
    processing: "warning" as const,
    pending: "secondary" as const,
    failed: "destructive" as const,
  };
  const labels = {
    processed: "Processed",
    processing: "Processing...",
    pending: "Pending",
    failed: "Failed",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

// Grid View Card
function MaterialGridCard({ material }: { material: Material }) {
  return (
    <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <FileIcon type={material.type} />
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
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Brain className="mr-2 h-4 w-4" />
                Generate Flashcards
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ClipboardList className="mr-2 h-4 w-4" />
                Create Quiz
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-medium line-clamp-2 mb-2">{material.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Folder className="h-3 w-3" />
          <span className="truncate">{material.course}</span>
        </div>
        <div className="flex items-center justify-between">
          <StatusBadge status={material.status} />
          <span className="text-xs text-muted-foreground">{material.size}</span>
        </div>
        {material.status === "processed" && material.flashcardsGenerated > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              {material.flashcardsGenerated} flashcards generated
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// List View Row
function MaterialListRow({ material }: { material: Material }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
        <FileIcon type={material.type} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{material.title}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Folder className="h-3 w-3" />
            {material.course}
          </span>
          <span>{material.size}</span>
          <span>{material.uploadedAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={material.status} />
        {material.status === "processed" && material.flashcardsGenerated > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {material.flashcardsGenerated}
          </Badge>
        )}
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
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Brain className="mr-2 h-4 w-4" />
              Generate Flashcards
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = React.useState("recent");
  const [filterType, setFilterType] = React.useState("all");

  // Mock data
  const materials: Material[] = [
    {
      id: "1",
      title: "Cell Biology Chapter 1 - Introduction to Cells.pdf",
      type: "pdf",
      course: "Biology 101",
      courseId: "1",
      size: "2.4 MB",
      uploadedAt: "2 hours ago",
      status: "processed",
      flashcardsGenerated: 25,
    },
    {
      id: "2",
      title: "Organic Chemistry Notes - Functional Groups.docx",
      type: "doc",
      course: "Chemistry",
      courseId: "2",
      size: "1.8 MB",
      uploadedAt: "Yesterday",
      status: "processed",
      flashcardsGenerated: 18,
    },
    {
      id: "3",
      title: "Physics Formulas Reference Sheet.pdf",
      type: "pdf",
      course: "Physics",
      courseId: "3",
      size: "856 KB",
      uploadedAt: "2 days ago",
      status: "processing",
      flashcardsGenerated: 0,
    },
    {
      id: "4",
      title: "Mitochondria Diagram.png",
      type: "image",
      course: "Biology 101",
      courseId: "1",
      size: "1.2 MB",
      uploadedAt: "3 days ago",
      status: "processed",
      flashcardsGenerated: 5,
    },
    {
      id: "5",
      title: "Thermodynamics Lecture Notes.txt",
      type: "text",
      course: "Physics",
      courseId: "3",
      size: "45 KB",
      uploadedAt: "4 days ago",
      status: "pending",
      flashcardsGenerated: 0,
    },
    {
      id: "6",
      title: "World War II Timeline.pdf",
      type: "pdf",
      course: "History",
      courseId: "5",
      size: "3.1 MB",
      uploadedAt: "1 week ago",
      status: "failed",
      flashcardsGenerated: 0,
    },
  ];

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || material.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: materials.length,
    processed: materials.filter((m) => m.status === "processed").length,
    processing: materials.filter((m) => m.status === "processing").length,
    totalFlashcards: materials.reduce((acc, m) => acc + m.flashcardsGenerated, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">
            Manage your uploaded notes and documents.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Files</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processed</CardDescription>
            <CardTitle className="text-2xl">{stats.processed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing</CardDescription>
            <CardTitle className="text-2xl">{stats.processing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Flashcards Generated</CardDescription>
            <CardTitle className="text-2xl">{stats.totalFlashcards}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="doc">Documents</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="course">Course</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {filteredMaterials.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMaterials.map((material) => (
              <MaterialGridCard key={material.id} material={material} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMaterials.map((material) => (
              <MaterialListRow key={material.id} material={material} />
            ))}
          </div>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No materials found</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? "No materials match your search criteria."
                : "Upload your first study material to get started."}
            </p>
            {!searchQuery && (
              <Button className="mt-4" asChild>
                <Link href="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
