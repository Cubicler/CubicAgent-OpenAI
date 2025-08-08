# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.4.0]: https://github.com/Cubicler/CubicAgent-OpenAI/releases/tag/v2.4.0
