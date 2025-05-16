
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

// Determine the database path.
// In development, it's in the project root.
// In production (like Vercel), it needs a writable path, often /tmp.
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/agent_registry.db'
  : path.join(process.cwd(), 'agent_registry.db');

// Ensure the sqlite3 verbose mode is only active in development
const verboseSqlite3 = process.env.NODE_ENV !== 'production' ? sqlite3.verbose() : sqlite3;

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    try {
      dbInstance = await open({
        filename: dbPath,
        driver: verboseSqlite3.Database
      });

      // Create table if it doesn't exist
      await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          protocol TEXT NOT NULL,
          agentID TEXT NOT NULL,
          agentCapability TEXT NOT NULL,
          provider TEXT NOT NULL,
          version TEXT NOT NULL,
          extension TEXT,
          ansName TEXT NOT NULL UNIQUE,
          agentCertificate TEXT NOT NULL, -- Store as JSON string
          protocolExtensions TEXT NOT NULL, -- Store as JSON string
          timestamp TEXT NOT NULL -- ISO string
        );
      `);
      console.log(`SQLite database initialized at ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      // If DB initialization fails, we might want to throw or handle it
      // depending on how critical DB access is at startup.
      // For now, let's re-throw so the caller knows.
      throw error;
    }
  }
  return dbInstance;
}
