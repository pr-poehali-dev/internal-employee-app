-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы товаров
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы заявок
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    employee_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы позиций в заявке
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('шт', 'уп', 'коробка')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставка демо-пользователей
INSERT INTO users (username, password, is_admin) VALUES 
    ('admin', 'admin', TRUE),
    ('employee', 'employee', FALSE)
ON CONFLICT (username) DO NOTHING;

-- Вставка демо-товаров
INSERT INTO products (name, description, image_url) VALUES 
    ('Бумага для принтера А4', 'Белая офисная бумага, 500 листов', '/placeholder.svg'),
    ('Ручка шариковая синяя', 'Офисная шариковая ручка', '/placeholder.svg'),
    ('Папка-скоросшиватель', 'Пластиковая папка для документов', '/placeholder.svg'),
    ('Степлер металлический', 'Офисный степлер до 50 листов', '/placeholder.svg'),
    ('Скрепки 28мм', 'Металлические скрепки, 100шт', '/placeholder.svg'),
    ('Стикеры 76x76мм', 'Клейкие стикеры, желтые', '/placeholder.svg')
ON CONFLICT DO NOTHING;

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);