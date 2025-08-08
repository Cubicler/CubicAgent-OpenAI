import type { AgentClient, JSONValue, JSONObject } from '@cubicler/cubicagentkit';

/**
 * A null implementation of AgentClient for STDIO JSON-RPC mode
 * This client doesn't make external tool calls since in pure JSON-RPC STDIO mode,
 * the agent should only use internal tools or indicate external tools are not available.
 */
export class NullAgentClient implements AgentClient {
  async initialize(): Promise<void> {
    // No initialization needed for null client
    return Promise.resolve();
  }

  async callTool(toolName: string, _parameters: JSONObject): Promise<JSONValue> {
    // Return a message indicating that external tools are not available in STDIO mode
    return {
      error: `External tool "${toolName}" is not available in STDIO mode. Only internal tools are supported.`,
      available_internal_tools: [
        'cubicler_available_servers',
        'cubicler_fetch_server_tools'
      ]
    };
  }
}
