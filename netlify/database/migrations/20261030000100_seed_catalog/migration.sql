-- Sample catalog (same data as server/prisma/seed.js). Users are not seeded here.

INSERT INTO "Category" ("id", "name", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Smartphones', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Laptops', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Headphones', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Smartwatches', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Computer Components', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Product" ("id", "name", "description", "price", "image", "brand", "stock", "specs", "categoryId", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.description, v.price, v.image, v.brand, v.stock, v.specs, c."id", CURRENT_TIMESTAMP
FROM (VALUES
  ('Nova X12 Smartphone', 'Nova X12 Smartphone from Nova. Genuine product with official warranty and fast delivery.', 54999, '/products/nova-x12.svg', 'Nova', 25, ARRAY['6.7" AMOLED 120Hz', '8GB RAM / 256GB', '5000mAh battery'], 'Smartphones'),
  ('Pixelite 9 5G', 'Pixelite 9 5G from Pixelite. Genuine product with official warranty and fast delivery.', 42999, '/products/pixelite-9.svg', 'Pixelite', 18, ARRAY['6.4" OLED', '12GB RAM / 256GB', '50MP camera'], 'Smartphones'),
  ('AeroBook 14 Laptop', 'AeroBook 14 Laptop from Aero. Genuine product with official warranty and fast delivery.', 89999, '/products/aerobook-14.svg', 'Aero', 10, ARRAY['Core i5 13th Gen', '16GB RAM / 512GB SSD', '14" FHD IPS'], 'Laptops'),
  ('Forge G5 Gaming Laptop', 'Forge G5 Gaming Laptop from Forge. Genuine product with official warranty and fast delivery.', 139999, '/products/forge-g5.svg', 'Forge', 6, ARRAY['Ryzen 7', 'RTX 4060 8GB', '165Hz display'], 'Laptops'),
  ('Pulse ANC Headphones', 'Pulse ANC Headphones from Pulse. Genuine product with official warranty and fast delivery.', 8999, '/products/pulse-anc.svg', 'Pulse', 40, ARRAY['Active noise cancelling', '40h battery', 'Bluetooth 5.3'], 'Headphones'),
  ('Buds Mini Wireless', 'Buds Mini Wireless from Pulse. Genuine product with official warranty and fast delivery.', 2999, '/products/buds-mini.svg', 'Pulse', 60, ARRAY['Touch controls', '24h with case', 'IPX4'], 'Headphones'),
  ('Tempo Watch S2', 'Tempo Watch S2 from Tempo. Genuine product with official warranty and fast delivery.', 7499, '/products/tempo-watch-s2.svg', 'Tempo', 30, ARRAY['1.8" AMOLED', 'GPS + heart rate', '7 day battery'], 'Smartwatches'),
  ('Tempo Fit Band', 'Tempo Fit Band from Tempo. Genuine product with official warranty and fast delivery.', 2499, '/products/tempo-fit-band.svg', 'Tempo', 4, ARRAY['SpO2 tracking', '14 day battery', 'Water resistant'], 'Smartwatches'),
  ('Ryzen 5 5600 Processor', 'Ryzen 5 5600 Processor from AMD. Genuine product with official warranty and fast delivery.', 14999, '/products/ryzen-5-5600.svg', 'AMD', 15, ARRAY['6 cores / 12 threads', 'AM4 socket', 'Up to 4.4GHz'], 'Computer Components'),
  ('Nitro 16GB DDR4 RAM', 'Nitro 16GB DDR4 RAM from Nitro. Genuine product with official warranty and fast delivery.', 4299, '/products/nitro-ddr4.svg', 'Nitro', 50, ARRAY['3200MHz', 'CL16', 'Heat spreader'], 'Computer Components'),
  ('Vault 1TB NVMe SSD', 'Vault 1TB NVMe SSD from Vault. Genuine product with official warranty and fast delivery.', 6499, '/products/vault-nvme.svg', 'Vault', 35, ARRAY['PCIe 4.0', '7000MB/s read', '5 year warranty'], 'Computer Components')
) AS v(name, description, price, image, brand, stock, specs, category)
JOIN "Category" c ON c."name" = v.category;
