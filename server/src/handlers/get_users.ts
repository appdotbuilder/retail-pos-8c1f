
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Fetch all active users from database
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();

    // Return users as-is since all fields match the schema
    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};
