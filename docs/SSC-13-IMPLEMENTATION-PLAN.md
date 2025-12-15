# SSC-13: Assignment Brainstorming & Outline Generator - Implementation Plan

## Overview

Build an AI-powered assignment assistance system that helps students brainstorm ideas, create structured outlines, develop arguments, and organize research for academic assignments. This feature transforms assignment prompts into actionable study plans while maintaining strict ethical guidelines around academic integrity.

**This is a premium feature** - only available for STUDENT_PLUS and UNIVERSITY tiers.

## Tech Stack
- **Backend**: Express.js + Prisma + OpenAI GPT-4
- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **AI**: OpenAI for brainstorming, outline generation, and argument analysis
- **Editor**: TipTap or similar for rich outline editing
- **Export**: jsPDF + docx for outline exports

## Current State Analysis

### What Already Exists
- **AI Services**:
  - `quizGeneration.service.ts` - Pattern for AI content generation with JSON responses
  - `flashcardGeneration.service.ts` - Content generation with quality scoring
  - `conceptExtraction.service.ts` - Entity/relationship extraction from content
  - `embedding.service.ts` - Semantic search and similarity calculations
  - `textExtraction.service.ts` - PDF, DOCX, TXT, image processing
- **Content Processing**:
  - Upload system with 50MB limit, status tracking, text extraction
  - Knowledge graph with concepts and relationships
- **Subscription System**:
  - `assignment_help` feature already defined in `config/pricing.ts`
  - `requireFeature()` middleware ready for use
  - STUDENT_PLUS and UNIVERSITY tiers have access
- **Frontend Patterns**:
  - FileUploader component for drag-drop uploads
  - FeatureGate component for subscription gating
  - UpgradeDialog for premium prompts
  - Card/Dialog/Tabs components from shadcn/ui

### What Needs to Be Built
1. Database models for Assignment, AssignmentOutline, AssignmentBrainstorm
2. Assignment generation service with specialized prompts
3. Brainstorming engine with topic exploration
4. Outline generator with hierarchical structure
5. Argument mapping and thesis statement helper
6. Citation/resource recommendation system
7. Counter-argument generator for essays
8. Editing suggestions service
9. Plagiarism awareness and academic integrity warnings
10. Assignment dashboard UI with creation wizard
11. Outline editor with export functionality

## Implementation Stages (22 Atomic Commits)

### Phase 1: Database Schema Updates (Commits 1-3)

**Commit 1**: Create Assignment model
```prisma
model Assignment {
  id                String    @id @default(cuid())
  userId            String
  uploadId          String?               // Optional: linked course material
  title             String
  prompt            String                // The assignment question/prompt
  assignmentType    AssignmentType
  subjectArea       String?               // e.g., "History", "Biology"
  academicLevel     AcademicLevel @default(UNDERGRADUATE)
  wordLimit         Int?
  deadline          DateTime?
  requirements      String[]              // Specific requirements
  status            AssignmentStatus @default(DRAFT)
  metadata          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  upload            Upload?   @relation(fields: [uploadId], references: [id], onDelete: SetNull)
  brainstorm        AssignmentBrainstorm?
  outline           AssignmentOutline?
  arguments         ArgumentMap?

  @@index([userId])
  @@index([status])
}

enum AssignmentType {
  ESSAY
  RESEARCH_PAPER
  ARGUMENTATIVE
  ANALYTICAL
  COMPARE_CONTRAST
  CASE_STUDY
  LAB_REPORT
  LITERATURE_REVIEW
  REFLECTION
  PRESENTATION
  PROJECT
  OTHER
}

enum AcademicLevel {
  HIGH_SCHOOL
  UNDERGRADUATE
  GRADUATE
  DOCTORAL
}

enum AssignmentStatus {
  DRAFT                 // Just created, no generation yet
  BRAINSTORMING        // Brainstorm in progress
  OUTLINING            // Outline generation in progress
  READY                // All content generated
  ARCHIVED             // Completed/submitted
}
```

**Commit 2**: Create AssignmentBrainstorm and research models
```prisma
model AssignmentBrainstorm {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  mainIdeas         Json                  // Array of idea objects with descriptions
  researchQuestions String[]              // Generated research questions
  themes            String[]              // Identified themes
  approaches        String[]              // Different approaches to the topic
  keyTerms          String[]              // Important terms to define
  targetAudience    String?               // Who the assignment is for
  tone              String?               // Academic, persuasive, analytical, etc.
  preliminaryThesis String?               // Initial thesis statement options
  sourceRecommendations Json?             // Recommended source types
  qualityScore      Float     @default(0) // 0-1 quality rating
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model ResearchSuggestion {
  id                String    @id @default(cuid())
  assignmentId      String
  sourceType        SourceType
  searchTerms       String[]
  databases         String[]              // Suggested databases to search
  evaluationCriteria String?              // How to evaluate sources
  citationStyle     CitationStyle @default(APA)
  createdAt         DateTime  @default(now())

  @@index([assignmentId])
}

enum SourceType {
  ACADEMIC_JOURNAL
  BOOK
  PRIMARY_SOURCE
  NEWS_ARTICLE
  GOVERNMENT_DOCUMENT
  WEBSITE
  INTERVIEW
  DATASET
}

enum CitationStyle {
  APA
  MLA
  CHICAGO
  HARVARD
  IEEE
}
```

**Commit 3**: Create AssignmentOutline and ArgumentMap models
```prisma
model AssignmentOutline {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  title             String
  thesisStatement   String?
  sections          Json                  // Hierarchical outline structure
  keyPoints         Json                  // Key points per section
  transitions       Json?                 // Suggested transitions between sections
  wordDistribution  Json?                 // Suggested word count per section
  estimatedWritingTime Int?              // Minutes
  qualityScore      Float     @default(0)
  version           Int       @default(1)
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model ArgumentMap {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  mainClaim         String
  supportingPoints  Json                  // Array of supporting arguments
  evidence          Json                  // Evidence for each point
  counterArguments  Json                  // Potential counter-arguments
  rebuttals         Json                  // Rebuttals to counter-arguments
  logicalFlow       Json?                 // Argument flow diagram data
  strengthScore     Float     @default(0) // 0-1 argument strength
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

// Add relation to User model
model User {
  // ... existing fields
  assignments       Assignment[]
}

// Add relation to Upload model
model Upload {
  // ... existing fields
  assignments       Assignment[]
}
```

### Phase 2: Backend - Brainstorming Service (Commits 4-6)

**Commit 4**: Create assignment brainstorming service foundation
- Create `apps/api/src/services/assignmentBrainstorm.service.ts`
- Functions:
  - `generateBrainstorm(assignmentId)` - Main brainstorming entry point
  - `extractTopicFromPrompt(prompt)` - AI extraction of core topic
  - `generateMainIdeas(topic, type, level)` - Generate diverse ideas

```typescript
const BRAINSTORM_SYSTEM_PROMPT = `You are an academic writing assistant helping students brainstorm ideas for assignments.

Your role is to:
1. Help students explore topics from multiple angles
2. Generate thought-provoking research questions
3. Identify key themes and approaches
4. Suggest preliminary thesis statements
5. Recommend source types to consult

IMPORTANT ETHICAL GUIDELINES:
- You are helping with BRAINSTORMING and ORGANIZATION, not writing the assignment
- Encourage original thinking and proper research
- Emphasize the importance of citing all sources
- Never generate content meant to be submitted directly
- Promote academic integrity at all times

Output structured JSON with diverse, creative ideas that help students begin their research.`;
```

**Commit 5**: Implement research question generator
- Functions:
  - `generateResearchQuestions(topic, type, count)` - Generate research questions
  - `rankQuestionsByDepth(questions)` - Score questions by analytical depth
  - `suggestFocusArea(questions, level)` - Recommend focus based on academic level

**Commit 6**: Implement thesis statement helper
- Functions:
  - `generateThesisOptions(topic, ideas, type)` - Create thesis statement options
  - `analyzeThesisStrength(thesis)` - Evaluate thesis quality
  - `refineThesis(thesis, feedback)` - Improve thesis based on feedback

### Phase 3: Backend - Outline Generation Service (Commits 7-10)

**Commit 7**: Create outline generation service
- Create `apps/api/src/services/assignmentOutline.service.ts`
- Functions:
  - `generateOutline(assignment, brainstorm)` - Generate structured outline
  - `createSectionHierarchy(content, type)` - Build hierarchical structure
  - `distributeWordCount(outline, total)` - Allocate words per section

```typescript
const OUTLINE_SYSTEM_PROMPT = `You are an expert academic writing assistant creating detailed outlines.

Generate outlines that:
1. Follow proper academic structure for the assignment type
2. Include clear section headers with subsections
3. Provide key points for each section
4. Suggest transitions between major sections
5. Balance depth and breadth appropriately

For each section, include:
- Purpose: What this section accomplishes
- Key Points: 2-4 main points to cover
- Evidence Needed: What type of evidence to include
- Word Allocation: Suggested percentage of total

Output a hierarchical JSON structure that students can follow while writing.`;
```

**Commit 8**: Implement section templates by assignment type
- Functions:
  - `getTemplateByType(assignmentType)` - Get structure template
  - `adaptTemplate(template, prompt, level)` - Customize for specific assignment
  - `validateStructure(outline, type)` - Ensure proper academic structure

Templates for:
- Essay: Introduction → Body Paragraphs → Conclusion
- Research Paper: Abstract → Introduction → Literature Review → Methodology → Results → Discussion → Conclusion
- Argumentative: Hook → Thesis → Arguments → Counter-arguments → Rebuttals → Conclusion
- Compare/Contrast: Introduction → Subject A → Subject B → Comparison → Conclusion
- Lab Report: Title → Abstract → Introduction → Methods → Results → Discussion → Conclusion
- Literature Review: Introduction → Themes → Gaps → Future Directions → Conclusion

**Commit 9**: Implement transition and key point generator
- Functions:
  - `generateTransitions(sections)` - Create smooth transitions
  - `generateKeyPoints(section, context)` - Key points per section
  - `suggestEvidence(point, sourceTypes)` - Evidence suggestions

**Commit 10**: Implement outline refinement system
- Functions:
  - `refineOutline(outline, feedback)` - Improve based on user feedback
  - `expandSection(outline, sectionId)` - Add more detail to section
  - `collapseSection(outline, sectionId)` - Simplify section
  - `reorderSections(outline, newOrder)` - Reorganize structure

### Phase 4: Backend - Argument Mapping Service (Commits 11-12)

**Commit 11**: Create argument mapping service
- Create `apps/api/src/services/argumentMapping.service.ts`
- Functions:
  - `generateArgumentMap(assignment, thesis)` - Create argument structure
  - `identifySupportingPoints(thesis)` - Find supporting arguments
  - `suggestEvidence(point)` - Evidence for each point

**Commit 12**: Implement counter-argument generator
- Functions:
  - `generateCounterArguments(mainClaim, points)` - Identify opposing views
  - `generateRebuttals(counterArgs)` - Create rebuttals
  - `assessArgumentStrength(map)` - Score overall argument quality
  - `identifyLogicalFallacies(arguments)` - Warn about weak reasoning

### Phase 5: Backend - Citation & Editing Services (Commits 13-14)

**Commit 13**: Create citation recommendation service
- Create `apps/api/src/services/citationHelper.service.ts`
- Functions:
  - `recommendSources(topic, type)` - Suggest source types
  - `generateSearchTerms(topic)` - Database search terms
  - `suggestDatabases(subjectArea)` - Recommend academic databases
  - `formatCitation(source, style)` - Format citation examples

Database suggestions by subject:
- Sciences: PubMed, Web of Science, Nature
- Humanities: JSTOR, Project MUSE, PhilPapers
- Social Sciences: PsycINFO, Sociological Abstracts
- Engineering: IEEE Xplore, ACM Digital Library
- General: Google Scholar, EBSCO

**Commit 14**: Create editing suggestions service
- Create `apps/api/src/services/editingSuggestions.service.ts`
- Functions:
  - `analyzeClarity(text)` - Check for clear writing
  - `checkAcademicTone(text)` - Verify academic language
  - `identifyWeakPhrasing(text)` - Find areas to strengthen
  - `suggestImprovements(text)` - Provide specific suggestions

### Phase 6: Backend - API Endpoints (Commits 15-17)

**Commit 15**: Create assignment controller
- Create `apps/api/src/controllers/assignment.controller.ts`
- Methods:
  - `createAssignment` - Create new assignment
  - `getAssignments` - List user's assignments
  - `getAssignment` - Get specific assignment with details
  - `updateAssignment` - Update assignment details
  - `deleteAssignment` - Remove assignment

**Commit 16**: Add brainstorming and outline endpoints
- Methods:
  - `generateBrainstorm` - Generate brainstorming content
  - `regenerateBrainstorm` - Regenerate with different focus
  - `generateOutline` - Generate outline from brainstorm
  - `updateOutline` - Save outline edits
  - `refineOutline` - AI refinement of outline

**Commit 17**: Create routes with subscription middleware
- Create `apps/api/src/routes/assignment.routes.ts`
- All routes require STUDENT_PLUS+ subscription
- Add to main app.ts

```typescript
// Assignment API Endpoints
POST   /api/assignments                     - Create assignment (protected, STUDENT_PLUS+)
GET    /api/assignments                     - List assignments (protected, STUDENT_PLUS+)
GET    /api/assignments/:id                 - Get assignment details (protected, STUDENT_PLUS+)
PUT    /api/assignments/:id                 - Update assignment (protected, STUDENT_PLUS+)
DELETE /api/assignments/:id                 - Delete assignment (protected, STUDENT_PLUS+)

POST   /api/assignments/:id/brainstorm      - Generate brainstorm (protected, STUDENT_PLUS+)
PUT    /api/assignments/:id/brainstorm      - Update brainstorm (protected, STUDENT_PLUS+)
POST   /api/assignments/:id/brainstorm/regenerate - Regenerate (protected, STUDENT_PLUS+)

POST   /api/assignments/:id/outline         - Generate outline (protected, STUDENT_PLUS+)
PUT    /api/assignments/:id/outline         - Update outline (protected, STUDENT_PLUS+)
POST   /api/assignments/:id/outline/refine  - AI refine outline (protected, STUDENT_PLUS+)
POST   /api/assignments/:id/outline/export  - Export outline (protected, STUDENT_PLUS+)

POST   /api/assignments/:id/arguments       - Generate argument map (protected, STUDENT_PLUS+)
GET    /api/assignments/:id/arguments       - Get argument map (protected, STUDENT_PLUS+)

POST   /api/assignments/:id/citations       - Get citation recommendations (protected, STUDENT_PLUS+)
POST   /api/assignments/:id/suggestions     - Get editing suggestions (protected, STUDENT_PLUS+)
```

### Phase 7: Frontend - API Integration (Commits 18-19)

**Commit 18**: Create assignment API client
- Create `apps/web/src/lib/assignment-api.ts`
- Type definitions for all endpoints
- Functions for API calls

```typescript
// apps/web/src/lib/assignment-api.ts
export interface Assignment {
  id: string;
  title: string;
  prompt: string;
  assignmentType: AssignmentType;
  subjectArea: string | null;
  academicLevel: AcademicLevel;
  wordLimit: number | null;
  deadline: string | null;
  requirements: string[];
  status: AssignmentStatus;
  brainstorm: AssignmentBrainstorm | null;
  outline: AssignmentOutline | null;
  arguments: ArgumentMap | null;
  createdAt: string;
}

export interface AssignmentBrainstorm {
  id: string;
  mainIdeas: BrainstormIdea[];
  researchQuestions: string[];
  themes: string[];
  approaches: string[];
  keyTerms: string[];
  preliminaryThesis: string | null;
  sourceRecommendations: SourceRecommendation[];
  qualityScore: number;
}

export interface BrainstormIdea {
  idea: string;
  description: string;
  potential: 'high' | 'medium' | 'low';
  relatedConcepts: string[];
}

export interface AssignmentOutline {
  id: string;
  title: string;
  thesisStatement: string | null;
  sections: OutlineSection[];
  keyPoints: Record<string, string[]>;
  transitions: Record<string, string>;
  wordDistribution: Record<string, number>;
  estimatedWritingTime: number | null;
  qualityScore: number;
}

export interface OutlineSection {
  id: string;
  title: string;
  level: number;
  purpose: string;
  keyPoints: string[];
  evidenceNeeded: string[];
  wordAllocation: number;
  children: OutlineSection[];
}

export interface ArgumentMap {
  id: string;
  mainClaim: string;
  supportingPoints: SupportingPoint[];
  counterArguments: CounterArgument[];
  rebuttals: Rebuttal[];
  strengthScore: number;
}

export async function createAssignment(data: CreateAssignmentInput): Promise<Assignment>;
export async function getAssignments(): Promise<Assignment[]>;
export async function getAssignment(id: string): Promise<Assignment>;
export async function generateBrainstorm(id: string): Promise<AssignmentBrainstorm>;
export async function generateOutline(id: string): Promise<AssignmentOutline>;
export async function generateArgumentMap(id: string, thesis: string): Promise<ArgumentMap>;
export async function exportOutline(id: string, format: 'pdf' | 'docx'): Promise<string>;
```

**Commit 19**: Create assignment context provider
- Create `apps/web/src/contexts/assignment-context.tsx`
- State management for current assignment
- Auto-save functionality
- Loading and error states

### Phase 8: Frontend - Assignment Pages (Commits 20-21)

**Commit 20**: Create assignment dashboard and creation wizard
- Create `apps/web/src/app/(dashboard)/assignments/page.tsx` - Assignment list
- Create `apps/web/src/app/(dashboard)/assignments/new/page.tsx` - Creation wizard
- Components:
  - `AssignmentCard.tsx` - Assignment overview card
  - `CreateAssignmentWizard/` - Multi-step creation
    - `PromptStep.tsx` - Enter assignment prompt
    - `DetailsStep.tsx` - Type, level, word limit
    - `RequirementsStep.tsx` - Specific requirements
    - `ReviewStep.tsx` - Review and create

**Commit 21**: Create brainstorming and outline views
- Create `apps/web/src/app/(dashboard)/assignments/[id]/page.tsx` - Assignment workspace
- Components:
  - `BrainstormView.tsx` - Display and edit brainstorm ideas
  - `IdeaCard.tsx` - Individual idea with potential rating
  - `ResearchQuestionList.tsx` - Research questions display
  - `ThesisHelper.tsx` - Thesis statement refinement
  - `OutlineEditor.tsx` - Interactive outline editor
  - `OutlineSection.tsx` - Draggable/editable section
  - `ArgumentMapView.tsx` - Visual argument structure
  - `CitationPanel.tsx` - Citation recommendations sidebar

### Phase 9: Polish & Integration (Commit 22)

**Commit 22**: Final integration and academic integrity features
- Add prominent academic integrity warnings throughout UI
- Create `AcademicIntegrityBanner.tsx` - Persistent reminder
- Add plagiarism awareness tooltips
- Implement outline export (PDF/DOCX)
- Add feature gating with upgrade prompts
- Navigation integration in dashboard sidebar
- Mobile-responsive design adjustments

## API Endpoints Detail

### Assignment CRUD Endpoints

```
POST /api/assignments
Body: {
  title: "Analysis of Climate Change Policies",
  prompt: "Write a 2000-word essay analyzing the effectiveness of international climate change policies...",
  assignmentType: "ANALYTICAL",
  subjectArea: "Environmental Science",
  academicLevel: "UNDERGRADUATE",
  wordLimit: 2000,
  deadline: "2024-02-20T23:59:00Z",
  requirements: ["Must cite at least 5 peer-reviewed sources", "Include policy analysis framework"]
}
Response: {
  assignment: Assignment,
  message: "Assignment created successfully"
}

GET /api/assignments
Query: ?status=DRAFT|BRAINSTORMING|OUTLINING|READY|ARCHIVED
Response: {
  assignments: Assignment[]
}

GET /api/assignments/:id
Response: {
  assignment: Assignment with brainstorm, outline, arguments
}
```

### Brainstorming Endpoints

```
POST /api/assignments/:id/brainstorm
Response: {
  brainstorm: {
    mainIdeas: [
      {
        idea: "Policy Effectiveness Framework Analysis",
        description: "Evaluate policies using established frameworks like...",
        potential: "high",
        relatedConcepts: ["policy analysis", "environmental governance", "international relations"]
      },
      // ... more ideas
    ],
    researchQuestions: [
      "How have international climate agreements evolved since the Kyoto Protocol?",
      "What metrics best measure policy effectiveness in environmental contexts?",
      "How do economic factors influence policy implementation across nations?"
    ],
    themes: ["governance", "economics", "scientific consensus", "political will"],
    approaches: [
      "Comparative policy analysis across multiple countries",
      "Historical timeline approach showing policy evolution",
      "Case study focus on specific policies (Paris Agreement, etc.)"
    ],
    keyTerms: ["carbon neutrality", "NDCs", "climate justice", "mitigation vs adaptation"],
    preliminaryThesis: "While international climate policies have established important frameworks for global cooperation, their effectiveness remains limited by inconsistent implementation and insufficient enforcement mechanisms.",
    sourceRecommendations: [
      { type: "ACADEMIC_JOURNAL", searchTerms: ["climate policy effectiveness", "international environmental agreements"] },
      { type: "GOVERNMENT_DOCUMENT", searchTerms: ["IPCC reports", "UNFCCC documentation"] }
    ],
    qualityScore: 0.85
  }
}

POST /api/assignments/:id/brainstorm/regenerate
Body: { focus: "economic impacts" }
Response: {
  brainstorm: AssignmentBrainstorm (regenerated with economic focus)
}
```

### Outline Endpoints

```
POST /api/assignments/:id/outline
Body: { thesisStatement: "While international climate policies..." }
Response: {
  outline: {
    title: "Analysis of Climate Change Policies",
    thesisStatement: "While international climate policies have established...",
    sections: [
      {
        id: "intro",
        title: "Introduction",
        level: 1,
        purpose: "Introduce the topic and present thesis",
        keyPoints: [
          "Context: urgency of climate action",
          "Scope: international policy landscape",
          "Thesis statement"
        ],
        evidenceNeeded: ["Recent climate statistics", "Policy overview"],
        wordAllocation: 200,
        children: []
      },
      {
        id: "framework",
        title: "Policy Effectiveness Framework",
        level: 1,
        purpose: "Establish criteria for evaluation",
        keyPoints: [
          "Define effectiveness metrics",
          "Introduce analytical framework",
          "Justify methodology"
        ],
        evidenceNeeded: ["Academic sources on policy analysis"],
        wordAllocation: 300,
        children: [
          {
            id: "framework-metrics",
            title: "Defining Effectiveness Metrics",
            level: 2,
            purpose: "Detail specific metrics used",
            keyPoints: ["Emission reductions", "Implementation rates", "Compliance mechanisms"],
            evidenceNeeded: ["Peer-reviewed methodology papers"],
            wordAllocation: 150,
            children: []
          }
        ]
      },
      // ... more sections
    ],
    transitions: {
      "intro-to-framework": "Having established the urgency of climate action, it is essential to define the criteria by which policies will be evaluated.",
      "framework-to-analysis": "With this analytical framework in place, we can now examine specific international policies."
    },
    wordDistribution: {
      "Introduction": 200,
      "Framework": 300,
      "Analysis": 1000,
      "Conclusion": 500
    },
    estimatedWritingTime: 480,
    qualityScore: 0.88
  }
}

POST /api/assignments/:id/outline/refine
Body: {
  feedback: "Need more focus on economic implications",
  sectionId: "analysis"
}
Response: {
  outline: AssignmentOutline (refined)
}

POST /api/assignments/:id/outline/export
Body: { format: "pdf" | "docx" }
Response: {
  downloadUrl: "https://...",
  expiresAt: "2024-01-22T00:00:00Z"
}
```

### Argument Mapping Endpoints

```
POST /api/assignments/:id/arguments
Body: {
  thesis: "While international climate policies have established important frameworks..."
}
Response: {
  arguments: {
    mainClaim: "International climate policies are necessary but insufficient",
    supportingPoints: [
      {
        point: "Policies have created essential global cooperation frameworks",
        evidence: ["Paris Agreement participation", "IPCC establishment", "Technology transfer agreements"],
        strength: 0.9
      },
      {
        point: "Implementation remains inconsistent across nations",
        evidence: ["NDC achievement rates", "Enforcement mechanism gaps", "Funding shortfalls"],
        strength: 0.85
      }
    ],
    counterArguments: [
      {
        argument: "Markets and technology, not policy, drive real change",
        source: "Economic liberalism perspective",
        strength: 0.7
      },
      {
        argument: "National sovereignty limits international policy effectiveness",
        source: "Realist international relations theory",
        strength: 0.8
      }
    ],
    rebuttals: [
      {
        toCounterArgument: "Markets and technology, not policy...",
        rebuttal: "Policy frameworks create market incentives for green technology...",
        evidence: ["Carbon pricing success stories", "Renewable energy subsidies impact"]
      }
    ],
    strengthScore: 0.82
  }
}
```

### Citation Recommendations Endpoints

```
POST /api/assignments/:id/citations
Response: {
  recommendations: {
    academicDatabases: [
      { name: "Web of Science", reason: "Environmental science focus", searchTerms: [...] },
      { name: "JSTOR", reason: "Policy analysis journals", searchTerms: [...] }
    ],
    sourceTypes: [
      {
        type: "ACADEMIC_JOURNAL",
        importance: "essential",
        suggestedCount: 5,
        searchTerms: ["climate policy effectiveness", "international environmental governance"]
      },
      {
        type: "GOVERNMENT_DOCUMENT",
        importance: "recommended",
        suggestedCount: 2,
        examples: ["IPCC Assessment Reports", "UNFCCC documentation"]
      }
    ],
    citationStyle: "APA",
    exampleCitations: [
      "Author, A. B. (Year). Title of article. Journal Name, Volume(Issue), pages. https://doi.org/..."
    ]
  }
}
```

## Database Schema Changes

### New Models Summary
```prisma
// === ASSIGNMENT MODELS ===

model Assignment {
  id                String    @id @default(cuid())
  userId            String
  uploadId          String?
  title             String
  prompt            String
  assignmentType    AssignmentType
  subjectArea       String?
  academicLevel     AcademicLevel @default(UNDERGRADUATE)
  wordLimit         Int?
  deadline          DateTime?
  requirements      String[]
  status            AssignmentStatus @default(DRAFT)
  metadata          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  upload            Upload?   @relation(fields: [uploadId], references: [id], onDelete: SetNull)
  brainstorm        AssignmentBrainstorm?
  outline           AssignmentOutline?
  arguments         ArgumentMap?

  @@index([userId])
  @@index([status])
}

model AssignmentBrainstorm {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  mainIdeas         Json
  researchQuestions String[]
  themes            String[]
  approaches        String[]
  keyTerms          String[]
  targetAudience    String?
  tone              String?
  preliminaryThesis String?
  sourceRecommendations Json?
  qualityScore      Float     @default(0)
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model AssignmentOutline {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  title             String
  thesisStatement   String?
  sections          Json
  keyPoints         Json
  transitions       Json?
  wordDistribution  Json?
  estimatedWritingTime Int?
  qualityScore      Float     @default(0)
  version           Int       @default(1)
  generatedAt       DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model ArgumentMap {
  id                String    @id @default(cuid())
  assignmentId      String    @unique
  mainClaim         String
  supportingPoints  Json
  evidence          Json
  counterArguments  Json
  rebuttals         Json
  logicalFlow       Json?
  strengthScore     Float     @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  assignment        Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model ResearchSuggestion {
  id                String    @id @default(cuid())
  assignmentId      String
  sourceType        SourceType
  searchTerms       String[]
  databases         String[]
  evaluationCriteria String?
  citationStyle     CitationStyle @default(APA)
  createdAt         DateTime  @default(now())

  @@index([assignmentId])
}

// === ENUMS ===

enum AssignmentType {
  ESSAY
  RESEARCH_PAPER
  ARGUMENTATIVE
  ANALYTICAL
  COMPARE_CONTRAST
  CASE_STUDY
  LAB_REPORT
  LITERATURE_REVIEW
  REFLECTION
  PRESENTATION
  PROJECT
  OTHER
}

enum AcademicLevel {
  HIGH_SCHOOL
  UNDERGRADUATE
  GRADUATE
  DOCTORAL
}

enum AssignmentStatus {
  DRAFT
  BRAINSTORMING
  OUTLINING
  READY
  ARCHIVED
}

enum SourceType {
  ACADEMIC_JOURNAL
  BOOK
  PRIMARY_SOURCE
  NEWS_ARTICLE
  GOVERNMENT_DOCUMENT
  WEBSITE
  INTERVIEW
  DATASET
}

enum CitationStyle {
  APA
  MLA
  CHICAGO
  HARVARD
  IEEE
}
```

## Component Structure

### Assignment Pages
```
apps/web/src/app/(dashboard)/assignments/
├── page.tsx                    # Assignment list dashboard
├── new/
│   └── page.tsx               # Create assignment wizard
├── [id]/
│   ├── page.tsx               # Assignment workspace
│   ├── brainstorm/page.tsx    # Brainstorm view (optional route)
│   ├── outline/page.tsx       # Outline editor view (optional route)
│   └── arguments/page.tsx     # Argument map view (optional route)
└── loading.tsx                 # Loading state

apps/web/src/components/assignment/
├── AssignmentCard.tsx          # Card for assignment list
├── AssignmentStatusBadge.tsx   # Status indicator
├── AcademicIntegrityBanner.tsx # Persistent integrity reminder
├── CreateAssignmentWizard/
│   ├── index.tsx              # Wizard container
│   ├── PromptStep.tsx         # Enter assignment prompt
│   ├── DetailsStep.tsx        # Type, level, requirements
│   └── ReviewStep.tsx         # Review and create
├── brainstorm/
│   ├── BrainstormView.tsx     # Main brainstorm display
│   ├── IdeaCard.tsx           # Individual idea card
│   ├── IdeaGrid.tsx           # Grid of ideas
│   ├── ResearchQuestions.tsx  # Research questions list
│   ├── ThemesDisplay.tsx      # Themes and approaches
│   ├── ThesisHelper.tsx       # Thesis statement refinement
│   └── KeyTermsCloud.tsx      # Key terms display
├── outline/
│   ├── OutlineEditor.tsx      # Main outline editor
│   ├── OutlineSection.tsx     # Single section component
│   ├── SectionActions.tsx     # Section action buttons
│   ├── TransitionSuggestion.tsx # Transition between sections
│   ├── WordDistribution.tsx   # Word count breakdown
│   └── OutlineExport.tsx      # Export functionality
├── arguments/
│   ├── ArgumentMapView.tsx    # Visual argument structure
│   ├── MainClaimCard.tsx      # Main thesis/claim
│   ├── SupportingPointCard.tsx # Supporting argument
│   ├── CounterArgumentCard.tsx # Counter-argument
│   ├── RebuttalCard.tsx       # Rebuttal
│   └── ArgumentStrength.tsx   # Strength indicator
├── citations/
│   ├── CitationPanel.tsx      # Citation sidebar
│   ├── DatabaseList.tsx       # Recommended databases
│   ├── SearchTermsList.tsx    # Search terms
│   └── CitationExample.tsx    # Citation format examples
└── shared/
    ├── QualityScoreIndicator.tsx  # Quality score display
    ├── EstimatedTime.tsx          # Time estimate
    └── FeatureDescription.tsx     # Feature explanation
```

## Feature Requirements Checklist

### Assignment Creation
- [ ] Create assignment from prompt text
- [ ] Support multiple assignment types (essay, research, analytical, etc.)
- [ ] Set academic level (high school, undergrad, graduate, doctoral)
- [ ] Specify word limits and deadlines
- [ ] Add custom requirements
- [ ] Link to course materials (uploads)

### Brainstorming System
- [ ] Generate diverse main ideas from prompt
- [ ] Create relevant research questions
- [ ] Identify themes and approaches
- [ ] Suggest key terms to define
- [ ] Generate preliminary thesis options
- [ ] Rate idea potential (high/medium/low)
- [ ] Allow regeneration with different focus
- [ ] Quality scoring of brainstorm

### Outline Generation
- [ ] Generate hierarchical outline structure
- [ ] Support type-specific templates
- [ ] Include section purposes and key points
- [ ] Suggest evidence needed per section
- [ ] Distribute word count across sections
- [ ] Generate transitions between sections
- [ ] Estimate writing time
- [ ] Allow manual editing and reordering
- [ ] AI-powered outline refinement
- [ ] Export to PDF and DOCX

### Argument Mapping (for argumentative assignments)
- [ ] Generate supporting points for thesis
- [ ] Suggest evidence for each point
- [ ] Identify potential counter-arguments
- [ ] Generate rebuttals to counter-arguments
- [ ] Score argument strength
- [ ] Visual argument flow representation

### Citation Assistance
- [ ] Recommend source types by assignment
- [ ] Suggest academic databases by subject
- [ ] Generate relevant search terms
- [ ] Provide citation format examples
- [ ] Support multiple citation styles (APA, MLA, Chicago, etc.)

### Editing Suggestions
- [ ] Analyze writing clarity
- [ ] Check academic tone
- [ ] Identify weak phrasing
- [ ] Suggest improvements

### Academic Integrity
- [ ] Prominent integrity warnings throughout UI
- [ ] Clear messaging that tool assists, doesn't write
- [ ] Plagiarism awareness reminders
- [ ] Emphasis on proper citation
- [ ] Encourage original thinking prompts

### Premium Gating
- [ ] Feature gated for STUDENT_PLUS+ tiers
- [ ] Upgrade prompts for lower tiers
- [ ] Preview/teaser for FREE/PREMIUM users

## Success Criteria

- [ ] All 22 commits completed and passing CI
- [ ] Brainstorming generates 5+ diverse ideas per assignment
- [ ] Outlines follow proper academic structure for each type
- [ ] Argument maps include at least 3 supporting points
- [ ] Counter-arguments and rebuttals generated for argumentative types
- [ ] Citation recommendations match subject area
- [ ] Academic integrity warnings prominently displayed
- [ ] PDF/DOCX export generates valid files
- [ ] Generation completes in <10 seconds for most assignments
- [ ] Page loads in <2 seconds
- [ ] Mobile-responsive design works
- [ ] Feature properly gated to STUDENT_PLUS+ tiers
- [ ] Upgrade prompts show for FREE/PREMIUM users
- [ ] Student satisfaction >80% (future metric)

## Integration with Existing Features

### Knowledge Graph Integration
- Link assignment topics to existing `Concept` models
- Use concept relationships for thesis suggestions
- Leverage `embeddingService` for semantic topic matching

### Upload Integration
- Allow linking assignments to course material uploads
- Use extracted text for context-aware brainstorming
- Reference concepts from uploaded materials

### Analytics Integration (SSC-17)
- Track assignment completion rates in analytics
- Show time spent on brainstorming vs outlining
- Include assignment metrics in study analytics

### Exam Prediction Integration (SSC-14)
- Use assignment topics to refine exam predictions
- Identify overlap between assignment research and exam topics

### Quiz/Flashcard Integration
- Generate flashcards from assignment key terms
- Create practice quiz from assignment topics
- Link to existing study materials on same topics

## Code Implementation Examples

### Brainstorming Service
```typescript
// apps/api/src/services/assignmentBrainstorm.service.ts
import OpenAI from 'openai';
import { PrismaClient, AcademicLevel, AssignmentType } from '@prisma/client';

const prisma = new PrismaClient();

const BRAINSTORM_SYSTEM_PROMPT = `You are an academic writing assistant helping students brainstorm ideas for assignments.

ROLE:
- Help explore topics from multiple angles
- Generate thought-provoking research questions
- Identify key themes and approaches
- Suggest preliminary thesis statements
- Recommend source types

ETHICAL GUIDELINES (CRITICAL):
- You help with BRAINSTORMING and ORGANIZATION only
- NEVER generate content meant to be submitted directly
- Always encourage original thinking and proper research
- Emphasize the importance of citing all sources
- Promote academic integrity at all times

OUTPUT FORMAT:
Return a JSON object with the structure specified in the user prompt.`;

export class AssignmentBrainstormService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generateBrainstorm(
    assignmentId: string,
    userId: string
  ) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, userId },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const userPrompt = this.buildBrainstormPrompt(assignment);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: BRAINSTORM_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate and normalize
    const brainstorm = this.normalizeBrainstormResult(result);

    // Save to database
    const saved = await prisma.assignmentBrainstorm.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        ...brainstorm,
      },
      update: {
        ...brainstorm,
        updatedAt: new Date(),
      },
    });

    // Update assignment status
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: 'BRAINSTORMING' },
    });

    return saved;
  }

  private buildBrainstormPrompt(assignment: {
    prompt: string;
    assignmentType: AssignmentType;
    academicLevel: AcademicLevel;
    subjectArea: string | null;
    wordLimit: number | null;
    requirements: string[];
  }): string {
    return `Generate brainstorming content for this academic assignment:

ASSIGNMENT PROMPT:
${assignment.prompt}

DETAILS:
- Type: ${assignment.assignmentType}
- Academic Level: ${assignment.academicLevel}
- Subject Area: ${assignment.subjectArea || 'General'}
- Word Limit: ${assignment.wordLimit || 'Not specified'}
- Requirements: ${assignment.requirements.join(', ') || 'None specified'}

Generate a JSON response with this structure:
{
  "mainIdeas": [
    {
      "idea": "Brief idea title",
      "description": "2-3 sentence explanation",
      "potential": "high|medium|low",
      "relatedConcepts": ["concept1", "concept2"]
    }
  ],
  "researchQuestions": ["Question 1?", "Question 2?"],
  "themes": ["Theme 1", "Theme 2"],
  "approaches": ["Approach description 1", "Approach description 2"],
  "keyTerms": ["term1", "term2"],
  "preliminaryThesis": "A working thesis statement option",
  "sourceRecommendations": [
    {
      "type": "ACADEMIC_JOURNAL|BOOK|PRIMARY_SOURCE|GOVERNMENT_DOCUMENT",
      "searchTerms": ["term1", "term2"]
    }
  ]
}

Generate at least 5 main ideas, 4 research questions, and 3 approaches.
Ensure ideas are diverse and explore different angles of the topic.`;
  }

  private normalizeBrainstormResult(result: Record<string, unknown>) {
    return {
      mainIdeas: result.mainIdeas || [],
      researchQuestions: result.researchQuestions || [],
      themes: result.themes || [],
      approaches: result.approaches || [],
      keyTerms: result.keyTerms || [],
      preliminaryThesis: result.preliminaryThesis || null,
      sourceRecommendations: result.sourceRecommendations || [],
      qualityScore: this.calculateQualityScore(result),
    };
  }

  private calculateQualityScore(result: Record<string, unknown>): number {
    let score = 0;
    const ideas = result.mainIdeas as unknown[];
    const questions = result.researchQuestions as unknown[];

    if (Array.isArray(ideas) && ideas.length >= 5) score += 0.3;
    else if (Array.isArray(ideas) && ideas.length >= 3) score += 0.2;

    if (Array.isArray(questions) && questions.length >= 4) score += 0.2;

    if (result.preliminaryThesis) score += 0.2;
    if (Array.isArray(result.themes) && (result.themes as unknown[]).length >= 2) score += 0.15;
    if (Array.isArray(result.approaches) && (result.approaches as unknown[]).length >= 2) score += 0.15;

    return Math.min(1, score);
  }
}

export const assignmentBrainstormService = new AssignmentBrainstormService();
```

### Outline Generation Service
```typescript
// apps/api/src/services/assignmentOutline.service.ts
import OpenAI from 'openai';
import { PrismaClient, AssignmentType } from '@prisma/client';

const prisma = new PrismaClient();

const OUTLINE_TEMPLATES: Record<AssignmentType, string> = {
  ESSAY: 'Introduction (hook, context, thesis) → Body Paragraphs (topic sentences, evidence, analysis) → Conclusion (restate thesis, broader implications)',
  RESEARCH_PAPER: 'Abstract → Introduction (background, research question, thesis) → Literature Review → Methodology → Results → Discussion → Conclusion → References',
  ARGUMENTATIVE: 'Introduction (hook, context, thesis) → Supporting Arguments (with evidence) → Counter-arguments → Rebuttals → Conclusion',
  ANALYTICAL: 'Introduction (thesis) → Analysis Section 1 → Analysis Section 2 → Analysis Section 3 → Synthesis → Conclusion',
  COMPARE_CONTRAST: 'Introduction → Subject A Analysis → Subject B Analysis → Point-by-Point Comparison → Conclusion',
  CASE_STUDY: 'Executive Summary → Introduction → Background → Analysis → Findings → Recommendations → Conclusion',
  LAB_REPORT: 'Title → Abstract → Introduction → Materials and Methods → Results → Discussion → Conclusion → References',
  LITERATURE_REVIEW: 'Introduction → Thematic Section 1 → Thematic Section 2 → Gaps in Literature → Future Directions → Conclusion',
  REFLECTION: 'Introduction → Experience Description → Analysis → Learning Outcomes → Future Application → Conclusion',
  PRESENTATION: 'Title Slide → Introduction → Main Points (3-5) → Supporting Evidence → Conclusion → Q&A',
  PROJECT: 'Project Overview → Objectives → Methodology → Implementation → Results → Lessons Learned → Recommendations',
  OTHER: 'Introduction → Main Body (multiple sections) → Conclusion',
};

const OUTLINE_SYSTEM_PROMPT = `You are an expert academic writing assistant creating detailed, hierarchical outlines.

Generate outlines that:
1. Follow proper academic structure for the assignment type
2. Include clear section headers with subsections (up to 3 levels deep)
3. Provide specific key points for each section
4. Suggest what evidence/sources to include
5. Recommend word allocation per section
6. Include transitions between major sections

IMPORTANT:
- This is an OUTLINE only - do not write the actual content
- Focus on structure and organization
- Be specific about what each section should cover
- Tailor depth to the academic level`;

export class AssignmentOutlineService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generateOutline(
    assignmentId: string,
    userId: string,
    thesisStatement?: string
  ) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, userId },
      include: { brainstorm: true },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const template = OUTLINE_TEMPLATES[assignment.assignmentType];
    const thesis = thesisStatement || assignment.brainstorm?.preliminaryThesis;

    const userPrompt = this.buildOutlinePrompt(assignment, template, thesis);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 6000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate and normalize
    const outline = this.normalizeOutlineResult(result, assignment.wordLimit);

    // Save to database
    const saved = await prisma.assignmentOutline.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        title: assignment.title,
        thesisStatement: thesis,
        ...outline,
      },
      update: {
        title: assignment.title,
        thesisStatement: thesis,
        ...outline,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // Update assignment status
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: 'OUTLINING' },
    });

    return saved;
  }

  private buildOutlinePrompt(
    assignment: {
      prompt: string;
      assignmentType: AssignmentType;
      academicLevel: string;
      wordLimit: number | null;
      requirements: string[];
      brainstorm?: { mainIdeas: unknown; themes: string[] } | null;
    },
    template: string,
    thesis?: string | null
  ): string {
    return `Generate a detailed outline for this academic assignment:

ASSIGNMENT PROMPT:
${assignment.prompt}

DETAILS:
- Type: ${assignment.assignmentType}
- Academic Level: ${assignment.academicLevel}
- Word Limit: ${assignment.wordLimit || 'Not specified'}
- Requirements: ${assignment.requirements.join(', ') || 'None specified'}

STRUCTURE TEMPLATE:
${template}

${thesis ? `THESIS STATEMENT:\n${thesis}` : ''}

${assignment.brainstorm ? `
BRAINSTORM CONTEXT:
- Main Ideas: ${JSON.stringify(assignment.brainstorm.mainIdeas)}
- Themes: ${assignment.brainstorm.themes.join(', ')}
` : ''}

Generate a JSON response with this structure:
{
  "sections": [
    {
      "id": "unique-id",
      "title": "Section Title",
      "level": 1,
      "purpose": "What this section accomplishes",
      "keyPoints": ["Point 1", "Point 2"],
      "evidenceNeeded": ["Type of evidence to include"],
      "wordAllocation": 200,
      "children": [
        {
          "id": "child-id",
          "title": "Subsection Title",
          "level": 2,
          "purpose": "Subsection purpose",
          "keyPoints": ["Sub-point 1"],
          "evidenceNeeded": ["Evidence type"],
          "wordAllocation": 100,
          "children": []
        }
      ]
    }
  ],
  "keyPoints": {
    "section-id": ["key point 1", "key point 2"]
  },
  "transitions": {
    "section1-to-section2": "Transition sentence suggestion"
  },
  "wordDistribution": {
    "Introduction": 200,
    "Body": 1500,
    "Conclusion": 300
  },
  "estimatedWritingTime": 360
}

Ensure:
- Sections follow the template structure
- Word allocations sum to approximately the word limit
- Each section has specific, actionable key points
- Transitions help flow between major sections`;
  }

  private normalizeOutlineResult(result: Record<string, unknown>, wordLimit: number | null) {
    const sections = result.sections || [];

    // Adjust word allocations if limit specified
    if (wordLimit && Array.isArray(sections)) {
      const totalAllocated = this.sumWordAllocations(sections as Array<{ wordAllocation?: number; children?: unknown[] }>);
      if (totalAllocated !== wordLimit) {
        const ratio = wordLimit / totalAllocated;
        this.adjustWordAllocations(sections as Array<{ wordAllocation?: number; children?: unknown[] }>, ratio);
      }
    }

    return {
      sections,
      keyPoints: result.keyPoints || {},
      transitions: result.transitions || {},
      wordDistribution: result.wordDistribution || {},
      estimatedWritingTime: result.estimatedWritingTime || null,
      qualityScore: this.calculateQualityScore(result),
    };
  }

  private sumWordAllocations(sections: Array<{ wordAllocation?: number; children?: unknown[] }>): number {
    return sections.reduce((sum, s) => {
      const childSum = Array.isArray(s.children)
        ? this.sumWordAllocations(s.children as Array<{ wordAllocation?: number; children?: unknown[] }>)
        : 0;
      return sum + (s.wordAllocation || 0) + childSum;
    }, 0);
  }

  private adjustWordAllocations(sections: Array<{ wordAllocation?: number; children?: unknown[] }>, ratio: number) {
    sections.forEach(s => {
      if (s.wordAllocation) {
        s.wordAllocation = Math.round(s.wordAllocation * ratio);
      }
      if (Array.isArray(s.children)) {
        this.adjustWordAllocations(s.children as Array<{ wordAllocation?: number; children?: unknown[] }>, ratio);
      }
    });
  }

  private calculateQualityScore(result: Record<string, unknown>): number {
    let score = 0;
    const sections = result.sections as unknown[];

    if (Array.isArray(sections) && sections.length >= 3) score += 0.3;
    if (result.transitions && Object.keys(result.transitions as object).length > 0) score += 0.2;
    if (result.keyPoints && Object.keys(result.keyPoints as object).length > 0) score += 0.2;
    if (result.wordDistribution) score += 0.15;
    if (result.estimatedWritingTime) score += 0.15;

    return Math.min(1, score);
  }
}

export const assignmentOutlineService = new AssignmentOutlineService();
```

### Assignment Controller
```typescript
// apps/api/src/controllers/assignment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AssignmentStatus } from '@prisma/client';
import { assignmentBrainstormService } from '../services/assignmentBrainstorm.service';
import { assignmentOutlineService } from '../services/assignmentOutline.service';
import { argumentMappingService } from '../services/argumentMapping.service';

const prisma = new PrismaClient();

export class AssignmentController {
  async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        title,
        prompt,
        assignmentType,
        subjectArea,
        academicLevel,
        wordLimit,
        deadline,
        requirements,
        uploadId,
      } = req.body;

      if (!title || !prompt || !assignmentType) {
        res.status(400).json({ error: 'Title, prompt, and assignment type are required' });
        return;
      }

      // Verify upload belongs to user if provided
      if (uploadId) {
        const upload = await prisma.upload.findFirst({
          where: { id: uploadId, userId },
        });
        if (!upload) {
          res.status(400).json({ error: 'Upload not found' });
          return;
        }
      }

      const assignment = await prisma.assignment.create({
        data: {
          userId,
          title,
          prompt,
          assignmentType,
          subjectArea,
          academicLevel: academicLevel || 'UNDERGRADUATE',
          wordLimit,
          deadline: deadline ? new Date(deadline) : null,
          requirements: requirements || [],
          uploadId,
        },
      });

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as AssignmentStatus | undefined;

      const where: Record<string, unknown> = { userId };
      if (status) {
        where.status = status;
      }

      const assignments = await prisma.assignment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          brainstorm: {
            select: { id: true, qualityScore: true, generatedAt: true },
          },
          outline: {
            select: { id: true, qualityScore: true, version: true, generatedAt: true },
          },
        },
      });

      res.json({ assignments });
    } catch (error) {
      next(error);
    }
  }

  async getAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const assignment = await prisma.assignment.findFirst({
        where: { id, userId },
        include: {
          brainstorm: true,
          outline: true,
          arguments: true,
          upload: {
            select: { id: true, originalName: true },
          },
        },
      });

      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      res.json({ assignment });
    } catch (error) {
      next(error);
    }
  }

  async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updates = req.body;

      // Verify ownership
      const existing = await prisma.assignment.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      const assignment = await prisma.assignment.update({
        where: { id },
        data: {
          ...updates,
          deadline: updates.deadline ? new Date(updates.deadline) : existing.deadline,
          updatedAt: new Date(),
        },
      });

      res.json({ assignment });
    } catch (error) {
      next(error);
    }
  }

  async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const assignment = await prisma.assignment.findFirst({
        where: { id, userId },
      });

      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      await prisma.assignment.delete({ where: { id } });

      res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async generateBrainstorm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const brainstorm = await assignmentBrainstormService.generateBrainstorm(id, userId);

      res.json({
        message: 'Brainstorm generated successfully',
        brainstorm,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateOutline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { thesisStatement } = req.body;

      const outline = await assignmentOutlineService.generateOutline(id, userId, thesisStatement);

      res.json({
        message: 'Outline generated successfully',
        outline,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateArgumentMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { thesis } = req.body;

      if (!thesis) {
        res.status(400).json({ error: 'Thesis statement is required' });
        return;
      }

      const arguments_ = await argumentMappingService.generateArgumentMap(id, userId, thesis);

      res.json({
        message: 'Argument map generated successfully',
        arguments: arguments_,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportOutline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { format } = req.body;

      if (!['pdf', 'docx'].includes(format)) {
        res.status(400).json({ error: 'Format must be pdf or docx' });
        return;
      }

      const assignment = await prisma.assignment.findFirst({
        where: { id, userId },
        include: { outline: true },
      });

      if (!assignment?.outline) {
        res.status(404).json({ error: 'Outline not found' });
        return;
      }

      // Generate export (implementation in export service)
      const downloadUrl = await this.generateExport(assignment.outline, format);

      res.json({
        downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      next(error);
    }
  }

  private async generateExport(outline: unknown, format: string): Promise<string> {
    // Implementation will use jsPDF for PDF and docx library for Word
    // Returns signed URL from MinIO storage
    return `https://storage.example.com/exports/outline-${Date.now()}.${format}`;
  }
}

export const assignmentController = new AssignmentController();
```

### Frontend API Client
```typescript
// apps/web/src/lib/assignment-api.ts
import { fetchApi } from './api';

// Types
export type AssignmentType =
  | 'ESSAY'
  | 'RESEARCH_PAPER'
  | 'ARGUMENTATIVE'
  | 'ANALYTICAL'
  | 'COMPARE_CONTRAST'
  | 'CASE_STUDY'
  | 'LAB_REPORT'
  | 'LITERATURE_REVIEW'
  | 'REFLECTION'
  | 'PRESENTATION'
  | 'PROJECT'
  | 'OTHER';

export type AcademicLevel = 'HIGH_SCHOOL' | 'UNDERGRADUATE' | 'GRADUATE' | 'DOCTORAL';

export type AssignmentStatus = 'DRAFT' | 'BRAINSTORMING' | 'OUTLINING' | 'READY' | 'ARCHIVED';

export interface Assignment {
  id: string;
  title: string;
  prompt: string;
  assignmentType: AssignmentType;
  subjectArea: string | null;
  academicLevel: AcademicLevel;
  wordLimit: number | null;
  deadline: string | null;
  requirements: string[];
  status: AssignmentStatus;
  brainstorm: AssignmentBrainstorm | null;
  outline: AssignmentOutline | null;
  arguments: ArgumentMap | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormIdea {
  idea: string;
  description: string;
  potential: 'high' | 'medium' | 'low';
  relatedConcepts: string[];
}

export interface SourceRecommendation {
  type: string;
  searchTerms: string[];
}

export interface AssignmentBrainstorm {
  id: string;
  mainIdeas: BrainstormIdea[];
  researchQuestions: string[];
  themes: string[];
  approaches: string[];
  keyTerms: string[];
  preliminaryThesis: string | null;
  sourceRecommendations: SourceRecommendation[];
  qualityScore: number;
  generatedAt: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  level: number;
  purpose: string;
  keyPoints: string[];
  evidenceNeeded: string[];
  wordAllocation: number;
  children: OutlineSection[];
}

export interface AssignmentOutline {
  id: string;
  title: string;
  thesisStatement: string | null;
  sections: OutlineSection[];
  keyPoints: Record<string, string[]>;
  transitions: Record<string, string>;
  wordDistribution: Record<string, number>;
  estimatedWritingTime: number | null;
  qualityScore: number;
  version: number;
  generatedAt: string;
}

export interface SupportingPoint {
  point: string;
  evidence: string[];
  strength: number;
}

export interface CounterArgument {
  argument: string;
  source: string;
  strength: number;
}

export interface Rebuttal {
  toCounterArgument: string;
  rebuttal: string;
  evidence: string[];
}

export interface ArgumentMap {
  id: string;
  mainClaim: string;
  supportingPoints: SupportingPoint[];
  counterArguments: CounterArgument[];
  rebuttals: Rebuttal[];
  strengthScore: number;
}

export interface CreateAssignmentInput {
  title: string;
  prompt: string;
  assignmentType: AssignmentType;
  subjectArea?: string;
  academicLevel?: AcademicLevel;
  wordLimit?: number;
  deadline?: string;
  requirements?: string[];
  uploadId?: string;
}

// API Functions
export async function createAssignment(data: CreateAssignmentInput): Promise<Assignment> {
  const response = await fetchApi('/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.assignment;
}

export async function getAssignments(status?: AssignmentStatus): Promise<Assignment[]> {
  const url = status ? `/assignments?status=${status}` : '/assignments';
  const response = await fetchApi(url);
  return response.assignments;
}

export async function getAssignment(id: string): Promise<Assignment> {
  const response = await fetchApi(`/assignments/${id}`);
  return response.assignment;
}

export async function updateAssignment(id: string, data: Partial<CreateAssignmentInput>): Promise<Assignment> {
  const response = await fetchApi(`/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  await fetchApi(`/assignments/${id}`, { method: 'DELETE' });
}

export async function generateBrainstorm(id: string): Promise<AssignmentBrainstorm> {
  const response = await fetchApi(`/assignments/${id}/brainstorm`, {
    method: 'POST',
  });
  return response.brainstorm;
}

export async function regenerateBrainstorm(id: string, focus?: string): Promise<AssignmentBrainstorm> {
  const response = await fetchApi(`/assignments/${id}/brainstorm/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ focus }),
  });
  return response.brainstorm;
}

export async function generateOutline(id: string, thesisStatement?: string): Promise<AssignmentOutline> {
  const response = await fetchApi(`/assignments/${id}/outline`, {
    method: 'POST',
    body: JSON.stringify({ thesisStatement }),
  });
  return response.outline;
}

export async function updateOutline(id: string, outline: Partial<AssignmentOutline>): Promise<AssignmentOutline> {
  const response = await fetchApi(`/assignments/${id}/outline`, {
    method: 'PUT',
    body: JSON.stringify(outline),
  });
  return response.outline;
}

export async function refineOutline(id: string, feedback: string, sectionId?: string): Promise<AssignmentOutline> {
  const response = await fetchApi(`/assignments/${id}/outline/refine`, {
    method: 'POST',
    body: JSON.stringify({ feedback, sectionId }),
  });
  return response.outline;
}

export async function exportOutline(id: string, format: 'pdf' | 'docx'): Promise<string> {
  const response = await fetchApi(`/assignments/${id}/outline/export`, {
    method: 'POST',
    body: JSON.stringify({ format }),
  });
  return response.downloadUrl;
}

export async function generateArgumentMap(id: string, thesis: string): Promise<ArgumentMap> {
  const response = await fetchApi(`/assignments/${id}/arguments`, {
    method: 'POST',
    body: JSON.stringify({ thesis }),
  });
  return response.arguments;
}

export async function getCitationRecommendations(id: string): Promise<{
  academicDatabases: Array<{ name: string; reason: string; searchTerms: string[] }>;
  sourceTypes: Array<{ type: string; importance: string; suggestedCount: number; searchTerms: string[] }>;
  citationStyle: string;
}> {
  const response = await fetchApi(`/assignments/${id}/citations`, {
    method: 'POST',
  });
  return response.recommendations;
}
```

## Dependencies to Install

### Backend (apps/api)
```bash
# No new dependencies - using existing OpenAI and Prisma
```

### Frontend (apps/web)
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder --workspace=@studysync/web
npm install jspdf --workspace=@studysync/web
npm install docx --workspace=@studysync/web
npm install @dnd-kit/core @dnd-kit/sortable --workspace=@studysync/web  # For outline reordering
```

## Testing Strategy

### Unit Tests
- Brainstorm generation with various assignment types
- Outline structure validation by type
- Word allocation distribution
- Quality score calculation
- Argument strength scoring

### Integration Tests
- API endpoints return correct data
- Subscription middleware blocks FREE/PREMIUM users
- Assignment CRUD operations
- Export generates valid files

### E2E Tests
- Assignment creation wizard flow
- Brainstorming generation and display
- Outline generation and editing
- Argument map creation
- Export download works
- Academic integrity banners display

## Future Enhancements

1. **AI Tutor Integration**: Explain complex outline sections
2. **Collaborative Brainstorming**: Share and discuss ideas with classmates
3. **Professor Style Learning**: Adapt suggestions based on graded feedback
4. **Writing Progress Tracking**: Track actual writing against outline
5. **Smart Citation Management**: Integration with Zotero/Mendeley
6. **Grammar & Style Check**: Real-time writing suggestions
7. **Plagiarism Pre-Check**: Check outline uniqueness
8. **Template Library**: Save and reuse successful outlines

## Notes

- This feature is **only available for STUDENT_PLUS and UNIVERSITY tiers**
- Academic integrity warnings are **mandatory** and must be prominent
- The tool assists with organization, **NOT** content creation
- All AI responses emphasize original thinking and proper citation
- Outlines should be regeneratable without losing user edits (versioning)
- Export functionality stores files temporarily (24-hour expiration)
- Consider caching brainstorm results for repeated generations
- Generation times should be under 10 seconds for most assignments
