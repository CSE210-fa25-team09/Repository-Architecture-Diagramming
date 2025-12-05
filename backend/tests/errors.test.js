import { 
  UserInputError, 
  RepoMetadataError, 
  LlmProviderError, 
  GitHubApiError 
} from '../src/const/errors.js';

describe('Custom Error Classes', () => {
  test('UserInputError should have correct properties', () => {
    const error = new UserInputError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('UserInputError');
    expect(error.statusCode).toBe(400);
    expect(error instanceof Error).toBe(true);
  });

  test('RepoMetadataError should have correct properties and allow custom statusCode', () => {
    const error = new RepoMetadataError('Repo not found');
    expect(error.message).toBe('Repo not found');
    expect(error.name).toBe('RepoMetadataError');
    expect(error.statusCode).toBe(400);
    expect(error instanceof Error).toBe(true);
    
    const errorWithStatus = new RepoMetadataError('Not found', 404);
    expect(errorWithStatus.statusCode).toBe(404);
  });

  test('LlmProviderError should have correct properties, custom statusCode, and details', () => {
    const error = new LlmProviderError('LLM failed');
    expect(error.message).toBe('LLM failed');
    expect(error.name).toBe('LlmProviderError');
    expect(error.statusCode).toBe(502);
    expect(error instanceof Error).toBe(true);
    
    const details = { response: 'error details', code: 123 };
    const errorWithDetails = new LlmProviderError('Test', 429, details);
    expect(errorWithDetails.statusCode).toBe(429);
    expect(errorWithDetails.details).toEqual(details);
  });

  test('GitHubApiError should have correct properties and allow custom statusCode', () => {
    const error = new GitHubApiError('Rate limit exceeded');
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.name).toBe('GitHubApiError');
    expect(error.statusCode).toBe(502);
    expect(error instanceof Error).toBe(true);
    
    const errorWithStatus = new GitHubApiError('Not found', 404);
    expect(errorWithStatus.statusCode).toBe(404);
  });
});
