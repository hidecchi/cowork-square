import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig({
  // Vite のビルド出力を Worker の静的アセットとして配信する
  assetsDirectory: "./web/dist",
});
