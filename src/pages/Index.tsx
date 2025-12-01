import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { api, type Product as ApiProduct, type Order as ApiOrder, type User } from '@/lib/api';

type Product = {
  id: number;
  name: string;
  description: string;
  image: string;
};

type CartItem = {
  product: Product;
  quantity: number;
  unit: 'шт' | 'уп' | 'коробка';
};

type Order = {
  id: number;
  items: CartItem[];
  date: string;
  status: 'pending' | 'collected' | 'completed';
  employee: string;
};

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Бумага для принтера А4',
    description: 'Белая офисная бумага, 500 листов',
    image: '/placeholder.svg'
  },
  {
    id: 2,
    name: 'Ручка шариковая синяя',
    description: 'Офисная шариковая ручка',
    image: '/placeholder.svg'
  },
  {
    id: 3,
    name: 'Папка-скоросшиватель',
    description: 'Пластиковая папка для документов',
    image: '/placeholder.svg'
  },
  {
    id: 4,
    name: 'Степлер металлический',
    description: 'Офисный степлер до 50 листов',
    image: '/placeholder.svg'
  },
  {
    id: 5,
    name: 'Скрепки 28мм',
    description: 'Металлические скрепки, 100шт',
    image: '/placeholder.svg'
  },
  {
    id: 6,
    name: 'Стикеры 76x76мм',
    description: 'Клейкие стикеры, желтые',
    image: '/placeholder.svg'
  }
];

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<'шт' | 'уп' | 'коробка'>('шт');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoggedIn) {
      loadProducts();
      loadOrders();
    }
  }, [isLoggedIn]);

  const loadProducts = async () => {
    try {
      const { products } = await api.getProducts();
      setAdminProducts(products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image_url || '/placeholder.svg'
      })));
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить товары',
        variant: 'destructive'
      });
    }
  };

  const loadOrders = async () => {
    try {
      const { orders: apiOrders } = await api.getOrders(isAdmin ? undefined : currentUserId);
      setOrders(apiOrders.map(o => ({
        id: o.id,
        employee: o.employee,
        status: o.status,
        date: o.date,
        items: o.items.map(item => ({
          product: {
            id: item.product_id,
            name: item.name,
            description: item.description,
            image: item.image_url
          },
          quantity: item.quantity,
          unit: item.unit as 'шт' | 'уп' | 'коробка'
        }))
      })));
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заявки',
        variant: 'destructive'
      });
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    try {
      const { user } = await api.login(username, password);
      setIsAdmin(user.is_admin);
      setCurrentUser(user.username);
      setCurrentUserId(user.id);
      setIsLoggedIn(true);
    } catch (error) {
      toast({
        title: 'Ошибка входа',
        description: 'Неверное имя пользователя или пароль',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(
      item => item.product.id === product.id && item.unit === selectedUnit
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id && item.unit === selectedUnit
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity, unit: selectedUnit }]);
    }

    toast({
      title: 'Добавлено в корзину',
      description: `${product.name} - ${quantity} ${selectedUnit}`
    });
    setSelectedProduct(null);
    setQuantity(1);
  };

  const removeFromCart = (productId: number, unit: string) => {
    setCart(cart.filter(item => !(item.product.id === productId && item.unit === unit)));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit: item.unit
      }));

      await api.createOrder(currentUserId, currentUser, items);
      await loadOrders();
      setCart([]);
      setShowCart(false);

      toast({
        title: 'Заявка отправлена',
        description: 'Ваша заявка успешно отправлена администратору'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить заявку',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, status: Order['status']) => {
    setLoading(true);
    try {
      await api.updateOrderStatus(orderId, status);
      await loadOrders();

      toast({
        title: 'Статус обновлен',
        description: `Заявка #${orderId} отмечена как ${status === 'collected' ? 'собрана' : 'выполнена'}`
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="Package" size={32} className="text-primary" />
              <div>
                <h1 className="text-xl font-bold">Хозтовары</h1>
                <p className="text-sm text-muted-foreground">{currentUser}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isAdmin && (
                <Button variant="outline" size="icon" className="relative" onClick={() => setShowCart(true)}>
                  <Icon name="ShoppingCart" size={20} />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                      {cart.length}
                    </Badge>
                  )}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setIsLoggedIn(false)}>
                <Icon name="LogOut" size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isAdmin ? (
          <AdminPanel
            products={adminProducts}
            setProducts={setAdminProducts}
            orders={orders}
            updateOrderStatus={updateOrderStatus}
          />
        ) : (
          <Tabs defaultValue="catalog" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="catalog">Каталог</TabsTrigger>
              <TabsTrigger value="history">История заявок</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Хозяйственные товары</h2>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Icon name="LayoutGrid" size={20} />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <Icon name="List" size={20} />
                  </Button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {adminProducts.map(product => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${viewMode === 'list' ? 'flex flex-row' : ''}`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <div className="aspect-square overflow-hidden bg-gray-100">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <CardHeader>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>{product.description}</CardDescription>
                        </CardHeader>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-gray-100">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 p-4">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <h2 className="text-2xl font-bold mb-4">История заявок</h2>
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Icon name="PackageOpen" size={48} className="text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">У вас пока нет заявок</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Заявка #{order.id}</CardTitle>
                          <Badge variant={
                            order.status === 'completed' ? 'default' :
                            order.status === 'collected' ? 'secondary' : 'outline'
                          }>
                            {order.status === 'pending' && 'В обработке'}
                            {order.status === 'collected' && 'Собрана'}
                            {order.status === 'completed' && 'Выполнена'}
                          </Badge>
                        </div>
                        <CardDescription>{order.date}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.product.name}</span>
                              <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>{selectedProduct?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Единица измерения</Label>
              <Select value={selectedUnit} onValueChange={(v) => setSelectedUnit(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="шт">Штуки (шт)</SelectItem>
                  <SelectItem value="уп">Упаковки (уп)</SelectItem>
                  <SelectItem value="коробка">Коробки (коробка)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => selectedProduct && addToCart(selectedProduct)}>
              Добавить в корзину
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
            <DialogDescription>
              {cart.length === 0 ? 'Корзина пуста' : `Товаров в корзине: ${cart.length}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.product.id, item.unit)}
                >
                  <Icon name="Trash2" size={18} />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCart(false)}>
              Продолжить покупки
            </Button>
            <Button onClick={submitOrder} disabled={cart.length === 0}>
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (username: string, password: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Icon name="Package" size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Система заказа хозтоваров</CardTitle>
          <CardDescription>Войдите для продолжения</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="Введите имя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Войти
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Логин: admin или employee, пароль: admin или employee
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminPanel = ({
  products,
  setProducts,
  orders,
  updateOrderStatus
}: {
  products: Product[];
  setProducts: (products: Product[]) => void;
  orders: Order[];
  updateOrderStatus: (orderId: number, status: Order['status']) => void;
}) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', image: '/placeholder.svg' });
  const { toast } = useToast();

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.description) return;

    try {
      const { product } = await api.createProduct(newProduct.name, newProduct.description, newProduct.image);
      setProducts([...products, {
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image_url || '/placeholder.svg'
      }]);
      setNewProduct({ name: '', description: '', image: '/placeholder.svg' });
      setShowAddProduct(false);

      toast({
        title: 'Товар добавлен',
        description: `${product.name} успешно добавлен в каталог`
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить товар',
        variant: 'destructive'
      });
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="space-y-6">
      {pendingOrders.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Bell" size={20} className="text-primary" />
              Новые заявки: {pendingOrders.length}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orders">Заявки</TabsTrigger>
          <TabsTrigger value="products">Товары</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-6">
          <h2 className="text-2xl font-bold">Управление заявками</h2>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon name="PackageOpen" size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Заявок пока нет</p>
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Заявка #{order.id}</CardTitle>
                      <CardDescription>
                        {order.employee} · {order.date}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      order.status === 'completed' ? 'default' :
                      order.status === 'collected' ? 'secondary' : 'outline'
                    }>
                      {order.status === 'pending' && 'В обработке'}
                      {order.status === 'collected' && 'Собрана'}
                      {order.status === 'completed' && 'Выполнена'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                        <span className="font-medium">{item.product.name}</span>
                        <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <Button onClick={() => updateOrderStatus(order.id, 'collected')} variant="outline">
                        <Icon name="PackageCheck" size={16} className="mr-2" />
                        Собрана
                      </Button>
                    )}
                    {order.status === 'collected' && (
                      <Button onClick={() => updateOrderStatus(order.id, 'completed')}>
                        <Icon name="Check" size={16} className="mr-2" />
                        Выполнена
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Управление товарами</h2>
            <Button onClick={() => setShowAddProduct(true)}>
              <Icon name="Plus" size={20} className="mr-2" />
              Добавить товар
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <Card key={product.id}>
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить товар</DialogTitle>
            <DialogDescription>
              Заполните информацию о новом товаре
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название товара</Label>
              <Input
                placeholder="Например: Бумага А4"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание товара</Label>
              <Textarea
                placeholder="Краткое описание"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Фото товара</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Icon name="Upload" size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Загрузка фото будет добавлена позже</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Отмена
            </Button>
            <Button onClick={addProduct}>
              Добавить товар
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;