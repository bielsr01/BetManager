import { cp, mkdir, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sourceDir = path.resolve(__dirname, "..", "server", "pdf");
  const targetDir = path.resolve(__dirname, "..", "dist", "pdf");

  try {
    await stat(sourceDir);
  } catch (err) {
    console.warn(`[copy-pdf-assets] Pasta de origem não encontrada: ${sourceDir}`);
    return;
  }

  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
  console.log(`[copy-pdf-assets] PDFs copiados para ${targetDir}`);
}

main().catch((err) => {
  console.error("[copy-pdf-assets] Falhou ao copiar PDFs:", err);
  process.exit(1);
});

