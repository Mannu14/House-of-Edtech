import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, ShoppingCart, Clock, CheckCircle, XCircle, LogOut, User } from 'lucide-react';

const TradingDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [prices, setPrices] = useState({});
  const [orders, setOrders] = useState([]);
  const [priceChanges, setPriceChanges] = useState({});
  const [orderForm, setOrderForm] = useState({
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 1,
    price: 0
  });
  const [notification, setNotification] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState('');
  const wsRef = useRef(null);

  const stocks = ['AAPL', 'TSLA', 'AMZN', 'INFY', 'TCS'];
  const API_URL = 'http://localhost:8080/api';

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const ws = new WebSocket('ws://localhost:8080/api/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'initial' || data.type === 'update') {
        const pricesObj = {};
        const changes = {};

        Object.keys(data.prices).forEach(symbol => {
          pricesObj[symbol] = data.prices[symbol].price;
          changes[symbol] = data.prices[symbol].change > 0 ? 'up' : 'down';
        });

        setPrices(pricesObj);
        setPriceChanges(changes);
        setTimeout(() => setPriceChanges({}), 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
    };

    return () => ws.close();
  }, [isAuthenticated]);

  // Fetch orders
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = showLogin ? '/login' : '/signup';
    const payload = showLogin 
      ? { email: authForm.email, password: authForm.password }
      : authForm;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        setIsAuthenticated(true);
        showNotification(data.message, 'success');
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError('Connection error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setOrders([]);
    setPrices({});
    showNotification('Logged out successfully', 'success');
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    if (!orderForm.quantity || orderForm.quantity <= 0) {
      showNotification('Please enter a valid quantity', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderForm)
      });

      const data = await response.json();

      if (data.success) {
        showNotification(`${orderForm.side} order placed successfully!`, 'success');
        fetchOrders();
        setOrderForm({ ...orderForm, quantity: 1 });
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      showNotification('Failed to place order', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const calculateTotal = () => {
    return (prices[orderForm.symbol] * orderForm.quantity).toFixed(2);
  };

  const getStockIcon = (symbol) => {
    const icons = {
      AAPL: '🍎',
      TSLA: '⚡',
      AMZN: '📦',
      INFY: '💼',
      TCS: '🏢'
    };
    return icons[symbol] || '📈';
  };

  // Login/Signup Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setShowLogin(true); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                showLogin
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setShowLogin(false); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                !showLogin
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {!showLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter your password"
              />
            </div>

            {authError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/50"
            >
              {showLogin ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
                <p className="text-sm text-slate-400">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-xs font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-red-500/90 text-white'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Prices Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Live Market Prices
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4">
                  {stocks.map(symbol => (
                    <div 
                      key={symbol}
                      className={`bg-slate-900/50 rounded-lg p-4 border transition-all duration-300 ${
                        priceChanges[symbol] === 'up' 
                          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                          : priceChanges[symbol] === 'down'
                          ? 'border-red-500/50 shadow-lg shadow-red-500/20'
                          : 'border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getStockIcon(symbol)}</div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{symbol}</h3>
                            <p className="text-xs text-slate-400">
                              {symbol === 'AAPL' && 'Apple Inc.'}
                              {symbol === 'TSLA' && 'Tesla Inc.'}
                              {symbol === 'AMZN' && 'Amazon.com'}
                              {symbol === 'INFY' && 'Infosys Ltd.'}
                              {symbol === 'TCS' && 'Tata Consultancy'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span className="text-2xl font-bold text-white">
                              {prices[symbol]?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {priceChanges[symbol] && (
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              priceChanges[symbol] === 'up' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {priceChanges[symbol] === 'up' ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">
                                {priceChanges[symbol] === 'up' ? '+' : '-'}0.{Math.floor(Math.random() * 99)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-cyan-400" />
                  Place Order
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Symbol</label>
                  <select
                    value={orderForm.symbol}
                    onChange={(e) => setOrderForm({...orderForm, symbol: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {stocks.map(stock => (
                      <option key={stock} value={stock}>
                        {getStockIcon(stock)} {stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderForm({...orderForm, side: 'BUY'})}
                      className={`py-2.5 rounded-lg font-medium transition-all ${
                        orderForm.side === 'BUY'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                          : 'bg-slate-900/50 text-slate-400 border border-slate-700 hover:border-emerald-500/50'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderForm({...orderForm, side: 'SELL'})}
                      className={`py-2.5 rounded-lg font-medium transition-all ${
                        orderForm.side === 'SELL'
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                          : 'bg-slate-900/50 text-slate-400 border border-slate-700 hover:border-red-500/50'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({...orderForm, quantity: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">Current Price</span>
                    <span className="text-white font-medium">${prices[orderForm.symbol]?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                    <span className="text-sm font-medium text-slate-300">Total</span>
                    <span className="text-xl font-bold text-cyan-400">${calculateTotal()}</span>
                  </div>
                </div>

                <button
                  onClick={handleOrderSubmit}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    orderForm.side === 'BUY'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/50'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/50'
                  }`}
                >
                  Place {orderForm.side} Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="mt-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Order History ({orders.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No orders placed yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Side</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="font-medium text-white">{order.symbol}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-md font-medium ${
                            order.side === 'BUY' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{order.quantity}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">${order.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          ${(order.quantity * order.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TradingDashboard;