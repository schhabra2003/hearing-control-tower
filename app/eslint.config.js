// Lint for Hearing Desk: the recommended JavaScript and typescript-eslint rules and
// the React hooks rules, on src/ only. `npm run lint` must report zero errors.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist*/**', 'node_modules/**', 'engine/**', 'engine-check/**', 'scripts/**', 'server/**', 'src/data/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
