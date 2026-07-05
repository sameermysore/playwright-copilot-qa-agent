import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readEnvFile(): Record<string, string> {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function resolveAppRepoPath(): string | null {
  const configured = process.env.APP_REPO_PATH?.trim() || readEnvFile().APP_REPO_PATH?.trim();
  if (!configured) {
    return null;
  }

  const resolved = path.resolve(ROOT, configured);

  try {
    if (fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  } catch {
    return null;
  }

  return null;
}

const appRepoPath = resolveAppRepoPath();

if (appRepoPath) {
  process.stdout.write(appRepoPath);
  process.exit(0);
}

process.exit(1);
