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

// A lista base de operações.
const polos = ['São José dos Campos (Sede)', 'Jacareí', 'Taubaté', 'Caraguatatuba', 'Caçapava', 'Vila Adyana'];

// A MÁGICA DA LOGÍSTICA HÍBRIDA: Polos que recebem descarga direta do fornecedor (caixas fechadas).
const polosEntregaDireta = ['Taubaté', 'Vila Adyana'];

// Função para compressão de imagens em Base64
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
  
  // Dados do BD
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Autenticação
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);
  
  // Navegação Gestão & Loja
  const [shopCategory, setShopCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false); // Para o PDF da Sede

  // Checkout (Preparado para NF-e)
  const [checkoutCpf, setCheckoutCpf] = useState(''); // Opcional para emissão de nota
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  // UI States
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, message: '' });
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' });
  const [faltaGlobalModal, setFaltaGlobalModal] = useState(false);
  const [shortageSelectedProduct, setShortageSelectedProduct] = useState('');
  const [shortagePreview, setShortagePreview] = useState(null);

  // Derivações
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
  }, [currentScreen, toast]); // Recarrega sempre que houver um toast (ação de sucesso)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const requestConfirm = (message, action) => {
    setConfirmDialog({ open: true, message, action });
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
        customer: user?.name, 
        email: user?.email, 
        whatsapp: user?.whatsapp, 
        polo: user?.polo, 
        cpf: checkoutCpf || 'Não informado', // PRONTO PARA O ERP (Bling)
        total: finalTotal, 
        method: finalTotal <= 0 ? 'saldo' : paymentMethod, 
        status: finalTotal <= 0 ? 'pago' : 'aguardando_pagamento', 
        status_nfe: 'pendente', // PRONTO PARA O ROBÔ FISCAL
        walletDiscountApplied: walletDiscount, 
        date: new Date().toISOString(), 
        items: cart.map(i => ({ id: i.id, name: i.name, qtd: i.qtd, price: getActivePrice(i) })),
        faltas: [] // Array preparado para receber futuras faltas globais
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrder);
      
      if (finalTotal <= 0) {
        await updateDoc(doc(db,"users", user.uid), { walletBalance: (user.walletBalance || 0) - walletDiscount });
        setCart([]); setIsProcessingPayment(false); setCurrentScreen('success');
        return;
      }
      
      setPendingOrder({ id: orderRef.id, ...newOrder }); 
      setCart([]); setIsProcessingPayment(false); 
      setCurrentScreen('gateway_pix'); // Direciona para o Gateway
    } catch(err) { 
      setIsProcessingPayment(false); showToast('Erro no pedido', 'error'); 
    }
  };

  const simulateMercadoPagoApproval = async () => {
    // TODO: No futuro, o Webhook do Mercado Pago chamará esta lógica no backend.
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
        // 1. Atualizar o pedido (Adicionando o item à lista de faltas sem remover do carrinho original para manter o histórico de venda)
        const orderRef = doc(db, "orders", imp.orderId);
        const orderSnap = await getDoc(orderRef);
        const orderData = orderSnap.data();
        const faltasAtualizadas = [...(orderData.faltas || []), { productId: shortagePreview.product.id, name: imp.itemData.name, refundValue: imp.refundValue }];
        await updateDoc(orderRef, { faltas: faltasAtualizadas });

        // 2. Adicionar o dinheiro na Carteira Digital do Cliente
        const userQuery = query(collection(db, "users"), where("email", "==", imp.userEmail));
        const uSnap = await getDocs(userQuery);
        if (!uSnap.empty) {
          const uDoc = uSnap.docs[0];
          await updateDoc(doc(db, "users", uDoc.id), { walletBalance: (uDoc.data().walletBalance || 0) + imp.refundValue });
        }
      }
      showToast(`Créditos gerados para ${shortagePreview.impact.length} clientes!`);
      setFaltaGlobalModal(false); setShortagePreview(null); setShortageSelectedProduct('');
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

        // 1. Processar Polos de Entrega Direta (Taubaté, etc)
        polosEntregaDireta.forEach(poloDireto => {
            const soldInPolo = validOrders.filter(o => o.polo === poloDireto).reduce((sum, o) => sum + (o.items.find(i=>i.id===p.id)?.qtd || 0), 0);
            if (soldInPolo > 0) {
                const caixasInteiras = Math.floor(soldInPolo / minBox);
                const fracionado = soldInPolo % minBox;
                
                if (caixasInteiras > 0) {
                    rows.push([poloDireto.toUpperCase(), p.sku || '-', p.name, caixasInteiras, '-', '-']);
                }
                totalSedeFracionado += fracionado; // O que não deu caixa fechada, a Sede tem que absorver e enviar pra eles
            }
        });

        // 2. Processar Polos Satélite (Sede, Jacareí, etc)
        const polosSatellite = polos.filter(polo => !polosEntregaDireta.includes(polo));
        polosSatellite.forEach(poloSat => {
            totalSatellites += validOrders.filter(o => o.polo === poloSat).reduce((sum, o) => sum + (o.items.find(i=>i.id===p.id)?.qtd || 0), 0);
        });

        // 3. A Grande Conta da Sede (Hub)
        const totalSedeNeed = totalSatellites + totalSedeFracionado;
        if (totalSedeNeed > 0 || localStockSede > 0) {
            let needToBuy = totalSedeNeed - localStockSede;
            let boxesToBuy = 0;
            let newStock = localStockSede - totalSedeNeed;

            if (needToBuy > 0) {
                boxesToBuy = Math.ceil(needToBuy / minBox);
                newStock = (boxesToBuy * minBox) - needToBuy;
            }

            if (boxesToBuy > 0 || totalSedeNeed > 0) {
                 rows.push(["SEDE SJC (HUB)", p.sku || '-', p.name, boxesToBuy, totalSedeNeed, newStock]);
            }
        }
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Pedido_Fornecedor_Inteligente_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
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
        <p className="mb-8 text-sm italic">Este documento lista exatamente o que a Sede deve carregar nas carrinhas/vans de cada polo hoje.</p>
        
        {polos.map(polo => {
          // Filtra os itens vendidos para este polo
          const itensDoPolo = {};
          validOrders.filter(o => o.polo === polo).forEach(o => {
             o.items.forEach(i => {
                if(!itensDoPolo[i.id]) itensDoPolo[i.id] = { name: i.name, qtdTotal: 0, boxSize: products.find(p=>p.id===i.id)?.minBox || 1 };
                itensDoPolo[i.id].qtdTotal += i.qtd;
             });
          });

          const itensList = Object.values(itensDoPolo).filter(i => i.qtdTotal > 0);
          if (itensList.length === 0) return null;

          const isDirect = polosEntregaDireta.includes(polo);

          return (
            <div key={polo} className="mb-10 break-inside-avoid">
               <h2 className="text-xl font-black bg-gray-200 p-2 mb-4 uppercase">🚐 Destino: {polo} {isDirect && '(Apenas Complemento Fracionado)'}</h2>
               <table className="w-full text-left text-sm border-collapse border border-gray-300">
                 <thead>
                   <tr className="bg-gray-100">
                     <th className="border border-gray-300 p-2 w-16 text-center">Check</th>
                     <th className="border border-gray-300 p-2">Produto a Embarcar</th>
                     <th className="border border-gray-300 p-2 text-center">Quantidade (UN/KG)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {itensList.map((item, idx) => {
                     // Se for entrega direta, a Sede só despacha a sobra fracionada que não formou uma caixa!
                     let qtdParaEmbarcar = item.qtdTotal;
                     if (isDirect) {
                         qtdParaEmbarcar = item.qtdTotal % item.boxSize;
                     }
                     
                     if (qtdParaEmbarcar === 0) return null; // A caixa fechada já foi pro polo via fornecedor

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

  // O WhatsApp Formatador Limpo (Sem emojis para não quebrar)
  const openWhatsApp = (phone, text) => {
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Menu Fixo Inferior (Navegação Global)
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
          <button onClick={() => setCurrentScreen('dashboard_admin')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen==='dashboard_admin'?'text-emerald-700':'text-gray-400'}`}>
            <LayoutDashboard className="w-5 h-5 mb-1" /><span className="text-[10px] font-black uppercase">Gestão</span>
          </button>
        )}
      </div>
    );
  };

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-xl border border-emerald-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-700 rounded-2xl flex items-center justify-center shadow-lg"><Leaf className="w-8 h-8 text-white" /></div>
        </div>
        <h2 className="text-3xl font-black text-center text-slate-800 tracking-tight mb-2">Clube de Compras</h2>
        <p className="text-center text-gray-500 font-medium mb-8">Saudável, direto do produtor para si.</p>
        
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Entrar</button>
          <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Criar Conta</button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && (
            <>
              <input type="text" placeholder="Nome Completo" value={loginName} onChange={e=>setLoginName(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-medium" />
              <input type="tel" placeholder="WhatsApp (DDD+Número)" value={loginWhatsapp} onChange={e=>setLoginWhatsapp(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-medium" />
              <select value={selectedPolo} onChange={e=>setSelectedPolo(e.target.value)} className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700">
                {polos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={registerRole} onChange={e=>setRegisterRole(e.target.value)} className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-700">
                <option value="cliente">Sou Cliente</option>
                <option value="representante">Sou Representante (Polo)</option>
                <option value="consolidador">Sou Gestor Geral (Sede)</option>
              </select>
              {['consolidador', 'representante'].includes(registerRole) && (
                <input type="password" placeholder="Código de Autorização Secreto" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required className="w-full bg-red-50 border border-red-200 p-4 rounded-xl outline-none focus:border-red-500 font-bold text-red-800 placeholder-red-400" />
              )}
            </>
          )}
          <input type="email" placeholder="E-mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-medium" />
          <input type="password" placeholder="Senha" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none focus:border-emerald-500 font-medium" />
          
          <button type="submit" disabled={authLoading} className="w-full bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-800 transition flex items-center justify-center">
            {authLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (authMode === 'login' ? 'Entrar' : 'Criar Minha Conta')}
          </button>
        </form>
      </div>
    </div>
  );

  const renderShop = () => {
    const filteredProducts = products.filter(p => (shopCategory === 'Todos' || p.category === shopCategory) && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const promoProducts = products.filter(p => Boolean(p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price));

    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto font-sans">
        {/* Barra de Pesquisa */}
        <div className="relative mb-6">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Procurar produtos saudáveis..." className="w-full bg-white border border-gray-200 py-4 pl-12 pr-4 rounded-2xl shadow-sm focus:outline-none focus:border-emerald-500 font-medium" />
          <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
        </div>

        {/* Carrossel de Promoções (Aparece apenas se houver promoções reais) */}
        {promoProducts.length > 0 && !searchTerm && shopCategory === 'Todos' && (
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center"><span className="text-emerald-500 mr-2 text-xl">🔥</span> Ofertas da Semana</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
              {promoProducts.map(p => {
                const discount = Math.round((1 - (p.promotionalPrice / p.price)) * 100);
                return (
                  <div key={`promo-${p.id}`} className="snap-start shrink-0 w-44 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-lg z-10">{discount}% OFF</span>
                    <div className="h-32 bg-gray-50 flex items-center justify-center p-2">
                       {p.image?.length > 5 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-5xl">{p.image || '📦'}</span>}
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <p className="text-[10px] text-gray-400 line-through mb-0.5">De R$ {p.price.toFixed(2)}</p>
                      <p className="text-xl text-slate-800 font-black leading-none mb-2">R$ {p.promotionalPrice.toFixed(2)}</p>
                      <h3 className="text-xs font-bold text-gray-600 leading-tight line-clamp-2 mb-3">{p.name}</h3>
                      <button onClick={() => {
                        const existing = cart.find(i => i.id === p.id);
                        if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
                        else setCart([...cart, { ...p, qtd: 1 }]);
                        showToast(`${p.name} adicionado!`);
                      }} className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 mt-auto">Adicionar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Categorias (Lista Suspensa Mobile) */}
        <div className="mb-6 flex justify-between items-center">
           <select value={shopCategory} onChange={e => setShopCategory(e.target.value)} className="bg-white border border-gray-200 py-2 px-4 rounded-xl font-bold text-slate-700 outline-none shadow-sm cursor-pointer">
              {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
           </select>
           <span className="text-xs font-bold text-gray-400">{filteredProducts.length} itens</span>
        </div>

        {/* Grade de Produtos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map(p => {
            const isPromo = Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price);
            const activePrice = isPromo ? p.promotionalPrice : p.price;

            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 relative">
                  {p.category && <span className="absolute top-2 left-2 text-[8px] font-black uppercase text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded tracking-widest">{p.category}</span>}
                  {p.image?.length > 5 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-6xl">{p.image || '📦'}</span>}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  {isPromo ? (
                    <div className="mb-2">
                       <span className="text-xs text-gray-400 line-through mr-1">R$ {p.price.toFixed(2)}</span>
                       <span className="text-xl sm:text-2xl text-slate-800 font-black">R$ {activePrice.toFixed(2)}</span>
                    </div>
                  ) : (
                    <p className="text-xl sm:text-2xl text-slate-800 font-black mb-2">R$ {activePrice.toFixed(2)}</p>
                  )}
                  <p className="text-[10px] text-emerald-600 font-bold mb-2 flex items-center"><Truck className="w-3 h-3 mr-1"/> Chega em breve</p>
                  <h3 className="text-xs sm:text-sm text-gray-600 font-medium leading-snug mb-4 flex-grow line-clamp-2">{p.name}</h3>
                  <button onClick={() => {
                        const existing = cart.find(i => i.id === p.id);
                        if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
                        else setCart([...cart, { ...p, qtd: 1 }]);
                        showToast(`Adicionado com sucesso!`);
                  }} className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm">Adicionar</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão de Carrinho Fixo Flutuante */}
        {cart.length > 0 && (
           <button onClick={() => setCurrentScreen('checkout')} className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-emerald-700 text-white py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 z-50 hover:bg-emerald-800 transition-transform hover:scale-105">
             <span className="bg-emerald-800 px-3 py-1 rounded-lg font-black text-sm">{cart.reduce((s,i)=>s+i.qtd,0)} itens</span>
             <span className="font-black text-lg flex items-center">Pagar R$ {cartTotal.toFixed(2)} <ArrowRight className="w-5 h-5 ml-2"/></span>
           </button>
        )}
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
          <h2 className="text-2xl font-black text-slate-800">Finalizar Compra</h2>
          <button onClick={() => setCurrentScreen('shop')} className="flex items-center text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl font-bold text-sm"><Edit2 className="w-4 h-4 mr-2" /> Editar Cesta</button>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <div className="space-y-4 mb-4">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-3 last:border-0">
                <span className="font-bold text-slate-700"><span className="text-emerald-700 mr-2">{item.qtd}x</span> {item.name}</span>
                <span className="font-bold text-gray-500">R$ {(getActivePrice(item) * item.qtd).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between text-slate-600 text-sm mb-2"><span>Subtotal</span><span>R$ {cartTotal.toFixed(2)}</span></div>
            {hasFee && <div className="flex justify-between text-orange-600 text-xs font-bold mb-2"><span>Taxa Cartão (5%)</span><span>+ R$ {feeAmount.toFixed(2)}</span></div>}
            {walletDiscount > 0 && <div className="flex justify-between text-emerald-600 text-xs font-bold mb-2"><span>Desconto Carteira</span><span>- R$ {walletDiscount.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-1">
              <span className="font-bold text-gray-400 uppercase text-xs">Total</span>
              <span className="font-black text-2xl text-slate-800">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {finalTotal > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm text-gray-500 uppercase mb-3">Como deseja pagar?</p>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-4 border-2 rounded-2xl cursor-pointer text-center transition-all ${paymentMethod==='pix'?'border-emerald-600 bg-emerald-50':'border-gray-200'}`}>
                <input type="radio" className="hidden" checked={paymentMethod==='pix'} onChange={()=>setPaymentMethod('pix')}/>
                <QrCode className={`w-8 h-8 mx-auto mb-2 ${paymentMethod==='pix'?'text-emerald-600':'text-gray-400'}`}/>
                <p className="font-bold text-slate-800 text-sm">PIX</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">Aprovação Imediata</p>
              </label>
              <label className={`p-4 border-2 rounded-2xl cursor-pointer text-center transition-all ${paymentMethod==='credit'?'border-emerald-600 bg-emerald-50':'border-gray-200'}`}>
                <input type="radio" className="hidden" checked={paymentMethod==='credit'} onChange={()=>setPaymentMethod('credit')}/>
                <CreditCard className={`w-8 h-8 mx-auto mb-2 ${paymentMethod==='credit'?'text-emerald-600':'text-gray-400'}`}/>
                <p className="font-bold text-slate-800 text-sm">Cartão</p>
                <p className="text-[10px] text-orange-500 font-bold mt-1">+5% de Taxa</p>
              </label>
            </div>
            
            {/* PRONTO PARA O BLING / ERP FISCAL */}
            <div className="mt-6">
              <p className="font-bold text-sm text-gray-500 uppercase mb-2">Nota Fiscal (Opcional)</p>
              <input type="text" placeholder="Insira o seu CPF (Apenas números)" value={checkoutCpf} onChange={e=>setCheckoutCpf(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium" />
            </div>
          </div>
        )}

        <button onClick={() => processOrder(finalTotal, paymentMethod, walletDiscount)} disabled={isProcessingPayment} className="w-full bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-800 transition text-lg flex items-center justify-center">
          {isProcessingPayment ? <Loader2 className="animate-spin w-6 h-6"/> : (finalTotal <= 0 ? 'Concluir (Usar Saldo)' : 'Gerar Pagamento Seguro')}
        </button>
      </div>
    );
  };

  const renderGatewayPix = () => (
    <div className="p-4 max-w-sm mx-auto pt-16 pb-24 text-center font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Pague via PIX</h2>
        <p className="text-sm text-gray-500 mb-6">Copie o código abaixo e pague no seu banco.</p>
        
        {/* TODO: Ligar a API do Mercado Pago aqui no futuro */}
        <div className="w-48 h-48 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center border-2 border-dashed border-gray-300">
           <QrCode className="w-16 h-16 text-gray-400 opacity-50"/>
           <span className="absolute text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded shadow-sm">QR Code Bancário</span>
        </div>

        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 mb-8 flex items-center justify-between">
            <p className="font-mono text-xs truncate text-slate-600 flex-1 text-left">00020126580014br.gov.bcb...</p>
            <button className="text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1.5 rounded-lg ml-2"><Copy className="w-3 h-3 inline mr-1"/> Copiar</button>
        </div>

        <button onClick={simulateMercadoPagoApproval} className="w-full bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-800 transition">Simular Pagamento Aprovado</button>
      </div>
    </div>
  );

  const renderMyOrders = () => {
    const myOrders = orders.filter(o => o.customer === user?.name && o.email === user?.email);
    return (
      <div className="p-4 max-w-3xl mx-auto pt-8 pb-24 font-sans">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Meus Pedidos</h2>
          <button onClick={() => setCurrentScreen('shop')} className="text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl font-bold text-sm flex items-center hover:bg-emerald-100"><ArrowLeft className="w-4 h-4 mr-2"/> Loja</button>
        </div>
        
        {/* Banner de Crédito da Carteira */}
        {(user?.walletBalance > 0) && (
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-full shadow-sm"><Wallet className="w-6 h-6 text-emerald-600"/></div>
              <div>
                <h3 className="font-black text-emerald-800 text-lg">Atenção ao seu pedido</h3>
                <p className="text-sm font-medium text-emerald-700 mt-0.5">Faltou um item. O estorno de <strong className="font-black text-emerald-900">R$ {user.walletBalance.toFixed(2)}</strong> está disponível na sua carteira para a próxima compra.</p>
              </div>
            </div>
            <button onClick={() => setPixRefundModal({ open: true, key: user.cpf || user.whatsapp || '' })} className="bg-white text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100 shadow-sm whitespace-nowrap w-full sm:w-auto">Quero receber via PIX</button>
          </div>
        )}

        <div className="space-y-6">
          {myOrders.slice().reverse().map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'aguardando_pagamento' ? 'bg-orange-400' : 'bg-emerald-500'}`}></div>
              <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                <div>
                  <p className="font-bold text-gray-400 text-xs uppercase mb-1">{order.date ? new Date(order.date).toLocaleDateString() : 'N/D'}</p>
                  <p className="font-black text-slate-800 text-lg">Pedido <span className="text-emerald-700">#{(order.id || '').slice(0, 5)}</span></p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${order.status === 'aguardando_pagamento' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                   {order.status === 'pago' ? 'Confirmado' : 'Aguardando Pagamento'}
                </span>
              </div>

              {/* Aviso de Itens Faltantes no Pedido */}
              {order.faltas && order.faltas.length > 0 && (
                 <div className="bg-orange-50 p-3 rounded-xl text-xs font-medium text-orange-800 mb-4 border border-orange-100 flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0"/>
                    <p>Infelizmente, o fornecedor não enviou: <strong className="font-bold">{order.faltas.map(f=>f.name).join(', ')}</strong>. O valor já foi creditado.</p>
                 </div>
              )}

              <div className="space-y-3 mb-6">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm text-slate-600">
                    <span className="w-8 h-8 bg-gray-50 font-black rounded-lg flex items-center justify-center mr-3 border border-gray-100">{item.qtd}x</span>
                    <span className="font-bold">{item.name}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Total Pago</span>
                <span className="font-black text-2xl text-slate-800">R$ {(order.total || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
          {myOrders.length === 0 && <p className="text-center text-gray-500 py-10 font-medium">Você ainda não fez nenhum pedido.</p>}
        </div>
      </div>
    );
  };

  const renderRepDashboard = () => {
    const viewingPolo = user?.role === 'consolidador' ? (adminTab === 'logistica_polo_view' || user?.polo || polos[0]) : user?.polo;
    
    // Filtro Robusto de Pedidos (evitando crash de dados corrompidos)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
           <div>
             <h2 className="text-3xl font-black text-slate-800">Painel Logístico</h2>
             <p className="text-sm font-bold text-emerald-600 bg-emerald-50 inline-block px-3 py-1 rounded-lg mt-2">Unidade: {viewingPolo}</p>
           </div>
           
           {/* Seletor Master para Consolidador "espionar" os polos */}
           {user?.role === 'consolidador' && (
             <select onChange={e => setAdminTab(e.target.value)} className="bg-white border border-gray-200 text-slate-700 font-bold px-4 py-2 rounded-xl outline-none shadow-sm cursor-pointer">
                {polos.map(p => <option key={p} value={p}>Ver Polo: {p}</option>)}
             </select>
           )}
        </div>

        <div className="space-y-4">
           {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => (
             <div key={month} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-gray-50 flex justify-between items-center">
                   <div>
                     <h3 className="font-black text-slate-800 text-xl capitalize">{month}</h3>
                     <p className="text-sm font-bold text-gray-500 mt-1">{data.count} pedidos • Total: R$ {data.total.toFixed(2)}</p>
                   </div>
                </div>
                <div className="p-4 space-y-3">
                   {data.orders.slice().reverse().map(o => {
                     const temFalta = o.faltas && o.faltas.length > 0;
                     return (
                       <div key={o.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                         <div>
                           <p className="font-black text-slate-800 text-lg">{o.customer}</p>
                           <p className="text-xs font-bold text-gray-400 mb-3">#{(o.id||'').slice(0,5)} • {new Date(o.date).toLocaleDateString()}</p>
                           <div className="flex flex-wrap gap-2">
                             {(o.items || []).map((i, idx) => (
                               <span key={idx} className={`text-[10px] font-bold px-2 py-1 rounded border ${o.faltas?.find(f=>f.productId===i.id) ? 'bg-red-50 text-red-700 border-red-200 line-through' : 'bg-gray-50 text-slate-600 border-gray-200'}`}>
                                 {i.qtd}x {i.name.split(' ')[0]}
                               </span>
                             ))}
                           </div>
                         </div>
                         <button onClick={() => {
                            let text = `Olá ${o.customer}! A sua caixa do Clube de Compras já está pronta para retirada no polo de ${o.polo}. O total do pedido #${o.id.slice(0,5)} é de R$ ${o.total.toFixed(2)}.`;
                            if(temFalta) text += `\n\nAviso: O fornecedor não nos entregou: ${o.faltas.map(f=>f.name).join(', ')}. Adicionamos o crédito de R$ ${o.faltas.reduce((s,f)=>s+f.refundValue,0).toFixed(2)} na sua carteira no aplicativo para a próxima compra!`;
                            openWhatsApp(o.whatsapp, text);
                         }} className="bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center hover:bg-emerald-200 transition-colors w-full md:w-auto justify-center">
                           <MessageCircle className="w-4 h-4 mr-2"/> Enviar Recibo
                         </button>
                       </div>
                     );
                   })}
                </div>
             </div>
           ))}
           {Object.keys(ordersByMonth).length === 0 && <p className="text-center text-gray-500 py-10">Nenhum pedido pago nesta unidade ainda.</p>}
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    // Filtros seguros para as métricas
    const validOrders = orders.filter(o => o.status === 'pago' && o.date);
    const totalGross = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrdersCount = validOrders.length;
    const avgTicket = totalOrdersCount > 0 ? totalGross / totalOrdersCount : 0;
    const itemsSold = validOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.qtd || 0), 0), 0);
    const pendingCredits = allUsers.reduce((sum, u) => sum + (u.pendingPixRefund || 0), 0);

    // Lógica do Top 5
    const productStats = {};
    validOrders.forEach(o => (o.items || []).forEach(i => {
      if (!productStats[i.id]) {
         const pData = products.find(p => p.id === i.id) || {};
         productStats[i.id] = { name: i.name, qty: 0, val: 0, image: pData.image || '📦' };
      }
      productStats[i.id].qty += (i.qtd || 0);
      productStats[i.id].val += ((i.price || 0) * (i.qtd || 0));
    }));
    const top5 = Object.values(productStats).sort((a,b) => b.val - a.val).slice(0, 5);

    // Lógica do Gráfico SVG (7 Dias)
    const today = new Date();
    const last7Days = Array.from({length: 7}).map((_, i) => { const d = new Date(); d.setDate(today.getDate() - (6 - i)); return d; });
    const salesData = last7Days.map(date => {
        return validOrders.filter(o => o.date && new Date(o.date).toDateString() === date.toDateString()).reduce((sum, o) => sum + (o.total || 0), 0);
    });
    const maxSale = Math.max(...salesData, 100);

    // Renderizações das Sub-Abas da Gestão
    const renderContent = () => {
      if (adminTab === 'dashboard') {
        return (
          <div className="space-y-6">
            {/* Cards de Métricas Estilo Mercado Livre */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-xs font-bold text-gray-500 mb-1">Vendas brutas</p>
                 <p className="text-2xl font-black text-slate-800">R$ {totalGross.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-xs font-bold text-gray-500 mb-1">Unidades vendidas</p>
                 <p className="text-2xl font-black text-slate-800">{itemsSold}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-xs font-bold text-gray-500 mb-1">Ticket Médio</p>
                 <p className="text-2xl font-black text-slate-800">R$ {avgTicket.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-xs font-bold text-gray-500 mb-1">Qtd. de vendas</p>
                 <p className="text-2xl font-black text-slate-800">{totalOrdersCount}</p>
              </div>
            </div>

            {/* Gráfico de Barras Moderno (Substituindo o D3 antigo que esticava) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-sm text-gray-500 mb-8">Evolução Diária (7 Dias)</h3>
               <div className="flex items-end justify-between h-48 gap-2">
                 {salesData.map((val, i) => {
                   const heightPercentage = Math.max((val / maxSale) * 100, 2); // Min 2% para ficar visível
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

            {/* Top 5 Produtos (Layout ML Correto) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-black text-lg text-slate-800 mb-6 text-center">Top 5 Produtos</h3>
              <div className="space-y-3">
                 {top5.map((item, idx) => (
                   <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden">
                         {item.image?.length > 5 ? <img src={item.image} className="w-full h-full object-cover" alt=""/> : <span>📦</span>}
                       </div>
                       <div>
                         <p className="font-black text-slate-800 text-sm">{item.name}</p>
                         <p className="text-xs font-bold text-gray-500">{item.qty} unidades vendidas</p>
                       </div>
                     </div>
                     <p className="font-black text-emerald-700 text-lg shrink-0">R$ {item.val.toFixed(2)}</p>
                   </div>
                 ))}
                 {top5.length === 0 && <p className="text-center text-gray-500 text-sm py-4">Nenhum dado de venda ainda.</p>}
              </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'compras') {
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
               <div>
                 <h2 className="text-2xl font-black text-slate-800">Inteligência de Compras</h2>
                 <p className="text-sm font-medium text-gray-500 mt-1">Cross-docking: Calcula envios diretos (Taubaté/Vila Adyana) e sobras da Sede.</p>
               </div>
               <div className="flex flex-col gap-2">
                 <button onClick={exportSupplierCSV} className="bg-emerald-700 text-white font-black px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-800 flex items-center justify-center"><Download className="w-5 h-5 mr-2"/> Pedido Fornecedor (CSV)</button>
                 <button onClick={() => setIsPrintMode(true)} className="bg-slate-800 text-white font-black px-6 py-3 rounded-xl shadow-lg hover:bg-slate-900 flex items-center justify-center"><Printer className="w-5 h-5 mr-2"/> Despacho da Sede (PDF)</button>
               </div>
            </div>
            
            {/* Visualização das Regras de Logística no Painel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                 <h4 className="font-black text-blue-900 text-sm mb-2 uppercase">🚚 Entregas Diretas</h4>
                 <p className="text-xs text-blue-800 font-medium">Os polos de <strong className="font-black">{polosEntregaDireta.join(' e ')}</strong> recebem caixas fechadas diretas do fornecedor. O fracionado vai para a Sede.</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl md:col-span-2">
                 <h4 className="font-black text-orange-900 text-sm mb-2 uppercase">🏭 A Sede (HUB)</h4>
                 <p className="text-xs text-orange-800 font-medium">A Sede junta os seus pedidos com os dos polos satélite (Jacareí, Caçapava, etc) e adiciona os fracionados dos Polos Diretos para fechar as caixas matemáticas.</p>
              </div>
            </div>
          </div>
        );
      }

      if (adminTab === 'catalogo') {
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Gestão de Catálogo</h2>
            
            {/* Upload Simulado de CSV */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div>
                 <h3 className="font-black text-blue-900">Atualização em Lote (CSV)</h3>
                 <p className="text-xs font-medium text-blue-800 mt-1">Carregue a tabela do fornecedor. O sistema lê as colunas: Código, Descrição, Categoria, Preço, Qtd. Caixa e Estoque Local.</p>
               </div>
               <label className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black cursor-pointer hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
                 <Upload className="w-4 h-4 inline mr-2"/> Subir Planilha
                 <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                    if(e.target.files[0]) showToast('Tabela em processamento... Em breve os produtos aparecerão na loja!');
                 }}/>
               </label>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               {/* Formulário Novo Produto - Adicionado campo de Stock Local e Box Size */}
               <form onSubmit={async(e) => {
                 e.preventDefault(); const fd = new FormData(e.target);
                 const pPrice = parseFloat(fd.get('promotionalPrice').replace(',','.')) || 0;
                 const np = { name: fd.get('name'), sku: fd.get('sku'), category: fd.get('category'), price: parseFloat(fd.get('price').replace(',','.')), promotionalPrice: pPrice, stock: parseInt(fd.get('stock')||'0'), minBox: parseInt(fd.get('minBox')||'1'), image: '📦' };
                 try { await addDoc(collection(db,"products"), np); setProducts([...products, {id: Date.now().toString(), ...np}]); showToast('Produto Salvo!'); e.target.reset(); } catch(er){}
               }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <input name="name" placeholder="Nome do Produto" required className="p-3 rounded-xl border border-gray-200 outline-none sm:col-span-2" />
                  <input name="sku" placeholder="SKU (Código)" required className="p-3 rounded-xl border border-gray-200 outline-none" />
                  <input name="category" placeholder="Categoria" required className="p-3 rounded-xl border border-gray-200 outline-none" />
                  <input name="price" placeholder="Preço (Ex: 15.50)" required className="p-3 rounded-xl border border-gray-200 outline-none" />
                  <input name="promotionalPrice" placeholder="Preço Promo" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 outline-none" />
                  <input name="minBox" placeholder="Qtd. Mínima Caixa" required className="p-3 rounded-xl border border-gray-200 outline-none" />
                  <input name="stock" placeholder="Estoque Local Atual" className="p-3 rounded-xl border border-orange-200 bg-orange-50 outline-none sm:col-span-2" />
                  <button type="submit" className="sm:col-span-3 bg-emerald-700 text-white font-black py-3 rounded-xl hover:bg-emerald-800">Salvar Produto</button>
               </form>
               
               <div className="space-y-2">
                 {products.map(p => (
                   <div key={p.id} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between text-sm hover:bg-gray-50">
                     <div>
                       <p className="font-bold text-slate-800">{p.name}</p>
                       <p className="text-[10px] text-gray-500">{p.sku} • Cx: {p.minBox} • Estoque: {p.stock}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="font-black text-emerald-700">R$ {p.price.toFixed(2)}</span>
                       <button onClick={()=>requestConfirm(`Apagar ${p.name}?`, ()=>{ deleteDoc(doc(db,"products",p.id)); setProducts(products.filter(x=>x.id!==p.id)); })} className="text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
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
              </div>
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200">
                <p className="text-xs font-bold text-orange-800 uppercase mb-1">Pedidos de PIX Pendentes</p>
                <p className="text-4xl font-black text-orange-600">R$ {pendingCredits.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
              <h3 className="font-black text-slate-800 mb-4">Fila de Transferências</h3>
              {estornosPendentes.length === 0 ? <p className="text-gray-500 text-sm py-4">Nenhum pedido de PIX na fila.</p> : estornosPendentes.map(u => (
                <div key={u.id} className="border border-orange-100 bg-orange-50/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 mb-3">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{u.name}</p>
                    <p className="text-sm font-bold text-gray-500 mb-2">Chave PIX Informada:</p>
                    <div className="bg-white px-4 py-2 border border-gray-200 rounded-lg inline-block font-mono font-black text-orange-700 shadow-sm">{u.pixKey}</div>
                  </div>
                  <div className="flex flex-col items-end gap-3 justify-center">
                    <span className="font-black text-orange-600 text-2xl">R$ {u.pendingPixRefund.toFixed(2)}</span>
                    <button onClick={async()=>{
                      await updateDoc(doc(db,"users",u.id), { pendingPixRefund: 0, pixKey: '' });
                      const ns = await getDocs(collection(db,"users")); setAllUsers(ns.docs.map(d=>({id:d.id, ...d.data()})));
                      showToast('Estorno Baixado!');
                    }} className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-sm hover:bg-emerald-700">Confirmar Envio</button>
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
        
        {/* Menu Lateral Inteligente (Desktop Fix / Mobile Drawer) */}
        <div className={`fixed inset-y-0 left-0 z-[70] w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
             <span className="font-black tracking-tight text-xl">Torre de Controle</span>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X className="w-6 h-6 text-gray-400"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button onClick={() => {setAdminTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold text-sm ${adminTab==='dashboard'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Dashboard ML</button>
            <button onClick={() => {setAdminTab('compras'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold text-sm ${adminTab==='compras'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Inteligência Compras</button>
            <button onClick={() => {setAdminTab('catalogo'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold text-sm ${adminTab==='catalogo'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Gestão de Catálogo</button>
            <button onClick={() => {setAdminTab('financeiro'); setIsSidebarOpen(false);}} className={`w-full text-left p-3 rounded-xl font-bold text-sm ${adminTab==='financeiro'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Financeiro & Estornos</button>
            
            <div className="mt-8 border-t border-white/10 pt-4">
              <p className="text-[10px] font-black text-gray-500 uppercase px-3 mb-2">Acesso Rápido</p>
              <button onClick={() => { setCurrentScreen('shop'); setIsSidebarOpen(false); }} className="w-full text-left p-3 rounded-xl font-bold text-sm text-emerald-400 hover:bg-white/5 flex items-center"><Store className="w-4 h-4 mr-2"/> Ir para Loja (Comprar)</button>
              <button onClick={() => { setCurrentScreen('dashboard_rep'); setIsSidebarOpen(false); }} className="w-full text-left p-3 rounded-xl font-bold text-sm text-blue-400 hover:bg-white/5 flex items-center"><Truck className="w-4 h-4 mr-2"/> Ir para Logística (Polo)</button>
            </div>
          </div>
          <div className="p-4 border-t border-white/10 shrink-0">
             <button onClick={() => setFaltaGlobalModal(true)} className="w-full bg-red-500/10 text-red-500 font-black text-sm p-4 rounded-xl border border-red-500/30 hover:bg-red-500 hover:text-white transition">⚠️ FALTA GLOBAL</button>
          </div>
        </div>

        {/* Overlay Mobile */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[65] md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Área Principal */}
        <div className="flex-1 w-full md:pl-64 flex flex-col h-screen overflow-hidden">
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 shrink-0">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden mr-4"><Menu className="w-6 h-6 text-slate-800"/></button>
            <h1 className="text-xl font-black text-slate-800">Administração</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] px-6 py-3 rounded-xl shadow-2xl font-black text-white text-sm flex items-center animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          <CheckCircle className="w-4 h-4 mr-2" /> {toast.msg}
        </div>
      )}

      {/* Modal de Confirmação Padrão */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-black text-slate-800 mb-2">Tem certeza?</h3>
            <p className="text-sm font-medium text-gray-500 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({open:false,action:null,message:''})} className="flex-1 bg-gray-100 font-bold py-3 rounded-xl">Cancelar</button>
              <button onClick={() => { confirmDialog.action(); setConfirmDialog({open:false,action:null,message:''}); }} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pedido PIX (Cliente) */}
      {pixRefundModal.open && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl">
             <h3 className="text-xl font-black text-slate-800 mb-1">Transferência PIX</h3>
             <p className="text-sm text-gray-500 mb-6">Informe a chave para receber R$ {user?.walletBalance.toFixed(2)}.</p>
             <input autoFocus value={pixRefundModal.key} onChange={e=>setPixRefundModal({...pixRefundModal,key:e.target.value})} placeholder="CPF, Celular ou E-mail" className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl outline-none font-bold mb-6" />
             <div className="flex gap-3">
               <button onClick={() => setPixRefundModal({open:false, key:''})} className="flex-1 bg-gray-100 font-bold py-3 rounded-xl">Cancelar</button>
               <button onClick={async () => {
                  if(pixRefundModal.key.length < 5) return showToast('Chave inválida', 'error');
                  await updateDoc(doc(db,"users",user.uid), { pendingPixRefund: user.walletBalance, walletBalance: 0, pixKey: pixRefundModal.key });
                  setUser({...user, pendingPixRefund: user.walletBalance, walletBalance: 0});
                  setPixRefundModal({open:false, key:''}); showToast('Estorno Solicitado!');
               }} className="flex-1 bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg">Confirmar</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Falta Global (Dropdown Seguro) */}
      {faltaGlobalModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black text-red-600">Falta Global</h3>
                <button onClick={() => {setFaltaGlobalModal(false); setShortagePreview(null);}} className="p-2 bg-gray-100 rounded-full text-gray-500"><X className="w-4 h-4"/></button>
             </div>
             
             {!shortagePreview ? (
               <div className="space-y-4">
                 <p className="text-sm font-medium text-gray-600 mb-2">Selecione o produto que o fornecedor não entregou. Nós daremos o crédito aos clientes automaticamente.</p>
                 <select value={shortageSelectedProduct} onChange={e=>setShortageSelectedProduct(e.target.value)} className="w-full bg-slate-50 border border-gray-200 p-4 rounded-xl font-bold text-slate-800 outline-none">
                    <option value="">-- Selecione o Produto --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
                 <button onClick={analyzeFaltaGlobal} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition">Analisar Impacto Financeiro</button>
               </div>
             ) : (
               <div>
                 <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6">
                    <h4 className="font-black text-orange-900 mb-2">Resumo da Operação</h4>
                    <p className="text-sm font-medium text-orange-800 mb-2">O produto <strong className="font-black">{shortagePreview.product?.name}</strong> está em <strong>{shortagePreview.impact.length}</strong> pedidos pagos.</p>
                    <p className="text-xs text-orange-700 bg-white p-3 rounded border border-orange-100 max-h-32 overflow-y-auto mb-3">
                      {shortagePreview.impact.map(i => i.customer).join(', ')}
                    </p>
                    <div className="flex justify-between items-center border-t border-orange-200 pt-3">
                       <span className="font-black text-orange-800 uppercase text-xs">Total de Créditos a Gerar:</span>
                       <span className="font-black text-xl text-orange-600">R$ {shortagePreview.totalRefund.toFixed(2)}</span>
                    </div>
                 </div>
                 <button onClick={confirmFaltaGlobal} className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-red-700">CONFIRMAR E GERAR CRÉDITOS</button>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Main App Rendering */}
      {isPrintMode ? renderDispatchPDF() : (
        <>
          {currentScreen !== 'login' && currentScreen !== 'dashboard_admin' && (
            <header className="bg-emerald-800 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm sticky top-0 z-[60]">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"><Leaf className="w-5 h-5 text-emerald-700"/></div>
                 <span className="font-black text-white text-lg hidden sm:block">Clube de Compras</span>
               </div>
               <div className="flex items-center gap-4">
                 {user?.role === 'consolidador' && <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-1 rounded uppercase shadow-sm">Gestor Master</span>}
                 <div className="hidden sm:block text-right">
                   <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
                   <p className="text-[10px] font-medium text-emerald-200">{user?.polo}</p>
                 </div>
                 <button onClick={() => {signOut(auth); setCart([]);}} className="w-10 h-10 bg-emerald-900 rounded-xl flex items-center justify-center hover:bg-emerald-950 transition"><LogOut className="w-4 h-4 text-emerald-100"/></button>
               </div>
            </header>
          )}

          <main className="pb-16 md:pb-0">
             {currentScreen === 'login' && renderLogin()}
             {currentScreen === 'shop' && renderShop()}
             {currentScreen === 'checkout' && renderCheckout()}
             {currentScreen === 'gateway_pix' && renderGatewayPix()}
             {currentScreen === 'my_orders' && renderMyOrders()}
             {currentScreen === 'dashboard_rep' && renderRepDashboard()}
             {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
             
             {currentScreen === 'success' && (
               <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-4">
                  <div className="w-24 h-24 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm"><CheckCircle className="w-12 h-12 text-emerald-600"/></div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4">Sucesso!</h2>
                  <p className="text-gray-500 font-medium mb-10 max-w-sm">O seu pedido foi confirmado. Acompanhe a entrega na aba de encomendas.</p>
                  <button onClick={()=>setCurrentScreen('my_orders')} className="bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-800 transition text-lg">Ver as Minhas Encomendas</button>
               </div>
             )}
          </main>

          <BottomNav />
        </>
      )}
    </div>
  );
}