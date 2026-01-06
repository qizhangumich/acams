# Database Migration Strategy

## Overview

This document outlines the migration strategy for the ACAMS Learning System database.

## Migration Approach

### 1. Prisma Migrate

We use **Prisma Migrate** for all schema changes:
- Version controlled in `prisma/migrations/`
- Reproducible across environments
- Rollback capability
- Team collaboration

### 2. Migration Workflow

#### Initial Setup
```bash
# 1. Create initial migration
npx prisma migrate dev --name init

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply to production
npx prisma migrate deploy
```

#### Development Workflow
```bash
# 1. Modify schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Prisma automatically:
#    - Creates migration SQL
#    - Applies to dev database
#    - Regenerates Prisma Client
```

#### Production Deployment
```bash
# 1. Review migrations
npx prisma migrate status

# 2. Apply migrations (no prompt)
npx prisma migrate deploy
```

### 3. Migration Naming Convention

Format: `YYYYMMDD_HHMMSS_descriptive_name`

Examples:
- `20240101_120000_init`
- `20240102_140000_add_magic_link_tokens`
- `20240103_100000_add_indexes`

### 4. Seed Strategy

#### Questions Seed
- Separate script: `prisma/seed.ts`
- Loads from `questions.json`
- Idempotent (can run multiple times)
- Uses `upsert` to avoid duplicates

#### Running Seeds
```bash
# Development
npm run db:seed

# Production (manual)
tsx prisma/seed.ts
```

### 5. Migration Best Practices

#### DO:
- ✅ Test migrations on dev/staging first
- ✅ Review generated SQL before applying
- ✅ Use transactions for data migrations
- ✅ Backup database before production migrations
- ✅ Document breaking changes

#### DON'T:
- ❌ Modify migration files after creation
- ❌ Delete migration files
- ❌ Skip migrations in production
- ❌ Mix schema and data changes in one migration

### 6. Rollback Strategy

#### Development
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>
```

#### Production
- **No automatic rollback** (data loss risk)
- Create new migration to fix issues
- Manual rollback only in emergencies

### 7. Environment-Specific Migrations

#### Development
- Auto-apply on `prisma migrate dev`
- Can reset database freely

#### Staging
- Apply with `prisma migrate deploy`
- Test before production

#### Production
- Apply with `prisma migrate deploy`
- Review migrations first
- Backup before applying
- Monitor during migration

### 8. Data Migration Examples

#### Example 1: Add New Field
```prisma
// schema.prisma
model User {
  // ... existing fields
  new_field String?
}
```

```bash
npx prisma migrate dev --name add_new_field
```

#### Example 2: Add Index
```prisma
model User {
  // ... existing fields
  
  @@index([new_field])
}
```

```bash
npx prisma migrate dev --name add_user_index
```

### 9. Questions Data Migration

#### Initial Load
1. Questions are loaded from `questions.json`
2. Seed script processes JSON file
3. Upserts into Question table
4. Can be re-run safely

#### Updating Questions
1. Update `questions.json`
2. Re-run seed script
3. Existing questions updated, new ones added

### 10. Migration Checklist

Before creating migration:
- [ ] Review schema changes
- [ ] Test locally
- [ ] Check for breaking changes
- [ ] Update seed script if needed

Before applying to production:
- [ ] Review migration SQL
- [ ] Backup database
- [ ] Test on staging
- [ ] Schedule maintenance window if needed
- [ ] Monitor during migration

---

## Migration Commands Reference

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Seed database
npm run db:seed
```

---

**End of Migration Strategy Document**

