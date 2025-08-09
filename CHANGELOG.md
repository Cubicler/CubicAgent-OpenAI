# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.4] - 2025-08-09

### Fixed

- **NPX Execution Issue** - Fixed binary executability for npx usage
  - Added `postbuild` script to automatically make `dist/index.js` executable (`chmod +x`)
  - Fixed version reading functionality by updating package.json path resolution
  - Updated CLI argument utilities to properly read version from file system
  - Binary now properly executes with `npx @cubicler/cubicagent-openai` commands

### Changed

- **Build Process Enhancement** - Improved automated build process
  - Added `postbuild` script for automatic file permission handling
  - Enhanced version detection using file system instead of ES module imports

### Notes

- **NPX Ready** - Package now fully supports npx execution out of the box
- **Zero Breaking Changes** - All existing APIs remain fully compatible
- **Better CLI Experience** - Version and help commands now work correctly via npx

## [2.6.3] - 2025-08-09

### Updated

- **Dependencies Update** - Updated dependencies to latest versions
  - Upgraded `@cubicler/cubicagentkit` from `^2.6.1` to `^2.6.2`
  - Updated `pino` from `^9.3.2` to `^9.8.0`
  - Updated `package-lock.json` to reflect latest dependency versions

### Notes

- **Maintenance Release** - Focus on keeping dependencies current and secure
- **Zero Breaking Changes** - All existing APIs remain fully compatible
- **Enhanced Stability** - Latest dependency versions provide improved reliability

## [2.6.2] - 2025-08-09

### Fixed

- **Library Compatibility** - Replaced TypeScript path aliases (`@/*`) with relative imports for better library compatibility
  - Updated all source files to use relative imports instead of path aliases
  - Ensures proper module resolution when package is consumed as a dependency
  - Maintains full functionality while improving compatibility with different build systems
  - No breaking changes to public API

### Notes

- **Zero Breaking Changes** - All existing APIs remain fully compatible
- **Enhanced Compatibility** - Better support for various build systems and module bundlers
- **Library Usage** - Improved experience when using as a dependency in other projects

## [2.6.1] - 2025-08-09

### Added

- **Comprehensive Image Handling Support** - Full support for image messages in OpenAI chat completions
  - Support for both URL and base64 image formats
  - Mixed content parts generation (text + image) for OpenAI compatibility
  - Intelligent MIME type inference from file extensions (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF)
  - Clean logging with base64 data omitted from text envelopes
  - Graceful fallback to plain text if image URL construction fails

- **Structured Logging Infrastructure** - Professional logging system with Pino integration
  - Logger interface for consistent logging across all components
  - Configurable log levels with silent mode for stdio transport
  - Backwards compatibility by mirroring important logs to console
  - Transport-aware logging (silent stdio mode to avoid polluting MCP streams)

### Changed

- **Enhanced Message Processing** - Improved message handling with image support
  - Updated `buildOpenAIMessages()` to handle image message types
  - Added metadata support for image format and file extension
  - Maintains sender information in text part while displaying images
  - Backwards compatible with existing text message functionality

- **Core System Logging Integration** - All core components now use structured logging
  - Updated all handlers (OpenAIService, MessageHandler, TriggerHandler) to accept Logger
  - Replaced console.log/error calls with proper logger methods throughout codebase
  - Internal tools enhanced with logging support (memory tools, summarizer tools)
  - Utility functions updated with logger integration

- **Test Configuration** - Improved test reliability and consistency
  - Changed test script from 'vitest' to 'vitest run' for deterministic CI behavior
  - Updated factory tests to expect silent logging in stdio mode
  - Added comprehensive test coverage for image handling scenarios

### Fixed

- **CLI Version Function** - Made version display async and read from package.json
- **Memory Initialization** - Enhanced error handling with proper logging
- **Message Helper** - Added fallback console logging for compatibility when logger unavailable

### Dependencies

- Upgraded `@cubicler/cubicagentkit` from `^2.6.0` to `^2.6.1`
- Added `pino` `^9.3.2` for structured logging

### Notes

- **Zero Breaking Changes** - All existing APIs remain fully compatible
- **Enhanced Developer Experience** - Better debugging with structured logs and image support
- **Production Ready** - Silent stdio mode ensures clean MCP protocol communication
- **Comprehensive Test Coverage** - All new features fully tested with 240+ passing tests

## [2.6.0] - 2025-08-09

### Added

- **CubicAgentKit 2.6.0 support** - Upgraded to the latest version of CubicAgentKit for enhanced functionality and compatibility

### Changed

- **Updated CubicAgentKit dependency** to `^2.6.0` for latest features and improvements
- **Updated project version** to 2.6.0 to match CubicAgentKit version alignment
- **Enhanced README documentation** - Updated all version references from 2.3.x/2.5.x to 2.6.x throughout
- **Improved error handling** - Added null-safe checks in OpenAI service logging for better robustness
- **Organized client utilities** - Moved null agent client to dedicated `src/client/` directory for better code organization

### Fixed

- **Null safety improvements** - Added optional chaining for agent name, tools count, and trigger identifier logging
- **Documentation consistency** - Updated all Cubicler and CubicAgentKit version references to 2.6.x

### Dependencies

- Upgraded `@cubicler/cubicagentkit` from `^2.5.0` to `^2.6.0`

### Notes

- **Backward compatibility maintained** - All existing APIs and functionality remain unchanged
- **Zero breaking changes** - Seamless upgrade from 2.5.0 with full test suite passing (242 tests)
- **Ready for Cubicler 2.6** - Full compatibility with the latest Cubicler orchestration framework

## [2.5.0] - 2025-08-09

### Added

- **Comprehensive CLI argument support** - New command-line interface with extensive configuration options
  - OpenAI configuration: `--model`, `--temperature`, `--max-tokens`, `--api-key`, `--base-url`, `--timeout`, `--max-retries`, `--summarizer-model`
  - Transport configuration: `--transport`, `--cubicler-url`, `--sse-url`, `--agent-id`
  - Memory configuration: `--memory-db-path`, `--memory-max-tokens`
  - Dispatch configuration: `--session-max-iteration`, `--agent-port`
  - JWT configuration: `--jwt`, `--jwt-type`, `--jwt-token`
  - Help and version: `--help`, `--version`
- **Config merger utility** (`src/utils/config-merger.ts`) - Allows CLI arguments to override environment variables
- **CLI argument parser** (`src/utils/cli-args.ts`) - Robust command-line argument parsing with validation
- **MCP-style stdio usage examples** - Documentation for using as stdio agent spawned by Cubicler
- **Release notes documentation** (`release-notes.md`) - Comprehensive release documentation

### Changed

- **Simplified stdio transport** - Removed complex `STDIO_COMMAND`, `STDIO_ARGS`, and `STDIO_CWD` configuration
- **Updated CubicAgentKit dependency** to v2.5.0 for latest features and improvements
- **Enhanced main entry point** to support CLI argument parsing and merging with environment config
- **Standardized documentation** - Unified repository guidelines across `.github/copilot-instructions.md`, `CLAUDE.md`, and README
- **Updated CLI examples** - New usage patterns for MCP-style agent deployment
- **Default transport mode** - CLI usage defaults to `stdio` for better MCP compatibility

### Fixed

- **Removed deprecated stdio configuration** from environment schema and validation
- **Updated factory functions** to properly handle simplified stdio transport
- **Fixed test expectations** for simplified stdio transport (removed command/args validation)

### Documentation

- **Enhanced README** - Updated CLI usage section with comprehensive examples
- **Improved .env.example** - Simplified stdio transport documentation
- **Repository guidelines** - Consistent development standards across all documentation files

### Dependencies

- Upgraded `@cubicler/cubicagentkit` from `^2.4.0` to `^2.5.0`

### Breaking Changes

- **Stdio transport configuration** - `STDIO_COMMAND`, `STDIO_ARGS`, and `STDIO_CWD` environment variables are no longer supported
- Stdio agents now use parameter-less initialization for better MCP compatibility

## [2.4.0] - 2025-08-08

### Added

- New factory functions for advanced instantiation patterns:
  - `createOpenAIServiceFromConfig` – build service from an explicit validated config object
  - `createOpenAIServiceWithMemory` – supply custom `AgentClient`, `AgentServer`, and `MemoryRepository`
  - `createOpenAIServiceBasic` – supply custom transport primitives without memory
- Additional unit tests covering new factory functions (`openai-service-additional-factories.test.ts`).
- Extended README section: "Extended Factory Options" with usage examples and guidance.
- Internal refactor of factory file to expose advanced creation paths while preserving backward compatibility.
- CHANGELOG introduced.

### Changed

- Updated index exports to include newly added factory helpers.

### Notes

- Version already set to `2.4.0` in `package.json` (no further bump required).
- All tests passing (243 total) confirming backward compatibility.

## [2.3.x] - Previous

- Prior versions included OpenAI service creation via environment variables, memory tools, summarizer tools, and JWT support.

[2.6.4]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.4
[2.6.3]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.3
[2.6.2]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.2
[2.6.1]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.1
[2.6.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.0
[2.5.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.5.0
[2.4.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.4.0
