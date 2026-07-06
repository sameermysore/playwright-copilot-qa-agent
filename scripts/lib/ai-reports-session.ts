import fs from 'node:fs';
import path from 'node:path';

export const AI_REPORTS_DIR_NAME = 'ai-reports';
export const LATEST_POINTER_FILE = 'latest';

export const SESSION_FILES = {
  failureReport: 'failure-report.md',
  failedTests: 'failed-tests.json',
  diagnosis: 'diagnosis.json',
  rootCauseReport: 'root-cause-report.md',
  fixerReport: 'fixer-report.md',
  rcaReport: 'rca-report.html',
} as const;

export type SessionFileName = (typeof SESSION_FILES)[keyof typeof SESSION_FILES];

/** Local time as `HH-mm_dd-mm-yyyy` (filesystem-safe hour:minute + dd/mm/yyyy). */
export function formatSessionTimestamp(date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${hours}-${minutes}_${day}-${month}-${year}`;
}

export function getAiReportsRoot(root = process.cwd()): string {
  return path.join(root, AI_REPORTS_DIR_NAME);
}

export function getLatestPointerPath(root = process.cwd()): string {
  return path.join(getAiReportsRoot(root), LATEST_POINTER_FILE);
}

export function relativeSessionPath(sessionId: string, fileName?: SessionFileName): string {
  const parts = [AI_REPORTS_DIR_NAME, sessionId];
  if (fileName) {
    parts.push(fileName);
  }
  return parts.join('/');
}

export function writeLatestPointer(sessionId: string, root = process.cwd()): void {
  const pointerPath = getLatestPointerPath(root);
  fs.mkdirSync(path.dirname(pointerPath), { recursive: true });
  fs.writeFileSync(pointerPath, `${relativeSessionPath(sessionId)}\n`, 'utf8');
}

export function readSessionDirRelative(root = process.cwd()): string | null {
  const pointerPath = getLatestPointerPath(root);
  if (!fs.existsSync(pointerPath)) {
    return null;
  }

  const sessionDir = fs.readFileSync(pointerPath, 'utf8').trim();
  return sessionDir || null;
}

export function readSessionId(root = process.cwd()): string | null {
  const sessionDir = readSessionDirRelative(root);
  if (!sessionDir) {
    return null;
  }

  return path.basename(sessionDir.replace(/\\/g, '/'));
}

export function getSessionDir(root = process.cwd(), sessionId?: string): string | null {
  if (sessionId) {
    return path.join(getAiReportsRoot(root), sessionId);
  }

  const relativeDir = readSessionDirRelative(root);
  if (!relativeDir) {
    return null;
  }

  return path.join(root, relativeDir.replace(/\\/g, '/'));
}

export function requireSessionDir(root = process.cwd()): string {
  const relativeDir = readSessionDirRelative(root);
  if (!relativeDir) {
    throw new Error(
      `No active AI reports session. Run playwright-rca first to create ai-reports/${LATEST_POINTER_FILE}.`
    );
  }

  const sessionDir = path.join(root, relativeDir.replace(/\\/g, '/'));
  if (!fs.existsSync(sessionDir)) {
    throw new Error(
      `Active session "${relativeDir}" not found. Run playwright-rca again.`
    );
  }

  return sessionDir;
}

export function sessionFilePath(
  fileName: SessionFileName,
  root = process.cwd(),
  sessionId?: string
): string {
  const sessionDir = sessionId ? path.join(getAiReportsRoot(root), sessionId) : requireSessionDir(root);
  return path.join(sessionDir, fileName);
}

export function createSession(root = process.cwd(), timestamp?: string): {
  sessionId: string;
  sessionDir: string;
} {
  const sessionId = timestamp ?? formatSessionTimestamp();
  const sessionDir = path.join(getAiReportsRoot(root), sessionId);

  fs.mkdirSync(sessionDir, { recursive: true });
  writeLatestPointer(sessionId, root);

  return { sessionId, sessionDir };
}

export function resolveSessionDir(root = process.cwd(), refresh = false): string {
  if (refresh) {
    const existing = getSessionDir(root);
    if (existing && fs.existsSync(existing)) {
      const sessionId = path.basename(existing);
      writeLatestPointer(sessionId, root);
      return existing;
    }
  }

  return createSession(root).sessionDir;
}
