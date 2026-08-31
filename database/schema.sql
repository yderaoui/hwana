PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  category_name TEXT NOT NULL,
  subcategory TEXT,
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  short_fr TEXT,
  short_ar TEXT,
  short_en TEXT,
  description_fr TEXT,
  description_ar TEXT,
  description_en TEXT,
  regular_price REAL NOT NULL,
  sale_price INTEGER NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 30,
  total_stock INTEGER NOT NULL DEFAULT 0,
  variant_count INTEGER NOT NULL DEFAULT 0,
  purchasable INTEGER NOT NULL DEFAULT 0,
  image_status TEXT,
  source_page TEXT,
  source_workbook TEXT
);

CREATE TABLE IF NOT EXISTS product_colors (
  product_id TEXT NOT NULL,
  color_id TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_ar TEXT,
  label_en TEXT,
  hex TEXT,
  image_path TEXT NOT NULL,
  image_kind TEXT,
  PRIMARY KEY (product_id, color_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  barcode TEXT,
  color_id TEXT,
  size TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  regular_price REAL NOT NULL,
  sale_price INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id, color_id) REFERENCES product_colors(product_id, color_id)
);

CREATE TABLE IF NOT EXISTS build_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON variants(stock);

CREATE VIEW IF NOT EXISTS ready_products AS
SELECT
  p.*,
  COUNT(DISTINCT pc.color_id) AS color_count,
  COUNT(v.id) AS sku_count
FROM products p
LEFT JOIN product_colors pc ON pc.product_id = p.id
LEFT JOIN variants v ON v.product_id = p.id
WHERE p.purchasable = 1
GROUP BY p.id;

CREATE VIEW IF NOT EXISTS inventory_by_brand AS
SELECT
  p.brand,
  COUNT(DISTINCT p.id) AS product_count,
  COUNT(v.id) AS variant_count,
  SUM(v.stock) AS total_stock
FROM products p
JOIN variants v ON v.product_id = p.id
GROUP BY p.brand;

