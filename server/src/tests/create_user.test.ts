
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
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toBeTruthy();
    expect(typeof result.password_hash).toBe('string');
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
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
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should verify password is properly hashed', async () => {
    const result = await createUser(testInput);

    // Verify the hashed password can be verified against original
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate username', async () => {
    await createUser(testInput);

    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com' // Different email but same username
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should reject duplicate email', async () => {
    await createUser(testInput);

    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser', // Different username but same email
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should create users with different roles', async () => {
    const adminInput: CreateUserInput = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpass',
      full_name: 'Admin User',
      role: 'admin'
    };

    const stockInput: CreateUserInput = {
      username: 'stockmanager',
      email: 'stock@example.com',
      password: 'stockpass',
      full_name: 'Stock Manager',
      role: 'stock_manager'
    };

    const adminResult = await createUser(adminInput);
    const stockResult = await createUser(stockInput);

    expect(adminResult.role).toEqual('admin');
    expect(stockResult.role).toEqual('stock_manager');
  });
});
