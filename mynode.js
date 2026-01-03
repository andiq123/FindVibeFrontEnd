import { writeFile } from "fs/promises";
import { join, dirname } from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: "src/.env" });

const environmentContent = `export const environment = {
  API_URL: '${process.env.API_URL}',
};
`;

const targetPath = join(
  __dirname,
  "./src/environments/environment.development.ts",
);

try {
  await writeFile(targetPath, environmentContent);
  console.log(
    "\x1b[32m%s\x1b[0m",
    "✅ Successfully generated environment.development.ts",
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
