"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  Wand2,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createQuiz,
  generateQuiz,
  getUploads,
  type Upload as UploadType,
} from "@/lib/api";

export default function NewQuizPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState("generate");
  const [loading, setLoading] = React.useState(false);
  const [uploadsLoading, setUploadsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploads, setUploads] = React.useState<UploadType[]>([]);

  // Form state for manual creation
  const [manualForm, setManualForm] = React.useState({
    title: "",
    description: "",
    timeLimit: 15,
    passingScore: 70,
    isPublic: false,
    tags: "",
  });

  // Form state for AI generation
  const [generateForm, setGenerateForm] = React.useState({
    uploadId: "",
    title: "",
    description: "",
    timeLimit: 15,
    maxQuestions: 15,
    minQuestions: 10,
    difficulty: "mixed" as "mixed" | "easy" | "medium" | "hard",
    includeExplanations: true,
    questionTypes: ["MULTIPLE_CHOICE", "TRUE_FALSE"] as string[],
  });

  // Fetch uploads on mount
  React.useEffect(() => {
    const fetchUploads = async () => {
      try {
        setUploadsLoading(true);
        const response = await getUploads({ status: "COMPLETED" });
        setUploads(response.uploads);
      } catch (err) {
        console.error("Failed to fetch uploads:", err);
      } finally {
        setUploadsLoading(false);
      }
    };

    fetchUploads();
  }, []);

  // Handle manual quiz creation
  const handleManualCreate = async () => {
    if (!manualForm.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await createQuiz({
        title: manualForm.title,
        description: manualForm.description || undefined,
        timeLimit: manualForm.timeLimit || undefined,
        passingScore: manualForm.passingScore,
        isPublic: manualForm.isPublic,
        tags: manualForm.tags
          ? manualForm.tags.split(",").map((t) => t.trim())
          : undefined,
      });

      router.push(`/quizzes/${response.quiz.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  // Handle AI quiz generation
  const handleGenerate = async () => {
    if (!generateForm.uploadId) {
      setError("Please select a document to generate quiz from");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await generateQuiz({
        uploadId: generateForm.uploadId,
        title: generateForm.title || undefined,
        description: generateForm.description || undefined,
        timeLimit: generateForm.timeLimit || undefined,
        options: {
          maxQuestions: generateForm.maxQuestions,
          minQuestions: generateForm.minQuestions,
          difficulty: generateForm.difficulty,
          includeExplanations: generateForm.includeExplanations,
          questionTypes: generateForm.questionTypes as ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY')[],
        },
      });

      router.push(`/quizzes/${response.quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const selectedUpload = uploads.find((u) => u.id === generateForm.uploadId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quizzes">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Quiz</h1>
          <p className="text-muted-foreground">
            Generate a quiz from your study materials or create one manually.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="gap-2">
            <Wand2 className="h-4 w-4" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Manually
          </TabsTrigger>
        </TabsList>

        {/* AI Generation Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate Quiz from Document
              </CardTitle>
              <CardDescription>
                Select a document and let AI create quiz questions automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Selection */}
              <div className="space-y-2">
                <Label>Select Document</Label>
                {uploadsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : uploads.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        No processed documents found.
                      </p>
                      <Button variant="link" asChild className="mt-2">
                        <Link href="/uploads">Upload a document first</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Select
                    value={generateForm.uploadId}
                    onValueChange={(value) =>
                      setGenerateForm((prev) => ({ ...prev, uploadId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uploads.map((upload) => (
                        <SelectItem key={upload.id} value={upload.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{upload.originalName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedUpload && (
                  <p className="text-xs text-muted-foreground">
                    {selectedUpload.fileType} - {(selectedUpload.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              {/* Title (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="gen-title">Quiz Title (Optional)</Label>
                <Input
                  id="gen-title"
                  placeholder="Leave empty for auto-generated title"
                  value={generateForm.title}
                  onChange={(e) =>
                    setGenerateForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              {/* Description (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="gen-description">Description (Optional)</Label>
                <Textarea
                  id="gen-description"
                  placeholder="Leave empty for auto-generated description"
                  value={generateForm.description}
                  onChange={(e) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>

              {/* Question Count */}
              <div className="space-y-4">
                <Label>Number of Questions</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-8">
                    {generateForm.minQuestions}
                  </span>
                  <Slider
                    value={[generateForm.minQuestions, generateForm.maxQuestions]}
                    onValueChange={([min, max]) =>
                      setGenerateForm((prev) => ({
                        ...prev,
                        minQuestions: min,
                        maxQuestions: max,
                      }))
                    }
                    min={5}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {generateForm.maxQuestions}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will generate between {generateForm.minQuestions} and{" "}
                  {generateForm.maxQuestions} questions
                </p>
              </div>

              {/* Time Limit */}
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[generateForm.timeLimit]}
                    onValueChange={([value]) =>
                      setGenerateForm((prev) => ({ ...prev, timeLimit: value }))
                    }
                    min={5}
                    max={60}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {generateForm.timeLimit} min
                  </span>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={generateForm.difficulty}
                  onValueChange={(value: "mixed" | "easy" | "medium" | "hard") =>
                    setGenerateForm((prev) => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (30% Easy, 50% Medium, 20% Hard)</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Types */}
              <div className="space-y-2">
                <Label>Question Types</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
                    { value: "TRUE_FALSE", label: "True/False" },
                    { value: "SHORT_ANSWER", label: "Short Answer" },
                  ].map((type) => {
                    const isSelected = generateForm.questionTypes.includes(type.value);
                    return (
                      <Badge
                        key={type.value}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setGenerateForm((prev) => ({
                            ...prev,
                            questionTypes: isSelected
                              ? prev.questionTypes.filter((t) => t !== type.value)
                              : [...prev.questionTypes, type.value],
                          }));
                        }}
                      >
                        {type.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Include Explanations */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Explanations</Label>
                  <p className="text-xs text-muted-foreground">
                    Add explanations for correct answers
                  </p>
                </div>
                <Switch
                  checked={generateForm.includeExplanations}
                  onCheckedChange={(checked) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      includeExplanations: checked,
                    }))
                  }
                />
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={loading || !generateForm.uploadId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Creation Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Quiz Manually</CardTitle>
              <CardDescription>
                Create a quiz and add questions yourself.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Cell Biology - Chapter 1"
                  value={manualForm.title}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the quiz..."
                  value={manualForm.description}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              {/* Time Limit */}
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[manualForm.timeLimit]}
                    onValueChange={([value]) =>
                      setManualForm((prev) => ({ ...prev, timeLimit: value }))
                    }
                    min={5}
                    max={120}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {manualForm.timeLimit} min
                  </span>
                </div>
              </div>

              {/* Passing Score */}
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[manualForm.passingScore]}
                    onValueChange={([value]) =>
                      setManualForm((prev) => ({ ...prev, passingScore: value }))
                    }
                    min={50}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {manualForm.passingScore}%
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="biology, cells, chapter-1 (comma separated)"
                  value={manualForm.tags}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                />
              </div>

              {/* Public */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make Public</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow other users to take this quiz
                  </p>
                </div>
                <Switch
                  checked={manualForm.isPublic}
                  onCheckedChange={(checked) =>
                    setManualForm((prev) => ({ ...prev, isPublic: checked }))
                  }
                />
              </div>

              {/* Create Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleManualCreate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Quiz...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quiz
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
