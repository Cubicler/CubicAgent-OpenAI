## 🎉 What's New in v2.4.0

### ✨ Added

- **New factory functions for advanced instantiation patterns:**
  - `createOpenAIServiceFromConfig` – build service from an explicit validated config object
  - `createOpenAIServiceWithMemory` – supply custom `AgentClient`, `AgentServer`, and `MemoryRepository`
  - `createOpenAIServiceBasic` – supply custom transport primitives without memory
- **Enhanced test coverage:** Additional unit tests covering new factory functions (`openai-service-additional-factories.test.ts`)
- **Extended documentation:** New README section "Extended Factory Options" with usage examples and guidance
- **Internal improvements:** Factory file refactor to expose advanced creation paths while preserving backward compatibility
- **Project documentation:** CHANGELOG introduced for better version tracking

### 🔄 Changed

- Updated index exports to include newly added factory helpers

### 🧪 Quality Assurance

- **All tests passing:** 243 total tests confirming backward compatibility
- **No breaking changes:** Existing functionality remains unchanged
- **TypeScript compliance:** Full type safety maintained

### 🔗 Compatibility

- **CubicAgentKit:** 2.4.0
- **OpenAI SDK:** ^4.63.0
- **Node.js:** >=18.0.0

### 📦 Installation

```bash
npm install @cubicler/cubicagent-openai@2.4.0
```

### 🚀 Quick Start

```typescript
import { createOpenAIServiceFromConfig } from '@cubicler/cubicagent-openai';

const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o'
  },
  transport: {
    mode: 'http' as const,
    url: 'http://localhost:3000'
  }
};

const service = await createOpenAIServiceFromConfig(config);
```

---
**Full Changelog:** [v2.3.7...v2.4.0](https://github.com/Cubicler/CubicAgent-OpenAI/compare/v2.3.7...v2.4.0)
