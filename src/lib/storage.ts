import fs from "fs/promises";
import path from "path";

export const MAX_WORKSPACE_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB na firmu

export interface WorkspaceStorageStats {
  usedBytes: number;
  limitBytes: number;
  usedFormatted: string;
  limitFormatted: string;
  percentage: number;
  fileCount: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = (bytes / Math.pow(k, i)).toFixed(1);
  return `${val} ${sizes[i]}`;
}

export async function getWorkspaceStorageStats(workspaceSlug: string): Promise<WorkspaceStorageStats> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", workspaceSlug);
  let totalSize = 0;
  let fileCount = 0;

  async function walkDir(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch {
      // Složka ještě nemusí existovat
    }
  }

  await walkDir(uploadsDir);

  const percentage = Math.min(
    100,
    Number(((totalSize / MAX_WORKSPACE_STORAGE_BYTES) * 100).toFixed(1))
  );

  return {
    usedBytes: totalSize,
    limitBytes: MAX_WORKSPACE_STORAGE_BYTES,
    usedFormatted: formatBytes(totalSize),
    limitFormatted: "100 MB",
    percentage,
    fileCount,
  };
}
