import cacheService from '../src/services/cacheService.js';

describe('Cache Service (Memory Map)', () => {
  beforeEach(() => {
    // Clear cache manually by deleting all keys
    for (const key of cacheService.cache.keys()) {
      cacheService.cache.delete(key);
    }
  });

  describe('Basic operations', () => {
    test('should store and retrieve values', () => {
      const key = 'test:repo/owner/sha123';
      const value = { diagram: 'graph LR' };

      cacheService.set(key, value);
      const result = cacheService.get(key);

      expect(result).toEqual(value);
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

    test('should check if key exists', () => {
      const key = 'test-key';
      expect(cacheService.has(key)).toBe(false);
      cacheService.set(key, 'value');
      expect(cacheService.has(key)).toBe(true);
    });

    test('should delete a key', () => {
      const key = 'test-key';
      cacheService.set(key, 'value');
      expect(cacheService.has(key)).toBe(true);
      cacheService.delete(key);
      expect(cacheService.has(key)).toBe(false);
    });
  });

  describe('Key builders', () => {
    test('should build dependency cache key', () => {
      const key = cacheService.buildDependencyKey('owner', 'repo', 'main', 'abc123');
      expect(key).toBe('dependency:owner:repo:main:abc123');
    });

    test('should build architecture cache key', () => {
      const key = cacheService.buildArchitectureKey('owner', 'repo', 'main', 'abc123');
      expect(key).toBe('architecture:owner:repo:main:abc123');
    });
  });
});
