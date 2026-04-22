import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Landmark, Users, TrendingUp, Menu, X, BarChart3, 
  Store, AlertTriangle, Edit2, Plus, LogOut, CheckCircle, Smartphone, 
  ArrowLeft, UploadCloud, ChevronDown, Trash2, Search, MessageCircle,
  FileText, Wallet, Check, AlertCircle, Home
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
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

const polos = ["São José dos Campos (Sede)", "Jacareí", "Taubaté", "Caraguatatuba", "Caçapava", "Vila Adyana"];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categorias, setCategorias] = useState(["Todos", "Carnes & Aves", "Mercearia", "Ovos", "Peixes & Frutos do Mar", "Saúde & Bem-Estar", "Grãos"]);
  
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // States do Admin/Gestão
  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [globalShortageModal, setGlobalShortageModal] = useState(false);
  const [shortageItemSearch, setShortageItemSearch] = useState('');
  
  // States da Logística (Representante)
  const [repShortageModal, setRepShortageModal] = useState(null);
  const [repManualOrderModal, setRepManualOrderModal] = useState(false);
  const [manualOrderCustomer, setManualOrderCustomer] = useState('');
  
  // States de Finanças
  const [pixRefundModal, setPixRefundModal] = useState(false);
  const [pixKeyInput, setPixKeyInput] = useState('');

  // States de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [polo, setPolo] = useState(polos[0]);
  const [role, setRole] = useState('cliente');
  const [secretKey, setSecretKey] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [connectingDb, setConnectingDb] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setConnectingDb(true);
      if (currentUser) {
        await loadData();
        const snap = await getDocs(collection(db, "users"));
        const usersData = snap.docs.map(d => ({id: d.id, ...d.data()}));
        const userDoc = usersData.find(c => c.email === currentUser.email);
        
        if (userDoc) {
           setUser({ ...currentUser, ...userDoc });
           setCurrentScreen('loja');
        }
      } else {
        setUser(null);
        setCurrentScreen('login');
      }
      setConnectingDb(false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const prodSnap = await getDocs(collection(db, "products"));
      const prodData = prodSnap.docs.map(d => ({id: d.id, ...d.data()}));
      setProducts(prodData);
      
      // Atualiza categorias dinamicamente baseado nos produtos do banco
      const catSet = new Set(["Todos"]);
      prodData.forEach(p => { if(p.category) catSet.add(p.category); });
      setCategorias(Array.from(catSet));
      
      const ordersSnap = await getDocs(collection(db, "orders"));
      setOrders(ordersSnap.docs.map(d => ({id: d.id, ...d.data()})));

      const usersSnap = await getDocs(collection(db, "users"));
      setCustomers(usersSnap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (e) {
      console.log("Erro ao carregar banco", e);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuth = async () => {
    if (!email || !password) return showToast('Preencha e-mail e senha', 'error');
    setLoading(true);
    try {
      if (isRegistering) {
        if (!name || !whatsapp) {
           setLoading(false);
           return showToast('Preencha nome e WhatsApp', 'error');
        }
        if (role === 'admin' && secretKey !== 'GESTOR2024') {
           setLoading(false);
           return showToast('Chave de Gestor inválida', 'error');
        }
        if (role === 'representante' && secretKey !== 'REP2024') {
           setLoading(false);
           return showToast('Chave de Representante inválida', 'error');
        }
        
        await createUserWithEmailAndPassword(auth, email, password);
        const newUser = { email, name, whatsapp, polo, role, walletBalance: 0, pendingPixRefund: 0, pixKey: '' };
        await addDoc(collection(db, "users"), newUser);
        showToast('Conta criada com sucesso na Nuvem!');
        await loadData();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Bem-vindo de volta!');
      }
    } catch (e) {
      showToast('Erro na autenticação. Verifique os dados.', 'error');
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, qtd: i.qtd + 1 } : i));
    } else {
      setCart([...cart, { ...product, qtd: 1 }]);
    }
    showToast('Adicionado ao carrinho!');
  };

  const markAsMissing = async (order, itemMissing) => {
    try {
      const customer = customers.find(c => c.email === order.customerEmail);
      const refundValue = itemMissing.qtd * (itemMissing.promotionalPrice > 0 ? itemMissing.promotionalPrice : itemMissing.price);
      
      if (customer) {
         await updateDoc(doc(db, "users", customer.id), {
            walletBalance: (customer.walletBalance || 0) + refundValue
         });
      }

      const newItems = order.items.map(i => i.id === itemMissing.id ? {...i, missing: true} : i);
      await updateDoc(doc(db, "orders", order.id), { items: newItems, hasMissingItems: true });
      
      showToast(`Falta registrada! R$ ${refundValue.toFixed(2)} creditados na carteira do cliente.`);
      setRepShortageModal(null);
      loadData();
    } catch (e) {
      showToast('Erro ao registrar falta', 'error');
    }
  };

  const handleGlobalMissing = async () => {
    if(!shortageItemSearch) return;
    setLoading(true);
    const targetOrders = orders.filter(o => o.status === 'pago' && o.items.some(i => i.name.toLowerCase().includes(shortageItemSearch.toLowerCase()) && !i.missing));
    
    let updatedCount = 0;
    for (let order of targetOrders) {
       const itemMissing = order.items.find(i => i.name.toLowerCase().includes(shortageItemSearch.toLowerCase()));
       if(itemMissing) {
          await markAsMissing(order, itemMissing);
          updatedCount++;
       }
    }
    showToast(`${updatedCount} pedidos atualizados com falta global.`);
    setGlobalShortageModal(false);
    setShortageItemSearch('');
    setAdminSidebarOpen(false);
    setLoading(false);
  };

  const requestPixRefund = async () => {
     if(!pixKeyInput) return showToast('Digite a sua chave PIX', 'error');
     try {
        await updateDoc(doc(db, "users", user.id), {
           pendingPixRefund: user.walletBalance,
           walletBalance: 0,
           pixKey: pixKeyInput
        });
        showToast('Solicitação de estorno enviada com sucesso!');
        setPixRefundModal(false);
        setPixKeyInput('');
        loadData();
        setUser({...user, pendingPixRefund: user.walletBalance, walletBalance: 0, pixKey: pixKeyInput});
     } catch (e) {
        showToast('Erro ao solicitar estorno', 'error');
     }
  };

  const approveRefund = async (customerId) => {
     try {
        await updateDoc(doc(db, "users", customerId), { pendingPixRefund: 0, pixKey: '', refundDone: true });
        showToast('Estorno marcado como concluído!');
        loadData();
     } catch(e) { showToast('Erro ao processar', 'error'); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
         const img = new Image();
         img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; const MAX_HEIGHT = 500;
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
            else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            setEditingProduct({...editingProduct, image: canvas.toDataURL('image/jpeg', 0.6)});
         };
         img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
       setLoading(true);
       const reader = new FileReader();
       reader.onload = async (event) => {
          try {
              const text = event.target.result;
              const rows = text.split('\n').map(r => r.split(';'));
              let count = 0;
              for(let i=1; i<rows.length; i++) {
                 if(rows[i].length >= 3 && rows[i][0]) {
                    const sku = rows[i][0].trim();
                    const name = rows[i][1].trim();
                    const priceStr = rows[i][2].trim().replace('R$','').replace(',','.');
                    const price = parseFloat(priceStr);
                    const category = rows[i][3] ? rows[i][3].trim() : 'Geral';
                    const minQty = rows[i][4] ? parseInt(rows[i][4]) : 1;
                    
                    if(!isNaN(price)) {
                       const existing = products.find(p => p.sku === sku || p.name === name);
                       if(existing) {
                          await updateDoc(doc(db, "products", existing.id), { price, category, minQty });
                       } else {
                          await addDoc(collection(db, "products"), { sku, name, price, category, minQty, promotionalPrice: 0, stock: 0, image: '📦' });
                       }
                       count++;
                    }
                 }
              }
              showToast(`${count} produtos atualizados via CSV!`);
          } catch(err) {
              showToast('Erro ao ler CSV. Verifique a formatação.', 'error');
          }
          setLoading(false);
          loadData();
       };
       reader.readAsText(file);
    }
  };

  const saveProduct = async () => {
    if (!editingProduct.name || !editingProduct.price) return showToast('Preencha nome e preço', 'error');
    try {
      const prodData = {
         ...editingProduct,
         price: Number(editingProduct.price),
         promotionalPrice: Number(editingProduct.promotionalPrice || 0),
         minQty: Number(editingProduct.minQty || 1),
         stock: Number(editingProduct.stock || 0)
      };
      if (editingProduct.id) {
         await updateDoc(doc(db, "products", editingProduct.id), prodData);
      } else {
         await addDoc(collection(db, "products"), prodData);
      }
      showToast('Produto salvo na nuvem!');
      setEditingProduct(null);
      loadData();
    } catch (e) {
       showToast('Erro ao salvar produto', 'error');
    }
  };

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-6">
           <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700">
             <Store className="w-10 h-10" />
           </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">Clube de Compras</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">{connectingDb ? <span className="animate-pulse text-emerald-600 font-bold">Conectando Nuvem...</span> : (isRegistering ? 'Crie a sua conta segura' : 'Acesse a sua conta')}</p>

        <div className="space-y-4">
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition" />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition" />
          
          {isRegistering && (
             <div className="space-y-4 pt-2 border-t border-gray-100">
               <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
               <input type="tel" placeholder="WhatsApp (DDD+Número)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
               <select value={polo} onChange={e => setPolo(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600">
                  {polos.map(p => <option key={p} value={p}>{p}</option>)}
               </select>
               <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600">
                  <option value="cliente">Sou Cliente</option>
                  <option value="representante">Sou Representante</option>
                  <option value="admin">Sou Gestor Geral</option>
               </select>
               {(role === 'admin' || role === 'representante') && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                     <p className="text-xs text-orange-800 font-bold mb-2">Código de Autorização Necessário</p>
                     <input type="password" placeholder="Chave Secreta" value={secretKey} onChange={e => setSecretKey(e.target.value)} className="w-full p-3 bg-white border border-orange-300 rounded-lg text-orange-900 outline-none" />
                  </div>
               )}
             </div>
          )}
          
          <button onClick={handleAuth} disabled={loading || connectingDb} className="w-full py-4 bg-emerald-700 text-white rounded-xl font-bold text-lg hover:bg-emerald-800 transition flex justify-center items-center shadow-lg mt-4 disabled:opacity-50">
            {loading ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </button>
          
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm text-gray-500 font-medium hover:text-emerald-700 transition mt-2">
             {isRegistering ? 'Já tenho conta. Fazer Login' : 'Não tem conta? Criar agora'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderShop = () => {
    const promoProducts = products.filter(p => Boolean(p.promotionalPrice > 0));
    let filteredProducts = products.filter(p => selectedCategory === 'Todos' || p.category === selectedCategory);
    if(searchTerm) {
       filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return (
      <div className="pb-32 bg-gray-50 min-h-screen font-sans">
        {/* Header App Style */}
        <div className="bg-emerald-800 text-white p-4 sticky top-0 z-30 shadow-md">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-white text-emerald-800 flex items-center justify-center rounded-lg shadow-sm"><Store className="w-5 h-5"/></div>
                 <h1 className="font-black text-xl text-white tracking-tight">Clube de Compras</h1>
              </div>
              <div className="flex items-center">
                 {user?.role === 'admin' && <span className="bg-emerald-500/30 text-emerald-50 text-[10px] font-bold px-2 py-1 rounded-full mr-2 border border-emerald-500/50">GESTOR MASTER</span>}
                 <button onClick={() => {if(window.confirm('Sair da conta?')) signOut(auth)}} className="p-2 bg-emerald-700/50 rounded-xl hover:bg-emerald-700 transition"><LogOut className="w-4 h-4 text-emerald-100"/></button>
              </div>
           </div>
           
           <div className="relative mb-2">
              <input type="text" placeholder="Estou procurando por..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full py-3.5 pl-12 pr-4 rounded-xl text-slate-800 text-sm focus:outline-none shadow-sm font-medium" />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
           </div>
        </div>

        {/* Cliente Info & Dropdown Categorias */}
        <div className="bg-white px-4 py-3 flex justify-between items-center relative z-20 shadow-sm border-b border-gray-100">
           <div className="flex items-center text-xs text-gray-600 font-medium">
              <Smartphone className="w-4 h-4 mr-1 text-emerald-600"/> Retirada: <span className="font-bold text-slate-800 ml-1">{user?.polo}</span>
           </div>
           <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition">
              {selectedCategory} <ChevronDown className="w-4 h-4 ml-1" />
           </button>
           {dropdownOpen && (
              <div className="absolute top-14 right-4 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                 {categorias.map(c => (
                    <button key={c} onClick={() => {setSelectedCategory(c); setDropdownOpen(false);}} className={`w-full text-left px-4 py-3.5 text-sm border-b border-gray-50 hover:bg-slate-50 transition ${selectedCategory === c ? 'font-bold text-emerald-800 bg-emerald-50/50' : 'text-gray-600 font-medium'}`}>
                       {c}
                    </button>
                 ))}
              </div>
           )}
        </div>

        {user?.walletBalance > 0 && (
           <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                 <Wallet className="w-6 h-6 text-emerald-600" />
                 <div>
                    <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Crédito Disponível</p>
                    <p className="text-xl font-black text-emerald-700">R$ {user.walletBalance.toFixed(2)}</p>
                 </div>
              </div>
           </div>
        )}

        {/* Carrossel de Promoções (Estilo ML) */}
        {promoProducts.length > 0 && !searchTerm && selectedCategory === 'Todos' && (
          <div className="mt-6 px-4">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-lg">Ofertas da Semana</h3>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Aproveite</span>
             </div>
             <div className="flex overflow-x-auto pb-6 gap-4 snap-x hide-scrollbar">
                {promoProducts.map(p => (
                   <div key={`promo-${p.id}`} className="min-w-[160px] max-w-[160px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 snap-center relative flex flex-col justify-between hover:shadow-md transition">
                      <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-br-xl rounded-tl-2xl z-10 shadow-sm">
                         {Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF
                      </span>
                      <div className="h-32 mb-3 flex items-center justify-center relative bg-white rounded-xl p-2 mt-4">
                         {p.image?.length > 10 ? <img src={p.image} className="max-h-full object-contain" alt=""/> : <span className="text-5xl">{p.image || '📦'}</span>}
                      </div>
                      <div>
                         <p className="text-[10px] text-gray-400 line-through font-medium">De R$ {Number(p.price).toFixed(2)}</p>
                         <p className="text-lg font-black text-slate-800 mb-1">R$ {Number(p.promotionalPrice).toFixed(2)}</p>
                         <p className="font-semibold text-slate-700 text-xs line-clamp-2 leading-tight h-8 mb-3">{p.name}</p>
                      </div>
                      <button onClick={() => addToCart(p)} className="w-full bg-emerald-100 text-emerald-800 font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-200 transition">Adicionar</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* Product Grid Normal */}
        <div className="px-4 mt-6">
           <h3 className="font-black text-slate-800 text-lg mb-4">{searchTerm ? 'Resultados da Busca' : 'Catálogo Completo'}</h3>
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredProducts.filter(p => !p.promotionalPrice || p.promotionalPrice === 0).map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition relative">
                    <div className="h-32 mb-3 flex items-center justify-center relative bg-white rounded-xl p-2">
                       {p.image?.length > 10 ? <img src={p.image} className="max-h-full object-contain" alt=""/> : <span className="text-5xl">{p.image || '📦'}</span>}
                    </div>
                    <div>
                       <p className="text-[9px] bg-slate-100 text-slate-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-2">{p.category}</p>
                       <p className="text-lg font-black text-slate-800 mb-1">R$ {Number(p.price).toFixed(2)}</p>
                       <p className="text-[9px] text-emerald-600 font-bold mb-1">Chega ao polo em breve</p>
                       <p className="font-semibold text-slate-600 text-xs line-clamp-2 leading-tight h-8 mb-3">{p.name}</p>
                    </div>
                    <button onClick={() => addToCart(p)} className="w-full bg-emerald-50/50 border border-emerald-200 text-emerald-700 font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-100 transition shadow-sm">Adicionar</button>
                 </div>
              ))}
           </div>
        </div>

        {/* Floating Cart Button for Client */}
        {cart.length > 0 && (
           <button onClick={() => setCurrentScreen('cart')} className="fixed bottom-24 right-4 bg-emerald-700 text-white w-14 h-14 rounded-full shadow-[0_10px_25px_-5px_rgba(4,120,87,0.5)] flex flex-col items-center justify-center border-2 border-white hover:bg-emerald-800 transition transform hover:scale-105 active:scale-95 z-40">
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-black">{cart.reduce((a,c)=>a+c.qtd,0)}</span>
           </button>
        )}
      </div>
    );
  };

  const renderCart = () => {
    const subtotal = cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0);
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-32 font-sans">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('loja')} className="p-2 bg-white rounded-xl shadow-sm mr-4 text-slate-800 hover:bg-slate-100 transition"><ArrowLeft className="w-5 h-5"/></button>
          <h2 className="text-2xl font-black text-slate-800">Sua Cesta</h2>
        </div>
        <div className="space-y-3 mb-6">
           {cart.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-gray-100">
                 <div className="flex items-center gap-4">
                    <span className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-xl text-3xl border border-gray-100">{item.image?.length>10?<img src={item.image} className="w-10 h-10 object-contain" alt=""/>:item.image||'📦'}</span>
                    <div>
                       <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</p>
                       <p className="text-sm font-black text-emerald-700">R$ {(item.promotionalPrice>0?item.promotionalPrice:item.price).toFixed(2)}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-gray-200">
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: Math.max(0, i.qtd-1)}:i).filter(i=>i.qtd>0))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 font-bold text-lg">-</button>
                    <span className="font-bold text-slate-800 text-sm w-5 text-center">{item.qtd}</span>
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: i.qtd+1}:i))} className="w-8 h-8 flex items-center justify-center text-emerald-700 font-bold text-lg">+</button>
                 </div>
              </div>
           ))}
        </div>
        {cart.length > 0 ? (
           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-sm font-bold text-gray-500">Total da Cesta:</span>
                 <span className="text-2xl font-black text-slate-800">R$ {subtotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setCurrentScreen('payment')} className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold flex justify-center items-center shadow-lg hover:bg-emerald-800 transition text-lg">
                 Pagar e Finalizar Pedido
              </button>
           </div>
        ) : (
           <div className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">A sua cesta está vazia.</p>
              <button onClick={() => setCurrentScreen('loja')} className="mt-6 bg-emerald-50 text-emerald-700 font-bold px-6 py-3 rounded-xl">Voltar para a Loja</button>
           </div>
        )}
      </div>
    );
  };

  const renderPayment = () => {
    if(cart.length === 0) { setCurrentScreen('loja'); return null; }
    const subtotal = cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0);
    const balanceToUse = Math.min(subtotal, user?.walletBalance || 0);
    const finalTotal = subtotal - balanceToUse;

    const handleConfirm = async () => {
       setLoading(true);
       try {
         const newOrder = {
           customer: user.name, customerEmail: user.email, polo: user.polo,
           items: cart, total: finalTotal, subtotal: subtotal, balanceUsed: balanceToUse,
           date: new Date().toISOString(), status: 'pago' // Simulando Gateway
         };
         await addDoc(collection(db, "orders"), newOrder);
         if (balanceToUse > 0) {
            await updateDoc(doc(db, "users", user.id), { walletBalance: user.walletBalance - balanceToUse });
         }
         setCart([]); showToast('Pagamento Confirmado pelo Banco!');
         loadData(); setCurrentScreen('orders');
       } catch (e) { showToast('Erro ao processar pagamento', 'error'); }
       setLoading(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans">
         <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('cart')} className="px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm shadow-sm flex items-center hover:bg-emerald-200 transition"><Edit2 className="w-4 h-4 mr-2"/> Editar Cesta</button>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
           <div className="flex justify-between items-center text-sm font-medium text-gray-500 pb-4 border-b border-gray-100">
              <span>Subtotal Itens</span>
              <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
           </div>
           {balanceToUse > 0 && (
             <div className="flex justify-between items-center text-sm font-bold text-emerald-600 pb-4 border-b border-gray-100">
                <span>Saldo da Carteira Aplicado</span>
                <span>- R$ {balanceToUse.toFixed(2)}</span>
             </div>
           )}
           <div className="flex justify-between items-center pt-2 mb-6">
              <span className="text-gray-500 font-bold text-sm uppercase tracking-wider">Total a Pagar</span>
              <span className="text-3xl font-black text-slate-800">R$ {finalTotal.toFixed(2)}</span>
           </div>

           <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center text-center shadow-inner">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4">
                 {/* QR Code Simulado */}
                 <div className="w-40 h-40 bg-gray-100 flex items-center justify-center border-4 border-emerald-500 rounded-xl">
                    <span className="text-emerald-700 font-black opacity-30 text-xs text-center px-4">QR CODE DO MERCADO PAGO AQUI</span>
                 </div>
              </div>
              <p className="font-black text-emerald-800 text-lg">Pague com PIX</p>
              <p className="text-xs text-emerald-600 mb-4 font-medium">Aprovação instantânea, sem taxas da maquininha.</p>
              
              <div className="bg-white p-3 rounded-xl border border-gray-200 w-full mb-4 shadow-sm relative">
                 <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Código Copia e Cola</p>
                 <p className="font-mono text-[10px] break-all text-slate-600 bg-gray-50 p-3 rounded-lg select-all text-left border border-gray-100">
                   00020126580014br.gov.bcb.pix0136gateway-mercadopago5204000053039865405{finalTotal.toFixed(2)}5802BR5916Clube de Compras...
                 </p>
              </div>
           </div>

           <button onClick={handleConfirm} disabled={loading} className="w-full bg-emerald-700 text-white p-4 rounded-xl font-bold flex justify-center items-center hover:bg-emerald-800 transition shadow-lg mt-4 text-lg disabled:opacity-50">
              {loading ? 'Aguardar Banco...' : 'Simular Confirmação PIX'}
           </button>
        </div>
      </div>
    );
  };

  const renderMyOrders = () => {
     const myOrders = orders.filter(o => o.customerEmail === user?.email).sort((a,b) => new Date(b.date) - new Date(a.date));

     return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Minhas Encomendas</h2>
              <button onClick={() => setCurrentScreen('loja')} className="text-emerald-700 text-xs font-bold flex items-center bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg hover:bg-emerald-100 transition"><Home className="w-4 h-4 mr-1"/> Loja</button>
           </div>
           
           {user?.walletBalance > 0 && (
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-6 rounded-3xl shadow-lg mb-6 relative overflow-hidden border border-emerald-900/20">
                 <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
                 <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Carteira Digital</p>
                 <p className="text-4xl font-black mb-4">R$ {user.walletBalance.toFixed(2)}</p>
                 
                 <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                    <p className="text-xs text-emerald-50 mb-3 leading-relaxed font-medium"><AlertCircle className="w-4 h-4 inline mr-1"/> Um ou mais itens do seu pedido não foram entregues pelo fornecedor. O valor foi creditado para usar na sua próxima feira!</p>
                    <button onClick={() => setPixRefundModal(true)} className="w-full bg-white text-emerald-800 px-4 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-sm">
                       Prefere receber este valor via PIX?
                    </button>
                 </div>
              </div>
           )}

           {user?.pendingPixRefund > 0 && (
               <div className="bg-orange-50 border border-orange-200 text-orange-800 p-5 rounded-2xl mb-6 flex items-start shadow-sm">
                  <Landmark className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0" />
                  <div>
                     <p className="font-bold text-sm">Estorno Solicitado: R$ {user.pendingPixRefund.toFixed(2)}</p>
                     <p className="text-xs opacity-80 mt-1 font-medium">Recebemos sua chave PIX. A nossa equipe administrativa fará a transferência em breve.</p>
                  </div>
               </div>
           )}
           
           {user?.refundDone && user?.walletBalance === 0 && user?.pendingPixRefund === 0 && (
               <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl mb-6 flex items-center shadow-sm">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" />
                  <p className="font-bold text-sm">Estorno Realizado com Sucesso para sua conta!</p>
               </div>
           )}

           {myOrders.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 p-8 bg-white rounded-3xl border border-gray-200 border-dashed">
                 <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                 <p className="font-bold text-slate-600">Nenhuma encomenda ainda.</p>
                 <button onClick={()=>setCurrentScreen('loja')} className="mt-4 bg-emerald-50 text-emerald-700 font-bold px-6 py-3 rounded-xl text-sm">Fazer a primeira compra</button>
              </div>
           ) : (
              <div className="space-y-4">
                 {myOrders.map(o => (
                    <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                       <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                          <div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{new Date(o.date).toLocaleDateString()}</p>
                             <p className="font-black text-slate-800 text-sm">Pedido #{o.id.substring(0,5)}</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider flex items-center"><Check className="w-3 h-3 mr-1"/> Confirmado</span>
                       </div>
                       
                       {o.hasMissingItems && (
                          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4 text-orange-800 text-xs flex items-start">
                             <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5"/>
                             <p className="font-medium">Atenção: Um item faltou na colheita. O valor correspondente foi devolvido para a sua carteira.</p>
                          </div>
                       )}

                       <div className="space-y-3 mb-4">
                          {o.items.map((i, idx) => (
                             <div key={idx} className={`flex justify-between items-center text-sm ${i.missing ? 'opacity-50 text-gray-400' : 'text-slate-700 font-medium'}`}>
                                <span className="flex items-center"><span className="w-6 h-6 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black mr-3 text-slate-600">{i.qtd}x</span> <span className={`line-clamp-1 ${i.missing && 'line-through'}`}>{i.name}</span></span>
                                <span>R$ {(i.qtd * (i.promotionalPrice>0?i.promotionalPrice:i.price)).toFixed(2)}</span>
                             </div>
                          ))}
                       </div>
                       <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pago</span>
                          <span className="text-xl font-black text-slate-800">R$ {o.total.toFixed(2)}</span>
                       </div>
                    </div>
                 ))}
              </div>
           )}

           {pixRefundModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100">
                    <h3 className="font-black text-slate-800 text-xl mb-2">Solicitar Estorno PIX</h3>
                    <p className="text-sm text-gray-600 mb-6 font-medium">Iremos devolver o seu saldo de <strong>R$ {user.walletBalance.toFixed(2)}</strong> diretamente para a sua conta.</p>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sua Chave PIX</label>
                    <input type="text" placeholder="CPF, E-mail, Celular ou Aleatória" value={pixKeyInput} onChange={e=>setPixKeyInput(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 mb-6 outline-none font-medium" />
                    <div className="flex gap-3">
                       <button onClick={()=>setPixRefundModal(false)} className="flex-1 p-4 bg-gray-100 text-slate-600 font-bold rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                       <button onClick={requestPixRefund} className="flex-1 p-4 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition shadow-md">Confirmar Pedido</button>
                    </div>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderRepDashboard = () => {
     let repOrders = orders.filter(o => o.polo === user?.polo && o.status === 'pago');
     const groupByMonth = repOrders.reduce((acc, order) => {
        const date = new Date(order.date);
        const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if(!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(order);
        return acc;
     }, {});

     const openWhatsApp = (phone, text) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
     };

     return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans print:bg-white print:p-0">
           <div className="print:hidden mb-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">Acompanhamento Logístico</h2>
              <p className="text-xs text-emerald-800 font-bold bg-emerald-100 inline-block px-3 py-1.5 rounded-lg border border-emerald-200">Unidade: {user?.polo}</p>
           </div>

           <div className="print:hidden mb-6 flex gap-3">
              <button onClick={()=>window.print()} className="flex-1 bg-white border border-gray-200 text-slate-700 font-bold text-sm p-4 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 transition"><FileText className="w-5 h-5 mr-2 text-gray-400"/> Imprimir Separação</button>
              <button onClick={() => setRepManualOrderModal(true)} className="flex-1 bg-emerald-700 text-white font-bold text-sm p-4 rounded-2xl shadow-sm flex items-center justify-center hover:bg-emerald-800 transition"><Plus className="w-5 h-5 mr-2"/> Lançar Venda Local</button>
           </div>

           <div className="space-y-6">
              {Object.keys(groupByMonth).sort((a,b)=>new Date(b)-new Date(a)).map(month => (
                 <div key={month} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:mb-8">
                    <h3 className="font-black text-slate-800 text-lg mb-4 pb-3 border-b border-gray-100 capitalize">{month}</h3>
                    <div className="space-y-4">
                       {groupByMonth[month].map(o => {
                          const customerDoc = customers.find(c => c.email === o.customerEmail);
                          return (
                          <div key={o.id} className="bg-gray-50 border border-gray-100 p-5 rounded-2xl print:bg-white print:border-b print:rounded-none">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                   <p className="font-black text-slate-800 text-base">{o.customer}</p>
                                   <p className="text-[10px] text-gray-500 font-bold mt-1 tracking-wide">#{o.id.substring(0,5)} • {new Date(o.date).toLocaleDateString()} • <span className="text-emerald-700 font-black">R$ {o.total.toFixed(2)}</span></p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2 print:hidden">
                                   {o.hasMissingItems && <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-2 py-1 rounded border border-orange-200">FALTA REGISTRADA</span>}
                                   {customerDoc?.refundDone && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-1 rounded border border-blue-200">ESTORNADO</span>}
                                   {o.isManual && <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-1 rounded border border-emerald-200">VENDA LOCAL</span>}
                                </div>
                             </div>
                             
                             <div className="flex flex-wrap gap-2 mb-5 print:block">
                                {o.items.map((i, idx) => (
                                   <span key={idx} className={`bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm print:border-none print:block print:text-xs print:shadow-none print:p-0 print:mb-1 ${i.missing ? 'text-red-400 line-through bg-red-50 border-red-100' : 'text-slate-600'}`}>
                                      <span className="print:hidden">{i.qtd}X {i.name.toUpperCase()}</span>
                                      <span className="hidden print:inline-block border border-black w-4 h-4 mr-3 align-middle rounded-sm"></span><span className="hidden print:inline-block">{i.qtd}X {i.name.toUpperCase()}</span>
                                   </span>
                                ))}
                             </div>

                             <div className="flex gap-3 print:hidden">
                                <button onClick={() => setRepShortageModal(o)} className="flex-1 bg-orange-50 text-orange-800 font-bold text-xs py-3 rounded-xl hover:bg-orange-100 transition shadow-sm border border-orange-100">Faltas</button>
                                <button onClick={() => {
                                   if(customerDoc?.whatsapp) {
                                      openWhatsApp(customerDoc.whatsapp, `Olá ${customerDoc.name}, aqui é do Clube de Compras! O seu pedido #${o.id.substring(0,5)} no valor de R$ ${o.total.toFixed(2)} já está disponível para retirada.`);
                                   } else {
                                      showToast("Telefone não cadastrado.", "error");
                                   }
                                }} className="flex-1 bg-emerald-100 text-emerald-800 font-bold text-xs py-3 rounded-xl hover:bg-emerald-200 transition shadow-sm flex items-center justify-center border border-emerald-200"><MessageCircle className="w-4 h-4 mr-1.5"/> Recibo</button>
                             </div>
                          </div>
                       )})}
                    </div>
                 </div>
              ))}
              {repOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-12 font-bold bg-white rounded-3xl border border-gray-100 border-dashed">Nenhum pedido processado nesta unidade ainda.</p>}
           </div>

           {/* Rep Shortage Modal */}
           {repShortageModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-800 text-xl">Registrar Falta</h3>
                       <button onClick={() => setRepShortageModal(null)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6 shadow-sm">
                       <p className="text-xs text-orange-800 font-medium leading-relaxed">Clique no item que o fornecedor não entregou. O valor será <strong className="font-black">creditado automaticamente na carteira</strong> do cliente.</p>
                    </div>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                       {repShortageModal.items.filter(i => !i.missing).map((item, idx) => (
                          <button key={idx} onClick={() => {if(window.confirm(`Registrar falta de ${item.name} e gerar crédito de R$ ${(item.qtd * (item.promotionalPrice>0?item.promotionalPrice:item.price)).toFixed(2)}?`)) markAsMissing(repShortageModal, item)}} className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 flex justify-between items-center transition shadow-sm">
                             <span className="font-bold text-slate-700 text-sm">{item.qtd}X {item.name}</span>
                             <span className="text-orange-600 font-black">R$ {(item.qtd * (item.promotionalPrice>0?item.promotionalPrice:item.price)).toFixed(2)}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {/* Manual Order Modal */}
           {repManualOrderModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-800 text-xl">Venda Local / WhatsApp</h3>
                       <button onClick={() => setRepManualOrderModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-5 h-5"/></button>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-4">Selecione um cliente da sua base para registrar o pagamento feito diretamente a você.</p>
                    
                    <select value={manualOrderCustomer} onChange={e=>setManualOrderCustomer(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-slate-700 mb-6">
                       <option value="">Selecione o Cliente...</option>
                       {customers.filter(c => c.polo === user.polo).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    {customers.filter(c => c.polo === user.polo).length === 0 && (
                        <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 mb-6 font-bold">Nenhum cliente cadastrado no polo {user.polo}. Peça para eles criarem uma conta no aplicativo primeiro.</p>
                    )}

                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
                       <p className="text-xs text-emerald-800 font-medium">Os itens da sua cesta atual serão usados para criar este pedido. Preencha a cesta na Loja antes de lançar a venda.</p>
                       <p className="font-black text-emerald-900 mt-2">Cesta Atual: R$ {cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0).toFixed(2)}</p>
                    </div>
                    
                    <button onClick={async () => {
                       if(!manualOrderCustomer) return showToast('Selecione um cliente', 'error');
                       if(cart.length === 0) return showToast('Sua cesta está vazia', 'error');
                       setLoading(true);
                       try {
                          const c = customers.find(x => x.id === manualOrderCustomer);
                          const total = cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0);
                          await addDoc(collection(db, "orders"), {
                             customer: c.name, customerEmail: c.email, polo: user.polo,
                             items: cart, total: total, subtotal: total, balanceUsed: 0,
                             date: new Date().toISOString(), status: 'pago', isManual: true
                          });
                          setCart([]); setRepManualOrderModal(false); showToast('Venda lançada com sucesso!'); loadData();
                       } catch(e) { showToast('Erro', 'error'); }
                       setLoading(false);
                    }} disabled={loading || !manualOrderCustomer || cart.length === 0} className="w-full bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-emerald-800 transition disabled:opacity-50">Lançar Pedido Pago</button>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderAdminDashboard = () => {
    const totalSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const retainedCredits = customers.reduce((acc, c) => acc + (c.walletBalance || 0), 0);
    
    // D3 Simulação
    const last7Days = Array.from({length: 7}).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0];
    });
    const salesByDay = last7Days.map(date => orders.filter(o => o.date && o.date.startsWith(date)).reduce((sum, o) => sum + (o.total || 0), 0));

    // Top 5 Produtos
    let productStats = {};
    orders.forEach(o => {
       o.items.forEach(i => {
          if(!i.missing) {
             if(!productStats[i.id]) productStats[i.id] = {name: i.name, image: i.image, qtd: 0, val: 0};
             productStats[i.id].qtd += i.qtd;
             productStats[i.id].val += i.qtd * (i.promotionalPrice > 0 ? i.promotionalPrice : i.price);
          }
       });
    });
    const top5 = Object.values(productStats).sort((a,b)=>b.val - a.val).slice(0,5);

    // Calculo Estoque Fornecedor
    let supplierOrders = {};
    orders.forEach(o => {
       o.items.forEach(i => {
          if(!i.missing) {
             if(!supplierOrders[i.id]) supplierOrders[i.id] = {name: i.name, image: i.image, sold: 0, minQty: 1, stock: 0, buyBoxes: 0, newStock: 0, destinos: {}};
             supplierOrders[i.id].sold += i.qtd;
             if(!supplierOrders[i.id].destinos[o.polo]) supplierOrders[i.id].destinos[o.polo] = 0;
             supplierOrders[i.id].destinos[o.polo] += i.qtd;
          }
       });
    });
    products.forEach(p => {
       if(supplierOrders[p.id]) {
          supplierOrders[p.id].minQty = p.minQty || 1;
          supplierOrders[p.id].stock = p.stock || 0;
          let netDemand = Math.max(0, supplierOrders[p.id].sold - supplierOrders[p.id].stock);
          supplierOrders[p.id].buyBoxes = Math.ceil(netDemand / supplierOrders[p.id].minQty);
          supplierOrders[p.id].newStock = (supplierOrders[p.id].stock + (supplierOrders[p.id].buyBoxes * supplierOrders[p.id].minQty)) - supplierOrders[p.id].sold;
       }
    });

    const openWhatsApp = (phone, text) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
    };

    const downloadCSV = () => {
       let csvContent = "data:text/csv;charset=utf-8,SKU;NOME_PRODUTO;PRECO;CATEGORIA;UN_CAIXA\n";
       csvContent += "7891;Tomate Organico;15.50;Hortifruti;20\n";
       csvContent += "7892;Alface Lisa;3.00;Hortifruti;15\n";
       const encodedUri = encodeURI(csvContent);
       const link = document.createElement("a");
       link.setAttribute("href", encodedUri);
       link.setAttribute("download", "modelo_importacao_clube.csv");
       document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const downloadSupplierOrder = () => {
       let csvContent = "data:text/csv;charset=utf-8,PRODUTO;VENDIDO;ESTOQUE_LOCAL;CAIXAS_A_COMPRAR;TAMANHO_CAIXA;NOVO_ESTOQUE_LOCAL\n";
       Object.values(supplierOrders).filter(s => s.buyBoxes > 0).forEach(s => {
           csvContent += `${s.name};${s.sold};${s.stock};${s.buyBoxes};${s.minQty};${s.newStock}\n`;
       });
       const encodedUri = encodeURI(csvContent);
       const link = document.createElement("a"); link.setAttribute("href", encodedUri);
       link.setAttribute("download", `pedido_fornecedor_${new Date().toISOString().split('T')[0]}.csv`);
       document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
      <div className="bg-gray-50 min-h-screen font-sans flex pb-24">
         {/* Hamburger Navigation Menu */}
         {adminSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] lg:hidden" onClick={() => setAdminSidebarOpen(false)} />}
         <div className={`fixed inset-y-0 left-0 z-[120] w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${adminSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
            <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-gray-50">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-700 text-white flex items-center justify-center rounded-lg shadow-sm"><BarChart3 className="w-5 h-5"/></div>
                  <span className="font-black text-xl text-slate-800 tracking-tight">Gestão</span>
               </div>
               <button onClick={() => setAdminSidebarOpen(false)} className="text-gray-400 hover:text-slate-800 p-2 bg-white rounded-xl shadow-sm border border-gray-200 transition"><X className="w-4 h-4"/></button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
               <button onClick={() => {setAdminTab('dashboard'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='dashboard'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><TrendingUp className="w-5 h-5 mr-3 opacity-80"/> Dashboard Geral</button>
               <button onClick={() => {setAdminTab('vendas'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='vendas'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><Store className="w-5 h-5 mr-3 opacity-80"/> Histórico de Vendas</button>
               <button onClick={() => {setAdminTab('compras'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='compras'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><Package className="w-5 h-5 mr-3 opacity-80"/> Compras & Logística</button>
               <button onClick={() => {setAdminTab('catalogo'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='catalogo'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><Edit2 className="w-5 h-5 mr-3 opacity-80"/> Catálogo & Tabela</button>
               <button onClick={() => {setAdminTab('clientes'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='clientes'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><Users className="w-5 h-5 mr-3 opacity-80"/> Base de Clientes (CRM)</button>
               <button onClick={() => {setAdminTab('financeiro'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-xl font-bold text-sm transition-all ${adminTab==='financeiro'?'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm':'text-slate-600 hover:bg-gray-50 border border-transparent'}`}><Landmark className="w-5 h-5 mr-3 opacity-80"/> Financeiro & Reembolsos</button>
            </nav>
            <div className="p-6 border-t border-gray-100 bg-gray-50">
               <button onClick={() => {setGlobalShortageModal(true); setAdminSidebarOpen(false);}} className="w-full flex items-center justify-center p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-black text-sm transition-colors border border-red-200 shadow-sm"><AlertTriangle className="w-4 h-4 mr-2"/> Informar Falta Global</button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col min-h-screen">
            {/* Top Bar inside Content */}
            <div className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-30 shadow-sm">
               <button onClick={() => setAdminSidebarOpen(true)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-700 hover:bg-gray-100 transition shadow-sm">
                  <Menu className="w-5 h-5" />
               </button>
               <div>
                  <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">{adminTab.replace('-', ' ')}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Painel Administrativo</p>
               </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6 flex-1">
               {/* --- DASHBOARD TAB --- */}
               {adminTab === 'dashboard' && (
                   <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Vendas Totais</p>
                             <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {totalSales.toFixed(2)}</p>
                         </div>
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Pedidos Registrados</p>
                             <p className="text-3xl font-black text-slate-800 tracking-tight">{orders.length}</p>
                         </div>
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden col-span-2 md:col-span-1">
                             <div className="absolute top-0 left-0 w-2 h-full bg-orange-400"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Créditos Clientes</p>
                             <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {retainedCredits.toFixed(2)}</p>
                         </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                          <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-emerald-600"/> Tendência 7 Dias</h3>
                          <div className="relative w-full h-56 bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
                            <svg viewBox="0 -10 100 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                              <polyline fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={salesByDay.map((d, i) => `${(i / 6) * 100},${100 - (d / Math.max(...salesByDay, 1)) * 100}`).join(' ')} vectorEffect="non-scaling-stroke"/>
                              {salesByDay.map((d, i) => (
                                 <g key={i}>
                                   <circle cx={(i / 6) * 100} cy={100 - (d / Math.max(...salesByDay, 1)) * 100} r="4" fill="#fff" stroke="#059669" strokeWidth="2" />
                                   <text x={(i / 6) * 100} y="118" fontSize="4" fill="#94a3b8" textAnchor="middle" fontWeight="bold">{last7Days[i].split('-')[2]}</text>
                                 </g>
                              ))}
                            </svg>
                          </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                         <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center"><Store className="w-5 h-5 mr-2 text-emerald-600"/> Top 5 Produtos</h3>
                         <div className="space-y-4">
                            {top5.map((p, idx) => (
                               <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-emerald-50 hover:border-emerald-100 transition">
                                  <div className="flex items-center gap-4">
                                     <span className="w-12 h-12 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-center text-2xl">{p.image?.length>10?<img src={p.image} className="w-8 h-8 object-contain" alt=""/>:p.image||'📦'}</span>
                                     <div>
                                        <p className="font-bold text-slate-800 text-base">{p.name}</p>
                                        <p className="text-xs text-gray-500 font-bold">{p.qtd} unidades vendidas</p>
                                     </div>
                                  </div>
                                  <span className="font-black text-emerald-700 text-lg">R$ {p.val.toFixed(2)}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </>
               )}

               {/* --- VENDAS TAB --- */}
               {adminTab === 'vendas' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 text-lg">Histórico de Pedidos Recebidos</h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-slate-500">
                                 <th className="p-4 font-bold border-b border-gray-200">Data / Pedido</th>
                                 <th className="p-4 font-bold border-b border-gray-200">Cliente / Polo</th>
                                 <th className="p-4 font-bold border-b border-gray-200">Itens</th>
                                 <th className="p-4 font-bold border-b border-gray-200">Total</th>
                                 <th className="p-4 font-bold border-b border-gray-200 text-center">Ações</th>
                              </tr>
                           </thead>
                           <tbody>
                              {orders.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o => (
                                 <tr key={o.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                                    <td className="p-4">
                                       <p className="text-sm font-bold text-slate-800">{new Date(o.date).toLocaleDateString()}</p>
                                       <p className="text-[10px] text-gray-400 font-black">#{o.id.substring(0,5)}</p>
                                    </td>
                                    <td className="p-4">
                                       <p className="text-sm font-bold text-slate-800">{o.customer}</p>
                                       <p className="text-[10px] text-emerald-600 font-black uppercase">{o.polo}</p>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex flex-wrap gap-1">
                                          {o.items.map((i,idx)=><span key={idx} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-1 rounded border border-gray-200">{i.qtd}x</span>)}
                                       </div>
                                    </td>
                                    <td className="p-4 text-sm font-black text-slate-800">R$ {o.total.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                       <button onClick={async ()=>{if(window.confirm('Apagar pedido? O valor não retornará ao cliente.')){await deleteDoc(doc(db,"orders",o.id));loadData()}}} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition"><Trash2 className="w-5 h-5"/></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* --- LOGISTICA / COMPRAS TAB --- */}
               {adminTab === 'compras' && (
                  <div className="space-y-6">
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                           <h3 className="font-black text-slate-800 text-lg mb-1">Consolidação de Compras</h3>
                           <p className="text-xs text-gray-500 font-medium">O sistema calcula o pedido do fornecedor abatendo o estoque local da sua sede.</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                           <button onClick={downloadSupplierOrder} className="flex-1 sm:flex-none bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-emerald-800 transition shadow-sm border border-emerald-800 flex items-center justify-center"><Download className="w-4 h-4 mr-2"/> Pedido Fornecedor (CSV)</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(supplierOrders).map((s, idx) => (
                           <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative">
                              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-50">
                                 <span className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-3xl">{s.image?.length>10?<img src={s.image} className="w-8 h-8 object-contain" alt=""/>:s.image||'📦'}</span>
                                 <div>
                                    <p className="font-black text-slate-800 text-sm line-clamp-2 leading-tight">{s.name}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1">CX FORNECEDOR: {s.minQty} UN</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                 <div className="bg-gray-50 p-2 rounded-xl text-center border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Vendido</p><p className="font-black text-slate-800 text-lg">{s.sold}</p></div>
                                 <div className="bg-gray-50 p-2 rounded-xl text-center border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Local</p><p className="font-black text-slate-800 text-lg">{s.stock}</p></div>
                                 <div className="bg-emerald-700 p-2 rounded-xl text-center border border-emerald-800 shadow-inner"><p className="text-[9px] font-black text-emerald-100 uppercase tracking-wider mb-1">Comprar (Cx)</p><p className="font-black text-white text-xl">{s.buyBoxes}</p></div>
                              </div>
                              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-center mb-4">
                                 <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Sobra Futura Estoque Local: <span className="text-sm">{s.newStock}</span></p>
                              </div>
                              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                 <p className="font-bold text-[10px] uppercase text-gray-400 mb-2">Destinos:</p>
                                 {Object.entries(s.destinos).map(([polo, qtd]) => <div key={polo} className="flex justify-between border-b border-gray-100 last:border-0 py-1 font-medium"><span>{polo}</span><span className="font-bold text-emerald-700">{qtd}</span></div>)}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* --- CATALOGO TAB --- */}
               {adminTab === 'catalogo' && (
                  <div className="space-y-6">
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                           <h3 className="font-black text-slate-800 text-lg mb-1">Catálogo de Produtos</h3>
                           <p className="text-xs text-gray-500 font-medium">Gestão do catálogo em tempo real. Adicione itens e promoções.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                           <button onClick={downloadCSV} className="bg-white text-gray-600 border border-gray-200 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm">Baixar Modelo CSV</button>
                           <label className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-blue-100 transition flex items-center justify-center shadow-sm">
                              <UploadCloud className="w-4 h-4 mr-2"/> Importar CSV
                              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                           </label>
                           <button onClick={() => setEditingProduct({ sku: '', name: '', price: '', category: 'Geral', minQty: 1, stock: 0, image: '📦' })} className="bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition shadow-sm flex items-center justify-center border border-emerald-800">
                              <Plus className="w-4 h-4 mr-2"/> Novo Produto
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(p => (
                           <div key={p.id} className="flex flex-col justify-between p-5 bg-white border border-gray-100 shadow-sm rounded-3xl hover:shadow-md transition">
                              <div className="flex items-start gap-4 mb-4">
                                 <span className="text-3xl w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 flex-shrink-0">{p.image?.length>10?<img src={p.image} className="w-12 h-12 object-contain" alt=""/>:p.image||'📦'}</span>
                                 <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">{p.sku || 'S/SKU'} • {p.category}</p>
                                    <p className="font-black text-slate-800 text-sm line-clamp-2 leading-tight mb-2">{p.name}</p>
                                    <div className="flex items-center gap-2">
                                       <span className="text-base font-black text-slate-800">R$ {Number(p.price).toFixed(2)}</span>
                                       {p.promotionalPrice > 0 && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200">Por R$ {Number(p.promotionalPrice).toFixed(2)}</span>}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-2 border-t border-gray-50 pt-4">
                                 <button onClick={() => setEditingProduct(p)} className="flex-1 py-2.5 text-blue-600 bg-blue-50 border border-blue-100 font-bold text-xs rounded-xl hover:bg-blue-100 transition shadow-sm flex items-center justify-center"><Edit2 className="w-3 h-3 mr-1.5"/> Editar</button>
                                 <button onClick={() => deleteProduct(p.id)} className="flex-1 py-2.5 text-red-600 bg-red-50 border border-red-100 font-bold text-xs rounded-xl hover:bg-red-100 transition shadow-sm flex items-center justify-center"><Trash2 className="w-3 h-3 mr-1.5"/> Apagar</button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* --- CRM TAB --- */}
               {adminTab === 'clientes' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="font-black text-slate-800 text-lg">Base de Clientes (CRM)</h3></div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-slate-500">
                                 <th className="p-4 font-bold border-b border-gray-200">Cliente</th>
                                 <th className="p-4 font-bold border-b border-gray-200">Contato / Polo</th>
                                 <th className="p-4 font-bold border-b border-gray-200">Perfil / Carteira</th>
                                 <th className="p-4 font-bold border-b border-gray-200 text-center">Ações</th>
                              </tr>
                           </thead>
                           <tbody>
                              {customers.map(c => (
                                 <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                    <td className="p-4">
                                       <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                       <p className="text-[10px] text-gray-400 font-bold">{c.email}</p>
                                    </td>
                                    <td className="p-4">
                                       <p className="text-xs font-bold text-slate-600 mb-0.5">{c.whatsapp || 'Sem Whats'}</p>
                                       <p className="text-[10px] text-emerald-600 font-black uppercase">{c.polo}</p>
                                    </td>
                                    <td className="p-4">
                                       <p className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded inline-block uppercase mb-1">{c.role}</p>
                                       {c.walletBalance > 0 && <p className="text-xs font-black text-emerald-700">R$ {c.walletBalance.toFixed(2)}</p>}
                                    </td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                       <button onClick={() => openWhatsApp(c.whatsapp, `Olá ${c.name}, aqui é do Clube de Compras!`)} className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition border border-emerald-100 shadow-sm"><MessageCircle className="w-4 h-4"/></button>
                                       <button onClick={async ()=>{if(window.confirm('Excluir cliente?')){await deleteDoc(doc(db,"users",c.id));loadData()}}} className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-100 rounded-xl transition"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* --- FINANCEIRO TAB --- */}
               {adminTab === 'financeiro' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={()=>setAdminTab('clientes')} className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-left hover:shadow-md transition">
                           <p className="text-emerald-800 text-xs font-bold uppercase tracking-widest mb-2 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Crédito na Carteira (Total)</p>
                           <p className="text-4xl font-black text-emerald-700">R$ {retainedCredits.toFixed(2)}</p>
                           <p className="text-[10px] font-bold text-emerald-600 mt-2">Clique para ver clientes no CRM</p>
                        </button>
                        <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl text-left">
                           <p className="text-orange-800 text-xs font-bold uppercase tracking-widest mb-2 flex items-center"><Landmark className="w-4 h-4 mr-2"/> Estornos PIX Pendentes</p>
                           <p className="text-4xl font-black text-orange-600">R$ {customers.reduce((a,c)=>a+(c.pendingPixRefund||0),0).toFixed(2)}</p>
                           <p className="text-[10px] font-bold text-orange-600 mt-2">Urgente: Transferir pelo Banco</p>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center"><AlertCircle className="w-5 h-5 text-orange-500 mr-2"/><h3 className="font-black text-slate-800 text-lg">Fila de Reembolso PIX</h3></div>
                        <div className="divide-y divide-gray-50">
                           {customers.filter(c => c.pendingPixRefund > 0).map(c => (
                              <div key={c.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:bg-gray-50 transition">
                                 <div>
                                    <p className="font-black text-slate-800 text-base mb-1">{c.name}</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                       <span className="bg-white text-slate-600 text-[11px] font-mono px-3 py-1.5 rounded-lg select-all border border-gray-200 shadow-sm flex items-center"><Landmark className="w-3 h-3 mr-1.5 text-gray-400"/> Chave: {c.pixKey}</span>
                                       <span className="font-black text-orange-600 text-lg">R$ {c.pendingPixRefund.toFixed(2)}</span>
                                    </div>
                                 </div>
                                 <div className="flex w-full sm:w-auto gap-3">
                                    <button onClick={() => openWhatsApp(c.whatsapp, `Olá ${c.name}, confirmamos seu pedido de estorno de R$ ${c.pendingPixRefund.toFixed(2)} para a chave PIX: ${c.pixKey}. A transferência será realizada em breve.`)} className="flex-1 sm:flex-none p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-100 transition flex justify-center items-center shadow-sm"><MessageCircle className="w-5 h-5"/></button>
                                    <button onClick={() => {if(window.confirm('Marcar estorno como transferido no banco?')) approveRefund(c.id)}} className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-900 transition shadow-md border border-slate-900">Marcar Transferido</button>
                                 </div>
                              </div>
                           ))}
                           {customers.filter(c => c.pendingPixRefund > 0).length === 0 && (
                              <div className="p-12 text-center">
                                 <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                 <p className="text-gray-400 font-bold">Nenhum estorno pendente.</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* --- MODAIS DE GESTÃO --- */}
         {editingProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                     <h3 className="font-black text-2xl text-slate-800">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                     <button onClick={() => setEditingProduct(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X className="w-5 h-5"/></button>
                  </div>
                  <form className="space-y-5" onSubmit={e => e.preventDefault()} key={editingProduct?.id || 'new'}>
                     <div className="flex flex-col sm:flex-row gap-5">
                        <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                           {editingProduct.image?.length>10?<img src={editingProduct.image} className="w-full h-full object-cover" alt=""/>:<span className="text-4xl">{editingProduct.image||'📦'}</span>}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ícone / Foto</label>
                           <input type="text" placeholder="Cole um Emoji 🍉" value={editingProduct.image?.length < 10 ? editingProduct.image : ''} onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none mb-2 font-medium" />
                           <label className="bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl text-center cursor-pointer hover:bg-slate-200 transition shadow-sm block">
                              Ou subir foto <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                           </label>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">SKU / Código</label><input type="text" placeholder="0001" defaultValue={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" /></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Categoria</label>
                        <select defaultValue={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-slate-700">
                           {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select></div>
                     </div>
                     <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nome do Produto</label><input type="text" placeholder="Ex: Maçã Gala" defaultValue={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" /></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Preço (R$)</label><input type="number" defaultValue={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-black text-slate-800" /></div>
                        <div><label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Promoção (Opcional)</label><input type="number" defaultValue={editingProduct.promotionalPrice || ''} onChange={e => setEditingProduct({...editingProduct, promotionalPrice: e.target.value})} className="w-full p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-black text-emerald-800" placeholder="R$ 0.00" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Caixa Fornecedor (Qtd)</label><input type="number" defaultValue={editingProduct.minQty || 1} onChange={e => setEditingProduct({...editingProduct, minQty: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium" /></div>
                        <div><label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1 block">Estoque Local (Sobra)</label><input type="number" defaultValue={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-3.5 bg-orange-50 border border-orange-200 rounded-xl outline-none font-black text-orange-800" /></div>
                     </div>
                     <div className="pt-4 border-t border-gray-50">
                        <button onClick={saveProduct} className="w-full bg-emerald-700 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-emerald-800 transition text-base">Salvar Produto</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {globalShortageModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-red-600 text-xl flex items-center"><AlertTriangle className="w-6 h-6 mr-2"/> Falta Global</h3>
                     <button onClick={() => setGlobalShortageModal(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5"/></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 bg-red-50 p-4 rounded-xl border border-red-100 font-medium leading-relaxed">Digite o nome exato do produto que faltou na colheita. O sistema irá varrer todos os pedidos pagos e creditar automaticamente a carteira dos clientes afetados.</p>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Produto Faltante</label>
                  <input type="text" placeholder="Ex: Ovos Orgânicos" value={shortageItemSearch} onChange={e => setShortageItemSearch(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 mb-6 font-bold text-slate-700" />
                  <button onClick={handleGlobalMissing} disabled={loading || !shortageItemSearch} className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-red-700 transition disabled:opacity-50 text-base">Processar Falta em Lote</button>
               </div>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="font-sans bg-gray-50 text-slate-800 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-fade-in pointer-events-none w-11/12 max-w-sm">
          <div className={`px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-800 text-white border-emerald-900'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />} 
            {toast.msg}
          </div>
        </div>
      )}

      {/* Screen Routing */}
      {currentScreen === 'login' && renderLogin()}
      {currentScreen === 'loja' && renderShop()}
      {currentScreen === 'cart' && renderCart()}
      {currentScreen === 'payment' && renderPayment()}
      {currentScreen === 'orders' && renderMyOrders()}
      {currentScreen === 'logistica' && renderRepDashboard()}
      {currentScreen === 'admin' && renderAdminDashboard()}

      {/* FIXED BOTTOM NAVIGATION MENU (App Style) */}
      {user && !['login', 'cart', 'payment'].includes(currentScreen) && (
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.05)] print:hidden h-16">
            
            <button onClick={() => setCurrentScreen('loja')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentScreen === 'loja' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
               <Store className={`w-6 h-6 mb-1 ${currentScreen === 'loja' ? 'fill-emerald-50' : ''}`} />
               <span className="text-[9px] font-black tracking-wider">COMPRAR</span>
            </button>

            {/* Apenas mostra Pedidos se o utilizador for cliente OU se estiver no ecrã de Loja/Pedidos */}
            {(user.role === 'cliente' || ['loja', 'orders'].includes(currentScreen)) && (
               <button onClick={() => setCurrentScreen('orders')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentScreen === 'orders' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <Package className={`w-6 h-6 mb-1 ${currentScreen === 'orders' ? 'fill-emerald-50' : ''}`} />
                  <span className="text-[9px] font-black tracking-wider">PEDIDOS</span>
               </button>
            )}

            {(user.role === 'admin' || user.role === 'representante') && (
               <button onClick={() => setCurrentScreen('logistica')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentScreen === 'logistica' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <Smartphone className={`w-6 h-6 mb-1 ${currentScreen === 'logistica' ? 'fill-emerald-50' : ''}`} />
                  <span className="text-[9px] font-black tracking-wider">LOGÍSTICA</span>
               </button>
            )}

            {user.role === 'admin' && (
               <button onClick={() => setCurrentScreen('admin')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentScreen === 'admin' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <BarChart3 className={`w-6 h-6 mb-1 ${currentScreen === 'admin' ? 'fill-emerald-50' : ''}`} />
                  <span className="text-[9px] font-black tracking-wider">GESTÃO</span>
               </button>
            )}
            
         </div>
      )}
    </div>
  );
}