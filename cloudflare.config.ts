import { bindings, defineConfig } from "cf/config";

import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "cowork-square",
    compatibilityDate: "2026-10-30",
    workersDev: true,
    entrypoint,
    // web/dist は wrangler.config.ts の assetsDirectory で指定。
    // /api/* だけ Worker が先に処理し、それ以外は SPA を配信する。
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    observability: {
      enabled: true,
      traces: {
        enabled: true,
      },
    },
    env: {
      SQUARE_ENVIRONMENT: bindings.text("sandbox"),
      // 同一オリジン配信時は不要。Vite 開発時（別ポート）用。
      ALLOWED_ORIGINS: bindings.text(
        "http://localhost:5173,http://127.0.0.1:5173",
      ),
      SQUARE_API_VERSION: bindings.text("2025-04-16"),
      SQUARE_ACCESS_TOKEN: bindings.secret(),
      SQUARE_DEVICE_ID: bindings.secret(),
      SQUARE_LOCATION_ID: bindings.secret(),
      WORKER_API_KEY: bindings.secret(),
    },
  },
});
