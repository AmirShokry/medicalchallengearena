import path from "node:path";
import dotenv from "dotenv";
import { workspaceRootSync } from "workspace-root";

const loadEnv = (target: string) => {
  const rootDir = workspaceRootSync();
  if (!rootDir)
    throw Error("Could not find workspace root for loading .env file");
  const envDir = path.join(rootDir, target);
  dotenv.config({ path: envDir });
};
export default loadEnv;
