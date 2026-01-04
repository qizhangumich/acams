import { neon } from '@neondatabase/serverless';

/**
 * Neon PostgreSQL Client
 * 
 * Provides a centralized interface for database operations.
 * Handles initialization and error handling.
 * 
 * Environment variable required:
 * - DATABASE_URL: Neon PostgreSQL connection string
 *   Format: postgresql://user:password@host/database
 */

let dbClient: ReturnType<typeof neon> | null = null;

/**
 * Initialize database client
 * Returns null if environment variable is not set (for local development)
 */
function getDbClient(): ReturnType<typeof neon> | null {
  if (dbClient !== null) {
    return dbClient;
  }

  // Check if environment variable is set
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      console.error('DATABASE_URL environment variable is required in production');
      throw new Error('DATABASE_URL must be set');
    }
    // In development, return null to allow graceful degradation
    console.warn('DATABASE_URL environment variable not set. Database operations will fail.');
    return null;
  }

  // Initialize Neon client
  dbClient = neon(process.env.DATABASE_URL);
  return dbClient;
}

/**
 * Check if database is available
 */
export function isDbAvailable(): boolean {
  return getDbClient() !== null;
}

/**
 * Execute a SQL query
 */
export async function dbQuery<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = getDbClient();
  if (!client) {
    throw new Error('Database client is not available. Please set DATABASE_URL environment variable.');
  }

  try {
    const result = await client(sql, params);
    return result as T[];
  } catch (error) {
    console.error(`Database query error:`, error);
    console.error(`SQL: ${sql}`);
    throw error;
  }
}

/**
 * Execute a SQL query and return first row
 */
export async function dbQueryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const results = await dbQuery<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Initialize database tables
 * Call this once to create all required tables
 */
export async function initDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const db = neon(process.env.DATABASE_URL);

  try {
    // Create payment_contexts table
    await db`
      CREATE TABLE IF NOT EXISTS payment_contexts (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid')),
        created_at TIMESTAMP NOT NULL,
        paid_at TIMESTAMP
      )
    `;

    // Create subscriptions table
    await db`
      CREATE TABLE IF NOT EXISTS subscriptions (
        email VARCHAR(255) PRIMARY KEY,
        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
        paid_at TIMESTAMP
      )
    `;

    // Create user_progress table
    await db`
      CREATE TABLE IF NOT EXISTS user_progress (
        email VARCHAR(255) PRIMARY KEY,
        progress JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_active_at TIMESTAMP NOT NULL
      )
    `;

    // Create indexes
    await db`
      CREATE INDEX IF NOT EXISTS idx_payment_contexts_email ON payment_contexts(email)
    `;
    await db`
      CREATE INDEX IF NOT EXISTS idx_payment_contexts_status ON payment_contexts(status)
    `;
    await db`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_is_paid ON subscriptions(is_paid)
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

