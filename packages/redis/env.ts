import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

import { loadEnv } from "@package/utils";
loadEnv("packages/redis/.env");

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url().min(10, "Redis URL must be a valid URL"),
  },
  runtimeEnv: process.env,
});
