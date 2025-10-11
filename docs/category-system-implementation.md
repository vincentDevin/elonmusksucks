# Category System Implementation Plan

**Date:** 2025-01-11
**Status:** Ready for Implementation
**Priority:** High

---

## Overview

Implement a database-driven category system for predictions to replace the current manual category ID input with a user-friendly dropdown selector. Categories will be seeded from the existing modal templates and managed through the backend API.

---

## Current State Analysis

### 1. Database Layer ✅

**Category Model** (`prisma/schema.prisma` lines 207-221):
```prisma
model Category {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  slug        String       @unique
  description String?
  icon        String?      // Icon name or emoji
  color       String?      // Hex color for UI
  sortOrder   Int          @default(0)
  isActive    Boolean      @default(true)
  predictions Prediction[]
  createdAt   DateTime     @default(now())
}
```

**Current Database State:**
- Only 1 category exists: `TEST` (id=1, icon='🧪', color='#3b82f6')
- `Prediction.categoryId` is properly configured (optional for migration, will be required)

### 2. Frontend Components

**CreatePredictionModal** (`apps/client/src/components/prediction/CreatePredictionModal.tsx`):
- Contains 8 well-defined category templates:
  - Custom ✨
  - Sports ⚽
  - Politics 🗳️
  - Technology 📱
  - Entertainment 🎬
  - Finance 📈
  - Weather 🌤️
  - Social 📱

**CreatePredictionForm** (`apps/client/src/components/prediction/CreatePredictionForm.tsx`):
- **Problem:** Uses primitive number input (lines 184-194)
- User must manually enter category ID
- No dropdown, no category names displayed
- No API call to fetch categories

### 3. Backend API

**Missing Functionality:**
- ❌ No `GET /api/categories` or `GET /api/predictions/categories` endpoint
- ❌ No category repository
- ❌ No category service layer
- ✅ Category analytics endpoint exists (`GET /api/predictions/analytics/categories`) but serves a different purpose

**TODO Comment Found:**
```typescript
// TODO: Reconcile with CreatePredictionRequest in @ems/types
// (uses categoryId: number instead of category: string)
```

---

## Implementation Plan

### Phase 1: Seed Categories in Database

**Create:** `prisma/seeds/categories.seed.ts`

**Categories to Seed:**

| ID | Name | Slug | Icon | Color | Sort Order | Description |
|----|------|------|------|-------|------------|-------------|
| 1 | Custom | custom | ✨ | #8b5cf6 | 0 | General and custom predictions |
| 2 | Sports | sports | ⚽ | #22c55e | 1 | Sporting events and competitions |
| 3 | Politics | politics | 🗳️ | #3b82f6 | 2 | Political outcomes and elections |
| 4 | Technology | technology | 📱 | #06b6d4 | 3 | Tech announcements and innovations |
| 5 | Entertainment | entertainment | 🎬 | #f59e0b | 4 | Movies, TV, music, and pop culture |
| 6 | Finance | finance | 📈 | #10b981 | 5 | Stock markets and economic events |
| 7 | Weather | weather | 🌤️ | #f97316 | 6 | Weather patterns and climate events |
| 8 | Social Media | social-media | 📱 | #ec4899 | 7 | Social trends and viral content |

**Seed Script Structure:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Custom',
    slug: 'custom',
    icon: '✨',
    color: '#8b5cf6',
    sortOrder: 0,
    description: 'General and custom predictions',
    isActive: true,
  },
  // ... 7 more categories
];

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }
}
```

**Add Script to package.json:**
```json
{
  "scripts": {
    "seed:categories": "tsx prisma/seeds/categories.seed.ts"
  }
}
```

---

### Phase 2: Backend - Category Repository Layer

**Create:** `apps/server/src/repositories/category.repository.ts`

**Functions:**
```typescript
export async function getAllActiveCategories(prisma: PrismaClient) {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      description: true,
      sortOrder: true,
    },
  });
}

export async function getCategoryById(prisma: PrismaClient, id: number) {
  return await prisma.category.findUnique({
    where: { id },
  });
}

export async function getCategoryBySlug(prisma: PrismaClient, slug: string) {
  return await prisma.category.findUnique({
    where: { slug },
  });
}
```

---

### Phase 3: Backend - Category Service Layer

**Create:** `apps/server/src/services/category.service.ts`

**Functions:**
```typescript
import * as categoryRepository from '../repositories/category.repository';
import prisma from '../config/prisma';

export async function getActiveCategories() {
  return await categoryRepository.getAllActiveCategories(prisma);
}

export async function getCategoryById(id: number) {
  const category = await categoryRepository.getCategoryById(prisma, id);
  if (!category) {
    throw new Error(`Category with id ${id} not found`);
  }
  return category;
}

export async function validateCategoryExists(categoryId: number): Promise<boolean> {
  const category = await categoryRepository.getCategoryById(prisma, categoryId);
  return category !== null && category.isActive;
}
```

---

### Phase 4: Backend - Categories Controller & Routes

**Update:** `apps/server/src/controllers/predictions.controller.ts`

**Add:**
```typescript
import * as categoryService from '../services/category.service';

/**
 * GET /api/predictions/categories
 * Get all active categories for prediction creation
 */
export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await categoryService.getActiveCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};
```

**Update:** `apps/server/src/routes/predictions.routes.ts`

**Add Route:**
```typescript
// GET /api/predictions/categories - Get all active categories
router.get('/categories', getCategories);
```

**Route Placement:** Add above the analytics routes (before line 141)

---

### Phase 5: Frontend - Categories API Client

**Update:** `apps/client/src/api/predictions.ts`

**Add Type:**
```typescript
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  sortOrder: number;
}
```

**Add Function:**
```typescript
/**
 * Get all active categories for prediction creation
 */
export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/api/predictions/categories');
  return response.data.categories;
}
```

---

### Phase 6: Frontend - Update CreatePredictionForm

**Update:** `apps/client/src/components/prediction/CreatePredictionForm.tsx`

**Changes:**

1. **Add State & Fetch Categories:**
```typescript
const [categories, setCategories] = useState<Category[]>([]);
const [categoriesLoading, setCategoriesLoading] = useState(true);

useEffect(() => {
  async function loadCategories() {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }
  loadCategories();
}, []);
```

2. **Add defaultCategoryId Prop:**
```typescript
interface CreatePredictionFormProps {
  onCreated: (input: CreatePredictionPayload) => Promise<void> | void;
  onCancel: () => void;
  sourceData?: {...} | null;
  disabled?: boolean;
  defaultCategoryId?: number; // NEW
}
```

3. **Initialize with defaultCategoryId:**
```typescript
useEffect(() => {
  if (defaultCategoryId && categoryId === '') {
    setCategoryId(defaultCategoryId);
  }
}, [defaultCategoryId, categoryId]);
```

4. **Replace Number Input with Dropdown (lines 183-195):**
```typescript
<div>
  <label htmlFor="categoryId" className="block mb-1 text-sm">
    Category
  </label>
  <select
    id="categoryId"
    value={categoryId}
    onChange={(e) => setCategoryId(Number(e.target.value))}
    className={inputBase}
    disabled={categoriesLoading}
  >
    <option value="">
      {categoriesLoading ? 'Loading categories...' : 'Select a category'}
    </option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.id}>
        {cat.icon} {cat.name}
      </option>
    ))}
  </select>
  {!categoriesLoading && categories.length === 0 && (
    <p className="text-xs text-error mt-1">
      No categories available. Please contact an administrator.
    </p>
  )}
</div>
```

---

### Phase 7: Frontend - Connect Templates to Categories

**Update:** `apps/client/src/components/prediction/CreatePredictionModal.tsx`

**Changes:**

1. **Add State to Store Category Mapping:**
```typescript
const [categoryMap, setCategoryMap] = useState<Record<string, number>>({});

useEffect(() => {
  async function loadCategories() {
    try {
      const categories = await getCategories();
      // Map template category names to category IDs
      const map: Record<string, number> = {};
      categories.forEach(cat => {
        map[cat.name.toLowerCase()] = cat.id;
      });
      setCategoryMap(map);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }
  loadCategories();
}, []);
```

2. **Update Template Selection Handler:**
```typescript
const handleTemplateSelect = (template: (typeof templates)[0]) => {
  setSelectedTemplate(template.id);
  setSelectedCategoryId(categoryMap[template.category.toLowerCase()] || undefined);
  setTimeout(() => {
    template.action();
  }, 200);
};
```

3. **Add selectedCategoryId State:**
```typescript
const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
```

4. **Pass defaultCategoryId to Form:**
```typescript
<CreatePredictionForm
  onCreated={handleCreatePrediction}
  onCancel={handleClose}
  sourceData={createModalSourceData}
  disabled={creating}
  defaultCategoryId={selectedCategoryId}  // NEW
/>
```

---

## Files Summary

### Files to Create:
1. ✨ `prisma/seeds/categories.seed.ts` - Category seed script
2. ✨ `apps/server/src/repositories/category.repository.ts` - Data access layer
3. ✨ `apps/server/src/services/category.service.ts` - Business logic layer

### Files to Modify:
1. `apps/server/src/controllers/predictions.controller.ts` - Add getCategories controller
2. `apps/server/src/routes/predictions.routes.ts` - Add GET /categories route
3. `apps/client/src/api/predictions.ts` - Add getCategories API call + Category type
4. `apps/client/src/components/prediction/CreatePredictionForm.tsx` - Replace input with dropdown
5. `apps/client/src/components/prediction/CreatePredictionModal.tsx` - Connect templates to categories
6. `package.json` (root) - Add `seed:categories` script

---

## Testing Plan

### Database Testing:
- [ ] Run `npm run seed:categories`
- [ ] Verify 8 categories exist: `SELECT * FROM "Category" ORDER BY "sortOrder";`
- [ ] Verify all categories have `isActive = true`
- [ ] Verify icons, colors, and sort orders are correct

### Backend API Testing:
- [ ] `GET /api/predictions/categories` returns 200
- [ ] Response contains all 8 categories sorted by sortOrder
- [ ] Each category has: id, name, slug, icon, color, description, sortOrder
- [ ] Categories are properly ordered

### Frontend Testing:
- [ ] Categories load successfully in CreatePredictionForm
- [ ] Dropdown shows all 8 categories with icons
- [ ] Selecting a template pre-selects the correct category
- [ ] Category is required (form can't submit without selection)
- [ ] Creating a prediction saves the correct categoryId
- [ ] Prediction displays category name (not just ID) in UI

### Integration Testing:
- [ ] Create prediction via modal → Category saves correctly
- [ ] Create prediction via form → Category saves correctly
- [ ] Use "Use as Source" from Timeline → Category can be selected
- [ ] View created prediction → Category name displays correctly
- [ ] Filter predictions by category → Works correctly

---

## Migration Considerations

### Existing Predictions Without Categories:
Currently, `Prediction.categoryId` is **optional** to support migration.

**Options:**
1. **Leave as optional** - Allow existing predictions without categories
2. **Default to "Custom"** - Run migration to set all NULL categoryId to 1 (Custom)
3. **Make required after migration** - Once all existing predictions have categories

**Recommended Approach:**
- Leave as optional for now
- Add UI indicator for predictions without categories
- Admins can manually categorize existing predictions via admin panel

### Future Considerations:
- Admin UI for managing categories (create, edit, disable)
- Category-based prediction filtering on frontend
- Category analytics and trends
- Featured categories on homepage
- Category-specific leaderboards

---

## Rollback Plan

If issues arise:
1. Revert frontend changes (dropdown → number input)
2. Revert backend route/controller changes
3. Keep seeded categories in database (no harm)
4. Remove new repository/service files

No database migrations are required, so rollback is safe.

---

## Success Metrics

- ✅ 8 categories seeded successfully
- ✅ API endpoint returns categories
- ✅ Dropdown displays correctly
- ✅ Template selection pre-fills category
- ✅ Predictions created with categories
- ✅ No console errors or warnings
- ✅ User experience improved (no manual ID entry)

---

## Timeline

**Estimated Time:** 2-3 hours

- Phase 1 (Seed): 20 minutes
- Phase 2-4 (Backend): 45 minutes
- Phase 5-7 (Frontend): 60 minutes
- Testing: 30 minutes

---

## Notes

- All changes follow the existing architecture patterns (repository → service → controller)
- No schema changes required (Category model already exists)
- Backward compatible (categoryId remains optional)
- No breaking changes to existing API contracts
- Follows CLAUDE.md guidelines for code quality and architecture
