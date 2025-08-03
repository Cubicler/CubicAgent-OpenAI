import type { JSONValue } from '../config/types.js';

/**
 * Utility functions for memory parameter extraction and validation
 */

/**
 * Extract a required string parameter from JSONValue parameters
 */
export function extractRequiredString(parameters: JSONValue, paramName: string): string {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (typeof value !== 'string') {
    throw new Error(`Parameter ${paramName} must be a string`);
  }

  return value;
}

/**
 * Extract an optional string parameter from JSONValue parameters
 */
export function extractOptionalString(parameters: JSONValue, paramName: string): string | undefined {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    return undefined;
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Parameter ${paramName} must be a string`);
  }

  return value;
}

/**
 * Extract an optional number parameter from JSONValue parameters
 */
export function extractOptionalNumber(parameters: JSONValue, paramName: string): number | undefined {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    return undefined;
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'number') {
    throw new Error(`Parameter ${paramName} must be a number`);
  }

  return value;
}

/**
 * Extract a required number parameter from JSONValue parameters
 */
export function extractRequiredNumber(parameters: JSONValue, paramName: string): number {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (typeof value !== 'number') {
    throw new Error(`Parameter ${paramName} must be a number`);
  }

  return value;
}

/**
 * Extract an optional string array parameter from JSONValue parameters
 */
export function extractOptionalStringArray(parameters: JSONValue, paramName: string): string[] {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    return [];
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Parameter ${paramName} must be an array`);
  }

  const stringArray = value.filter(item => typeof item === 'string') as string[];
  if (stringArray.length !== value.length) {
    throw new Error(`All items in ${paramName} must be strings`);
  }

  return stringArray;
}

/**
 * Extract a required string array parameter from JSONValue parameters
 */
export function extractRequiredStringArray(parameters: JSONValue, paramName: string): string[] {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (!Array.isArray(value)) {
    throw new Error(`Parameter ${paramName} must be an array`);
  }

  const stringArray = value.filter(item => typeof item === 'string') as string[];
  if (stringArray.length !== value.length) {
    throw new Error(`All items in ${paramName} must be strings`);
  }

  return stringArray;
}

/**
 * Extract an optional boolean parameter from JSONValue parameters
 */
export function extractOptionalBoolean(parameters: JSONValue, paramName: string): boolean | undefined {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    return undefined;
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Parameter ${paramName} must be a boolean`);
  }

  return value;
}

/**
 * Extract a required boolean parameter from JSONValue parameters
 */
export function extractRequiredBoolean(parameters: JSONValue, paramName: string): boolean {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }

  const params = parameters as Record<string, JSONValue>;
  const value = params[paramName];

  if (typeof value !== 'boolean') {
    throw new Error(`Parameter ${paramName} must be a boolean`);
  }

  return value;
}
