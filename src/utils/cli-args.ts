/**
 * Command-line argument parsing utilities
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CLIArgs {
  // OpenAI Configuration
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
  openaiTimeout?: number;
  openaiMaxRetries?: number;
  summarizerModel?: string;
  
  // Transport Configuration
  transport?: 'http' | 'stdio' | 'sse';
  cubiclerUrl?: string;
  sseUrl?: string;
  agentId?: string;
  
  // Memory Configuration
  memoryDbPath?: string;
  memoryMaxTokens?: number;
  
  // Dispatch Configuration
  dispatchTimeout?: number;
  mcpMaxRetries?: number;
  sessionMaxIteration?: number;
  agentPort?: number;
  
  // JWT Configuration
  jwt?: boolean;
  jwtType?: 'static' | 'oauth';
  jwtToken?: string;
  
  // Help and version
  help?: boolean;
  version?: boolean;
}

/**
 * Parse command-line arguments
 */
export function parseArgs(argv: string[] = process.argv): CLIArgs {
  const args: CLIArgs = {};
  
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];
    
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-v':
      case '--version':
        args.version = true;
        break;
      case '--model':
        if (nextArg) args.model = nextArg;
        i++;
        break;
      case '--temperature':
        if (nextArg) args.temperature = parseFloat(nextArg);
        i++;
        break;
      case '--max-tokens':
        if (nextArg) args.maxTokens = parseInt(nextArg);
        i++;
        break;
      case '--api-key':
        if (nextArg) args.apiKey = nextArg;
        i++;
        break;
      case '--base-url':
        if (nextArg) args.baseUrl = nextArg;
        i++;
        break;
      case '--timeout':
        if (nextArg) args.openaiTimeout = parseInt(nextArg);
        i++;
        break;
      case '--max-retries':
        if (nextArg) args.openaiMaxRetries = parseInt(nextArg);
        i++;
        break;
      case '--summarizer-model':
        if (nextArg) args.summarizerModel = nextArg;
        i++;
        break;
      case '--transport':
        if (nextArg) args.transport = nextArg as 'http' | 'stdio' | 'sse';
        i++;
        break;
      case '--cubicler-url':
        if (nextArg) args.cubiclerUrl = nextArg;
        i++;
        break;
      case '--sse-url':
        if (nextArg) args.sseUrl = nextArg;
        i++;
        break;
      case '--agent-id':
        if (nextArg) args.agentId = nextArg;
        i++;
        break;
      case '--memory-db-path':
        if (nextArg) args.memoryDbPath = nextArg;
        i++;
        break;
      case '--memory-max-tokens':
        if (nextArg) args.memoryMaxTokens = parseInt(nextArg);
        i++;
        break;
      case '--session-max-iteration':
        if (nextArg) args.sessionMaxIteration = parseInt(nextArg);
        i++;
        break;
      case '--agent-port':
        if (nextArg) args.agentPort = parseInt(nextArg);
        i++;
        break;
      case '--jwt':
        args.jwt = true;
        break;
      case '--no-jwt':
        args.jwt = false;
        break;
      case '--jwt-type':
        if (nextArg) args.jwtType = nextArg as 'static' | 'oauth';
        i++;
        break;
      case '--jwt-token':
        if (nextArg) args.jwtToken = nextArg;
        i++;
        break;
      default:
        break;
    }
  }
  
  return args;
}

/**
 * Print help message
 */
export function printHelp(): void {;
  console.log(`
CubicAgent-OpenAI - OpenAI agent for Cubicler

Usage: npx @cubicler/cubicagent-openai [options]

OpenAI Options:
  --model <model>              OpenAI model to use (default: gpt-4o)
  --temperature <temp>         Temperature for responses (default: 0.7)
  --max-tokens <tokens>        Maximum tokens per session (default: 4096)
  --api-key <key>              OpenAI API key (or use OPENAI_API_KEY env var)
  --base-url <url>             OpenAI base URL
  --timeout <ms>               Request timeout in milliseconds (default: 600000)
  --max-retries <num>          Maximum number of retries (default: 2)
  --summarizer-model <model>   Model for memory summarization

Transport Options:
  --transport <mode>           Transport mode: http, stdio, sse (default: stdio)
  --cubicler-url <url>         Cubicler server URL for HTTP mode
  --sse-url <url>              SSE server URL for SSE mode
  --agent-id <id>              Agent ID for SSE mode

Memory Options:
  --memory-db-path <path>      Enable memory with SQLite database path (default: ./memories.db)
  --memory-max-tokens <num>    Maximum tokens in short-term memory (default: 2000)

Dispatch Options:
  --session-max-iteration <num>  Maximum iterations per session (default: 10)
  --agent-port <port>            Agent server port for HTTP mode (default: 3000)

JWT Options:
  --jwt                        Enable JWT authentication
  --no-jwt                     Disable JWT authentication (default)
  --jwt-type <type>            JWT type: static, oauth (default: static)
  --jwt-token <token>          JWT token for static authentication

Other Options:
  -h, --help                   Show this help message
  -v, --version                Show version information

Examples:
  # Basic usage (stdio mode by default)
  npx @cubicler/cubicagent-openai --model gpt-4o

  # With memory (SQLite)
  npx @cubicler/cubicagent-openai --memory-db-path ./agent-memory.db

  # HTTP mode with custom settings
  npx @cubicler/cubicagent-openai --transport http --cubicler-url http://localhost:8080 --temperature 0.3

Environment Variables:
  All options can also be set via environment variables (see .env.example)
  Command-line arguments override environment variables.
`);
}

/**
 * Print version information
 */
export async function printVersion(): Promise<void> {
  try {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    console.log(`@cubicler/cubicagent-openai v${packageJson.version}`);
  } catch {
    console.log('@cubicler/cubicagent-openai (version unknown)');
  }
}