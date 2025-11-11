import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jsdoc from 'eslint-plugin-jsdoc';

export default defineConfig([
  jsdoc.configs['flat/recommended'],
  { files: ["**/*.{js,mjs,cjs,jsx}"], plugins: { js, jsdoc }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },

  {
    name: "syntax-rules",
    rules: {
      semi: "error",
    },
  },

  {
    name: "enforce-jsdocs",
    rules: {
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/valid-types': 'error',
    }
  }
]);
