"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  Loader2,
  Network,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  ZoomIn,
  ZoomOut,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  getKnowledgeGraph,
  getKnowledgeGraphStats,
  getConcepts,
  semanticSearch,
  deleteConcept,
  extractConcepts,
  getUploads,
  type KnowledgeGraphData,
  type Concept,
  type ConceptEntityType,
  type SemanticSearchResult,
  type Upload,
} from "@/lib/api";

// Entity type colors for visualization
const entityTypeColors: Record<ConceptEntityType, string> = {
  PERSON: "bg-blue-500",
  THEORY: "bg-purple-500",
  FORMULA: "bg-green-500",
  EVENT: "bg-orange-500",
  TERM: "bg-cyan-500",
  PROCESS: "bg-yellow-500",
  PRINCIPLE: "bg-pink-500",
  CONCEPT: "bg-indigo-500",
  EXAMPLE: "bg-teal-500",
  DATE: "bg-red-500",
};

const entityTypeLabels: Record<ConceptEntityType, string> = {
  PERSON: "Person",
  THEORY: "Theory",
  FORMULA: "Formula",
  EVENT: "Event",
  TERM: "Term",
  PROCESS: "Process",
  PRINCIPLE: "Principle",
  CONCEPT: "Concept",
  EXAMPLE: "Example",
  DATE: "Date",
};

// Concept Card Component
function ConceptCard({
  concept,
  selected,
  onClick,
}: {
  concept: Concept;
  selected?: boolean;
  onClick?: () => void;
}) {
  const connectionCount =
    (concept._count?.outgoingRelations || 0) +
    (concept._count?.incomingRelations || 0);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                entityTypeColors[concept.entityType]
              }`}
            />
            <span className="font-medium line-clamp-1">{concept.name}</span>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {entityTypeLabels[concept.entityType]}
          </Badge>
        </div>
        {concept.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {concept.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Network className="h-3 w-3" />
            {connectionCount} connections
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Importance:</span>
            <Badge
              variant={
                concept.importance >= 0.7
                  ? "default"
                  : concept.importance >= 0.4
                    ? "secondary"
                    : "outline"
              }
              className="text-xs"
            >
              {Math.round(concept.importance * 100)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for concept cards
function ConceptCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-full mt-2" />
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Search Result Card
function SearchResultCard({
  result,
  onClick,
}: {
  result: SemanticSearchResult;
  onClick?: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                entityTypeColors[result.entityType]
              }`}
            />
            <span className="font-medium">{result.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {Math.round(result.similarity * 100)}% match
          </Badge>
        </div>
        {result.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {result.description}
          </p>
        )}
        {result.uploadName && (
          <p className="text-xs text-muted-foreground mt-2">
            From: {result.uploadName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Graph Visualization Component
function GraphVisualization({
  data,
  selectedNode,
  onNodeSelect,
}: {
  data: KnowledgeGraphData;
  selectedNode?: string;
  onNodeSelect?: (nodeId: string | null) => void;
}) {
  const [zoom, setZoom] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Simple force-directed layout calculation
  const nodePositions = React.useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(300, 50 + data.nodes.length * 10);

    data.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    return positions;
  }, [data.nodes]);

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Network className="h-12 w-12 mb-4" />
        <p>No concepts to visualize</p>
        <p className="text-sm">Extract concepts from your study materials to build a knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="relative h-full" ref={containerRef}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* SVG Graph */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${800 / zoom} ${600 / zoom}`}
        className="cursor-move"
        onClick={(e) => {
          if (e.target === e.currentTarget && onNodeSelect) {
            onNodeSelect(null);
          }
        }}
      >
        {/* Edges */}
        {data.edges.map((edge) => {
          const from = nodePositions[edge.source];
          const to = nodePositions[edge.target];
          if (!from || !to) return null;

          const isHighlighted =
            selectedNode === edge.source || selectedNode === edge.target;

          return (
            <g key={edge.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.8 : 0.3}
                markerEnd={edge.bidirectional ? undefined : "url(#arrowhead)"}
              />
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="hsl(var(--muted-foreground))"
            />
          </marker>
        </defs>

        {/* Nodes */}
        {data.nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const isSelected = selectedNode === node.id;
          const nodeSize = 8 + node.importance * 12;

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect?.(isSelected ? null : node.id);
              }}
            >
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                className={entityTypeColors[node.entityType]}
                fill="currentColor"
                stroke={isSelected ? "hsl(var(--primary))" : "white"}
                strokeWidth={isSelected ? 3 : 2}
              />
              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y + nodeSize + 12}
                textAnchor="middle"
                className="text-xs fill-foreground"
                fontSize="10"
              >
                {node.name.length > 15
                  ? node.name.substring(0, 15) + "..."
                  : node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 p-3 rounded-lg border">
        <p className="text-xs font-medium mb-2">Entity Types</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(entityTypeLabels).slice(0, 6).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  entityTypeColors[type as ConceptEntityType]
                }`}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const [graphData, setGraphData] = React.useState<KnowledgeGraphData | null>(null);
  const [concepts, setConcepts] = React.useState<Concept[]>([]);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [stats, setStats] = React.useState({
    totalConcepts: 0,
    totalRelationships: 0,
    uploadsWithConcepts: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [extracting, setExtracting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUpload, setSelectedUpload] = React.useState<string>("all");
  const [minImportance, setMinImportance] = React.useState([0]);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // Search
  const [searchResults, setSearchResults] = React.useState<SemanticSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [conceptToDelete, setConceptToDelete] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Extract dialog
  const [extractDialogOpen, setExtractDialogOpen] = React.useState(false);
  const [selectedUploadForExtract, setSelectedUploadForExtract] = React.useState<string>("");

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const uploadFilter = selectedUpload !== "all" ? selectedUpload : undefined;

      const [graphResponse, conceptsResponse, statsResponse, uploadsResponse] = await Promise.all([
        getKnowledgeGraph({
          uploadId: uploadFilter,
          minImportance: minImportance[0],
        }),
        getConcepts({
          uploadId: uploadFilter,
        }),
        getKnowledgeGraphStats(),
        getUploads({ status: "COMPLETED" }),
      ]);

      setGraphData(graphResponse);
      setConcepts(conceptsResponse.concepts);
      setStats({
        totalConcepts: statsResponse.stats.totalConcepts,
        totalRelationships: statsResponse.stats.totalRelationships,
        uploadsWithConcepts: statsResponse.stats.uploadsWithConcepts,
      });
      setUploads(uploadsResponse.uploads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  }, [selectedUpload, minImportance]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Semantic search
  const handleSearch = React.useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await semanticSearch({
        query: searchQuery,
        options: {
          limit: 10,
          uploadId: selectedUpload !== "all" ? selectedUpload : undefined,
        },
      });
      setSearchResults(response.results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, selectedUpload]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeout);
  }, [handleSearch]);

  // Handle concept extraction
  const handleExtract = async () => {
    if (!selectedUploadForExtract) return;

    try {
      setExtracting(true);
      setExtractDialogOpen(false);

      await extractConcepts({
        uploadId: selectedUploadForExtract,
        options: {
          maxConcepts: 30,
          extractRelationships: true,
        },
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract concepts");
    } finally {
      setExtracting(false);
      setSelectedUploadForExtract("");
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!conceptToDelete) return;

    try {
      setDeleting(true);
      await deleteConcept(conceptToDelete);
      setConcepts((prev) => prev.filter((c) => c.id !== conceptToDelete));
      await fetchData(); // Refresh graph data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete concept");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setConceptToDelete(null);
    }
  };

  // Filter concepts by search
  const filteredConcepts = concepts.filter((concept) =>
    concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground">
            Visualize and explore connections between concepts from your study materials.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setExtractDialogOpen(true)} disabled={extracting}>
            {extracting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Extract Concepts
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Concepts</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.totalConcepts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Relationships</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.totalRelationships}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connected Uploads</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Skeleton className="h-8 w-12" /> : stats.uploadsWithConcepts}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Graph Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Concept Network
              </CardTitle>
              <div className="flex gap-2">
                <Select value={selectedUpload} onValueChange={setSelectedUpload}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by upload" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Uploads</SelectItem>
                    {uploads.map((upload) => (
                      <SelectItem key={upload.id} value={upload.id}>
                        {upload.originalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] border rounded-lg bg-muted/20">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-destructive">
                  <p>{error}</p>
                  <Button variant="link" onClick={fetchData}>
                    Try again
                  </Button>
                </div>
              ) : graphData ? (
                <GraphVisualization
                  data={graphData}
                  selectedNode={selectedNode || undefined}
                  onNodeSelect={setSelectedNode}
                />
              ) : null}
            </div>

            {/* Importance Filter */}
            <div className="mt-4 flex items-center gap-4">
              <Label className="text-sm whitespace-nowrap">Min Importance:</Label>
              <Slider
                value={minImportance}
                onValueChange={setMinImportance}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">
                {Math.round(minImportance[0] * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <Card>
          <Tabs defaultValue="concepts" className="h-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="concepts">
                  <Brain className="h-4 w-4 mr-2" />
                  Concepts
                </TabsTrigger>
                <TabsTrigger value="search">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="concepts" className="mt-0">
              <CardContent className="pt-4">
                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter concepts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Concepts List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {loading ? (
                      <>
                        {[1, 2, 3, 4].map((i) => (
                          <ConceptCardSkeleton key={i} />
                        ))}
                      </>
                    ) : filteredConcepts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Target className="h-8 w-8 mb-2" />
                        <p className="text-sm">No concepts found</p>
                      </div>
                    ) : (
                      filteredConcepts.map((concept) => (
                        <ConceptCard
                          key={concept.id}
                          concept={concept}
                          selected={selectedNode === concept.id}
                          onClick={() =>
                            setSelectedNode(
                              selectedNode === concept.id ? null : concept.id
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </TabsContent>

            <TabsContent value="search" className="mt-0">
              <CardContent className="pt-4">
                {/* Semantic Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Semantic search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Search for concepts using natural language. Results are ranked by semantic similarity.
                </p>

                {/* Search Results */}
                <ScrollArea className="h-[360px]">
                  <div className="space-y-3 pr-4">
                    {searching ? (
                      <>
                        {[1, 2, 3].map((i) => (
                          <ConceptCardSkeleton key={i} />
                        ))}
                      </>
                    ) : searchResults.length === 0 && searchQuery ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mb-2" />
                        <p className="text-sm">No matching concepts found</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mb-2" />
                        <p className="text-sm">Enter a query to search</p>
                      </div>
                    ) : (
                      searchResults.map((result) => (
                        <SearchResultCard
                          key={result.conceptId}
                          result={result}
                          onClick={() =>
                            setSelectedNode(
                              selectedNode === result.conceptId
                                ? null
                                : result.conceptId
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Extract Concepts Dialog */}
      <AlertDialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extract Concepts</AlertDialogTitle>
            <AlertDialogDescription>
              Select an upload to extract concepts from using AI. This will analyze
              the content and identify key concepts and their relationships.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select
              value={selectedUploadForExtract}
              onValueChange={setSelectedUploadForExtract}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an upload" />
              </SelectTrigger>
              <SelectContent>
                {uploads.map((upload) => (
                  <SelectItem key={upload.id} value={upload.id}>
                    {upload.originalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {uploads.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No processed uploads available.{" "}
                <Link href="/materials" className="text-primary hover:underline">
                  Upload study materials
                </Link>{" "}
                first.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExtract}
              disabled={!selectedUploadForExtract}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Extract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Concept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this concept? This action cannot be
              undone. All relationships to this concept will also be deleted.
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
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
