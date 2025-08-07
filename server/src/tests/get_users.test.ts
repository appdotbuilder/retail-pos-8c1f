
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';
import { type CreateUserInput } from '../schema';

const testUsers: CreateUserInput[] = [
  {
    username: 'admin_user',
    email: 'admin@example.com',
    password: 'password123',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    username: 'cashier_user',
    email: 'cashier@example.com',
    password: 'password123',
    full_name: 'Cashier User',
    role: 'cashier'
  },
  {
    username: 'stock_manager',
    email: 'stock@example.com',
    password: 'password123',
    full_name: 'Stock Manager',
    role: 'stock_manager'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active users', async () => {
    // Create test users with simple password hash
    const hashedPassword = 'hashed_password_123';
    
    await db.insert(usersTable)
      .values(testUsers.map(user => ({
        username: user.username,
        email: user.email,
        password_hash: hashedPassword,
        full_name: user.full_name,
        role: user.role,
        is_active: true
      })))
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      username: 'admin_user',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true
    });
    
    // Verify all users have required fields
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password_hash).toBeDefined();
      expect(user.full_name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should exclude inactive users', async () => {
    const hashedPassword = 'hashed_password_123';
    
    // Create one active and one inactive user
    await db.insert(usersTable)
      .values([
        {
          username: 'active_user',
          email: 'active@example.com',
          password_hash: hashedPassword,
          full_name: 'Active User',
          role: 'cashier',
          is_active: true
        },
        {
          username: 'inactive_user',
          email: 'inactive@example.com',
          password_hash: hashedPassword,
          full_name: 'Inactive User',
          role: 'cashier',
          is_active: false
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('active_user');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no active users exist', async () => {
    const result = await getUsers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return users with all role types', async () => {
    const hashedPassword = 'hashed_password_123';
    
    await db.insert(usersTable)
      .values(testUsers.map(user => ({
        username: user.username,
        email: user.email,
        password_hash: hashedPassword,
        full_name: user.full_name,
        role: user.role,
        is_active: true
      })))
      .execute();

    const result = await getUsers();

    const roles = result.map(user => user.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('cashier');
    expect(roles).toContain('stock_manager');
  });
});
