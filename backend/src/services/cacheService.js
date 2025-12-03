class CacheService {
  constructor() {
    this.cache = new Map();
  }

  buildDependencyKey(owner, repo, branch, commitSha) {
    return `dependency:${owner}:${repo}:${branch}:${commitSha}`;
  }

  buildArchitectureKey(owner, repo, branch, commitSha) {
    return `architecture:${owner}:${repo}:${branch}:${commitSha}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (entry) {
      console.log(`[Cache Hit] ${key}`);
      return entry.value;
    }
    console.log(`[Cache Miss] ${key}`);
    return undefined;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      cachedAt: Date.now()
    });
    console.log(`[Cache Set] ${key}`);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[Cache Delete] ${key}`);
    }
    return deleted;
  }
}

export default new CacheService();
