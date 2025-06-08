
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-db';

export async function POST() {
  // In a real app, you'd add authentication/authorization here
  // to protect this endpoint.
  try {
    const result = await seedDatabase();
    if (result.success || (result.seededCount > 0 || result.skippedCount > 0 && result.errorCount === 0) ) {
      return NextResponse.json({ message: result.message, seeded: result.seededCount, skipped: result.skippedCount }, { status: 200 });
    } else if (result.errorCount > 0 && (result.seededCount > 0 || result.skippedCount > 0)) {
       // Partial success with errors
      return NextResponse.json({ message: result.message, seeded: result.seededCount, skipped: result.skippedCount, errors: result.errors }, { status: 207 }); // Multi-Status
    }
     else {
      return NextResponse.json({ error: "Failed to seed database or no new agents to seed.", details: result.message, errors: result.errors }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API - Seed Database Error:", error);
    return NextResponse.json({ error: "Failed to execute database seeding.", details: error.message }, { status: 500 });
  }
}

    