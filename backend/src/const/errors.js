/**
 * Custom Error Classes
 * Centralized error definitions for the application
 */

/**
 * Error for user input validation failures
 */
export class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
    this.statusCode = 400;
  }
}

/**
 * Error for repository metadata operations (GitHub URL parsing, fetching, etc.)
 */
export class RepoMetadataError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'RepoMetadataError';
    this.statusCode = statusCode;
  }
}

/**
 * Error for LLM provider operations (API calls, response parsing, etc.)
 */
export class LlmProviderError extends Error {
  constructor(message, statusCode = 502, details) {
    super(message);
    this.name = 'LlmProviderError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Error for GitHub API operation failures (rate limit, file access, etc.)
 */
export class GitHubApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

export default {
  UserInputError,
  RepoMetadataError,
  LlmProviderError,
  GitHubApiError
};
