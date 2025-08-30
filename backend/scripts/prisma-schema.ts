import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const prismaDir = path.join(backendDir, "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const backupPath = path.join(prismaDir, "schema.prisma.__dev_backup__");

export async function ensurePrismaProvider(provider: "sqlite" | "postgresql"): Promise<{ changed: boolean; original?: string }>
{
  const current = await fs.readFile(schemaPath, "utf8");
  if (current.includes(`provider = "${provider}"`)) {
    return { changed: false };
  }

  // Only switch if we recognize the current provider to be one of the two
  const knownProviders = ["sqlite", "postgresql"] as const;
  const hasKnownProvider = knownProviders.some((p) => current.includes(`provider = "${p}"`));
  if (!hasKnownProvider) {
    // Unknown provider; do not modify
    return { changed: false };
  }

  const original = current;
  await fs.writeFile(backupPath, original, "utf8");

  let swapped = original;
  for (const p of knownProviders) {
    if (p !== provider && swapped.includes(`provider = "${p}"`)) {
      swapped = swapped.replace(`provider = "${p}"`, `provider = "${provider}"`);
      break;
    }
  }

  if (swapped === original) {
    return { changed: false };
  }

  await fs.writeFile(schemaPath, swapped, "utf8");
  return { changed: true, original };
}

export async function restorePrismaSchemaIfChanged(changed: boolean, original?: string) {
  if (!changed) return;
  try {
    const fromDisk = original ?? (await fs.readFile(backupPath, "utf8").catch(() => undefined));
    if (fromDisk) {
      await fs.writeFile(schemaPath, fromDisk, "utf8");
    }
  } finally {
    await fs.rm(backupPath, { force: true }).catch(() => {});
  }
}

export function resolveSqliteFileFromEnvValue(value?: string) {
  if (!value || typeof value !== "string") return undefined;
  if (!value.startsWith("file:")) return undefined;
  const withoutScheme = value.slice(5);
  const filePart = withoutScheme.split("?")[0];
  const normalized = filePart.replace(/^\/*/, "");
  return path.isAbsolute(filePart) ? filePart : path.resolve(backendDir, normalized);
}


