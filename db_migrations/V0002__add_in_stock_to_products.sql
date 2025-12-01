-- Добавление колонки in_stock в таблицу products
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE;

-- Обновление существующих товаров (все товары в наличии по умолчанию)
UPDATE products SET in_stock = TRUE WHERE in_stock IS NULL;