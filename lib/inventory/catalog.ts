import productCatalogJson from "./product-catalog.generated.json";

export const PRODUCT_IMAGE_BUCKET = "product-images";

export interface ProductCatalogItem {
  folder: string;
  filename: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  description: string;
  sizeWeight: string;
  unitType: string;
  unitsPerCase: string;
  barcode: string;
  countryOfOrigin: string;
  supplier: string;
  storageConditions: string;
  notes: string;
}

export const productCatalog = productCatalogJson as ProductCatalogItem[];

const productCatalogBySku = new Map(
  productCatalog.map((item) => [normalizeSku(item.sku), item] as const)
);

export function normalizeSku(sku: string) {
  return sku.trim().toUpperCase();
}

export function getCatalogItemBySku(sku: string | null | undefined) {
  if (!sku) return null;
  return productCatalogBySku.get(normalizeSku(sku)) ?? null;
}

export function getProductImageObjectPath(orgId: string, sku: string) {
  const item = getCatalogItemBySku(sku);
  if (!item) return null;
  const extensionIndex = item.filename.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? item.filename.slice(extensionIndex).toLowerCase() : ".jpg";
  return `${orgId}/${normalizeSku(sku)}${extension}`;
}

export function getProductImagePublicUrl(orgId: string, sku: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const objectPath = getProductImageObjectPath(orgId, sku);
  if (!baseUrl || !objectPath) return null;
  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`;
}
