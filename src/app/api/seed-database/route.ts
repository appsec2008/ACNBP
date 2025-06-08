
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-db';

export async function POST() {
  try {
    const result = await seedDatabase();
    // Log the result for server-side debugging
    console.log("Seed database result:", JSON.stringify(result, null, 2));

    if (result.success) {
      // All agents processed successfully (either seeded or skipped, no errors)
      return NextResponse.json({
        message: result.message,
        seeded: result.seededCount,
        skipped: result.skippedCount,
        errorCount: result.errorCount, // Should be 0 if success is true
        errors: result.errors // Should be empty if success is true
      }, { status: 200 });
    } else if (result.errorCount > 0) {
      // Errors occurred during seeding
      if (result.seededCount > 0 || result.skippedCount > 0) {
        // Partial success: some agents were seeded/skipped, but there were also errors
        return NextResponse.json({
          message: `${result.message}. Some operations succeeded.`,
          seeded: result.seededCount,
          skipped: result.skippedCount,
          errorCount: result.errorCount,
          errors: result.errors
        }, { status: 207 }); // Multi-Status for partial success
      } else {
        // Complete failure: errors occurred, and no agents were successfully seeded or skipped
        return NextResponse.json({
          error: "Database seeding failed with errors.",
          details: result.message,
          seeded: result.seededCount, // Typically 0
          skipped: result.skippedCount, // Typically 0
          errorCount: result.errorCount,
          errors: result.errors
        }, { status: 500 });
      }
    } else {
      // No explicit success, but also no errors.
      // This could mean no agents were in the seed list, or all were skipped, and no errors.
      return NextResponse.json({
        message: result.message || "Seeding process completed. No new agents were added and no errors occurred.",
        seeded: result.seededCount,
        skipped: result.skippedCount,
        errorCount: result.errorCount, // Should be 0
        errors: result.errors // Should be empty
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error("API - Seed Database Error (outer catch):", error);
    const errorMessage = (error instanceof Error && error.message) ? error.message : "An unknown error occurred during the seeding process.";
    return NextResponse.json({ error: "Failed to execute database seeding.", details: errorMessage }, { status: 500 });
  }
}
