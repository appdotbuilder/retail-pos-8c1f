
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Helper function to create a test user
const createTestUser = async (userData: Partial<CreateUserInput> = {}) => {
  const defaultUser: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User',
    role: 'cashier',
    ...userData
  };

  // Simple password hash for testing (not production secure)
  const password_hash = `hashed_${defaultUser.password}`;

  const result = await db.insert(usersTable)
    .values({
      username: defaultUser.username,
      email: defaultUser.email,
      password_hash,
      full_name: defaultUser.full_name,
      role: defaultUser.role,
      is_active: true
    })
    .returning()
    .execute();

  return result[0];
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active users', async () => {
    // Create multiple active users
    await createTestUser({
      username: 'user1',
      email: 'user1@example.com',
      full_name: 'User One',
      role: 'admin'
    });

    await createTestUser({
      username: 'user2', 
      email: 'user2@example.com',
      full_name: 'User Two',
      role: 'cashier'
    });

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].username).toBeDefined();
    expect(result[0].email).toBeDefined();
    expect(result[0].full_name).toBeDefined();
    expect(result[0].role).toBeDefined();
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should exclude inactive users', async () => {
    // Create active user
    await createTestUser({
      username: 'activeuser',
      email: 'active@example.com'
    });

    // Create inactive user
    const password_hash = 'hashed_password123';
    await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password_hash,
        full_name: 'Inactive User',
        role: 'cashier',
        is_active: false
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('activeuser');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no active users exist', async () => {
    const result = await getUsers();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should include password_hash field for type compatibility', async () => {
    await createTestUser();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].password_hash).toBeDefined();
    expect(typeof result[0].password_hash).toBe('string');
  });

  it('should return users with all required fields', async () => {
    await createTestUser({
      username: 'completeuser',
      email: 'complete@example.com',
      full_name: 'Complete User',
      role: 'stock_manager'
    });

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    expect(user.id).toBeTypeOf('number');
    expect(user.username).toEqual('completeuser');
    expect(user.email).toEqual('complete@example.com');
    expect(user.full_name).toEqual('Complete User');
    expect(user.role).toEqual('stock_manager');
    expect(user.is_active).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});
