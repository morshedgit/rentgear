/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { RuntimeEnv } from "./lib/storage";

declare global {
  namespace App {
    interface Locals {
      runtime?: {
        env?: RuntimeEnv;
      };
    }
  }
}

export {};
