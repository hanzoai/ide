import fs from 'node:fs';
import path from 'node:path';

const jsonPath = process.env.JSON_PATH;
if (!jsonPath) {
  throw new Error('JSON_PATH environment variable is required');
}

const version = process.env.VERSION || '0.1.0';
const notes = process.env.NOTES || `Hanzo IDE v${version}`;
const pubDate = process.env.PUB_DATE || new Date().toISOString();

const platforms = {};
const add = (key, signature, url) => {
  if (signature && signature.trim().length > 0 && url && url.trim().length > 0) {
    platforms[key] = { signature: signature.trim(), url: url.trim() };
  }
};

add('darwin-aarch64', process.env.DARWIN_AARCH64_SIGNATURE, process.env.DARWIN_AARCH64_URL);
add('darwin-x86_64', process.env.DARWIN_AARCH64_SIGNATURE, process.env.DARWIN_AARCH64_URL);
add('linux-x86_64', process.env.LINUX_x86_64_SIGNATURE, process.env.LINUX_x86_64_URL);
add('linux-aarch64', process.env.LINUX_AARCH64_SIGNATURE, process.env.LINUX_AARCH64_URL);
add('windows-x86_64', process.env.WINDOWS_x86_64_SIGNATURE, process.env.WINDOWS_x86_64_URL);

if (Object.keys(platforms).length === 0) {
  console.warn('Warning: No platform produced a signed updater bundle; skipping writing empty updates manifest.');
  process.exit(0);
}

const updatesJson = {
  version,
  notes,
  pub_date: pubDate,
  platforms,
};

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(updatesJson, null, 2));
console.log(`Successfully generated updates manifest at ${jsonPath}`);
