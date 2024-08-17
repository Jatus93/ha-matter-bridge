import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import recommendedPrettier from 'eslint-plugin-prettier/recommended';

export default [
    { ignores: ['build/'] },
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            curly: ['error'],
            'no-empty-function': [
                'off',
                {
                    allow: null,
                },
            ],
            'require-await': ['error'],
        },
    },
    recommendedPrettier,
];
