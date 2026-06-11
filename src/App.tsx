import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Leaf, MapPin, CheckCircle, Package, 
  CreditCard, QrCode, Edit2, Trash2, ArrowLeft, ArrowRight, 
  Printer, Upload, ImageIcon, Download, Clock, MessageCircle, 
  LayoutDashboard, Eye, Wallet, Loader2, Home, Search, Menu, X, 
  LineChart, AlertTriangle, LogOut, Truck, ChevronDown, ChevronUp, FileSpreadsheet, Users
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
  const [storeMode, setStoreMode] = useState('mensal'); // Fases da loja: 'mensal', 'estoque', 'pausado'

  const [checkoutCpf, setCheckoutCpf] = useState(''); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  const [toast, setToast] = useState(null);
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' });
  const [faltaGlobalModal, setFaltaGlobalModal] = useState(false);
  const [shortageSelectedProduct, setShortageSelectedProduct] = useState('');
  const [shortagePreview, setShortagePreview] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  // --- CHAVE DA FASE 1 (BETA) ---
  const CONFIG_APENAS_COLETA = true; // Mude para false no futuro para ativar o Mercado Pago!

  /// --- ESTADOS DO PEDIDO MANUAL (REP) ---
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [manualClientWhatsapp, setManualClientWhatsapp] = useState('');
  const [manualCart, setManualCart] = useState([]); // Agora é um mini-carrinho!
  const [manualItemProduct, setManualItemProduct] = useState('');
  const [manualItemQty, setManualItemQty] = useState(1);
  
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [repManualCustomer, setRepManualCustomer] = useState('');
  const [repManualItems, setRepManualItems] = useState([]);

  const userRoleStr = String(user?.role || '').trim().toLowerCase();
  const isGestor = userRoleStr === 'consolidador';
  const isRep = userRoleStr === 'representante';
  const isAdminOrRep = isGestor || isRep;

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
    if (currentScreen !== 'login' && !isPrintMode) {
      const fetchData = async () => {
        try {
          const [pSnap, oSnap, uSnap, configSnap] = await Promise.all([
            getDocs(collection(db, "products")),
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "users")),
            getDoc(doc(db, "settings", "global"))
          ]);
          setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setAllUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          if(configSnap.exists() && configSnap.data().storeMode) {
             setStoreMode(configSnap.data().storeMode);
          }
        } catch (e) { console.error("Erro ao ler DB", e); }
      };
      fetchData();
    }
  }, [currentScreen, toast, isPrintMode]);

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
        // FASE 1: Já nasce confirmado se for apenas coleta
        status: CONFIG_APENAS_COLETA ? 'confirmado' : (finalTotal <= 0 ? 'pago' : 'aguardando_pagamento'), 
        status_nfe: 'pendente',
        walletDiscountApplied: walletDiscount, 
        date: new Date().toISOString(), 
        items: cart.map(i => ({ id: i.id, name: i.name, qtd: i.qtd, price: getActivePrice(i) })),
        faltas: []
      };

      const orderRef = await addDoc(collection(db, "orders"), newOrder);
      
      // Se usou saldo total (cobriu 100% do pedido)
      if (finalTotal <= 0) {
        await updateDoc(doc(db,"users", user.uid), { walletBalance: Math.max(0, (user.walletBalance || 0) - walletDiscount) });
        setUser(prev => ({...prev, walletBalance: Math.max(0, (prev.walletBalance || 0) - walletDiscount)})); // Atualiza a tela na hora!
        setCart([]); setIsProcessingPayment(false); setCurrentScreen('success');
        return;
      }
      
      // FASE 1: Se for apenas coleta, finaliza direto!
      if (CONFIG_APENAS_COLETA) {
          // CORREÇÃO: Desconta o saldo da carteira mesmo se o pagamento for parcial!
          if (walletDiscount > 0) {
              await updateDoc(doc(db,"users", user.uid), { walletBalance: Math.max(0, (user.walletBalance || 0) - walletDiscount) });
              setUser(prev => ({...prev, walletBalance: Math.max(0, (prev.walletBalance || 0) - walletDiscount)})); // Atualiza a tela na hora!
          }

          setCart([]); 
          setIsProcessingPayment(false); 
          setCurrentScreen('success');
          showToast('O pagamento será feito na retirada!', 'success');
          return;
      }

      // FASE 2 (Futuro): Vai para a tela do PIX
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

  const requestPixRefund = async () => {
     if(pixRefundModal.key.length < 5) return showToast('Chave PIX inválida', 'error');
     await updateDoc(doc(db,"users",user.uid), { pendingPixRefund: user.walletBalance, walletBalance: 0, pixKey: pixRefundModal.key });
     setUser({...user, pendingPixRefund: user.walletBalance, walletBalance: 0});
     setPixRefundModal({open:false, key:''}); 
     showToast('Reembolso Solicitado!');
  };

  const analyzeFaltaGlobal = () => {
    if (!shortageSelectedProduct) return showToast('Selecione um produto.', 'error');
        // CORREÇÃO: Procura o item nos pedidos com qualquer status válido da Fase Beta!
    const ordersToUpdate = orders.filter(o => 
       ['confirmado', 'pago_polo', 'pago'].includes(o.status) && 
       (o.items || []).some(i => String(i.id) === String(shortageSelectedProduct))
    );
    if (ordersToUpdate.length === 0) return showToast('Nenhum pedido deste ciclo contém este item.', 'error');
    
    const impact = ordersToUpdate.map(order => {
       const item = order.items.find(i => String(i.id) === String(shortageSelectedProduct));
       const quantidade = item.qtd || item.qty || 1;
       return { orderId: order.id, customer: order.customer, userEmail: order.email, refundValue: (item.price || 0) * quantidade, itemData: item };
    });
    
    setShortagePreview({ 
      product: products.find(p => String(p.id) === String(shortageSelectedProduct)), 
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
           
           let orderUpdates = { faltas: faltasAtualizadas };

           if (CONFIG_APENAS_COLETA) {
            // FASE 1: Mantém o item na tela (para ficar riscado), mas zera ele na matemática da conta final!
            const novoTotal = orderData.items.reduce((s, i) => {
                // Se o item estiver na lista de faltas, ignoramos o valor dele na soma
                const isFaltante = faltasAtualizadas.some(f => f.productId === i.id);
                if (isFaltante) return s; 
                
                const quantidade = i.qtd || i.qty || 1;
                return s + ((i.price || 0) * quantidade);
            }, 0);
            
            // Repare que NÃO estamos mais alterando o orderUpdates.items!
            orderUpdates.total = novoTotal;
        }

           await updateDoc(orderRef, orderUpdates);

           if (!CONFIG_APENAS_COLETA) {
               // FASE 2 (Futuro): Deposita o crédito na carteira do cliente.
               const userQuery = query(collection(db, "users"), where("email", "==", imp.userEmail));
               const uSnap = await getDocs(userQuery);
               if (!uSnap.empty) {
                 const uDoc = uSnap.docs[0];
                 await updateDoc(doc(db, "users", uDoc.id), { walletBalance: (uDoc.data().walletBalance || 0) + imp.refundValue });
               }
           }
        }
      }
      showToast(`Ajuste aplicado para ${shortagePreview.impact.length} pedidos!`);
      setFaltaGlobalModal(false); setShortagePreview(null); setShortageSelectedProduct('');
      
      const oSnap = await getDocs(collection(db, "orders"));
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { showToast('Erro ao processar', 'error'); }
  };

  const exportSupplierCSV = () => {
    // Puxa o status correto e filtra apenas os pedidos dos últimos 30 dias!
    const validOrders = orders.filter(o => 
      o.status === (CONFIG_APENAS_COLETA ? 'confirmado' : 'pago') && 
      new Date(o.date).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
   );
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

  const handleCSVUpload = (e) => {
     if(e.target.files[0]) {
       const reader = new FileReader();
       reader.onload = async (event) => {
          const text = event.target.result;
          const rows = text.split('\n');
          for(let i=1; i<rows.length; i++){
             const cols = rows[i].split(';'); 
             if(cols.length >= 4) {
                const sku = cols[0]?.trim();
                const name = cols[1]?.trim();
                const cat = cols[2]?.trim();
                const priceStr = cols[3]?.trim().replace('R$', '').replace(',', '.');
                const price = parseFloat(priceStr);
                if(sku && name && !isNaN(price)){
                   const existing = products.find(p => p.sku === sku);
                   if (existing) {
                       await updateDoc(doc(db,"products", existing.id), { price, name, category: cat || 'Geral' });
                   } else {
                       await addDoc(collection(db,"products"), {sku, name, category: cat||'Geral', price, minBox: 1, stock: 0, image: '📦'});
                   }
                }
             }
          }
          showToast(`Tabela processada com sucesso!`);
          setCurrentScreen('dashboard_admin'); 
       };
       reader.readAsText(e.target.files[0]);
    }
  };

  const toggleStoreMode = async (mode) => {
     try {
        await setDoc(doc(db, "settings", "global"), { storeMode: mode }, { merge: true });
        setStoreMode(mode);
        showToast(`Status da loja atualizado!`);
     } catch(e) {
        showToast('Erro ao mudar o status', 'error');
     }
  };

  const handleAddToCart = (p) => {
    if (storeMode === 'pausado') return showToast('A loja encontra-se em balanço e fechada para novas compras.', 'error');
    const existing = cart.find(i => i.id === p.id);
    const currentQtd = existing ? existing.qtd : 0;
    if (storeMode === 'estoque' && currentQtd >= (p.stock || 0)) {
        return showToast(`Limite atingido! Temos apenas ${p.stock || 0} unidade(s) em estoque.`, 'error');
    }
    
    if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
    else setCart([...cart, { ...p, qtd: 1 }]);
    // Removido o showToast daqui para o cliente poder clicar no [+] rápido sem travar a tela
 };

 const handleDecreaseFromCart = (productId) => {
    const existing = cart.find(i => i.id === productId);
    if (!existing) return;
    if (existing.qtd === 1) {
       setCart(cart.filter(i => i.id !== productId));
    } else {
       setCart(cart.map(i => i.id === productId ? { ...i, qtd: i.qtd - 1 } : i));
    }
 };

  // --- RENDERS ---

  const renderShop = () => {
    const filteredProducts = products.filter(p => (shopCategory === 'Todos' || p.category === shopCategory) && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const promoProducts = products.filter(p => Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price));

    return (
      <div className="pb-24 px-4 max-w-5xl mx-auto font-sans">
        
        <div className="flex items-center justify-between py-4 mb-4">
           <div className="flex items-center text-xs font-bold text-emerald-800 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
             <MapPin className="w-4 h-4 mr-1.5 text-emerald-600" /> Polo de Retirada: <span className="ml-1 text-emerald-950 font-black">{user?.polo || polos[0]}</span>
           </div>
           
           {user?.walletBalance > 0 && (
             <div className="flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
               <Wallet className="w-4 h-4 mr-1.5" /> Crédito Disponível: <span className="ml-1 text-emerald-950 font-black">R$ {user.walletBalance.toFixed(2)}</span>
             </div>
           )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {activeCategories.map(cat => (
             <button key={cat} onClick={() => setShopCategory(cat)} className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-sm border transition-colors ${shopCategory === cat ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {cat}
             </button>
          ))}
        </div>

        {/* Banners Inteligentes das Fases da Loja */}
        {storeMode === 'estoque' && (
           <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6 shadow-sm flex items-start gap-3">
              <Package className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                 <h4 className="font-black text-orange-900 text-sm mb-0.5">Modo Pronta Entrega</h4>
                 <p className="text-xs text-orange-800 font-medium leading-snug">As encomendas do mês encerraram, mas aproveite a nossa Pronta Entrega! Mostrando apenas itens disponíveis no nosso estoque local.</p>
              </div>
           </div>
        )}
        {storeMode === 'pausado' && (
           <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 shadow-sm flex items-start gap-3">
              <Clock className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                 <h4 className="font-black text-red-900 text-sm mb-0.5">Loja em Balanço / Vitrine</h4>
                 <p className="text-xs text-red-800 font-medium leading-snug">O nosso próximo ciclo abre no dia 05. Prepare a sua lista e aproveite para verificar os seus créditos na aba Meus Pedidos!</p>
              </div>
           </div>
        )}

        {promoProducts.length > 0 && !searchTerm && shopCategory === 'Todos' && (
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Seleção da Semana</h3>
               <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">{promoProducts.length} itens</span>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {promoProducts.map(p => {
                const discount = Math.round((1 - (p.promotionalPrice / p.price)) * 100);
                const isOutOfStock = storeMode === 'estoque' && (p.stock || 0) <= 0;
                const isPaused = storeMode === 'pausado';
                const cartItem = cart.find(i => i.id === p.id); // Lógica nova
                
                return (
                  <div key={`promo-${p.id}`} className={`snap-start shrink-0 w-48 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group ${(isOutOfStock && !cartItem) ? 'opacity-70 grayscale-[50%]' : ''}`}>
                    <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-br-lg z-10">{discount}% OFF</span>
                    <div className="h-40 bg-gray-50 flex items-center justify-center p-4 relative">
                       {p.category && <span className="absolute top-2 right-2 text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded tracking-widest">{p.category}</span>}
                       {p.image?.length > 50 ? <img src={p.image} className="h-full w-full object-cover rounded-lg" alt=""/> : <span className="text-5xl">{p.image || '📦'}</span>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow text-center">
                      <h3 className="text-sm font-black text-slate-800 leading-tight mb-2 line-clamp-2">{p.name}</h3>
                      <p className="text-[10px] text-gray-400 line-through mb-0.5 font-bold">R$ {p.price.toFixed(2)}</p>
                      <p className="text-2xl text-slate-800 font-black leading-none mb-4">R$ {p.promotionalPrice.toFixed(2)}</p>
                      
                      {isPaused ? (
                          <button disabled className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-black text-xs cursor-not-allowed mt-auto">Pausado</button>
                      ) : (isOutOfStock && !cartItem) ? (
                          <button disabled className="w-full bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-lg font-black text-xs cursor-not-allowed mt-auto">Esgotado</button>
                      ) : cartItem ? (
                          <div className="flex items-center justify-between bg-emerald-100 border border-emerald-300 rounded-lg overflow-hidden mt-auto">
                             <button onClick={() => handleDecreaseFromCart(p.id)} className="w-10 h-10 flex items-center justify-center text-emerald-800 hover:bg-emerald-200 transition-colors font-black text-lg">-</button>
                             <span className="font-black text-emerald-900 text-sm">{cartItem.qtd}</span>
                             <button onClick={() => handleAddToCart(p)} className="w-10 h-10 flex items-center justify-center text-emerald-800 hover:bg-emerald-200 transition-colors font-black text-lg">+</button>
                          </div>
                      ) : (
                          <button onClick={() => handleAddToCart(p)} className="w-full bg-emerald-100 text-emerald-800 py-2.5 rounded-lg font-black text-xs hover:bg-emerald-200 transition-colors mt-auto">Adicionar</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
        {filteredProducts.map(p => {
            const isPromo = Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price);
            const activePrice = isPromo ? p.promotionalPrice : p.price;
            const isOutOfStock = storeMode === 'estoque' && (p.stock || 0) <= 0;
            const isPaused = storeMode === 'pausado';
            const cartItem = cart.find(i => i.id === p.id); // Lógica nova
            
            return (
              <div key={p.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden ${(isOutOfStock && !cartItem) ? 'opacity-70 grayscale-[50%]' : ''}`}>
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 relative">
                  {isPromo && <span className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-br-lg z-10">{Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF</span>}
                  {p.image?.length > 50 ? <img src={p.image} className="h-full w-full object-cover rounded-lg" alt=""/> : <span className="text-4xl">{p.image || '📦'}</span>}
                </div>
                <div className="p-4 flex flex-col flex-grow text-center">
                  <h3 className="text-xs text-slate-600 font-bold leading-snug mb-3 flex-grow line-clamp-2">{p.name}</h3>
                  {isPromo ? (
                    <div className="mb-3">
                       <span className="text-[10px] text-gray-400 line-through mr-1 font-bold">R$ {p.price.toFixed(2)}</span>
                       <span className="text-lg text-slate-800 font-black">R$ {activePrice.toFixed(2)}</span>
                    </div>
                  ) : (
                    <p className="text-lg text-slate-800 font-black mb-3">R$ {activePrice.toFixed(2)}</p>
                  )}
                  
                  {isPaused ? (
                      <button disabled className="w-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-black text-xs cursor-not-allowed mt-auto">Pausado</button>
                  ) : (isOutOfStock && !cartItem) ? (
                      <button disabled className="w-full bg-red-50 text-red-600 border border-red-100 py-2.5 rounded-lg font-black text-xs cursor-not-allowed mt-auto">Esgotado</button>
                  ) : cartItem ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden mt-auto">
                         <button onClick={() => handleDecreaseFromCart(p.id)} className="w-10 h-10 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors font-black text-lg">-</button>
                         <span className="font-black text-emerald-900 text-sm">{cartItem.qtd}</span>
                         <button onClick={() => handleAddToCart(p)} className="w-10 h-10 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors font-black text-lg">+</button>
                      </div>
                  ) : (
                      <button onClick={() => handleAddToCart(p)} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 py-2.5 rounded-lg font-black text-xs hover:bg-emerald-100 transition-colors mt-auto">Adicionar</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {cart.length > 0 && storeMode !== 'pausado' && (
           <div className="fixed bottom-16 left-0 w-full bg-white border-t border-gray-200 p-3 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:bottom-0">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cart.reduce((s,i)=>s+i.qtd,0)} itens na cesta</p>
                    <p className="text-2xl font-black text-emerald-800 leading-none mt-1">R$ {cartTotal.toFixed(2)}</p>
                 </div>
                 <button onClick={() => setCurrentScreen('checkout')} className="bg-emerald-700 text-white px-5 sm:px-6 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-800 transition flex items-center text-sm">
                    {CONFIG_APENAS_COLETA ? 'Revisar Pedido' : 'Ir para Pagamento'} <ArrowRight className="w-4 h-4 ml-2"/>
                 </button>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderCheckout = () => {
    // Na Fase 1, não há taxa de cartão, pois o pagamento é físico
    const hasFee = paymentMethod === 'credit' && !CONFIG_APENAS_COLETA;
    const feeAmount = hasFee ? cartTotal * 0.05 : 0;
    const subTotalWithFee = cartTotal + feeAmount;
    const walletDiscount = (user?.walletBalance || 0) > 0 ? Math.min(user.walletBalance, subTotalWithFee) : 0;
    const finalTotal = subTotalWithFee - walletDiscount;

    return (
      <div className="p-4 max-w-xl mx-auto pb-24 pt-6 font-sans">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Finalizar Compra</h2>
          <button onClick={() => setCurrentScreen('shop')} className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm hover:bg-emerald-100"><Edit2 className="w-3 h-3 mr-1.5" /> Editar Cesta</button>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="space-y-3 mb-5">
          {cart.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm border-b border-gray-50 pb-4 last:border-0 last:pb-0 gap-3">
                <span className="font-bold text-slate-700 flex-1 leading-snug">{item.name}</span>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shrink-0">
                       <button onClick={() => handleDecreaseFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors font-black">-</button>
                       <span className="w-8 text-center font-black text-slate-800 text-xs">{item.qtd}</span>
                       <button onClick={() => handleAddToCart(item)} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors font-black">+</button>
                    </div>
                    <span className="font-black text-slate-800 w-20 text-right shrink-0">R$ {(getActivePrice(item) * item.qtd).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between text-slate-600 text-sm mb-2 font-medium"><span>Subtotal</span><span>R$ {cartTotal.toFixed(2)}</span></div>
            {hasFee && <div className="flex justify-between text-orange-600 text-sm font-bold mb-2"><span>Taxa do Cartão (5%)</span><span>+ R$ {feeAmount.toFixed(2)}</span></div>}
            {walletDiscount > 0 && <div className="flex justify-between text-emerald-600 text-sm font-bold mb-2 bg-emerald-50 p-1.5 rounded-md -mx-1.5 px-1.5"><span>Saldo da Carteira</span><span>- R$ {walletDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-1">
              <span className="font-black text-gray-500 uppercase text-[10px] tracking-widest">Total a Pagar</span>
              <span className="font-black text-2xl text-emerald-800">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* FASE 2: Só exibe opções de PIX/Cartão e CPF se NÃO estiver na Fase Beta */}
        {finalTotal > 0 && !CONFIG_APENAS_COLETA && (
          <div className="mb-6 space-y-5">
            <div>
              <p className="font-black text-xs text-slate-800 uppercase tracking-widest mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${paymentMethod==='pix'?'border-emerald-600 bg-emerald-50 shadow-sm':'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={paymentMethod==='pix'} onChange={()=>setPaymentMethod('pix')}/>
                  <QrCode className={`w-6 h-6 mx-auto mb-2 ${paymentMethod==='pix'?'text-emerald-600':'text-gray-400'}`}/>
                  <p className="font-black text-slate-800 text-sm">PIX</p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-1 bg-emerald-100 px-1.5 py-0.5 rounded inline-block">Sem taxas</p>
                </label>
                <label className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${paymentMethod==='credit'?'border-emerald-600 bg-emerald-50 shadow-sm':'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" className="hidden" checked={paymentMethod==='credit'} onChange={()=>setPaymentMethod('credit')}/>
                  <CreditCard className={`w-6 h-6 mx-auto mb-2 ${paymentMethod==='credit'?'text-emerald-600':'text-gray-400'}`}/>
                  <p className="font-black text-slate-800 text-sm">Cartão</p>
                  <p className="text-[9px] text-orange-500 font-bold mt-1 bg-orange-50 px-1.5 py-0.5 rounded inline-block">+5% de Taxa</p>
                </label>
              </div>
            </div>
            <div>
              <p className="font-black text-xs text-slate-800 uppercase tracking-widest mb-2 flex items-center justify-between">Nota Fiscal Paulista <span className="text-[9px] font-bold text-gray-400 normal-case bg-gray-100 px-1.5 py-0.5 rounded">Opcional</span></p>
              <input type="text" placeholder="CPF (Apenas números)" value={checkoutCpf} onChange={e=>setCheckoutCpf(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium text-sm" />
            </div>
          </div>
        )}

        <button onClick={() => processOrder(finalTotal, paymentMethod, walletDiscount)} disabled={isProcessingPayment} className="w-full bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-800 transition-all text-base flex items-center justify-center">
          {isProcessingPayment ? <Loader2 className="animate-spin w-5 h-5"/> : (CONFIG_APENAS_COLETA ? 'Concluir Pedido (Pagar na Retirada)' : (finalTotal <= 0 ? 'Concluir Pedido (Usar Saldo)' : 'Gerar Pagamento Seguro'))}
        </button>
      </div>
    );
  }
  const renderGatewayPix = () => {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-sm w-full text-center border border-gray-100">
           <QrCode className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
           <h2 className="text-2xl font-black text-slate-800 mb-2">Pague via PIX</h2>
           <p className="text-sm font-medium text-gray-500 mb-6">Abra o app do seu banco e escaneie o código ou copie a chave abaixo.</p>
           
           <div className="w-48 h-48 bg-gray-100 mx-auto rounded-2xl mb-6 flex items-center justify-center border-2 border-dashed border-gray-300">
              <span className="text-xs font-bold text-gray-400">QR CODE AQUI</span>
           </div>

           <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 mb-6 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-600 truncate w-4/5 text-left">00020126580014BR.GOV.BCB.PIX...</span>
              <button className="text-emerald-700 font-black text-xs bg-emerald-100 px-3 py-1.5 rounded-lg">Copiar</button>
           </div>

           <div className="border-t border-gray-100 pt-6 mt-2">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Apenas para Testes</p>
             <button onClick={simulateMercadoPagoApproval} className="w-full bg-emerald-700 text-white font-black py-3 rounded-xl shadow-md hover:bg-emerald-800 text-sm">Simular Pagamento Aprovado</button>
           </div>
        </div>
      </div>
    );
  };

  const renderMyOrders = () => {
    const myOrders = orders.filter(o => o.customer === user?.name && o.email === user?.email);
    return (
      <div className="p-4 max-w-2xl mx-auto pt-6 pb-24 font-sans">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentScreen('shop')} className="flex items-center text-slate-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm hover:bg-gray-50"><ArrowLeft className="w-3 h-3 mr-1.5" /> Loja</button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">As Minhas Encomendas</h2>
        </div>
        
        {(user?.walletBalance > 0) && (
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-100 shrink-0"><Wallet className="w-6 h-6 text-emerald-600"/></div>
              <div>
                <h3 className="font-black text-emerald-900 text-lg mb-0.5">Crédito Disponível: R$ {user.walletBalance.toFixed(2)}</h3>
                <p className="text-xs font-medium text-emerald-800 leading-snug">Um item faltou na última encomenda. Valor garantido para a próxima cesta!</p>
              </div>
            </div>
            <button onClick={() => setPixRefundModal({ open: true, key: user.cpf || user.whatsapp || '' })} className="bg-white text-emerald-800 border-2 border-emerald-200 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-emerald-100 shadow-sm whitespace-nowrap w-full sm:w-auto">Prefere receber via PIX?</button>
          </div>
        )}

        <div className="space-y-4">
          {myOrders.slice().reverse().map((order) => (
            <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'aguardando_pagamento' ? 'bg-orange-400' : 'bg-emerald-500'}`}></div>
              <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                <div>
                  <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">{order.date ? new Date(order.date).toLocaleDateString() : 'N/D'}</p>
                  <p className="font-black text-slate-800 text-lg">Pedido <span className="text-emerald-700">#{order.id.slice(0, 5)}</span></p>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm uppercase tracking-wider flex items-center ${order.status === 'aguardando_pagamento' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                   {order.status === 'pago' ? <><CheckCircle className="w-3 h-3 mr-1"/> Confirmado</> : 'Aguardando Pagamento'}
                </span>
              </div>

              {order.faltas && order.faltas.length > 0 && (
                 <div className="bg-orange-50 p-3 rounded-xl text-xs font-medium text-orange-800 mb-4 border border-orange-200 flex items-start">
                    {CONFIG_APENAS_COLETA ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-orange-600"/>
                            <div>
                                <p className="font-black text-orange-900 mb-0.5">Pedido Atualizado</p>
                                <p>Um item faltou no fornecedor. O valor que você pagará na retirada já foi reduzido em R$ {order.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)}.</p>
                            </div>
                        </>
                    ) : (user?.pendingPixRefund > 0 || user?.walletBalance > 0 ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-orange-600"/>
                            <div>
                                <p className="font-black text-orange-900 mb-0.5">Atenção ao seu pedido</p>
                                <p>Um item faltou. O crédito de R$ {order.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)} já está na sua carteira.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-emerald-600"/>
                            <div className="text-emerald-800">
                                <p className="font-black text-emerald-900 mb-0.5">Estorno Realizado</p>
                                <p>O valor de R$ {order.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)} foi reembolsado via PIX.</p>
                            </div>
                        </>
                    ))}
                 </div>
              )}

              <div className="space-y-3 mb-5">
                {(order.items || []).map((item, idx) => {
                  const isFalta = order.faltas?.find(f => f.productId === item.id);
                  const quantidade = item.qtd || item.qty || 1;
                  
                  return (
                    <div key={idx} className={`flex items-center text-sm font-medium transition-all ${isFalta ? 'text-red-400 line-through opacity-70' : 'text-slate-700'}`}>
                      <span className={`w-6 h-6 font-black text-[10px] rounded flex items-center justify-center mr-3 border shrink-0 ${isFalta ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
                        {quantidade}x
                      </span>
                      {item.name}
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                   {CONFIG_APENAS_COLETA ? 'Total a Pagar' : 'Total Pago'}
                </span>
                <div className="text-right">
                  <span className="font-black text-xl text-emerald-800">R$ {(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
              
            </div>
          ))}
          {myOrders.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
               <Package className="w-12 h-12 mx-auto text-gray-200 mb-3"/>
               <p className="text-gray-500 font-medium text-sm">Nenhuma encomenda encontrada.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRepDashboard = () => {
    const viewingPolo = isGestor ? (adminTab === 'logistica_polo_view' || user?.polo || polos[0]) : user?.polo;
    
    // Filtros de status atualizados
    const repOrders = orders.filter(o => o.polo === viewingPolo && ['confirmado', 'pago_polo'].includes(o.status) && o.date);
    const historicoOrders = orders.filter(o => o.polo === viewingPolo && o.status === 'pago' && o.date); // Nova aba de histórico
    
    const pedidosConfirmados = orders.filter(o => o.polo === viewingPolo && o.status === 'confirmado');
    const pedidosPagosPolo = orders.filter(o => o.polo === viewingPolo && o.status === 'pago_polo');
    
    const totalAindaAReceber = pedidosConfirmados.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalArrecadadoPolo = pedidosPagosPolo.reduce((acc, o) => acc + (o.total || 0), 0);

    const ordersByMonth = repOrders.reduce((acc, order) => {
      const d = order.date ? new Date(order.date) : new Date();
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const capMonth = `${months[d.getMonth()]} ${d.getFullYear()}`;
      const sortKey = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!acc[capMonth]) acc[capMonth] = { orders: [], total: 0, count: 0, sortKey };
      acc[capMonth].orders.push(order);
      acc[capMonth].total += (order.total || 0);
      acc[capMonth].count += 1;
      return acc;
    }, {});

    const handleEfetuarRepassePolo = async () => {
      if (pedidosPagosPolo.length === 0) return showToast('Nenhum valor arrecadado para repassar!', 'error');
      
      if (window.confirm(`ATENÇÃO REPRESENTANTE:\n\nVocê confirma que realizou o PIX no valor TOTAL de R$ ${totalArrecadadoPolo.toFixed(2)} para a Sede Central?`)) {
        try {
          for (const o of pedidosPagosPolo) {
            await updateDoc(doc(db, "orders", o.id), { status: 'pago', dataRepasseSede: new Date().toISOString() });
          }
          showToast('Repasse efetuado! Caixa do Johrei Center sincronizado.');
          setOrders(prev => prev.map(ord => (ord.polo === viewingPolo && ord.status === 'pago_polo') ? { ...ord, status: 'pago' } : ord));
        } catch(e) { showToast('Erro ao processar repasse', 'error'); }
      }
    };

    const handleAddToManualCart = () => {
      if (!manualItemProduct) return showToast('Selecione um produto!', 'error');
      const prod = products.find(p => String(p.id) === String(manualItemProduct));
      if (!prod) return;
      
      const existing = manualCart.find(i => i.id === prod.id);
      if (existing) {
        setManualCart(manualCart.map(i => i.id === prod.id ? { ...i, qty: i.qty + manualItemQty } : i));
      } else {
        setManualCart([...manualCart, { id: prod.id, name: prod.name, price: prod.price, qty: manualItemQty }]);
      }
      setManualItemProduct('');
      setManualItemQty(1);
    };

    const handleRemoveFromManualCart = (id) => {
      setManualCart(manualCart.filter(i => i.id !== id));
    };

    const handleSaveManualOrder = async () => {
      if (!manualClientName) return showToast('Digite o nome do membro!', 'error');
      if (!manualClientWhatsapp || manualClientWhatsapp.length < 10) return showToast('O WhatsApp é obrigatório para notificações!', 'error'); // Regra nova
      if (manualCart.length === 0) return showToast('Adicione pelo menos 1 produto à lista!', 'error');

      const manualTotal = manualCart.reduce((acc, item) => acc + (item.price * item.qty), 0);

      const manualOrder = {
        customer: `${manualClientName} (Manual)`, email: '', whatsapp: manualClientWhatsapp, polo: viewingPolo, cpf: 'Não informado',
        total: manualTotal, method: 'manual', status: 'confirmado', status_nfe: 'pendente',
        date: new Date().toISOString(), items: manualCart, faltas: []
      };

      try {
        await addDoc(collection(db, "orders"), manualOrder);
        showToast('Pedido Manual Salvo com Sucesso!');
        setShowManualOrder(false);
        setManualClientName('');
        setManualClientWhatsapp('');
        setManualCart([]);
      } catch (e) { showToast('Erro ao salvar', 'error'); }
    };

    return (
      <div className="p-4 max-w-7xl mx-auto pt-6 pb-24 font-sans text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
           <div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão do Johrei Center</h2>
             <p className="text-xs font-bold text-emerald-700 bg-emerald-50 inline-flex items-center px-3 py-1.5 rounded-lg mt-2 border border-emerald-100"><MapPin className="w-3 h-3 mr-1.5"/> Unidade: {viewingPolo}</p>
           </div>
           
           {isGestor && (
             <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Visão de Mestre</p>
                 <select onChange={e => {setAdminTab(e.target.value); setUser({...user, polo: e.target.value});}} className="w-full bg-white border border-gray-300 text-slate-800 font-bold px-3 py-2 rounded-lg outline-none text-xs">
                    {polos.map(p => <option key={p} value={p}>JC: {p}</option>)}
                 </select>
             </div>
           )}
        </div>

        {CONFIG_APENAS_COLETA && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-800 text-white border-2 border-emerald-900 rounded-2xl p-5 text-center shadow-md flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">💰 Total Coletado no JC</p>
                  <h1 className="text-3xl font-black mt-1 text-white">R$ {totalArrecadadoPolo.toFixed(2)}</h1>
                  <p className="text-[10px] text-emerald-100 mt-1 font-medium">{pedidosPagosPolo.length} caixas pagas na unidade</p>
                </div>
                {totalArrecadadoPolo > 0 && (
                  <button onClick={handleEfetuarRepassePolo} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 rounded-xl shadow mt-4 transition">
                    💸 Enviar Repasse via PIX à Sede
                  </button>
                )}
              </div>

              <div className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-5 text-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">⏳ Total Pendente de Coleta</p>
                <h1 className="text-3xl font-black text-slate-800 mt-1">R$ {totalAindaAReceber.toFixed(2)}</h1>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">{pedidosConfirmados.length} membros aguardando retirada</p>
              </div>
            </div>

            <button onClick={() => setShowManualOrder(!showManualOrder)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl shadow hover:bg-slate-900 transition text-sm">➕ Incluir Pedido Manual</button>

            {showManualOrder && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-lg mt-3 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Novo Pedido Manual</h3>
                  <button onClick={() => setShowManualOrder(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-1.5 rounded"><X className="w-4 h-4"/></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <input type="text" placeholder="Nome do Membro" value={manualClientName} onChange={e => setManualClientName(e.target.value)} className="w-full p-3 border border-gray-200 bg-slate-50 rounded-lg text-sm font-medium outline-none focus:border-emerald-500" />
                  <input type="tel" placeholder="WhatsApp (Ex: 11999999999)" value={manualClientWhatsapp} onChange={e => setManualClientWhatsapp(e.target.value)} className="w-full p-3 border border-gray-200 bg-slate-50 rounded-lg text-sm font-medium outline-none focus:border-emerald-500" />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 mb-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Adicionar Produtos</p>
                  <div className="flex flex-col gap-2">
                    <select value={manualItemProduct} onChange={e => setManualItemProduct(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-medium outline-none truncate">
                      <option value="">Selecione o Produto...</option>
                      {[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {(p.price || 0).toFixed(2)}</option>)}
                    </select>
                    <div className="flex gap-2 justify-end">
                       <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                          <button onClick={() => setManualItemQty(Math.max(1, manualItemQty - 1))} className="w-12 py-2.5 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors font-black text-lg leading-none">-</button>
                          <span className="w-10 text-center font-black text-slate-800 text-sm">{manualItemQty}</span>
                          <button onClick={() => setManualItemQty(manualItemQty + 1)} className="w-12 py-2.5 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors font-black text-lg leading-none">+</button>
                       </div>
                       <button onClick={handleAddToManualCart} className="flex-1 sm:flex-none bg-emerald-100 text-emerald-800 px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-200 transition shadow-sm text-sm">Adicionar</button>
                    </div>
                  </div>
                </div>
                {manualCart.length > 0 && (
                  <div className="mb-5 space-y-2">
                    {manualCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 text-sm shadow-sm">
                        <span className="text-slate-700 font-medium"><span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mr-1">{item.qty}x</span> {item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-800">R$ {(item.price * item.qty).toFixed(2)}</span>
                          <button onClick={() => handleRemoveFromManualCart(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-3 border-t border-gray-100 mt-3">
                      <span className="font-bold text-gray-500 text-[10px] uppercase tracking-widest mr-2">Total do Pedido:</span>
                      <span className="font-black text-emerald-800 text-xl">R$ {manualCart.reduce((s,i)=>s+(i.price*i.qty),0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <button onClick={handleSaveManualOrder} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl shadow-md hover:bg-emerald-700">✅ Concluir e Salvar Pedido</button>
              </div>
            )}
          </div>
        )}

        {/* CONTROLE DE ABAS: ATIVOS VS HISTÓRICO */}
        <div className="flex gap-2 mb-6">
            <button onClick={() => setShowHistory(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${!showHistory ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-50'}`}>📦 Pedidos Ativos</button>
            <button onClick={() => setShowHistory(true)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${showHistory ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-50'}`}>🕰️ Repasses Anteriores</button>
        </div>

        {/* VISÃO DE PEDIDOS ATIVOS */}
        {!showHistory && (
          <div className="space-y-6">
            {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => (
              <div key={month} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 text-lg capitalize">{month}</h3>
                        <p className="text-xs font-bold text-gray-500 mt-1 flex items-center"><Package className="w-3 h-3 mr-1.5"/> {data.count} pedidos ativos no JC</p>
                    </div>
                  </div>
                  {/* Grid expandido para Widescreen */}
                  <div className="p-4 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.orders.slice().reverse().map(o => {
                      const temFalta = o.faltas && o.faltas.length > 0;
                      const uRel = allUsers.find(u=>u.email===o.email);
                      const estornado = temFalta && (uRel?.pendingPixRefund === 0 && uRel?.walletBalance === 0);
                      return (
                        <div key={o.id} className={`p-4 bg-white border rounded-xl shadow-sm flex flex-col justify-between gap-4 transition-all h-full ${temFalta ? 'border-orange-200' : 'border-gray-100'}`}>
                          <div className="w-full text-left">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-800 text-base leading-tight">{o.customer}</p>
                              {/* ETIQUETAS ATUALIZADAS */}
                              <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase text-center ${o.status === 'confirmado' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                  {o.status === 'confirmado' ? '⏳ Aguardando JC' : '📦 Pix Recebido'}
                              </span>
                            </div>
                            <p className="text-[10px] font-semibold text-gray-500 mb-3 flex items-center">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono mr-1">#PED-{o.id.slice(-5).toUpperCase()}</span>
                                • {o.date ? new Date(o.date).toLocaleDateString() : 'N/D'} • R$ {(o.total||0).toFixed(2)}
                            </p>
                            <div className="flex flex-col gap-1.5 mt-2">
                              {(o.items || []).map((i, idx) => {
                                const isFalta = o.faltas?.find(f=>f.productId===i.id);
                                const quantidade = i.qtd || i.qty || 1; 
                                const totalDoItem = (i.price || 0) * quantidade;
                                return (
                                  <div key={idx} className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border flex items-center justify-between shadow-sm w-full ${isFalta ? 'bg-red-50 text-red-700 border-red-200 line-through opacity-70' : 'bg-white text-slate-700 border-gray-200'}`}>
                                    <div className="flex items-center truncate">
                                      <span className="mr-2 px-2 py-1 bg-gray-100 rounded-md text-emerald-800 font-black shrink-0">{quantidade}x</span> 
                                      <span className="leading-tight truncate">{i.name}</span>
                                    </div>
                                    <span className="shrink-0 ml-2 font-black">R$ {totalDoItem.toFixed(2)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
          
                          <div className="flex flex-col sm:flex-row gap-2 w-full mt-auto pt-4 border-t border-gray-50">
                              {temFalta && (
                                  <span className={`w-full py-2 rounded font-black text-[10px] flex items-center justify-center shadow-sm ${estornado ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                      {estornado ? 'FALTA ESTORNADA' : 'CONTÉM FALTAS'}
                                  </span>
                              )}
                              
                              {/* BOTÃO ATUALIZADO */}
                              {CONFIG_APENAS_COLETA && o.status === 'confirmado' && (
                                  <button onClick={async () => {
                                      if(window.confirm(`Confirmar que o membro pagou R$ ${(o.total||0).toFixed(2)} e retirou a mercadoria?`)) {
                                          try {
                                              await updateDoc(doc(db, "orders", o.id), { status: 'pago_polo' });
                                              showToast('Baixa efetuada! Valor guardado no JC.');
                                              setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, status: 'pago_polo' } : ord));
                                          } catch(e) { showToast('Erro ao dar baixa', 'error'); }
                                      }
                                  }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-[10px] flex justify-center items-center transition shadow-sm">
                                    <CheckCircle className="w-3 h-3 mr-1.5"/> CONFIRMAR PIX
                                  </button>
                              )}

                              {/* NOTIFICAÇÃO INTELIGENTE DO WHATSAPP */}
                              <button onClick={() => {
                                  let text = `Olá ${o.customer}! Aqui é do Clube de Compras.\n\nA sua encomenda já chegou e está pronta para retirada no Johrei Center de ${o.polo}. 📦\n\nNesta cesta você tem:\n`;
                                  (o.items || []).forEach(i => {
                                      const isFalta = o.faltas?.find(f => f.productId === i.id);
                                      if (!isFalta) {
                                          const quantidade = i.qtd || i.qty || 1;
                                          text += `• ${quantidade}x ${i.name}\n`;
                                      }
                                  });
                                  if(temFalta) {
                                      const itensFaltantes = o.faltas.map(f => f.name).join(', ');
                                      text += `\n⚠️ *Aviso:* Tivemos falta no fornecedor para o(s) item(ns): ${itensFaltantes}. O valor da sua cesta já foi ajustado!\n`;
                                  }
                                  text += `\nO total a transferir via Pix na retirada é *R$ ${(o.total||0).toFixed(2)}*. Te aguardamos!`;
                                  
                                  window.open(`https://wa.me/55${(o.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`);
                              }} className="flex-1 bg-emerald-100 text-emerald-800 py-2 rounded-lg font-bold text-[10px] flex justify-center items-center hover:bg-emerald-200 transition-colors shadow-sm">
                                <MessageCircle className="w-3 h-3 mr-1.5"/> NOTIFICAR MEMBRO
                              </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>
            ))}
            {Object.keys(ordersByMonth).length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                  <Truck className="w-10 h-10 mx-auto text-gray-200 mb-3"/>
                  <p className="text-gray-500 font-medium text-sm">Nenhuma caixa pendente no JC no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* VISÃO DE HISTÓRICO DE REPASSES */}
        {showHistory && (
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-5">
              <h3 className="font-black text-slate-800 text-lg mb-4">Repasses Concluídos à Sede</h3>
              {historicoOrders.length === 0 ? (
                 <p className="text-gray-500 text-sm">Nenhum repasse registrado no histórico.</p>
              ) : (
                 <div className="space-y-3">
                    {historicoOrders.slice().reverse().map(o => (
                       <div key={o.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 border border-gray-100 rounded-xl">
                          <div>
                             <p className="font-bold text-slate-800 text-sm">{o.customer}</p>
                             <p className="text-xs text-gray-500 mt-0.5">Pedido Finalizado • {o.dataRepasseSede ? new Date(o.dataRepasseSede).toLocaleDateString() : 'Data N/D'}</p>
                          </div>
                          <span className="mt-2 sm:mt-0 font-black text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm w-fit">R$ {(o.total||0).toFixed(2)}</span>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        )}

      </div>
    );
  };

  const renderDispatchPDF = () => {
    const validOrders = orders.filter(o => (o.status === 'pago' || o.status === 'confirmado' || o.status === 'pago_polo') && o.date);
    const summaryByPolo = {};

    validOrders.forEach(o => {
        if (!summaryByPolo[o.polo]) summaryByPolo[o.polo] = { customers: [] };
        summaryByPolo[o.polo].customers.push(o);
    });

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto font-mono text-sm text-black">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase">Romaneio de Despacho (Sede)</h1>
          <p className="mt-2">Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        {Object.entries(summaryByPolo).map(([poloName, data]) => {
           const poloTotals = {};
           data.customers.forEach(cust => {
               (cust.items || []).forEach(item => {
                   if(!poloTotals[item.name]) poloTotals[item.name] = 0;
                   poloTotals[item.name] += item.qtd;
               });
           });

           return (
            <div key={poloName} className="mb-10 page-break-after">
              <div className="bg-gray-200 p-2 font-black text-lg mb-4 uppercase border border-black">Destino: POLO {poloName}</div>
              
              <div className="mb-6 border border-black p-4">
                <h3 className="font-bold underline mb-2">Resumo Total para a Van:</h3>
                <div className="grid grid-cols-2 gap-2">
                   {Object.entries(poloTotals).map(([itemName, qty]) => (
                      <div key={itemName} className="flex justify-between border-b border-dotted border-gray-400">
                        <span>{itemName}</span><span className="font-bold">{qty}x</span>
                      </div>
                   ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-3">Separação por Cliente:</h3>
                {data.customers.map(cust => (
                   <div key={cust.id} className="mb-4 border-b border-black pb-2">
                     <p className="font-bold bg-gray-100 p-1">Cliente: {cust.customer} (Pedido #{cust.id.slice(0,5)})</p>
                     <div className="pl-4 mt-1">
                        {(cust.items || []).map((it, idx) => (
                           <div key={idx} className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 border border-black inline-block"></div>
                              <span>{it.qtd}x {it.name}</span>
                           </div>
                        ))}
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="text-center mt-10 print:hidden">
          <button onClick={() => window.print()} className="bg-black text-white px-8 py-3 font-bold uppercase rounded">Imprimir Agora</button>
          <button onClick={() => setIsPrintMode(false)} className="ml-4 text-black underline">Voltar</button>
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    // 1. FILTRO GLOBAL CONSERTADO: Lendo todos os status da Fase 1 e 2
    const validOrders = orders.filter(o => ['pago', 'confirmado', 'pago_polo'].includes(o.status) && o.date);
    
    const totalGross = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrdersCount = validOrders.length;
    // 2. CORREÇÃO DE QTD MISTA (Site vs Manual)
    const itemsSold = validOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.qtd || i.qty || 0), 0), 0);
    const avgTicket = totalOrdersCount > 0 ? totalGross / totalOrdersCount : 0;
    const pendingCredits = allUsers.reduce((sum, u) => sum + (u.pendingPixRefund || 0), 0);

    const productStats = {};
    validOrders.forEach(o => (o.items || []).forEach(i => {
      if (!productStats[i.id]) {
         const pData = products.find(p => String(p.id) === String(i.id)) || {};
         productStats[i.id] = { name: i.name, qty: 0, val: 0, image: pData.image };
      }
      productStats[i.id].qty += (i.qtd || i.qty || 0);
      productStats[i.id].val += ((i.price || 0) * (i.qtd || i.qty || 0));
    }));
    const top5 = Object.values(productStats).sort((a,b) => b.val - a.val).slice(0, 5);

    const renderContent = () => {
      if (adminTab === 'dashboard') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Cálculo Dinâmico do Mês Anterior
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevYear--;
        }

        // SEPARAÇÃO: MÊS ATUAL VS MÊS ANTERIOR
        const currentMonthOrders = validOrders.filter(o => {
            if(!o.date) return false;
            const d = new Date(o.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const prevMonthOrders = validOrders.filter(o => {
            if(!o.date) return false;
            const d = new Date(o.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        const faturamentoMes = currentMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const faturamentoAnterior = prevMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        // CÁLCULO DE CRESCIMENTO (MoM %)
        let crescimento = 0;
        if (faturamentoAnterior > 0) {
            crescimento = ((faturamentoMes - faturamentoAnterior) / faturamentoAnterior) * 100;
        } else if (faturamentoMes > 0) {
            crescimento = 100; // Crescimento puro
        }

        const impostosMes = faturamentoMes * 0.08;

        let custoMercadoriaMes = 0;
        currentMonthOrders.forEach(o => {
            (o.items || []).forEach(i => {
                const prod = products.find(p => String(p.id) === String(i.id));
                const itemCost = prod?.cost || 0; 
                const quantidade = i.qtd || i.qty || 1;
                custoMercadoriaMes += (itemCost * quantidade);
            });
        });

        const lucroLiquidoMes = faturamentoMes - custoMercadoriaMes - impostosMes;
        const margemLucroMes = faturamentoMes > 0 ? (lucroLiquidoMes / faturamentoMes) * 100 : 0;

        const faturamentoPorPolo = {};
        currentMonthOrders.forEach(o => {
            if (!faturamentoPorPolo[o.polo]) faturamentoPorPolo[o.polo] = 0;
            faturamentoPorPolo[o.polo] += (o.total || 0);
        });

        // GRÁFICO 100% BLINDADO CONTRA NAVEGADORES E FUSOS
        const last7Days = Array.from({length: 7}).map((_, i) => { 
          const d = new Date(); 
          d.setDate(now.getDate() - (6 - i)); 
          return d; 
      });

      const salesData = last7Days.map(date => {
          // Criamos uma "chave" única infalível (Ex: "2026-5-8")
          const targetKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          
          return validOrders.filter(o => {
             if(!o.date) return false;
             const d = new Date(o.date);
             const orderKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
             
             return targetKey === orderKey;
          }).reduce((sum, o) => sum + (o.total || 0), 0);
      });
      
      const maxSale = Math.max(...salesData, 100);

        return (
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-black text-slate-800 mb-2">DRE e Visão Geral (Mês Atual)</h2>
            
            {/* Controlador de Fases */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
               <h3 className="font-bold text-sm text-slate-800 mb-3">Ciclo de Vendas (Status da Loja)</h3>
               <div className="flex flex-col md:flex-row gap-2">
                   <button onClick={() => toggleStoreMode('mensal')} className={`flex-1 p-3 rounded-xl font-bold text-xs transition-all ${storeMode === 'mensal' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🟢 Ciclo Aberto</button>
                   <button onClick={() => toggleStoreMode('estoque')} className={`flex-1 p-3 rounded-xl font-bold text-xs transition-all ${storeMode === 'estoque' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🟠 Pronta Entrega</button>
                   <button onClick={() => toggleStoreMode('pausado')} className={`flex-1 p-3 rounded-xl font-bold text-xs transition-all ${storeMode === 'pausado' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🔴 Loja Pausada</button>
               </div>
            </div>

           {/* SUPER DASHBOARD FINANCEIRO (Com Comparativo) */}
           <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 text-white relative overflow-hidden">
                {/* Efeito visual de brilho no fundo (Design Premium) */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                
                <p className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-wider relative z-10">Faturamento Bruto (Mês)</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 relative z-10">
                   <p className="text-4xl font-black tracking-tight">R$ {faturamentoMes.toFixed(2)}</p>
                   {(faturamentoAnterior > 0 || crescimento > 0) && (
                       <span className={`w-fit whitespace-nowrap px-2.5 py-1 rounded-lg border font-black text-[10px] flex items-center shadow-sm ${crescimento >= 0 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}>
                           {crescimento >= 0 ? '↗' : '↘'} {Math.abs(crescimento).toFixed(1)}% vs mês passado
                       </span>
                   )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-700 pt-5 relative z-10">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custo Mercadoria</p>
                        <p className="text-xl font-black text-red-400">- R$ {custoMercadoriaMes.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Impostos (8%)</p>
                        <p className="text-xl font-black text-orange-400">- R$ {impostosMes.toFixed(2)}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2 md:col-span-1 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Lucro Líquido</p>
                            <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">MG: {margemLucroMes.toFixed(1)}%</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">R$ {lucroLiquidoMes.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GRÁFICO TENDÊNCIA BLINDADO (CSS CORRIGIDO) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-sm text-slate-800 mb-6">Vendas (Últimos 7 Dias)</h3>
                    <div className="flex items-end justify-between h-40 gap-1">
                        {salesData.map((val, i) => {
                        // Limitamos a 75% para a coluna mais alta não vazar por cima do gráfico!
                        const heightPercentage = Math.max((val / maxSale) * 75, 2);
                        
                        return (
                            // A MÁGICA AQUI: h-full adicionado para dar altura real à coluna
                            <div key={i} className="flex flex-col justify-end items-center flex-1 group relative h-full">
                                
                                {/* Tooltip inteligente que flutua exatamente acima do tamanho da coluna */}
                                <div className="opacity-0 group-hover:opacity-100 absolute text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded shadow-sm transition-opacity whitespace-nowrap z-10" style={{ bottom: `calc(${heightPercentage}% + 28px)` }}>
                                    R$ {val.toFixed(0)}
                                </div>
                                
                                {/* A Coluna Verde */}
                                <div className="w-full max-w-[32px] bg-emerald-500 rounded-t hover:bg-emerald-400 transition-colors" style={{ height: `${heightPercentage}%` }}></div>
                                
                                {/* A Data */}
                                <span className="text-[8px] font-bold text-gray-400 mt-2 h-4 shrink-0">
                                    {last7Days[i].getDate()}/{last7Days[i].getMonth()+1}
                                </span>
                            </div>
                        );
                        })}
                    </div>
                </div>

                {/* FATURAMENTO POR POLO */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-sm text-slate-800 mb-4">Desempenho por Polo (Mês)</h3>
                    <div className="space-y-3">
                        {Object.entries(faturamentoPorPolo)
                            .sort((a, b) => b[1] - a[1]) // Ordena do maior pro menor
                            .map(([polo, valor]) => (
                            <div key={polo} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-600"/>
                                    <span className="font-bold text-slate-700 text-xs">{polo}</span>
                                </div>
                                <span className="font-black text-emerald-800 text-sm">R$ {valor.toFixed(2)}</span>
                            </div>
                        ))}
                        {Object.keys(faturamentoPorPolo).length === 0 && <p className="text-xs text-gray-400">Nenhum pedido neste mês ainda.</p>}
                    </div>
                </div>
            </div>
          </div>
        );
      }
   
      if (adminTab === 'vendas') {
         const ordersByMonth = validOrders.reduce((acc, order) => {
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
           <div className="space-y-6 text-left">
             <h2 className="text-2xl font-black text-slate-800 mb-4">Histórico de Vendas</h2>
             {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => (
               <div key={month} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                  <div className="p-4 bg-slate-50 border-b border-gray-50 flex justify-between items-center">
                     <div>
                       <h3 className="font-black text-slate-800 text-lg capitalize">{month}</h3>
                       <p className="text-[10px] font-bold text-gray-500 mt-1">{data.count} pedidos globais</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Faturamento</p>
                        <p className="text-xl font-black text-emerald-700">R$ {data.total.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="p-3 space-y-2">
                     {data.orders.slice().reverse().map(o => (
                       <div key={o.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col md:flex-row justify-between gap-3 items-start md:items-center hover:border-emerald-200">
                         <div>
                           <p className="font-bold text-slate-800 text-sm">{o.customer}</p>
                           <p className="text-[10px] font-medium text-gray-500 mb-1">#{o.id.slice(0,5)} • {new Date(o.date).toLocaleDateString()} • Polo: {o.polo}</p>
                         </div>
                         <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                            <span className="font-black text-slate-800 text-sm">R$ {(o.total||0).toFixed(2)}</span>
                            <button onClick={async ()=>{ await deleteDoc(doc(db,"orders",o.id)); showToast('Excluído'); }} className="text-red-400 hover:text-red-600 text-[10px] font-bold flex items-center"><Trash2 className="w-3 h-3 mr-1"/> Excluir</button>
                         </div>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
           </div>
         );
      }

      if (adminTab === 'compras') {
        return (
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-black text-emerald-900 mb-4">Inteligência de Compras</h2>
            <div className="flex flex-col gap-3 bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
               <p className="text-xs font-medium text-emerald-800 mb-2">Cálculo de Cross-docking automático. O CSV enviará caixas fechadas diretamente aos polos definidos.</p>
               <button onClick={exportSupplierCSV} className="bg-emerald-700 text-white font-black px-4 py-3 rounded-xl shadow-md hover:bg-emerald-800 flex items-center justify-center w-full text-sm"><Download className="w-4 h-4 mr-2"/> Exportar CSV Fornecedor</button>
               <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white font-black px-4 py-3 rounded-xl shadow-md hover:bg-slate-900 flex items-center justify-center w-full text-sm"><Printer className="w-4 h-4 mr-2"/> PDF Despacho da Sede</button>
            </div>
          </div>
        );
      }

      if (adminTab === 'catalogo') {
        return (
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-black text-slate-800 mb-4">Gestão de Catálogo</h2>
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl mb-6 shadow-sm">
               <h3 className="font-black text-emerald-900 text-sm">Importação em Lote (CSV)</h3>
               <label className="bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-black cursor-pointer hover:bg-emerald-800 shadow-sm inline-flex items-center mt-3 text-xs">
                 <Upload className="w-4 h-4 mr-2"/> Subir Tabela CSV
                 <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload}/>
               </label>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
               <form key={editingProduct?.id || 'new'} onSubmit={async(e) => {
                 e.preventDefault(); const fd = new FormData(e.target);
                 const np = { 
                    name: fd.get('name'), sku: fd.get('sku'), category: fd.get('category'), 
                    price: parseFloat(fd.get('price').replace(',','.')), 
                    promotionalPrice: parseFloat(fd.get('promotionalPrice').replace(',','.')) || 0, 
                    cost: parseFloat(fd.get('cost').replace(',','.')) || 0,
                    stock: parseInt(fd.get('stock')||'0'), minBox: parseInt(fd.get('minBox')||'1'), 
                    image: editingProduct?.image || '📦' 
                 };
                 const fileInput = e.target.querySelector('input[type="file"]');
                 if (fileInput.files[0]) { np.image = await compressImage(fileInput.files[0]); }

                 try { 
                    if(editingProduct) await updateDoc(doc(db,"products",editingProduct.id), np);
                    else await addDoc(collection(db,"products"), np); 
                    setEditingProduct(null); e.target.reset(); showToast('Salvo!');
                 } catch(er){ showToast('Erro', 'error'); }
               }} className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                       <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {editingProduct?.image?.length > 50 ? <img src={editingProduct.image} className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 text-gray-400"/>}
                       </div>
                       <label className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-xs">Escolher Foto <input type="file" accept="image/*" className="hidden" /></label>
                    </div>
                    <input name="name" defaultValue={editingProduct?.name} placeholder="Nome do Produto" required className="p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                    <input name="sku" defaultValue={editingProduct?.sku} placeholder="SKU / Código" required className="p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                    <input name="category" defaultValue={editingProduct?.category} placeholder="Categoria (ex: Carnes)" required className="p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                    <input name="price" defaultValue={editingProduct?.price} placeholder="Preço (R$)" required className="p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                    <input name="promotionalPrice" defaultValue={editingProduct?.promotionalPrice || ''} placeholder="Preço Promoção (R$)" className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 outline-none text-sm font-bold text-emerald-800" />
                    <input name="cost" defaultValue={editingProduct?.cost || ''} placeholder="Seu Custo de Compra (R$)" required className="p-3 rounded-lg border border-red-200 bg-red-50 outline-none text-sm font-bold text-red-800" />
                    <div className="grid grid-cols-2 gap-2">
                       <div><label className="text-[10px] font-bold ml-1 block text-gray-500">Qtd Cx Fornecedor</label><input name="minBox" defaultValue={editingProduct?.minBox||'1'} className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm" /></div>
                       <div><label className="text-[10px] font-bold text-orange-600 ml-1 block">Estoque Sede (Sobra)</label><input name="stock" defaultValue={editingProduct?.stock||'0'} className="w-full p-3 rounded-lg border border-orange-200 bg-orange-50 outline-none text-sm font-bold text-orange-800" /></div>
                    </div>
                    <button type="submit" className="md:col-span-2 bg-slate-800 text-white font-black py-3 rounded-lg shadow mt-2 text-sm">Salvar Produto</button>
                  </div>
               </form>
               <div className="space-y-2">
                 {products.map(p => (
                   <div key={p.id} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between hover:border-emerald-200">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                         {p.image?.length > 50 ? <img src={p.image} className="w-full h-full object-cover"/> : <span className="text-xs">📦</span>}
                       </div>
                       <div><p className="font-bold text-slate-800 text-xs">{p.name}</p><p className="text-[9px] text-gray-500 mt-0.5">SKU: {p.sku}</p></div>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="font-bold text-slate-800 text-xs mr-2">R$ {p.price.toFixed(2)}</span>
                       <button onClick={()=>setEditingProduct(p)} className="bg-blue-50 text-blue-600 p-2 rounded-md"><Edit2 className="w-3 h-3"/></button>
                       <button onClick={async()=>{await deleteDoc(doc(db,"products",p.id));}} className="bg-red-50 text-red-600 p-2 rounded-md"><Trash2 className="w-3 h-3"/></button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'clientes') {
         return (
             <div className="space-y-4 text-left">
                 <h2 className="text-2xl font-black text-slate-800 mb-4">Base de Clientes (CRM)</h2>
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                     {allUsers.filter(u=>u.role!=='consolidador').map(u => (
                         <div key={u.id} className="p-3 border border-gray-100 rounded-xl flex justify-between items-center hover:border-emerald-200">
                             <div>
                                 <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                 <p className="text-[10px] text-gray-500">{u.email} • Polo: {u.polo} • Papel: {u.role}</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <button onClick={()=>window.open(`https://wa.me/55${(u.whatsapp||'').replace(/\D/g,'')}`)} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100"><MessageCircle className="w-4 h-4"/></button>
                                <button onClick={async()=>{await deleteDoc(doc(db,"users",u.id)); showToast('Cliente Apagado');}} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )
      }

      if (adminTab === 'financeiro') {
        const estornosPendentes = allUsers.filter(u => u.pendingPixRefund > 0);
        return (
          <div className="space-y-6 text-left">
            <h2 className="text-2xl font-black text-slate-800 mb-4">Financeiro & Reembolsos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200"><p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Crédito Retido (Carteiras)</p><p className="text-2xl font-black text-emerald-700">R$ {allUsers.reduce((s,u)=>s+(u.walletBalance||0),0).toFixed(2)}</p></div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200"><p className="text-[10px] font-bold text-orange-800 uppercase mb-1">Aguardando Envio de PIX</p><p className="text-2xl font-black text-orange-600">R$ {pendingCredits.toFixed(2)}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-4">
              <h3 className="font-black text-slate-800 mb-4 text-sm">Fila de Estornos PIX</h3>
              {estornosPendentes.map(u => (
                <div key={u.id} className="border border-orange-100 bg-orange-50/30 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 mb-3">
                  <div>
                    <p className="font-black text-slate-800 text-base">{u.name}</p>
                    <div className="bg-white px-3 py-1.5 border border-orange-200 rounded-lg inline-block font-mono font-bold text-orange-800 shadow-sm text-xs mt-2">Chave: {u.pixKey}</div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 justify-center">
                    <span className="font-black text-orange-600 text-xl">R$ {u.pendingPixRefund.toFixed(2)}</span>
                    <div className="flex gap-2 w-full">
                       <button onClick={()=>{window.open(`https://wa.me/55${(u.whatsapp||'').replace(/\D/g,'')}?text=Olá ${u.name}! A transferência PIX do seu estorno será feita para a chave: ${u.pixKey}.`);}} className="bg-white text-emerald-700 border border-emerald-200 font-bold px-3 py-2 rounded-lg shadow-sm hover:bg-emerald-50"><MessageCircle className="w-4 h-4"/></button>
                       <button onClick={async()=>{await updateDoc(doc(db,"users",u.id), { pendingPixRefund: 0, pixKey: '' }); showToast('Estorno Baixado!');}} className="flex-1 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-emerald-700 text-xs">Confirmar Envio</button>
                    </div>
                  </div>
                </div>
              ))}
              {estornosPendentes.length === 0 && <p className="text-xs text-gray-400 font-medium">Nenhum PIX pendente.</p>}
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="min-h-screen bg-slate-50 flex relative font-sans pb-20 md:pb-0">
        
        {/* MENU LATERAL (HAMBÚRGUER) */}
        <div className={`fixed inset-y-0 left-0 z-[70] w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
             <span className="font-black tracking-tight text-lg">Torre de Controle</span>
             <button onClick={() => setIsSidebarOpen(false)} className="p-1"><X className="w-5 h-5 text-gray-400"/></button>
          </div>
          <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
            <button onClick={() => {setAdminTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='dashboard'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Dashboard</button>
            <button onClick={() => {setAdminTab('vendas'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='vendas'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Vendas (Histórico)</button>
            <button onClick={() => {setAdminTab('compras'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='compras'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Compras & Logística</button>
            <button onClick={() => {setAdminTab('catalogo'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='catalogo'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Catálogo de Produtos</button>
            <button onClick={() => {setAdminTab('clientes'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='clientes'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Base de Clientes</button>
            <button onClick={() => {setAdminTab('financeiro'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='financeiro'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Financeiro (Estornos)</button>
            
            <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
               <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-2">Acesso Rápido</p>
               <button onClick={() => {setCurrentScreen('shop'); setIsSidebarOpen(false);}} className="w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs text-emerald-400 hover:bg-white/5 flex items-center"><Home className="w-3.5 h-3.5 mr-2"/> Loja (Comprar)</button>
               <button onClick={() => {setCurrentScreen('dashboard_rep'); setIsSidebarOpen(false);}} className="w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs text-emerald-400 hover:bg-white/5 flex items-center"><Truck className="w-3.5 h-3.5 mr-2"/> Logística (Polos)</button>
            </div>

            <div className="mt-4 shrink-0 pb-4">
               <button onClick={() => {setFaltaGlobalModal(true); setIsSidebarOpen(false);}} className="w-full bg-red-500/10 text-red-400 font-bold text-xs p-3 rounded-lg border border-red-500/30 hover:bg-red-500 hover:text-white flex justify-start items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Informar Falta Global</button>
            </div>
          </div>
        </div>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[65] backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

        <div className="flex-1 w-full flex flex-col h-screen overflow-hidden">
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm z-10 justify-between shrink-0">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 mr-3 bg-gray-100 rounded-md hover:bg-gray-200"><Menu className="w-5 h-5 text-slate-800"/></button>
              <h1 className="font-black text-emerald-800 text-lg hidden sm:block">Painel Administrativo</h1>
            </div>
            <div className="flex items-center gap-3">
                 <div className="text-right">
                   <p className="text-xs font-black text-slate-800 leading-tight">{user?.name}</p>
                   <p className="text-[9px] font-bold text-emerald-600 uppercase">Gestor Master</p>
                 </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 text-center">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] px-4 py-2 rounded-lg shadow-xl font-bold text-white text-xs flex items-center animate-in slide-in-from-top-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          <CheckCircle className="w-4 h-4 mr-2" /> {toast.msg}
        </div>
      )}

      {pixRefundModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100">
             <h3 className="text-lg font-black text-slate-800 mb-1">Reembolso via PIX</h3>
             <p className="text-xs text-gray-500 font-medium mb-4">Informe a chave PIX para enviarmos o estorno de R$ {user?.walletBalance.toFixed(2)}.</p>
             <input autoFocus value={pixRefundModal.key} onChange={e=>setPixRefundModal({...pixRefundModal,key:e.target.value})} placeholder="Sua Chave PIX..." className="w-full bg-slate-50 border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-bold text-slate-800 mb-5 text-sm" />
             <div className="flex gap-2">
               <button onClick={() => setPixRefundModal({open:false, key:''})} className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-lg text-xs">Cancelar</button>
               <button onClick={requestPixRefund} className="flex-1 bg-emerald-700 text-white font-bold py-3 rounded-lg shadow text-xs">Confirmar Chave</button>
             </div>
          </div>
        </div>
      )}

      {faltaGlobalModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
             <div className="flex justify-between items-start mb-5 border-b border-gray-100 pb-3">
                <div>
                   <h3 className="text-lg font-black text-slate-800 tracking-tight">Falta Global</h3>
                   <p className="text-[10px] font-bold text-red-500 uppercase mt-0.5">Gerador Automático de Créditos</p>
                </div>
                <button onClick={() => {setFaltaGlobalModal(false); setShortagePreview(null);}} className="p-1.5 bg-gray-100 rounded-md"><X className="w-4 h-4"/></button>
             </div>
             {!shortagePreview ? (
               <div className="space-y-4">
                 <div className="bg-slate-50 p-1.5 rounded-lg border border-gray-200">
                 <select 
                    value={shortageSelectedProduct} 
                    onChange={(e) => setShortageSelectedProduct(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg text-sm font-bold text-slate-800 outline-none cursor-pointer focus:border-emerald-500"
                  >
                    <option value="">Selecione o produto ausente...</option>
                    {/* FILTRO INTELIGENTE CONSERTADO */}
                    {products
                      .filter(p => orders.some(order => 
                         ['confirmado', 'pago_polo', 'pago'].includes(order.status) && 
                         (order.items || []).some(item => String(item.id) === String(p.id))
                      ))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                 </div>
                 <button onClick={analyzeFaltaGlobal} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg shadow text-sm">Analisar Impacto</button>
               </div>
             ) : (
               <div>
                 <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-5">
                    <h4 className="font-bold text-orange-900 mb-1 text-sm">Resumo da Ação</h4>
                    <p className="text-xs text-orange-800 mb-3">
                      {CONFIG_APENAS_COLETA ? `Irá abater o valor na cobrança de ` : `Irá devolver crédito a `}
                      <strong>{shortagePreview.impact.length}</strong> {CONFIG_APENAS_COLETA ? 'pedidos.' : 'clientes.'}
                    </p>
                    <div className="flex justify-between items-center border-t border-orange-200 pt-3">
                       <span className="font-bold text-orange-800 text-xs">{CONFIG_APENAS_COLETA ? 'Total Abatido:' : 'Total Estornado:'}</span>
                       <span className="font-black text-xl text-orange-600">R$ {shortagePreview.totalRefund.toFixed(2)}</span>
                    </div>
                 </div>
                 <button onClick={confirmFaltaGlobal} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg shadow text-sm">
                    {CONFIG_APENAS_COLETA ? 'CONFIRMAR FALTA E ABATER VALORES' : 'CONFIRMAR E GERAR CRÉDITOS'}
                 </button>
               </div>
             )}
          </div>
        </div>
      )}

      {isPrintMode ? renderDispatchPDF() : (
        <>
          {currentScreen !== 'login' && currentScreen !== 'dashboard_admin' && (
            <header className="bg-emerald-800 h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-[60]">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center"><Leaf className="w-5 h-5 text-emerald-700"/></div>
                 <span className="font-black text-white text-xl tracking-tight leading-none">Clube de Compras</span>
               </div>
               
               <div className="hidden md:flex items-center gap-2 mx-auto">
                    <button onClick={() => setCurrentScreen('shop')} className={`flex items-center font-bold text-sm px-4 py-2 rounded-xl transition-colors ${currentScreen === 'shop' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-700'}`}><Home className="w-4 h-4 mr-2"/> Loja</button>
                    <button onClick={() => setCurrentScreen('my_orders')} className={`flex items-center font-bold text-sm px-4 py-2 rounded-xl transition-colors ${currentScreen === 'my_orders' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-700'}`}><Package className="w-4 h-4 mr-2"/> Pedidos</button>
                    {isAdminOrRep && (
                         <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex items-center font-bold text-sm px-4 py-2 rounded-xl transition-colors ${currentScreen === 'dashboard_rep' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-700'}`}><Truck className="w-4 h-4 mr-2"/> Logística</button>
                    )}
                    {isGestor && (
                         <button onClick={() => { setCurrentScreen('dashboard_admin'); setIsSidebarOpen(true); }} className={`flex items-center font-bold text-sm px-4 py-2 rounded-xl transition-colors ${currentScreen === 'dashboard_admin' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-700'}`}><LayoutDashboard className="w-4 h-4 mr-2"/> Gestão</button>
                    )}
               </div>

               <div className="flex items-center gap-3">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-black text-white leading-none">{user?.name}</p>
                   <p className="text-[9px] font-bold text-emerald-200 capitalize mt-0.5">{userRoleStr}</p>
                 </div>
                 <button onClick={() => {signOut(auth); setCart([]);}} className="w-9 h-9 bg-emerald-900 rounded-lg flex items-center justify-center hover:bg-emerald-950 transition-colors"><LogOut className="w-4 h-4 text-emerald-100"/></button>
               </div>
            </header>
          )}

          <main className="pb-16 md:pb-0">
             {currentScreen === 'login' && (
               <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden text-left">
                 <div className="w-full max-w-sm bg-white p-6 md:p-8 rounded-[2rem] shadow-xl relative z-10 border border-gray-100">
                   <div className="flex justify-center mb-6">
                     <div className="w-16 h-16 bg-emerald-700 rounded-2xl flex items-center justify-center shadow-lg rotate-3"><Leaf className="w-8 h-8 text-white" /></div>
                   </div>
                   <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight mb-1">Clube Orgânico</h2>
                   <p className="text-center text-gray-500 font-bold text-xs mb-6">Acesse a sua conta</p>
                   
                   <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                     <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Entrar</button>
                     <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Nova Conta</button>
                   </div>

                   <form onSubmit={handleAuth} className="space-y-3">
                     {authMode === 'register' && (
                       <div className="space-y-3">
                         <input type="text" placeholder="Nome Completo" value={loginName} onChange={e=>setLoginName(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                         <input type="tel" placeholder="WhatsApp (DDD+Num)" value={loginWhatsapp} onChange={e=>setLoginWhatsapp(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                         <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                           <select value={selectedPolo} onChange={e=>setSelectedPolo(e.target.value)} className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-800 cursor-pointer">
                             {polos.map(p => <option key={p} value={p}>Polo: {p}</option>)}
                           </select>
                         </div>
                         <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                           <select value={registerRole} onChange={e=>setRegisterRole(e.target.value)} className="w-full bg-transparent p-2 outline-none font-black text-sm text-emerald-700 cursor-pointer">
                             <option value="cliente">Sou Cliente</option>
                             <option value="representante">Sou Representante</option>
                             <option value="consolidador">Sou Gestor Geral</option>
                           </select>
                         </div>
                         {['consolidador', 'representante'].includes(registerRole) && (
                           <div>
                             <input type="password" placeholder="Código de Segurança" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required className="w-full bg-red-50 border border-red-200 p-3 rounded-lg outline-none focus:border-red-500 font-black text-sm text-red-800 placeholder-red-300" />
                           </div>
                         )}
                       </div>
                     )}
                     <input type="email" placeholder="E-mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                     <input type="password" placeholder="Senha" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                     
                     <button type="submit" disabled={authLoading} className="w-full bg-emerald-700 text-white font-black py-3.5 rounded-lg shadow-md hover:bg-emerald-800 transition-all text-sm flex items-center justify-center mt-4">
                       {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Acessar Loja' : 'Finalizar Cadastro')}
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
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-12 h-12 text-emerald-600"/></div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2">Tudo certo!</h2>
                  <p className="text-gray-500 font-bold mb-8 text-sm">O seu pedido foi recebido com sucesso.</p>
                  <button onClick={()=>setCurrentScreen('my_orders')} className="bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-black shadow-md hover:bg-emerald-800 text-sm">Acompanhar Encomenda</button>
               </div>
             )}
          </main>

          {currentScreen !== 'login' && currentScreen !== 'dashboard_admin' && (
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-14 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] md:hidden">
              <button onClick={() => setCurrentScreen('shop')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='shop'?'text-emerald-700':'text-gray-400'}`}><Home className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase">Comprar</span></button>
              <button onClick={() => setCurrentScreen('my_orders')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='my_orders'?'text-emerald-700':'text-gray-400'}`}><Package className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase">Pedidos</span></button>
              {isAdminOrRep && (
                <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='dashboard_rep'?'text-emerald-700':'text-gray-400'}`}><Truck className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase">Logística</span></button>
              )}
              {isGestor && (
                <button onClick={() => { setCurrentScreen('dashboard_admin'); setIsSidebarOpen(true); }} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='dashboard_admin'?'text-emerald-700':'text-gray-400'}`}><LayoutDashboard className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase">Gestão</span></button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}