import { defineConfig } from "@richardscull/eslint-config";

export default defineConfig(undefined, {
  // Modules expose stateless operations as abstract classes with static methods.
  rules: { "unicorn/no-static-only-class": "off" },
});
