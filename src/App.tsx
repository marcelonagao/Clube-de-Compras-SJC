import React, { useState, useEffect } from 'react';
import { ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ChevronDown, ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, Download, Copy, Clock, MessageCircle, LayoutDashboard, Store, Eye, Wallet, Landmark, Loader2, Home, Search, Menu, X, BarChart3, AlertOctagon } from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, writeBatch } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7RvxvIGsnl5AP8tcNpATdS94PKjFzLV4",
  authDomain: "clube-de-compra-sjc.firebaseapp.com",
  projectId: "clube-de-compra-sjc",
  storageBucket: "clube-de-compra-sjc.firebasestorage.app",
  messagingSenderId: "671016891814",
  appId: "1:671016891814:web:71038467bacedebb534b67"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

const polos = ['São José dos Campos (Sede)', 'Jacareí', 'Taubaté', 'Caraguatatuba', 'Caçapava', 'Vila Adyana'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  
  const [missingItemsModal, setMissingItemsModal] = useState({ open: false, order: null, missingItems: [] });
  const [globalShortageModal, setGlobalShortageModal] = useState(false);
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' }); 

  const [expandedMonths, setExpandedMonths] = useState({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const [adminTab, setAdminTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [shopCategory, setShopCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);

  const activeCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort()];
  const getActivePrice = (p) => (p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price) ? p.promotionalPrice : p.price;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });
          if (userData.role === 'consolidador') setCurrentScreen('dashboard_admin');
          else if (userData.role === 'representante') setCurrentScreen('dashboard_rep');
          else setCurrentScreen('shop');
        } else {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'cliente', name: 'Cliente' });
          setCurrentScreen('shop');
        }
      } else {
        setUser(null);
        setCurrentScreen('login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchFromFirebase = async () => {
      try {
        const prodSnapshot = await getDocs(collection(db, "products"));
        setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const ordSnapshot = await getDocs(collection(db, "orders"));
        setOrders(ordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const usersSnapshot = await getDocs(collection(db, "users"));
        setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { 
        console.error(error); 
      } finally { 
        setIsLoadingDB(false); 
      }
    };
    fetchFromFirebase();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try { 
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword); 
    } catch (error) { 
      setAuthLoading(false); 
      showToast('Dados incorretos.', 'error'); 
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerRole === 'consolidador' && secretCode !== 'GESTOR2024') return showToast('Código inválido!', 'error');
    if (registerRole === 'representante' && secretCode !== 'REP2024') return showToast('Código inválido!', 'error');
    setAuthLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const profile = { name: loginName, email: loginEmail, whatsapp: loginWhatsapp, polo: selectedPolo, role: registerRole, walletBalance: 0 };
      await setDoc(doc(db, "users", res.user.uid), profile);
    } catch (error) { 
      setAuthLoading(false); 
      showToast('Erro no registo.', 'error'); 
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch(e) {
      setUser(null);
      setCurrentScreen('login');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) setCart(cart.map(item => item.id === product.id ? { ...item, qtd: item.qtd + 1 } : item));
    else setCart([...cart, { ...product, qtd: 1 }]);
    showToast(`${product.name} adicionado!`);
  };

  const handleCheckout = async () => {
    setIsProcessingPayment(true);
    const total = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);
    const finalTotal = Math.max(0, total - (user?.walletBalance || 0));

    try {
       const order = {
          customer: user.name,
          email: user.email,
          whatsapp: user.whatsapp,
          polo: user.polo,
          items: cart,
          total: finalTotal,
          status: 'pago',
          date: new Date().toISOString(),
       };
       await addDoc(collection(db, "orders"), order);
       
       if (user.walletBalance > 0) {
          const usedBalance = Math.min(user.walletBalance, total);
          await updateDoc(doc(db, "users", user.uid), { walletBalance: user.walletBalance - usedBalance });
          setUser({...user, walletBalance: user.walletBalance - usedBalance});
       }

       setCart([]);
       showToast('Pedido confirmado!', 'success');
       setCurrentScreen('my_orders');
    } catch(e) {
       showToast('Erro ao finalizar', 'error');
    } finally {
       setIsProcessingPayment(false);
    }
  };

  const requestPixRefund = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.uid), { walletBalance: 0, pendingPixRefund: user.walletBalance, pixKey: pixRefundModal.key });
      setUser({...user, walletBalance: 0});
      setPixRefundModal({ open: false, key: '' });
      showToast("Solicitação enviada!");
    } catch(e) { showToast("Erro.", "error"); }
  };

  const renderLogin = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-emerald-100">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Leaf className="w-8 h-8 text-emerald-600" />
             </div>
          </div>
          <h1 className="text-2xl font-black text-center text-slate-800 mb-2">Clube de Compras</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Alimentos frescos direto do produtor</p>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'login' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Entrar</button>
            <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'register' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Criar Conta</button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <>
                <input required type="text" placeholder="Seu Nome Completo" value={loginName} onChange={e => setLoginName(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <input required type="text" placeholder="WhatsApp (Ex: 11999999999)" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <select value={selectedPolo} onChange={e => setSelectedPolo(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 appearance-none">
                  {polos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex gap-2">
                   <button type="button" onClick={() => setRegisterRole('cliente')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${registerRole === 'cliente' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500'}`}>Cliente</button>
                   <button type="button" onClick={() => setRegisterRole('representante')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${registerRole === 'representante' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-500'}`}>Representante</button>
                   <button type="button" onClick={() => setRegisterRole('consolidador')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${registerRole === 'consolidador' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>Gestor</button>
                </div>
                {['representante', 'consolidador'].includes(registerRole) && (
                   <input type="password" placeholder={`Código Secreto (${registerRole === 'consolidador' ? 'GESTOR2024' : 'REP2024'})`} value={secretCode} onChange={e => setSecretCode(e.target.value)} className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-red-700 placeholder-red-300" required />
                )}
              </>
            )}
            <input required type="email" placeholder="Seu E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
            <input required type="password" placeholder="Sua Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
            <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 text-white font-black rounded-xl py-3.5 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center">
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Entrar no Clube' : 'Criar Conta')}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderShop = () => {
    const filteredProducts = products.filter(p => (shopCategory === 'Todos' || p.category === shopCategory) && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const promoProducts = products.filter(p => p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price);

    return (
      <div className="pb-28 pt-4 px-4 max-w-5xl mx-auto">
        <div className="bg-emerald-700 -mx-4 -mt-4 p-6 pb-8 mb-6 rounded-b-[2rem] shadow-md relative">
          <div className="flex items-center justify-between text-emerald-100 mb-4">
            <div className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /><span className="text-xs font-medium">Enviar para <strong className="text-white">{user?.polo || 'Sede'}</strong></span></div>
            {(user?.walletBalance > 0) && <div className="flex items-center bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm"><Wallet className="w-3.5 h-3.5 text-white mr-1.5"/><span className="text-xs font-medium text-white">R$ {user.walletBalance.toFixed(2)}</span></div>}
          </div>
          <div className="relative">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Estou buscando..." className="w-full bg-white border-none text-gray-800 py-3.5 pl-12 pr-4 rounded-full shadow-lg focus:outline-none placeholder-gray-400 font-medium" />
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {promoProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center"><span className="text-orange-500 mr-2">🔥</span> Ofertas da Semana</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
              {promoProducts.map(p => {
                const discount = Math.round((1 - (p.promotionalPrice / p.price)) * 100);
                return (
                  <div key={p.id} className="snap-start shrink-0 w-40 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-3 relative">
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded z-10">-{discount}%</span>
                    <div className="aspect-square mb-2 flex items-center justify-center">
                       {p.image?.length > 5 ? <img src={p.image} className="h-full object-contain" alt={p.name} /> : <span className="text-4xl">{p.image}</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 line-through">R$ {p.price.toFixed(2)}</p>
                    <p className="text-lg text-emerald-600 font-bold leading-none mb-1">R$ {p.promotionalPrice.toFixed(2)}</p>
                    <h3 className="text-[11px] text-gray-600 line-clamp-2 h-8">{p.name}</h3>
                    <button onClick={() => addToCart(p)} className="w-full bg-emerald-100 text-emerald-700 py-1.5 rounded-lg font-bold text-[10px] mt-2">ADICIONAR</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Catálogo</h2>
          <div className="relative w-44">
            <select value={shopCategory} onChange={(e) => setShopCategory(e.target.value)} className="w-full appearance-none bg-gray-100 border-none text-gray-700 font-bold py-2 pl-4 pr-10 rounded-xl focus:outline-none text-sm cursor-pointer">
              {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map(p => {
            const isPromo = p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price;
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="aspect-square bg-white flex items-center justify-center p-4 border-b border-gray-50 relative">
                  {isPromo && <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded z-10">Promo</span>}
                  {p.image?.length > 5 ? <img src={p.image} className="h-full object-contain" alt={p.name} /> : <span className="text-5xl">{p.image}</span>}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-grow">
                  {isPromo && <p className="text-[10px] text-gray-400 line-through mb-0.5">R$ {p.price.toFixed(2)}</p>}
                  <p className="text-xl text-gray-900 font-normal mb-1">R$ {getActivePrice(p).toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mb-2">Pronta entrega</p>
                  <h3 className="text-xs text-gray-500 leading-snug mb-4 flex-grow line-clamp-2">{p.name}</h3>
                  <button onClick={() => addToCart(p)} className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2 rounded-lg font-semibold text-xs transition-colors">Adicionar</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderCart = () => {
    const total = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);
    const hasDiscount = user?.walletBalance > 0;
    const finalTotal = Math.max(0, total - (user?.walletBalance || 0));
    
    return (
      <div className="p-4 max-w-5xl mx-auto pb-28">
         <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Cesta</h2>
         {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
               <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="font-medium">Sua cesta está vazia</p>
               <button onClick={() => setCurrentScreen('shop')} className="mt-4 bg-emerald-100 text-emerald-700 font-bold py-2 px-6 rounded-xl">Voltar à Loja</button>
            </div>
         ) : (
            <>
               <div className="space-y-3 mb-6">
                  {cart.map(item => (
                     <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl">{item.image?.length > 5 ? <img src={item.image} className="w-8 h-8 object-contain" alt="" /> : item.image || '📦'}</div>
                           <div>
                              <p className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</p>
                              <p className="text-xs text-gray-500">R$ {getActivePrice(item).toFixed(2)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-lg">
                           <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qtd: i.qtd - 1} : i).filter(i => i.qtd > 0))} className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold">-</button>
                           <span className="font-black text-sm text-emerald-700 w-4 text-center">{item.qtd}</span>
                           <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qtd: i.qtd + 1} : i))} className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold">+</button>
                        </div>
                     </div>
                  ))}
               </div>
               
               <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
                  {hasDiscount && (
                     <div className="flex justify-between text-sm text-emerald-600 font-bold"><span>Crédito da Carteira</span><span>- R$ {Math.min(user.walletBalance, total).toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between text-lg font-black text-slate-800 pt-3 border-t border-gray-100">
                     <span>Total a Pagar</span>
                     <span>R$ {finalTotal.toFixed(2)}</span>
                  </div>
               </div>
               <button onClick={() => setCurrentScreen('payment')} className="w-full bg-emerald-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition">
                  Pagar e Finalizar
               </button>
            </>
         )}
      </div>
    );
  };

  const renderPayment = () => {
     const total = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);
     const finalTotal = Math.max(0, total - (user?.walletBalance || 0));

     return (
        <div className="p-4 max-w-sm mx-auto pt-8">
           <button onClick={() => setCurrentScreen('cart')} className="flex items-center text-emerald-600 font-bold text-sm mb-6 bg-emerald-50 px-4 py-2 rounded-xl w-fit hover:bg-emerald-100 transition"><ArrowLeft className="w-4 h-4 mr-2"/> Voltar para Cesta</button>
           <h2 className="text-2xl font-black text-slate-800 mb-6">Pagamento</h2>
           
           <div className="space-y-4 mb-8">
              <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                 <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pix' ? 'border-emerald-500' : 'border-gray-300'}`}>
                       {paymentMethod === 'pix' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                    </div>
                    <span className="font-bold text-slate-800">PIX (Sem taxas)</span>
                 </div>
                 <QrCode className="w-5 h-5 text-gray-400" />
              </label>
              <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'credito' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                 <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'credito' ? 'border-emerald-500' : 'border-gray-300'}`}>
                       {paymentMethod === 'credito' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                    </div>
                    <span className="font-bold text-slate-800">Cartão de Crédito (+5%)</span>
                 </div>
                 <CreditCard className="w-5 h-5 text-gray-400" />
              </label>
           </div>
           
           <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 mb-6">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total a Pagar</p>
              <p className="text-3xl font-black text-emerald-600 mb-2">R$ {(paymentMethod === 'credito' ? finalTotal * 1.05 : finalTotal).toFixed(2)}</p>
              {paymentMethod === 'pix' && <p className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded inline-block">Desconto PIX Aplicado</p>}
           </div>

           <button onClick={handleCheckout} disabled={isProcessingPayment} className="w-full bg-slate-800 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-slate-800/20 hover:bg-slate-900 transition flex items-center justify-center disabled:opacity-50">
              {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar e Gerar Código'}
           </button>
        </div>
     );
  }

  const renderMyOrders = () => {
    const myOrdersList = orders.filter(o => o.email === user?.email);
    return (
      <div className="p-4 max-w-5xl mx-auto pb-24">
         <h2 className="text-xl font-black text-slate-800 mb-6">As Minhas Encomendas</h2>
         {user?.walletBalance > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 shadow-sm">
               <div className="flex items-center gap-3 mb-3">
                 <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600"/></div>
                 <div>
                    <h3 className="font-bold text-emerald-800">Crédito Disponível</h3>
                    <p className="text-2xl font-black text-emerald-600">R$ {user.walletBalance.toFixed(2)}</p>
                 </div>
               </div>
               <button onClick={() => setPixRefundModal({open: true, key: user.pixKey || user.whatsapp || ''})} className="w-full bg-white border border-emerald-200 text-emerald-700 font-bold py-2 rounded-xl text-sm shadow-sm hover:bg-emerald-100 transition">
                  Prefere receber via PIX?
               </button>
            </div>
         )}
         
         {myOrdersList.length === 0 ? (
           <div className="text-center py-12 text-gray-400">
             <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
             <p>Ainda não fez nenhuma encomenda.</p>
           </div>
         ) : (
           <div className="space-y-4">
             {myOrdersList.slice().reverse().map(o => (
               <div key={o.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-3">
                     <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(o.date).toLocaleDateString()}</p>
                       <p className="font-bold text-slate-800 text-sm">Pedido #{o.id.substring(0,6)}</p>
                     </div>
                     <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${o.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {o.status}
                     </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {(o.items || []).map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">{i.qtd}x</span>
                           <span className="text-gray-600 font-medium">{i.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</p>
                     <p className="text-lg font-black text-emerald-600">R$ {(o.total || 0).toFixed(2)}</p>
                  </div>
               </div>
             ))}
           </div>
         )}
         
         {pixRefundModal.open && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
               <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-black text-slate-800 mb-2">Reembolso via PIX</h3>
                  <p className="text-sm text-gray-500 mb-6">Informe a sua chave PIX para receber os R$ {user.walletBalance.toFixed(2)} que estão na sua carteira.</p>
                  <form onSubmit={requestPixRefund}>
                     <input required placeholder="Sua Chave PIX" value={pixRefundModal.key} onChange={e => setPixRefundModal({...pixRefundModal, key: e.target.value})} className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl mb-4 outline-none focus:border-emerald-500 font-medium" />
                     <div className="flex gap-3">
                        <button type="button" onClick={() => setPixRefundModal({open: false, key: ''})} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl">Confirmar</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
    );
  };

  const renderRepDashboard = () => {
    if (user?.role !== 'representante' && user?.role !== 'consolidador') return null;
    const repOrders = orders.filter(o => o.polo === user?.polo && o.status === 'pago');
    const ordersByMonth = repOrders.reduce((acc, order) => {
      const m = new Date(order.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!acc[m]) acc[m] = [];
      acc[m].push(order);
      return acc;
    }, {});

    return (
      <div className="p-4 max-w-5xl mx-auto pb-24">
         <div className="bg-slate-800 rounded-3xl p-6 text-white mb-6 shadow-lg shadow-slate-800/20">
            <h2 className="text-2xl font-black mb-1">Acompanhamento</h2>
            <p className="text-slate-400 text-sm font-medium flex items-center gap-1.5"><MapPin className="w-4 h-4"/> Unidade: <strong className="text-white">{user?.polo}</strong></p>
         </div>
         <div className="space-y-4">
            {Object.entries(ordersByMonth).map(([month, monthOrders]) => {
               const isExp = expandedMonths[month];
               return (
                  <div key={month} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                     <button onClick={() => setExpandedMonths({...expandedMonths, [month]: !isExp})} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-gray-100 transition">
                        <h3 className="font-bold text-slate-800 capitalize">{month} ({monthOrders.length})</h3>
                        {isExp ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                     </button>
                     {isExp && (
                        <div className="p-4 border-t border-gray-50 space-y-3">
                           {monthOrders.map(o => (
                              <div key={o.id} className="bg-slate-50 rounded-xl p-4 border border-gray-100">
                                 <p className="font-bold text-slate-800">{o.customer}</p>
                                 <p className="text-xs text-emerald-600 font-bold mb-2">R$ {(o.total || 0).toFixed(2)}</p>
                                 <div className="flex flex-wrap gap-1.5 mb-3">
                                    {(o.items || []).map((i, idx) => (
                                       <span key={idx} className="bg-white border border-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                          {i.qtd}x {i.name}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )
            })}
         </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    if (user?.role !== 'consolidador') return null;
    return (
      <div className="p-4 max-w-5xl mx-auto pb-24">
         <div className="bg-emerald-700 rounded-3xl p-6 text-white mb-6 shadow-lg shadow-emerald-700/20">
            <h2 className="text-2xl font-black mb-1">Torre de Controlo</h2>
            <p className="text-emerald-200 text-sm font-medium">Visão Geral do Negócio</p>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
               <p className="text-xs font-bold text-gray-400 uppercase">Vendas Totais</p>
               <p className="text-2xl font-black text-slate-800">R$ {orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
               <p className="text-xs font-bold text-gray-400 uppercase">Pedidos Registados</p>
               <p className="text-2xl font-black text-slate-800">{orders.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
               <p className="text-xs font-bold text-gray-400 uppercase">Clientes</p>
               <p className="text-2xl font-black text-slate-800">{allUsers.filter(u => u.role === 'cliente').length}</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Catálogo de Produtos</h3>
            <p className="text-sm text-gray-500 mb-4">Gestão do catálogo em tempo real. Adicione itens e promoções.</p>
            <div className="space-y-3">
               {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100">
                     <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.image?.length > 5 ? <img src={p.image} className="w-8 h-8 object-contain" alt="" /> : p.image || '📦'}</span>
                        <div>
                           <p className="font-bold text-sm text-slate-800">{p.name}</p>
                           <p className="text-xs text-gray-500">R$ {p.price.toFixed(2)} {p.promotionalPrice && <span className="text-emerald-600 font-bold ml-1">Promo: R$ {p.promotionalPrice.toFixed(2)}</span>}</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setEditingProduct(p)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative selection:bg-emerald-200">
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[200] px-6 py-3.5 rounded-2xl shadow-xl font-black text-white transition-all flex items-center ${toast.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}>
          {toast.type === 'error' ? <AlertOctagon className="w-5 h-5 mr-3"/> : <CheckCircle className="w-5 h-5 mr-3 text-emerald-400" />}
          {toast.msg}
        </div>
      )}

      {currentScreen !== 'login' && (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100"><Leaf className="text-emerald-700 w-6 h-6" /></div>
              <span className="font-black text-xl text-slate-800 tracking-tighter hidden sm:block">Clube SJC</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{user?.role}</span>
                <span className="text-sm font-black text-slate-800">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm border border-red-100"><X className="w-5 h-5" /></button>
            </div>
          </div>
        </header>
      )}

      <main className="md:pb-0 pb-16">
        {currentScreen === 'login' && renderLogin()}
        {currentScreen === 'shop' && renderShop()}
        {currentScreen === 'cart' && renderCart()}
        {currentScreen === 'payment' && renderPayment()}
        {currentScreen === 'my_orders' && renderMyOrders()}
        {currentScreen === 'dashboard_rep' && renderRepDashboard()}
        {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
      </main>

      {/* FIXED BOTTOM MENU */}
      {currentScreen !== 'login' && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-[100] pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {['cliente', 'representante', 'consolidador'].includes(user?.role) && (
             <button onClick={() => setCurrentScreen('shop')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen === 'shop' ? 'text-emerald-600' : 'text-gray-400'}`}>
               <Store className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Comprar</span>
             </button>
          )}
          
          <button onClick={() => setCurrentScreen(cart.length > 0 ? 'cart' : 'my_orders')} className={`flex flex-col items-center justify-center w-full h-full ${(currentScreen === 'my_orders' || currentScreen === 'cart' || currentScreen === 'payment') ? 'text-emerald-600' : 'text-gray-400'} relative`}>
            {cart.length > 0 && <span className="absolute top-1 right-1/4 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>}
            <Package className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Pedidos</span>
          </button>
          
          {['representante', 'consolidador'].includes(user?.role) && (
            <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen === 'dashboard_rep' ? 'text-emerald-600' : 'text-gray-400'}`}>
              <LayoutDashboard className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Logística</span>
            </button>
          )}
          {user?.role === 'consolidador' && (
            <button onClick={() => setCurrentScreen('dashboard_admin')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen === 'dashboard_admin' ? 'text-emerald-600' : 'text-gray-400'}`}>
              <BarChart3 className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Gestão</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}