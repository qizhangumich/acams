import { kv } from '@vercel/kv';

/**
 * Vercel KV Client
 * 
 * Provides a centralized interface for KV operations.
 * Handles initialization and error handling.
 * 
 * Environment variables required:
 * - KV_REST_API_URL: Vercel KV REST API URL
 * - KV_REST_API_TOKEN: Vercel KV REST API Token
 */

let kvClient: typeof kv | null = null;

/**
 * Initialize KV client
 * Returns null if environment variables are not set (for local development)
 */
function getKvClient(): typeof kv | null {
  if (kvClient !== null) {
    return kvClient;
  }

  // Check if environment variables are set
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      console.error('KV environment variables are required in production');
      throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set');
    }
    // In development, return null to allow graceful degradation
    console.warn('KV environment variables not set. KV operations will fail.');
    return null;
  }

  // KV client is automatically initialized by @vercel/kv using environment variables
  kvClient = kv;
  return kvClient;
}

/**
 * Check if KV is available
 */
export function isKvAvailable(): boolean {
  return getKvClient() !== null;
}

/**
 * Get a value from KV
 */
export async function kvGet<T>(key: string): Promise<T | null> {
  const client = getKvClient();
  if (!client) {
    throw new Error('KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    console.error(`KV GET error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Set a value in KV
 */
export async function kvSet<T>(key: string, value: T): Promise<void> {
  const client = getKvClient();
  if (!client) {
    throw new Error('KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  try {
    await client.set(key, value);
  } catch (error) {
    console.error(`KV SET error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a value from KV
 */
export async function kvDel(key: string): Promise<void> {
  const client = getKvClient();
  if (!client) {
    throw new Error('KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  try {
    await client.del(key);
  } catch (error) {
    console.error(`KV DEL error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Check if a key exists in KV
 */
export async function kvExists(key: string): Promise<boolean> {
  const client = getKvClient();
  if (!client) {
    throw new Error('KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`KV EXISTS error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get all keys matching a pattern
 */
export async function kvKeys(pattern: string): Promise<string[]> {
  const client = getKvClient();
  if (!client) {
    throw new Error('KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  try {
    const keys = await client.keys(pattern);
    return keys as string[];
  } catch (error) {
    console.error(`KV KEYS error for pattern ${pattern}:`, error);
    throw error;
  }
}

