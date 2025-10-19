import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', 'docs/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 9,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2015,
        MediaStreamConstraints: 'readonly',
        MediaTrackConstraints: 'readonly',
        RTCSessionDescriptionInit: 'readonly',
        EventListenerOrEventListenerObject: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'no-console': 'off',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  prettierConfig,
];
