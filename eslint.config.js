import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      
      // General JavaScript rules
      'no-console': 'off', // Allow console logs for logging
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
    },
  },
  {
    files: ['src/openai-cubicagent.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn', // OpenAI API returns any
      '@typescript-eslint/no-unsafe-argument': 'warn', // OpenAI API accepts any
    },
  },
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // Keep strict rules but allow necessary test patterns
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for tests
      '@typescript-eslint/no-unsafe-assignment': 'off', // Allow for mocking
      '@typescript-eslint/no-unsafe-member-access': 'off', // Allow for mocking
      '@typescript-eslint/no-unsafe-call': 'off', // Allow for mocking
      '@typescript-eslint/no-unsafe-argument': 'off', // Allow for mocking
      '@typescript-eslint/no-unsafe-return': 'off', // Allow for mocking
      '@typescript-eslint/unbound-method': 'off', // Allow for mocking
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.config.js',
      'coverage/**',
    ],
  },
);
