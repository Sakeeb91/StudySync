# SSC-18: University Partnership Program - Implementation Plan

## Overview

Develop a comprehensive B2B strategy and technical infrastructure for partnerships with universities to adopt StudySync at the institutional level. This includes building professor/admin dashboards, LMS integrations (Canvas, Blackboard, Moodle), compliance features (FERPA, GDPR), and institutional licensing systems.

**Priority**: High
**Type**: B2B Enterprise Feature

## Business Goals

1. Partner with 3-5 universities for pilot programs
2. Secure paid institutional licenses
3. Get endorsements from professors and departments
4. Integrate with university LMS systems
5. Demonstrate measurable student outcome improvements

## Tech Stack

### Backend
- **Express.js + Prisma**: Extended for multi-tenant architecture
- **OAuth 2.0 / LTI 1.3**: LMS integration standard
- **Role-Based Access Control**: Admin, Professor, TA, Student roles
- **Audit Logging**: Compliance requirements

### Frontend
- **Next.js 14**: Admin and Professor dashboards
- **Data Visualization**: Recharts for analytics
- **Report Generation**: PDF/Excel exports

### Integrations
- **Canvas LMS**: LTI 1.3 integration
- **Blackboard**: LTI 1.3 integration
- **Moodle**: LTI 1.3 integration
- **SSO**: SAML 2.0 / OAuth 2.0 for university identity providers

## Current State Analysis

### What Already Exists
- **User Authentication**: JWT-based auth system
- **Subscription Tiers**: Including UNIVERSITY tier
- **Analytics System**: SSC-17 provides learning analytics foundation
- **Content System**: Flashcards, quizzes, uploads
- **Payment System**: Stripe integration (SSC-16)

### What Needs to Be Built
1. Multi-tenant organization architecture
2. Role-based access control (Admin, Professor, TA, Student)
3. Professor dashboard with class/student views
4. Admin dashboard for university management
5. LMS integrations (LTI 1.3)
6. SSO integration (SAML 2.0)
7. Compliance features (FERPA, GDPR, data export)
8. Institutional billing and licensing
9. Bulk user provisioning
10. Class/course management
11. Aggregated analytics and reporting
12. Student outcome tracking

## Implementation Stages (24 Atomic Commits)

### Phase 1: Database Schema - Multi-Tenant Architecture (Commits 1-4)

**Commit 1**: Create Organization model for universities
```prisma
model Organization {
  id                String    @id @default(cuid())
  name              String
  slug              String    @unique          // e.g., "stanford", "mit"
  type              OrganizationType
  domain            String?                    // e.g., "stanford.edu" for SSO
  logo              String?
  primaryColor      String?                    // Brand customization
  secondaryColor    String?
  settings          Json?                      // Custom settings
  status            OrganizationStatus @default(TRIAL)
  trialEndsAt       DateTime?
  contractStartDate DateTime?
  contractEndDate   DateTime?
  maxSeats          Int?                       // License seat limit
  currentSeats      Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  members           OrganizationMember[]
  courses           Course[]
  invitations       OrganizationInvitation[]
  integrations      LMSIntegration[]
  billingInfo       OrganizationBilling?
  auditLogs         AuditLog[]

  @@index([slug])
  @@index([domain])
  @@index([status])
}

enum OrganizationType {
  UNIVERSITY
  COLLEGE
  COMMUNITY_COLLEGE
  ONLINE_UNIVERSITY
  K12_SCHOOL
  CORPORATE
  OTHER
}

enum OrganizationStatus {
  TRIAL              // Trial period
  ACTIVE             // Paid and active
  SUSPENDED          // Payment issues
  CANCELLED          // Contract ended
  PILOT              // Pilot program
}
```

**Commit 2**: Create OrganizationMember and role system
```prisma
model OrganizationMember {
  id                String    @id @default(cuid())
  organizationId    String
  userId            String
  role              OrganizationRole
  department        String?                    // e.g., "Computer Science"
  title             String?                    // e.g., "Professor", "TA"
  status            MemberStatus @default(ACTIVE)
  invitedBy         String?
  joinedAt          DateTime  @default(now())
  lastActiveAt      DateTime?

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseAssignments CourseAssignment[]

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
  @@index([role])
}

enum OrganizationRole {
  OWNER              // Full admin access, billing
  ADMIN              // University admin, manage members
  PROFESSOR          // Create courses, view student progress
  TEACHING_ASSISTANT // Limited professor capabilities
  STUDENT            // Standard student access
}

enum MemberStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

model OrganizationInvitation {
  id                String    @id @default(cuid())
  organizationId    String
  email             String
  role              OrganizationRole
  invitedBy         String
  token             String    @unique
  expiresAt         DateTime
  acceptedAt        DateTime?
  createdAt         DateTime  @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([email])
  @@index([token])
}
```

**Commit 3**: Create Course and class management models
```prisma
model Course {
  id                String    @id @default(cuid())
  organizationId    String
  externalId        String?                    // LMS course ID
  code              String                     // e.g., "CS101"
  name              String                     // e.g., "Introduction to Computer Science"
  description       String?
  term              String?                    // e.g., "Fall 2024"
  year              Int?
  startDate         DateTime?
  endDate           DateTime?
  isActive          Boolean   @default(true)
  settings          Json?                      // Course-specific settings
  lmsIntegrationId  String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lmsIntegration    LMSIntegration? @relation(fields: [lmsIntegrationId], references: [id])
  assignments       CourseAssignment[]
  enrollments       CourseEnrollment[]
  sharedContent     SharedContent[]

  @@unique([organizationId, code, term, year])
  @@index([organizationId])
  @@index([externalId])
}

model CourseAssignment {
  id                String    @id @default(cuid())
  courseId          String
  memberId          String
  role              CourseRole
  assignedAt        DateTime  @default(now())

  course            Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  member            OrganizationMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([courseId, memberId])
  @@index([courseId])
  @@index([memberId])
}

model CourseEnrollment {
  id                String    @id @default(cuid())
  courseId          String
  userId            String
  enrolledAt        DateTime  @default(now())
  status            EnrollmentStatus @default(ACTIVE)
  grade             String?                    // Final grade if synced
  lastAccessAt      DateTime?

  course            Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([courseId, userId])
  @@index([courseId])
  @@index([userId])
}

enum CourseRole {
  INSTRUCTOR         // Primary professor
  CO_INSTRUCTOR      // Additional instructor
  TEACHING_ASSISTANT
  GRADER
}

enum EnrollmentStatus {
  ACTIVE
  DROPPED
  COMPLETED
  WITHDRAWN
}
```

**Commit 4**: Create shared content and professor content models
```prisma
model SharedContent {
  id                String    @id @default(cuid())
  courseId          String
  createdById       String                     // Professor who shared
  contentType       SharedContentType
  contentId         String                     // FlashcardSet or Quiz ID
  title             String
  description       String?
  isRequired        Boolean   @default(false)  // Required for grade
  dueDate           DateTime?
  pointsValue       Int?                       // Grade points
  publishedAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  course            Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  completions       ContentCompletion[]

  @@index([courseId])
  @@index([contentType])
}

model ContentCompletion {
  id                String    @id @default(cuid())
  sharedContentId   String
  userId            String
  completedAt       DateTime  @default(now())
  score             Float?                     // If applicable
  timeSpent         Int?                       // Minutes
  attempts          Int       @default(1)

  sharedContent     SharedContent @relation(fields: [sharedContentId], references: [id], onDelete: Cascade)
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sharedContentId, userId])
  @@index([sharedContentId])
  @@index([userId])
}

enum SharedContentType {
  FLASHCARD_SET
  QUIZ
  STUDY_GUIDE
  UPLOAD
}
```

### Phase 2: LMS Integration - LTI 1.3 (Commits 5-8)

**Commit 5**: Create LMS integration models
```prisma
model LMSIntegration {
  id                String    @id @default(cuid())
  organizationId    String
  platform          LMSPlatform
  name              String                     // e.g., "Stanford Canvas"
  clientId          String                     // LTI client ID
  deploymentId      String?                    // LTI deployment ID
  issuer            String                     // LTI issuer URL
  authEndpoint      String                     // Authorization URL
  tokenEndpoint     String                     // Token URL
  jwksEndpoint      String                     // JWKS URL
  publicKey         String?                    // Our public key
  privateKey        String?   @db.Text         // Our private key (encrypted)
  isActive          Boolean   @default(true)
  lastSyncAt        DateTime?
  settings          Json?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  courses           Course[]
  launchTokens      LTILaunchToken[]

  @@unique([organizationId, platform])
  @@index([organizationId])
}

model LTILaunchToken {
  id                String    @id @default(cuid())
  integrationId     String
  userId            String?                    // Linked StudySync user
  ltiUserId         String                     // LTI user ID
  courseId          String?
  ltiCourseId       String?                    // LTI context ID
  nonce             String    @unique
  state             String?
  claims            Json                       // Full LTI claims
  expiresAt         DateTime
  createdAt         DateTime  @default(now())

  integration       LMSIntegration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId])
  @@index([nonce])
  @@index([ltiUserId])
}

enum LMSPlatform {
  CANVAS
  BLACKBOARD
  MOODLE
  D2L_BRIGHTSPACE
  SCHOOLOGY
  GOOGLE_CLASSROOM
  OTHER
}
```

**Commit 6**: Implement LTI 1.3 launch handler
```typescript
// apps/api/src/services/lti.service.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class LTIService {
  /**
   * Handle LTI 1.3 OIDC login initiation
   */
  async initiateLogin(params: {
    iss: string;
    login_hint: string;
    target_link_uri: string;
    lti_message_hint?: string;
    client_id?: string;
  }) {
    // Find integration by issuer
    const integration = await prisma.lMSIntegration.findFirst({
      where: { issuer: params.iss, isActive: true },
    });

    if (!integration) {
      throw new Error('Unknown LMS platform');
    }

    // Generate state and nonce
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store launch token
    await prisma.lTILaunchToken.create({
      data: {
        integrationId: integration.id,
        ltiUserId: params.login_hint,
        nonce,
        state,
        claims: {},
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Build authorization redirect URL
    const authUrl = new URL(integration.authEndpoint);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('client_id', integration.clientId);
    authUrl.searchParams.set('redirect_uri', params.target_link_uri);
    authUrl.searchParams.set('login_hint', params.login_hint);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    if (params.lti_message_hint) {
      authUrl.searchParams.set('lti_message_hint', params.lti_message_hint);
    }

    return authUrl.toString();
  }

  /**
   * Handle LTI 1.3 launch callback
   */
  async handleLaunch(idToken: string, state: string) {
    // Find the launch token by state
    const launchToken = await prisma.lTILaunchToken.findFirst({
      where: { state, expiresAt: { gt: new Date() } },
      include: { integration: true },
    });

    if (!launchToken) {
      throw new Error('Invalid or expired launch state');
    }

    // Verify and decode the ID token
    const claims = await this.verifyIdToken(idToken, launchToken.integration);

    // Verify nonce
    if (claims.nonce !== launchToken.nonce) {
      throw new Error('Invalid nonce');
    }

    // Extract LTI claims
    const ltiClaims = {
      userId: claims.sub,
      email: claims.email,
      name: claims.name || claims.given_name + ' ' + claims.family_name,
      roles: claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [],
      context: claims['https://purl.imsglobal.org/spec/lti/claim/context'],
      resourceLink: claims['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
      launchPresentation: claims['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'],
    };

    // Update launch token with claims
    await prisma.lTILaunchToken.update({
      where: { id: launchToken.id },
      data: {
        claims: ltiClaims,
        ltiCourseId: ltiClaims.context?.id,
      },
    });

    // Find or create user
    const user = await this.findOrCreateUser(
      ltiClaims,
      launchToken.integration.organizationId
    );

    // Handle course enrollment if applicable
    if (ltiClaims.context?.id) {
      await this.handleCourseEnrollment(
        user.id,
        ltiClaims.context,
        ltiClaims.roles,
        launchToken.integration
      );
    }

    return {
      user,
      launchToken,
      ltiClaims,
    };
  }

  /**
   * Verify LTI ID token using JWKS
   */
  private async verifyIdToken(token: string, integration: any): Promise<any> {
    const client = jwksClient({
      jwksUri: integration.jwksEndpoint,
      cache: true,
      rateLimit: true,
    });

    const getKey = (header: any, callback: any) => {
      client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key?.getPublicKey());
      });
    };

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: integration.issuer,
          audience: integration.clientId,
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });
  }

  /**
   * Find or create user from LTI claims
   */
  private async findOrCreateUser(claims: any, organizationId: string) {
    // Try to find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: claims.email },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: claims.email,
          name: claims.name,
          password: '', // LTI users don't need password
          subscriptionTier: 'UNIVERSITY',
          emailVerified: true, // Trust LMS verification
        },
      });
    }

    // Ensure organization membership
    const role = this.mapLTIRoleToOrganizationRole(claims.roles);
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId, userId: user.id },
      },
      create: {
        organizationId,
        userId: user.id,
        role,
      },
      update: {
        lastActiveAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Handle course enrollment from LTI launch
   */
  private async handleCourseEnrollment(
    userId: string,
    context: any,
    roles: string[],
    integration: any
  ) {
    // Find or create course
    let course = await prisma.course.findFirst({
      where: {
        organizationId: integration.organizationId,
        externalId: context.id,
      },
    });

    if (!course) {
      course = await prisma.course.create({
        data: {
          organizationId: integration.organizationId,
          externalId: context.id,
          code: context.label || context.id,
          name: context.title || 'Untitled Course',
          lmsIntegrationId: integration.id,
        },
      });
    }

    // Enroll user
    await prisma.courseEnrollment.upsert({
      where: {
        courseId_userId: { courseId: course.id, userId },
      },
      create: {
        courseId: course.id,
        userId,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        lastAccessAt: new Date(),
      },
    });
  }

  /**
   * Map LTI roles to organization roles
   */
  private mapLTIRoleToOrganizationRole(ltiRoles: string[]): string {
    const roleMap: Record<string, string> = {
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor': 'PROFESSOR',
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator': 'ADMIN',
      'http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant': 'TEACHING_ASSISTANT',
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner': 'STUDENT',
    };

    for (const role of ltiRoles) {
      if (roleMap[role]) {
        return roleMap[role];
      }
    }

    return 'STUDENT';
  }
}

export const ltiService = new LTIService();
```

**Commit 7**: Implement LTI Deep Linking for content sharing
```typescript
// apps/api/src/services/ltiDeepLink.service.ts
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LTIDeepLinkService {
  /**
   * Generate deep link response for embedding StudySync content in LMS
   */
  async createDeepLinkResponse(
    integrationId: string,
    items: DeepLinkItem[],
    deploymentId: string,
    returnUrl: string
  ) {
    const integration = await prisma.lMSIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.privateKey) {
      throw new Error('Integration not found or not configured');
    }

    // Build content items
    const contentItems = items.map(item => ({
      type: 'ltiResourceLink',
      title: item.title,
      text: item.description,
      url: `${process.env.APP_URL}/lti/launch/${item.contentType}/${item.contentId}`,
      custom: {
        studysync_content_type: item.contentType,
        studysync_content_id: item.contentId,
      },
      lineItem: item.pointsValue ? {
        scoreMaximum: item.pointsValue,
        label: item.title,
        resourceId: item.contentId,
      } : undefined,
    }));

    // Create JWT
    const payload = {
      iss: integration.clientId,
      aud: integration.issuer,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      nonce: crypto.randomUUID(),
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': deploymentId,
      'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': contentItems,
    };

    const token = jwt.sign(payload, integration.privateKey, {
      algorithm: 'RS256',
      keyid: 'studysync-lti-key',
    });

    return {
      jwt: token,
      returnUrl,
    };
  }

  /**
   * Get available content for deep linking
   */
  async getAvailableContent(userId: string, courseId?: string) {
    const flashcardSets = await prisma.flashcardSet.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        _count: { select: { flashcards: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const quizzes = await prisma.quiz.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        _count: { select: { questions: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return {
      flashcardSets: flashcardSets.map(s => ({
        contentType: 'FLASHCARD_SET',
        contentId: s.id,
        title: s.title,
        description: s.description || `${s._count.flashcards} cards`,
      })),
      quizzes: quizzes.map(q => ({
        contentType: 'QUIZ',
        contentId: q.id,
        title: q.title,
        description: q.description || `${q._count.questions} questions`,
      })),
    };
  }
}

interface DeepLinkItem {
  contentType: 'FLASHCARD_SET' | 'QUIZ';
  contentId: string;
  title: string;
  description?: string;
  pointsValue?: number;
}

export const ltiDeepLinkService = new LTIDeepLinkService();
```

**Commit 8**: Create LTI API routes and controllers
```typescript
// apps/api/src/routes/lti.routes.ts
import { Router } from 'express';
import { ltiController } from '../controllers/lti.controller';

const router = Router();

// LTI 1.3 Launch Flow
router.get('/login', ltiController.initiateLogin);           // OIDC initiation
router.post('/launch', ltiController.handleLaunch);          // Launch callback
router.get('/jwks', ltiController.getJWKS);                  // Public keys

// Deep Linking
router.get('/deep-link/content', ltiController.getDeepLinkContent);
router.post('/deep-link/response', ltiController.createDeepLinkResponse);

// Grade Passback (Assignment & Grade Service)
router.post('/grades/:contentId', ltiController.submitGrade);

export default router;
```

### Phase 3: SSO Integration - SAML 2.0 (Commits 9-10)

**Commit 9**: Create SSO configuration models
```prisma
model SSOConfiguration {
  id                String    @id @default(cuid())
  organizationId    String    @unique
  provider          SSOProvider
  entityId          String                     // Our entity ID
  ssoUrl            String                     // IdP SSO URL
  sloUrl            String?                    // IdP SLO URL (optional)
  certificate       String    @db.Text         // IdP X.509 certificate
  privateKey        String?   @db.Text         // Our private key (encrypted)
  publicKey         String?   @db.Text         // Our public key
  attributeMapping  Json                       // Map IdP attributes to user fields
  isActive          Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

enum SSOProvider {
  SAML
  OIDC
  CAS
  SHIBBOLETH
}
```

**Commit 10**: Implement SAML 2.0 authentication
```typescript
// apps/api/src/services/saml.service.ts
import { SAML } from '@node-saml/node-saml';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SAMLService {
  private samlInstances: Map<string, SAML> = new Map();

  async getSAMLInstance(organizationId: string): Promise<SAML> {
    if (this.samlInstances.has(organizationId)) {
      return this.samlInstances.get(organizationId)!;
    }

    const config = await prisma.sSOConfiguration.findUnique({
      where: { organizationId },
    });

    if (!config || !config.isActive) {
      throw new Error('SSO not configured for this organization');
    }

    const saml = new SAML({
      callbackUrl: `${process.env.APP_URL}/api/auth/sso/callback/${organizationId}`,
      entryPoint: config.ssoUrl,
      issuer: config.entityId,
      cert: config.certificate,
      privateKey: config.privateKey || undefined,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      wantAssertionsSigned: true,
      signatureAlgorithm: 'sha256',
    });

    this.samlInstances.set(organizationId, saml);
    return saml;
  }

  async getLoginUrl(organizationId: string): Promise<string> {
    const saml = await this.getSAMLInstance(organizationId);
    return new Promise((resolve, reject) => {
      saml.getAuthorizeUrl({}, (err, url) => {
        if (err) reject(err);
        else resolve(url!);
      });
    });
  }

  async validateResponse(organizationId: string, samlResponse: string) {
    const saml = await this.getSAMLInstance(organizationId);
    const config = await prisma.sSOConfiguration.findUnique({
      where: { organizationId },
    });

    return new Promise((resolve, reject) => {
      saml.validatePostResponse({ SAMLResponse: samlResponse }, (err, profile) => {
        if (err) reject(err);
        else {
          // Map attributes according to configuration
          const attributeMapping = config?.attributeMapping as Record<string, string> || {};
          const mappedProfile = {
            email: profile?.[attributeMapping.email || 'email'] || profile?.nameID,
            name: profile?.[attributeMapping.name || 'displayName'] ||
                  `${profile?.[attributeMapping.firstName || 'givenName']} ${profile?.[attributeMapping.lastName || 'surname']}`,
            department: profile?.[attributeMapping.department || 'department'],
            role: profile?.[attributeMapping.role || 'role'],
          };
          resolve(mappedProfile);
        }
      });
    });
  }

  async getMetadata(organizationId: string): Promise<string> {
    const saml = await this.getSAMLInstance(organizationId);
    return saml.generateServiceProviderMetadata(null, null);
  }
}

export const samlService = new SAMLService();
```

### Phase 4: Professor Dashboard (Commits 11-14)

**Commit 11**: Create professor dashboard API endpoints
```typescript
// apps/api/src/controllers/professor.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const professorController = {
  /**
   * Get courses taught by professor
   */
  async getMyCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const member = await prisma.organizationMember.findFirst({
        where: { userId, role: { in: ['PROFESSOR', 'TEACHING_ASSISTANT', 'ADMIN'] } },
      });

      if (!member) {
        res.status(403).json({ error: 'Not authorized as instructor' });
        return;
      }

      const assignments = await prisma.courseAssignment.findMany({
        where: { memberId: member.id },
        include: {
          course: {
            include: {
              _count: {
                select: { enrollments: true, sharedContent: true },
              },
            },
          },
        },
      });

      res.json({
        courses: assignments.map(a => ({
          ...a.course,
          role: a.role,
          studentCount: a.course._count.enrollments,
          contentCount: a.course._count.sharedContent,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get students in a course with progress
   */
  async getCourseStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const userId = req.user!.userId;

      // Verify instructor access
      await this.verifyInstructorAccess(userId, courseId);

      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              lastActiveAt: true,
            },
          },
        },
      });

      // Get progress for each student
      const studentsWithProgress = await Promise.all(
        enrollments.map(async (enrollment) => {
          const progress = await this.getStudentProgress(enrollment.userId, courseId);
          return {
            ...enrollment.user,
            enrolledAt: enrollment.enrolledAt,
            lastAccessAt: enrollment.lastAccessAt,
            progress,
          };
        })
      );

      res.json({ students: studentsWithProgress });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get aggregated class analytics
   */
  async getClassAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const userId = req.user!.userId;

      await this.verifyInstructorAccess(userId, courseId);

      // Get shared content with completion stats
      const sharedContent = await prisma.sharedContent.findMany({
        where: { courseId },
        include: {
          _count: { select: { completions: true } },
          completions: {
            select: { score: true, timeSpent: true },
          },
        },
      });

      // Get enrollment count
      const enrollmentCount = await prisma.courseEnrollment.count({
        where: { courseId, status: 'ACTIVE' },
      });

      // Calculate analytics
      const contentAnalytics = sharedContent.map(content => {
        const completionRate = enrollmentCount > 0
          ? (content._count.completions / enrollmentCount) * 100
          : 0;
        const avgScore = content.completions.length > 0
          ? content.completions.reduce((sum, c) => sum + (c.score || 0), 0) / content.completions.length
          : null;
        const avgTimeSpent = content.completions.length > 0
          ? content.completions.reduce((sum, c) => sum + (c.timeSpent || 0), 0) / content.completions.length
          : null;

        return {
          id: content.id,
          title: content.title,
          contentType: content.contentType,
          completionRate: Math.round(completionRate),
          completionCount: content._count.completions,
          averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
          averageTimeSpent: avgTimeSpent ? Math.round(avgTimeSpent) : null,
          isRequired: content.isRequired,
          dueDate: content.dueDate,
        };
      });

      // Overall class stats
      const overallStats = {
        totalStudents: enrollmentCount,
        totalContent: sharedContent.length,
        averageCompletionRate: contentAnalytics.length > 0
          ? Math.round(contentAnalytics.reduce((sum, c) => sum + c.completionRate, 0) / contentAnalytics.length)
          : 0,
        studentsAtRisk: await this.getAtRiskStudentCount(courseId),
      };

      res.json({
        overview: overallStats,
        content: contentAnalytics,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Share content with course
   */
  async shareContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const userId = req.user!.userId;
      const { contentType, contentId, title, description, isRequired, dueDate, pointsValue } = req.body;

      await this.verifyInstructorAccess(userId, courseId);

      const shared = await prisma.sharedContent.create({
        data: {
          courseId,
          createdById: userId,
          contentType,
          contentId,
          title,
          description,
          isRequired: isRequired || false,
          dueDate: dueDate ? new Date(dueDate) : null,
          pointsValue,
          publishedAt: new Date(),
        },
      });

      res.status(201).json({
        message: 'Content shared successfully',
        sharedContent: shared,
      });
    } catch (error) {
      next(error);
    }
  },

  // Helper methods
  async verifyInstructorAccess(userId: string, courseId: string) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
    });

    if (!member) {
      throw new Error('Not a member of any organization');
    }

    const assignment = await prisma.courseAssignment.findFirst({
      where: { memberId: member.id, courseId },
    });

    if (!assignment) {
      throw new Error('Not assigned to this course');
    }
  },

  async getStudentProgress(userId: string, courseId: string) {
    const sharedContent = await prisma.sharedContent.findMany({
      where: { courseId },
    });

    const completions = await prisma.contentCompletion.findMany({
      where: {
        userId,
        sharedContentId: { in: sharedContent.map(c => c.id) },
      },
    });

    const completedCount = completions.length;
    const totalCount = sharedContent.length;
    const averageScore = completions.length > 0
      ? completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length
      : null;

    return {
      completedCount,
      totalCount,
      completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
    };
  },

  async getAtRiskStudentCount(courseId: string) {
    // Students with less than 50% completion rate
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
    });

    let atRiskCount = 0;
    for (const enrollment of enrollments) {
      const progress = await this.getStudentProgress(enrollment.userId, courseId);
      if (progress.completionRate < 50) {
        atRiskCount++;
      }
    }

    return atRiskCount;
  },
};
```

**Commit 12**: Create professor dashboard frontend pages
- Create `apps/web/src/app/(dashboard)/professor/page.tsx`
- Create course list view
- Create student roster view
- Create analytics view

**Commit 13**: Build class analytics visualizations
- Create completion rate charts
- Build student progress table
- Add at-risk student alerts
- Create export functionality

**Commit 14**: Implement content sharing flow
- Build content picker modal
- Create assignment settings (due date, points)
- Add LMS sync for grades

### Phase 5: Admin Dashboard (Commits 15-18)

**Commit 15**: Create admin dashboard API endpoints
```typescript
// apps/api/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const adminController = {
  /**
   * Get organization overview
   */
  async getOrganizationOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;

      await this.verifyAdminAccess(req.user!.userId, organizationId);

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: {
              members: true,
              courses: true,
            },
          },
          billingInfo: true,
        },
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Get member stats by role
      const membersByRole = await prisma.organizationMember.groupBy({
        by: ['role'],
        where: { organizationId },
        _count: true,
      });

      // Get active users in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeUsers = await prisma.organizationMember.count({
        where: {
          organizationId,
          lastActiveAt: { gte: thirtyDaysAgo },
        },
      });

      // Get usage stats
      const usageStats = await this.getUsageStats(organizationId);

      res.json({
        organization: {
          ...organization,
          memberStats: {
            total: organization._count.members,
            byRole: membersByRole.reduce((acc, r) => ({ ...acc, [r.role]: r._count }), {}),
            activeInLast30Days: activeUsers,
          },
          courseCount: organization._count.courses,
          usageStats,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Manage members (invite, remove, change role)
   */
  async inviteMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { emails, role } = req.body;

      await this.verifyAdminAccess(req.user!.userId, organizationId);

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      // Check seat limits
      if (organization?.maxSeats) {
        const currentSeats = await prisma.organizationMember.count({
          where: { organizationId },
        });

        if (currentSeats + emails.length > organization.maxSeats) {
          res.status(400).json({
            error: `Cannot invite ${emails.length} members. ${organization.maxSeats - currentSeats} seats remaining.`,
          });
          return;
        }
      }

      const invitations = [];
      for (const email of emails) {
        // Check if already a member
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          const existingMember = await prisma.organizationMember.findFirst({
            where: { organizationId, userId: existingUser.id },
          });
          if (existingMember) continue;
        }

        // Create invitation
        const invitation = await prisma.organizationInvitation.create({
          data: {
            organizationId,
            email,
            role,
            invitedBy: req.user!.userId,
            token: crypto.randomUUID(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        invitations.push(invitation);

        // Send invitation email (implementation depends on email service)
        await this.sendInvitationEmail(email, invitation, organization!.name);
      }

      res.status(201).json({
        message: `${invitations.length} invitations sent`,
        invitations,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk import users from CSV
   */
  async bulkImportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { users } = req.body; // Array of { email, name, role, department }

      await this.verifyAdminAccess(req.user!.userId, organizationId);

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const userData of users) {
        try {
          let user = await prisma.user.findUnique({
            where: { email: userData.email },
          });

          if (!user) {
            // Create user
            user = await prisma.user.create({
              data: {
                email: userData.email,
                name: userData.name,
                password: '', // Will need to set via password reset
                subscriptionTier: 'UNIVERSITY',
              },
            });
            results.created++;
          }

          // Add/update membership
          await prisma.organizationMember.upsert({
            where: {
              organizationId_userId: { organizationId, userId: user.id },
            },
            create: {
              organizationId,
              userId: user.id,
              role: userData.role || 'STUDENT',
              department: userData.department,
            },
            update: {
              role: userData.role || 'STUDENT',
              department: userData.department,
            },
          });

          if (!results.created) results.updated++;
        } catch (error) {
          results.errors.push(`Failed to import ${userData.email}: ${error}`);
          results.skipped++;
        }
      }

      // Update seat count
      await this.updateSeatCount(organizationId);

      res.json(results);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get usage and compliance report
   */
  async getUsageReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;

      await this.verifyAdminAccess(req.user!.userId, organizationId);

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get all members
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        include: { user: true },
      });

      const userIds = members.map(m => m.userId);

      // Aggregate study sessions
      const studySessions = await prisma.studySession.findMany({
        where: {
          userId: { in: userIds },
          startedAt: { gte: start, lte: end },
        },
      });

      // Aggregate quiz attempts
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
          userId: { in: userIds },
          startedAt: { gte: start, lte: end },
          completed: true,
        },
      });

      // Calculate metrics
      const totalStudyTime = studySessions.reduce((sum, s) => sum + s.duration, 0);
      const totalCardsReviewed = studySessions.reduce((sum, s) => sum + s.cardsStudied, 0);
      const avgQuizScore = quizAttempts.length > 0
        ? quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length
        : 0;

      // Active users
      const activeUserIds = new Set([
        ...studySessions.map(s => s.userId),
        ...quizAttempts.map(a => a.userId),
      ]);

      res.json({
        period: { start, end },
        metrics: {
          totalMembers: members.length,
          activeUsers: activeUserIds.size,
          activationRate: Math.round((activeUserIds.size / members.length) * 100),
          totalStudyTimeMinutes: Math.round(totalStudyTime / 60),
          totalCardsReviewed,
          totalQuizzesTaken: quizAttempts.length,
          averageQuizScore: Math.round(avgQuizScore),
        },
        byRole: {
          students: members.filter(m => m.role === 'STUDENT').length,
          professors: members.filter(m => m.role === 'PROFESSOR').length,
          admins: members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Helper methods
  async verifyAdminAccess(userId: string, organizationId: string) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!member) {
      throw new Error('Admin access required');
    }
  },

  async getUsageStats(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
    });
    const userIds = members.map(m => m.userId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [flashcardSets, quizzes, studySessions] = await Promise.all([
      prisma.flashcardSet.count({ where: { userId: { in: userIds } } }),
      prisma.quiz.count({ where: { userId: { in: userIds } } }),
      prisma.studySession.count({
        where: { userId: { in: userIds }, startedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      totalFlashcardSets: flashcardSets,
      totalQuizzes: quizzes,
      studySessionsLast30Days: studySessions,
    };
  },

  async updateSeatCount(organizationId: string) {
    const count = await prisma.organizationMember.count({
      where: { organizationId },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { currentSeats: count },
    });
  },

  async sendInvitationEmail(email: string, invitation: any, orgName: string) {
    // Implementation depends on email service
    console.log(`Send invitation to ${email} for ${orgName}`);
  },
};
```

**Commit 16**: Create admin dashboard frontend pages
- Create organization settings page
- Build member management interface
- Create usage dashboard

**Commit 17**: Implement member management features
- Bulk user import via CSV
- Role management
- Department organization
- Seat limit enforcement

**Commit 18**: Build compliance and reporting features
- FERPA compliance documentation
- GDPR data export/delete
- Audit log viewer
- Usage reports with export

### Phase 6: Billing & Licensing (Commits 19-21)

**Commit 19**: Create organization billing models
```prisma
model OrganizationBilling {
  id                String    @id @default(cuid())
  organizationId    String    @unique
  stripeCustomerId  String?   @unique
  plan              InstitutionalPlan
  billingCycle      BillingCycle @default(ANNUAL)
  pricePerSeat      Int?                       // Custom pricing
  contractValue     Int?                       // Total contract value
  invoiceEmail      String?
  billingAddress    Json?
  paymentMethod     Json?
  nextBillingDate   DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invoices          OrganizationInvoice[]
}

model OrganizationInvoice {
  id                String    @id @default(cuid())
  billingId         String
  stripeInvoiceId   String?   @unique
  amount            Int                        // In cents
  status            InvoiceStatus
  period            String                     // e.g., "2024-01"
  seats             Int
  dueDate           DateTime
  paidAt            DateTime?
  invoiceUrl        String?
  createdAt         DateTime  @default(now())

  billing           OrganizationBilling @relation(fields: [billingId], references: [id], onDelete: Cascade)

  @@index([billingId])
}

enum InstitutionalPlan {
  TIER_1              // Up to 1,000 students - $10K/yr
  TIER_2              // 1,000-5,000 students - $25K/yr
  TIER_3              // 5,000-15,000 students - $50K/yr
  ENTERPRISE          // 15,000+ students - Custom
  PILOT               // Free pilot program
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum InvoiceStatus {
  DRAFT
  PENDING
  PAID
  OVERDUE
  CANCELLED
}
```

**Commit 20**: Implement institutional billing service
```typescript
// apps/api/src/services/institutionalBilling.service.ts
import Stripe from 'stripe';
import { PrismaClient, InstitutionalPlan } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PLAN_PRICING: Record<InstitutionalPlan, { price: number; maxSeats: number }> = {
  TIER_1: { price: 10000_00, maxSeats: 1000 },      // $10,000
  TIER_2: { price: 25000_00, maxSeats: 5000 },      // $25,000
  TIER_3: { price: 50000_00, maxSeats: 15000 },     // $50,000
  ENTERPRISE: { price: 0, maxSeats: Infinity },     // Custom
  PILOT: { price: 0, maxSeats: 500 },               // Free
};

export class InstitutionalBillingService {
  /**
   * Create billing setup for organization
   */
  async setupBilling(organizationId: string, data: {
    plan: InstitutionalPlan;
    billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
    invoiceEmail: string;
    billingAddress?: any;
  }) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: organization.name,
      email: data.invoiceEmail,
      metadata: {
        organizationId,
        plan: data.plan,
      },
    });

    // Create billing record
    const billing = await prisma.organizationBilling.create({
      data: {
        organizationId,
        stripeCustomerId: customer.id,
        plan: data.plan,
        billingCycle: data.billingCycle,
        invoiceEmail: data.invoiceEmail,
        billingAddress: data.billingAddress,
        nextBillingDate: this.calculateNextBillingDate(data.billingCycle),
      },
    });

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: data.plan === 'PILOT' ? 'PILOT' : 'ACTIVE',
        maxSeats: PLAN_PRICING[data.plan].maxSeats,
      },
    });

    return billing;
  }

  /**
   * Generate invoice for organization
   */
  async generateInvoice(organizationId: string) {
    const billing = await prisma.organizationBilling.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    if (!billing) {
      throw new Error('Billing not configured');
    }

    const planPricing = PLAN_PRICING[billing.plan];
    const amount = billing.pricePerSeat
      ? billing.pricePerSeat * billing.organization.currentSeats
      : planPricing.price;

    // Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: billing.stripeCustomerId!,
      auto_advance: false,
      collection_method: 'send_invoice',
      days_until_due: 30,
    });

    await stripe.invoiceItems.create({
      customer: billing.stripeCustomerId!,
      invoice: stripeInvoice.id,
      amount,
      currency: 'usd',
      description: `StudySync ${billing.plan} - ${billing.organization.currentSeats} seats`,
    });

    await stripe.invoices.finalizeInvoice(stripeInvoice.id);
    await stripe.invoices.sendInvoice(stripeInvoice.id);

    // Record invoice
    const invoice = await prisma.organizationInvoice.create({
      data: {
        billingId: billing.id,
        stripeInvoiceId: stripeInvoice.id,
        amount,
        status: 'PENDING',
        period: new Date().toISOString().slice(0, 7),
        seats: billing.organization.currentSeats,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        invoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
      },
    });

    return invoice;
  }

  /**
   * Handle invoice payment webhook
   */
  async handleInvoicePaid(stripeInvoiceId: string) {
    const invoice = await prisma.organizationInvoice.findUnique({
      where: { stripeInvoiceId },
      include: { billing: true },
    });

    if (!invoice) return;

    await prisma.organizationInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Update next billing date
    await prisma.organizationBilling.update({
      where: { id: invoice.billingId },
      data: {
        nextBillingDate: this.calculateNextBillingDate(invoice.billing.billingCycle),
      },
    });
  }

  /**
   * Get ROI calculator data
   */
  async calculateROI(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { billingInfo: true },
    });

    if (!org) throw new Error('Organization not found');

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
    });
    const userIds = members.map(m => m.userId);

    // Calculate usage metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const studySessions = await prisma.studySession.aggregate({
      where: { userId: { in: userIds }, startedAt: { gte: thirtyDaysAgo } },
      _sum: { duration: true, cardsStudied: true },
      _count: true,
    });

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: { in: userIds }, startedAt: { gte: thirtyDaysAgo }, completed: true },
    });

    // ROI assumptions
    const avgTutoringCostPerHour = 50;
    const studyHours = (studySessions._sum.duration || 0) / 3600;
    const tutoringCostSaved = studyHours * avgTutoringCostPerHour * 0.3; // 30% would have needed tutoring

    const avgGradeImprovement = 0.5; // Letter grade improvement
    const retentionValuePerStudent = 25000; // Avg tuition
    const estimatedRetentionImprovement = 0.02; // 2% improvement
    const retentionValue = org.currentSeats * retentionValuePerStudent * estimatedRetentionImprovement;

    const annualCost = org.billingInfo
      ? PLAN_PRICING[org.billingInfo.plan].price
      : 0;

    return {
      metrics: {
        activeStudents: members.filter(m => m.role === 'STUDENT').length,
        studySessionsPerMonth: studySessions._count,
        totalStudyHours: Math.round(studyHours),
        avgQuizScore: quizAttempts.length > 0
          ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length)
          : 0,
      },
      roi: {
        annualCost,
        tutoringCostSaved: Math.round(tutoringCostSaved * 12),
        estimatedRetentionValue: Math.round(retentionValue),
        totalAnnualValue: Math.round(tutoringCostSaved * 12 + retentionValue),
        roiMultiple: annualCost > 0
          ? Math.round((tutoringCostSaved * 12 + retentionValue) / annualCost * 10) / 10
          : 0,
      },
    };
  }

  private calculateNextBillingDate(cycle: string): Date {
    const now = new Date();
    switch (cycle) {
      case 'MONTHLY':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'QUARTERLY':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'ANNUAL':
      default:
        return new Date(now.setFullYear(now.getFullYear() + 1));
    }
  }
}

export const institutionalBillingService = new InstitutionalBillingService();
```

**Commit 21**: Create billing management frontend
- Plan selection interface
- Invoice history
- Payment method management
- ROI calculator widget

### Phase 7: Compliance & Audit (Commits 22-23)

**Commit 22**: Implement audit logging system
```prisma
model AuditLog {
  id                String    @id @default(cuid())
  organizationId    String
  userId            String?
  action            AuditAction
  resourceType      String                     // e.g., "User", "Course", "Content"
  resourceId        String?
  details           Json?                      // Additional context
  ipAddress         String?
  userAgent         String?
  createdAt         DateTime  @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

enum AuditAction {
  // User actions
  USER_LOGIN
  USER_LOGOUT
  USER_CREATED
  USER_UPDATED
  USER_DELETED
  USER_ROLE_CHANGED

  // Content actions
  CONTENT_CREATED
  CONTENT_UPDATED
  CONTENT_DELETED
  CONTENT_SHARED
  CONTENT_ACCESSED

  // Course actions
  COURSE_CREATED
  COURSE_UPDATED
  COURSE_DELETED
  ENROLLMENT_ADDED
  ENROLLMENT_REMOVED

  // Admin actions
  SETTINGS_CHANGED
  MEMBER_INVITED
  MEMBER_REMOVED
  INTEGRATION_ADDED
  INTEGRATION_REMOVED
  BILLING_UPDATED

  // Compliance actions
  DATA_EXPORTED
  DATA_DELETED
  CONSENT_UPDATED
}
```

**Commit 23**: Implement FERPA/GDPR compliance features
```typescript
// apps/api/src/services/compliance.service.ts
import { PrismaClient } from '@prisma/client';
import { createObjectCsvStringifier } from 'csv-writer';

const prisma = new PrismaClient();

export class ComplianceService {
  /**
   * Export all user data (GDPR requirement)
   */
  async exportUserData(userId: string, organizationId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        flashcardSets: {
          include: { flashcards: true },
        },
        quizzes: {
          include: { questions: true },
        },
        studySessions: true,
        quizAttempts: true,
        uploads: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive fields
    const { password, ...safeUser } = user;

    // Get organization data if applicable
    let orgData = null;
    if (organizationId) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId },
        include: {
          organization: {
            select: { name: true, slug: true },
          },
          courseAssignments: {
            include: { course: { select: { name: true, code: true } } },
          },
        },
      });
      orgData = membership;
    }

    // Log the export
    if (organizationId) {
      await this.logAuditEvent(organizationId, userId, 'DATA_EXPORTED', 'User', userId);
    }

    return {
      exportedAt: new Date().toISOString(),
      user: safeUser,
      organizationMembership: orgData,
    };
  }

  /**
   * Delete all user data (GDPR "Right to be Forgotten")
   */
  async deleteUserData(userId: string, requestedBy: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get organization memberships for audit logging
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
    });

    // Perform deletion in transaction
    await prisma.$transaction(async (tx) => {
      // Delete organization memberships
      await tx.organizationMember.deleteMany({ where: { userId } });

      // Delete course enrollments
      await tx.courseEnrollment.deleteMany({ where: { userId } });

      // Delete content completions
      await tx.contentCompletion.deleteMany({ where: { userId } });

      // Delete study sessions
      await tx.studySession.deleteMany({ where: { userId } });

      // Delete quiz attempts
      await tx.quizAttempt.deleteMany({ where: { userId } });

      // Delete flashcard sets (cascades to flashcards)
      await tx.flashcardSet.deleteMany({ where: { userId } });

      // Delete quizzes (cascades to questions)
      await tx.quiz.deleteMany({ where: { userId } });

      // Delete uploads
      await tx.upload.deleteMany({ where: { userId } });

      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    // Log audit events for each organization
    for (const membership of memberships) {
      await this.logAuditEvent(
        membership.organizationId,
        requestedBy,
        'DATA_DELETED',
        'User',
        userId,
        { reason, deletedUserEmail: user.email }
      );
    }

    return { success: true, deletedAt: new Date().toISOString() };
  }

  /**
   * Generate FERPA-compliant student report (directory info only)
   */
  async generateFERPAReport(organizationId: string, courseId?: string) {
    const where: any = { organizationId, role: 'STUDENT' };

    const students = await prisma.organizationMember.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    // Only include directory information (FERPA-compliant)
    const report = students.map(s => ({
      name: s.user.name,
      email: s.user.email,
      department: s.department,
      enrollmentDate: s.joinedAt,
      status: s.status,
    }));

    await this.logAuditEvent(organizationId, null, 'DATA_EXPORTED', 'FERPAReport', null, {
      studentCount: report.length,
      courseId,
    });

    return report;
  }

  /**
   * Get audit logs for organization
   */
  async getAuditLogs(organizationId: string, filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { organizationId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    organizationId: string,
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    details?: any
  ) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: action as any,
        resourceType,
        resourceId,
        details,
      },
    });
  }
}

export const complianceService = new ComplianceService();
```

### Phase 8: Final Integration (Commit 24)

**Commit 24**: Final integration and documentation
- Add university routes to main app
- Update CLAUDE.md with new endpoints
- Create API documentation for partners
- Add university onboarding checklist
- Create pilot program setup guide

## API Endpoints Summary

### Organization Management
```
POST   /api/organizations                    - Create organization (super admin)
GET    /api/organizations/:id                - Get organization details (admin)
PUT    /api/organizations/:id                - Update organization (admin)
DELETE /api/organizations/:id                - Delete organization (owner)

GET    /api/organizations/:id/members        - List members (admin)
POST   /api/organizations/:id/members/invite - Invite members (admin)
POST   /api/organizations/:id/members/bulk   - Bulk import (admin)
PUT    /api/organizations/:id/members/:userId - Update member (admin)
DELETE /api/organizations/:id/members/:userId - Remove member (admin)
```

### Course Management
```
GET    /api/organizations/:id/courses        - List courses (admin/professor)
POST   /api/organizations/:id/courses        - Create course (admin/professor)
GET    /api/courses/:id                      - Get course details
PUT    /api/courses/:id                      - Update course
DELETE /api/courses/:id                      - Delete course

GET    /api/courses/:id/students             - List enrolled students
POST   /api/courses/:id/students             - Enroll students
DELETE /api/courses/:id/students/:userId     - Remove student

POST   /api/courses/:id/content              - Share content with course
GET    /api/courses/:id/content              - Get shared content
DELETE /api/courses/:id/content/:contentId   - Remove shared content
```

### Professor Dashboard
```
GET    /api/professor/courses                - Get my courses
GET    /api/professor/courses/:id/analytics  - Get class analytics
GET    /api/professor/courses/:id/students   - Get student progress
POST   /api/professor/courses/:id/share      - Share content
```

### Admin Dashboard
```
GET    /api/admin/:orgId/overview            - Organization overview
GET    /api/admin/:orgId/usage               - Usage report
GET    /api/admin/:orgId/audit-logs          - Audit logs
POST   /api/admin/:orgId/settings            - Update settings
```

### LMS Integration
```
GET    /api/lti/login                        - LTI login initiation
POST   /api/lti/launch                       - LTI launch callback
GET    /api/lti/jwks                         - JWKS endpoint
GET    /api/lti/deep-link/content            - Available content for deep linking
POST   /api/lti/deep-link/response           - Deep link response
POST   /api/lti/grades/:contentId            - Grade passback
```

### SSO
```
GET    /api/auth/sso/:orgSlug                - Initiate SSO login
POST   /api/auth/sso/:orgSlug/callback       - SSO callback
GET    /api/auth/sso/:orgSlug/metadata       - SAML metadata
```

### Billing
```
GET    /api/billing/:orgId                   - Get billing info
POST   /api/billing/:orgId/setup             - Setup billing
GET    /api/billing/:orgId/invoices          - List invoices
POST   /api/billing/:orgId/invoices          - Generate invoice
GET    /api/billing/:orgId/roi               - ROI calculator
```

### Compliance
```
GET    /api/compliance/:orgId/export/:userId - Export user data (GDPR)
DELETE /api/compliance/:orgId/user/:userId   - Delete user data (GDPR)
GET    /api/compliance/:orgId/ferpa-report   - FERPA directory report
GET    /api/compliance/:orgId/audit-logs     - Audit log export
```

## Success Criteria

- [ ] All 24 commits completed and passing CI
- [ ] LMS integrations work with Canvas, Blackboard, Moodle
- [ ] SSO works with university identity providers
- [ ] Professor dashboard shows accurate student progress
- [ ] Admin can manage members and view usage
- [ ] Billing generates and tracks invoices
- [ ] Audit logs capture all required events
- [ ] FERPA/GDPR compliance features functional
- [ ] 3 university pilots launched
- [ ] 1 paid institutional license secured
- [ ] Faculty testimonials collected

## Integration with Existing Features

### Analytics (SSC-17)
- Aggregated class analytics built on analytics service
- Student progress tracking integrated
- ROI calculations use study session data

### Subscription (SSC-16)
- UNIVERSITY tier extended with organization context
- Institutional billing separate from individual subscriptions

### All Features
- All features available to university users
- Premium features included in institutional licenses

## Compliance Requirements

### FERPA (U.S.)
- [ ] Only directory information shared by default
- [ ] Student consent for additional data sharing
- [ ] Audit logging of all data access
- [ ] Data retention policies documented

### GDPR (EU)
- [ ] Data export functionality (Article 20)
- [ ] Right to deletion (Article 17)
- [ ] Consent management
- [ ] Data processing documentation
- [ ] Privacy policy updates

### SOC 2
- [ ] Access controls documented
- [ ] Encryption at rest and in transit
- [ ] Audit logging
- [ ] Incident response procedures

## B2B Pricing Model

| Tier | Students | Annual Price | Per-Student |
|------|----------|--------------|-------------|
| Tier 1 | Up to 1,000 | $10,000 | $10.00 |
| Tier 2 | 1,000 - 5,000 | $25,000 | $5.00-$25.00 |
| Tier 3 | 5,000 - 15,000 | $50,000 | $3.33-$10.00 |
| Enterprise | 15,000+ | Custom | Negotiated |
| Pilot | Up to 500 | Free | Free |

## Dependencies

This feature depends on:
- Authentication System (SSC-10) ✅ Complete
- Subscription System (SSC-16) ✅ Complete
- Analytics System (SSC-17) - For class analytics

## Future Enhancements

1. **Grade Sync**: Automatic grade passback to LMS
2. **Assignment Integration**: Create StudySync content from LMS assignments
3. **Proctoring Integration**: Partner with proctoring services
4. **Learning Analytics**: Advanced analytics for institutional reporting
5. **API for Custom Integrations**: Partner developer portal
6. **White-Label Option**: Custom branding for universities
7. **Multi-Campus Support**: Enterprise features for university systems

## Notes

- Pilot programs should last 1 semester (4 months)
- LMS integrations require certification from vendors
- FERPA compliance is mandatory for U.S. universities
- Contract negotiations may require legal review
- Implementation support included in enterprise tier
- Student outcome data is key selling point
