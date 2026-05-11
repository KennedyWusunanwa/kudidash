import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT_DIR = process.cwd();
const DEFAULT_WORKBOOK_PATH = String.raw`C:\Users\kenne\OneDrive\Desktop\Producs\Product_Inventory.xlsx`;
const DEFAULT_ORG_ID = "49098bed-4258-4043-a0b2-ace1f062cc64";
const INVENTORY_WORKBOOK_BUCKET = "inventory-imports";

function parseEnvFile(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function loadLocalEnv() {
  const envPath = path.join(ROOT_DIR, ".env.local");
  const envContent = await fs.readFile(envPath, "utf8");
  parseEnvFile(envContent);
}

async function ensureBucket(supabase) {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw bucketsError;
  if (buckets.some((bucket) => bucket.name === INVENTORY_WORKBOOK_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(INVENTORY_WORKBOOK_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  });
  if (createError && !String(createError.message).includes("already exists")) {
    throw createError;
  }
}

async function main() {
  await loadLocalEnv();

  const workbookPath = process.argv[2] || DEFAULT_WORKBOOK_PATH;
  const orgId = process.argv[3] || process.env.KUDIDASH_IMPORT_ORG_ID || DEFAULT_ORG_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await ensureBucket(supabase);

  const fileBuffer = await fs.readFile(workbookPath);
  const objectPath = `${orgId}/${path.basename(workbookPath)}`;
  const { error: uploadError } = await supabase.storage
    .from(INVENTORY_WORKBOOK_BUCKET)
    .upload(objectPath, fileBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from(INVENTORY_WORKBOOK_BUCKET)
    .createSignedUrl(objectPath, 60 * 60);
  if (signedError) throw signedError;

  console.log(
    JSON.stringify(
      {
        bucket: INVENTORY_WORKBOOK_BUCKET,
        orgId,
        objectPath,
        signedUrl: signed.signedUrl,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
