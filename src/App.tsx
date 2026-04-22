import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Landmark, Users, TrendingUp, Menu, X, BarChart3, 
  Store, AlertTriangle, Edit2, Plus, LogOut, CheckCircle, Smartphone, 
  ArrowLeft, Download, UploadCloud, ChevronDown, Trash2, Search, MessageCircle,
  FileText, Wallet, Check, AlertCircle, Home
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
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
const categorias = ["Todos", "Carnes & Aves", "Mercearia", "Ovos", "Peixes & Frutos do Mar", "Saúde & Bem-Estar", "Grãos"];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [globalShortageModal, setGlobalShortageModal] = useState(false);
  const [shortageItemSearch, setShortageItemSearch] = useState('');
  
  const [repShortageModal, setRepShortageModal] = useState(null);
  const [repManualOrderModal, setRepManualOrderModal] = useState(false);
  const [selectedRepCustomer, setSelectedRepCustomer] = useState('');
  
  const [pixRefundModal, setPixRefundModal] = useState(false);
  const [pixKeyInput, setPixKeyInput] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [polo, setPolo] = useState(polos[0]);
  const [role, setRole] = useState('cliente');
  const [secretKey, setSecretKey] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await loadData();
        const snap = await getDocs(collection(db, "users"));
        const usersData = snap.docs.map(d => ({id: d.id, ...d.data()}));
        const userDoc = usersData.find(c => c.email === currentUser.email);
        
        if (userDoc) {
           setUser({ ...currentUser, ...userDoc });
           setCurrentScreen('loja'); // Default para todos após o login
        }
      } else {
        setUser(null);
        setCurrentScreen('login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const prodSnap = await getDocs(collection(db, "products"));
      setProducts(prodSnap.docs.map(d => ({id: d.id, ...d.data()})));
      
      const ordersSnap = await getDocs(collection(db, "orders"));
      setOrders(ordersSnap.docs.map(d => ({id: d.id, ...d.data()})));

      const usersSnap = await getDocs(collection(db, "users"));
      setCustomers(usersSnap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (e) {
      console.log("Erro ao carregar dados", e);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuth = async () => {
    if (!email || !password) return showToast('Preencha email e senha', 'error');
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
        showToast('Conta criada com sucesso!');
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
      
      showToast('Falta registada! Crédito gerado na carteira do cliente.');
      setRepShortageModal(null);
      loadData();
    } catch (e) {
      showToast('Erro ao registar falta', 'error');
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
        showToast('Solicitação de estorno enviada ao Gestor!');
        setPixRefundModal(false);
        setPixKeyInput('');
        loadData();
        // Atualiza usuário logado temporariamente na tela
        setUser({...user, pendingPixRefund: user.walletBalance, walletBalance: 0, pixKey: pixKeyInput});
     } catch (e) {
        showToast('Erro ao solicitar estorno', 'error');
     }
  };

  const approveRefund = async (customerId) => {
     try {
        await updateDoc(doc(db, "users", customerId), { pendingPixRefund: 0, pixKey: '' });
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
            const MAX_WIDTH = 400; const MAX_HEIGHT = 400;
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
            else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            setEditingProduct({...editingProduct, image: canvas.toDataURL('image/jpeg', 0.7)});
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
          showToast(`${count} produtos atualizados/importados via CSV!`);
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

  const deleteProduct = async (id) => {
    if(window.confirm("Deseja realmente apagar este produto?")) {
       try { await deleteDoc(doc(db, "products", id)); showToast('Removido!'); loadData(); } 
       catch(e) { showToast('Erro', 'error'); }
    }
  };

  const openWhatsApp = (phone, text) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const generatePDF = () => {
    window.print();
  };

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
           <div className="bg-emerald-100 p-4 rounded-full text-emerald-700">
             <Store className="w-10 h-10" />
           </div>
        </div>
        <h1 className="text-3xl font-black text-center text-slate-800 mb-2">Clube de Compras</h1>
        <p className="text-center text-gray-500 mb-8">{isRegistering ? 'Crie a sua conta segura' : 'Acesse a plataforma'}</p>

        <div className="space-y-4">
          <input type="email" placeholder="Seu E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition" />
          <input type="password" placeholder="Sua Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition" />
          
          {isRegistering && (
             <>
               <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
               <input type="tel" placeholder="WhatsApp (DDD+Número)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
               <select value={polo} onChange={e => setPolo(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                  {polos.map(p => <option key={p} value={p}>{p}</option>)}
               </select>
               <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                  <option value="cliente">Sou Cliente</option>
                  <option value="representante">Sou Representante</option>
                  <option value="admin">Sou Gestor Geral</option>
               </select>
               {(role === 'admin' || role === 'representante') && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                     <p className="text-xs text-orange-800 font-bold mb-2">Código de Autorização Necessário</p>
                     <input type="password" placeholder="Chave Mestra" value={secretKey} onChange={e => setSecretKey(e.target.value)} className="w-full p-3 bg-white border border-orange-300 rounded-lg text-orange-900 outline-none" />
                  </div>
               )}
             </>
          )}
          
          <button onClick={handleAuth} disabled={loading} className="w-full py-4 bg-emerald-700 text-white rounded-xl font-bold text-lg hover:bg-emerald-800 transition flex justify-center items-center shadow-lg">
            {loading ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </button>
          
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm text-gray-500 font-medium hover:text-emerald-700 transition">
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
      <div className="pb-24 bg-gray-50 min-h-screen font-sans">
        {/* Header App Style */}
        <div className="bg-emerald-700 text-white p-4 sticky top-0 z-30 shadow-md">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                 <Store className="w-6 h-6 mr-2" />
                 <h1 className="font-black text-lg">Clube de Compras</h1>
              </div>
              <div className="text-right text-xs">
                 <p className="opacity-80">Retirada em</p>
                 <p className="font-bold flex items-center justify-end"><Smartphone className="w-3 h-3 mr-1"/> {user?.polo}</p>
              </div>
           </div>
           
           <div className="relative">
              <input type="text" placeholder="Buscar produtos..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full py-2.5 pl-10 pr-4 rounded-full text-slate-800 text-sm focus:outline-none shadow-sm" />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
           </div>
        </div>

        {/* Categoria Dropdown */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center relative z-20 shadow-sm">
           <span className="text-sm font-bold text-gray-700">Categorias</span>
           <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              {selectedCategory} <ChevronDown className="w-4 h-4 ml-1" />
           </button>
           {dropdownOpen && (
              <div className="absolute top-12 right-4 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                 {categorias.map(c => (
                    <button key={c} onClick={() => {setSelectedCategory(c); setDropdownOpen(false);}} className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 hover:bg-slate-50 ${selectedCategory === c ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-gray-600'}`}>
                       {c}
                    </button>
                 ))}
              </div>
           )}
        </div>

        {/* Promo Carousel */}
        {promoProducts.length > 0 && !searchTerm && selectedCategory === 'Todos' && (
          <div className="mt-4 px-4">
             <div className="flex items-center mb-3">
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm mr-2 animate-pulse">OFERTAS</span>
                <h3 className="font-bold text-slate-800 text-sm">Preços Especiais</h3>
             </div>
             <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
                {promoProducts.map(p => (
                   <div key={`promo-${p.id}`} className="min-w-[160px] bg-white p-3 rounded-2xl shadow-sm border border-gray-100 snap-center relative">
                      <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded z-10">
                         {Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF
                      </span>
                      <div className="h-24 mb-2 flex items-center justify-center p-1 relative">
                         {p.image?.length > 10 ? <img src={p.image} className="max-h-full object-contain" alt=""/> : <span className="text-4xl">{p.image || '📦'}</span>}
                      </div>
                      <p className="font-medium text-slate-800 text-xs line-clamp-2 leading-tight mb-1 h-8">{p.name}</p>
                      <p className="text-[10px] text-gray-400 line-through">R$ {Number(p.price).toFixed(2)}</p>
                      <p className="text-base font-black text-emerald-700 mb-2">R$ {Number(p.promotionalPrice).toFixed(2)}</p>
                      <button onClick={() => addToCart(p)} className="w-full bg-emerald-50 text-emerald-700 font-bold text-xs py-2 rounded-lg hover:bg-emerald-100 transition">Adicionar</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="px-4 mt-2">
           <h3 className="font-bold text-slate-800 text-sm mb-3">{searchTerm ? 'Resultados' : 'Catálogo Completo'}</h3>
           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredProducts.filter(p => !p.promotionalPrice || p.promotionalPrice === 0).map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                    <div className="h-28 mb-2 flex items-center justify-center relative bg-gray-50/50 rounded-xl p-2">
                       {p.image?.length > 10 ? <img src={p.image} className="max-h-full object-contain" alt=""/> : <span className="text-5xl">{p.image || '📦'}</span>}
                    </div>
                    <div>
                       <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider mb-0.5 line-clamp-1">{p.category}</p>
                       <p className="font-semibold text-slate-800 text-xs line-clamp-2 leading-tight h-8 mb-1">{p.name}</p>
                       <p className="font-black text-slate-800 text-sm mb-2">R$ {Number(p.price).toFixed(2)}</p>
                    </div>
                    <button onClick={() => addToCart(p)} className="w-full bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg hover:bg-emerald-800 shadow-sm transition">Adicionar</button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderCart = () => {
    const subtotal = cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0);
    return (
      <div className="min-h-screen bg-slate-50 p-4 pb-32">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('loja')} className="p-2 bg-white rounded-xl shadow-sm mr-4 text-slate-800"><ArrowLeft className="w-5 h-5"/></button>
          <h2 className="text-xl font-black text-slate-800">Meu Carrinho</h2>
        </div>
        <div className="space-y-3 mb-6">
           {cart.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between border border-gray-100">
                 <div className="flex items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl text-2xl">{item.image?.length>10?<img src={item.image} className="w-8 h-8 object-contain" alt=""/>:item.image||'📦'}</span>
                    <div>
                       <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</p>
                       <p className="text-xs font-medium text-emerald-600">R$ {(item.promotionalPrice>0?item.promotionalPrice:item.price).toFixed(2)}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-gray-100">
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: Math.max(0, i.qtd-1)}:i).filter(i=>i.qtd>0))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 font-bold">-</button>
                    <span className="font-bold text-slate-800 text-sm w-4 text-center">{item.qtd}</span>
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: i.qtd+1}:i))} className="w-8 h-8 flex items-center justify-center text-emerald-600 font-bold">+</button>
                 </div>
              </div>
           ))}
        </div>
        {cart.length > 0 ? (
           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-sm font-medium text-gray-500">Total da Cesta:</span>
                 <span className="text-xl font-black text-slate-800">R$ {subtotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setCurrentScreen('payment')} className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold flex justify-center items-center shadow-lg hover:bg-emerald-800 transition">
                 Continuar para Pagamento
              </button>
           </div>
        ) : (
           <div className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Seu carrinho está vazio.</p>
           </div>
        )}
      </div>
    );
  };

  const renderPayment = () => {
    const subtotal = cart.reduce((a,c)=>a+(c.qtd*(c.promotionalPrice>0?c.promotionalPrice:c.price)),0);
    const balanceToUse = Math.min(subtotal, user?.walletBalance || 0);
    const finalTotal = subtotal - balanceToUse;

    const handleConfirm = async () => {
       setLoading(true);
       try {
         const newOrder = {
           customer: user.name, customerEmail: user.email, polo: user.polo,
           items: cart, total: finalTotal, subtotal: subtotal, balanceUsed: balanceToUse,
           date: new Date().toISOString(), status: 'pago'
         };
         await addDoc(collection(db, "orders"), newOrder);
         if (balanceToUse > 0) {
            await updateDoc(doc(db, "users", user.id), { walletBalance: user.walletBalance - balanceToUse });
         }
         setCart([]); showToast('Pagamento Aprovado e Pedido Recebido!');
         setCurrentScreen('orders'); loadData();
       } catch (e) { showToast('Erro ao processar', 'error'); }
       setLoading(false);
    };

    return (
      <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans">
         <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('cart')} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm shadow-sm flex items-center hover:bg-emerald-200 transition"><Edit2 className="w-4 h-4 mr-2"/> Editar Cesta</button>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
           <div className="flex justify-between items-center text-sm font-medium text-gray-500 pb-4 border-b border-gray-100">
              <span>Subtotal Itens</span>
              <span>R$ {subtotal.toFixed(2)}</span>
           </div>
           {balanceToUse > 0 && (
             <div className="flex justify-between items-center text-sm font-bold text-emerald-600 pb-4 border-b border-gray-100">
                <span>Saldo Usado (Carteira)</span>
                <span>- R$ {balanceToUse.toFixed(2)}</span>
             </div>
           )}
           <div className="flex justify-between items-center text-xl font-black text-slate-800 pt-2 mb-6">
              <span>Total a Pagar</span>
              <span>R$ {finalTotal.toFixed(2)}</span>
           </div>

           <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-3">💠</span>
              <p className="font-black text-emerald-800 text-lg">Pague com PIX</p>
              <p className="text-xs text-emerald-600 mb-4 font-medium">Aprovação instantânea, sem taxas.</p>
              
              <div className="bg-white p-3 rounded-xl border border-emerald-200 w-full mb-4 shadow-sm relative">
                 <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-left">Código Copia e Cola (Gerado via Gateway)</p>
                 <p className="font-mono text-[10px] break-all text-slate-600 bg-slate-50 p-2 rounded select-all text-left">
                   00020126580014br.gov.bcb.pix0136simulacao-gateway-mercadopago5204000053039865405{finalTotal.toFixed(2)}5802BR5916Clube de Compras6009Sao Paulo62070503***6304E2A4
                 </p>
              </div>
           </div>

           <button onClick={handleConfirm} disabled={loading} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold flex justify-center items-center hover:bg-slate-900 transition shadow-lg mt-4">
              {loading ? 'Aguarde...' : 'Simular Confirmação do Banco'}
           </button>
        </div>
      </div>
    );
  };

  const renderMyOrders = () => {
     const myOrders = orders.filter(o => o.customerEmail === user?.email).sort((a,b) => new Date(b.date) - new Date(a.date));

     return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Pedidos</h2>
              <button onClick={() => setCurrentScreen('loja')} className="text-emerald-700 text-sm font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-lg"><Home className="w-4 h-4 mr-1"/> Loja</button>
           </div>
           
           {user?.walletBalance > 0 && (
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white p-6 rounded-3xl shadow-xl mb-6 relative overflow-hidden">
                 <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
                 <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Carteira Digital</p>
                 <p className="text-3xl font-black mb-4">R$ {user.walletBalance.toFixed(2)}</p>
                 
                 <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
                    <p className="text-xs text-emerald-50 mb-3"><AlertCircle className="w-3 h-3 inline mr-1"/> Um ou mais itens do seu pedido anterior não foram entregues. O valor foi creditado para usar na sua próxima feira.</p>
                    <button onClick={() => setPixRefundModal(true)} className="w-full bg-white text-emerald-800 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-50 transition shadow-sm">
                       Prefere receber via PIX?
                    </button>
                 </div>
              </div>
           )}

           {user?.pendingPixRefund > 0 && (
               <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl mb-6 flex items-start shadow-sm">
                  <Landmark className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0" />
                  <div>
                     <p className="font-bold text-sm">Estorno Solicitado: R$ {user.pendingPixRefund.toFixed(2)}</p>
                     <p className="text-xs opacity-80 mt-1">A nossa equipa administrativa já recebeu a sua chave PIX e fará a transferência em breve.</p>
                  </div>
               </div>
           )}

           {myOrders.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 p-6 bg-white rounded-3xl border border-gray-100 border-dashed">
                 <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                 <p className="font-medium">Nenhuma encomenda ainda.</p>
                 <button onClick={()=>setCurrentScreen('loja')} className="mt-4 text-emerald-600 font-bold text-sm">Fazer a primeira compra</button>
              </div>
           ) : (
              <div className="space-y-4">
                 {myOrders.map(o => (
                    <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                       <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                          <div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{new Date(o.date).toLocaleDateString()}</p>
                             <p className="font-black text-slate-800 text-sm">Pedido #{o.id.substring(0,6)}</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider flex items-center"><Check className="w-3 h-3 mr-1"/> Confirmado</span>
                       </div>
                       <div className="space-y-2 mb-4">
                          {o.items.map((i, idx) => (
                             <div key={idx} className={`flex justify-between items-center text-sm ${i.missing ? 'opacity-40 line-through text-gray-400' : 'text-slate-600 font-medium'}`}>
                                <span className="flex items-center"><span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold mr-2 text-gray-600">{i.qtd}x</span> <span className="line-clamp-1">{i.name}</span></span>
                                <span>R$ {(i.qtd * (i.promotionalPrice>0?i.promotionalPrice:i.price)).toFixed(2)}</span>
                             </div>
                          ))}
                       </div>
                       <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pago</span>
                          <span className="text-lg font-black text-slate-800">R$ {o.total.toFixed(2)}</span>
                       </div>
                    </div>
                 ))}
              </div>
           )}

           {pixRefundModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                    <h3 className="font-black text-slate-800 text-xl mb-2">Solicitar Estorno</h3>
                    <p className="text-sm text-gray-600 mb-6">Iremos devolver o seu saldo de <strong>R$ {user.walletBalance.toFixed(2)}</strong> diretamente para a sua conta.</p>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sua Chave PIX</label>
                    <input type="text" placeholder="CPF, E-mail, Celular ou Aleatória" value={pixKeyInput} onChange={e=>setPixKeyInput(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 mb-6 outline-none" />
                    <div className="flex gap-3">
                       <button onClick={()=>setPixRefundModal(false)} className="flex-1 p-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
                       <button onClick={requestPixRefund} className="flex-1 p-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md">Confirmar Pedido</button>
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

     return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans print:bg-white print:p-0">
           <div className="print:hidden mb-6">
              <h2 className="text-2xl font-black text-slate-800 mb-1">Acompanhamento</h2>
              <p className="text-sm text-emerald-700 font-bold bg-emerald-100 inline-block px-3 py-1 rounded-full">{user?.polo}</p>
           </div>

           <div className="print:hidden mb-6 flex gap-3">
              <button onClick={generatePDF} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold text-sm p-4 rounded-2xl shadow-sm flex items-center justify-center hover:bg-slate-50 transition"><FileText className="w-5 h-5 mr-2"/> Gerar Separação</button>
           </div>

           <div className="space-y-8">
              {Object.keys(groupByMonth).sort((a,b)=>new Date(b)-new Date(a)).map(month => (
                 <div key={month} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:mb-8">
                    <h3 className="font-black text-slate-800 text-lg mb-4 pb-2 border-b border-gray-100 capitalize">{month}</h3>
                    <div className="space-y-4">
                       {groupByMonth[month].map(o => (
                          <div key={o.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl print:bg-white print:border-b print:rounded-none">
                             <div className="flex justify-between items-start mb-3">
                                <div>
                                   <p className="font-bold text-slate-800 text-sm">{o.customer}</p>
                                   <p className="text-[10px] text-gray-400 font-medium mt-0.5">#{o.id.substring(0,6)} • {new Date(o.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                   <p className="font-black text-emerald-700">R$ {o.total.toFixed(2)}</p>
                                   {o.hasMissingItems && <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded mt-1">REEMBOLSADO</span>}
                                </div>
                             </div>
                             
                             <div className="flex flex-wrap gap-1.5 mb-4 print:block">
                                {o.items.map((i, idx) => (
                                   <span key={idx} className={`bg-white border border-gray-200 px-2 py-1 rounded-md text-[10px] font-bold print:border-none print:block print:text-xs ${i.missing ? 'text-red-400 line-through' : 'text-slate-600'}`}>
                                      <span className="print:hidden">{i.qtd}x {i.name}</span>
                                      <span className="hidden print:inline-block border border-black w-4 h-4 mr-2 align-middle"></span><span className="hidden print:inline-block">{i.qtd}x {i.name}</span>
                                   </span>
                                ))}
                             </div>

                             <div className="flex gap-2 print:hidden">
                                <button onClick={() => setRepShortageModal(o)} className="flex-1 bg-orange-50 text-orange-700 font-bold text-xs py-2.5 rounded-xl hover:bg-orange-100 transition shadow-sm">Faltas</button>
                                <button onClick={() => {
                                   const cust = customers.find(c => c.email === o.customerEmail);
                                   if(cust?.whatsapp) {
                                      openWhatsApp(cust.whatsapp, `Olá ${cust.name}, aqui é do Clube de Compras! Seu pedido #${o.id.substring(0,6)} no valor de R$ ${o.total.toFixed(2)} já está disponível para retirada na unidade ${o.polo}.`);
                                   } else {
                                      showToast("Telefone não cadastrado para este cliente.", "error");
                                   }
                                }} className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-100 transition shadow-sm flex items-center justify-center"><MessageCircle className="w-4 h-4 mr-1"/> Recibo</button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
              {repOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-10 font-medium">Nenhum pedido pago nesta unidade ainda.</p>}
           </div>

           {/* Modal Faltas */}
           {repShortageModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-800 text-xl">Gestão de Faltas</h3>
                       <button onClick={() => setRepShortageModal(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4">
                       <p className="text-xs text-orange-800 font-medium leading-relaxed">Clique no item que o fornecedor não entregou. O sistema irá gerar um crédito na carteira do cliente automaticamente.</p>
                    </div>
                    <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                       {repShortageModal.items.filter(i => !i.missing).map((item, idx) => (
                          <button key={idx} onClick={() => {if(window.confirm(`Registrar falta de ${item.name} e gerar crédito de R$ ${(item.qtd * (item.promotionalPrice>0?item.promotionalPrice:item.price)).toFixed(2)}?`)) markAsMissing(repShortageModal, item)}} className="w-full text-left p-4 border border-gray-100 rounded-2xl hover:border-orange-300 hover:bg-orange-50 flex justify-between items-center transition shadow-sm">
                             <span className="font-bold text-slate-700 text-sm">{item.qtd}x {item.name}</span>
                             <span className="text-orange-600 font-black">R$ {(item.qtd * (item.promotionalPrice>0?item.promotionalPrice:item.price)).toFixed(2)}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderAdminDashboard = () => {
    const totalSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const retainedCredits = customers.reduce((acc, c) => acc + (c.walletBalance || 0), 0);
    
    // Simulação de Dados D3 para Gráfico
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

    return (
      <div className="pb-24 bg-slate-50 min-h-screen font-sans flex">
         {/* Menu Lateral Desktop / Overlay Mobile */}
         {adminSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] lg:hidden" onClick={() => setAdminSidebarOpen(false)} />}
         <div className={`fixed inset-y-0 left-0 z-[120] w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${adminSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
            <div className="p-6 flex items-center justify-between border-b border-slate-800">
               <span className="font-black text-xl text-emerald-400">Torre de Controlo</span>
               <button onClick={() => setAdminSidebarOpen(false)} className="text-gray-400 hover:text-white p-1.5 bg-slate-800 rounded-lg"><X className="w-5 h-5"/></button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
               <button onClick={() => {setAdminTab('dashboard'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='dashboard'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50':'text-slate-300 hover:bg-slate-800'}`}><BarChart3 className="w-5 h-5 mr-3 opacity-80"/> Dashboard Geral</button>
               <button onClick={() => {setAdminTab('vendas'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='vendas'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50':'text-slate-300 hover:bg-slate-800'}`}><Store className="w-5 h-5 mr-3 opacity-80"/> Vendas e Pedidos</button>
               <button onClick={() => {setAdminTab('catalogo'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='catalogo'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50':'text-slate-300 hover:bg-slate-800'}`}><Package className="w-5 h-5 mr-3 opacity-80"/> Catálogo Live</button>
               <button onClick={() => {setAdminTab('clientes'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='clientes'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50':'text-slate-300 hover:bg-slate-800'}`}><Users className="w-5 h-5 mr-3 opacity-80"/> Base de Clientes</button>
               <button onClick={() => {setAdminTab('financeiro'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='financeiro'?'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50':'text-slate-300 hover:bg-slate-800'}`}><Landmark className="w-5 h-5 mr-3 opacity-80"/> Finanças & Estornos</button>
            </nav>
            <div className="p-4 border-t border-slate-800">
               <button onClick={() => {setGlobalShortageModal(true); setAdminSidebarOpen(false);}} className="w-full flex items-center justify-center p-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold text-sm transition-colors border border-red-500/20"><AlertTriangle className="w-4 h-4 mr-2"/> Informar Falta Global</button>
            </div>
         </div>

         {/* Conteúdo Principal Admin */}
         <div className="flex-1 w-full max-w-5xl mx-auto">
            <div className="bg-white p-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30 shadow-sm">
               <div className="flex items-center gap-3">
                  <button onClick={() => setAdminSidebarOpen(true)} className="p-2.5 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition">
                     <Menu className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-black text-slate-800 capitalize">{adminTab.replace('-', ' ')}</h2>
               </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
               {adminTab === 'dashboard' && (
                   <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Vendas Totais</p>
                             <p className="text-2xl font-black text-slate-800">R$ {totalSales.toFixed(2)}</p>
                         </div>
                         <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Pedidos Ativos</p>
                             <p className="text-2xl font-black text-slate-800">{orders.length}</p>
                         </div>
                         <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden col-span-2 md:col-span-1">
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">Crédito Clientes</p>
                             <p className="text-2xl font-black text-slate-800">R$ {retainedCredits.toFixed(2)}</p>
                         </div>
                      </div>
                      
                      {/* Gráfico D3 Simulado */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                          <h3 className="font-bold text-slate-800 text-sm mb-6 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-emerald-600"/> Desempenho (7 Dias)</h3>
                          <div className="relative w-full h-48 bg-slate-50/50 rounded-2xl p-4">
                            <svg viewBox="0 -10 100 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                              <polyline fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={salesByDay.map((d, i) => `${(i / 6) * 100},${100 - (d / Math.max(...salesByDay, 1)) * 100}`).join(' ')} vectorEffect="non-scaling-stroke"/>
                              {salesByDay.map((d, i) => (
                                 <g key={i}>
                                   <circle cx={(i / 6) * 100} cy={100 - (d / Math.max(...salesByDay, 1)) * 100} r="3" fill="#fff" stroke="#059669" strokeWidth="2" />
                                   <text x={(i / 6) * 100} y="115" fontSize="4" fill="#94a3b8" textAnchor="middle" fontWeight="bold">{last7Days[i].split('-')[2]}</text>
                                 </g>
                              ))}
                            </svg>
                          </div>
                      </div>

                      {/* Top 5 Produtos */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                         <h3 className="font-bold text-slate-800 text-sm mb-4">Top 5 Produtos (Receita)</h3>
                         <div className="space-y-3">
                            {top5.map((p, idx) => (
                               <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition">
                                  <div className="flex items-center gap-3">
                                     <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">{p.image?.length>10?<img src={p.image} className="w-6 h-6 object-contain" alt=""/>:p.image||'📦'}</span>
                                     <div>
                                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                        <p className="text-xs text-gray-500 font-medium">{p.qtd} unidades vendidas</p>
                                     </div>
                                  </div>
                                  <span className="font-black text-emerald-700 text-sm">R$ {p.val.toFixed(2)}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </>
               )}

               {adminTab === 'vendas' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-slate-800 text-lg">Histórico de Pedidos</h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                                 <th className="p-4 font-bold border-b border-gray-100">Data</th>
                                 <th className="p-4 font-bold border-b border-gray-100">Cliente / Polo</th>
                                 <th className="p-4 font-bold border-b border-gray-100">Total</th>
                                 <th className="p-4 font-bold border-b border-gray-100 text-center">Ação</th>
                              </tr>
                           </thead>
                           <tbody>
                              {orders.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(o => (
                                 <tr key={o.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition">
                                    <td className="p-4 text-xs font-bold text-slate-600">{new Date(o.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                       <p className="text-sm font-bold text-slate-800">{o.customer}</p>
                                       <p className="text-[10px] text-emerald-600 font-bold uppercase">{o.polo}</p>
                                    </td>
                                    <td className="p-4 text-sm font-black text-slate-800">R$ {o.total.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                       <button onClick={async ()=>{if(window.confirm('Apagar pedido?')){await deleteDoc(doc(db,"orders",o.id));loadData()}}} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {adminTab === 'catalogo' && (
                  <div className="space-y-6">
                     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                           <h3 className="font-black text-slate-800 text-lg">Catálogo Live</h3>
                           <p className="text-xs text-gray-500 mt-1">Gerencie produtos e preços do app.</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                           <label className="flex-1 sm:flex-none bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-100 transition flex items-center justify-center shadow-sm border border-blue-100">
                              <UploadCloud className="w-4 h-4 mr-2"/> Importar CSV
                              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                           </label>
                           <button onClick={() => setEditingProduct({ sku: '', name: '', price: '', category: 'Geral', minQty: 1, stock: 0, image: '📦' })} className="flex-1 sm:flex-none bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-800 transition shadow-md flex items-center justify-center">
                              <Plus className="w-4 h-4 mr-2"/> Novo
                           </button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {products.map(p => (
                           <div key={p.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition">
                              <div className="flex items-center gap-4">
                                 <span className="text-3xl w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-gray-100">{p.image?.length>10?<img src={p.image} className="w-10 h-10 object-contain" alt=""/>:p.image||'📦'}</span>
                                 <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">{p.sku || 'S/SKU'} • {p.category}</p>
                                    <p className="font-bold text-slate-800 text-sm line-clamp-1">{p.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                       <span className="text-xs font-black text-emerald-700">R$ {Number(p.price).toFixed(2)}</span>
                                       {p.promotionalPrice > 0 && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 rounded">Promo: R$ {Number(p.promotionalPrice).toFixed(2)}</span>}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                 <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"><Edit2 className="w-4 h-4"/></button>
                                 <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-4 h-4"/></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {adminTab === 'financeiro' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                           <p className="text-emerald-800 text-xs font-bold uppercase tracking-widest mb-1">Total Retido (Carteira Clientes)</p>
                           <p className="text-3xl font-black text-emerald-700">R$ {retainedCredits.toFixed(2)}</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                           <p className="text-orange-800 text-xs font-bold uppercase tracking-widest mb-1">A Devolver via PIX (Urgente)</p>
                           <p className="text-3xl font-black text-orange-600">R$ {customers.reduce((a,c)=>a+(c.pendingPixRefund||0),0).toFixed(2)}</p>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-slate-800">Solicitações de Estorno PIX</h3></div>
                        <div className="divide-y divide-gray-50">
                           {customers.filter(c => c.pendingPixRefund > 0).map(c => (
                              <div key={c.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition">
                                 <div>
                                    <p className="font-bold text-slate-800">{c.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                       <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded select-all border border-slate-200">Chave PIX: {c.pixKey}</span>
                                       <span className="font-black text-orange-600 text-sm">R$ {c.pendingPixRefund.toFixed(2)}</span>
                                    </div>
                                 </div>
                                 <div className="flex w-full sm:w-auto gap-2">
                                    <button onClick={() => openWhatsApp(c.whatsapp, `Olá ${c.name}, confirmamos seu estorno de R$ ${c.pendingPixRefund.toFixed(2)} para a chave PIX: ${c.pixKey}. A transferência será realizada em breve.`)} className="flex-1 sm:flex-none p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition flex justify-center items-center"><MessageCircle className="w-5 h-5"/></button>
                                    <button onClick={() => {if(window.confirm('Marcar estorno como transferido no banco?')) approveRefund(c.id)}} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md">Confirmar Envio</button>
                                 </div>
                              </div>
                           ))}
                           {customers.filter(c => c.pendingPixRefund > 0).length === 0 && <p className="p-8 text-center text-gray-400 font-medium text-sm">Nenhum estorno pendente.</p>}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Modais Admin (Editar e Falta Global) */}
         {editingProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-xl text-slate-800">{editingProduct.id ? 'Editar' : 'Novo Produto'}</h3>
                     <button onClick={() => setEditingProduct(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="space-y-4">
                     <div className="flex gap-4">
                        <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                           {editingProduct.image?.length>10?<img src={editingProduct.image} className="w-full h-full object-cover" alt=""/>:<span className="text-3xl">{editingProduct.image||'📦'}</span>}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Imagem / Emoji</label>
                           <input type="text" placeholder="Cole um Emoji 🍉" value={editingProduct.image?.length < 10 ? editingProduct.image : ''} onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none mb-2" />
                           <label className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg text-center cursor-pointer hover:bg-slate-700">
                              Ou suba uma foto <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                           </label>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="SKU/Cód" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        <select value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                           {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <input type="text" placeholder="Nome Completo" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                     <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Preço (R$)</label><input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" /></div>
                        <div><label className="text-[10px] font-bold text-emerald-600 uppercase">Promoção (Opcional)</label><input type="number" value={editingProduct.promotionalPrice || ''} onChange={e => setEditingProduct({...editingProduct, promotionalPrice: e.target.value})} className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none text-emerald-800" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Unidades na Caixa</label><input type="number" value={editingProduct.minQty || 1} onChange={e => setEditingProduct({...editingProduct, minQty: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" /></div>
                        <div><label className="text-[10px] font-bold text-orange-500 uppercase">Estoque (Sobra)</label><input type="number" value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl outline-none text-orange-800" /></div>
                     </div>
                     <button onClick={saveProduct} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold mt-2 shadow-lg hover:bg-slate-900 transition">Salvar Produto</button>
                  </div>
               </div>
            </div>
         )}

         {globalShortageModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-red-600 text-xl flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> Falta Global</h3>
                     <button onClick={() => setGlobalShortageModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-4 h-4"/></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 bg-red-50 p-3 rounded-xl border border-red-100">Digite o nome exato do produto que o fornecedor não entregou. Devolveremos o crédito para todos os clientes que compraram este item.</p>
                  <input type="text" placeholder="Ex: Ovos Orgânicos" value={shortageItemSearch} onChange={e => setShortageItemSearch(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 mb-4" />
                  <button onClick={handleGlobalMissing} disabled={loading} className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-red-700 transition disabled:opacity-50">Executar Falta em Lote</button>
               </div>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="font-sans bg-white text-slate-800">
      {/* Sistema de Notificações Inteligente (Toast) */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-fade-in pointer-events-none">
          <div className={`px-6 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-800 text-white border-emerald-900'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} 
            {toast.msg}
          </div>
        </div>
      )}

      {currentScreen === 'login' && renderLogin()}
      {currentScreen === 'loja' && renderShop()}
      {currentScreen === 'cart' && renderCart()}
      {currentScreen === 'payment' && renderPayment()}
      {currentScreen === 'orders' && renderMyOrders()}
      {currentScreen === 'logistica' && renderRepDashboard()}
      {currentScreen === 'admin' && renderAdminDashboard()}

      {/* Menu Inferior Nativo (App Style) */}
      {user && currentScreen !== 'login' && currentScreen !== 'cart' && currentScreen !== 'payment' && (
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-2 pb-safe z-50 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] print:hidden">
            <button onClick={() => setCurrentScreen('loja')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${currentScreen === 'loja' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
               <Store className="w-6 h-6 mb-1" />
               <span className="text-[9px] font-black tracking-wide">LOJA</span>
            </button>
            <button onClick={() => setCurrentScreen('orders')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors relative ${currentScreen === 'orders' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
               <Package className="w-6 h-6 mb-1" />
               <span className="text-[9px] font-black tracking-wide">PEDIDOS</span>
            </button>
            {(user.role === 'admin' || user.role === 'representante') && (
               <button onClick={() => setCurrentScreen('logistica')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${currentScreen === 'logistica' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <Smartphone className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-black tracking-wide">POLO</span>
               </button>
            )}
            {user.role === 'admin' && (
               <button onClick={() => setCurrentScreen('admin')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${currentScreen === 'admin' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
                  <BarChart3 className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-black tracking-wide">GESTÃO</span>
               </button>
            )}
            <button onClick={() => {if(window.confirm('Sair da conta?')) signOut(auth)}} className="flex flex-col items-center p-2 rounded-xl w-16 text-gray-400 hover:text-red-500 transition-colors">
               <LogOut className="w-6 h-6 mb-1" />
               <span className="text-[9px] font-black tracking-wide">SAIR</span>
            </button>
         </div>
      )}

      {/* Botão Flutuante do Carrinho para Cliente na Loja */}
      {user && currentScreen === 'loja' && cart.length > 0 && (
         <button onClick={() => setCurrentScreen('cart')} className="fixed bottom-24 right-4 bg-emerald-700 text-white w-14 h-14 rounded-full shadow-xl flex flex-col items-center justify-center border-4 border-emerald-50 hover:bg-emerald-800 transition transform hover:scale-105 active:scale-95 z-40">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-black">{cart.reduce((a,c)=>a+c.qtd,0)} un</span>
         </button>
      )}
    </div>
  );
}