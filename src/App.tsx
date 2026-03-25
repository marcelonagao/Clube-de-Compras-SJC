import React, { useState, useEffect } from 'react';
import { ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ChevronDown, ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, Download, Copy, Clock, MessageCircle, LayoutDashboard, Store, Eye } from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// --- CONFIGURAÇÃO DO SEU FIREBASE ---
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

const polos = ['São José dos Campos (Sede)', 'Jacareí', 'Taubaté', 'Caraguatatuba'];
const categorias = ['Todos', 'Hortifruti', 'Carnes & Aves', 'Grãos & Cereais', 'Mercearia', 'Laticínios'];

const initialProducts = [
  { sku: 'HORT-001', category: 'Hortifruti', name: 'Tomate Orgânico (kg)', description: 'Tomates frescos colhidos no dia. Excelentes para saladas e molhos.', price: 8.50, minOrderQuantity: 20, stockLocal: 5, image: '🍅' },
  { sku: 'HORT-002', category: 'Hortifruti', name: 'Alface Crespa (un)', description: 'Maço grande de alface crespa hidropônica.', price: 3.00, minOrderQuantity: 30, stockLocal: 0, image: '🥬' },
  { sku: 'GRAO-001', category: 'Grãos & Cereais', name: 'Arroz Agulhinha (5kg)', description: 'Arroz branco tipo 1, safra nova.', price: 24.50, minOrderQuantity: 10, stockLocal: 2, image: '🍚' },
  { sku: 'CARN-001', category: 'Carnes & Aves', name: 'Peito de Frango (kg)', description: 'Peito de frango resfriado sem osso e sem pele.', price: 19.90, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: 'CARN-002', category: 'Carnes & Aves', name: 'Coração de Frango (kg)', description: 'Coração de frango limpo e resfriado.', price: 22.50, minOrderQuantity: 10, stockLocal: 0, image: '❤️' },
  { sku: 'MERC-001', category: 'Mercearia', name: 'Mel Silvestre (500g)', description: 'Mel puro de abelhas silvestres da região.', price: 35.00, minOrderQuantity: 12, stockLocal: 1, image: '🍯' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);

  const [expandedMonths, setExpandedMonths] = useState({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerEmail, setManualCustomerEmail] = useState('');
  const [manualCustomerWhatsapp, setManualCustomerWhatsapp] = useState('');
  const [manualCart, setManualCart] = useState([]);

  const [adminTab, setAdminTab] = useState('pedidos');
  const [editingProduct, setEditingProduct] = useState(null);
  const [shopCategory, setShopCategory] = useState('Todos');
  const [imagePreview, setImagePreview] = useState('');
  const [toast, setToast] = useState(null);

  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);

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
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'cliente', name: 'Usuário' });
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
        if (prodSnapshot.empty) {
          for (let p of initialProducts) await addDoc(collection(db, "products"), p);
          const newProds = await getDocs(collection(db, "products"));
          setProducts(newProds.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        const custSnapshot = await getDocs(collection(db, "customers"));
        setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const ordSnapshot = await getDocs(collection(db, "orders"));
        setOrders(ordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erro Firebase:", error);
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
      showToast('Bem-vindo!', 'success');
    } catch (error) {
      setAuthLoading(false);
      showToast('Acesso negado. Verifique e-mail e senha.', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if(!loginName || !loginEmail || !loginPassword || !loginWhatsapp) return showToast('Preencha tudo!', 'error');
    if (registerRole === 'consolidador' && secretCode !== 'GESTOR2024') return showToast('Código inválido!', 'error');
    if (registerRole === 'representante' && secretCode !== 'REP2024') return showToast('Código inválido!', 'error');
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const newUserProfile = { name: loginName, email: loginEmail, whatsapp: loginWhatsapp, polo: selectedPolo, role: registerRole };
      await setDoc(doc(db, "users", userCredential.user.uid), newUserProfile);
      await addDoc(collection(db, "customers"), newUserProfile);
      showToast('Conta criada!', 'success');
    } catch (error) {
      setAuthLoading(false);
      showToast('Erro ao criar conta.', 'error');
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    await signOut(auth);
    setCart([]);
    setLoginPassword('');
    setAuthLoading(false);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) setCart(cart.map(item => item.id === product.id ? { ...item, qtd: item.qtd + 1 } : item));
    else setCart([...cart, { ...product, qtd: 1 }]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qtd), 0);

  const confirmManualOrder = async (e) => {
    e.preventDefault();
    if(manualCart.length === 0) return showToast('Adicione produtos!', 'error');
    try {
      const newOrderData = {
        customer: `${manualCustomerName} (Via Rep)`,
        email: manualCustomerEmail,
        whatsapp: manualCustomerWhatsapp,
        polo: user.polo,
        total: manualCart.reduce((sum, item) => sum + (item.price * item.qtd), 0),
        method: 'dinheiro/pix direto',
        status: 'pago',
        date: new Date().toISOString(),
        items: manualCart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd }))
      };
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      setOrders([...orders, { id: orderRef.id, ...newOrderData }]);
      setIsManualOrderModalOpen(false);
      setManualCart([]);
      showToast('Venda realizada!', 'success');
    } catch(err) { showToast('Erro ao salvar.', 'error'); }
  };

  const processGatewayPayment = async () => {
    setIsProcessingPayment(true);
    const finalTotal = paymentMethod === 'credit' ? cartTotal * 1.05 : cartTotal;
    try {
      const newOrderData = {
        customer: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        polo: user.polo,
        total: finalTotal,
        method: paymentMethod,
        status: 'aguardando_pagamento',
        date: new Date().toISOString(),
        items: cart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd }))
      };
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      const savedOrder = { id: orderRef.id, ...newOrderData };
      setOrders([...orders, savedOrder]);
      setPendingOrder(savedOrder);
      setCart([]);
      setIsProcessingPayment(false);
      setCurrentScreen(paymentMethod === 'pix' ? 'gateway_pix' : 'gateway_credit');
    } catch(err) { setIsProcessingPayment(false); showToast('Erro pagamento.', 'error'); }
  };

  const simulateBankWebhook = async () => {
    if (!pendingOrder) return;
    try {
      await updateDoc(doc(db, "orders", pendingOrder.id), { status: 'pago' });
      setOrders(orders.map(o => o.id === pendingOrder.id ? { ...o, status: 'pago' } : o));
      setCurrentScreen('success');
    } catch (err) { showToast('Erro simulação.', 'error'); }
  };

  const handleSendWhatsApp = (order) => {
    if (!order.whatsapp) return showToast('Sem WhatsApp.', 'error');
    let phone = order.whatsapp.replace(/\D/g, '');
    if (phone.length === 11) phone = '55' + phone;
    const text = `Olá, ${order.customer}! Seu pedido #${order.id.slice(0,5)} está confirmado no Clube de Compras. Total: R$ ${order.total.toFixed(2)}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProdData = {
      sku: formData.get('sku'),
      category: formData.get('category'),
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price')),
      minOrderQuantity: parseInt(formData.get('minOrderQuantity')) || 1,
      stockLocal: parseInt(formData.get('stockLocal')) || 0,
      image: imagePreview || editingProduct?.image || '📦',
    };
    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, "products", editingProduct.id), newProdData);
        setProducts(products.map(p => p.id === editingProduct.id ? { id: editingProduct.id, ...newProdData } : p));
      } else {
        const docRef = await addDoc(collection(db, "products"), newProdData);
        setProducts([...products, { id: docRef.id, ...newProdData }]);
      }
      setEditingProduct(null); setImagePreview(''); showToast('Produto Salvo!', 'success');
    } catch(err) { showToast('Erro.', 'error'); }
  };

  const deleteProduct = async (id) => {
    if(window.confirm('Excluir?')) {
      try { await deleteDoc(doc(db, "products", id)); setProducts(products.filter(p => p.id !== id)); } 
      catch(err) { showToast('Erro.', 'error'); }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 500; canvas.height = 500;
        canvas.getContext('2d').drawImage(img, 0, 0, 500, 500);
        setImagePreview(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Leaf className="w-16 h-16 text-emerald-600 animate-bounce" /></div>;

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md text-center border border-gray-100">
        <Leaf className="text-emerald-700 w-16 h-16 mx-auto mb-4 drop-shadow-sm" />
        <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Clube de Compras</h1>
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="text-left space-y-4">
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="E-mail" className="w-full border-b-2 border-gray-200 p-3 outline-none focus:border-emerald-600" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="Senha" className="w-full border-b-2 border-gray-200 p-3 outline-none focus:border-emerald-600" />
            <button type="submit" className="w-full bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg">Entrar</button>
            <button type="button" onClick={() => setAuthMode('register')} className="w-full text-emerald-600 text-sm font-bold">Criar conta</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value)} className="w-full border-2 p-3 rounded-xl font-bold">
              <option value="cliente">Cliente</option>
              <option value="representante">Representante</option>
              <option value="consolidador">Gestor Geral (Admin)</option>
            </select>
            {registerRole !== 'cliente' && <input type="password" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} required placeholder="Código Secreto da Equipe" className="w-full border-2 border-red-100 p-3 rounded-xl text-red-600 font-bold" />}
            <input value={loginName} onChange={(e) => setLoginName(e.target.value)} required placeholder="Nome Completo" className="w-full border-b-2 p-3" />
            <input value={loginWhatsapp} onChange={(e) => setLoginWhatsapp(e.target.value)} required placeholder="WhatsApp" className="w-full border-b-2 p-3" />
            <select value={selectedPolo} onChange={(e) => setSelectedPolo(e.target.value)} className="w-full border-b-2 p-3">
              {polos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="E-mail" className="w-full border-b-2 p-3" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="Senha (6+ chars)" className="w-full border-b-2 p-3" minLength="6" />
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg">Cadastrar</button>
            <button type="button" onClick={() => setAuthMode('login')} className="w-full text-gray-500 text-sm font-bold text-center">Voltar ao Login</button>
          </form>
        )}
      </div>
    </div>
  );

  // --- COMPONENTES DE TELA (REUTILIZADOS) ---
  const renderShop = () => (
    <div className="pb-24 pt-6 px-4 max-w-5xl mx-auto">
      <div className="bg-white border p-4 rounded-2xl mb-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center"><MapPin className="w-5 h-5 mr-3 text-emerald-600" /><span>Retirada: <strong>{user.polo}</strong></span></div>
      </div>
      <div className="flex overflow-x-auto space-x-3 mb-10 pb-2">
        {categorias.map(cat => (
          <button key={cat} onClick={() => setShopCategory(cat)} className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all ${shopCategory === cat ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-gray-500 border'}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.filter(p => shopCategory === 'Todos' || p.category === shopCategory).map(product => {
          const cartItem = cart.find(c => c.id === product.id);
          return (
            <div key={product.id} className="bg-white rounded-[1.5rem] shadow-sm border p-4 flex flex-col h-full hover:shadow-xl transition-all group overflow-hidden">
              <div className="h-40 bg-gray-50 flex items-center justify-center rounded-xl mb-4 overflow-hidden">
                {product.image.length > 5 ? <img src={product.image} className="w-full h-full object-contain p-2" /> : <span className="text-6xl">{product.image}</span>}
              </div>
              <h3 className="font-bold text-gray-800 mb-1 text-lg leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-400 mb-4 line-clamp-2">{product.description}</p>
              <div className="mt-auto">
                <p className="text-2xl text-emerald-700 font-black mb-4">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                {cartItem ? (
                  <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1">
                    <button onClick={() => setCart(cart.map(i => i.id === product.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-8 h-8 bg-white rounded-lg shadow-sm font-bold">-</button>
                    <span className="font-black text-emerald-800">{cartItem.qtd}</span>
                    <button onClick={() => addToCart(product)} className="w-8 h-8 bg-white rounded-lg shadow-sm font-bold">+</button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(product)} className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition">Adicionar</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="p-4 max-w-6xl mx-auto pt-8 pb-24">
      <div className="flex gap-2 mb-8 bg-white p-2 rounded-[2rem] border shadow-sm">
        <button onClick={() => setAdminTab('pedidos')} className={`flex-1 py-3 rounded-xl font-black text-sm ${adminTab === 'pedidos' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400'}`}>Painel Compras</button>
        <button onClick={() => setAdminTab('catalogo')} className={`flex-1 py-3 rounded-xl font-black text-sm ${adminTab === 'catalogo' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400'}`}>Catálogo</button>
        <button onClick={() => setAdminTab('crm')} className={`flex-1 py-3 rounded-xl font-black text-sm ${adminTab === 'crm' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400'}`}>Clientes</button>
      </div>
      {adminTab === 'catalogo' && (
        <div className="space-y-8">
           <form onSubmit={saveProduct} className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
              <h3 className="font-black text-2xl flex items-center">{editingProduct ? <Edit2 className="mr-3 text-blue-500"/> : <Plus className="mr-3 text-emerald-500"/>} {editingProduct ? 'Editar' : 'Novo'} Produto</h3>
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border">
                <div className="w-24 h-24 bg-white border rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {imagePreview ? <img src={imagePreview} className="w-full h-full object-contain" /> : <span className="text-4xl">📦</span>}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold inline-block shadow-lg">Escolher Foto <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">JPG ou PNG. Tamanho automático.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="sku" defaultValue={editingProduct?.sku || ''} placeholder="SKU" className="border-b-2 p-3 outline-none" required />
                <input name="name" defaultValue={editingProduct?.name || ''} placeholder="Nome" className="border-b-2 p-3 outline-none" required />
                <select name="category" defaultValue={editingProduct?.category || ''} className="border-b-2 p-3 outline-none">
                  {categorias.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} placeholder="Preço" className="border-b-2 p-3 outline-none" required />
              </div>
              <button type="submit" className="w-full bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl">Salvar na Nuvem</button>
           </form>
           <div className="bg-white rounded-[2rem] shadow-sm border divide-y overflow-hidden">
             {products.map(p => (
               <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 border rounded-lg flex items-center justify-center overflow-hidden">
                      {p.image.length > 5 ? <img src={p.image} className="w-full h-full object-contain" /> : <span>{p.image}</span>}
                    </div>
                    <div><p className="font-bold">{p.name}</p><p className="text-xs text-gray-400 uppercase tracking-widest">{p.sku}</p></div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setEditingProduct(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
      {adminTab === 'pedidos' && <div className="bg-white p-12 rounded-[2rem] shadow-sm border text-center font-bold text-gray-400">Clique em "Despacho" ou "Planilha" para relatórios detalhados.</div>}
      {adminTab === 'crm' && (
        <div className="bg-white rounded-[2rem] shadow-sm border overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-[10px] uppercase font-black text-gray-400"><th className="p-5">Nome</th><th className="p-5">Unidade</th><th className="p-5">Ação</th></tr></thead>
            <tbody className="divide-y">
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="p-5 font-bold">{c.name}</td>
                  <td className="p-5 text-sm">{c.polo}</td>
                  <td className="p-5"><button onClick={() => { let ph = c.whatsapp.replace(/\D/g,''); window.open(`https://wa.me/55${ph}`, '_blank'); }} className="text-emerald-700 font-bold flex items-center text-xs"><MessageCircle className="w-4 h-4 mr-1"/> Falar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative selection:bg-emerald-200">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-slate-800 text-white rounded-2xl shadow-xl font-bold">{toast.msg}</div>}

      {currentScreen !== 'login' && (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b">
          <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Leaf className="text-emerald-700 w-8 h-8" />
              <span className="font-black text-xl text-slate-800 tracking-tighter">Clube de Compras</span>
            </div>

            {/* --- NOVO MENU DE NAVEGAÇÃO SUPER USUÁRIO (GESTOR) --- */}
            {user?.role === 'consolidador' && (
              <nav className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl border">
                <button onClick={() => setCurrentScreen('shop')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'shop' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><Store className="w-4 h-4 mr-2"/> Comprar</button>
                <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'dashboard_rep' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><LayoutDashboard className="w-4 h-4 mr-2"/> Logística</button>
                <button onClick={() => setCurrentScreen('dashboard_admin')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'dashboard_admin' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><Package className="w-4 h-4 mr-2"/> Gestão</button>
              </nav>
            )}

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{user.role === 'consolidador' ? 'Gestor Master' : user.role}</span>
                <span className="text-sm font-black text-slate-800">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
          
          {/* Menu Mobile para Gestor */}
          {user?.role === 'consolidador' && (
            <div className="md:hidden flex justify-around p-3 border-t bg-slate-50">
              <button onClick={() => setCurrentScreen('shop')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'shop' ? 'text-emerald-700' : 'text-gray-400'}`}><Store className="w-5 h-5"/> Loja</button>
              <button onClick={() => setCurrentScreen('dashboard_rep')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'dashboard_rep' ? 'text-emerald-700' : 'text-gray-400'}`}><LayoutDashboard className="w-5 h-5"/> Rep</button>
              <button onClick={() => setCurrentScreen('dashboard_admin')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'dashboard_admin' ? 'text-emerald-700' : 'text-gray-400'}`}><Package className="w-5 h-5"/> Admin</button>
            </div>
          )}
        </header>
      )}

      <main>
        {currentScreen === 'login' && renderLogin()}
        {currentScreen === 'shop' && renderShop()}
        {currentScreen === 'dashboard_rep' && (
          <div className="p-4 max-w-4xl mx-auto pt-8">
            <h2 className="text-3xl font-black mb-8">Painel de Logística</h2>
            <div className="grid grid-cols-1 gap-4">
              {orders.filter(o => (user.role === 'consolidador' || o.polo === user.polo) && o.status === 'pago').map(o => (
                <div key={o.id} className="bg-white p-6 rounded-[2rem] shadow-sm border flex justify-between items-center">
                  <div>
                    <p className="font-black text-lg">{o.customer}</p>
                    <p className="text-xs text-gray-400 uppercase">{o.polo} • R$ {o.total.toFixed(2)}</p>
                  </div>
                  <button onClick={() => handleSendWhatsApp(o)} className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl hover:bg-emerald-100 transition"><MessageCircle className="w-6 h-6"/></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
        {/* Outras telas seguem a lógica de renderização anterior... */}
      </main>

      {/* Barra Inferior de Compras (Apenas para modo Loja) */}
      {currentScreen === 'shop' && cart.length > 0 && (
        <div className="fixed bottom-0 w-full p-4 z-50">
          <button onClick={() => setCurrentScreen('checkout')} className="max-w-md mx-auto w-full bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-2xl flex justify-between px-8">
            <span>Finalizar Pedido</span>
            <span>{cart.length} itens</span>
          </button>
        </div>
      )}
    </div>
  );
}