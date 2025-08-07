
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'cashier'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testInput);

    // Verify user was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('cashier');
    expect(users[0].is_active).toBe(true);
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should verify password can be validated', async () => {
    const result = await createUser(testInput);

    // Verify the hashed password can be validated
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should create users with different roles', async () => {
    const adminInput = { ...testInput, username: 'admin', email: 'admin@example.com', role: 'admin' as const };
    const stockManagerInput = { ...testInput, username: 'stock', email: 'stock@example.com', role: 'stock_manager' as const };

    const admin = await createUser(adminInput);
    const stockManager = await createUser(stockManagerInput);

    expect(admin.role).toEqual('admin');
    expect(stockManager.role).toEqual('stock_manager');
  });

  it('should throw error for duplicate username', async () => {
    await createUser(testInput);

    const duplicateUsernameInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/duplicate key value violates unique constraint|username/i);
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testInput);

    const duplicateEmailInput = {
      ...testInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/duplicate key value violates unique constraint|email/i);
  });
});
