
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Create test categories
    const testCategories: CreateCategoryInput[] = [
      { name: 'Electronics', description: 'Electronic devices and gadgets' },
      { name: 'Books', description: 'Books and publications' },
      { name: 'Clothing', description: null }
    ];

    // Insert test categories
    for (const category of testCategories) {
      await db.insert(categoriesTable)
        .values({
          name: category.name,
          description: category.description
        })
        .execute();
    }

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify each category has required fields
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(typeof category.name).toBe('string');
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
    });

    // Check specific categories exist
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Electronics');
    expect(categoryNames).toContain('Books');
    expect(categoryNames).toContain('Clothing');
  });

  it('should handle categories with null descriptions', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: null
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Category');
    expect(result[0].description).toBeNull();
  });
});
