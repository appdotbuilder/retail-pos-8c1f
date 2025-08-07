
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and accessories'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Electronic devices and accessories');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Electronics');
    expect(categories[0].description).toEqual('Electronic devices and accessories');
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create category with null description', async () => {
    const inputWithNullDescription: CreateCategoryInput = {
      name: 'Books',
      description: null
    };

    const result = await createCategory(inputWithNullDescription);

    expect(result.name).toEqual('Books');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate category names', async () => {
    // First category
    await createCategory(testInput);

    // Try to create another category with same name
    const duplicateInput: CreateCategoryInput = {
      name: 'Electronics',
      description: 'Different description'
    };

    // Should not throw error - categories can have duplicate names
    const result = await createCategory(duplicateInput);
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Different description');
  });
});
