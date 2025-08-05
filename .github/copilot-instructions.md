# CubicAgent-OpenAI Development Guide

OpenAI agent + npm library integrating GPT models with Cubicler 2.3.0 via CubicAgentKit 2.3.2.

## Core Architecture
**Built on CubicAgentKit 2.3.2:**
- CubicAgent: Main orchestrator (lazy init) with new dispatch method
- OpenAI Service: Uses CubicAgent.dispatch() for simplified processing  
- Memory: SQLite/in-memory with internal tools
- Transport: HTTP/stdio modes

**Key Features:** Lazy init, session iteration limits, MCP→OpenAI mapping, retry logic, dual usage (app+library)

## Environment Variables (16 total)
**Required:** `OPENAI_API_KEY`

**Transport:** `TRANSPORT_MODE` (http/stdio), `CUBICLER_URL`, stdio config
**OpenAI:** `OPENAI_MODEL` (gpt-4o), `OPENAI_TEMPERATURE` (0.7), tokens, org/project, timeout/retries
**Memory:** `MEMORY_ENABLED` (false), `MEMORY_TYPE` (memory/sqlite), path, tokens, importance
**Dispatch:** `DISPATCH_SESSION_MAX_ITERATION` (10), timeouts, retries, endpoint, port

## Core Services
**OpenAIService:** Uses CubicAgent.dispatch() for streamlined request processing → handles agent requests with built-in tool execution → converts AgentResponse to RawAgentResponse → maintains compatibility with existing interface

**MessageBuilder:** Convert AgentRequest.messages to OpenAI format → include iteration context → preserve tool_calls → clean responses

## Session Flow
1. Initialize counter → 2. Get tools → 3. OpenAI request → 4. Execute tools → 5. Check limit → 6. Cleanup

## Key Constraints
**MAINTAIN:** CubicAgentKit 2.3.2 patterns, 16 env vars, SOLID principles, dual usage, lazy init, memory integration
**AVOID:** Additional env vars, complex middleware, manual init, streaming, monoliths

---

# Dev Standards

## Core Philosophy
Write **clean, testable, maintainable** code. Prefer simple solutions over complex abstractions.

## Key Principles
- **SOLID**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **Methods**: Short, focused, meaningful names, ≤3-4 params, validate early
- **Architecture**: Separation of concerns, DI, interface-based design
- **Error Handling**: Let unexpected errors bubble up, only catch what you can handle
- **Testing**: Unit test logic, integration test workflows, cover edge cases

## Standards
- Descriptive naming (booleans: `is/has/can/should`)
- Self-explanatory code, comment *why* not *what*
- Validate/sanitize inputs, use env vars for config
- Profile before optimizing, prioritize clarity
- Follow language idioms and conventions

## Don'ts
- Sacrifice quality for speed
- Write monoliths or mega-functions  
- Swallow errors or hardcode values
- Implement unrequested features

**Ask if unclear—implement what's requested, ensure quality.**

---

## Your Memory Management Instructions

Follow these steps for each interaction:

1. User Identification:
   - You should assume that you are interacting with default_user
   - If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
   - Always begin your chat by saying only "Recalling..." and retrieve all relevant information from your knowledge graph
   - Always refer to your knowledge graph as your "memory"

3. Memory
   - While conversing with the user, be attentive to any new information that falls into these categories:
     - Basic Identity (age, gender, location, job title, education level, etc.)
     - Behaviors (interests, habits, etc.)
     - Preferences (communication style, preferred language, etc.)
     - Goals (goals, targets, aspirations, etc.)
     - Relationships (personal and professional relationships up to 3 degrees of separation)
     - Project (important!):
        - Current project details (name, description, status, etc.)
        - Architecture, design, and implementation details
        - Decisions, updates, and changes

4. Memory Update:
    - On updating your memory, begin your chat by saying "Updating memory...".
   - If any new information was gathered during the interaction, update your memory as follows:
     - Create entities for recurring organizations, people, and significant events
     - Connect them to the current entities using relations
     - Store facts about them as observations