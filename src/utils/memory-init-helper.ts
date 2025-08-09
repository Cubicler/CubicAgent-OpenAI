import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from '@/utils/logger.interface.js';

/**
 * Helper functions for memory initialization and management
 */

/**
 * Initialize short-term memory with the most important memories
 * This ensures that the agent has access to key context from the start
 */
export async function initializeShortTermMemoryOnFirstLoad(
  memory: MemoryRepository,
  maxTokens: number = 2000,
  logger?: Logger
): Promise<void> {
  try {
    // Check if short-term memory methods are available
    if (typeof memory.getShortTermMemories !== 'function' || typeof memory.addToShortTermMemory !== 'function') {
      logger?.info('📋 Short-term memory methods not available, skipping initialization');
      return;
    }

    // Check if short-term memory is already populated
    const existingShortTerm = memory.getShortTermMemories();
    if (existingShortTerm && existingShortTerm.length > 0) {
      logger?.info(`📋 Short-term memory already contains ${existingShortTerm.length} items, skipping initialization`);
      return;
    }

    // Calculate intelligent limit based on maxTokens
    // Assume average ~80 tokens per memory (content + metadata), fetch 2x what we need
    const averageTokensPerMemory = 80;
    const estimatedMemoryCount = Math.ceil(maxTokens / averageTokensPerMemory);
    const searchLimit = Math.min(Math.max(estimatedMemoryCount * 2, 10), 100); // 2x buffer, min 10, max 100

    // Search for the most recent memories first, then we'll sort by importance manually
    const recentMemories = await memory.search({
      sortBy: 'timestamp', // Sort by timestamp first to get latest memories
      sortOrder: 'desc', // Most recent first
      limit: searchLimit // Intelligent limit based on token capacity
    });

    if (!recentMemories || recentMemories.length === 0) {
      logger?.info('📋 No memories found to populate short-term memory');
      return;
    }

    // Now manually sort by importance (desc) while preserving timestamp order for ties
    const sortedMemories = recentMemories.sort((a: unknown, b: unknown) => {
      const memA = a as Record<string, unknown>;
      const memB = b as Record<string, unknown>;
      
      // Sort by importance first (higher importance first)
      const importanceA = (memA['importance'] as number) || 5;
      const importanceB = (memB['importance'] as number) || 5;
      const importanceDiff = importanceB - importanceA;
      
      if (importanceDiff !== 0) return importanceDiff;
      
      // If importance is equal, maintain timestamp order (more recent first)
      const timeA = new Date((memA['updatedAt'] as string) || (memA['createdAt'] as string) || 0).getTime();
      const timeB = new Date((memB['updatedAt'] as string) || (memB['createdAt'] as string) || 0).getTime();
      return timeB - timeA;
    });

    // Filter memories to fit within token capacity
    const selectedMemories: unknown[] = [];
    let currentTokenCount = 0;

    for (const memory of sortedMemories) {
      const memoryTokenEstimate = estimateMemoryTokens(memory);
      
      // Check if adding this memory would exceed the token limit
      if (currentTokenCount + memoryTokenEstimate > maxTokens) {
        break;
      }

      selectedMemories.push(memory);
      currentTokenCount += memoryTokenEstimate;
    }

    // Add selected memories to short-term memory
    for (const mem of selectedMemories) {
      try {
        await memory.addToShortTermMemory((mem as Record<string, unknown>)['id'] as string);
      } catch (error) {
        logger?.warn(`⚠️ Failed to add memory ${(mem as Record<string, unknown>)['id']} to short-term: ${error}`);
      }
    }

    logger?.info(`📋 Initialized short-term memory with ${selectedMemories.length} recent important memories (~${currentTokenCount}/${maxTokens} tokens, searched ${recentMemories.length}/${searchLimit})`);
    
  } catch (error) {
    logger?.error('❌ Failed to initialize short-term memory:', error);
    // Don't throw - this is non-critical functionality
  }
}

/**
 * Estimate the token count for a memory item
 * This is a rough estimation based on content length
 */
function estimateMemoryTokens(memory: unknown): number {
  const mem = memory as Record<string, unknown>;
  const content = (mem['sentence'] as string) || (mem['content'] as string) || '';
  const tags = Array.isArray(mem['tags']) ? (mem['tags'] as string[]).join(', ') : '';
  
  // Rough estimation: ~4 characters per token on average
  // Add some overhead for metadata (id, importance, timestamps)
  const contentTokens = Math.ceil(content.length / 4);
  const tagTokens = Math.ceil(tags.length / 4);
  const metadataOverhead = 10; // Rough estimate for id, importance, timestamps
  
  return contentTokens + tagTokens + metadataOverhead;
}
