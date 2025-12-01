const API_URL = 'https://functions.poehali.dev/017280ff-50e0-43e4-a019-4a3ff8821d7e';

export type Product = {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  in_stock?: boolean;
};

export type Order = {
  id: number;
  employee: string;
  status: 'pending' | 'collected' | 'completed';
  date: string;
  items: {
    quantity: number;
    unit: string;
    product_id: number;
    name: string;
    description: string;
    image_url: string;
  }[];
};

export type User = {
  id: number;
  username: string;
  is_admin: boolean;
};

export const api = {
  async login(username: string, password: string): Promise<{ user: User }> {
    const response = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },

  async getProducts(): Promise<{ products: Product[] }> {
    const response = await fetch(`${API_URL}?action=products`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    return response.json();
  },

  async createProduct(name: string, description: string, image_url: string = '/placeholder.svg', in_stock: boolean = true): Promise<{ product: Product }> {
    const response = await fetch(`${API_URL}?action=create_product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, image_url, in_stock })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create product');
    }
    
    return response.json();
  },

  async updateProduct(productId: number, data: { name?: string; description?: string; image_url?: string; in_stock?: boolean }): Promise<{ product: Product }> {
    const response = await fetch(`${API_URL}?action=update_product`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, ...data })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update product');
    }
    
    return response.json();
  },

  async getOrders(userId?: number): Promise<{ orders: Order[] }> {
    const url = userId 
      ? `${API_URL}?action=orders&user_id=${userId}`
      : `${API_URL}?action=orders`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    return response.json();
  },

  async createOrder(userId: number, employeeName: string, items: { product_id: number; quantity: number; unit: string }[]): Promise<{ order_id: number }> {
    const response = await fetch(`${API_URL}?action=create_order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, employee_name: employeeName, items })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create order');
    }
    
    return response.json();
  },

  async updateOrderStatus(orderId: number, status: 'pending' | 'collected' | 'completed'): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}?action=update_order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update order');
    }
    
    return response.json();
  }
};