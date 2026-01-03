import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const envFile = 'src/environments/environment.development.ts';
const content = `
export const environment = {
  production: false,
  api_url: '${process.env.API_URL}',
  isDebug: ${process.env.IS_DEBUG}
};
`;

try {
  fs.writeFileSync(envFile, content);
} catch (err) {
  process.exit(1);
}
