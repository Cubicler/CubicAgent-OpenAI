# CubicAgent-OpenAI Development Instructions

CubicAgent-OpenAI is a **ready-to-deploy OpenAI agent** and **npm library** integrating OpenAI models with Cubicler 2.3.0 using CubicAgentKit 2.3.1. Built for zero-code deployment and library integration.

## 🧱 Core Architecture

**Built on CubicAgentKit 2.3.1:**
- `npm install @cubicler/cubicagentkit@^2.3.1`
- **CubicAgent** - Main orchestrator with lazy initialization
- **AxiosAgentClient** - HTTP client for Cubicler MCP
- **ExpressAgentServer** - HTTP server for endpoints
- **OpenAI Service** - Handles iterative function calling

**Key Features:**
- Lazy initialization (connects on first request)
- Session iteration loop with limits
- MCP tool mapping to OpenAI functions
- Exponential backoff retry logic
- Dual usage: standalone app + npm library
- Memory integration with SQLite or in-memory storage
- Internal tool aggregation for memory functions

## ⚙️ Environment Variables (16 total)

**Required:**
```env
OPENAI_API_KEY                   # OpenAI API key
```

**Transport:**
```env
TRANSPORT_MODE                   # http, stdio (default: http)
CUBICLER_URL                     # Cubicler instance URL
STDIO_COMMAND, STDIO_ARGS, STDIO_CWD  # Optional stdio config
```

**OpenAI:**
```env
OPENAI_MODEL                     # gpt-4o, gpt-4, gpt-4-turbo, gpt-3.5-turbo
OPENAI_TEMPERATURE               # 0.0-2.0 (default: 0.7)
OPENAI_SESSION_MAX_TOKENS        # Max tokens per session (default: 4096)
OPENAI_ORG_ID, OPENAI_PROJECT_ID, OPENAI_BASE_URL  # Optional
OPENAI_TIMEOUT, OPENAI_MAX_RETRIES  # API config
```

**Memory (optional):**
```env
MEMORY_ENABLED, MEMORY_TYPE, MEMORY_DB_PATH
MEMORY_MAX_TOKENS, MEMORY_DEFAULT_IMPORTANCE
```

**Dispatch:**
```env
DISPATCH_TIMEOUT, DISPATCH_SESSION_MAX_ITERATION
MCP_MAX_RETRIES, MCP_CALL_TIMEOUT
DISPATCH_ENDPOINT, AGENT_PORT
```

## 🎯 Core Services

### OpenAIService
**Purpose:** Handle OpenAI API and iterative function calling
**Required Behavior:**
- Execute session loop with `DISPATCH_SESSION_MAX_ITERATION` limit
- Use CubicAgent.getTools() to fetch available Cubicler tools
- Convert Cubicler tools to OpenAI function schemas
- Maintain conversation context including tool calls/results
- Stop when OpenAI returns final response (no tool calls)
- Handle MCP retry through CubicAgentKit

### MessageBuilder
**Purpose:** Convert between Cubicler and OpenAI message formats
**Required Behavior:**
- Convert AgentRequest.messages to OpenAI format
- Include iteration context in system messages
- Preserve conversation including assistant tool_calls
- Clean final responses (remove agent name prefixes)

## 🔧 Session Iteration Pattern

1. **Initialize** - Set up iteration counter and context
2. **Get tools** - Fetch via CubicAgent.getTools()
3. **OpenAI request** - Send with function definitions
4. **Tool execution** - Execute if OpenAI requests tools
5. **Iteration check** - Continue or return final response
6. **Cleanup** - Log metrics

## ✅ Your Role

**MAINTAIN:**
- CubicAgentKit 2.3.1 patterns with lazy initialization
- Iterative function calling loop with tool building
- Message conversion and response cleaning
- 16 environment variables as specified
- Error handling and retry patterns
- Dual usage (standalone + library)
- Memory integration patterns with internal tools
- SOLID principles and clean code standards

**DO NOT:**
- Add environment variables beyond the 16 specified
- Implement complex health checks or monitoring
- Add authentication middleware
- Over-engineer session management
- Add manual initialization code
- Implement streaming responses

---

# Global Development Standards & Best Practices

> **Author Preferences:** These are my personal coding standards and preferences that should be followed across all projects, regardless of programming language.

## 🎯 Core Philosophy

Write code that is clean, maintainable, testable, and scalable. Always prioritize code readability and long-term maintainability over short-term convenience. Prefer simple, focused code over complex abstractions - it's better to have code that does one thing well than code that tries to be reusable for everything.

## 📐 SOLID Principles (Universal)

Always follow SOLID principles when writing code:

• **Single Responsibility Principle** - Each class/function/module should have one reason to change
• **Open/Closed Principle** - Open for extension, closed for modification
• **Liskov Substitution Principle** - Derived classes must be substitutable for their base classes
• **Interface Segregation Principle** - Many specific interfaces are better than one general-purpose interface
• **Dependency Inversion Principle** - Depend on abstractions, not concretions

## 🛠️ Method & Function Design

### Method Length & Complexity
• Break down long methods/functions into smaller, focused units that each handle a specific responsibility
• Avoid redundant wrapper methods that only call one private method without additional logic
• Single responsibility per method - each method should do one thing well
• Meaningful names that clearly describe what the method does

### Parameters & Return Values
• Limit parameters - if you need more than 3-4 parameters, consider using a configuration object/struct
• Consistent return types - avoid functions that sometimes return different types
• Fail fast - validate inputs early and throw meaningful errors

## 🏗️ Architecture Principles

### Modularity & Separation of Concerns
• Service-oriented design with clear separation of responsibilities
• Dependency injection for testability and flexibility
• Interface/contract-based programming - depend on abstractions, not implementations
• Avoid monolithic classes/modules - break them into focused, cohesive units

### Error Handling
• Throw errors, don't catch and ignore - let errors bubble up unless they are expected and recoverable
• Fail fast - validate inputs early and throw meaningful errors immediately
• Consistent error handling patterns across the entire codebase
• Meaningful error messages that help developers understand what went wrong and how to fix it
• Log at appropriate levels with context and structured data
• Only catch errors you can handle - if you can't recover or provide meaningful handling, let it throw
• Expected errors should be handled gracefully - but unexpected errors should surface quickly

## 📝 Code Quality Standards

### Naming Conventions
• Descriptive names - code should be self-documenting
• Consistent naming patterns within each project/language
• Avoid abbreviations unless they're industry standard
• Boolean variables/functions should be clearly boolean (is/has/can/should prefixes)

### Comments & Documentation
• Code should be self-documenting - prefer clear code over comments
• Document the "why", not the "what" - explain business logic and decisions
• Keep documentation up-to-date with code changes
• API documentation for all public interfaces

### Testing Philosophy
• Write testable code - design with testing in mind
• Unit tests for business logic - test behavior, not implementation
• Integration tests for workflows - test how components work together
• Test edge cases and error conditions

## 🔄 Development Workflow

### Refactoring
• Continuous refactoring - improve code quality incrementally
• Test before and after refactoring to ensure behavior is preserved
• Remove dead code - don't leave commented-out code
• DRY principle with wisdom - Don't Repeat Yourself, but avoid premature abstraction and forced reuse
• Prefer simple duplication over complex abstraction - if reuse makes code complicated, duplicate and keep it simple
• One thing well - better to have multiple simple functions than one complex reusable one

## ⚡ Performance Considerations

### Optimization Philosophy
• Measure before optimizing - profile and identify actual bottlenecks
• Readability first, optimize later - don't sacrifice clarity for micro-optimizations
• Cache appropriately - but avoid premature caching
• Consider scalability from the design phase

### Resource Management
• Clean up resources - close files, connections, release memory appropriately
• Efficient algorithms - choose appropriate data structures and algorithms
• Lazy loading where appropriate to improve startup time

## 🔒 Security Best Practices

### Input Validation
• Validate all inputs at system boundaries
• Sanitize data before processing or storage
• Use parameterized queries to prevent injection attacks
• Implement proper authentication and authorization

### Data Protection
• Never log sensitive data (passwords, tokens, personal info)
• Use environment variables for configuration and secrets
• Encrypt sensitive data at rest and in transit
• Follow principle of least privilege

## 🔧 Linting and Code Quality Rules

When fixing linting issues or working with code quality tools:

- **If the linter is wrong** (like when they said something unused, but it's actually used) just disable the linter on that particular warning or error with explanatory comments
- **If you need to add an import**, add it to the top of the file with other imports
- **Import that are allowed in middle of the file** are only the imports used for singleton instances (at the bottom of service files)
- **Always use proper TypeScript types** instead of `any` - create new type definitions when needed
- **For constructor parameters flagged as unused** but are actually used as dependency injection, use `// eslint-disable-next-line no-unused-vars` 
- **For safe non-null assertions** where you've verified the value exists, use `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: reason`
- **Remove truly unused imports** rather than disabling the warning
- **Fix formatting issues** automatically with `--fix` flag when possible

## ✅ Your Role as a Developer/AI Assistant

When working on any codebase, your job is to:

• Follow these global standards while adapting to language-specific conventions
• Write clean, maintainable code that other developers can easily understand and modify
• Think about long-term maintainability - code is read more often than it's written
• Design for extensibility - anticipate future changes and requirements
• Prioritize code quality over speed of delivery
• Ask questions when requirements are unclear rather than making assumptions
• Implement exactly what is requested - don't add features or functionality that wasn't asked for
• Consider the bigger picture - how does this code fit into the overall system?
• Be consistent with existing patterns and conventions in the codebase
• Document decisions that might not be obvious to future developers
• Test your code and consider edge cases

## ❌ DO NOT

• Do not sacrifice code quality for quick fixes or tight deadlines
• Do not write monolithic functions/classes - break them down into manageable pieces
• Do not ignore error handling - always consider what can go wrong and let errors surface
• Do not catch and swallow exceptions - only catch errors you can meaningfully handle or recover from
• Do not hide failures - if something fails, it should be visible and actionable
• Do not hardcode values - use configuration files or constants
• Do not copy-paste code without understanding what it does
• Do not leave TODO comments in production code without tracking them
• Do not commit commented-out code - use version control instead
• Do not ignore linting/formatting tools - consistency matters
• Do not skip documentation for public APIs and complex business logic
• Do not make breaking changes without proper versioning and migration paths
• Do not optimize prematurely - measure first, then optimize
• Do not force code reuse - avoid creating complicated abstractions just to eliminate duplication
• Do not create "Swiss Army knife" functions - functions that try to do everything for everyone
• Do not sacrifice simplicity for reusability - simple, testable code is better than complex reusable code
• Do not reinvent the wheel - use established libraries and patterns when appropriate, but don't force custom reuse
• Do not ignore security considerations - think about potential vulnerabilities
• Do not add unrequested features - implement exactly what is asked for, nothing more
• Do not make assumptions about data or user behavior - validate everything
• Do not implement "nice to have" features without explicit request - stick to requirements

## 🎯 Language-Specific Notes

While these principles apply universally, remember to:

• Follow language idioms and established conventions
• Use language-specific tools for testing, linting, and formatting
• Leverage language strengths - don't fight the language design
• Stay updated with language best practices and evolving standards
• Use appropriate design patterns for the specific language/framework

## 📋 Quick Checklist

Before considering any piece of code "done":

- [ ] Does it follow SOLID principles?
- [ ] Is each method/function focused on a single responsibility?
- [ ] Are names descriptive and consistent?
- [ ] Is error handling appropriate and consistent?
- [ ] Is it testable and tested?
- [ ] Is it documented where necessary?
- [ ] Does it follow project conventions?
- [ ] Is it secure and performant enough?
- [ ] Will it be maintainable in 6 months?

These standards are living guidelines that should evolve with experience and changing best practices. The goal is to write code that is a joy to work with, both now and in the future.