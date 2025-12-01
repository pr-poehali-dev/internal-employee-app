import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления товарами и заявками в системе заказа хозтоваров
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', '')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return error_response('DATABASE_URL not configured', 500)
    
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST' and action == 'login':
            return handle_login(conn, event)
        elif method == 'GET' and action == 'products':
            return handle_get_products(conn)
        elif method == 'POST' and action == 'create_product':
            return handle_create_product(conn, event)
        elif method == 'PUT' and action == 'update_product':
            return handle_update_product(conn, event)
        elif method == 'GET' and action == 'orders':
            return handle_get_orders(conn, event)
        elif method == 'POST' and action == 'create_order':
            return handle_create_order(conn, event)
        elif method == 'PUT' and action == 'update_order':
            return handle_update_order(conn, event)
        else:
            return error_response('Not found', 404)
    finally:
        conn.close()

def handle_login(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    username = body.get('username', '')
    password = body.get('password', '')
    
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, is_admin FROM users WHERE username = %s AND password = %s",
        (username, password)
    )
    user = cursor.fetchone()
    cursor.close()
    
    if not user:
        return error_response('Invalid credentials', 401)
    
    return success_response({
        'user': dict(user)
    })

def handle_get_products(conn) -> Dict[str, Any]:
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, image_url, in_stock FROM products ORDER BY id")
    products = cursor.fetchall()
    cursor.close()
    
    return success_response({
        'products': [dict(p) for p in products]
    })

def handle_create_product(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    name = body.get('name', '')
    description = body.get('description', '')
    image_url = body.get('image_url', '/placeholder.svg')
    in_stock = body.get('in_stock', True)
    
    if not name or not description:
        return error_response('Name and description required', 400)
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, description, image_url, in_stock) VALUES (%s, %s, %s, %s) RETURNING id, name, description, image_url, in_stock",
        (name, description, image_url, in_stock)
    )
    product = cursor.fetchone()
    conn.commit()
    cursor.close()
    
    return success_response({
        'product': dict(product)
    })

def handle_get_orders(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get('queryStringParameters', {}) or {}
    user_id = params.get('user_id')
    
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute("""
            SELECT o.id, o.employee_name, o.status, o.created_at
            FROM orders o
            WHERE o.user_id = %s
            ORDER BY o.created_at DESC
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT o.id, o.employee_name, o.status, o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
        """)
    
    orders = cursor.fetchall()
    orders_list = []
    
    for order in orders:
        cursor.execute("""
            SELECT oi.quantity, oi.unit, p.id as product_id, p.name, p.description, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = %s
        """, (order['id'],))
        items = cursor.fetchall()
        
        orders_list.append({
            'id': order['id'],
            'employee': order['employee_name'],
            'status': order['status'],
            'date': order['created_at'].strftime('%d.%m.%Y') if order['created_at'] else '',
            'items': [dict(item) for item in items]
        })
    
    cursor.close()
    return success_response({'orders': orders_list})

def handle_create_order(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('user_id')
    employee_name = body.get('employee_name', '')
    items = body.get('items', [])
    
    if not user_id or not items:
        return error_response('user_id and items required', 400)
    
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO orders (user_id, employee_name, status) VALUES (%s, %s, 'pending') RETURNING id",
        (user_id, employee_name)
    )
    order_id = cursor.fetchone()['id']
    
    for item in items:
        cursor.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, unit) VALUES (%s, %s, %s, %s)",
            (order_id, item['product_id'], item['quantity'], item['unit'])
        )
    
    conn.commit()
    cursor.close()
    
    return success_response({'order_id': order_id})

def handle_update_product(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    product_id = body.get('product_id')
    name = body.get('name')
    description = body.get('description')
    image_url = body.get('image_url')
    in_stock = body.get('in_stock')
    
    if not product_id:
        return error_response('product_id required', 400)
    
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = %s")
        params.append(name)
    if description is not None:
        updates.append("description = %s")
        params.append(description)
    if image_url is not None:
        updates.append("image_url = %s")
        params.append(image_url)
    if in_stock is not None:
        updates.append("in_stock = %s")
        params.append(in_stock)
    
    if not updates:
        return error_response('No fields to update', 400)
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(product_id)
    
    query = f"UPDATE products SET {', '.join(updates)} WHERE id = %s RETURNING id, name, description, image_url, in_stock"
    cursor.execute(query, params)
    product = cursor.fetchone()
    conn.commit()
    cursor.close()
    
    return success_response({'product': dict(product)})

def handle_update_order(conn, event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    order_id = body.get('order_id')
    status = body.get('status', '')
    
    if status not in ['pending', 'collected', 'completed']:
        return error_response('Invalid status', 400)
    
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE orders SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
        (status, order_id)
    )
    conn.commit()
    cursor.close()
    
    return success_response({'success': True})

def success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data),
        'isBase64Encoded': False
    }

def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }