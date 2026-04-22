import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Landmark, Users, TrendingUp, Menu, X, BarChart3, 
  Store, AlertTriangle, Edit2, Plus, LogOut, CheckCircle, Smartphone, 
  ArrowLeft, UploadCloud, ChevronDown, Trash2, Search, MessageCircle,
  FileText, Wallet, Check, AlertCircle, Home, Download
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
  const [selectedShortageItem, setSelectedShortageItem] = useState('');
  
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
        try {
           const snap = await getDocs(collection(db, "users"));
           const usersData = snap.docs.map(d => ({id: d.id, ...d.data()}));
           const userDoc = usersData.find(c => c.email?.toLowerCase() === currentUser.email?.toLowerCase());
           
           if (userDoc) {
              setUser({ ...currentUser, ...userDoc });
              setCurrentScreen('loja');
           } else {
              setUser(null);
              setCurrentScreen('login');
           }
        } catch(e) {
           console.error("Erro ao verificar usuário", e);
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
      setProducts(prodData || []);
      
      const catSet = new Set(["Todos"]);
      (prodData || []).forEach(p => { if(p.category) catSet.add(p.category); });
      setCategorias(Array.from(catSet));
      
      const ordersSnap = await getDocs(collection(db, "orders"));
      setOrders(ordersSnap.docs.map(d => ({id: d.id, ...d.data()})) || []);

      const usersSnap = await getDocs(collection(db, "users"));
      setCustomers(usersSnap.docs.map(d => ({id: d.id, ...d.data()})) || []);
    } catch (e) {
      console.error("Erro ao carregar banco", e);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
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
        const newUser = { email: email.toLowerCase(), name, whatsapp, polo, role, walletBalance: 0, pendingPixRefund: 0, pixKey: '' };
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
    if(!order || !itemMissing) return;
    try {
      const customer = customers.find(c => c.email?.toLowerCase() === order.customerEmail?.toLowerCase());
      const itemPrice = itemMissing.promotionalPrice > 0 ? itemMissing.promotionalPrice : itemMissing.price;
      const refundValue = (itemMissing.qtd || 1) * (itemPrice || 0);
      
      if (customer) {
         await updateDoc(doc(db, "users", customer.id), {
            walletBalance: (customer.walletBalance || 0) + refundValue
         });
      }

      const newItems = (order.items || []).map(i => i.id === itemMissing.id ? {...i, missing: true} : i);
      await updateDoc(doc(db, "orders", order.id), { items: newItems, hasMissingItems: true });
      
      showToast(`Falta registrada! R$ ${refundValue.toFixed(2)} creditados na carteira do cliente.`);
      setRepShortageModal(null);
      loadData();
    } catch (e) {
      console.error(e);
      showToast('Erro ao registrar falta', 'error');
    }
  };

  const handleGlobalMissing = async () => {
    if(!selectedShortageItem) return showToast('Selecione um produto para registrar a falta.', 'error');
    setLoading(true);
    
    // Busca todos os pedidos pagos que contém o produto selecionado e que ainda não foi marcado como falta
    const targetOrders = (orders || []).filter(o => 
       o?.status === 'pago' && 
       (o.items || []).some(i => i?.name === selectedShortageItem && !i?.missing)
    );
    
    if(targetOrders.length === 0) {
       setLoading(false);
       return showToast('Nenhum pedido pendente encontrado com este produto.', 'error');
    }

    let updatedCount = 0;
    for (let order of targetOrders) {
       const itemMissing = (order.items || []).find(i => i?.name === selectedShortageItem && !i?.missing);
       if(itemMissing) {
          await markAsMissing(order, itemMissing);
          updatedCount++;
       }
    }
    showToast(`${updatedCount} pedidos atualizados com falta global.`);
    setGlobalShortageModal(false);
    setSelectedShortageItem('');
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
     if(!customerId) return;
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
            const MAX_WIDTH = 400; const MAX_HEIGHT = 400;
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
    if (!editingProduct?.name || !editingProduct?.price) return showToast('Preencha nome e preço', 'error');
    try {
      const prodData = {
         ...editingProduct,
         price: Number(editingProduct.price || 0),
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

  const openWhatsApp = (phone, text) => {
    if(!phone) return showToast('Telefone não cadastrado', 'error');
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
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
               <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none text-gray-600 font-bold">
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
    // Tratamento passivo de arrays para evitar tela branca
    const safeProducts = products || [];
    const promoProducts = safeProducts.filter(p => Boolean(p.promotionalPrice > 0));
    
    let filteredProducts = safeProducts.filter(p => selectedCategory === 'Todos' || p.category === selectedCategory);
    if(searchTerm) {
       filteredProducts = filteredProducts.filter(p => p?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return (
      <div className="pb-32 bg-gray-50 min-h-screen font-sans">
        {/* Cabeçalho Fixo (Estilo Korin) */}
        <div className="bg-emerald-800 text-white p-4 sticky top-0 z-30 shadow-md">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white text-emerald-800 flex items-center justify-center rounded-xl shadow-sm"><Store className="w-6 h-6"/></div>
                 <h1 className="font-black text-xl text-white tracking-tight leading-tight">Clube de Compras</h1>
              </div>
              <div className="flex items-center">
                 {user?.role === 'admin' && <span className="bg-emerald-500/30 text-emerald-50 text-[10px] font-bold px-2 py-1 rounded-full mr-2 border border-emerald-500/50">GESTOR MASTER</span>}
                 <button onClick={() => {if(window.confirm('Sair da conta?')) signOut(auth)}} className="p-2 bg-emerald-700/50 rounded-xl hover:bg-emerald-700 transition"><LogOut className="w-5 h-5 text-emerald-100"/></button>
              </div>
           </div>
           <div className="relative">
              <input type="text" placeholder="Estou procurando por..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full py-4 pl-12 pr-4 rounded-xl text-slate-800 text-sm focus:outline-none shadow-sm font-bold bg-white/95 focus:bg-white transition" />
              <Search className="absolute left-4 top-4 w-5 h-5 text-emerald-700" />
           </div>
        </div>

        {/* Local de Retirada & Saldo da Carteira */}
        <div className="bg-white px-4 py-4 flex flex-col sm:flex-row justify-between sm:items-center relative z-20 shadow-sm border-b border-gray-100 gap-3">
           <div className="flex items-center text-xs text-gray-500 font-bold tracking-wide">
              <Smartphone className="w-4 h-4 mr-1 text-emerald-600"/> Polo de Retirada: <span className="font-black text-emerald-800 ml-1">{user?.polo || 'Definir'}</span>
           </div>
           {user?.walletBalance > 0 && (
               <div className="flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <Wallet className="w-4 h-4 mr-1.5 text-emerald-600" /> Crédito Disponível: R$ {user.walletBalance.toFixed(2)}
               </div>
           )}
        </div>

        {/* Menu de Categorias Deslizante */}
        <div className="flex overflow-x-auto py-4 px-4 gap-2 hide-scrollbar bg-white shadow-sm border-b border-gray-50 sticky top-[135px] z-20">
           {categorias.map(c => (
              <button key={c} onClick={() => setSelectedCategory(c)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-bold border transition shadow-sm ${selectedCategory === c ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}>
                 {c}
              </button>
           ))}
        </div>

        {/* Carrossel de Promoções Inteligente */}
        {promoProducts.length > 0 && !searchTerm && selectedCategory === 'Todos' && (
          <div className="mt-6 px-4">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-xl tracking-tight">Seleção da Semana</h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full">{promoProducts.length} itens</span>
             </div>
             <div className="flex overflow-x-auto pb-6 gap-4 snap-x hide-scrollbar">
                {promoProducts.map(p => (
                   <div key={`promo-${p.id}`} className="min-w-[180px] max-w-[180px] bg-white p-4 rounded-3xl shadow-sm border border-gray-100 snap-center relative flex flex-col justify-between hover:shadow-md transition">
                      <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-br-2xl rounded-tl-3xl z-10 shadow-sm uppercase tracking-wider">
                         {Math.round((1 - ((p.promotionalPrice||0) / (p.price||1))) * 100)}% OFF
                      </span>
                      <p className="text-[8px] bg-slate-50 text-emerald-800 font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-2 mt-4 text-center">{p.category}</p>
                      
                      <div className="h-32 mb-4 flex items-center justify-center bg-white rounded-2xl overflow-hidden relative">
                         {p.image?.length > 10 ? <img src={p.image} className="w-full h-full object-cover" alt=""/> : <span className="text-6xl">{p.image || '📦'}</span>}
                      </div>
                      
                      <div className="text-center">
                         <p className="font-black text-slate-800 text-sm line-clamp-2 leading-tight h-10 mb-1">{p.name}</p>
                         <p className="text-[10px] text-gray-400 line-through font-bold">R$ {Number(p.price || 0).toFixed(2)}</p>
                         <p className="text-2xl font-black text-slate-800 mb-4">R$ {Number(p.promotionalPrice || 0).toFixed(2)}</p>
                      </div>
                      <button onClick={() => addToCart(p)} className="w-full bg-emerald-100 text-emerald-800 font-black text-sm py-3 rounded-2xl hover:bg-emerald-200 transition shadow-sm">Adicionar</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* Catálogo Geral */}
        <div className="px-4 mt-6">
           <h3 className="font-black text-slate-800 text-xl tracking-tight mb-4">{searchTerm ? 'Resultados' : 'Catálogo Completo'}</h3>
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredProducts.filter(p => !p.promotionalPrice || p.promotionalPrice === 0).map(p => (
                 <div key={p.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition relative">
                    <div className="h-28 mb-4 flex items-center justify-center bg-white rounded-2xl overflow-hidden">
                       {p.image?.length > 10 ? <img src={p.image} className="w-full h-full object-cover" alt=""/> : <span className="text-6xl">{p.image || '📦'}</span>}
                    </div>
                    <div className="text-center">
                       <p className="font-black text-slate-800 text-sm line-clamp-2 leading-tight h-10 mb-2">{p.name}</p>
                       <p className="text-xl font-black text-slate-800 mb-1">R$ {Number(p.price || 0).toFixed(2)}</p>
                       <p className="text-[9px] text-emerald-600 font-bold mb-4 uppercase tracking-wider">Chega ao polo em breve</p>
                    </div>
                    <button onClick={() => addToCart(p)} className="w-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-sm py-3 rounded-2xl hover:bg-emerald-100 transition shadow-sm">Adicionar</button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderCart = () => {
    const subtotal = (cart || []).reduce((a,c)=>a+((c.qtd||0)*((c.promotionalPrice>0)?c.promotionalPrice:(c.price||0))),0);
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-32 font-sans">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('loja')} className="p-3 bg-white rounded-xl shadow-sm mr-4 text-slate-800 hover:bg-gray-50 transition"><ArrowLeft className="w-5 h-5"/></button>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sua Cesta</h2>
        </div>
        <div className="space-y-4 mb-6">
           {(cart || []).map(item => (
              <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm flex items-center justify-between border border-gray-100">
                 <div className="flex items-center gap-4 w-full">
                    <span className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-2xl text-3xl border border-gray-100 overflow-hidden flex-shrink-0">
                        {item.image?.length>10?<img src={item.image} className="w-full h-full object-cover" alt=""/>:item.image||'📦'}
                    </span>
                    <div className="flex-1">
                       <p className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight mb-1">{item.name}</p>
                       <p className="text-lg font-black text-emerald-700">R$ {((item.promotionalPrice>0?item.promotionalPrice:item.price)||0).toFixed(2)}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-gray-200 ml-2">
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: Math.max(0, (i.qtd||1)-1)}:i).filter(i=>i.qtd>0))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-white rounded-xl font-black text-xl transition">-</button>
                    <span className="font-black text-slate-800 text-sm w-5 text-center">{item.qtd}</span>
                    <button onClick={() => setCart(cart.map(i=>i.id===item.id?{...i, qtd: (i.qtd||0)+1}:i))} className="w-8 h-8 flex items-center justify-center text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl font-black text-xl transition">+</button>
                 </div>
              </div>
           ))}
        </div>
        {cart.length > 0 ? (
           <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.05)] z-40">
              <div className="flex justify-between items-center mb-6">
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total da Cesta</span>
                 <span className="text-3xl font-black text-slate-800 tracking-tight">R$ {subtotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setCurrentScreen('payment')} className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-800 transition text-lg flex justify-center items-center">
                 Pagar e Finalizar Pedido
              </button>
           </div>
        ) : (
           <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 border-dashed">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold mb-6">A sua cesta está vazia.</p>
              <button onClick={() => setCurrentScreen('loja')} className="bg-emerald-50 text-emerald-700 font-black px-8 py-4 rounded-2xl shadow-sm hover:bg-emerald-100 transition">Voltar para a Loja</button>
           </div>
        )}
      </div>
    );
  };

  const renderPayment = () => {
    if(cart.length === 0) { setCurrentScreen('loja'); return null; }
    const subtotal = cart.reduce((a,c)=>a+((c.qtd||0)*((c.promotionalPrice>0)?c.promotionalPrice:(c.price||0))),0);
    const balanceToUse = Math.min(subtotal, user?.walletBalance || 0);
    const finalTotal = subtotal - balanceToUse;

    const handleConfirm = async () => {
       setLoading(true);
       try {
         const newOrder = {
           customer: user?.name || 'Cliente', 
           customerEmail: user?.email || '', 
           polo: user?.polo || 'Desconhecido',
           items: cart, 
           total: finalTotal, 
           subtotal: subtotal, 
           balanceUsed: balanceToUse,
           date: new Date().toISOString(), 
           status: 'pago'
         };
         await addDoc(collection(db, "orders"), newOrder);
         if (balanceToUse > 0) {
            await updateDoc(doc(db, "users", user.id), { walletBalance: (user.walletBalance || 0) - balanceToUse });
         }
         setCart([]); showToast('Pagamento Confirmado pelo Banco!');
         loadData(); setCurrentScreen('orders');
       } catch (e) { 
           console.error(e);
           showToast('Erro ao processar pagamento', 'error'); 
       }
       setLoading(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans">
         <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('cart')} className="px-5 py-3 bg-white text-slate-700 rounded-2xl font-bold text-sm shadow-sm flex items-center hover:bg-gray-50 transition border border-gray-100"><Edit2 className="w-4 h-4 mr-2"/> Editar Cesta</button>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
           <div className="flex justify-between items-center text-sm font-bold text-gray-500 pb-4 border-b border-gray-100">
              <span>Subtotal Itens</span>
              <span className="text-slate-800 text-base">R$ {subtotal.toFixed(2)}</span>
           </div>
           {balanceToUse > 0 && (
             <div className="flex justify-between items-center text-sm font-black text-emerald-600 pb-4 border-b border-gray-100">
                <span>Saldo da Carteira Aplicado</span>
                <span>- R$ {balanceToUse.toFixed(2)}</span>
             </div>
           )}
           <div className="flex justify-between items-center pt-2 mb-6">
              <span className="text-gray-500 font-black text-sm uppercase tracking-widest">Total a Pagar</span>
              <span className="text-4xl font-black text-slate-800 tracking-tight">R$ {finalTotal.toFixed(2)}</span>
           </div>

           <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center text-center shadow-inner">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6">
                 <div className="w-48 h-48 bg-gray-50 flex items-center justify-center border-4 border-emerald-600 rounded-2xl border-dashed">
                    <span className="text-emerald-700 font-black opacity-40 text-sm text-center px-4">SIMULADOR DE PIX AQUI</span>
                 </div>
              </div>
              <p className="font-black text-emerald-800 text-2xl tracking-tight mb-2">Pague com PIX</p>
              <p className="text-xs text-emerald-600 mb-6 font-bold">Aprovação instantânea, sem taxas.</p>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-200 w-full mb-2 shadow-sm relative">
                 <p className="text-[10px] text-gray-400 font-black uppercase mb-2 text-left tracking-widest">Código Copia e Cola</p>
                 <p className="font-mono text-[11px] break-all text-slate-600 bg-gray-50 p-4 rounded-xl select-all text-left border border-gray-100 leading-relaxed">
                   00020126580014br.gov.bcb.pix0136gateway-mercadopago5204000053039865405{finalTotal.toFixed(2)}5802BR5916Clube...
                 </p>
              </div>
           </div>

           <button onClick={handleConfirm} disabled={loading} className="w-full bg-emerald-700 text-white p-5 rounded-2xl font-black flex justify-center items-center hover:bg-emerald-800 transition shadow-lg mt-4 text-lg disabled:opacity-50">
              {loading ? 'Aguardar Banco...' : 'Simular Pagamento PIX'}
           </button>
        </div>
      </div>
    );
  };

  const renderMyOrders = () => {
     // Prevenção contra orders undefined e datas inválidas
     const myOrders = (orders || []).filter(o => o?.customerEmail?.toLowerCase() === user?.email?.toLowerCase()).sort((a,b) => {
         const dateA = a?.date ? new Date(a.date) : new Date(0);
         const dateB = b?.date ? new Date(b.date) : new Date(0);
         return dateB - dateA;
     });

     return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Minhas Encomendas</h2>
           </div>
           
           {user?.walletBalance > 0 && (
              <div className="bg-emerald-700 text-white p-6 rounded-3xl shadow-lg mb-6 relative overflow-hidden border border-emerald-800">
                 <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-600 opacity-30" />
                 <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Carteira Digital</p>
                 <p className="text-4xl font-black mb-4 tracking-tight">R$ {user.walletBalance.toFixed(2)}</p>
                 
                 <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                    <p className="text-xs text-emerald-50 mb-4 leading-relaxed font-medium"><AlertCircle className="w-4 h-4 inline mr-1"/> Um item faltou na colheita. Adicionamos este valor na sua carteira para usar na próxima feira!</p>
                    <button onClick={() => setPixRefundModal(true)} className="w-full bg-white text-emerald-800 px-4 py-3.5 rounded-xl font-black text-sm hover:bg-emerald-50 transition shadow-sm">
                       Prefere receber via PIX?
                    </button>
                 </div>
              </div>
           )}

           {user?.pendingPixRefund > 0 && (
               <div className="bg-orange-50 border border-orange-200 text-orange-800 p-5 rounded-3xl mb-6 flex items-start shadow-sm">
                  <Landmark className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                     <p className="font-black text-sm mb-1">Estorno Solicitado: R$ {user.pendingPixRefund.toFixed(2)}</p>
                     <p className="text-xs opacity-90 font-medium leading-relaxed">Recebemos a sua chave PIX. A nossa equipa fará a transferência em breve.</p>
                  </div>
               </div>
           )}
           
           {user?.refundDone && user?.walletBalance === 0 && user?.pendingPixRefund === 0 && (
               <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-3xl mb-6 flex items-center shadow-sm">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" />
                  <p className="font-black text-sm">Estorno Realizado com Sucesso para a sua conta!</p>
               </div>
           )}

           {myOrders.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 p-10 bg-white rounded-3xl border border-gray-200 border-dashed">
                 <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                 <p className="font-black text-slate-600 mb-6">Nenhuma encomenda ainda.</p>
                 <button onClick={()=>setCurrentScreen('loja')} className="bg-emerald-50 text-emerald-700 font-black px-8 py-4 rounded-2xl shadow-sm hover:bg-emerald-100 transition">Fazer a primeira compra</button>
              </div>
           ) : (
              <div className="space-y-4">
                 {myOrders.map(o => {
                    const validDate = o?.date ? new Date(o.date) : new Date();
                    const dateStr = !isNaN(validDate) ? validDate.toLocaleDateString() : 'Data Desconhecida';
                    return (
                    <div key={o.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                       <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                          <div>
                             <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">{dateStr}</p>
                             <p className="font-black text-slate-800 text-lg tracking-tight">Pedido #{o.id.substring(0,5)}</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center shadow-sm"><Check className="w-3 h-3 mr-1"/> Confirmado</span>
                       </div>
                       
                       {o.hasMissingItems && (
                          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mb-5 text-orange-800 text-xs flex items-start shadow-sm">
                             <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 text-orange-500"/>
                             <p className="font-bold leading-relaxed">Um item faltou. Adicionamos o valor correspondente na sua carteira digital.</p>
                          </div>
                       )}

                       <div className="space-y-3 mb-6">
                          {(o.items || []).map((i, idx) => (
                             <div key={idx} className={`flex justify-between items-center text-sm ${i.missing ? 'opacity-50 text-gray-400' : 'text-slate-700 font-bold'}`}>
                                <span className="flex items-center">
                                   <span className="w-7 h-7 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black mr-3 text-slate-500">{i.qtd || 0}x</span> 
                                   <span className={`line-clamp-1 ${i.missing && 'line-through'}`}>{i.name}</span>
                                </span>
                                <span>R$ {((i.qtd || 0) * (i.promotionalPrice > 0 ? i.promotionalPrice : (i.price || 0))).toFixed(2)}</span>
                             </div>
                          ))}
                       </div>
                       <div className="flex justify-between items-center pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6">
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Pago</span>
                          <span className="text-2xl font-black text-emerald-800 tracking-tight">R$ {(o.total || 0).toFixed(2)}</span>
                       </div>
                    </div>
                 )})}
              </div>
           )}

           {/* Modal PIX Refund */}
           {pixRefundModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                 <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-gray-100">
                    <h3 className="font-black text-slate-800 text-2xl mb-2 tracking-tight">Solicitar Estorno PIX</h3>
                    <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">Iremos transferir o seu saldo de <strong className="text-slate-800 font-black">R$ {user.walletBalance.toFixed(2)}</strong> diretamente para a sua conta.</p>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">A sua Chave PIX</label>
                    <input type="text" placeholder="CPF, E-mail, Telemóvel..." value={pixKeyInput} onChange={e=>setPixKeyInput(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 mb-6 outline-none font-bold text-slate-700" />
                    <div className="flex gap-3">
                       <button onClick={()=>setPixRefundModal(false)} className="flex-1 p-4 bg-gray-100 text-slate-600 font-black rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                       <button onClick={requestPixRefund} className="flex-1 p-4 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-800 transition shadow-md">Confirmar</button>
                    </div>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderRepDashboard = () => {
     // Defesa contra orders undefined
     const repOrders = (orders || []).filter(o => o?.polo === user?.polo && o?.status === 'pago');
     const groupByMonth = repOrders.reduce((acc, order) => {
        const validDate = order?.date ? new Date(order.date) : new Date();
        const monthYear = !isNaN(validDate) ? validDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : 'Desconhecido';
        if(!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(order);
        return acc;
     }, {});

     return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 font-sans print:bg-white print:p-0">
           <div className="print:hidden mb-6">
              <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Logística</h2>
              <p className="text-xs text-emerald-800 font-bold bg-emerald-100 inline-block px-3 py-1.5 rounded-full border border-emerald-200 uppercase tracking-wider">Unidade: {user?.polo || 'N/A'}</p>
           </div>

           <div className="print:hidden mb-8 flex gap-3">
              <button onClick={()=>window.print()} className="flex-1 bg-white border border-gray-200 text-slate-700 font-black text-xs p-4 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 transition"><FileText className="w-5 h-5 mr-2 text-gray-400"/> Separação (PDF)</button>
              <button onClick={() => setRepManualOrderModal(true)} className="flex-1 bg-emerald-700 text-white font-black text-xs p-4 rounded-2xl shadow-sm flex items-center justify-center hover:bg-emerald-800 transition"><Plus className="w-5 h-5 mr-2"/> Lançar Venda</button>
           </div>

           <div className="space-y-8">
              {Object.keys(groupByMonth).sort((a,b)=>new Date(b)-new Date(a)).map(month => (
                 <div key={month} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:mb-8">
                    <h3 className="font-black text-slate-800 text-xl mb-6 pb-4 border-b border-gray-100 capitalize tracking-tight">{month}</h3>
                    <div className="space-y-4">
                       {(groupByMonth[month] || []).map(o => {
                          const customerDoc = (customers || []).find(c => c?.email?.toLowerCase() === o?.customerEmail?.toLowerCase());
                          const orderDate = o?.date ? new Date(o.date) : new Date();
                          const dateStr = !isNaN(orderDate) ? orderDate.toLocaleDateString() : '';
                          
                          return (
                          <div key={o.id} className="bg-gray-50 border border-gray-100 p-6 rounded-3xl print:bg-white print:border-b print:rounded-none">
                             <div className="flex justify-between items-start mb-5">
                                <div>
                                   <p className="font-black text-slate-800 text-lg tracking-tight mb-1">{o.customer || 'Desconhecido'}</p>
                                   <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">#{o.id.substring(0,5)} • {dateStr} • <span className="text-emerald-700 font-black">R$ {(o.total||0).toFixed(2)}</span></p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2 print:hidden">
                                   {o.hasMissingItems && <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-2 py-1 rounded-md border border-orange-200 uppercase">Falta Reg.</span>}
                                   {customerDoc?.refundDone && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-1 rounded-md border border-blue-200 uppercase">Estornado</span>}
                                   {o.isManual && <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-1 rounded-md border border-emerald-200 uppercase">Venda Local</span>}
                                </div>
                             </div>
                             
                             <div className="flex flex-wrap gap-2 mb-6 print:block">
                                {(o.items || []).map((i, idx) => (
                                   <span key={idx} className={`bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm print:border-none print:block print:text-xs print:shadow-none print:p-0 print:mb-1 ${i.missing ? 'text-red-400 line-through bg-red-50 border-red-100' : 'text-slate-600'}`}>
                                      <span className="print:hidden">{i.qtd||0}X {i.name?.toUpperCase()}</span>
                                      <span className="hidden print:inline-block border border-black w-4 h-4 mr-3 align-middle rounded-sm"></span><span className="hidden print:inline-block">{i.qtd||0}X {i.name?.toUpperCase()}</span>
                                   </span>
                                ))}
                             </div>

                             <div className="flex gap-3 print:hidden">
                                <button onClick={() => setRepShortageModal(o)} className="flex-1 bg-orange-50 text-orange-800 font-black text-xs py-3.5 rounded-xl hover:bg-orange-100 transition shadow-sm border border-orange-100">Faltas</button>
                                <button onClick={() => {
                                   if(customerDoc?.whatsapp) {
                                      openWhatsApp(customerDoc.whatsapp, `Olá ${customerDoc.name}, o seu pedido #${o.id.substring(0,5)} no valor de R$ ${(o.total||0).toFixed(2)} já está disponível!`);
                                   } else {
                                      showToast("Telefone não cadastrado.", "error");
                                   }
                                }} className="flex-1 bg-emerald-100 text-emerald-800 font-black text-xs py-3.5 rounded-xl hover:bg-emerald-200 transition shadow-sm flex items-center justify-center border border-emerald-200"><MessageCircle className="w-4 h-4 mr-1.5"/> Recibo</button>
                             </div>
                          </div>
                       )})}
                    </div>
                 </div>
              ))}
              {repOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-16 font-bold bg-white rounded-3xl border border-gray-100 border-dashed">Nenhum pedido processado nesta unidade ainda.</p>}
           </div>

           {/* Rep Shortage Modal */}
           {repShortageModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 print:hidden">
                 <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-800 text-2xl tracking-tight">Faltou algo?</h3>
                       <button onClick={() => setRepShortageModal(null)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 shadow-sm">
                       <p className="text-xs text-orange-800 font-bold leading-relaxed">Marque o item não entregue. O valor vira <strong className="font-black">Crédito na Carteira</strong> do cliente automaticamente.</p>
                    </div>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                       {(repShortageModal.items || []).filter(i => !i.missing).map((item, idx) => (
                          <button key={idx} onClick={() => {if(window.confirm(`Registrar falta de ${item.name}?`)) markAsMissing(repShortageModal, item)}} className="w-full text-left p-5 bg-white border border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 flex justify-between items-center transition shadow-sm">
                             <span className="font-bold text-slate-700 text-sm">{item.qtd}X {item.name}</span>
                             <span className="text-orange-600 font-black">R$ {((item.qtd||0) * (item.promotionalPrice>0?item.promotionalPrice:(item.price||0))).toFixed(2)}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {/* Manual Order Modal */}
           {repManualOrderModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 print:hidden">
                 <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-800 text-2xl tracking-tight">Venda Local</h3>
                       <button onClick={() => setRepManualOrderModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-5 h-5"/></button>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-6">Selecione um cliente para registrar o pagamento feito no WhatsApp ou Balcão.</p>
                    
                    <select value={manualOrderCustomer} onChange={e=>setManualOrderCustomer(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-700 mb-6">
                       <option value="">Selecione o Cliente...</option>
                       {(customers || []).filter(c => c?.polo === user?.polo).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    {(customers || []).filter(c => c?.polo === user?.polo).length === 0 && (
                        <p className="text-xs text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 mb-6 font-bold">Nenhum cliente cadastrado nesta unidade.</p>
                    )}

                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6">
                       <p className="text-xs text-emerald-800 font-bold mb-2">Atenção: Os itens da sua cesta atual (na Loja) serão usados neste pedido.</p>
                       <p className="font-black text-emerald-900 text-lg tracking-tight">Cesta Atual: R$ {(cart||[]).reduce((a,c)=>a+((c.qtd||0)*(c.promotionalPrice>0?c.promotionalPrice:(c.price||0))),0).toFixed(2)}</p>
                    </div>
                    
                    <button onClick={async () => {
                       if(!manualOrderCustomer) return showToast('Selecione um cliente', 'error');
                       if(cart.length === 0) return showToast('Sua cesta está vazia', 'error');
                       setLoading(true);
                       try {
                          const c = customers.find(x => x.id === manualOrderCustomer);
                          const total = cart.reduce((a,c)=>a+((c.qtd||0)*(c.promotionalPrice>0?c.promotionalPrice:(c.price||0))),0);
                          await addDoc(collection(db, "orders"), {
                             customer: c.name, customerEmail: c.email, polo: user.polo,
                             items: cart, total: total, subtotal: total, balanceUsed: 0,
                             date: new Date().toISOString(), status: 'pago', isManual: true
                          });
                          setCart([]); setRepManualOrderModal(false); showToast('Venda lançada com sucesso!'); loadData();
                       } catch(e) { console.error(e); showToast('Erro', 'error'); }
                       setLoading(false);
                    }} disabled={loading || !manualOrderCustomer || cart.length === 0} className="w-full bg-emerald-700 text-white p-4 rounded-xl font-black shadow-lg hover:bg-emerald-800 transition disabled:opacity-50">Lançar Pedido Pago</button>
                 </div>
              </div>
           )}
        </div>
     );
  };

  const renderAdminDashboard = () => {
    // Prevenção pesada contra crashes nos cálculos do Gestor
    const safeOrders = orders || [];
    const safeCustomers = customers || [];
    const safeProducts = products || [];

    const totalSales = safeOrders.reduce((acc, o) => acc + (o?.total || 0), 0);
    const retainedCredits = safeCustomers.reduce((acc, c) => acc + (c?.walletBalance || 0), 0);
    
    // Gráfico 7 Dias
    const last7Days = Array.from({length: 7}).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0];
    });
    const salesByDay = last7Days.map(date => safeOrders.filter(o => o?.date && o.date.startsWith(date)).reduce((sum, o) => sum + (o?.total || 0), 0));
    const maxSales = Math.max(...salesByDay, 1); // Evita divisão por zero

    // Top 5 Produtos
    let productStats = {};
    safeOrders.forEach(o => {
       (o.items || []).forEach(i => {
          if(!i?.missing) {
             if(!productStats[i.id]) productStats[i.id] = {name: i.name, image: i.image, qtd: 0, val: 0};
             productStats[i.id].qtd += (i.qtd || 0);
             productStats[i.id].val += (i.qtd || 0) * (i.promotionalPrice > 0 ? i.promotionalPrice : (i.price || 0));
          }
       });
    });
    const top5 = Object.values(productStats).sort((a,b)=>b.val - a.val).slice(0,5);

    // Calculo Estoque Fornecedor
    let supplierOrders = {};
    safeOrders.forEach(o => {
       (o.items || []).forEach(i => {
          if(!i?.missing) {
             if(!supplierOrders[i.id]) supplierOrders[i.id] = {name: i.name, image: i.image, sold: 0, minQty: 1, stock: 0, buyBoxes: 0, newStock: 0, destinos: {}};
             supplierOrders[i.id].sold += (i.qtd || 0);
             if(!supplierOrders[i.id].destinos[o.polo || 'Geral']) supplierOrders[i.id].destinos[o.polo || 'Geral'] = 0;
             supplierOrders[i.id].destinos[o.polo || 'Geral'] += (i.qtd || 0);
          }
       });
    });
    safeProducts.forEach(p => {
       if(supplierOrders[p.id]) {
          supplierOrders[p.id].minQty = p.minQty || 1;
          supplierOrders[p.id].stock = p.stock || 0;
          let netDemand = Math.max(0, supplierOrders[p.id].sold - supplierOrders[p.id].stock);
          supplierOrders[p.id].buyBoxes = Math.ceil(netDemand / supplierOrders[p.id].minQty);
          supplierOrders[p.id].newStock = (supplierOrders[p.id].stock + (supplierOrders[p.id].buyBoxes * supplierOrders[p.id].minQty)) - supplierOrders[p.id].sold;
       }
    });

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
      <div className="bg-gray-50 min-h-screen font-sans flex pb-24 relative">
         
         {/* Hamburger Navigation Menu (Sidebar) */}
         {adminSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110]" onClick={() => setAdminSidebarOpen(false)} />}
         
         <div className={`fixed inset-y-0 left-0 z-[120] w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${adminSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
            <div className="p-6 flex items-center justify-between border-b border-gray-50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-800 text-white flex items-center justify-center rounded-xl shadow-sm"><BarChart3 className="w-6 h-6"/></div>
                  <span className="font-black text-2xl text-slate-800 tracking-tight">Gestão</span>
               </div>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
               <button onClick={() => {setAdminTab('dashboard'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='dashboard'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><TrendingUp className="w-5 h-5 mr-3 opacity-80"/> Visão Geral</button>
               <button onClick={() => {setAdminTab('vendas'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='vendas'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><Store className="w-5 h-5 mr-3 opacity-80"/> Vendas</button>
               <button onClick={() => {setAdminTab('compras'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='compras'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><Package className="w-5 h-5 mr-3 opacity-80"/> Logística & Compras</button>
               <button onClick={() => {setAdminTab('catalogo'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='catalogo'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><Edit2 className="w-5 h-5 mr-3 opacity-80"/> Catálogo</button>
               <button onClick={() => {setAdminTab('clientes'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='clientes'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><Users className="w-5 h-5 mr-3 opacity-80"/> CRM Clientes</button>
               <button onClick={() => {setAdminTab('financeiro'); setAdminSidebarOpen(false);}} className={`w-full flex items-center p-4 rounded-2xl font-black text-sm transition-all ${adminTab==='financeiro'?'bg-emerald-50 text-emerald-800':'text-slate-600 hover:bg-gray-50'}`}><Landmark className="w-5 h-5 mr-3 opacity-80"/> Financeiro</button>
            </nav>
            <div className="p-4 border-t border-gray-50">
               <button onClick={() => {setGlobalShortageModal(true); setAdminSidebarOpen(false);}} className="w-full flex items-center p-4 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 font-black text-sm transition-colors"><AlertTriangle className="w-5 h-5 mr-3"/> Falta Global</button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col min-h-screen">
            <div className="p-4 sm:p-6 flex items-center gap-4">
               <button onClick={() => setAdminSidebarOpen(true)} className="p-3 bg-white border border-gray-200 rounded-2xl text-slate-700 hover:bg-gray-50 transition shadow-sm">
                  <Menu className="w-6 h-6" />
               </button>
               <h2 className="text-3xl font-black text-slate-800 capitalize tracking-tight">{adminTab.replace('-', ' ')}</h2>
            </div>

            <div className="px-4 sm:px-6 space-y-6 flex-1">
               {/* --- DASHBOARD TAB --- */}
               {adminTab === 'dashboard' && (
                   <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-2">Vendas Totais</p>
                             <p className="text-3xl font-black text-emerald-800 tracking-tight">R$ {totalSales.toFixed(2)}</p>
                         </div>
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-2">Pedidos Registrados</p>
                             <p className="text-3xl font-black text-blue-800 tracking-tight">{safeOrders.length}</p>
                         </div>
                         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 col-span-2 md:col-span-1">
                             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-2">Créditos Clientes</p>
                             <p className="text-3xl font-black text-orange-600 tracking-tight">R$ {retainedCredits.toFixed(2)}</p>
                         </div>
                      </div>
                      
                      {/* GRÁFICO D3 SIMULADO (Tailwind Bar Chart) */}
                      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                          <h3 className="font-black text-slate-800 text-xl mb-8 tracking-tight">Tendência 7 Dias</h3>
                          <div className="flex items-end justify-between h-48 gap-2">
                            {salesByDay.map((d, i) => (
                              <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                                 <span className="text-[10px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity mb-2">R${d.toFixed(0)}</span>
                                 <div className="w-full bg-emerald-500 rounded-t-xl hover:bg-emerald-600 transition-colors" style={{ height: `${(d / maxSales) * 100}%`, minHeight: '4px' }}></div>
                                 <span className="text-[10px] text-gray-400 mt-3 font-black">{last7Days[i].split('-')[2]}</span>
                              </div>
                            ))}
                          </div>
                      </div>

                      {/* TOP 5 PRODUTOS */}
                      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                         <h3 className="font-black text-slate-800 text-xl mb-6 tracking-tight">Top 5 Produtos</h3>
                         <div className="space-y-3">
                            {top5.map((p, idx) => (
                               <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                  <div className="flex items-center gap-4">
                                     <div className="w-14 h-14 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                                        {p.image && p.image.length > 10 ? <img src={p.image} className="w-full h-full object-cover" alt=""/> : (p.image || '📦')}
                                     </div>
                                     <div>
                                        <p className="font-black text-slate-800 text-sm line-clamp-1">{p.name}</p>
                                        <p className="text-[11px] text-gray-500 font-bold mt-1">{p.qtd} unidades vendidas</p>
                                     </div>
                                  </div>
                                  <span className="font-black text-emerald-800 text-lg">R$ {p.val.toFixed(2)}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </>
               )}

               {/* --- VENDAS TAB --- */}
               {adminTab === 'vendas' && (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400">
                                 <th className="p-5 font-black border-b border-gray-100">Data / Pedido</th>
                                 <th className="p-5 font-black border-b border-gray-100">Cliente / Polo</th>
                                 <th className="p-5 font-black border-b border-gray-100">Resumo Itens</th>
                                 <th className="p-5 font-black border-b border-gray-100">Total</th>
                                 <th className="p-5 font-black border-b border-gray-100 text-center">Ações</th>
                              </tr>
                           </thead>
                           <tbody>
                              {safeOrders.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).map(o => {
                                 const orderDate = o?.date ? new Date(o.date) : new Date();
                                 const dateStr = !isNaN(orderDate) ? orderDate.toLocaleDateString() : '';
                                 return (
                                 <tr key={o.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition">
                                    <td className="p-5">
                                       <p className="text-sm font-black text-slate-800">{dateStr}</p>
                                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">#{o.id.substring(0,5)}</p>
                                    </td>
                                    <td className="p-5">
                                       <p className="text-sm font-black text-slate-800">{o.customer}</p>
                                       <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{o.polo}</p>
                                    </td>
                                    <td className="p-5">
                                       <div className="flex flex-wrap gap-1 max-w-[200px]">
                                          {(o.items||[]).map((i,idx)=><span key={idx} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md border border-gray-200">{i.qtd}x</span>)}
                                       </div>
                                    </td>
                                    <td className="p-5 text-base font-black text-emerald-800">R$ {(o.total||0).toFixed(2)}</td>
                                    <td className="p-5 text-center">
                                       <button onClick={async ()=>{if(window.confirm('Apagar pedido? O valor não retornará ao cliente.')){await deleteDoc(doc(db,"orders",o.id));loadData()}}} className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition"><Trash2 className="w-5 h-5"/></button>
                                    </td>
                                 </tr>
                              )})}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* --- COMPRAS E LOGISTICA TAB --- */}
               {adminTab === 'compras' && (
                  <div className="space-y-6">
                     <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                           <h3 className="font-black text-slate-800 text-2xl tracking-tight mb-2">Consolidação</h3>
                           <p className="text-sm text-gray-500 font-medium">O sistema abate o estoque local e diz quantas caixas comprar.</p>
                        </div>
                        <button onClick={downloadSupplierOrder} className="w-full sm:w-auto bg-emerald-800 text-white font-black text-sm px-6 py-4 rounded-2xl hover:bg-emerald-900 transition shadow-md flex items-center justify-center"><Download className="w-5 h-5 mr-2"/> Excel Fornecedor</button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(supplierOrders).map((s, idx) => (
                           <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative">
                              <div className="flex items-center gap-4 mb-6">
                                 <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                                    {s.image && s.image.length > 10 ? <img src={s.image} className="w-full h-full object-cover" alt=""/> : (s.image || '📦')}
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-800 text-base line-clamp-2 leading-tight">{s.name}</p>
                                    <p className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md mt-2 inline-block uppercase tracking-widest">CX: {s.minQty} UN</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                 <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendido</p><p className="font-black text-slate-800 text-2xl">{s.sold}</p></div>
                                 <div className="bg-emerald-700 p-4 rounded-2xl text-center shadow-inner"><p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Comprar (Cx)</p><p className="font-black text-white text-3xl">{s.buyBoxes}</p></div>
                              </div>
                              <div className="bg-emerald-50 p-3 rounded-xl text-center mb-4 border border-emerald-100">
                                 <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Estoque Anterior: {s.stock} | Sobra Futura: <span className="text-base">{s.newStock}</span></p>
                              </div>
                              <div className="text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                 <p className="font-black text-[10px] uppercase text-gray-400 tracking-widest mb-3">Despacho (Destinos):</p>
                                 {Object.entries(s.destinos).map(([polo, qtd]) => <div key={polo} className="flex justify-between border-b border-gray-100 last:border-0 py-1.5 font-bold text-slate-700"><span>{polo}</span><span className="text-emerald-700">{qtd}</span></div>)}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* --- CATALOGO TAB --- */}
               {adminTab === 'catalogo' && (
                  <div className="space-y-6">
                     <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                           <h3 className="font-black text-slate-800 text-2xl tracking-tight mb-2">Catálogo</h3>
                           <p className="text-sm text-gray-500 font-medium">Gestão de produtos e preços.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                           <label className="bg-blue-50 text-blue-700 font-black text-xs px-5 py-3.5 rounded-2xl cursor-pointer hover:bg-blue-100 transition flex items-center justify-center shadow-sm">
                              <UploadCloud className="w-5 h-5 mr-2"/> Subir Tabela CSV
                              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                           </label>
                           <button onClick={() => setEditingProduct({ sku: '', name: '', price: '', category: 'Geral', minQty: 1, stock: 0, image: '📦' })} className="bg-emerald-800 text-white font-black text-xs px-6 py-3.5 rounded-2xl hover:bg-emerald-900 transition shadow-md flex items-center justify-center">
                              <Plus className="w-5 h-5 mr-2"/> Novo
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {safeProducts.map(p => (
                           <div key={p.id} className="flex flex-col justify-between p-6 bg-white border border-gray-100 shadow-sm rounded-[2rem] hover:shadow-md transition">
                              <div className="flex items-start gap-4 mb-6">
                                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                                    {p.image && p.image.length > 10 ? <img src={p.image} className="w-full h-full object-cover" alt=""/> : <span className="text-3xl">{p.image || '📦'}</span>}
                                 </div>
                                 <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">{p.sku || 'S/SKU'} • {p.category}</p>
                                    <p className="font-black text-slate-800 text-sm line-clamp-2 leading-tight mb-2">{p.name}</p>
                                    <div className="flex items-center gap-2">
                                       <span className="text-lg font-black text-emerald-800">R$ {Number(p.price||0).toFixed(2)}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-3 border-t border-gray-50 pt-5">
                                 <button onClick={() => setEditingProduct(p)} className="flex-1 py-3 text-blue-600 bg-blue-50 font-black text-xs rounded-xl hover:bg-blue-100 transition shadow-sm">Editar</button>
                                 <button onClick={() => deleteProduct(p.id)} className="flex-1 py-3 text-red-600 bg-red-50 font-black text-xs rounded-xl hover:bg-red-100 transition shadow-sm">Apagar</button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* --- CRM TAB --- */}
               {adminTab === 'clientes' && (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400">
                                 <th className="p-5 font-black border-b border-gray-100">Cliente</th>
                                 <th className="p-5 font-black border-b border-gray-100">Contato / Polo</th>
                                 <th className="p-5 font-black border-b border-gray-100">Perfil / Carteira</th>
                                 <th className="p-5 font-black border-b border-gray-100 text-center">Ações</th>
                              </tr>
                           </thead>
                           <tbody>
                              {safeCustomers.map(c => (
                                 <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                    <td className="p-5">
                                       <p className="text-sm font-black text-slate-800">{c.name}</p>
                                       <p className="text-[10px] text-gray-500 font-bold mt-1">{c.email}</p>
                                    </td>
                                    <td className="p-5">
                                       <p className="text-xs font-bold text-slate-600 mb-1">{c.whatsapp || 'S/ Whats'}</p>
                                       <p className="text-[10px] text-emerald-600 font-black uppercase">{c.polo}</p>
                                    </td>
                                    <td className="p-5">
                                       <p className="text-[10px] bg-slate-100 text-slate-600 font-black px-2.5 py-1 rounded-md inline-block uppercase mb-2 tracking-widest">{c.role}</p>
                                       {c.walletBalance > 0 && <p className="text-sm font-black text-emerald-700">R$ {c.walletBalance.toFixed(2)}</p>}
                                    </td>
                                    <td className="p-5 text-center flex justify-center gap-2">
                                       <button onClick={() => openWhatsApp(c.whatsapp, `Olá ${c.name}, aqui é do Clube de Compras!`)} className="p-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition shadow-sm"><MessageCircle className="w-5 h-5"/></button>
                                       <button onClick={async ()=>{if(window.confirm('Excluir cliente?')){await deleteDoc(doc(db,"users",c.id));loadData()}}} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 className="w-5 h-5"/></button>
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
                        <button onClick={()=>setAdminTab('clientes')} className="bg-emerald-800 p-8 rounded-[2rem] text-left hover:shadow-lg transition">
                           <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center"><Wallet className="w-5 h-5 mr-2"/> Saldo na Carteira (Total)</p>
                           <p className="text-5xl font-black text-white tracking-tight">R$ {retainedCredits.toFixed(2)}</p>
                        </button>
                        <div className="bg-orange-50 p-8 rounded-[2rem] text-left border border-orange-100">
                           <p className="text-orange-800 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center"><Landmark className="w-5 h-5 mr-2 text-orange-600"/> Estornos Pendentes</p>
                           <p className="text-5xl font-black text-orange-600 tracking-tight">R$ {safeCustomers.reduce((a,c)=>a+(c?.pendingPixRefund||0),0).toFixed(2)}</p>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center"><AlertCircle className="w-6 h-6 text-orange-500 mr-3"/><h3 className="font-black text-slate-800 text-xl tracking-tight">Fila de Reembolso PIX</h3></div>
                        <div className="divide-y divide-gray-50">
                           {safeCustomers.filter(c => c?.pendingPixRefund > 0).map(c => (
                              <div key={c.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:bg-gray-50 transition">
                                 <div>
                                    <p className="font-black text-slate-800 text-lg mb-2">{c.name}</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                       <span className="bg-white text-slate-700 text-xs font-mono font-bold px-4 py-2 rounded-xl select-all border border-gray-200 shadow-sm flex items-center"><Landmark className="w-4 h-4 mr-2 text-gray-400"/> {c.pixKey}</span>
                                       <span className="font-black text-orange-600 text-xl">R$ {c.pendingPixRefund.toFixed(2)}</span>
                                    </div>
                                 </div>
                                 <div className="flex w-full sm:w-auto gap-3">
                                    <button onClick={() => openWhatsApp(c.whatsapp, `Olá ${c.name}, o estorno de R$ ${c.pendingPixRefund.toFixed(2)} foi enviado para a chave: ${c.pixKey}.`)} className="flex-1 sm:flex-none p-4 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition shadow-sm"><MessageCircle className="w-6 h-6"/></button>
                                    <button onClick={() => {if(window.confirm('Marcar como transferido?')) approveRefund(c.id)}} className="flex-1 sm:flex-none px-8 py-4 bg-slate-800 text-white font-black text-sm rounded-2xl hover:bg-slate-900 transition shadow-md">Confirmar Envio</button>
                                 </div>
                              </div>
                           ))}
                           {safeCustomers.filter(c => c?.pendingPixRefund > 0).length === 0 && (
                              <div className="p-16 text-center">
                                 <CheckCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
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
               <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
                  <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
                     <h3 className="font-black text-3xl text-slate-800 tracking-tight">{editingProduct.id ? 'Editar' : 'Novo'}</h3>
                     <button onClick={() => setEditingProduct(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X className="w-6 h-6"/></button>
                  </div>
                  <form className="space-y-6" onSubmit={e => e.preventDefault()} key={editingProduct?.id || 'new'}>
                     <div className="flex flex-col sm:flex-row gap-6">
                        <div className="w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                           {editingProduct.image?.length>10?<img src={editingProduct.image} className="w-full h-full object-cover" alt=""/>:<span className="text-5xl">{editingProduct.image||'📦'}</span>}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ícone / Foto</label>
                           <input type="text" placeholder="Cole um Emoji 🍉" value={editingProduct.image?.length < 10 ? editingProduct.image : ''} onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none mb-3 font-bold text-slate-700" />
                           <label className="bg-emerald-50 text-emerald-800 text-xs font-black px-4 py-3.5 rounded-xl text-center cursor-pointer hover:bg-emerald-100 transition shadow-sm block">
                              Escolher Foto <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                           </label>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SKU / Código</label><input type="text" defaultValue={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-700" /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Categoria</label>
                        <select defaultValue={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-700">
                           {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select></div>
                     </div>
                     <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nome do Produto</label><input type="text" defaultValue={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-700" /></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Preço (R$)</label><input type="number" defaultValue={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-black text-slate-800 text-lg" /></div>
                        <div><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Promoção</label><input type="number" defaultValue={editingProduct.promotionalPrice || ''} onChange={e => setEditingProduct({...editingProduct, promotionalPrice: e.target.value})} className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-black text-emerald-800 text-lg" placeholder="R$ 0.00" /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Caixa (Qtd)</label><input type="number" defaultValue={editingProduct.minQty || 1} onChange={e => setEditingProduct({...editingProduct, minQty: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-700" /></div>
                        <div><label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">Estoque Local</label><input type="number" defaultValue={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-4 bg-orange-50 border border-orange-200 rounded-xl outline-none font-black text-orange-800" /></div>
                     </div>
                     <div className="pt-6 border-t border-gray-50">
                        <button onClick={saveProduct} className="w-full bg-emerald-800 text-white p-5 rounded-2xl font-black shadow-lg hover:bg-emerald-900 transition text-lg">Salvar Produto</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {globalShortageModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-red-600 text-2xl flex items-center tracking-tight"><AlertTriangle className="w-7 h-7 mr-2"/> Falta Global</h3>
                     <button onClick={() => setGlobalShortageModal(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5"/></button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 bg-red-50 p-5 rounded-2xl border border-red-100 font-bold leading-relaxed">Selecione o produto que faltou na colheita. O sistema creditará automaticamente a carteira de todos os clientes afetados.</p>
                  
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Produto Faltante</label>
                  <select value={selectedShortageItem} onChange={e => setSelectedShortageItem(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 mb-8 font-black text-slate-700">
                     <option value="">Selecione na lista...</option>
                     {safeProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  
                  <button onClick={handleGlobalMissing} disabled={loading || !selectedShortageItem} className="w-full bg-red-600 text-white p-5 rounded-2xl font-black shadow-lg hover:bg-red-700 transition disabled:opacity-50 text-lg">Processar Falta em Lote</button>
               </div>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="font-sans bg-gray-50 text-slate-800 min-h-screen pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-fade-in pointer-events-none w-11/12 max-w-sm">
          <div className={`px-5 py-4 rounded-2xl shadow-2xl font-black text-sm flex items-center border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-800 text-white border-emerald-900'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />} 
            {toast.msg}
          </div>
        </div>
      )}

      {/* Roteamento */}
      {currentScreen === 'login' && renderLogin()}
      {currentScreen === 'loja' && renderShop()}
      {currentScreen === 'cart' && renderCart()}
      {currentScreen === 'payment' && renderPayment()}
      {currentScreen === 'orders' && renderMyOrders()}
      {currentScreen === 'logistica' && renderRepDashboard()}
      {currentScreen === 'admin' && renderAdminDashboard()}

      {/* Menu Fixo (Apenas visível nas abas de navegação principais) */}
      {user && !['login', 'cart', 'payment'].includes(currentScreen) && (
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.05)] print:hidden h-16">
            
            <button onClick={() => setCurrentScreen('loja')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentScreen === 'loja' ? 'text-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
               <Store className={`w-6 h-6 mb-1 ${currentScreen === 'loja' ? 'fill-emerald-50' : ''}`} />
               <span className="text-[9px] font-black tracking-wider">COMPRAR</span>
            </button>

            {/* Pedidos: Mostra para Clientes, ou para Gestor/Rep se estiverem no módulo de compras */}
            {(user.role === 'cliente' || currentScreen === 'loja' || currentScreen === 'orders') && (
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