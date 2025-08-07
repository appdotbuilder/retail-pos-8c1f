
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
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
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Electronics',
          description: 'Electronic devices and accessories'
        },
        {
          name: 'Clothing',
          description: 'Apparel and fashion items'
        },
        {
          name: 'Books',
          description: null
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Check category names are present
    const categoryNames = result.map(cat => cat.name);
    expect(categoryNames).toContain('Electronics');
    expect(categoryNames).toContain('Clothing');
    expect(categoryNames).toContain('Books');

    // Check structure of first category
    const electronics = result.find(cat => cat.name === 'Electronics');
    expect(electronics).toBeDefined();
    expect(electronics!.id).toBeDefined();
    expect(electronics!.description).toEqual('Electronic devices and accessories');
    expect(electronics!.created_at).toBeInstanceOf(Date);
    expect(electronics!.updated_at).toBeInstanceOf(Date);

    // Check null description handling
    const books = result.find(cat => cat.name === 'Books');
    expect(books!.description).toBeNull();
  });

  it('should return categories ordered by creation', async () => {
    // Create categories with slight delay to ensure different timestamps
    await db.insert(categoriesTable)
      .values({ name: 'First Category', description: 'First' })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(categoriesTable)
      .values({ name: 'Second Category', description: 'Second' })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Category');
    expect(result[1].name).toEqual('Second Category');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
