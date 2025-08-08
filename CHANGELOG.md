# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.6.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.6.0
[2.5.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.5.0
[2.4.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.4.0
