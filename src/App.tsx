import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, 
  Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ArrowRight, ChevronDown, 
  ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, 
  Download, Copy, Clock, MessageCircle, LayoutDashboard, Store, Eye, 
  Wallet, Landmark, Loader2, Home, Search, Menu, X, BarChart3, 
  AlertOctagon, TrendingUp, LogOut, Truck, AlertTriangle
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where } from "firebase/firestore";
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
const polosEntregaDireta = ['Taubaté', 'Vila Adyana'];

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);
  
  const [shopCategory, setShopCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false); 

  const [checkoutCpf, setCheckoutCpf] = useState(''); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, message: '' });
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' });
  const [faltaGlobalModal, setFaltaGlobalModal] = useState(false);
  const [shortageSelectedProduct, setShortageSelectedProduct] = useState('');
  const [shortagePreview, setShortagePreview] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const activeCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort()];
  const getActivePrice = (p) => (p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price) ? p.promotionalPrice : p.price;
  const cartTotal = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });
          setCurrentScreen(userData.role === 'consolidador' ? 'dashboard_admin' : userData.role === 'representante' ? 'dashboard_rep' : 'shop');
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
    if (currentScreen !== 'login') {
      const fetchData = async () => {
        try {
          const [pSnap, oSnap, uSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "users"))
          ]);
          setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setAllUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error("Erro ao ler DB", e); }
      };
      fetchData();
    }
  }, [currentScreen, toast]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        showToast('Bem-vindo de volta!');
      } else {
        if (registerRole === 'consolidador' && secretCode !== 'GESTOR2024') throw new Error('Código Master Inválido');
        if (registerRole === 'representante' && secretCode !== 'REP2024') throw new Error('Código Rep Inválido');
        
        const res = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        const profile = { name: loginName, email: loginEmail, whatsapp: loginWhatsapp, polo: selectedPolo, role: registerRole, walletBalance: 0, pendingPixRefund: 0, pixKey: '' };
        await setDoc(doc(db, "users", res.user.uid), profile);
        showToast('Conta criada com sucesso!');
      }
    } catch (err) {
      showToast(err.message.includes('Código') ? err.message : 'Verifique os dados informados.', 'error');
      setAuthLoading(false);
    }
  };

  const processOrder = async (finalTotal, paymentMethod, walletDiscount) => {
    setIsProcessingPayment(true);
    try {
      const newOrder = { 
        customer: user?.name || 'Cliente', 
        email: user?.email || '', 
        whatsapp: user?.whatsapp || '', 
        polo: user?.polo || polos[0], 
        cpf: checkoutCpf || 'Não informado',
        total: finalTotal, 
        method: finalTotal <= 0 ? 'saldo' : paymentMethod, 
        status: finalTotal <= 0 ? 'pago' : 'aguardando_pagamento', 
        status_nfe: 'pendente',
        walletDiscountApplied: walletDiscount, 
        date: new Date().toISOString(), 
        items: cart.map(i => ({ id: i.id, name: i.name, qtd: i.qtd, price: getActivePrice(i) })),
        faltas: []
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrder);
      
      if (finalTotal <= 0) {
        await updateDoc(doc(db,"users", user.uid), { walletBalance: Math.max(0, (user.walletBalance || 0) - walletDiscount) });
        setCart([]); setIsProcessingPayment(false); setCurrentScreen('success');
        return;
      }
      
      setPendingOrder({ id: orderRef.id, ...newOrder }); 
      setCart([]); setIsProcessingPayment(false); 
      setCurrentScreen('gateway_pix'); 
    } catch(err) { 
      setIsProcessingPayment(false); showToast('Erro no pedido', 'error'); 
    }
  };

  const simulateMercadoPagoApproval = async () => {
    if(pendingOrder) { 
      await updateDoc(doc(db, "orders", pendingOrder.id), { status: 'pago' }); 
      showToast('Pagamento Aprovado!');
      setCurrentScreen('success'); 
    }
  };

  const analyzeFaltaGlobal = () => {
    if (!shortageSelectedProduct) return showToast('Selecione um produto.', 'error');
    const ordersToUpdate = orders.filter(o => o.status === 'pago' && (o.items || []).some(i => i.id === shortageSelectedProduct));
    
    if (ordersToUpdate.length === 0) return showToast('Nenhum pedido pago contém este item.', 'error');
    
    const impact = ordersToUpdate.map(order => {
       const item = order.items.find(i => i.id === shortageSelectedProduct);
       return { orderId: order.id, customer: order.customer, userEmail: order.email, refundValue: item.price * item.qtd, itemData: item };
    });
    
    setShortagePreview({ 
      product: products.find(p => p.id === shortageSelectedProduct), 
      impact, 
      totalRefund: impact.reduce((sum, imp) => sum + imp.refundValue, 0) 
    });
  };

  const confirmFaltaGlobal = async () => {
    try {
      for (const imp of shortagePreview.impact) {
        const orderRef = doc(db, "orders", imp.orderId);
        const orderSnap = await getDoc(orderRef);
        if(orderSnap.exists()){
           const orderData = orderSnap.data();
           const faltasAtualizadas = [...(orderData.faltas || []), { productId: shortagePreview.product.id, name: imp.itemData.name, refundValue: imp.refundValue }];
           await updateDoc(orderRef, { faltas: faltasAtualizadas });

           const userQuery = query(collection(db, "users"), where("email", "==", imp.userEmail));
           const uSnap = await getDocs(userQuery);
           if (!uSnap.empty) {
             const uDoc = uSnap.docs[0];
             await updateDoc(doc(db, "users", uDoc.id), { walletBalance: (uDoc.data().walletBalance || 0) + imp.refundValue });
           }
        }
      }
      showToast(`Créditos gerados para ${shortagePreview.impact.length} clientes!`);
      setFaltaGlobalModal(false); setShortagePreview(null); setShortageSelectedProduct('');
      // Atualiza os pedidos localmente para ver refletido na hora
      const oSnap = await getDocs(collection(db, "orders"));
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { showToast('Erro ao processar', 'error'); }
  };

  const exportSupplierCSV = () => {
    const validOrders = orders.filter(o => o.status === 'pago');
    const rows = [["LOCAL DESCARGA", "SKU", "PRODUTO", "CAIXAS FECHADAS", "QTDE FRACIONADA USADA", "NOVA SOBRA PREVISTA"]];
    
    products.forEach(p => {
        let totalSedeFracionado = 0;
        let totalSatellites = 0;
        const minBox = p.minBox || 1;
        const localStockSede = p.stock || 0;

        polosEntregaDireta.forEach(poloDireto => {
            const soldInPolo = validOrders.filter(o => o.polo === poloDireto).reduce((sum, o) => sum + (o.items?.find(i=>i.id===p.id)?.qtd || 0), 0);
            if (soldInPolo > 0) {
                const caixasInteiras = Math.floor(soldInPolo / minBox);
                const fracionado = soldInPolo % minBox;
                if (caixasInteiras > 0) {
                    rows.push([poloDireto.toUpperCase(), p.sku || '-', p.name, caixasInteiras, '-', '-']);
                }
                totalSedeFracionado += fracionado; 
            }
        });

        const polosSatellite = polos.filter(polo => !polosEntregaDireta.includes(polo));
        polosSatellite.forEach(poloSat => {
            totalSatellites += validOrders.filter(o => o.polo === poloSat).reduce((sum, o) => sum + (o.items?.find(i=>i.id===p.id)?.qtd || 0), 0);
        });

        const totalSedeNeed = totalSatellites + totalSedeFracionado;
        if (totalSedeNeed > 0 || localStockSede > 0) {
            let needToBuy = Math.max(0, totalSedeNeed - localStockSede);
            let boxesToBuy = 0;
            let newStock = localStockSede - totalSedeNeed;

            if (needToBuy > 0) {
                boxesToBuy = Math.ceil(needToBuy / minBox);
                newStock = (localStockSede + (boxesToBuy * minBox)) - totalSedeNeed;
            } else if (totalSedeNeed > 0) {
                newStock = localStockSede - totalSedeNeed;
            }

            if (boxesToBuy > 0 || totalSedeNeed > 0) {
                 rows.push(["SEDE SJC (HUB)", p.sku || '-', p.name, boxesToBuy, totalSedeNeed, newStock]);
            }
        }
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Pedido_Fornecedor_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    link.click();
  };

  const renderDispatchPDF = () => {
    const validOrders = orders.filter(o => o.status === 'pago');
    return (
      <div className="bg-white min-h-screen p-8 text-black font-sans">
        <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black">Romaneio de Despacho (Sede)</h1>
          <p className="text-sm font-bold">Gerado em: {new Date().toLocaleDateString()}</p>
        </div>
        <p className="mb-8 text-sm italic">Este documento lista o que a Sede deve carregar nas carrinhas/vans de cada polo hoje.</p>
        
        {polos.map(polo => {
          const itensDoPolo = {};
          validOrders.filter(o => o.polo === polo).forEach(o => {
             (o.items||[]).forEach(i => {
                if(!itensDoPolo[i.id]) itensDoPolo[i.id] = { name: i.name, qtdTotal: 0, boxSize: products.find(p=>p.id===i.id)?.minBox || 1 };
                itensDoPolo[i.id].qtdTotal += i.qtd;
             });
          });

          const itensList = Object.values(itensDoPolo).filter(i => i.qtdTotal > 0);
          if (itensList.length === 0) return null;

          const isDirect = polosEntregaDireta.includes(polo);

          return (
            <div key={polo} className="mb-10 break-inside-avoid">
               <h2 className="text-xl font-black bg-gray-200 p-2 mb-4 uppercase">🚐 Destino: {polo} {isDirect && '(Complemento Fracionado)'}</h2>
               <table className="w-full text-left text-sm border-collapse border border-gray-300">
                 <thead>
                   <tr className="bg-gray-100">
                     <th className="border border-gray-300 p-2 w-16 text-center">Check</th>
                     <th className="border border-gray-300 p-2">Produto a Embarcar</th>
                     <th className="border border-gray-300 p-2 text-center">Qtde</th>
                   </tr>
                 </thead>
                 <tbody>
                   {itensList.map((item, idx) => {
                     let qtdParaEmbarcar = item.qtdTotal;
                     if (isDirect) qtdParaEmbarcar = item.qtdTotal % item.boxSize;
                     if (qtdParaEmbarcar === 0) return null; 

                     return (
                       <tr key={idx}>
                         <td className="border border-gray-300 p-2 text-center"><div className="w-5 h-5 border-2 border-black inline-block"></div></td>
                         <td className="border border-gray-300 p-2 font-bold">{item.name}</td>
                         <td className="border border-gray-300 p-2 text-center text-lg font-black">{qtdParaEmbarcar}</td>
                       </tr>
                     )
                   })}
                 </tbody>
               </table>
            </div>
          )
        })}
        <div className="mt-8 flex gap-4 no-print">
           <button onClick={() => window.print()} className="bg-emerald-700 text-white font-bold px-6 py-3 rounded-lg flex items-center"><Printer className="mr-2"/> Imprimir Agora</button>
           <button onClick={() => setIsPrintMode(false)} className="bg-gray-200 text-black font-bold px-6 py-3 rounded-lg">Voltar ao Sistema</button>
        </div>
      </div>
    );
  };

  const BottomNav = () => {
    if (currentScreen === 'login') return null;
    return (
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] md:hidden">
        <button onClick={() => setCurrentScreen('shop')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='shop'?'text-emerald-700':'text-gray-400'}`}>
          <Home className="w-5 h-5 mb-1" /><span className="text-[10px] font-black uppercase">Loja</span>
        </button>
        <button onClick={() => setCurrentScreen('my_orders')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='my_orders'?'text-emerald-700':'text-gray-400'}`}>
          <Package className="w-5 h-5 mb-1" /><span className="text-[10px] font-black uppercase">Pedidos</span>
        </button>
        {['representante', 'consolidador'].includes(user?.role) && (
          <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='dashboard_rep'?'text-emerald-700':'text-gray-400'}`}>
            <Truck className="w-5 h-5 mb-1" /><span className="text-[10px] font-black uppercase">Logística</span>
          </button>
        )}
        {user?.role === 'consolidador' && (
          <button onClick={() => { setCurrentScreen('dashboard_admin'); setIsSidebarOpen(false); }} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='dashboard_admin'?'text-emerald-700':'text-gray-400'}`}>
            <LayoutDashboard className="w-5 h-5 mb-1" /><span className="text-[10px] font-black uppercase">Gestão</span>
          </button>
        )}
      </div>
    );
  };

  const renderShop = () => {
    const filteredProducts = products.filter(p => (shopCategory === 'Todos' || p.category === shopCategory) && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const promoProducts = products.filter(p => Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price));

    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto font-sans">
        <div className="relative mb-6">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Estou procurando por..." className="w-full bg-white border border-gray-200 py-4 pl-12 pr-4 rounded-2xl shadow-sm focus:outline-none focus:border-emerald-500 font-medium" />
          <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="flex items-center text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
             <MapPin className="w-4 h-4 mr-2" /> Polo de Retirada: <span className="ml-1 text-emerald-950">{user?.polo || polos[0]}</span>
           </div>
           
           {user?.walletBalance > 0 && (
             <div className="flex items-center text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm animate-pulse">
               <Wallet className="w-4 h-4 mr-2" /> Crédito Disponível: <span className="ml-1 text-emerald-950 font-black">R$ {user.walletBalance.toFixed(2)}</span>
             </div>
           )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
          {activeCategories.map(cat => (
             <button key={cat} onClick={() => setShopCategory(cat)} className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-sm border transition-colors ${shopCategory === cat ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {cat}
             </button>
          ))}
        </div>

        {promoProducts.length > 0 && !searchTerm && shopCategory === 'Todos' && (
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Seleção da Semana</h3>
               <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{products.length} itens</span>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
              {promoProducts.map(p => {
                const discount = Math.round((1 - (p.promotionalPrice / p.price)) * 100);
                return (
                  <div key={`promo-${p.id}`} className="snap-start shrink-0 w-48 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-br-xl z-10">{discount}% OFF</span>
                    <div className="h-40 bg-gray-50 flex items-center justify-center p-4 relative">
                       {p.category && <span className="absolute top-2 right-2 text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-1 rounded tracking-widest">{p.category}</span>}
                       {p.image?.length > 5 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-6xl">{p.image || '📦'}</span>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow text-center">
                      <h3 className="text-sm font-black text-slate-800 leading-tight mb-2 line-clamp-2">{p.name}</h3>
                      <p className="text-[10px] text-gray-400 line-through mb-0.5 font-bold">R$ {p.price.toFixed(2)}</p>
                      <p className="text-2xl text-slate-800 font-black leading-none mb-4">R$ {p.promotionalPrice.toFixed(2)}</p>
                      <button onClick={() => {
                        const existing = cart.find(i => i.id === p.id);
                        if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
                        else setCart([...cart, { ...p, qtd: 1 }]);
                        showToast(`${p.name} adicionado!`);
                      }} className="w-full bg-emerald-100 text-emerald-800 py-3 rounded-2xl font-black text-sm hover:bg-emerald-200 transition-colors mt-auto">Adicionar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const isPromo = Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price);
            const activePrice = isPromo ? p.promotionalPrice : p.price;

            return (
              <div key={p.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-6 relative">
                  {isPromo && <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-br-xl z-10">{Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF</span>}
                  {p.image?.length > 5 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-6xl">{p.image || '📦'}</span>}
                </div>
                <div className="p-4 flex flex-col flex-grow text-center">
                  {isPromo ? (
                    <div className="mb-2">
                       <span className="text-xs text-gray-400 line-through mr-1 font-bold">R$ {p.price.toFixed(2)}</span>
                       <span className="text-2xl text-slate-800 font-black">R$ {activePrice.toFixed(2)}</span>
                    </div>
                  ) : (
                    <p className="text-2xl text-slate-800 font-black mb-2">R$ {activePrice.toFixed(2)}</p>
                  )}
                  <p className="text-[10px] text-emerald-600 font-bold mb-3 flex items-center justify-center"><Truck className="w-3 h-3 mr-1"/> Chega ao polo em breve</p>
                  <h3 className="text-sm text-slate-600 font-medium leading-snug mb-4 flex-grow line-clamp-2">{p.name}</h3>
                  <button onClick={() => {
                        const existing = cart.find(i => i.id === p.id);
                        if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
                        else setCart([...cart, { ...p, qtd: 1 }]);
                        showToast(`Adicionado com sucesso!`);
                  }} className="w-full bg-emerald-100 text-emerald-800 py-3 rounded-2xl font-black text-sm hover:bg-emerald-200 transition-colors shadow-sm">Adicionar</button>
                </div>
              </div>
            )
          })}
        </div>

        {cart.length > 0 && (
           <div className="fixed bottom-16 md:bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">{cart.reduce((s,i)=>s+i.qtd,0)} itens na cesta</p>
                    <p className="text-2xl font-black text-emerald-800">R$ {cartTotal.toFixed(2)}</p>
                 </div>
                 <button onClick={() => setCurrentScreen('checkout')} className="bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-800 transition flex items-center">
                    Ver Carrinho <ArrowRight className="w-5 h-5 ml-2"/>
                 </button>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderAdminDashboard = () => {
    const validOrders = orders.filter(o => o.status === 'pago' && o.date);
    const totalGross = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrdersCount = validOrders.length;
    const itemsSold = validOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.qtd || 0), 0), 0);
    const avgTicket = totalOrdersCount > 0 ? totalGross / totalOrdersCount : 0;
    const avgPricePerUnit = itemsSold > 0 ? totalGross / itemsSold : 0;
    const pendingCredits = allUsers.reduce((sum, u) => sum + (u.pendingPixRefund || 0), 0);

    const productStats = {};
    validOrders.forEach(o => (o.items || []).forEach(i => {
      if (!productStats[i.id]) {
         const pData = products.find(p => p.id === i.id) || {};
         productStats[i.id] = { name: i.name, qty: 0, val: 0, image: pData.image };
      }
      productStats[i.id].qty += (i.qtd || 0);
      productStats[i.id].val += ((i.price || 0) * (i.qtd || 0));
    }));
    const top5 = Object.values(productStats).sort((a,b) => b.val - a.val).slice(0, 5);

    const today = new Date();
    const last7Days = Array.from({length: 7}).map((_, i) => { const d = new Date(); d.setDate(today.getDate() - (6 - i)); return d; });
    const salesData = last7Days.map(date => {
        return validOrders.filter(o => o.date && new Date(o.date).toDateString() === date.toDateString()).reduce((sum, o) => sum + (o.total || 0), 0);
    });
    const maxSale = Math.max(...salesData, 100);

    const renderContent = () => {
      if (adminTab === 'dashboard') {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-500 mb-1">Vendas brutas</p>
                 <p className="text-2xl font-black text-slate-800">R$ {totalGross.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-500 mb-1">Unidades vendidas</p>
                 <p className="text-2xl font-black text-slate-800">{itemsSold}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-500 mb-1">Preço médio/unidade</p>
                 <p className="text-2xl font-black text-slate-800">R$ {avgPricePerUnit.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-500 mb-1">Quantidade de vendas</p>
                 <p className="text-2xl font-black text-slate-800">{totalOrdersCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                 <p className="text-xs font-bold text-gray-500 mb-1">Ticket Médio</p>
                 <p className="text-2xl font-black text-slate-800">R$ {avgTicket.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center bg-orange-50/30">
                 <p className="text-xs font-bold text-orange-600 mb-1">Créditos Retidos</p>
                 <p className="text-2xl font-black text-orange-700">R$ {pendingCredits.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-sm text-gray-500 mb-8">Evolução Diária (7 Dias)</h3>
               <div className="flex items-end justify-between h-48 gap-2">
                 {salesData.map((val, i) => {
                   const heightPercentage = Math.max((val / maxSale) * 100, 2); 
                   return (
                     <div key={i} className="flex flex-col items-center flex-1 group">
                        <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded mb-2 transition-opacity">R$ {val.toFixed(0)}</div>
                        <div className="w-full max-w-[40px] bg-emerald-500 rounded-t-lg hover:bg-emerald-400 transition-colors" style={{ height: `${heightPercentage}%` }}></div>
                        <span className="text-[10px] font-bold text-gray-400 mt-3">{last7Days[i].getDate()}/{last7Days[i].getMonth()+1}</span>
                     </div>
                   );
                 })}
               </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-black text-xl text-slate-800 mb-6 text-center">Top 5 Produtos</h3>
              <div className="space-y-3">
                 {top5.map((item, idx) => (
                   <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4 hover:bg-white transition-colors">
                     <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden border border-gray-100">
                         {item.image?.length > 5 ? <img src={item.image} className="w-full h-full object-cover" alt=""/> : <span className="text-2xl">📦</span>}
                       </div>
                       <div>
                         <p className="font-black text-slate-800 text-sm md:text-base leading-tight">{item.name}</p>
                         <p className="text-xs font-bold text-gray-500 mt-1">{item.qty} unidades vendidas</p>
                       </div>
                     </div>
                     <p className="font-black text-emerald-700 text-lg md:text-xl shrink-0">R$ {item.val.toFixed(2)}</p>
                   </div>
                 ))}
                 {top5.length === 0 && <p className="text-center text-gray-500 text-sm py-4">Nenhum dado de venda ainda.</p>}
              </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'vendas') {
         const allValidOrders = orders.filter(o => o.status === 'pago' && o.date);
         const ordersByMonth = allValidOrders.reduce((acc, order) => {
           const d = new Date(order.date);
           const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
           const capMonth = `${months[d.getMonth()]} ${d.getFullYear()}`;
           const sortKey = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`;
           if (!acc[capMonth]) acc[capMonth] = { orders: [], total: 0, count: 0, sortKey };
           acc[capMonth].orders.push(order);
           acc[capMonth].total += (order.total || 0);
           acc[capMonth].count += 1;
           return acc;
         }, {});

         return (
           <div className="space-y-6">
             <h2 className="text-2xl font-black text-slate-800 mb-6">Histórico Global de Vendas</h2>
             {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => (
               <div key={month} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                  <div className="p-6 bg-slate-50 border-b border-gray-50 flex justify-between items-center">
                     <div>
                       <h3 className="font-black text-slate-800 text-xl capitalize">{month}</h3>
                       <p className="text-sm font-bold text-gray-500 mt-1">{data.count} pedidos nesta plataforma</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">Faturamento</p>
                        <p className="text-2xl font-black text-emerald-700">R$ {data.total.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="p-4 space-y-3">
                     {data.orders.slice().reverse().map(o => (
                       <div key={o.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between gap-4 items-start md:items-center hover:border-emerald-200 transition-colors">
                         <div>
                           <p className="font-black text-slate-800 text-lg">{o.customer}</p>
                           <p className="text-xs font-bold text-gray-400 mb-2">#{o.id.slice(0,5)} • {new Date(o.date).toLocaleDateString()} • Polo: {o.polo}</p>
                           <div className="flex flex-wrap gap-1 mt-2">
                             {(o.items || []).map((i, idx) => (
                               <span key={idx} className="text-[10px] font-bold px-2 py-1 rounded bg-gray-50 text-slate-600 border border-gray-200">
                                 {i.qtd}x {i.name.split(' ')[0]}
                               </span>
                             ))}
                           </div>
                         </div>
                         <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                            <span className="font-black text-slate-800 text-lg">R$ {(o.total||0).toFixed(2)}</span>
                            <button onClick={()=>requestConfirm('Apagar este pedido permanentemente?', ()=>{deleteDoc(doc(db,"orders",o.id)); showToast('Pedido Apagado');})} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center"><Trash2 className="w-3 h-3 mr-1"/> Excluir</button>
                         </div>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
             {Object.keys(ordersByMonth).length === 0 && <p className="text-center text-gray-500 py-10">Nenhuma venda registada.</p>}
           </div>
         );
      }

      if (adminTab === 'compras') {
        return (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between gap-4 mb-8 bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
               <div>
                 <h2 className="text-2xl font-black text-emerald-900">Inteligência de Compras</h2>
                 <p className="text-sm font-medium text-emerald-800 mt-2 max-w-xl">O sistema calcula o Cross-docking. Caixas fechadas vão direto para {polosEntregaDireta.join(' e ')}. O fracionado junta-se aos pedidos da Sede.</p>
               </div>
               <div className="flex flex-col gap-3 shrink-0">
                 <button onClick={exportSupplierCSV} className="bg-emerald-700 text-white font-black px-6 py-3.5 rounded-xl shadow-lg hover:bg-emerald-800 flex items-center justify-center w-full"><Download className="w-5 h-5 mr-2"/> CSV para Fornecedor</button>
                 <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white font-black px-6 py-3.5 rounded-xl shadow-lg hover:bg-slate-900 flex items-center justify-center w-full"><Printer className="w-5 h-5 mr-2"/> PDF Despacho da Sede</button>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
                 <h4 className="font-black text-slate-800 text-sm mb-2 uppercase flex items-center"><Truck className="w-4 h-4 mr-2 text-emerald-600"/> Entregas Diretas (Polos)</h4>
                 <p className="text-sm text-gray-600 font-medium">Os polos de <strong className="text-slate-800">{polosEntregaDireta.join(', ')}</strong> recebem caixas fechadas diretas do fornecedor. Qualquer sobra fracionada destes polos é enviada para a Sede suprir.</p>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
                 <h4 className="font-black text-slate-800 text-sm mb-2 uppercase flex items-center"><Store className="w-4 h-4 mr-2 text-emerald-600"/> A Sede (SJC Hub)</h4>
                 <p className="text-sm text-gray-600 font-medium">A Sede junta os seus pedidos com os dos polos satélite (Jacareí, Caçapava, etc) e recebe as sobras fracionadas dos Polos Diretos para tentar fechar novas caixas matemáticas.</p>
              </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'catalogo') {
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Gestão de Catálogo</h2>
            
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
               <div>
                 <h3 className="font-black text-emerald-900">Importação em Lote (CSV)</h3>
                 <p className="text-xs font-medium text-emerald-800 mt-1 max-w-md">Envie a tabela do fornecedor para atualizar os preços ou criar novos produtos automaticamente.</p>
               </div>
               <label className="bg-emerald-700 text-white px-6 py-3.5 rounded-xl font-black cursor-pointer hover:bg-emerald-800 transition shadow-lg whitespace-nowrap flex items-center">
                 <Upload className="w-5 h-5 mr-2"/> Subir Tabela CSV
                 <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                    if(e.target.files[0]) {
                       const reader = new FileReader();
                       reader.onload = async (event) => {
                          const text = event.target.result;
                          const rows = text.split('\n');
                          let count = 0;
                          for(let i=1; i<rows.length; i++){
                             const cols = rows[i].split(',');
                             if(cols.length >= 4) {
                                const sku = cols[0].trim();
                                const name = cols[1].trim();
                                const price = parseFloat(cols[3].replace(',','.'));
                                if(sku && name && !isNaN(price)){
                                   const existing = products.find(p=>p.sku === sku);
                                   if(existing){
                                      await updateDoc(doc(db,"products",existing.id), {price, name});
                                   } else {
                                      await addDoc(collection(db,"products"), {sku, name, category: cols[2]||'Geral', price, minBox: parseInt(cols[4]||'1'), stock: 0, image: '📦'});
                                   }
                                   count++;
                                }
                             }
                          }
                          showToast(`${count} produtos processados com sucesso!`);
                          const pSnap = await getDocs(collection(db,"products"));
                          setProducts(pSnap.docs.map(d=>({id:d.id, ...d.data()})));
                       };
                       reader.readAsText(e.target.files[0]);
                    }
                 }}/>
               </label>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <form key={editingProduct?.id || 'new'} onSubmit={async(e) => {
                 e.preventDefault(); const fd = new FormData(e.target);
                 const pPrice = parseFloat(fd.get('promotionalPrice').replace(',','.')) || 0;
                 const np = { 
                    name: fd.get('name'), sku: fd.get('sku'), category: fd.get('category'), 
                    price: parseFloat(fd.get('price').replace(',','.')), promotionalPrice: pPrice, 
                    stock: parseInt(fd.get('stock')||'0'), minBox: parseInt(fd.get('minBox')||'1'), 
                    image: editingProduct?.image || '📦' 
                 };
                 
                 const fileInput = e.target.querySelector('input[type="file"]');
                 if (fileInput.files[0]) { np.image = await compressImage(fileInput.files[0]); }

                 try { 
                    if(editingProduct) {
                       await updateDoc(doc(db,"products",editingProduct.id), np);
                       setProducts(products.map(p => p.id===editingProduct.id ? {id:p.id, ...np} : p));
                       showToast('Produto Atualizado!');
                    } else {
                       const docRef = await addDoc(collection(db,"products"), np); 
                       setProducts([...products, {id: docRef.id, ...np}]); 
                       showToast('Produto Criado!'); 
                    }
                    setEditingProduct(null); e.target.reset(); 
                 } catch(er){ showToast('Erro ao salvar', 'error'); }
               }} className="mb-8 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="font-black text-slate-800">{editingProduct ? `Editando: ${editingProduct.name}` : 'Criar Novo Produto'}</h4>
                     {editingProduct && <button type="button" onClick={()=>{setEditingProduct(null);}} className="text-sm font-bold text-gray-500 bg-gray-200 px-3 py-1 rounded-lg">Cancelar Edição</button>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3 flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200">
                       <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                          {editingProduct?.image?.length > 5 ? <img src={editingProduct.image} className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 text-gray-400"/>}
                       </div>
                       <label className="bg-white border border-emerald-600 text-emerald-700 px-4 py-2 rounded-xl font-bold cursor-pointer text-sm hover:bg-emerald-50 transition">
                          Escolher Foto (Opcional)
                          <input type="file" accept="image/*" className="hidden" />
                       </label>
                    </div>

                    <input name="name" defaultValue={editingProduct?.name} placeholder="Nome do Produto" required className="p-4 rounded-xl border border-gray-200 outline-none md:col-span-2 font-medium" />
                    <input name="sku" defaultValue={editingProduct?.sku} placeholder="Cód. SKU" required className="p-4 rounded-xl border border-gray-200 outline-none font-medium" />
                    <input name="category" defaultValue={editingProduct?.category} placeholder="Categoria (Ex: Carnes)" required className="p-4 rounded-xl border border-gray-200 outline-none font-medium" />
                    <input name="price" defaultValue={editingProduct?.price} placeholder="Preço Normal (Ex: 15.50)" required className="p-4 rounded-xl border border-gray-200 outline-none font-medium" />
                    <input name="promotionalPrice" defaultValue={editingProduct?.promotionalPrice || ''} placeholder="Preço Promo (Opcional)" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 outline-none font-bold text-emerald-800" />
                    
                    <div className="md:col-span-3 grid grid-cols-2 gap-4 mt-2">
                       <div>
                         <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Tamanho da Caixa (Qtd Fornecedor)</label>
                         <input name="minBox" defaultValue={editingProduct?.minBox||'1'} required className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium" />
                       </div>
                       <div>
                         <label className="text-xs font-bold text-orange-600 ml-1 mb-1 block">Sobra de Estoque Atual (Sede)</label>
                         <input name="stock" defaultValue={editingProduct?.stock||'0'} required className="w-full p-4 rounded-xl border border-orange-200 bg-orange-50 outline-none font-bold text-orange-800" />
                       </div>
                    </div>

                    <button type="submit" className="md:col-span-3 bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-900 shadow-lg mt-4">{editingProduct ? 'Salvar Alterações' : 'Criar Produto'}</button>
                  </div>
               </form>
               
               <div className="space-y-3">
                 {products.map(p => (
                   <div key={p.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between text-sm hover:border-emerald-200 transition-colors bg-white">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                         {p.image?.length > 5 ? <img src={p.image} className="w-full h-full object-cover"/> : <span className="text-xl">📦</span>}
                       </div>
                       <div>
                         <p className="font-black text-slate-800">{p.name}</p>
                         <p className="text-xs font-bold text-gray-500 mt-1">{p.sku} • Cx: {p.minBox} • Estoque Sede: <span className="text-orange-600">{p.stock}</span></p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3 shrink-0">
                       <div className="text-right hidden sm:block">
                          {Boolean(p.promotionalPrice > 0) && <p className="text-[10px] text-emerald-600 font-bold leading-none mb-1">Promo: R$ {p.promotionalPrice.toFixed(2)}</p>}
                          <span className="font-black text-slate-800 text-base block">R$ {p.price.toFixed(2)}</span>
                       </div>
                       <div className="flex gap-1 ml-2">
                         <button onClick={()=>setEditingProduct(p)} className="bg-blue-50 text-blue-600 p-2.5 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4"/></button>
                         <button onClick={()=>requestConfirm(`Apagar ${p.name}?`, ()=>{ deleteDoc(doc(db,"products",p.id)); setProducts(products.filter(x=>x.id!==p.id)); })} className="bg-red-50 text-red-600 p-2.5 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'financeiro') {
        const estornosPendentes = allUsers.filter(u => u.pendingPixRefund > 0);
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Financeiro & Reembolsos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
                <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Carteiras (Crédito Retido)</p>
                <p className="text-4xl font-black text-emerald-700">R$ {allUsers.reduce((s,u)=>s+(u.walletBalance||0),0).toFixed(2)}</p>
                <p className="text-xs text-emerald-700 mt-2 font-medium">Saldo que os clientes usarão em próximas compras.</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200">
                <p className="text-xs font-bold text-orange-800 uppercase mb-1">Pedidos de PIX Pendentes</p>
                <p className="text-4xl font-black text-orange-600">R$ {pendingCredits.toFixed(2)}</p>
                <p className="text-xs text-orange-700 mt-2 font-medium">Estornos solicitados que precisam de transferência manual.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
              <h3 className="font-black text-slate-800 mb-4">Fila de Transferências PIX</h3>
              {estornosPendentes.length === 0 ? <p className="text-gray-500 text-sm py-4">Nenhum pedido de PIX na fila.</p> : estornosPendentes.map(u => (
                <div key={u.id} className="border border-orange-100 bg-orange-50/30 p-6 rounded-3xl flex flex-col md:flex-row justify-between gap-6 mb-4">
                  <div>
                    <p className="font-black text-slate-800 text-xl">{u.name}</p>
                    <p className="text-sm font-bold text-gray-500 mb-3">Chave PIX Informada para Estorno:</p>
                    <div className="bg-white px-4 py-3 border border-orange-200 rounded-xl inline-block font-mono font-black text-orange-800 shadow-sm text-lg">{u.pixKey}</div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-3 justify-center">
                    <span className="font-black text-orange-600 text-3xl">R$ {u.pendingPixRefund.toFixed(2)}</span>
                    <button onClick={async()=>{
                      await updateDoc(doc(db,"users",u.id), { pendingPixRefund: 0, pixKey: '' });
                      const ns = await getDocs(collection(db,"users")); setAllUsers(ns.docs.map(d=>({id:d.id, ...d.data()})));
                      showToast('Estorno Baixado no Sistema!');
                    }} className="bg-emerald-600 text-white font-black px-8 py-3.5 rounded-xl shadow-lg hover:bg-emerald-700 w-full md:w-auto">Confirmar Transferência</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="min-h-screen bg-slate-50 flex relative font-sans pb-20 md:pb-0">
        <div className={`fixed inset-y-0 left-0 z-[70] w-72 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
             <span className="font-black tracking-tight text-xl">Gestão Master</span>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2"><X className="w-6 h-6 text-gray-400"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <button onClick={() => {setAdminTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='dashboard'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Painel de Métricas</button>
            <button onClick={() => {setAdminTab('vendas'); setIsSidebarOpen(false);}} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='vendas'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Histórico de Vendas</button>
            <button onClick={() => {setAdminTab('compras'); setIsSidebarOpen(false);}} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='compras'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Logística de Compras</button>
            <button onClick={() => {setAdminTab('catalogo'); setIsSidebarOpen(false);}} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='catalogo'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Catálogo & Produtos</button>
            <button onClick={() => {setAdminTab('financeiro'); setIsSidebarOpen(false);}} className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-sm transition-colors ${adminTab==='financeiro'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Financeiro & Estornos</button>
            
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-[10px] font-black text-gray-500 uppercase px-4 mb-3 tracking-widest">Navegação Rápida</p>
              <button onClick={() => { setCurrentScreen('shop'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl font-bold text-sm text-emerald-400 hover:bg-white/5 flex items-center transition-colors"><Store className="w-4 h-4 mr-3"/> Visão da Loja</button>
              <button onClick={() => { setCurrentScreen('dashboard_rep'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl font-bold text-sm text-blue-400 hover:bg-white/5 flex items-center transition-colors mt-1"><Truck className="w-4 h-4 mr-3"/> Visão dos Polos</button>
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
               <button onClick={() => {setFaltaGlobalModal(true); setIsSidebarOpen(false);}} className="w-full bg-red-500/10 text-red-500 font-black text-sm p-4 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"><AlertTriangle className="w-4 h-4 mr-2"/> Falta Global</button>
            </div>
          </div>
        </div>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-[65] md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

        <div className="flex-1 w-full md:pl-72 flex flex-col h-screen overflow-hidden">
          <div className="h-20 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 shrink-0 shadow-sm z-10 justify-between">
            <div className="flex items-center">
               <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden mr-4 bg-gray-100 rounded-lg"><Menu className="w-6 h-6 text-slate-800"/></button>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight hidden sm:block">Torre de Controle</h1>
            </div>
            <div className="flex items-center gap-4">
                 <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest hidden sm:inline-block">GESTOR MASTER</span>
                 <div className="text-right">
                   <p className="text-sm font-black text-slate-800 leading-tight">{user?.name}</p>
                   <p className="text-[10px] font-bold text-gray-500">Acesso Total</p>
                 </div>
                 <button onClick={() => {signOut(auth); setCart([]);}} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors text-slate-600"><LogOut className="w-4 h-4"/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  const renderCheckout = () => {
    const hasFee = paymentMethod === 'credit';
    const feeAmount = hasFee ? cartTotal * 0.05 : 0;
    const subTotalWithFee = cartTotal + feeAmount;
    const walletDiscount = (user?.walletBalance || 0) > 0 ? Math.min(user.walletBalance, subTotalWithFee) : 0;
    const finalTotal = subTotalWithFee - walletDiscount;

    return (
      <div className="p-4 max-w-xl mx-auto pb-24 pt-8 font-sans">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Finalizar Compra</h2>
          <button onClick={() => setCurrentScreen('shop')} className="flex items-center text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-emerald-100 transition-colors"><Edit2 className="w-4 h-4 mr-2" /> Editar Cesta</button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <div className="space-y-4 mb-6">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <span className="font-bold text-slate-700 flex items-center"><span className="w-6 h-6 bg-emerald-50 text-emerald-700 rounded flex items-center justify-center mr-3 font-black text-xs">{item.qtd}x</span> {item.name}</span>
                <span className="font-black text-slate-800">R$ {(getActivePrice(item) * item.qtd).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex justify-between text-slate-600 text-sm mb-3 font-medium"><span>Subtotal dos Produtos</span><span>R$ {cartTotal.toFixed(2)}</span></div>
            {hasFee && <div className="flex justify-between text-orange-600 text-sm font-bold mb-3"><span>Taxa do Cartão (5%)</span><span>+ R$ {feeAmount.toFixed(2)}</span></div>}
            {walletDiscount > 0 && <div className="flex justify-between text-emerald-600 text-sm font-bold mb-3 bg-emerald-50 p-2 rounded-lg -mx-2 px-2"><span>Saldo da Carteira Aplicado</span><span>- R$ {walletDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-2">
              <span className="font-black text-gray-500 uppercase text-xs tracking-widest">Total a Pagar</span>
              <span className="font-black text-3xl text-emerald-800">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {finalTotal > 0 && (
          <div className="mb-8 space-y-6">
            <div>
              <p className="font-black text-sm text-slate-800 uppercase tracking-widest mb-3">Como deseja pagar?</p>
              <div className="grid grid-cols-2 gap-4">
                <label className={`p-5 border-2 rounded-2xl cursor-pointer text-center transition-all ${paymentMethod==='pix'?'border-emerald-600 bg-emerald-50 shadow-md':'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={paymentMethod==='pix'} onChange={()=>setPaymentMethod('pix')}/>
                  <QrCode className={`w-8 h-8 mx-auto mb-3 ${paymentMethod==='pix'?'text-emerald-600':'text-gray-400'}`}/>
                  <p className="font-black text-slate-800 text-base">PIX</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-100 px-2 py-0.5 rounded inline-block">Sem taxas</p>
                </label>
                <label className={`p-5 border-2 rounded-2xl cursor-pointer text-center transition-all ${paymentMethod==='credit'?'border-emerald-600 bg-emerald-50 shadow-md':'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={paymentMethod==='credit'} onChange={()=>setPaymentMethod('credit')}/>
                  <CreditCard className={`w-8 h-8 mx-auto mb-3 ${paymentMethod==='credit'?'text-emerald-600':'text-gray-400'}`}/>
                  <p className="font-black text-slate-800 text-base">Cartão</p>
                  <p className="text-[10px] text-orange-500 font-bold mt-1 bg-orange-50 px-2 py-0.5 rounded inline-block">+5% de Taxa</p>
                </label>
              </div>
            </div>
            
            <div>
              <p className="font-black text-sm text-slate-800 uppercase tracking-widest mb-3 flex items-center justify-between">Nota Fiscal Eletrônica <span className="text-[10px] font-bold text-gray-400 normal-case bg-gray-100 px-2 py-1 rounded">Opcional</span></p>
              <input type="text" placeholder="Insira o seu CPF (Apenas números)" value={checkoutCpf} onChange={e=>setCheckoutCpf(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium" />
            </div>
          </div>
        )}

        <button onClick={() => processOrder(finalTotal, paymentMethod, walletDiscount)} disabled={isProcessingPayment} className="w-full bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-800 transition-all text-lg flex items-center justify-center hover:-translate-y-1">
          {isProcessingPayment ? <Loader2 className="animate-spin w-6 h-6"/> : (finalTotal <= 0 ? 'Concluir Pedido (Usar Saldo)' : 'Gerar Pagamento Seguro')}
        </button>
      </div>
    );
  };

  const renderGatewayPix = () => (
    <div className="p-4 max-w-sm mx-auto pt-16 pb-24 text-center font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Pague via PIX</h2>
        <p className="text-sm font-medium text-gray-500 mb-8">Copie o código abaixo e pague no app do seu banco. A aprovação é na hora!</p>
        
        <div className="w-56 h-56 bg-gray-50 rounded-3xl mx-auto mb-8 flex items-center justify-center border-2 border-dashed border-emerald-200 relative shadow-inner">
           <QrCode className="w-20 h-20 text-emerald-300 opacity-50"/>
           <span className="absolute bottom-4 text-[10px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">QR Code Gerado</span>
        </div>

        <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 mb-8 flex items-center justify-between group hover:border-emerald-300 transition-colors">
            <p className="font-mono text-sm truncate text-slate-600 flex-1 text-left font-bold">00020126580014br.gov.bcb...</p>
            <button className="text-emerald-700 font-black text-xs bg-emerald-100 px-4 py-2.5 rounded-xl ml-3 flex items-center group-hover:bg-emerald-200 transition-colors shrink-0"><Copy className="w-4 h-4 mr-2"/> Copiar</button>
        </div>

        <button onClick={simulateMercadoPagoApproval} className="w-full bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-emerald-800 transition-all hover:-translate-y-1">Simular Pagamento Aprovado</button>
      </div>
    </div>
  );

  const renderMyOrders = () => {
    const myOrders = orders.filter(o => o.customer === user?.name && o.email === user?.email);
    return (
      <div className="p-4 max-w-3xl mx-auto pt-8 pb-24 font-sans">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">As Minhas Encomendas</h2>
        </div>
        
        {(user?.walletBalance > 0) && (
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md relative overflow-hidden">
            <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 shrink-0"><Wallet className="w-8 h-8 text-emerald-600"/></div>
              <div>
                <h3 className="font-black text-emerald-900 text-xl mb-1">Crédito Disponível: R$ {user.walletBalance.toFixed(2)}</h3>
                <p className="text-sm font-medium text-emerald-800 leading-snug">Um item faltou na sua última compra. Este valor já está garantido para abater na sua próxima cesta!</p>
              </div>
            </div>
            <button onClick={() => setPixRefundModal({ open: true, key: user.cpf || user.whatsapp || '' })} className="bg-white text-emerald-800 border-2 border-emerald-200 px-6 py-3.5 rounded-2xl font-black hover:bg-emerald-100 shadow-sm whitespace-nowrap w-full sm:w-auto transition-colors">Prefere receber via PIX?</button>
          </div>
        )}

        <div className="space-y-6">
          {myOrders.slice().reverse().map((order) => (
            <div key={order.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'aguardando_pagamento' ? 'bg-orange-400' : 'bg-emerald-500'}`}></div>
              <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-6">
                <div>
                  <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-1.5">{order.date ? new Date(order.date).toLocaleDateString() : 'N/D'}</p>
                  <p className="font-black text-slate-800 text-2xl">Pedido <span className="text-emerald-700">#{order.id.slice(0, 5)}</span></p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm uppercase tracking-wider flex items-center ${order.status === 'aguardando_pagamento' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                   {order.status === 'pago' ? <><CheckCircle className="w-3 h-3 mr-1.5"/> Confirmado</> : 'Aguardando PIX'}
                </span>
              </div>

              {order.faltas && order.faltas.length > 0 && (
                 <div className="bg-orange-50 p-4 rounded-2xl text-sm font-medium text-orange-800 mb-6 border border-orange-200 flex items-start shadow-inner">
                    <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0 text-orange-600"/>
                    <div>
                       <p className="font-black text-orange-900 mb-1">Atenção ao seu pedido</p>
                       <p>Um item faltou. Entraremos em contacto para realizar o estorno de R$ {order.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)}.</p>
                    </div>
                 </div>
              )}

              <div className="space-y-4 mb-8">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center text-base text-slate-700 font-medium">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-800 font-black text-xs rounded-lg flex items-center justify-center mr-4 border border-emerald-100 shrink-0">{item.qtd}x</span>
                    {item.name}
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex justify-between items-center">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total a Pagar</span>
                <div className="text-right">
                   <span className="font-black text-3xl text-emerald-800">R$ {(order.total || 0).toFixed(2)}</span>
                   <span className="block text-[10px] font-bold text-gray-400 uppercase mt-1 bg-white px-2 py-0.5 rounded border border-gray-200 inline-block">{order.method}</span>
                </div>
              </div>
            </div>
          ))}
          {myOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
               <Package className="w-16 h-16 mx-auto text-gray-200 mb-4"/>
               <p className="text-gray-500 font-medium text-lg">Ainda não tem encomendas.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRepDashboard = () => {
    const viewingPolo = user?.role === 'consolidador' ? (adminTab === 'logistica_polo_view' || user?.polo || polos[0]) : user?.polo;
    const repOrders = orders.filter(o => o.polo === viewingPolo && o.status === 'pago' && o.date);
    
    const ordersByMonth = repOrders.reduce((acc, order) => {
      const d = new Date(order.date);
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const capMonth = `${months[d.getMonth()]} ${d.getFullYear()}`;
      const sortKey = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!acc[capMonth]) acc[capMonth] = { orders: [], total: 0, count: 0, sortKey };
      acc[capMonth].orders.push(order);
      acc[capMonth].total += (order.total || 0);
      acc[capMonth].count += 1;
      return acc;
    }, {});

    return (
      <div className="p-4 max-w-5xl mx-auto pt-8 pb-24 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Logística do Polo</h2>
             <p className="text-sm font-black text-emerald-700 bg-emerald-50 inline-block px-4 py-1.5 rounded-full mt-3 border border-emerald-100 flex items-center"><MapPin className="w-4 h-4 mr-2"/> Unidade: {viewingPolo}</p>
           </div>
           
           {user?.role === 'consolidador' && (
             <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Modo Espião (Admin)</p>
                 <select onChange={e => {setAdminTab(e.target.value); setUser({...user, polo: e.target.value});}} className="w-full bg-white border border-gray-300 text-slate-800 font-bold px-4 py-2.5 rounded-xl outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-emerald-500 transition-all">
                    {polos.map(p => <option key={p} value={p}>Ver Polo: {p}</option>)}
                 </select>
             </div>
           )}
        </div>

        <div className="space-y-6">
           {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => (
             <div key={month} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                   <div>
                     <h3 className="font-black text-slate-800 text-2xl capitalize">{month}</h3>
                     <p className="text-sm font-bold text-gray-500 mt-2 flex items-center"><Package className="w-4 h-4 mr-2"/> {data.count} pedidos a entregar</p>
                   </div>
                   <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento do Polo</p>
                      <p className="text-2xl font-black text-emerald-800">R$ {data.total.toFixed(2)}</p>
                   </div>
                </div>
                <div className="p-4 md:p-6 space-y-4 bg-slate-50/30">
                   {data.orders.slice().reverse().map(o => {
                     const temFalta = o.faltas && o.faltas.length > 0;
                     return (
                       <div key={o.id} className={`p-6 bg-white border rounded-2xl shadow-sm flex flex-col md:flex-row justify-between gap-6 items-start md:items-center transition-all ${temFalta ? 'border-orange-200' : 'border-gray-100 hover:border-emerald-200'}`}>
                         <div className="flex-1 w-full">
                           <div className="flex justify-between items-start mb-3">
                              <p className="font-black text-slate-800 text-xl">{o.customer}</p>
                              {temFalta && <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-orange-200 shadow-sm shrink-0">Faltas Reportadas</span>}
                           </div>
                           <p className="text-xs font-bold text-gray-500 mb-4 flex items-center bg-gray-50 inline-block px-3 py-1 rounded-lg border border-gray-200">
                              <span className="text-emerald-700 mr-2">#{o.id.slice(0,5)}</span> • <Clock className="w-3 h-3 mx-2"/> {new Date(o.date).toLocaleDateString()}
                           </p>
                           <div className="flex flex-wrap gap-2">
                             {(o.items || []).map((i, idx) => {
                               const isFalta = o.faltas?.find(f=>f.productId===i.id);
                               return (
                                 <span key={idx} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center shadow-sm ${isFalta ? 'bg-red-50 text-red-700 border-red-200 line-through opacity-70' : 'bg-white text-slate-700 border-gray-200'}`}>
                                   <span className="font-black mr-1.5">{i.qtd}x</span> {i.name.split(' ')[0]}
                                 </span>
                               )
                             })}
                           </div>
                         </div>
                         <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                            <div className="text-left md:text-right mb-2">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                               <p className="font-black text-slate-800 text-2xl">R$ {o.total.toFixed(2)}</p>
                            </div>
                            <button onClick={() => {
                                let text = `Olá ${o.customer}! Aqui é do Clube de Compras. A sua caixa já está pronta para retirada no polo de ${o.polo}. O total do pedido #${o.id.slice(0,5)} é de R$ ${o.total.toFixed(2)}.`;
                                if(temFalta) text += `\n\nAviso: O fornecedor não nos entregou alguns itens. Adicionamos o crédito de R$ ${o.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)} na sua carteira no aplicativo para abater na próxima compra (ou solicitar PIX).`;
                                openWhatsApp(o.whatsapp, text);
                            }} className="bg-emerald-100 text-emerald-800 px-6 py-3 rounded-xl font-black text-sm flex items-center hover:bg-emerald-200 transition-colors w-full md:w-auto justify-center shadow-sm">
                              <MessageCircle className="w-4 h-4 mr-2"/> Enviar Aviso
                            </button>
                         </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           ))}
           {Object.keys(ordersByMonth).length === 0 && (
             <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
                <Truck className="w-16 h-16 mx-auto text-gray-200 mb-4"/>
                <p className="text-gray-500 font-medium text-lg">Nenhuma caixa para entregar nesta unidade ainda.</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl font-black text-white text-sm flex items-center animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          <CheckCircle className="w-5 h-5 mr-3" /> {toast.msg}
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-8 h-8"/></div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Tem a certeza?</h3>
            <p className="text-sm font-medium text-gray-500 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({open:false,action:null,message:''})} className="flex-1 bg-gray-100 text-slate-700 font-black py-4 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={() => { confirmDialog.action(); setConfirmDialog({open:false,action:null,message:''}); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-red-700 transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {pixRefundModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-gray-100">
             <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-6">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0"><Landmark className="w-6 h-6 text-emerald-600"/></div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 leading-tight">Reembolso via PIX</h3>
                   <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-widest">Valor a receber: R$ {user?.walletBalance.toFixed(2)}</p>
                </div>
             </div>
             <p className="text-sm text-gray-500 font-medium mb-6">Por favor, informe a chave PIX (CPF, Telemóvel ou E-mail) para onde devemos enviar o valor.</p>
             <input autoFocus value={pixRefundModal.key} onChange={e=>setPixRefundModal({...pixRefundModal,key:e.target.value})} placeholder="Escreva a sua chave PIX aqui..." className="w-full bg-slate-50 border-2 border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-black text-slate-800 mb-8 transition-colors" />
             <div className="flex gap-3">
               <button onClick={() => setPixRefundModal({open:false, key:''})} className="flex-1 bg-gray-100 text-slate-600 font-black py-4 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
               <button onClick={async () => {
                  if(pixRefundModal.key.length < 5) return showToast('Chave PIX muito curta ou inválida', 'error');
                  await updateDoc(doc(db,"users",user.uid), { pendingPixRefund: user.walletBalance, walletBalance: 0, pixKey: pixRefundModal.key });
                  setUser({...user, pendingPixRefund: user.walletBalance, walletBalance: 0});
                  setPixRefundModal({open:false, key:''}); showToast('Reembolso Solicitado com Sucesso!');
               }} className="flex-1 bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-800 transition-colors">Confirmar Pedido</button>
             </div>
          </div>
        </div>
      )}

      {faltaGlobalModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
             <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-4">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">Falta Global</h3>
                   <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">Ação de Risco</p>
                </div>
                <button onClick={() => {setFaltaGlobalModal(false); setShortagePreview(null);}} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><X className="w-5 h-5"/></button>
             </div>
             
             {!shortagePreview ? (
               <div className="space-y-6">
                 <p className="text-sm font-medium text-gray-600 leading-relaxed">Selecione na lista abaixo o produto que o fornecedor não entregou. O sistema irá localizar automaticamente todos os pedidos e devolver o dinheiro em formato de crédito na carteira dos clientes afetados.</p>
                 <div className="bg-slate-50 p-2 rounded-2xl border border-gray-200">
                   <select value={shortageSelectedProduct} onChange={e=>setShortageSelectedProduct(e.target.value)} className="w-full bg-transparent p-3 font-black text-slate-800 outline-none cursor-pointer">
                      <option value="">-- Selecione o Produto que Faltou --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                   </select>
                 </div>
                 <button onClick={analyzeFaltaGlobal} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all shadow-lg flex items-center justify-center"><Search className="w-5 h-5 mr-2"/> Analisar Impacto Financeiro</button>
               </div>
             ) : (
               <div className="animate-in slide-in-from-bottom-4 duration-300">
                 <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl mb-8 shadow-inner">
                    <h4 className="font-black text-orange-900 mb-4 text-lg">Resumo da Ação</h4>
                    <p className="text-sm font-medium text-orange-800 mb-4">O produto <strong className="font-black bg-white px-2 py-0.5 rounded border border-orange-100">{shortagePreview.product?.name}</strong> está presente em <strong className="font-black text-lg">{shortagePreview.impact.length}</strong> pedidos pagos.</p>
                    
                    <div className="bg-white p-3 rounded-xl border border-orange-100 max-h-32 overflow-y-auto mb-4 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Clientes Afetados:</p>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {shortagePreview.impact.map(i => i.customer).join(', ')}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center border-t border-orange-200 pt-4 mt-2">
                       <span className="font-black text-orange-800 uppercase text-xs tracking-widest">Total a Estornar:</span>
                       <span className="font-black text-2xl text-orange-600">R$ {shortagePreview.totalRefund.toFixed(2)}</span>
                    </div>
                 </div>
                 <button onClick={confirmFaltaGlobal} className="w-full bg-red-600 text-white font-black py-4.5 rounded-xl shadow-lg hover:bg-red-700 transition-all hover:-translate-y-1 flex items-center justify-center text-lg"><AlertOctagon className="w-5 h-5 mr-2"/> CONFIRMAR E GERAR CRÉDITOS</button>
               </div>
             )}
          </div>
        </div>
      )}

      {isPrintMode ? renderDispatchPDF() : (
        <>
          {currentScreen !== 'login' && currentScreen !== 'dashboard_admin' && (
            <header className="bg-emerald-800 h-20 flex items-center justify-between px-4 md:px-8 shadow-md sticky top-0 z-[60]">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner"><Leaf className="w-7 h-7 text-emerald-700"/></div>
                 <span className="font-black text-white text-2xl hidden sm:block tracking-tight">Clube de Compras</span>
               </div>
               <div className="flex items-center gap-5">
                 {user?.role === 'consolidador' && (
                    <div className="hidden md:flex items-center gap-2">
                       <button onClick={() => setCurrentScreen('dashboard_admin')} className="text-xs font-black text-emerald-900 bg-emerald-100 px-4 py-2 rounded-lg hover:bg-white transition-colors uppercase tracking-widest shadow-sm">Voltar para Gestão</button>
                    </div>
                 )}
                 <div className="text-right">
                   <p className="text-base font-black text-white leading-tight">{user?.name}</p>
                   <p className="text-xs font-bold text-emerald-200 capitalize">{user?.role} • {user?.polo}</p>
                 </div>
                 <button onClick={() => {signOut(auth); setCart([]);}} className="w-12 h-12 bg-emerald-900 rounded-2xl flex items-center justify-center hover:bg-emerald-950 transition-colors shadow-inner border border-emerald-700/50"><LogOut className="w-5 h-5 text-emerald-100"/></button>
               </div>
            </header>
          )}

          <main className="pb-16 md:pb-0">
             {currentScreen === 'login' && (
               <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
                 <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                 <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                 <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 relative z-10 backdrop-blur-xl">
                   <div className="flex justify-center mb-8">
                     <div className="w-20 h-20 bg-emerald-700 rounded-[1.5rem] flex items-center justify-center shadow-xl rotate-3 hover:rotate-0 transition-transform"><Leaf className="w-10 h-10 text-white" /></div>
                   </div>
                   <h2 className="text-4xl font-black text-center text-slate-800 tracking-tight mb-2">Bem-vindo</h2>
                   <p className="text-center text-gray-500 font-bold mb-10">Clube de Compras Saudáveis.</p>
                   
                   <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                     <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Entrar</button>
                     <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Nova Conta</button>
                   </div>

                   <form onSubmit={handleAuth} className="space-y-4">
                     {authMode === 'register' && (
                       <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                         <input type="text" placeholder="Nome Completo" value={loginName} onChange={e=>setLoginName(e.target.value)} required className="w-full bg-slate-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-colors font-bold text-slate-800" />
                         <input type="tel" placeholder="WhatsApp (Apenas números)" value={loginWhatsapp} onChange={e=>setLoginWhatsapp(e.target.value)} required className="w-full bg-slate-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-colors font-bold text-slate-800" />
                         <div className="bg-slate-50 border-2 border-gray-100 rounded-2xl p-1 focus-within:border-emerald-500 transition-colors">
                           <select value={selectedPolo} onChange={e=>setSelectedPolo(e.target.value)} className="w-full bg-transparent p-3 outline-none font-bold text-slate-800 cursor-pointer">
                             {polos.map(p => <option key={p} value={p}>Polo: {p}</option>)}
                           </select>
                         </div>
                         <div className="bg-slate-50 border-2 border-gray-100 rounded-2xl p-1 focus-within:border-emerald-500 transition-colors">
                           <select value={registerRole} onChange={e=>setRegisterRole(e.target.value)} className="w-full bg-transparent p-3 outline-none font-black text-emerald-700 cursor-pointer">
                             <option value="cliente">Sou Cliente Padrão</option>
                             <option value="representante">Sou Representante (Logística)</option>
                             <option value="consolidador">Sou Gestor Master (Admin)</option>
                           </select>
                         </div>
                         {['consolidador', 'representante'].includes(registerRole) && (
                           <div className="animate-in fade-in duration-300">
                             <input type="password" placeholder="Código Secreto de Autorização" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required className="w-full bg-red-50 border-2 border-red-200 p-4 rounded-2xl outline-none focus:border-red-500 focus:bg-white transition-colors font-black text-red-800 placeholder-red-300" />
                             <p className="text-[10px] font-bold text-red-500 mt-2 ml-2">Acesso restrito para funcionários.</p>
                           </div>
                         )}
                       </div>
                     )}
                     <input type="email" placeholder="Seu E-mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required className="w-full bg-slate-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-colors font-bold text-slate-800" />
                     <input type="password" placeholder="Sua Senha" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required className="w-full bg-slate-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-colors font-bold text-slate-800" />
                     
                     <button type="submit" disabled={authLoading} className="w-full bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-800 transition-all text-lg flex items-center justify-center mt-6 hover:-translate-y-1">
                       {authLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (authMode === 'login' ? 'Entrar no Clube' : 'Criar Minha Conta')}
                     </button>
                   </form>
                 </div>
               </div>
             )}
             {currentScreen === 'shop' && renderShop()}
             {currentScreen === 'checkout' && renderCheckout()}
             {currentScreen === 'gateway_pix' && renderGatewayPix()}
             {currentScreen === 'my_orders' && renderMyOrders()}
             {currentScreen === 'dashboard_rep' && renderRepDashboard()}
             {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
             
             {currentScreen === 'success' && (
               <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4 bg-slate-50">
                  <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-8 shadow-inner animate-in zoom-in duration-500"><CheckCircle className="w-16 h-16 text-emerald-600"/></div>
                  <h2 className="text-5xl font-black text-slate-800 tracking-tight mb-4">Sucesso!</h2>
                  <p className="text-gray-500 font-bold mb-10 max-w-sm text-lg">A sua compra foi confirmada. Acompanhe a chegada dos produtos na aba de encomendas.</p>
                  <button onClick={()=>setCurrentScreen('my_orders')} className="bg-emerald-700 text-white px-12 py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-800 transition-all text-lg hover:-translate-y-1">Acompanhar Encomenda</button>
               </div>
             )}
          </main>

          <BottomNav />
        </>
      )}
    </div>
  );
}