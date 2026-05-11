import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT_DIR = process.cwd();
const DEFAULT_SOURCE_DIR = String.raw`C:\Users\kenne\OneDrive\Desktop\Producs`;
const DEFAULT_ORG_ID = "49098bed-4258-4043-a0b2-ace1f062cc64";
const PRODUCT_IMAGE_BUCKET = "product-images";

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

function normalizeSku(sku) {
  return sku.trim().toUpperCase();
}

function getObjectPath(orgId, filename, sku) {
  const extension = path.extname(filename).toLowerCase() || ".jpg";
  return `${orgId}/${normalizeSku(sku)}${extension}`;
}

function getContentType(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

async function ensureBucket(supabase) {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw bucketsError;
  if (buckets.some((bucket) => bucket.name === PRODUCT_IMAGE_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (createError && !String(createError.message).includes("already exists")) {
    throw createError;
  }
}

async function uploadCatalogImages(supabase, sourceDir, orgId, catalog) {
  let uploaded = 0;
  for (const item of catalog) {
    const localPath = path.join(sourceDir, item.folder, item.filename);
    const fileBuffer = await fs.readFile(localPath);
    const objectPath = getObjectPath(orgId, item.filename, item.sku);
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(objectPath, fileBuffer, {
        contentType: getContentType(item.filename),
        upsert: true,
      });
    if (error) {
      throw new Error(`Failed to upload ${item.filename}: ${error.message}`);
    }
    uploaded += 1;
  }
  return uploaded;
}

async function upsertInventoryItems(supabase, orgId, catalog) {
  const { data: existingRows, error: existingError } = await supabase
    .from("inventory_items")
    .select(
      "sku,sale_price,purchase_price,quantity_on_hand,valuation_method,is_active,inventory_account_id,cogs_account_id,revenue_account_id"
    )
    .eq("org_id", orgId);
  if (existingError) throw existingError;

  const existingBySku = new Map((existingRows ?? []).map((row) => [normalizeSku(row.sku), row]));
  const payload = catalog.map((item) => {
    const existing = existingBySku.get(normalizeSku(item.sku));
    return {
      org_id: orgId,
      sku: item.sku,
      name: item.name,
      sale_price: Number(existing?.sale_price ?? 0),
      purchase_price: Number(existing?.purchase_price ?? 0),
      quantity_on_hand: Number(existing?.quantity_on_hand ?? 0),
      valuation_method: existing?.valuation_method ?? "weighted_average",
      is_active: existing?.is_active ?? true,
      inventory_account_id: existing?.inventory_account_id ?? null,
      cogs_account_id: existing?.cogs_account_id ?? null,
      revenue_account_id: existing?.revenue_account_id ?? null,
    };
  });

  const { error: upsertError } = await supabase
    .from("inventory_items")
    .upsert(payload, { onConflict: "org_id,sku" });
  if (upsertError) throw upsertError;

  return payload.length;
}

async function main() {
  await loadLocalEnv();
  const sourceDir = process.argv[2] || DEFAULT_SOURCE_DIR;
  const orgId = process.argv[3] || process.env.KUDIDASH_IMPORT_ORG_ID || DEFAULT_ORG_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  const catalogPath = path.join(ROOT_DIR, "lib", "inventory", "product-catalog.generated.json");
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  await ensureBucket(supabase);
  const uploadedCount = await uploadCatalogImages(supabase, sourceDir, orgId, catalog);
  const upsertedCount = await upsertInventoryItems(supabase, orgId, catalog);

  const { count, error: countError } = await supabase
    .from("inventory_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);
  if (countError) throw countError;

  console.log(
    JSON.stringify(
      {
        orgId,
        bucket: PRODUCT_IMAGE_BUCKET,
        uploadedImages: uploadedCount,
        upsertedInventoryRows: upsertedCount,
        totalInventoryRowsForOrg: count,
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
