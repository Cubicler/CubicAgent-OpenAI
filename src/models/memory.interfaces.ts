// Types are used in other files that import from this module

/**
 * Raw memory data structure returned from MemoryRepository
 * This represents the actual data format from the memory storage
 */
export interface MemoryData {
  id: string;
  sentence?: string;
  content?: string;
  importance: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  score?: number;
  similarity?: number;
}

/**
 * Formatted memory object for API responses
 * This is the standardized format returned to clients
 */
export interface FormattedMemory {
  id: string;
  sentence: string;
  importance: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  score?: number;
}

/**
 * Search options for memory queries
 * Extends the basic MemorySearchOptions with additional fields
 */
export interface MemorySearchOptions {
  content?: string;
  contentRegex?: string;
  tags?: string[];
  tagsRegex?: string;
  sortBy?: 'importance' | 'timestamp' | 'both';
  sortOrder?: 'asc' | 'desc';
  limit: number;
}

/**
 * Memory search result structure
 */
export interface MemorySearchResult {
  success: boolean;
  memories: FormattedMemory[];
  count: number;
  searchOptions: MemorySearchOptions;
}

/**
 * Memory recall result structure
 */
export interface MemoryRecallResult {
  success: boolean;
  memory: FormattedMemory | null;
  found: boolean;
}