# StudySync

AI-powered study companion transforming passive note-taking into active learning.

## Overview

StudySync is an innovative educational platform that helps students transform their lecture notes, PDFs, and study materials into interactive learning experiences. Using advanced AI, it generates flashcards, quizzes, and comprehensive study guides tailored to each student's learning style.

## Key Features

- **AI-Powered Content Processing**: Upload PDFs, images, videos, or audio recordings
- **Smart Flashcard Generation**: Automatically create flashcards from your study materials
- **Interactive Quiz System**: Adaptive quizzes with multiple question types
- **Knowledge Graph**: Visual connections between concepts across lectures
- **Exam Content Prediction**: AI predicts likely exam topics based on lecture patterns
- **Progress Tracking**: Comprehensive analytics dashboard
- **Collaborative Learning**: Share study materials with classmates

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library

### Backend
- **Node.js/Express** - API server
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database toolkit
- **Redis** - Caching and queues

### AI/ML
- **OpenAI GPT-4** - Content generation
- **LangChain** - AI orchestration
- **Vector Database** - Semantic search

### Infrastructure
- **Turborepo** - Monorepo management
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **AWS/Vercel** - Cloud deployment

## Project Structure

```
studysync/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express backend API
├── packages/
│   ├── database/     # Prisma schema and client
│   ├── auth/         # Authentication logic
│   ├── ui/           # Shared UI components
│   └── shared/       # Shared utilities
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Sakeeb91/studysync.git
cd studysync
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start Docker services:
```bash
docker-compose up -d
```

5. Set up the database:
```bash
npm run db:push
npm run db:generate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Building for Production

```bash
# Build all packages
npm run build

# Start production servers
npm start
```

## Deployment

The project includes GitHub Actions workflows for automatic deployment:

- **Pull Requests**: Deploy preview to Vercel
- **Main branch**: Deploy to production

## Roadmap

### Phase 1: MVP (Months 1-3)
- [x] Project setup and architecture
- [ ] User authentication
- [ ] Content upload system
- [ ] AI flashcard generation
- [ ] Basic quiz system
- [ ] Beta testing program

### Phase 2: Growth (Months 4-12)
- [ ] Payment processing
- [ ] Exam prediction engine
- [ ] Analytics dashboard
- [ ] Marketing campaigns
- [ ] University partnerships

### Phase 3: Scale (Year 2+)
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced AI features
- [ ] International expansion

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@studysync.ai or join our Discord server.

## Team

- **Sakeeb Rahman** - Founder & Lead Developer

---

Built for students everywhere