import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

import { loadEnv } from "@package/utils";

loadEnv("packages/database/.env");

export const env = createEnv({
  server: {
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().min(1).max(65535),
  },
  runtimeEnv: process.env,
});
