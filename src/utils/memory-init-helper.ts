import type { MemoryRepository } from '@cubicler/cubicagentkit';
import type { Logger } from './logger.interface.js';
import type { MemoryData } from '../models/memory.interfaces.js';

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
    if (typeof memory.getShortTermMemories !== 'function' || typeof memory.addToShortTermMemory !== 'function') {
      logger?.info('📋 Short-term memory methods not available, skipping initialization');
      return;
    }

    const existingShortTerm = memory.getShortTermMemories();
    if (existingShortTerm && existingShortTerm.length > 0) {
      logger?.info(`📋 Short-term memory already contains ${existingShortTerm.length} items, skipping initialization`);
      return;
    }

    const averageTokensPerMemory = 80;
    const estimatedMemoryCount = Math.ceil(maxTokens / averageTokensPerMemory);
    const searchLimit = Math.min(Math.max(estimatedMemoryCount * 2, 10), 100);

    const recentMemories = await memory.search({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: searchLimit
    });

    if (!recentMemories || recentMemories.length === 0) {
      logger?.info('📋 No memories found to populate short-term memory');
      return;
    }

    interface MemoryData {
      id: string;
      sentence?: string;
      content?: string;
      importance: number;
      tags: string[];
      createdAt?: string;
      updatedAt?: string;
    }

    const sortedMemories = recentMemories.sort((a: MemoryData, b: MemoryData) => {
      const importanceA = a.importance || 5;
      const importanceB = b.importance || 5;
      const importanceDiff = importanceB - importanceA;
      
      if (importanceDiff !== 0) return importanceDiff;
      
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const selectedMemories: MemoryData[] = [];
    let currentTokenCount = 0;

    for (const memory of sortedMemories) {
      const memoryTokenEstimate = estimateMemoryTokens(memory);
      
      if (currentTokenCount + memoryTokenEstimate > maxTokens) {
        break;
      }

      selectedMemories.push(memory);
      currentTokenCount += memoryTokenEstimate;
    }

    // Add selected memories to short-term memory
    for (const mem of selectedMemories) {
      try {
        await memory.addToShortTermMemory(mem.id);
      } catch (error) {
        logger?.warn(`⚠️ Failed to add memory ${mem.id} to short-term: ${error}`);
      }
    }

    logger?.info(`📋 Initialized short-term memory with ${selectedMemories.length} recent important memories (~${currentTokenCount}/${maxTokens} tokens, searched ${recentMemories.length}/${searchLimit})`);
    
  } catch (error) {
    logger?.error('❌ Failed to initialize short-term memory:', error);
    // Don't throw - this is non-critical functionality
  }
}

function estimateMemoryTokens(memory: MemoryData): number {
  const content = memory.sentence || memory.content || '';
  const tags = Array.isArray(memory.tags) ? memory.tags.join(', ') : '';
  
  const contentTokens = Math.ceil(content.length / 4);
  const tagTokens = Math.ceil(tags.length / 4);
  const metadataOverhead = 10;
  
  return contentTokens + tagTokens + metadataOverhead;
}
