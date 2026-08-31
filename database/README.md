# HAWANA Product Database

The local product database is generated from `src/data/catalog.json`.

Build it with:

```bash
npm run db:products
```

Default output:

```text
database/hawana-products.sqlite
```

Main tables:

- `products`: one row per storefront product family
- `product_colors`: one row per product color/image
- `variants`: one row per stock SKU, including barcode, size, color, price, and stock

Useful views:

- `ready_products`: purchasable products with color and SKU counts
- `inventory_by_brand`: product, variant, and stock totals by brand

