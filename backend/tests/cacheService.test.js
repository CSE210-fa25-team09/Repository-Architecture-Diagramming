import cacheService from '../src/services/cacheService.js';

describe('Cache Service (Memory Map)', () => {
  beforeEach(() => {
    if (cacheService.cache) cacheService.cache.clear();
  });

  test('should store and retrieve values', () => {
    const key = 'repo/owner/sha123';
    const value = { diagram: 'graph LR' };

    cacheService.set(key, value);
    const result = cacheService.get(key);

    expect(result).toBe(value);
    expect(result.diagram).toBe('graph LR');
  });

  test('should return undefined for missing keys', () => {
    const result = cacheService.get('non-existent-key');
    expect(result).toBeUndefined();
  });

  test('should overwrite existing keys', () => {
    const key = 'test-key';
    cacheService.set(key, 'value-1');
    cacheService.set(key, 'value-2');

    expect(cacheService.get(key)).toBe('value-2');
  });
});
