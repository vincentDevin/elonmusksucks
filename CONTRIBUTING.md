# Contributing to ElonMuskSucks.net

Thank you for your interest in contributing to elonmusksucks.net! This document provides guidelines and best practices for contributing to this prediction market platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Architecture Patterns](#architecture-patterns)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- **Be respectful** - Treat everyone with respect and kindness
- **Be constructive** - Provide constructive feedback and criticism
- **Be collaborative** - Work together to improve the project
- **Be inclusive** - Welcome contributors from all backgrounds

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js ≥24.0.0** (strict requirement)
- **npm ≥10.0.0**
- **PostgreSQL 16+**
- **Redis 7+**
- **Git**

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/elonmusksucks.git
   cd elonmusksucks
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original/elonmusksucks.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```
6. **Set up the database**:
   ```bash
   npm run prisma:migrate:dev
   npm run seed:dev
   ```
7. **Start all services**:
   ```bash
   npm run dev
   ```

### Verify Your Setup

1. Client app: http://localhost:3000
2. API server: http://localhost:5000/health
3. Public site: http://localhost:5173
4. Pong server: http://localhost:5001/health
5. Achievement server: http://localhost:5002/health

---

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your fork
git checkout master
git pull upstream master

# Create feature branch
git checkout -b feat/your-feature-name
```

### 2. Make Changes

- Write clean, well-documented code
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Type checking (all apps)
npm run tsc

# Linting
npm run lint

# Run tests
npm test

# Test specific app
npm -w apps/server test
npm -w apps/client test
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(client): add dark mode toggle"
```

### 5. Push to Your Fork

```bash
git push origin feat/your-feature-name
```

### 6. Open a Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Select your feature branch
- Fill out the PR template
- Submit for review

---

## Code Standards

### TypeScript

**Strict Mode Required:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**No `any` Types:**
```typescript
// ❌ BAD
function process(data: any) {
  return data.value;
}

// ✅ GOOD
interface Data {
  value: string;
}

function process(data: Data) {
  return data.value;
}
```

**Use Shared Types:**
```typescript
// ✅ GOOD - Import from @ems/types
import { PredictionView, UserProfile } from '@ems/types';

// ❌ BAD - Don't recreate types locally
interface MyPrediction { ... }
```

---

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `BettingModal.tsx`)
- Services: `camelCase.service.ts` (e.g., `auth.service.ts`)
- Utilities: `camelCase.ts` (e.g., `dateFormatter.ts`)

**Variables & Functions:**
```typescript
// Variables: camelCase
const userName = 'John';
const isAuthenticated = true;

// Functions: camelCase
function calculateOdds(bet: Bet): number { ... }

// Components: PascalCase
function BettingModal() { ... }

// Constants: UPPER_SNAKE_CASE
const MAX_BET_AMOUNT = 10000;
const API_TIMEOUT = 5000;
```

**Interfaces & Types:**
```typescript
// Interfaces: PascalCase with 'I' prefix (optional)
interface UserProfile { ... }
interface IBettingService { ... }

// Types: PascalCase
type BetStatus = 'PENDING' | 'WON' | 'LOST';
type UserRole = 'USER' | 'ADMIN';
```

---

### Code Formatting

**Prettier Configuration:**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

**Format before committing:**
```bash
npm run format
```

---

### ESLint

**Zero-Warning Policy:**
- All ESLint warnings must be fixed before merging
- Run `npm run lint` before committing

**Common Rules:**
- No `console.log` in production code (use proper logging)
- No unused variables
- No `any` types (use `unknown` if necessary)
- Prefer `const` over `let`

---

## Architecture Patterns

### 1. Layered Architecture (Server)

**Routes → Controllers → Services → Repositories → Prisma**

#### ❌ **DON'T:**

```typescript
// routes/predictions.routes.ts
router.post('/predictions', async (req, res) => {
  // ❌ DON'T use Prisma directly in routes
  const prediction = await prisma.prediction.create({ ... });
  res.json(prediction);
});
```

#### ✅ **DO:**

```typescript
// routes/predictions.routes.ts
router.post('/predictions', predictionController.create);

// controllers/predictions.controller.ts
export async function create(req: Request, res: Response) {
  const prediction = await predictionService.createPrediction(req.body);
  res.json({ success: true, prediction });
}

// services/predictions.service.ts
export async function createPrediction(data: any) {
  return await predictionRepository.create(data);
}

// repositories/PredictionRepository.ts
export async function create(data: any) {
  return await prisma.prediction.create({ data });
}
```

---

### 2. No Enums in Shared Types

**Use `as const` objects instead:**

#### ❌ **DON'T:**

```typescript
// packages/types/src/index.ts
export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST'
}
```

#### ✅ **DO:**

```typescript
// packages/types/src/index.ts
export const BET_STATUS = {
  PENDING: 'PENDING',
  WON: 'WON',
  LOST: 'LOST'
} as const;

export type BetStatus = typeof BET_STATUS[keyof typeof BET_STATUS];
```

---

### 3. Event-Driven Updates (Client)

**Use EventBusCore, not direct socket.on():**

#### ❌ **DON'T:**

```typescript
// ❌ Memory leaks, no cleanup
socket.on('bet:placed', (payload) => {
  updateBets(payload);
});
```

#### ✅ **DO:**

```typescript
const { subscribe } = useEventBusCore();

useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, (payload) => {
    startTransition(() => {
      updateBets(payload);
    });
  });
}, [subscribe]);
```

---

### 4. No Schema Libraries

**Do NOT use zod, yup, valibot, or any schema validation libraries:**

#### ❌ **DON'T:**

```typescript
import { z } from 'zod';

const betSchema = z.object({
  amount: z.number().min(10),
  predictionId: z.number()
});
```

#### ✅ **DO:**

```typescript
interface BetData {
  amount: number;
  predictionId: number;
}

function validateBet(data: BetData): string | null {
  if (data.amount < 10) return 'Minimum bet is 10';
  if (!data.predictionId) return 'Prediction ID required';
  return null;
}
```

---

## Git Workflow

### Branching Strategy

**Branch Naming:**
- Features: `feat/feature-name`
- Bug fixes: `fix/bug-description`
- Documentation: `docs/what-you-updated`
- Refactoring: `refactor/what-you-refactored`
- Tests: `test/what-you-tested`

**Examples:**
```bash
feat/add-parlay-system
fix/leaderboard-calculation-error
docs/update-api-documentation
refactor/betting-service-cleanup
test/add-prediction-controller-tests
```

---

### Commit Message Format

**Use Conventional Commits:**

```
<type>(<scope>): <short description>

<longer description (optional)>

<footer (optional)>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Scopes:**
- `client`: Client app
- `server`: API server
- `pong`: Pong server
- `achievement`: Achievement server
- `public`: Public site
- `types`: Shared types
- `db`: Database/Prisma

**Examples:**
```bash
feat(client): add dark mode toggle to settings page

fix(server): resolve race condition in bet placement

docs(readme): update deployment instructions

refactor(pong): extract physics calculations into separate module

test(server): add integration tests for prediction service
```

---

### Keeping Your Fork Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream changes into your master
git checkout master
git merge upstream/master

# Update your feature branch
git checkout feat/your-feature
git rebase master
```

---

## Pull Request Process

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines (`npm run lint` passes)
- [ ] All tests pass (`npm test` passes)
- [ ] Type checking passes (`npm run tsc` passes)
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits
- [ ] PR title follows conventional commits format
- [ ] PR description explains what/why/how

### PR Template

```markdown
## Description
Brief description of the changes

## Motivation
Why are these changes needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How did you test these changes?

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Tested locally
```

---

### PR Review Process

1. **Automated Checks** - CI/CD runs tests, linting, type checking
2. **Code Review** - Maintainers review your code
3. **Requested Changes** - Address feedback from reviewers
4. **Approval** - PR approved by maintainer(s)
5. **Merge** - PR merged into master

**Expected Review Time:** 1-3 days (we'll try to be faster!)

---

## Testing Requirements

### Unit Tests

**Required for:**
- Services (business logic)
- Utilities
- Complex components

**Example:**
```typescript
// services/__tests__/betting.service.test.ts
import { describe, it, expect } from 'vitest';
import * as bettingService from '../betting.service';

describe('betting.service', () => {
  describe('placeBet', () => {
    it('should place bet when user has sufficient balance', async () => {
      const result = await bettingService.placeBet(userId, predictionId, optionId, 100);
      expect(result.success).toBe(true);
      expect(result.bet).toBeDefined();
    });

    it('should reject bet when user has insufficient balance', async () => {
      await expect(
        bettingService.placeBet(userId, predictionId, optionId, 999999)
      ).rejects.toThrow('Insufficient balance');
    });
  });
});
```

---

### Integration Tests

**Required for:**
- API endpoints
- Database operations
- Multi-service workflows

**Example:**
```typescript
// tests/integration/predictions.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/predictions/:id/bet', () => {
  it('should place bet and deduct balance', async () => {
    const response = await request(app)
      .post('/api/predictions/1/bet')
      .set('Authorization', `Bearer ${token}`)
      .send({ optionId: 1, amount: 100 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify balance was deducted
    const user = await getUserById(userId);
    expect(user.balance).toBe(initialBalance - 100);
  });
});
```

---

## Documentation

### Code Comments

**When to comment:**
- Complex logic
- Non-obvious design decisions
- Workarounds or hacks
- TODOs

**Example:**
```typescript
// Calculate dynamic odds using 6-factor formula:
// 1. Total bet volume
// 2. Option-specific volume
// 3. Number of bettors
// 4. Market maturity
// 5. Category multiplier
// 6. House edge (3%)
function calculateOdds(prediction: Prediction): number[] {
  // ...
}
```

---

### API Documentation

**Document new endpoints:**

```typescript
/**
 * Place a bet on a prediction option
 *
 * @route POST /api/predictions/:id/bet
 * @access Protected
 *
 * @param {number} predictionId - Prediction ID (URL param)
 * @param {number} optionId - Option ID (body)
 * @param {number} amount - Bet amount (body, min 10)
 *
 * @returns {Bet} Created bet object
 *
 * @throws {400} Invalid bet data
 * @throws {401} Unauthorized
 * @throws {403} Insufficient balance
 * @throws {404} Prediction not found
 */
export async function placeBet(req: Request, res: Response) { ... }
```

---

### README Updates

**Update relevant READMEs when:**
- Adding new features
- Changing architecture
- Modifying setup process
- Adding new dependencies

---

## Community

### Getting Help

- **GitHub Issues** - Report bugs or request features
- **GitHub Discussions** - Ask questions or discuss ideas
- **Discord** (if available) - Real-time chat with community

### Reporting Bugs

**Use GitHub Issues with this template:**

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS 14.0]
- Node version: [e.g., 24.0.0]
- Browser: [e.g., Chrome 120]

**Screenshots**
If applicable

**Additional Context**
Any other relevant information
```

---

### Feature Requests

**Use GitHub Issues with this template:**

```markdown
**Feature Description**
Clear description of the feature

**Problem it Solves**
What problem does this solve?

**Proposed Solution**
How would this work?

**Alternatives Considered**
What other approaches did you consider?

**Additional Context**
Any other relevant information
```

---

## Code Quality Gates

Before merging, run these checks:

```bash
# 1. No enums in shared areas
rg -n -P "export\\s+enum|const\\s+enum" packages/types apps/server/src/handlers apps/server/src/services

# 2. No schema libraries
rg -n -P "from\\s+['\"](zod|yup|valibot|ajv)['\"]" apps --hidden -g '!**/node_modules/**'

# 3. No Prisma outside repositories
rg -n "prisma\\." apps/server/src/{routes,controllers,services} --hidden -g '!**/node_modules/**'

# 4. No direct sockets/redis in routes/controllers
rg -n -P "(io\\.(emit|to)|socket\\.(emit|on)|publish\\()" apps/server/src/{routes,controllers} --hidden -g '!**/node_modules/**'

# 5. Type checking (all apps)
npm run tsc

# 6. Linting
npm run lint
```

**All checks must pass before PR approval.**

---

## License

By contributing to elonmusksucks.net, you agree that your contributions will be licensed under the same license as the project.

---

## Questions?

If you have questions not covered here, please:
1. Check existing documentation in `docs/`
2. Search GitHub Issues
3. Open a new GitHub Discussion
4. Ask in Discord (if available)

Thank you for contributing! 🎉
