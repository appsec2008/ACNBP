
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
      console.log(`Attempting to open/create SQLite database at: ${dbPath}`);
      dbInstance = await open({
        filename: dbPath,
        driver: verboseSqlite3.Database
      });

      // Create table if it doesn't exist
      // Note: If you modify this schema after the DB file is created,
      // you may need to delete agent_registry.db for changes to apply in dev.
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
          timestamp TEXT NOT NULL, -- ISO string for registration/last renewal
          isRevoked BOOLEAN DEFAULT 0, -- 0 for false, 1 for true
          revocationTimestamp TEXT -- ISO string for when it was revoked
        );
      `);
      // Check if columns exist before trying to add them, to avoid errors if they are already there.
      const columns = await dbInstance.all("PRAGMA table_info(agents);");
      const columnNames = columns.map(col => col.name);

      if (!columnNames.includes('isRevoked')) {
        await dbInstance.exec('ALTER TABLE agents ADD COLUMN isRevoked BOOLEAN DEFAULT 0;');
        console.log("Added 'isRevoked' column to agents table.");
      }
      if (!columnNames.includes('revocationTimestamp')) {
        await dbInstance.exec('ALTER TABLE agents ADD COLUMN revocationTimestamp TEXT;');
        console.log("Added 'revocationTimestamp' column to agents table.");
      }
      
      console.log(`SQLite database initialized and schema verified at ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }
  return dbInstance;
}
