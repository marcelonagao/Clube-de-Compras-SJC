import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Leaf, MapPin, CheckCircle, Package, 
  CreditCard, QrCode, Edit2, Trash2, ArrowLeft, ArrowRight, 
  Printer, Upload, ImageIcon, Download, Clock, MessageCircle, 
  LayoutDashboard, Eye, Wallet, Loader2, Home, Search, Menu, X, 
  LineChart, AlertTriangle, LogOut, Truck, ChevronDown, ChevronUp, FileSpreadsheet, BellRing, Users
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail} from "firebase/auth";
import { signInWithRedirect} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


// O código agora lê as chaves dinamicamente do ambiente onde está hospedado
const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim()
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

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
        
        // A MÁGICA MUDA AQUI: Em vez de texto Base64, geramos um arquivo binário (Blob) leve!
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };
    };
  });
};

export default function App() {
  const [polos, setPolos] = useState(['São José dos Campos (Sede)','Caçapava','Caraguatatuba','Cruzeiro','Guaratinguetá','Jacareí','Pindamonhangaba','Taubaté','Vila Adyana']);
  const [polosText, setPolosText] = useState(polos.join(', '));  
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [shortageSelectedOrders, setShortageSelectedOrders] = useState<Record<string, number>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);
  const [tempGoogleUser, setTempGoogleUser] = useState<any>(null);

    const [shopCategory, setShopCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false); 
  const [printLayout, setPrintLayout] = useState(null); // 'catalogo' | 'plaquinhas'
  const [storeMode, setStoreMode] = useState('mensal'); // Fases da loja: 'mensal', 'estoque', 'pausado'
  // Memória da Logística de Transferências
  const [caixasDirecionadas, setCaixasDirecionadas] = useState({});

  const [repSearchClient, setRepSearchClient] = useState('');

  const [checkoutCpf, setCheckoutCpf] = useState(''); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  const [crmSearch, setCrmSearch] = useState('');
  const [crmRoleFilter, setCrmRoleFilter] = useState('Todos');
  const [editingUser, setEditingUser] = useState(null);

  const [toast, setToast] = useState(null);
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' });
  const [faltaGlobalModal, setFaltaGlobalModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'warning' });
  const showConfirm = (title, message, onConfirm, type = 'warning') => setConfirmDialog({ open: true, title, message, onConfirm, type });
  const [shortageSelectedProduct, setShortageSelectedProduct] = useState('');
  const [shortagePreview, setShortagePreview] = useState<{ product: any, impact: any[] } | null>(null);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [purchasePlan, setPurchasePlan] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  // --- CHAVE DA FASE 1 (BETA) ---
  const CONFIG_APENAS_COLETA = true; // Mude para false no futuro para ativar o Mercado Pago!

  /// --- ESTADOS DO PEDIDO MANUAL (REP) ---
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [repTab, setRepTab] = useState('separar'); // 'separar' | 'retirada' | 'historico'
  const [manualClientWhatsapp, setManualClientWhatsapp] = useState('');
  const [manualCart, setManualCart] = useState([]); // Agora é um mini-carrinho!
  const [manualItemProduct, setManualItemProduct] = useState('');
  const [manualItemQty, setManualItemQty] = useState(1);

  const [expandedCatalogCats, setExpandedCatalogCats] = useState({});

  const [manualDeliveryDate, setManualDeliveryDate] = useState('');
  const [manualSelectedPolo, setManualSelectedPolo] = useState('');
  const [dashCycleFilter, setDashCycleFilter] = useState('Ciclo Mensal');
  const [showMassNotify, setShowMassNotify] = useState(false);
  const [editCart, setEditCart] = useState([]);
  const [editItemProduct, setEditItemProduct] = useState('');

  const [expressModalOpen, setExpressModalOpen] = useState(false);
  const [expressQty, setExpressQty] = useState(1);
  const [valorRecebido, setValorRecebido] = useState('');

// Puxa o nome da unidade da Vercel, ou usa um nome genérico como segurança
 const nomeUnidade = import.meta.env.VITE_CLUB_NAME || "Clube de Compras";
  

  // --- O CÉREBRO: CONFIGURAÇÕES GLOBAIS VINDAS DO FIREBASE ---
  const [sysConfig, setSysConfig] = useState({
    mesReferencia: "Julho/2026",
    loteMensal: "Ciclo Mensal - Julho",
    dataCorte: "31/07 às 14:00hs", // 👈 ADICIONE ESTA LINHA
    ofertaAtiva: false,
    ofertaTitulo: "🚨 OFERTA RELÂMPAGO",
    ofertaProduto: "Bandeja de Ovos Jumbo (30 un)",
    ofertaPreco: 25.35,
    ofertaEntrega: "30/06 - Ovos"
  });

  // A PONTE MÁGICA: Conecta o Firebase ao resto do seu sistema automaticamente!
  const mesReferenciaGlobal = sysConfig.mesReferencia;
  const cicloMensalAtivo = {
    dataEntrega: sysConfig.loteMensal, 
    mesReferencia: sysConfig.mesReferencia 
  };
  const campanhaAtiva = {
    ativo: sysConfig.ofertaAtiva, 
    titulo: sysConfig.ofertaTitulo,
    produtoNome: sysConfig.ofertaProduto,
    preco: Number(sysConfig.ofertaPreco), 
    dataEntrega: sysConfig.ofertaEntrega, 
    mesReferencia: sysConfig.mesReferencia, 
    cor: "bg-red-600"
  };

  const [repModalOpen, setRepModalOpen] = useState(false);
  const [repManualCustomer, setRepManualCustomer] = useState('');
  const [repManualItems, setRepManualItems] = useState([]);
  const [mesaDateFilter, setMesaDateFilter] = useState('Todos');
  const [vendasSearchTerm, setVendasSearchTerm] = useState('');

  const [itensVendidosSearch, setItensVendidosSearch] = useState('');
  const [expandedProductReport, setExpandedProductReport] = useState({});

  const [expandedPolos, setExpandedPolos] = useState({}); 
  const [editingAdminOrder, setEditingAdminOrder] = useState(null);
  const [vendasStartDate, setVendasStartDate] = useState('');
  const [vendasEndDate, setVendasEndDate] = useState('');
  
  

  const userRoleStr = String(user?.role || '').trim().toLowerCase();
  const isGestor = userRoleStr === 'consolidador';
  const isRep = userRoleStr === 'representante';
  const isPDV = userRoleStr === 'pdv'; // 👈 NOVA LINHA DO CAIXA
  const isAdminOrRep = isGestor || isRep; // (Mantemos assim para ele focar só na loja)

  const activeCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort()];
  const getActivePrice = (p) => (p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price) ? p.promotionalPrice : p.price;
  const cartTotal = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (userDoc.exists() && userDoc.data().polo) {
          // Usuário existe e tem os dados completos. Pode entrar na loja!
          const userData = userDoc.data();
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });
          setCurrentScreen('shop');
        } else {
          // INTERCEPTADOR: Logou com Google, mas não tem cadastro no banco de dados!
          setTempGoogleUser(firebaseUser);
          setAuthMode('complete_google');
          setCurrentScreen('login');
        }
      } else {
        setUser(null);
        setCurrentScreen('login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. MOTOR DE DADOS EM TEMPO REAL (O que estanca as milhares de leituras)
  useEffect(() => {
    if (!user) return; // Só abre o canal com o banco se o usuário estiver logado
  
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
        setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  
    const unsubConfig = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if(docSnap.exists()) {
            const cData = docSnap.data();
            if(cData.storeMode) setStoreMode(cData.storeMode);
            if(cData.sysConfig) setSysConfig(cData.sysConfig); 
            // 👇 A MÁGICA DE LER OS POLOS DO BANCO 👇
            if(cData.polos) {
                setPolos(cData.polos);
                setPolosText(cData.polos.join(', '));
            }
        }
    });
  
    // Função de Limpeza: Desliga tudo se o usuário sair
    return () => { unsubProducts(); unsubOrders(); unsubUsers(); unsubConfig(); };
  }, [user]);

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
        if (registerRole === 'pdv' && secretCode !== 'CAIXA2024') throw new Error('Código de Caixa Inválido'); // 👈 NOVA LINHA
        
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

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      return showToast('Digite seu e-mail no campo acima para recuperar a senha.', 'error');
    }
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      showToast('Erro ao enviar e-mail. Verifique se o endereço está correto.', 'error');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // 👇 MUDANÇA AQUI: Trocamos Redirect por Popup!
      await signInWithPopup(auth, provider);
      
    } catch (err) {
      // Agora o erro COMPLETO com todos os detalhes vai explodir no seu console (F12)
      console.error("=== ERRO COMPLETO GOOGLE ===", err); 
      console.error("Código:", err.code);
      console.error("Mensagem:", err.message);
      
      if (err.code !== 'auth/popup-closed-by-user') {
        // Exibe a mensagem de erro real no Toast para você ler na tela
        showToast(`Erro: ${err.message}`, 'error');
      }
      setAuthLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        if (registerRole === 'consolidador' && secretCode !== 'GESTOR2024') throw new Error('Código Master Inválido');
        if (registerRole === 'representante' && secretCode !== 'REP2024') throw new Error('Código Rep Inválido');
        if (registerRole === 'pdv' && secretCode !== 'CAIXA2024') throw new Error('Código de Caixa Inválido'); // 👈 NOVA LINHA

        // Cria o perfil no Banco de Dados combinando os dados do Google + o que ele preencheu agora
        const profile = { 
            name: tempGoogleUser.displayName || loginName || 'Membro do Clube', 
            email: tempGoogleUser.email, 
            whatsapp: loginWhatsapp, 
            polo: selectedPolo, 
            role: registerRole, 
            walletBalance: 0, 
            pendingPixRefund: 0, 
            pixKey: '' 
        };
        
        await setDoc(doc(db, "users", tempGoogleUser.uid), profile);
        setUser({ uid: tempGoogleUser.uid, ...profile });
        setCurrentScreen('shop');
        showToast('Cadastro concluído com sucesso!');
    } catch (err) {
        showToast(err.message.includes('Código') ? err.message : 'Verifique os dados informados.', 'error');
    }
    setAuthLoading(false);
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
        deliveryDate: cicloMensalAtivo.dataEntrega, // 👈 ADICIONA ISTO (Lote da Logística)
        cicloFinanceiro: cicloMensalAtivo.mesReferencia, // 👈 ADICIONA ISTO (Lote do Financeiro)
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
        if (walletDiscount > 0) {
            await updateDoc(doc(db,"users", user.uid), { walletBalance: Math.max(0, (user.walletBalance || 0) - walletDiscount) });
            setUser(prev => ({...prev, walletBalance: Math.max(0, (prev.walletBalance || 0) - walletDiscount)})); 
        }

        // 👇 MÁGICA DO ESTOQUE RESTAURADA 👇
        if (storeMode === 'estoque' || storeMode === 'pronta_entrega') {
            for (const item of cart) {
                const prodRef = doc(db, "products", item.id);
                const prodDoc = await getDoc(prodRef);
      if (prodDoc.exists()) {
        const estoqueAtual = prodDoc.data().stock || 0;
        await updateDoc(prodRef, { stock: Math.max(0, estoqueAtual - item.qtd) });
            }
            }
        }
        // 👆 FIM DA MÁGICA 👆

        setCart([]); 
        setIsProcessingPayment(false); 
        setPendingOrder({ id: orderRef.id }); // Restaura a Senha Gigante!
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

  // 👇 FUNÇÃO EXCLUSIVA DA FRENTE DE CAIXA (PDV) 👇
  const processPDVOrder = async (finalTotal) => {
    setIsProcessingPayment(true);
    try {
      const pdvOrder = { 
        customer: `Venda Balcão (JC: ${user?.polo || polos[0]})`, 
        email: user?.email || '', 
        whatsapp: '00000000000', 
        polo: user?.polo || polos[0], 
        cpf: 'Não informado',
        total: finalTotal, 
        method: 'dinheiro/pix_local', 
        
        // Pula a esteira logística!
        status: 'pago_polo', 
        separado: true,
        entregue: true,
        
        status_nfe: 'pendente',
        date: new Date().toISOString(), 
        deliveryDate: cicloMensalAtivo.dataEntrega, 
        cicloFinanceiro: cicloMensalAtivo.mesReferencia, 
        items: cart.map(i => ({ id: i.id, name: i.name, qtd: i.qtd, qty: i.qtd, price: getActivePrice(i) })),
        faltas: []
      };

      // Baixa no estoque na hora
      if (storeMode === 'estoque' || storeMode === 'pronta_entrega') {
        for (const item of cart) {
            const prodRef = doc(db, "products", item.id);
            const prodDoc = await getDoc(prodRef);
            if (prodDoc.exists()) {
                const estoqueAtual = prodDoc.data().stock || 0;
                await updateDoc(prodRef, { stock: Math.max(0, estoqueAtual - item.qtd) });
            }
        }
      }

      await addDoc(collection(db, "orders"), pdvOrder);
      
      setCart([]); 
      setIsProcessingPayment(false); 
      showToast('Venda registrada no Caixa com sucesso!', 'success');
      setCurrentScreen('shop'); // O PDV volta direto pra vitrine pra próxima venda!
    } catch(err) { 
      setIsProcessingPayment(false); 
      showToast('Erro ao registrar venda', 'error'); 
    }
  };

  const handleExpressCheckout = async () => {
    setIsProcessingPayment(true);
    const total = campanhaAtiva.preco * expressQty;

    const expressOrder = {
        customer: user?.name || 'Cliente',
        email: user?.email || '',
        whatsapp: user?.whatsapp || '',
        polo: user?.polo || polos[0],
        cpf: 'Não informado',
        total: total,
        method: 'pix',
        status: CONFIG_APENAS_COLETA ? 'confirmado' : 'aguardando_pagamento',
        status_nfe: 'pendente',
        date: new Date().toISOString(),
        deliveryDate: campanhaAtiva.dataEntrega, // Etiqueta da Van
        cicloFinanceiro: campanhaAtiva.mesReferencia, // Etiqueta do Dashboard
        items: [{ id: 'oferta-1', name: campanhaAtiva.produtoNome, price: campanhaAtiva.preco, qtd: expressQty, qty: expressQty }],
        faltas: []
    };

    try {
        await addDoc(collection(db, "orders"), expressOrder);
        showToast('Pedido Expresso Confirmado!', 'success');
        setExpressModalOpen(false);
        setExpressQty(1);
        setIsProcessingPayment(false);
        setCurrentScreen('my_orders'); // Atira o cliente direto para ver o recibo
    } catch (error) {
        showToast('Erro ao processar pedido.', 'error');
        setIsProcessingPayment(false);
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
    
    // Filtro travado no ciclo financeiro atual
    const ordersToUpdate = orders.filter(o => {
       const ciclo = o.cicloFinanceiro || 'Julho/2026';
       const ehDoCicloAtual = ciclo === sysConfig.mesReferencia;
       
       return ehDoCicloAtual && 
              ['confirmado', 'pago_polo', 'pago'].includes(o.status) && 
              (o.items || []).some(i => String(i.id) === String(shortageSelectedProduct));
    });
    
    if (ordersToUpdate.length === 0) return showToast('Nenhum pedido deste ciclo contém este item.', 'error');
    
    const impact = ordersToUpdate.map(order => {
       const item = order.items.find(i => String(i.id) === String(shortageSelectedProduct));
       const quantidade = item.qtd || item.qty;
       return { 
           orderId: order.id, customer: order.customer, userEmail: order.email, 
           itemPrice: (item.price || 0), maxQty: quantidade, itemData: item, polo: order.polo 
       };
    });
    
    // O sistema ainda marca a falta total por padrão para agilizar, mas agora você pode diminuir!
    const initialSelections = {};
    impact.forEach(imp => { initialSelections[imp.orderId] = imp.maxQty; });

    setShortagePreview({ 
      product: products.find(p => String(p.id) === String(shortageSelectedProduct)), 
      impact 
    });
    setShortageSelectedOrders(initialSelections);
  };

  const confirmFaltaGlobal = async () => {
    const selectedImpacts = shortagePreview.impact.filter(imp => (shortageSelectedOrders[imp.orderId] || 0) > 0);
    if (selectedImpacts.length === 0) return showToast('Selecione pelo menos um membro para aplicar a falta.', 'error');

    showConfirm('Confirmar Corte', `Você está prestes a aplicar a falta em ${selectedImpacts.length} membro(s). O sistema abaterá o valor automaticamente da cobrança deles. Deseja continuar?`, async () => {
        try {
          for (const imp of selectedImpacts) {
            const qtyToRemove = shortageSelectedOrders[imp.orderId];
            const refundValue = qtyToRemove * imp.itemPrice;
            const orderRef = doc(db, "orders", imp.orderId);
            const orderDoc = await getDoc(orderRef);
            
            if (orderDoc.exists()) {
              const oData = orderDoc.data();
              const updatedItems = oData.items.map(i => {
                  if (String(i.id) === String(shortagePreview.product.id)) {
                      const currentQty = i.qtd || i.qty || 1;
                      return { ...i, qtd: currentQty - qtyToRemove, qty: currentQty - qtyToRemove };
                  }
                  return i;
              }).filter(i => (i.qtd || i.qty) > 0);

              const newFaltas = [...(oData.faltas || []), { productId: shortagePreview.product.id, name: shortagePreview.product.name, value: refundValue, qtyMissing: qtyToRemove }];
              const newTotal = oData.total - refundValue;
              
              await updateDoc(orderRef, { items: updatedItems, faltas: newFaltas, total: newTotal > 0 ? newTotal : 0 });
            }
          }
          
          showToast(`Falta aplicada com sucesso!`);
          setShortageSelectedProduct('');
          setShortagePreview(null);
          setShortageSelectedOrders({});
          // A linha "fetchData();" que causava o erro falso foi removida daqui!
          
        } catch (e) { 
          console.error("Erro real na falta global:", e);
          showToast('Erro ao aplicar falta global', 'error'); 
        }
    });
  };
  
  const desfazerFaltaGlobal = async (productIdToUndo) => {
    if (!productIdToUndo) return showToast('Selecione um produto para desfazer a falta.', 'error');

    // 1. Encontra todos os pedidos do ciclo atual que possuem este produto marcado como falta
    const ordersToFix = orders.filter(o => {
       const ciclo = o.cicloFinanceiro || 'Julho/2026';
       const ehDoCicloAtual = ciclo === sysConfig.mesReferencia;
       
       return ehDoCicloAtual && 
              (o.faltas || []).some(f => String(f.productId) === String(productIdToUndo));
    });
    
    if (ordersToFix.length === 0) return showToast('Nenhum pedido deste ciclo possui falta registrada para este item.', 'error');

    showConfirm('Desfazer Corte (Re-incluir Produto)', `Você está prestes a DEVOLVER este produto para ${ordersToFix.length} membro(s). O valor será somado novamente ao total a pagar deles. Deseja continuar?`, async () => {
        try {
          for (const order of ordersToFix) {
            const orderRef = doc(db, "orders", order.id);
            const orderDoc = await getDoc(orderRef);
            
            if (orderDoc.exists()) {
              const oData = orderDoc.data();
              
              // Localiza a falta específica que precisa ser revertida
              const faltaParaDesfazer = (oData.faltas || []).find(f => String(f.productId) === String(productIdToUndo));
              if (!faltaParaDesfazer) continue;

              const qtyRestaurar = faltaParaDesfazer.qtyMissing || 1;
              // Pega o valor total da falta (ou refundValue, dependendo de como foi salvo)
              const valorRestaurar = faltaParaDesfazer.value || faltaParaDesfazer.refundValue || 0; 
              const precoUnitarioOriginal = valorRestaurar / qtyRestaurar;

              // 2. Atualizar array de itens (Devolver o produto)
              let updatedItems = [...(oData.items || [])];
              const itemIndex = updatedItems.findIndex(i => String(i.id) === String(productIdToUndo));

              if (itemIndex >= 0) {
                  // O item ainda existe na sacola (foi corte parcial), apenas devolvemos a quantidade
                  updatedItems[itemIndex].qtd = (updatedItems[itemIndex].qtd || 0) + qtyRestaurar;
                  updatedItems[itemIndex].qty = (updatedItems[itemIndex].qty || 0) + qtyRestaurar;
              } else {
                  // O item havia sido 100% cortado, precisamos recriá-lo na sacola
                  updatedItems.push({
                      id: productIdToUndo,
                      name: faltaParaDesfazer.name,
                      price: precoUnitarioOriginal,
                      qtd: qtyRestaurar,
                      qty: qtyRestaurar
                  });
              }

              // 3. Remover o produto do array de faltas
              const newFaltas = (oData.faltas || []).filter(f => String(f.productId) !== String(productIdToUndo));
              
              // 4. Reajustar o Total (Somar o valor de volta)
              const newTotal = (oData.total || 0) + valorRestaurar;
              
              await updateDoc(orderRef, { 
                  items: updatedItems, 
                  faltas: newFaltas, 
                  total: newTotal 
              });
            }
          }
          
          showToast(`Falta desfeita com sucesso! Produtos devolvidos às sacolas.`);
          setShortageSelectedProduct(''); // Limpa a seleção
          setShortagePreview(null);
          
        } catch (e) { 
          console.error("Erro ao desfazer falta global:", e);
          showToast('Erro ao re-incluir produtos', 'error'); 
        }
    });
  };

  const generatePurchasePlan = () => {
    const validOrders = orders.filter(o => {
        const etiquetaDoPedido = o.deliveryDate || 'Ciclo Mensal';
        const cicloDoPedido = o.cicloFinanceiro || 'Julho/2026';
        
        // 👇 A TRAVA DO MÊS ENTRA AQUI (Substituindo a regra velha de 30 dias) 👇
        const ehDoCicloAtual = cicloDoPedido === sysConfig.mesReferencia;

        return o.status === (CONFIG_APENAS_COLETA ? 'confirmado' : 'pago') && 
               ehDoCicloAtual && 
               (mesaDateFilter === 'Todos' || etiquetaDoPedido === mesaDateFilter);
    });

    const plan = [];
    products.forEach(p => {
        const minBox = p.minBox || 1;
        const localStockSede = p.stock || 0;
        
        // 1. Calcula a Demanda Individual por Polo
        const demandByPolo = {};
        polos.forEach(polo => demandByPolo[polo] = 0);
        validOrders.forEach(o => {
            const item = o.items?.find(i => String(i.id) === String(p.id));
            if (item) demandByPolo[o.polo] += (item.qtd || item.qty || 0);
        });

        // 2. Agrupamento de Rotas Diretas
        const rotasDiretas = [
            { nomeDisplay: 'Taubaté + Pinda', polosFisicos: ['Taubaté', 'Pindamonhangaba'], nomePlanilha: 'TAUBATÉ' },
            { nomeDisplay: 'Vila Adyana', polosFisicos: ['Vila Adyana'], nomePlanilha: 'VILA ADYANA' }
        ];

        const demandaRotas = rotasDiretas.map(rota => ({
            ...rota,
            demandaAgrupada: rota.polosFisicos.reduce((sum, polo) => sum + demandByPolo[polo], 0)
        }));

        const polosRotasFisicos = rotasDiretas.flatMap(r => r.polosFisicos);
        
        let totalSatellites = 0;
        polos.forEach(polo => {
            if (!polosRotasFisicos.includes(polo)) {
                totalSatellites += demandByPolo[polo];
            }
        });

        // 3. MÁGICA DE PRIORIDADE: Consumir Estoque Local Antes de Comprar!
        const totalDemandGeral = demandaRotas.reduce((sum, r) => sum + r.demandaAgrupada, 0) + totalSatellites;
        
        let boxesToBuyTotal = 0;
        const totalFaltante = totalDemandGeral - localStockSede; 
        
        if (totalFaltante > 0) {
            boxesToBuyTotal = Math.ceil(totalFaltante / minBox); 
        }

        let caixasDisponiveisParaDistribuir = boxesToBuyTotal;
        let totalSedeNeed = 0;
        const crossDockingDetails = [];

        // 4. Distribuição das caixas (AGORA COM CORTE EXATO)
        demandaRotas.sort((a, b) => b.demandaAgrupada - a.demandaAgrupada).forEach(rota => {
            if (rota.demandaAgrupada > 0) {
                // 👇 A NOVA REGRA AQUI 👇
                // Math.floor pega apenas a quantidade inteira de caixas que cabem no pedido.
                // Ex: Pediram 25, caixa é 10. (25/10) = 2.5. O Math.floor transforma em 2 caixas exatas.
                const caixasIdeais = Math.floor(rota.demandaAgrupada / minBox);
                
                // Só envia se a Sede precisou comprar caixas
                const caixasEnviadas = Math.min(caixasIdeais, caixasDisponiveisParaDistribuir);

                if (caixasEnviadas > 0) {
                    crossDockingDetails.push({ 
                        polo: rota.nomeDisplay, 
                        planilha: rota.nomePlanilha, 
                        boxes: caixasEnviadas 
                    });
                    caixasDisponiveisParaDistribuir -= caixasEnviadas; 
                }
                
                // Os itens que "faltaram" para completar o pedido do polo caem automaticamente 
                // para a Sede separar na sacola, junto com a demanda dos outros polos!
                const cobertoPorCaixas = caixasEnviadas * minBox;
                totalSedeNeed += (rota.demandaAgrupada - cobertoPorCaixas);
            }
        });

        totalSedeNeed += totalSatellites;

        // O que sobrou das caixas compradas que não foram enviadas diretas fica com a Sede
        const boxesToBuySede = caixasDisponiveisParaDistribuir;

        if (totalDemandGeral > 0 || localStockSede > 0) {
            plan.push({
                id: p.id, sku: p.sku || '-', name: p.name, minBox, stock: localStockSede,
                demandSede: totalSedeNeed, demandCross: crossDockingDetails, boxesToBuy: boxesToBuySede
            });
        }
    });
    
    setPurchasePlan(plan.sort((a,b) => a.name.localeCompare(b.name)));
  };

  const confirmAndExportPurchasePlan = async () => {
    if (!purchasePlan) return;
    const rows = [["LOCAL DESCARGA", "SKU", "PRODUTO", "CAIXAS FECHADAS", "QTDE FRACIONADA USADA", "ESTOQUE FINAL PREVISTO"]];

    for (const item of purchasePlan) {
        // As caixas inteiras vão direto para as Rotas agrupadas (Pinda cai em Taubaté)
        item.demandCross.forEach(cd => {
            rows.push([cd.planilha, item.sku, item.name, cd.boxes, '-', '-']);
        });

        // Calcula a Nova Sobra após as edições manuais
        const newStock = (item.stock + (item.boxesToBuy * item.minBox)) - item.demandSede;

        // Manda comprar as caixas para a HUB
        if (item.boxesToBuy > 0 || item.demandSede > 0) {
            rows.push(["SEDE SJC (HUB)", item.sku, item.name, item.boxesToBuy, item.demandSede, newStock]);
        }
        
        // MÁGICA: Atualiza o catálogo automaticamente com a sobra nova!
        if (item.stock !== newStock) {
           try { await updateDoc(doc(db, "products", item.id), { stock: newStock > 0 ? newStock : 0 });
           } catch (e) {}
        }
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Pedido_Fornecedor_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    link.click();
    
    showToast('CSV Exportado e Estoque Atualizado!');
    setPurchasePlan(null); 
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
               const price = parseFloat(cols[3]?.trim().replace('R$', '').replace(',', '.')) || 0;
               // NOVAS COLUNAS SENDO LIDAS AQUI:
               const cost = cols[4] ? parseFloat(cols[4].trim().replace('R$', '').replace(',', '.')) || 0 : 0;
               const minBox = cols[5] ? parseInt(cols[5].trim()) || 1 : 1;
               
               if(sku && name && !isNaN(price)){
                  const existing = products.find(p => p.sku === sku);
                  const productData = { 
                     sku, name, category: cat || 'Geral', price, cost, minBox
                  };
                  
                  if (existing) {
                      await updateDoc(doc(db,"products", existing.id), productData);
                  } else {
                      await addDoc(collection(db,"products"), { ...productData, stock: 0, image: '📦' });
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
    const filteredProducts = products.filter(p => !p.pausado && (shopCategory === 'Todos' || p.category === shopCategory) && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
    const promoProducts = products.filter(p => !p.pausado && Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price));

    return (
      <div className="pb-32 bg-[#ebebeb] min-h-screen font-sans">
        
        {/* HEADER ESTILO E-COMMERCE (Substitui o topo antigo) */}
        <div className="bg-emerald-700 px-4 pt-4 pb-5 shadow-sm">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center text-[11px] font-medium text-white/90 bg-black/10 px-2.5 py-1 rounded-full">
                     <MapPin className="w-3 h-3 mr-1" /> Enviar para: <span className="ml-1 font-semibold text-white truncate max-w-[120px] sm:max-w-[200px]">{user?.polo || polos[0]}</span>
                   </div>
                   
                   {user?.walletBalance > 0 && (
                     <div className="flex items-center text-[11px] font-medium text-white/90 bg-black/10 px-2.5 py-1 rounded-full">
                       <Wallet className="w-3 h-3 mr-1" /> Saldo: <span className="ml-1 font-semibold text-white">R$ {user.walletBalance.toFixed(2)}</span>
                     </div>
                   )}
                </div>

                <div className="flex items-center bg-white rounded-full px-4 py-2.5 shadow-sm w-full">
                    <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0"/>
                    <input 
                        type="text" 
                        placeholder="Buscar produtos, marcas e muito mais…" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder-gray-400 font-normal"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 p-1">
                            <X className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-4">
            
            {/* CATEGORIAS (Pílulas Minimalistas) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
              {activeCategories.map(cat => (
                 <button key={cat} onClick={() => setShopCategory(cat)} className={`px-4 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors border ${shopCategory === cat ? 'bg-slate-800 text-white border-slate-800 font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 font-medium'}`}>
                    {cat}
                 </button>
              ))}
            </div>

            {/* BANNERS AVISOS */}
            {campanhaAtiva.ativo && storeMode !== 'pausado' && !searchTerm && shopCategory === 'Todos' && (
              <div onClick={() => setExpressModalOpen(true)} className={`${campanhaAtiva.cor} rounded-xl p-4 mb-6 text-white shadow-sm cursor-pointer transform transition hover:-translate-y-0.5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/20`}>
                <div>
                   <h3 className="text-lg font-bold mb-0.5">{campanhaAtiva.titulo}</h3>
                   <p className="font-normal text-sm text-white/90">Aproveite: <span className="font-semibold">{campanhaAtiva.produtoNome}</span></p>
                </div>
                <button className="bg-white text-red-600 font-semibold px-6 py-2 rounded-lg shadow-sm hover:bg-gray-50 whitespace-nowrap w-full sm:w-auto text-sm">
                   Ver Oferta
                </button>
              </div>
            )}

            {storeMode === 'estoque' && (
               <div className="bg-white border-l-4 border-orange-500 p-4 rounded-lg mb-6 shadow-sm flex items-start gap-3">
                  <Package className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                     <h4 className="font-semibold text-slate-800 text-sm mb-0.5">Pronta Entrega Ativada</h4>
                     <p className="text-xs text-gray-500 font-normal leading-snug">Mostrando apenas itens disponíveis no estoque local para retirada imediata.</p>
                  </div>
               </div>
            )}

            {storeMode === 'pausado' && (
               <div className="bg-white border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-sm flex items-start gap-3">
                  <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                     <h4 className="font-semibold text-slate-800 text-sm mb-0.5">Vitrine Fechada</h4>
                     <p className="text-xs text-gray-500 font-normal leading-snug">Estamos em balanço. Prepare sua lista para o próximo ciclo de encomendas.</p>
                  </div>
               </div>
            )}

            {/* PRODUTOS EM DESTAQUE (Carrossel Horizontal) */}
            {promoProducts.length > 0 && !searchTerm && shopCategory === 'Todos' && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-lg font-medium text-slate-800">Ofertas da semana</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x">
                {promoProducts.map(p => {
                    const discount = Math.round((1 - (p.promotionalPrice / p.price)) * 100);
                    const isOutOfStock = storeMode === 'estoque' && (p.stock || 0) <= 0;
                    const isPaused = storeMode === 'pausado';
                    const cartItem = cart.find(i => i.id === p.id);
                    
                    return (
                      <div key={`promo-${p.id}`} className={`snap-start shrink-0 w-40 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group ${(isOutOfStock && !cartItem) ? 'opacity-60' : ''}`}>
                        <div className="aspect-square bg-white flex items-center justify-center p-2 relative border-b border-gray-50">
                           {p.image?.length > 50 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-4xl text-gray-200">📦</span>}
                        </div>
                        <div className="p-3 flex flex-col flex-grow text-left">
                          <span className="text-[10px] text-gray-400 line-through mb-0.5">R$ {p.price.toFixed(2)}</span>
                          <div className="flex items-center gap-1.5 mb-1.5">
                             <span className="text-lg text-slate-800 font-medium leading-none">R$ {p.promotionalPrice.toFixed(2)}</span>
                             <span className="text-[10px] font-medium text-emerald-500 leading-none">{discount}% OFF</span>
                          </div>
                          <h3 className="text-xs font-normal text-gray-500 leading-snug mb-3 line-clamp-2 flex-grow">{p.name}</h3>
                          
                          {isPaused ? (
                              <button disabled className="w-full bg-gray-100 text-gray-400 py-2 rounded font-semibold text-[11px] cursor-not-allowed uppercase tracking-wider">Pausado</button>
                          ) : (isOutOfStock && !cartItem) ? (
                              <button disabled className="w-full bg-red-50 text-red-500 py-2 rounded font-semibold text-[11px] cursor-not-allowed uppercase tracking-wider">Esgotado</button>
                          ) : cartItem ? (
                              <div className="flex items-center justify-between bg-white border border-emerald-500 rounded overflow-hidden h-8 shadow-sm">
                                 <button onClick={() => handleDecreaseFromCart(p.id)} className="w-8 h-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 font-medium text-lg transition-colors">-</button>
                                 <span className="font-semibold text-slate-800 text-xs">{cartItem.qtd}</span>
                                 <button onClick={() => handleAddToCart(p)} className="w-8 h-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 font-medium text-lg transition-colors">+</button>
                              </div>
                          ) : (
                              <button onClick={() => handleAddToCart(p)} className="w-full bg-emerald-100 text-emerald-800 py-2 rounded font-semibold text-[11px] hover:bg-emerald-200 transition-colors shadow-sm">Adicionar</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

           {/* GRADE PRINCIPAL DE PRODUTOS */}
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map(p => {
                const isPromo = Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price);
                const activePrice = isPromo ? p.promotionalPrice : p.price;
                const isOutOfStock = storeMode === 'estoque' && (p.stock || 0) <= 0;
                const isPaused = storeMode === 'pausado';
                const cartItem = cart.find(i => i.id === p.id);
                
                return (
                  <div key={p.id} className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden border border-gray-100/80 ${(isOutOfStock && !cartItem) ? 'opacity-60' : ''}`}>
                    <div className="aspect-square bg-white flex items-center justify-center p-3 relative shrink-0 border-b border-gray-50">
                      {isPromo && <span className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-[9px] font-semibold px-1.5 py-0.5 rounded z-10">{Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF</span>}
                      {p.image?.length > 50 ? <img src={p.image} className="h-full w-full object-contain mix-blend-multiply" alt=""/> : <span className="text-3xl text-gray-200">📦</span>}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-grow">
                      {/* Preço e Desconto em Destaque */}
                      <div className="flex flex-col mb-1 shrink-0">
                          {isPromo ? (
                            <>
                               <span className="text-[10px] text-gray-400 line-through font-normal leading-none mb-0.5">R$ {p.price.toFixed(2)}</span>
                               <div className="flex items-center gap-1.5">
                                   <span className="text-xl text-slate-800 font-medium leading-none">R$ {activePrice.toFixed(2)}</span>
                                   <span className="text-[10px] font-medium text-emerald-500 leading-none">{Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF</span>
                               </div>
                            </>
                          ) : (
                            <span className="text-xl text-slate-800 font-medium leading-none">R$ {activePrice.toFixed(2)}</span>
                          )}
                      </div>
                      
                      {storeMode === 'estoque' && (p.stock > 0) && (
                          <p className="text-[10px] font-medium text-emerald-600 mb-1 leading-none">Disponível no Polo</p>
                      )}

                      {/* Nome do Produto Menos Destacado */}
                      <h3 className="text-[13px] text-gray-600 font-normal leading-tight mb-3 flex-grow line-clamp-2">{p.name}</h3>
                      
                      {isPaused ? (
                          <button disabled className="w-full bg-gray-100 text-gray-400 py-2 rounded font-semibold text-[11px] cursor-not-allowed mt-auto uppercase tracking-wider">Pausado</button>
                      ) : (isOutOfStock && !cartItem) ? (
                          <button disabled className="w-full bg-red-50 text-red-500 py-2 rounded font-semibold text-[11px] cursor-not-allowed mt-auto uppercase tracking-wider">Esgotado</button>
                      ) : cartItem ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded overflow-hidden mt-auto h-[34px] shadow-sm">
                             <button onClick={() => handleDecreaseFromCart(p.id)} className="w-10 h-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors font-medium text-lg leading-none">-</button>
                             <span className="font-semibold text-slate-800 text-xs">{cartItem.qtd}</span>
                             <button onClick={() => handleAddToCart(p)} className="w-10 h-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors font-medium text-lg leading-none">+</button>
                          </div>
                      ) : (
                          <button onClick={() => handleAddToCart(p)} className="w-full bg-emerald-100 text-emerald-800 py-2 rounded font-semibold text-[11px] hover:bg-emerald-200 transition-colors mt-auto shadow-sm">Adicionar</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
        </div>

        {/* BARRA DE CHECKOUT FLUTUANTE (Premium) */}
        {cart.length > 0 && storeMode !== 'pausado' && (
           <div className="fixed bottom-16 md:bottom-6 left-0 w-full px-4 z-40 pointer-events-none animate-in slide-in-from-bottom-5">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600"/>
                    </div>
                    <div>
                       <p className="text-[10px] sm:text-xs font-semibold text-gray-500">Carrinho: {cart.reduce((s,i)=>s+i.qtd,0)} itens</p>
                       <p className="text-lg sm:text-xl font-medium text-slate-800 leading-none mt-0.5">R$ {cartTotal.toFixed(2)}</p>
                    </div>
                 </div>
                 <button onClick={() => setCurrentScreen('checkout')} className="bg-emerald-600 text-white px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center text-xs sm:text-sm">
                    {CONFIG_APENAS_COLETA ? 'Ver Carrinho' : 'Pagar'} <ArrowRight className="w-4 h-4 ml-2"/>
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
          {cart.length > 0 && (
              <button 
                  onClick={() => {
                      showConfirm('Esvaziar Carrinho', 'Tem certeza que deseja cancelar esta venda e limpar todos os itens?', () => {
                          setCart([]);
                          setValorRecebido('');
                      }, 'danger');
                  }} 
                  className="mb-3 w-full bg-red-50 text-red-600 border border-red-200 font-bold text-xs px-3 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
              >
                  <Trash2 className="w-4 h-4 mr-2"/> Esvaziar Carrinho (Cancelar Venda)
              </button>
          )}  
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
        {finalTotal > 0 && !CONFIG_APENAS_COLETA && !isPDV &&(
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

{isPDV ? (
            <button onClick={() => processPDVOrder(finalTotal)} disabled={isProcessingPayment} className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-orange-600 transition-all text-base flex items-center justify-center">
              {isProcessingPayment ? <Loader2 className="animate-spin w-5 h-5"/> : '⚡ Registrar Venda Balcão'}
            </button>
        ) : (
            <button onClick={() => {
                if (CONFIG_APENAS_COLETA) {
                    showConfirm(
                        'Confirmar Pedido', 
                        `Sua cesta deu R$ ${finalTotal.toFixed(2)}. Lembre-se: O pagamento será feito presencialmente na retirada! Deseja enviar o pedido para a Sede?`, 
                        () => processOrder(finalTotal, paymentMethod, walletDiscount)
                    );
                } else {
                    processOrder(finalTotal, paymentMethod, walletDiscount);
                }
            }} disabled={isProcessingPayment} className="w-full bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-800 transition-all text-base flex items-center justify-center">
              {isProcessingPayment ? <Loader2 className="animate-spin w-5 h-5"/> : (CONFIG_APENAS_COLETA ? 'Concluir Pedido (Pagar na Retirada)' : (finalTotal <= 0 ? 'Concluir Pedido (Usar Saldo)' : 'Gerar Pagamento Seguro'))}
            </button>
        )}
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
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm uppercase tracking-wider flex items-center ${order.status === 'pago' || order.status === 'pago_polo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                   {order.status === 'pago' || order.status === 'pago_polo' ? (
                       <><CheckCircle className="w-3 h-3 mr-1"/> Pago</>
                   ) : CONFIG_APENAS_COLETA ? (
                       'Pagar na Retirada'
                   ) : (
                       'Aguardando Pagamento'
                   )}
                </span>
              </div>

              {order.faltas && order.faltas.length > 0 && (
                 <div className="bg-orange-50 p-3 rounded-xl text-xs font-medium text-orange-800 mb-4 border border-orange-200 flex items-start">
                    {CONFIG_APENAS_COLETA ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-orange-600"/>
                            <div>
                                <p className="font-black text-orange-900 mb-0.5">Pedido Atualizado</p>
                                {/* CORREÇÃO DO BUG R$ NaN APLICADA AQUI */}
                                <p>Um item faltou no fornecedor. O valor que você pagará na retirada já foi reduzido em R$ {order.faltas.reduce((s,f)=>s+(f.value || f.refundValue || 0),0).toFixed(2)}.</p>
                            </div>
                        </>
                    ) : (user?.pendingPixRefund > 0 || user?.walletBalance > 0 ? (
                        <>
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-orange-600"/>
                            <div>
                                <p className="font-black text-orange-900 mb-0.5">Atenção ao seu pedido</p>
                                <p>Um item faltou. O crédito de R$ {order.faltas.reduce((s,f)=>s+(f.value || f.refundValue || 0),0).toFixed(2)} já está na sua carteira.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-emerald-600"/>
                            <div className="text-emerald-800">
                                <p className="font-black text-emerald-900 mb-0.5">Estorno Realizado</p>
                                <p>O valor de R$ {order.faltas.reduce((s,f)=>s+(f.value || f.refundValue || 0),0).toFixed(2)} foi reembolsado via PIX.</p>
                            </div>
                        </>
                    ))}
                 </div>
              )}

<div className="space-y-3 mb-5">
                {/* ITENS QUE O CLIENTE VAI RECEBER (Ativos) */}
                {(order.items || []).map((item, idx) => {
                  const quantidade = item.qtd || item.qty || 1;
                  const totalDoItem = (item.price || 0) * quantidade;
                  
                  return (
                    <div key={`item-${idx}`} className="flex items-center justify-between text-sm font-medium transition-all text-slate-700">
                      <div className="flex items-center truncate">
                          <span className="w-6 h-6 font-black text-[10px] rounded flex items-center justify-center mr-3 border shrink-0 bg-emerald-50 text-emerald-800 border-emerald-100">
                            {quantidade}x
                          </span>
                          <span className="truncate">{item.name}</span>
                      </div>
                      <span className="shrink-0 ml-3 font-black">R$ {totalDoItem.toFixed(2)}</span>
                    </div>
                  );
                })}

                {/* ITENS QUE FALTARAM (Cortados) */}
                {(order.faltas || []).map((falta, idx) => {
                  return (
                    <div key={`falta-${idx}`} className="flex items-center justify-between text-sm font-medium transition-all text-red-400 opacity-80">
                      <div className="flex items-center truncate line-through">
                          <span className="w-6 h-6 font-black text-[10px] rounded flex items-center justify-center mr-3 border shrink-0 bg-red-50 text-red-700 border-red-100">
                            {falta.qtyMissing || 1}x
                          </span>
                          <span className="truncate">{falta.name} <span className="text-[9px] ml-1 uppercase">(Falta)</span></span>
                      </div>
                      <span className="shrink-0 ml-3 font-black line-through">- R$ {(falta.value || falta.refundValue || 0).toFixed(2)}</span>
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
    // Corrige o bug da visão do Gestor
    const viewingPolo = isGestor ? (manualSelectedPolo || user?.polo || polos[0]) : user?.polo;
    
    // 1. LÓGICA DE ETIQUETAS E FILTRO (Limpa a sujeira do passado)
    
    // Só mostra lotes logísticos picados se forem do mês atual
    const lotesLogisticos = [...new Set(orders.filter(o => {
      if (!o.date) return false;
      const ciclo = o.cicloFinanceiro || 'Julho/2026';
      return ciclo === mesReferenciaGlobal;
  }).map(o => o.deliveryDate || 'Ciclo Mensal'))].sort();
  
  // O passado vira tudo Consolidado em Julho/2026
  const pastasFinanceiras = [...new Set(orders.map(o => {
      if (o.cicloFinanceiro) return `Consolidado: ${o.cicloFinanceiro}`;
      return `Consolidado: Julho/2026`; // <- Legado consolidado!
  }))].sort();

  const ciclosExistentes = [...pastasFinanceiras, ...lotesLogisticos];
  const filtroAtivo = ciclosExistentes.includes(dashCycleFilter) ? dashCycleFilter : (ciclosExistentes[0] || '');

 // 2. FILTRA AS ENCOMENDAS APENAS DO POLO E DO CICLO SELECIONADO
 const poloOrdersFiltered = orders.filter(o => {
  if (o.polo !== viewingPolo || !o.date) return false;
  
  const cicloDoPedido = o.cicloFinanceiro || 'Julho/2026';
  
  if (filtroAtivo.startsWith('Consolidado:')) {
      const pastaFiltro = filtroAtivo.replace('Consolidado:', '').trim();
      return cicloDoPedido === pastaFiltro;
  } else {
      // 👇 A TRAVA DO MÊS ESTÁ AQUI 👇
      return (o.deliveryDate || 'Ciclo Mensal') === filtroAtivo && cicloDoPedido === mesReferenciaGlobal;
  }
});

// 3. NOVA ESTEIRA LOGÍSTICA BLINDADA (Aba 1, 2 e 3)
const pedidosConfirmados = poloOrdersFiltered.filter(o => o.status === 'confirmado');
const pedidosPagosPolo = poloOrdersFiltered.filter(o => o.status === 'pago_polo');
const pedidosRepassados = poloOrdersFiltered.filter(o => o.status === 'pago'); 

// 👇 CORREÇÃO AQUI: Agora isLegacy é uma função que recebe o pedido 'o' corretamente! 👇
const isLegacy = (o) => !('separado' in o) && !('entregue' in o);

// O pedido só vai para a Aba 3 se for marcado como entregue HOJE, ou se for antigo e já pago
const isOrderEntregue = (o) => o.entregue || (isLegacy(o) && (o.status === 'pago_polo' || o.status === 'pago'));
const isOrderSeparado = (o) => o.separado || isOrderEntregue(o);

const aba1Aseparar = poloOrdersFiltered.filter(o => !isOrderSeparado(o));
const aba2Retirada = poloOrdersFiltered.filter(o => isOrderSeparado(o) && !isOrderEntregue(o));
const aba3Entregues = poloOrdersFiltered.filter(o => isOrderEntregue(o));

    const totalAindaAReceber = pedidosConfirmados.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalArrecadadoPolo = pedidosPagosPolo.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalRepassado = pedidosRepassados.reduce((acc, o) => acc + (o.total || 0), 0);
    
    // O Total do Lote agora soma tudo (Pendentes + No Caixa + Já repassados para a Sede)
    const totalGeralPolo = totalAindaAReceber + totalArrecadadoPolo + totalRepassado;

    const handleEfetuarRepassePolo = async () => {
      if (pedidosPagosPolo.length === 0) return showToast('Nenhum valor arrecadado para repassar!', 'error');
      if (window.confirm(`ATENÇÃO REPRESENTANTE:\n\nVocê confirma que realizou o PIX no valor TOTAL de R$ ${totalArrecadadoPolo.toFixed(2)} para a Sede Central referente a este Lote?`)) {
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
      
      // 👇 MÁGICA DO PREÇO PROMOCIONAL AQUI 👇
      const isPromo = prod.promotionalPrice > 0 && prod.promotionalPrice < prod.price;
      const activePrice = isPromo ? prod.promotionalPrice : prod.price;

      const existing = manualCart.find(i => i.id === prod.id);
      if (existing) {
        setManualCart(manualCart.map(i => i.id === prod.id ? { ...i, qty: i.qty + manualItemQty } : i));
      } else {
        // Agora ele salva o activePrice (com ou sem desconto) no carrinho!
        setManualCart([...manualCart, { id: prod.id, name: prod.name, price: activePrice, qty: manualItemQty }]);
      }
      setManualItemProduct('');
      setManualItemQty(1);
    };

    const handleRemoveFromManualCart = (id) => {
      setManualCart(manualCart.filter(i => i.id !== id));
    };

    const handleSaveManualOrder = async () => {
      if (!manualClientName) return showToast('Digite o nome do membro!', 'error');
      if (!manualClientWhatsapp || manualClientWhatsapp.length < 10) return showToast('O WhatsApp é obrigatório para notificações!', 'error');
      if (manualCart.length === 0) return showToast('Adicione pelo menos 1 produto à lista!', 'error');
      
      const manualTotal = manualCart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const poloDestino = isGestor ? (manualSelectedPolo || viewingPolo) : viewingPolo;

      const manualOrder = {
        customer: `${manualClientName} (Manual)`, 
        email: '', 
        whatsapp: manualClientWhatsapp, 
        polo: poloDestino, 
        cpf: 'Não informado',
        total: manualTotal, 
        method: 'manual', 
        status: 'confirmado', 
        status_nfe: 'pendente',
        date: new Date().toISOString(), 
        deliveryDate: sysConfig.loteMensal, // Usa a configuração da nuvem
        cicloFinanceiro: sysConfig.mesReferencia, // Usa a configuração da nuvem
        items: manualCart, 
        faltas: []
      };

      try {
        // 👇 MÁGICA DO ESTOQUE (PEDIDO MANUAL) 👇
        if (storeMode === 'estoque' || storeMode === 'pronta_entrega') {
            for (const item of manualCart) {
                const prodRef = doc(db, "products", item.id);
                const prodDoc = await getDoc(prodRef);
                if (prodDoc.exists()) {
                    const estoqueAtual = prodDoc.data().stock || 0;
                    await updateDoc(prodRef, { stock: Math.max(0, estoqueAtual - item.qty) });
                }
            }
        }
        
        await addDoc(collection(db, "orders"), manualOrder);
        showToast('Pedido Manual Salvo com Sucesso!');
        setShowManualOrder(false);
        setManualClientName('');
        setManualClientWhatsapp('');
        setManualCart([]);
      } catch (e) { showToast('Erro ao salvar', 'error'); }
    };

    return (
      <div className="w-full px-4 lg:px-8 mx-auto pt-6 pb-24 font-sans text-left">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
           <div>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão do Johrei Center</h2>
             <p className="text-xs font-bold text-emerald-700 bg-emerald-50 inline-flex items-center px-3 py-1.5 rounded-lg mt-2 border border-emerald-100"><MapPin className="w-3 h-3 mr-1.5"/> Unidade: {viewingPolo}</p>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-3">
               {/* 👇 FILTRO INTELIGENTE PARA O REPRESENTANTE 👇 */}
               <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Visualizar Ciclo / Lote</p>
                   <select value={filtroAtivo} onChange={e => setDashCycleFilter(e.target.value)} className="w-full bg-white border border-gray-300 text-emerald-800 font-black px-3 py-2 rounded-lg outline-none text-xs cursor-pointer shadow-sm">
                       {ciclosExistentes.map(data => <option key={data} value={data}>{data}</option>)}
                   </select>
               </div>

               {isGestor && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Visão de Mestre</p>
                      {/* CORREÇÃO: Altera o filtro do React com setManualSelectedPolo */}
                      <select 
                          value={viewingPolo} 
                          onChange={e => {
                              setManualSelectedPolo(e.target.value);
                              // Força o estado a atualizar o filtro da planilha local imediatamente
                              setDashCycleFilter(prev => prev);
                          }} 
                          className="w-full bg-white border border-gray-300 text-slate-800 font-bold px-3 py-2 rounded-lg outline-none text-xs shadow-sm cursor-pointer"
                      >
                         {polos.map(p => <option key={p} value={p}>JC: {p}</option>)}
                      </select>
                  </div>
                )}
           </div>
        </div>

        {CONFIG_APENAS_COLETA && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Fatura Total (Obrigação com a Sede) */}
              <div className="bg-slate-800 text-white border-2 border-slate-900 rounded-2xl p-4 text-center shadow-md flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📋 Total do Lote</p>
                <h1 className="text-2xl font-black mt-1 text-white">R$ {totalGeralPolo.toFixed(2).replace('.',',')}</h1>
                <p className="text-[9px] text-slate-300 mt-1 font-medium">Soma de todas as encomendas do polo</p>
              </div>

              {/* Card 2: Caixa do JC (O que já está no bolso) */}
              <div className="bg-emerald-800 text-white border-2 border-emerald-900 rounded-2xl p-4 text-center shadow-md flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">💰 Caixa da Unidade</p>
                  <h1 className="text-2xl font-black mt-1 text-white">R$ {totalArrecadadoPolo.toFixed(2).replace('.',',')}</h1>
                  <p className="text-[9px] text-emerald-100 mt-1 font-medium">{pedidosPagosPolo.length} pagamentos recebidos</p>
                </div>
                {totalArrecadadoPolo > 0 && (
                  <button onClick={handleEfetuarRepassePolo} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] py-2 rounded-xl shadow mt-3 transition">
                    💸 Enviar Repasse à Sede
                  </button>
                )}
              </div>

              {/* Card 3: Fiado / Pendente */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">⏳ A Receber de Clientes</p>
                <h1 className="text-2xl font-black text-orange-800 mt-1">R$ {totalAindaAReceber.toFixed(2).replace('.',',')}</h1>
                <p className="text-[9px] text-orange-600 mt-1 font-medium">{pedidosConfirmados.length} membros pendentes</p>
              </div>
            </div>

            {/* Botões de Ação do Representante */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button onClick={() => setShowMassNotify(true)} className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl shadow hover:bg-blue-700 transition text-sm flex items-center justify-center">
                    <BellRing className="w-5 h-5 mr-2"/> 🚨 Avisar Chegada de Carga
                </button>
                <button onClick={() => setIsPrintMode(true)} className="flex-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-3 rounded-xl shadow-sm hover:bg-emerald-200 transition text-sm flex items-center justify-center">
                    <Printer className="w-5 h-5 mr-2"/> Imprimir Romaneio
                </button>
                <button onClick={() => setShowManualOrder(!showManualOrder)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl shadow hover:bg-slate-900 transition text-sm">
                    ➕ Incluir Pedido Manual
                </button>
            </div>

            {/* MODAL DE FILA DE NOTIFICAÇÕES */}
            {showMassNotify && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                     <div>
                        <h3 className="font-black text-lg flex items-center"><BellRing className="w-5 h-5 mr-2"/> Fila Rápida de Avisos</h3>
                        <p className="text-blue-100 text-xs font-medium mt-1">Notificando clientes do Lote: {filtroAtivo}</p>
                     </div>
                     <button onClick={() => setShowMassNotify(false)} className="bg-blue-700 hover:bg-blue-800 p-2 rounded-lg transition"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto space-y-3 bg-slate-50 flex-1">
                     <p className="text-sm font-bold text-slate-600 mb-2">Membros aguardando retirada ({pedidosConfirmados.length}):</p>
                     
                     {pedidosConfirmados.length === 0 ? (
                         <p className="text-gray-500 text-center py-8 text-sm font-medium">Nenhum membro pendente para notificar neste lote.</p>
                     ) : (
                         pedidosConfirmados.map(o => {
                             const temFalta = o.faltas && o.faltas.length > 0;
                             const isNotified = o.notifiedRetirada; 
                             
                             return (
                                 <div key={o.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border transition-all ${isNotified ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                                     <div className="mb-3 sm:mb-0">
                                         <p className="font-bold text-slate-800 text-sm flex items-center">
                                             {o.customer} 
                                             {isNotified && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">✅ Avisado</span>}
                                         </p>
                                         <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                             Total: R$ {(o.total||0).toFixed(2)} 
                                             {temFalta && <span className="text-orange-500 font-bold ml-1">(Contém faltas)</span>}
                                         </p>
                                     </div>
                                     <button 
                                         onClick={async () => {
                                          let text = `Olá ${o.customer}! Aqui é do Clube de Compras.\n\nA sua encomenda já chegou e está pronta para retirada no Johrei Center de ${o.polo}. 📦\n\nNesta cesta você tem:\n`;
                                          (o.items || []).forEach(i => {
                                              const q = i.qtd || i.qty || 1;
                                              const totalItem = (i.price || 0) * q;
                                              text += `• ${q}x ${i.name} (R$ ${totalItem.toFixed(2).replace('.', ',')})\n`;
                                          });
                                          if(temFalta) {
                                              text += `\n⚠️ *Aviso de Falta:* Tivemos um corte no fornecedor e não conseguimos entregar:\n`;
                                              o.faltas.forEach(f => { text += `❌ ${f.qtyMissing || 1}x ${f.name}\n`; });
                                              text += `O valor da sua cesta já foi ajustado com o desconto das faltas!\n`;
                                          }
                                          text += `\nO total a transferir via Pix na retirada é *R$ ${(o.total||0).toFixed(2).replace('.', ',')}*.\nTe aguardamos!`;
                                             
                                             try {
                                                 await updateDoc(doc(db, "orders", o.id), { notifiedRetirada: new Date().toISOString() });
                                             } catch(e) { console.error("Erro ao registrar notificação", e); }
                                             
                                             window.open(`https://wa.me/55${(o.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`);
                                         }} 
                                         className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-black text-xs transition shadow-sm flex items-center justify-center ${isNotified ? 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                     >
                                         <MessageCircle className="w-4 h-4 mr-2"/> {isNotified ? 'Reenviar Aviso' : 'Enviar WhatsApp'}
                                     </button>
                                 </div>
                             )
                         })
                     )}
                  </div>
                </div>
              </div>
            )}

            {showManualOrder && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-lg mt-3 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Novo Pedido Manual</h3>
                  <button onClick={() => setShowManualOrder(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-1.5 rounded"><X className="w-4 h-4"/></button>
                </div>
              
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <input type="text" placeholder="Nome do Membro" value={manualClientName} onChange={e => setManualClientName(e.target.value)} className="w-full p-3 border border-gray-200 bg-slate-50 rounded-lg text-sm" />
                  <input type="tel" placeholder="WhatsApp (Ex: 11999999999)" value={manualClientWhatsapp} onChange={e => setManualClientWhatsapp(e.target.value)} className="w-full p-3 border border-gray-200 bg-slate-50 rounded-lg text-sm" />
                </div>
   
                <div className="bg-slate-50 p-3 rounded-lg border border-gray-200 mb-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Adicionar Produtos</p>
                  <div className="flex flex-col gap-2">
                    <select value={manualItemProduct} onChange={e => setManualItemProduct(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-medium outline-none truncate">
                      <option value="">Selecione o Produto...</option>
                      {[...products]
                          .filter(p => {
                              // Se estiver na Feira (Pronta Entrega), só mostra o que tem estoque!
                              if (storeMode === 'estoque' || storeMode === 'pronta_entrega') {
                                  return (p.stock || 0) > 0 && !p.pausado;
                              }
                              // Se for o Ciclo Normal do mês, mostra tudo que não estiver pausado
                              return !p.pausado;
                          })
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(p => {
                            // Calcula o preço correto para exibir na lista
                            const isPromo = p.promotionalPrice > 0 && p.promotionalPrice < p.price;
                            const priceToShow = isPromo ? p.promotionalPrice : p.price;

                            return (
                                <option key={p.id} value={p.id}>
                                    {p.name} - R$ {(priceToShow || 0).toFixed(2)} {isPromo ? '🔥(PROMO)' : ''} {(storeMode === 'estoque' || storeMode === 'pronta_entrega') ? `(Restam: ${p.stock})` : ''}
                                </option>
                            );
                        })}
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

       {/* BARRA DE BUSCA RÁPIDA (UX DO REPRESENTANTE) */}
       <div className="mb-4">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm focus-within:border-emerald-500 transition-colors">
                <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0"/>
                <input 
                    type="text" 
                    placeholder="Buscar cliente pelo nome..." 
                    value={repSearchClient}
                    onChange={(e) => setRepSearchClient(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 placeholder-gray-400"
                />
                {repSearchClient && (
                    <button onClick={() => setRepSearchClient('')} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-100 p-1.5 rounded-lg ml-2">
                        <X className="w-4 h-4"/>
                    </button>
                )}
            </div>
        </div>

       {/* CONTROLE DE ABAS: ESTEIRA LOGÍSTICA */}
       <div className="flex gap-2 mb-6 bg-slate-200 p-1.5 rounded-2xl shadow-inner overflow-x-auto scrollbar-hide">
            <button onClick={() => setRepTab('separar')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'separar' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📦 1. A Separar ({aba1Aseparar.length})</button>
            <button onClick={() => setRepTab('retirada')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'retirada' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🛍️ 2. Prontos ({aba2Retirada.length})</button>
            <button onClick={() => setRepTab('historico')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'historico' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✅ 3. Entregues ({aba3Entregues.length})</button>
        </div>

        {/* LISTAGEM DOS PEDIDOS DA ABA ATIVA */}
        <div className="space-y-6">
            {(() => {
                let currentOrders = repTab === 'separar' ? aba1Aseparar : repTab === 'retirada' ? aba2Retirada : aba3Entregues;
                
                // 👇 1. APLICA A BUSCA (SE HOUVER) 👇
                if (repSearchClient) {
                    currentOrders = currentOrders.filter(o => o.customer.toLowerCase().includes(repSearchClient.toLowerCase()));
                }

                // 👇 2. ORDENA TUDO ALFABETICAMENTE 👇
                currentOrders = currentOrders.sort((a, b) => a.customer.localeCompare(b.customer));
                
                if (currentOrders.length === 0) {
                    return (
                      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                          <Package className="w-10 h-10 mx-auto text-gray-200 mb-3"/>
                          <p className="text-gray-500 font-medium text-sm">
                             {repSearchClient ? `Nenhum cliente encontrado com "${repSearchClient}" nesta fase.` : 'Nenhum pedido nesta fase.'}
                          </p>
                      </div>
                    );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {currentOrders.map(o => {
                      
                      // 👇 AQUI ESTÃO AS VARIÁVEIS QUE EVITAM O ERRO! 👇
                      const temFalta = o.faltas && o.faltas.length > 0;
                      const isPago = o.status === 'pago' || o.status === 'pago_polo';

                      return (
                          <div key={o.id} className={`bg-white border rounded-2xl shadow-sm flex flex-col justify-between transition-all ${temFalta ? 'border-orange-200' : 'border-gray-100 hover:border-emerald-200'}`}>
                              {/* CABEÇALHO DO CARTÃO (NOME + WHATSAPP RICO) */}
                              <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                                  <div className="pr-2">
                                      <p className="font-black text-slate-800 text-sm leading-tight">{o.customer}</p>
                                      <p className="text-[10px] font-bold text-gray-400 font-mono mt-1">#PED-{o.id.slice(-5).toUpperCase()}</p>
                                  </div>
                                  
                                  <div className="flex gap-1.5 shrink-0">
                                      <button onClick={() => {
                                          let text = `Olá ${o.customer}! Aqui é do Clube de Compras.\n\n`;
                                          if (repTab === 'retirada' || repTab === 'separar') {
                                              text += `A sua encomenda já chegou no Johrei Center de ${o.polo}. 📦\n\nNesta cesta você tem:\n`;
                                              (o.items || []).forEach(i => {
                                                  const q = i.qtd || i.qty || 1;
                                                  const totalItem = (i.price || 0) * q;
                                                  text += `• ${q}x ${i.name} (R$ ${totalItem.toFixed(2).replace('.', ',')})\n`;
                                              });
                                              
                                              if (temFalta) {
                                                  text += `\n⚠️ *Aviso de Falta:* Tivemos um corte no fornecedor e não conseguimos entregar:\n`;
                                                  o.faltas.forEach(f => { text += `❌ ${f.qtyMissing || 1}x ${f.name}\n`; });
                                                  text += `O valor da sua cesta já foi ajustado com o desconto!\n`;
                                              }
                                              
                                              if (!isPago) {
                                                  text += `\nO total a transferir via Pix na retirada é *R$ ${(o.total||0).toFixed(2).replace('.', ',')}*.\nTe aguardamos!`;
                                              } else {
                                                  text += `\nO seu pedido já consta como *PAGO*. É só vir retirar!\nTe aguardamos!`;
                                              }
                                          }
                                          window.open(`https://wa.me/55${(o.whatsapp||'').replace(/\D/g,'')}?text=${encodeURIComponent(text)}`);
                                      }} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100 shadow-sm" title="Avisar no WhatsApp">
                                          <MessageCircle className="w-5 h-5"/>
                                      </button>
                                  </div>
                              </div>

                              {/* STATUS DUPLO (FINANCEIRO + LOGÍSTICA) */}
                              <div className="px-4 py-3 flex gap-2">
                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${isPago ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                      {isPago ? '🟢 PAGO' : '🔴 PENDENTE'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${repTab === 'separar' ? 'bg-orange-50 text-orange-700 border border-orange-200' : repTab === 'retirada' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                      {repTab === 'separar' ? '⏳ A SEPARAR' : repTab === 'retirada' ? '🛍️ P/ RETIRADA' : '✅ ENTREGUE'}
                                  </span>
                              </div>

                              {/* LISTA DE PRODUTOS COMPACTA */}
                              <div className="px-4 pb-4 flex-1">
                                  <div className="flex flex-col gap-1.5 mt-1">
                                    {(o.items || []).map((i, idx) => {
                                      const quantidade = i.qtd || i.qty || 1; 
                                      return (
                                        <div key={`ativo-${idx}`} className="text-[11px] font-bold px-2 py-1.5 rounded-lg border border-gray-100 flex items-center justify-between shadow-sm w-full bg-slate-50 text-slate-700">
                                          <div className="flex items-center truncate">
                                            <span className="mr-2 px-1.5 py-0.5 bg-white rounded text-slate-800 font-black shrink-0 border border-gray-200">{quantidade}x</span> 
                                            <span className="leading-tight truncate">{i.name}</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {(o.faltas || []).map((f, idx) => (
                                        <div key={`falta-${idx}`} className="text-[11px] font-bold px-2 py-1.5 rounded-lg border border-red-100 flex items-center justify-between shadow-sm w-full bg-red-50 text-red-700 opacity-80">
                                          <div className="flex items-center truncate line-through">
                                            <span className="mr-2 px-1.5 py-0.5 bg-red-100 rounded text-red-800 font-black shrink-0 border border-red-200">{f.qtyMissing || 1}x</span> 
                                            <span className="leading-tight truncate">{f.name}</span>
                                          </div>
                                        </div>
                                    ))}
                                  </div>
                              </div>

                              {/* BOTÕES DE AÇÃO SEPARADOS */}
                              <div className="p-4 pt-0">
                                  <div className="flex justify-between items-center mb-3 px-1 border-t border-gray-50 pt-3">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total:</span>
                                      <span className="font-black text-slate-800 text-lg">R$ {(o.total||0).toFixed(2)}</span>
                                  </div>

                                  {repTab === 'separar' && (
                                      <button onClick={async () => {
                                          try { await updateDoc(doc(db, "orders", o.id), { separado: true }); showToast('Caixa movida para Retirada!'); } catch(e){}
                                      }} className="w-full py-3.5 bg-orange-100 text-orange-800 font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-orange-200 transition-colors shadow-sm flex items-center justify-center">
                                          📦 MARCAR COMO SEPARADO
                                      </button>
                                  )}

                                  {repTab === 'retirada' && (
                                      <div className="flex flex-col gap-2">
                                          {!isPago && (
                                              <button onClick={async () => {
                                                  showConfirm('Confirmar Pagamento', `O cliente pagou R$ ${(o.total||0).toFixed(2)} agora no caixa?`, async () => {
                                                      try { await updateDoc(doc(db, "orders", o.id), { status: 'pago_polo' }); showToast('Pagamento Registrado no Caixa!'); } catch(e){}
                                                  });
                                              }} className="w-full py-3 bg-white text-emerald-700 border-2 border-emerald-500 font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-emerald-50 transition-colors shadow-sm flex items-center justify-center">
                                                  💰 1. REGISTRAR PIX (R$ ${(o.total||0).toFixed(2)})
                                              </button>
                                          )}
                                          
                                          <button onClick={async () => {
                                              if (!isPago) {
                                                  showToast('Atenção: Registre o pagamento antes de entregar a sacola!', 'error');
                                                  return;
                                              }
                                              showConfirm('Confirmar Entrega', 'O cliente já está levando a sacola?', async () => {
                                                  try { await updateDoc(doc(db, "orders", o.id), { entregue: true }); showToast('Entrega concluída!'); } catch(e){}
                                              });
                                          }} className={`w-full py-3.5 font-black text-[11px] uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center justify-center ${!isPago ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                              🛍️ 2. ENTREGAR SACOLA
                                          </button>
                                      </div>
                                  )}

                                  {repTab === 'historico' && (
                                      <button onClick={async () => {
                                          showConfirm('Desfazer Entrega', 'Devolver esta sacola para a aba de "Prontos para Retirada"?', async () => {
                                              try { await updateDoc(doc(db, "orders", o.id), { entregue: false }); showToast('Entrega desfeita!'); } catch(e){}
                                          });
                                      }} className="w-full py-2.5 bg-gray-50 text-gray-500 font-bold text-[10px] rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 flex items-center justify-center">
                                          ↩️ DESFAZER ENTREGA
                                      </button>
                                  )}
                              </div>
                          </div>
                      )
                  })}
              </div>
                );
            })()}
        </div>
      </div>
    );
  };

  const renderDispatchPDF = () => {
    // 👇 1. ENSINAMOS O PDF A LER O POLO SELECIONADO NA TELA 👇
    const viewingPolo = isGestor ? (manualSelectedPolo || user?.polo || polos[0]) : user?.polo;

    // A MÁGICA AQUI: O Romaneio agora obedece a etiqueta de Lote (Data de Entrega)
    // A MÁGICA AQUI: O Romaneio agora obedece o Ciclo (Mês) E a etiqueta de Lote (Data)
    const validOrders = orders.filter(o => {
      const hasValidStatus = (o.status === 'pago' || o.status === 'confirmado' || o.status === 'pago_polo');
      
      // 👇 2. AGORA ELE USA O VIEWING POLO SEM DAR ERRO 👇
      // 🌟 RETROCOMPATIBILIDADE DA SEDE: Se o PDF for aberto na tela de 'compras' (Gestão), 
      // ele ignora os filtros e traz TODOS os polos do lote! Se for na Logística, separa por unidade.
      const hasValidPolo = currentScreen === 'dashboard_admin' ? true : (o.polo === viewingPolo);
      
      const hasDate = !!o.date;

      // 👇 A CORREÇÃO DE OURO ENTRA AQUI: A Trava do Mês (Ciclo) 👇
      const cicloDoPedido = o.cicloFinanceiro || 'Julho/2026'; // Garante compatibilidade com pedidos antigos
      const ehDoCicloAtual = cicloDoPedido === sysConfig.mesReferencia;

      // Regra de Lote/Data de Entrega
      const etiquetaDoPedido = o.deliveryDate || 'Ciclo Mensal';
      const matchesLote = mesaDateFilter === 'Todos' || etiquetaDoPedido === mesaDateFilter;

      // Agora ele exige obrigatoriamente que o pedido pertença ao Mês Atual (ehDoCicloAtual)
      return hasValidStatus && hasDate && hasValidPolo && matchesLote && ehDoCicloAtual;
  });

    const summaryByPolo = {};

    validOrders.forEach(o => {
        if (!summaryByPolo[o.polo]) summaryByPolo[o.polo] = { customers: [] };
        summaryByPolo[o.polo].customers.push(o);
    });

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-sm text-black">
        <div className="text-center mb-8 border-b-2 border-black pb-4 print:hidden">
          <button onClick={() => window.print()} className="bg-black text-white px-8 py-3 font-bold uppercase rounded">Imprimir Agora</button>
          <button onClick={() => setIsPrintMode(false)} className="ml-4 text-black underline">Voltar</button>
        </div>

        {Object.entries(summaryByPolo).sort((a,b) => a[0].localeCompare(b[0])).map(([poloName, data], index) => {
           const poloTotals = {};
           data.customers.forEach(cust => {
               (cust.items || []).forEach(item => {
                   if(!poloTotals[item.name]) poloTotals[item.name] = 0;
                   poloTotals[item.name] += (Number(item.qtd) || Number(item.qty) || 1);
               });
           });

           const totalGeralDoPolo = data.customers.reduce((acc, cust) => acc + (cust.total || 0), 0);

           return (
            <div key={poloName}>
              
              {/* =========================================
                  PÁGINA 1: RESUMO TOTAL DA VAN (PROFISSIONAL)
                  ========================================= */}
              <div style={{ pageBreakAfter: 'always' }} className="mb-10">
                  {/* Cabeçalho do Romaneio */}
                  <div className="text-center mb-6">
                      <h1 className="text-2xl font-black uppercase tracking-tight">Romaneio de Despacho</h1>
                      <p className="font-bold text-gray-600 uppercase tracking-widest text-xs mt-1">Data: {new Date().toLocaleDateString('pt-BR')} • {mesaDateFilter !== 'Todos' ? `Lote: ${mesaDateFilter}` : 'Todos os Lotes'}</p>
                  </div>

                  <div className="bg-gray-100 border-2 border-black p-4 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-center rounded-xl gap-2">
                      <div className="text-left">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Destino</span>
                          <span className="text-xl font-black uppercase tracking-tight">🚚 Unidade {poloName}</span>
                      </div>
                      <div className="text-right bg-white px-4 py-2 border border-gray-300 rounded-lg">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Total do Repasse à Sede</span>
                          <span className="text-lg font-black text-emerald-800">R$ {totalGeralDoPolo.toFixed(2).replace('.', ',')}</span>
                      </div>
                  </div>
                  
                  <div className="border-2 border-black rounded-xl p-6 bg-white shadow-sm">
                    <h3 className="font-black uppercase tracking-widest border-b-2 border-gray-200 pb-2 mb-4 text-center text-lg">Resumo Total para a Van</h3>
                    
                    {/* 👇 O SEGREDO DO LAYOUT LIMPO: COLUMNS-2 COM GAPS LONGOS 👇 */}
                    <div className="columns-1 md:columns-2 gap-12 text-sm">
                       {Object.entries(poloTotals).sort((a,b) => a[0].localeCompare(b[0])).map(([itemName, qty]) => (
                          <div key={itemName} className="flex justify-between items-end border-b border-dotted border-gray-400 pb-1.5 mb-2.5 break-inside-avoid">
                            <span className="font-bold text-gray-700 pr-4 leading-tight">{itemName}</span>
                            <span className="font-black text-black whitespace-nowrap text-base">{qty} <span className="text-[10px] font-normal uppercase text-gray-500">un</span></span>
                          </div>
                       ))}
                    </div>
                  </div>
              </div>

              {/* =========================================
                  PÁGINA 2 em diante: SEPARAÇÃO POR CLIENTE
                  ========================================= */}
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2 mb-6">📦 Separação por Cliente - {poloName}</h3>
                <div className="grid grid-cols-1 gap-6">
                    {data.customers.sort((a,b) => a.customer.localeCompare(b.customer)).map(cust => (
                       <div key={cust.id} style={{ pageBreakInside: 'avoid' }} className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                           
                           {/* CABEÇALHO DO CLIENTE */}
                           <div className="bg-gray-100 border-b border-gray-300 p-3 flex justify-between items-center">
                               <div>
                                   <span className="font-black text-base uppercase block leading-tight">{cust.customer}</span>
                                   <span className="text-[10px] font-bold text-gray-500 font-mono">PEDIDO #{cust.id.slice(0,5).toUpperCase()}</span>
                               </div>
                               <div className="text-right">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Total a Pagar</span>
                                   <span className="font-black text-lg">R$ {(cust.total || 0).toFixed(2).replace('.', ',')}</span>
                               </div>
                           </div>
                           
                           {/* LISTA DE ITENS DO CLIENTE */}
                           <div className="p-4 bg-white">
                             {(cust.items || []).map((it, idx) => {
                                 const q = it.qtd || it.qty || 1;
                                 const totalItem = (it.price || 0) * q;
                                 return (
                                   <div key={idx} className="flex items-center justify-between gap-4 mb-2.5 last:mb-0 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                      <div className="flex items-center gap-3">
                                          <div className="w-5 h-5 border-2 border-gray-300 rounded-md shrink-0"></div>
                                          <span className="font-black text-sm">{q}x</span>
                                          <span className="font-bold text-gray-700 text-sm leading-tight">
                                              {it.name} <span className="text-[10px] text-gray-400 font-medium ml-1 whitespace-nowrap">(R$ {(it.price || 0).toFixed(2).replace('.', ',')} /un)</span>
                                          </span>
                                      </div>
                                      <span className="font-black text-sm whitespace-nowrap">R$ {totalItem.toFixed(2).replace('.', ',')}</span>
                                   </div>
                                 )
                             })}
                           </div>
                       </div>
                    ))}
                </div>
              </div>

            </div>
          )
        })}
      </div>
    );
  };

  const renderPrintCartaz = () => {
    // 1. Puxa os produtos ativos e ordena por nome
    const activeProducts = products.filter(p => !p.pausado).sort((a, b) => a.name.localeCompare(b.name));
    
    // 2. MÁGICA: Agrupa os produtos por categoria
    const productsByCategory = activeProducts.reduce((acc, p) => {
        const cat = p.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});
    
    const sortedCategories = Object.keys(productsByCategory).sort();

    // 3. Gerador automático de QR Code apontando para o app
    const appUrl = "https://clubedecomprassjc.vercel.app/";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;

    return (
      // A MÁGICA DO A4 AQUI: Forçamos dimensões físicas e ocultamos o excesso na impressão
      <div className="bg-white p-4 sm:p-8 max-w-4xl mx-auto font-sans text-black flex flex-col print:p-0 print:w-[210mm] print:h-[296mm] print:overflow-hidden box-border">
        <div className="print:hidden text-center mb-8 border-b border-gray-200 pb-6 shrink-0">
          <button onClick={() => window.print()} className="bg-emerald-700 text-white px-8 py-3 font-black uppercase tracking-widest rounded-xl shadow-lg mr-4 hover:bg-emerald-800 transition-colors">🖨️ Imprimir Cartaz de Parede</button>
          <button onClick={() => setPrintLayout(null)} className="text-gray-500 font-bold hover:text-red-500 underline">Voltar</button>
        </div>

        {/* VISUAL DO CARTAZ DE PAREDE COM ESPAÇAMENTOS EQUILIBRADOS PARA A4 */}
        <div className="border-[6px] border-emerald-800 p-6 sm:p-8 rounded-3xl relative flex-1 flex flex-col justify-between print:border-4 print:p-4 print:rounded-2xl print:m-1">
            
            {/* CABEÇALHO */}
            <div className="text-center mb-4 sm:mb-6 border-b-[6px] border-emerald-800 pb-4 shrink-0 print:mb-3 print:pb-3 print:border-b-4">
                <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-emerald-900 mb-1 print:text-4xl">Clube de Compras</h1>
                <h2 className="text-2xl sm:text-3xl font-black text-orange-600 uppercase tracking-widest print:text-2xl">Ciclo {sysConfig.mesReferencia || 'Aberto'}!</h2>
                <p className="mt-2 text-lg sm:text-xl font-black text-white bg-slate-800 inline-block px-5 py-1.5 rounded-xl shadow-md print:mt-2 print:text-lg print:px-5 print:py-1">
                   Pedidos até {sysConfig.dataCorte || '31/07 às 14:00hs'}
                </p>
            </div>

            {/* LISTA DE PRODUTOS COMPACTADA NA MEDIDA CERTA */}
            <div className="columns-2 gap-8 sm:gap-10 flex-1 my-1 print:gap-6 print:my-0">
                {sortedCategories.map(category => (
                    <div key={category} className="mb-4 sm:mb-6 break-inside-avoid print:mb-3">
                        
                        {/* Faixa da Categoria */}
                        <div className="bg-emerald-50 border-l-4 sm:border-l-8 border-emerald-700 pl-2 sm:pl-3 py-1 sm:py-1.5 mb-2 sm:mb-3 rounded-r-lg print:border-l-4 print:mb-1.5 print:py-1">
                            <h3 className="text-lg sm:text-xl font-black text-emerald-900 uppercase tracking-widest print:text-lg">{category}</h3>
                        </div>

                        {/* Produtos dentro da Categoria */}
                        <div className="flex flex-col gap-1.5 sm:gap-2.5 print:gap-1">
                            {productsByCategory[category].map(p => {
                                const isPromo = p.promotionalPrice > 0 && p.promotionalPrice < p.price;
                                const price = isPromo ? p.promotionalPrice : p.price;
                                return (
                                    <div key={p.id} className="flex justify-between items-end border-b-2 border-dotted border-gray-300 pb-0.5 print:pb-0.5 print:pt-0.5 print:border-b">
                                        <span className="font-bold text-xs sm:text-sm text-slate-800 leading-tight pr-2 uppercase print:text-[12px] print:leading-tight">{p.name}</span>
                                        <span className="font-black text-lg sm:text-xl text-emerald-800 shrink-0 print:text-[16px] print:leading-none">R$ {price.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                ))}
            </div>

            {/* RODAPÉ DO CARTAZ COM QR CODE E LINK */}
            <div className="mt-4 sm:mt-6 bg-emerald-800 text-white p-4 sm:p-5 rounded-2xl shrink-0 shadow-lg border-2 sm:border-4 border-emerald-900 flex items-center justify-between gap-3 break-inside-avoid print:mt-3 print:p-3 print:border-2 print:rounded-xl">
                <div className="flex-1 text-left">
                    <p className="text-lg sm:text-xl font-black uppercase mb-0.5 text-orange-300 print:text-base print:mb-0.5">📱 Faça seu pedido online:</p>
                    <p className="text-xs sm:text-sm font-bold text-white/90 print:text-xs">Aponte a câmara do celular para o QR Code ao lado ou acesse:</p>
                    <p className="text-base sm:text-lg font-black text-yellow-300 font-mono mt-0.5 underline print:text-sm">clubedecomprassjc.vercel.app</p>
                </div>
                <div className="bg-white p-1.5 sm:p-2 rounded-xl shadow-md shrink-0 flex flex-col items-center print:rounded-lg print:p-1.5">
                    <img src={qrCodeUrl} alt="QR Code do App" className="w-16 h-16 sm:w-24 sm:h-24 print:w-16 print:h-16" />
                    <span className="text-[7px] sm:text-[8px] font-black text-slate-800 uppercase tracking-widest mt-1 print:text-[8px]">Escaneie Aqui</span>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderPrintLogistica = () => {
    // Recalcula a lista para impressão com a mesma lógica da tela
    const currentCycleOrders = orders.filter(o => {
        const ciclo = o.cicloFinanceiro || 'Julho/2026';
        return o.status === (CONFIG_APENAS_COLETA ? 'confirmado' : 'pago') && ciclo === sysConfig.mesReferencia;
    });

    const demandaPorProduto = {};
    currentCycleOrders.forEach(order => {
        (order.items || []).forEach(item => {
            if (!demandaPorProduto[item.id]) demandaPorProduto[item.id] = { id: item.id, name: item.name, reqTaubate: 0, reqAdyana: 0 };
            const qty = item.qtd || item.qty || 1;
            if (order.polo === 'Taubaté' || order.polo === 'Pindamonhangaba') demandaPorProduto[item.id].reqTaubate += qty;
            else if (order.polo === 'Vila Adyana') demandaPorProduto[item.id].reqAdyana += qty;
        });
    });

    const listaLogistica = Object.values(demandaPorProduto).map(demanda => {
        const prodCatalogo = products.find(p => p.id === demanda.id);
        const tamanhoCaixa = prodCatalogo?.minBox || prodCatalogo?.itensPorCaixa || 1; 
        const sugeridoTaubate = Math.floor(demanda.reqTaubate / tamanhoCaixa);
        const sugeridoAdyana = Math.floor(demanda.reqAdyana / tamanhoCaixa);
        
        const inputTaubate = caixasDirecionadas[demanda.id]?.taubate !== undefined ? caixasDirecionadas[demanda.id].taubate : sugeridoTaubate;
        const inputAdyana = caixasDirecionadas[demanda.id]?.adyana !== undefined ? caixasDirecionadas[demanda.id].adyana : sugeridoAdyana;
        
        const numTaubate = Number(inputTaubate) || 0;
        const numAdyana = Number(inputAdyana) || 0;

        const unidadesTaubate = numTaubate * tamanhoCaixa;
        const unidadesAdyana = numAdyana * tamanhoCaixa;

        return {
            ...demanda,
            tamanhoCaixa,
            caixasTaubate: numTaubate,
            caixasAdyana: numAdyana,
            unidadesTaubate,
            unidadesAdyana,
            retiraTaubate: demanda.reqTaubate - unidadesTaubate,
            retiraAdyana: demanda.reqAdyana - unidadesAdyana
        };
    }).filter(item => item.reqTaubate > 0 || item.reqAdyana > 0);

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-black">
            <div className="print:hidden text-center mb-8 border-b border-gray-200 pb-6">
                <button onClick={() => window.print()} className="bg-emerald-700 text-white px-8 py-3 font-black uppercase tracking-widest rounded-xl shadow-lg mr-4 hover:bg-emerald-800 transition-colors">🖨️ Imprimir PDF Agora</button>
                <button onClick={() => setPrintLayout(null)} className="text-gray-500 font-bold hover:text-red-500 underline">Voltar</button>
            </div>

            <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-black uppercase tracking-tight">Ordem de Transferência (Cross-Docking)</h1>
                <p className="mt-1 font-bold text-gray-600 uppercase tracking-widest text-sm">Lote Logístico: {sysConfig.loteMensal}</p>
            </div>

            {/* TABELA DE TAUBATÉ */}
            <div className="mb-10 page-break-inside-avoid">
                  <div className="bg-gray-200 p-2 font-black text-lg mb-4 uppercase border border-black flex justify-between items-center px-4">
                      <span>Destino: 🚚 TAUBATÉ + PINDA</span>
                  </div>
                  <table className="w-full text-left border-collapse border border-black">
                      <thead>
                          <tr className="bg-gray-100 border-b-2 border-black">
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black">Produto</th>
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black text-center w-20">Caixas na Van</th>
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black text-center w-24">Total (Unid.)</th>
                              {/* Largura aumentada para w-40 para caber tudo na mesma linha */}
                              <th className="py-2 px-3 font-black uppercase text-xs text-center w-40">Acerto na Sede</th>
                          </tr>
                      </thead>
                      <tbody>
                          {listaLogistica.filter(i => i.reqTaubate > 0).map((item) => (
                              <tr key={item.id} className="border-b border-gray-300">
                                  <td className="py-3 px-3 font-bold text-sm border-r border-black">{item.name} <span className="text-[10px] font-normal ml-2 text-gray-600">(Cx c/ {item.tamanhoCaixa})</span></td>
                                  <td className="py-3 px-3 font-black text-lg text-center border-r border-black">{item.caixasTaubate}</td>
                                  <td className="py-3 px-3 font-black text-lg text-center border-r border-black">{item.unidadesTaubate}</td>
                                  {/* Adicionado o whitespace-nowrap para não quebrar a palavra "un" */}
                                  <td className="py-2 px-2 font-bold text-[11px] text-center uppercase tracking-wider whitespace-nowrap">
                                      {item.retiraTaubate > 0 ? (
                                          <span className="text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block border border-orange-200">🛒 Retirar: {item.retiraTaubate} un</span>
                                      ) : item.retiraTaubate < 0 ? (
                                          <span className="text-red-700 bg-red-100 px-2 py-1 rounded inline-block border border-red-200">⚠️ Devolver: {Math.abs(item.retiraTaubate)} un</span>
                                      ) : (
                                          <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded inline-block border border-emerald-200">✅ Exato (0)</span>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* TABELA DE VILA ADYANA */}
              <div className="page-break-inside-avoid">
                  <div className="bg-gray-200 p-2 font-black text-lg mb-4 uppercase border border-black flex justify-between items-center px-4">
                      <span>Destino: 🚚 VILA ADYANA</span>
                  </div>
                  <table className="w-full text-left border-collapse border border-black">
                      <thead>
                          <tr className="bg-gray-100 border-b-2 border-black">
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black">Produto</th>
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black text-center w-20">Caixas na Van</th>
                              <th className="py-2 px-3 font-black uppercase text-xs border-r border-black text-center w-24">Total (Unid.)</th>
                              {/* Largura aumentada para w-40 para caber tudo na mesma linha */}
                              <th className="py-2 px-3 font-black uppercase text-xs text-center w-40">Acerto na Sede</th>
                          </tr>
                      </thead>
                      <tbody>
                          {listaLogistica.filter(i => i.reqAdyana > 0).map((item) => (
                              <tr key={item.id} className="border-b border-gray-300">
                                  <td className="py-3 px-3 font-bold text-sm border-r border-black">{item.name} <span className="text-[10px] font-normal ml-2 text-gray-600">(Cx c/ {item.tamanhoCaixa})</span></td>
                                  <td className="py-3 px-3 font-black text-lg text-center border-r border-black">{item.caixasAdyana}</td>
                                  <td className="py-3 px-3 font-black text-lg text-center border-r border-black">{item.unidadesAdyana}</td>
                                  {/* Adicionado o whitespace-nowrap para não quebrar a palavra "un" */}
                                  <td className="py-2 px-2 font-bold text-[11px] text-center uppercase tracking-wider whitespace-nowrap">
                                      {item.retiraAdyana > 0 ? (
                                          <span className="text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block border border-orange-200">🛒 Retirar: {item.retiraAdyana} un</span>
                                      ) : item.retiraAdyana < 0 ? (
                                          <span className="text-red-700 bg-red-100 px-2 py-1 rounded inline-block border border-red-200">⚠️ Devolver: {Math.abs(item.retiraAdyana)} un</span>
                                      ) : (
                                          <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded inline-block border border-emerald-200">✅ Exato (0)</span>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

        </div>
    );
};

  const renderPrintCatalog = () => {
    // Puxa apenas os produtos ativos
    const activeProducts = products.filter(p => !p.pausado && (p.stock || 0) > 0).sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-black">
        <div className="print:hidden text-center mb-8 border-b border-gray-200 pb-6">
          <button onClick={() => window.print()} className="bg-emerald-700 text-white px-8 py-3 font-black uppercase tracking-widest rounded-xl shadow-lg mr-4 hover:bg-emerald-800 transition-colors">Imprimir Catálogo</button>
          <button onClick={() => setPrintLayout(null)} className="text-gray-500 font-bold hover:text-red-500 underline">Voltar</button>
        </div>

        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black uppercase tracking-tight">Catálogo de Produtos</h1>
          <p className="mt-1 font-bold text-gray-600 uppercase tracking-widest text-sm">Clube de Compras • Johrei Center</p>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-3 px-2 font-black uppercase text-xs">Produto</th>
              <th className="py-3 px-2 font-black uppercase text-xs">Categoria</th>
              <th className="py-3 px-2 font-black uppercase text-xs text-right">Preço (R$)</th>
            </tr>
          </thead>
          <tbody>
            {activeProducts.map((p, idx) => {
              const isPromo = p.promotionalPrice > 0 && p.promotionalPrice < p.price;
              const activePrice = isPromo ? p.promotionalPrice : p.price;
              return (
                <tr key={p.id} className={`border-b border-gray-300 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-3 px-2 font-bold text-sm">
                    {p.name}
                    {isPromo && <span className="ml-2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest">Oferta</span>}
                  </td>
                  <td className="py-3 px-2 text-xs font-medium text-gray-600">{p.category}</td>
                  <td className="py-3 px-2 font-black text-base text-right">
                    {isPromo && <span className="text-xs text-gray-400 line-through mr-2 font-medium">{(p.price || 0).toFixed(2).replace('.', ',')}</span>}
                    {(activePrice || 0).toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPrintTags = () => {
    // Puxa apenas os ativos e com estoque (ou todos ativos)
    const activeProducts = products.filter(p => !p.pausado && (p.stock || 0) > 0).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="bg-white p-4 font-sans text-black">
        <div className="print:hidden text-center mb-8 border-b border-gray-200 pb-6">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 font-black uppercase tracking-widest rounded-xl shadow-lg mr-4 hover:bg-blue-700 transition-colors">Imprimir Plaquinhas</button>
          <button onClick={() => setPrintLayout(null)} className="text-gray-500 font-bold hover:text-red-500 underline">Voltar</button>
          <p className="text-xs text-gray-400 mt-3 font-medium">Dica: Imprima e recorte na linha pontilhada.</p>
        </div>

        {/* MÁGICA DO CSS PARA IMPRESSÃO: Cria cartões do tamanho certo e evita quebrar no meio */}
        <div className="grid grid-cols-2 gap-6">
          {activeProducts.map(p => {
            const isPromo = p.promotionalPrice > 0 && p.promotionalPrice < p.price;
            const priceToShow = isPromo ? p.promotionalPrice : p.price;
            
            return (
              <div key={p.id} style={{ pageBreakInside: 'avoid' }} className="border-[3px] border-dashed border-gray-400 rounded-3xl p-6 text-center flex flex-col justify-between h-[280px] relative bg-white">
                
                {/* Promoção Badge */}
                {isPromo && <div className="absolute top-4 left-4 bg-slate-900 text-white font-black px-4 py-1.5 rounded-xl text-sm uppercase tracking-widest z-10">Promoção</div>}
                
                {/* Ícone Decorativo */}
                <div className="absolute top-4 right-4"><Leaf className="w-6 h-6 text-gray-300"/></div>
                
                {/* Área Superior: Nome do Produto */}
                <div className="mt-6 flex-grow flex items-center justify-center">
                    <h2 className="text-[22px] font-black text-slate-800 leading-tight uppercase px-4 line-clamp-3">
                        {p.name}
                    </h2>
                </div>
                
                {/* Área Central: Preço (Isolado e Centralizado) */}
                <div className="flex flex-col items-center justify-center mb-6">
                    {isPromo && <p className="text-sm text-gray-400 line-through font-bold mb-1">De: R$ {(p.price || 0).toFixed(2).replace('.', ',')}</p>}
                    
                    {/* O segredo da centralização: items-baseline e justify-center */}
                    <div className="flex items-baseline justify-center gap-1.5">
                        <span className="text-2xl font-black text-slate-800">R$</span>
                        <span className="text-[80px] font-black text-slate-900 leading-none tracking-tighter">{(priceToShow || 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                
                {/* Rodapé Fixo */}
                <div className="absolute bottom-4 left-0 w-full text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2">Clube de Compras</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };
  const handleSaveAdminOrder = async () => {
    try {
      // 1. Calcula o novo total baseado no carrinho editado
      const newTotal = editCart.reduce((acc, item) => {
          const quantidade = item.qtd || item.qty || 1;
          return acc + ((item.price || 0) * quantidade);
      }, 0);

      // 2. MÁGICA DO ESTOQUE: Compara o antes e o depois
      if (storeMode === 'estoque' || storeMode === 'pronta_entrega') {
          // Cria uma "memória" das quantidades antigas do pedido
          const oldQtyMap = {};
          (editingAdminOrder.items || []).forEach(i => {
              oldQtyMap[i.id] = i.qtd || i.qty || 1;
          });

          // Analisa os novos itens que estão sendo salvos
          for (const newItem of editCart) {
              const newQty = newItem.qtd || newItem.qty || 1;
              const oldQty = oldQtyMap[newItem.id] || 0;
              const diferenca = newQty - oldQty; // Se for positivo, o cliente adicionou. Se for negativo, removeu.

              if (diferenca !== 0 && newItem.id !== 'oferta-1') {
                  const prodRef = doc(db, "products", newItem.id);
                  const prodDoc = await getDoc(prodRef);
                  if (prodDoc.exists()) {
                      const estoqueAtual = prodDoc.data().stock || 0;
                      // Subtraímos a diferença (se ele adicionou 2, subtrai 2 do estoque. Se tirou 1, soma 1).
                      await updateDoc(prodRef, { stock: estoqueAtual - diferenca });
                  }
              }
              // Apaga do mapa para sabermos o que foi completamente deletado do carrinho
              delete oldQtyMap[newItem.id];
          }

          // Se sobrou algo no oldQtyMap, é porque o item inteiro foi deletado (clicou no Lixo). Devolvemos o total pro estoque.
          for (const [deletedId, deletedQty] of Object.entries(oldQtyMap)) {
              if (deletedId !== 'oferta-1') {
                  const prodRef = doc(db, "products", deletedId);
                  const prodDoc = await getDoc(prodRef);
                  if (prodDoc.exists()) {
                      const estoqueAtual = prodDoc.data().stock || 0;
                      await updateDoc(prodRef, { stock: estoqueAtual + deletedQty });
                  }
              }
          }
      }

      // 3. Salva o pedido no banco de dados com os novos itens e o novo total
      await updateDoc(doc(db, "orders", editingAdminOrder.id), {
        items: editCart,
        total: newTotal
      });
      
      showToast('Pedido atualizado com sucesso e estoque recalculado!', 'success');
      setEditingAdminOrder(null); // Fecha o modal
    } catch (err) {
      showToast('Erro ao atualizar pedido e estoque.', 'error');
    }
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
        // 1. MAPEIA OS LOTES LOGÍSTICOS (Apenas do mês vigente para não poluir com o passado!)
        const lotesLogisticos = [...new Set(validOrders.filter(o => {
            const ciclo = o.cicloFinanceiro || 'Julho/2026';
            return ciclo === mesReferenciaGlobal;
        }).map(o => o.deliveryDate || 'Ciclo Mensal'))].sort();

        // 2. MAPEIA OS CONSOLIDADOS FINANCEIROS (O passado vira tudo "Julho/2026")
        const pastasFinanceiras = [...new Set(validOrders.map(o => {
            if (o.cicloFinanceiro) return `Consolidado: ${o.cicloFinanceiro}`;
            return `Consolidado: Julho/2026`; // <- A mágica que junta tudo do passado!
        }))].sort();

        // Une tudo no menu de seleção do topo
        const ciclosExistentes = [...pastasFinanceiras, ...lotesLogisticos];

        // 🌟 CORREÇÃO DO "ESTADO FANTASMA" DO REACT 🌟
        const filtroAtivo = ciclosExistentes.includes(dashCycleFilter) ? dashCycleFilter : (ciclosExistentes[0] || '');

        // 3. FILTRO INTELIGENTE E BLINDADO
        const currentCycleOrders = validOrders.filter(o => {
          const cicloDoPedido = o.cicloFinanceiro || 'Julho/2026';

          if (filtroAtivo.startsWith('Consolidado:')) {
              const pastaFiltro = filtroAtivo.replace('Consolidado:', '').trim();
              return cicloDoPedido === pastaFiltro;
          } else {
              // 👇 A TRAVA DO MÊS ESTÁ AQUI 👇
              return (o.deliveryDate || 'Ciclo Mensal') === filtroAtivo && cicloDoPedido === mesReferenciaGlobal;
          }
      });

        // 4. CÁLCULO DAS MÉTRICAS FINANCEIRAS DO FILTRO SELECIONADO
        const faturamentoLote = currentCycleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const impostosLote = faturamentoLote * 0.08;
        let custoMercadoriaLote = 0;
        let unidadesVendidas = 0;

        currentCycleOrders.forEach(o => {
            (o.items || []).forEach(i => {
                const prod = products.find(p => String(p.id) === String(i.id));
                const itemCost = prod?.cost || 0; 
                const quantidade = i.qtd || i.qty || 1;
                custoMercadoriaLote += (itemCost * quantidade);
                unidadesVendidas += quantidade;
            });
        });

        const lucroLiquidoLote = faturamentoLote - custoMercadoriaLote - impostosLote;
        const margemLucroLote = faturamentoLote > 0 ? (lucroLiquidoLote / faturamentoLote) * 100 : 0;

        // 5. CÁLCULO DE MEMBROS: NOVOS VS RECORRENTES
        const uniqueCustomers = [...new Set(currentCycleOrders.map(o => o.email || o.whatsapp || o.customer))];
        let membrosNovos = 0;
        let membrosRecorrentes = 0;

        uniqueCustomers.forEach(customerId => {
            const allCustomerOrders = validOrders.filter(o => (o.email || o.whatsapp || o.customer) === customerId);
            const firstOrderEver = Math.min(...allCustomerOrders.map(o => new Date(o.date).getTime()));
            const firstOrderThisCycle = Math.min(...currentCycleOrders.filter(o => (o.email || o.whatsapp || o.customer) === customerId).map(o => new Date(o.date).getTime()));

            if (firstOrderEver < firstOrderThisCycle) {
                membrosRecorrentes++;
            } else {
                membrosNovos++;
            }
        });

        // 6. DADOS DO GRÁFICO DINÂMICO
        const salesByDay = currentCycleOrders.reduce((acc, o) => {
            if(!o.date) return acc;
            const d = new Date(o.date);
            const dateKey = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
            if (!acc[dateKey]) acc[dateKey] = 0;
            acc[dateKey] += (o.total || 0);
            return acc;
        }, {});
        
        const sortedDays = Object.keys(salesByDay).sort((a,b) => {
             const [da, ma] = a.split('/');
             const [db, mb] = b.split('/');
             return new Date(new Date().getFullYear(), parseInt(ma)-1, parseInt(da)) - new Date(new Date().getFullYear(), parseInt(mb)-1, parseInt(db));
        }).slice(-7);

        const maxSale = sortedDays.length > 0 ? Math.max(...sortedDays.map(d => salesByDay[d]), 100) : 100;
        // 7. CÁLCULO DO ESTOQUE ATUAL (Capital Imobilizado)
        const totalItensEstoque = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const capitalImobilizado = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);
        // 8. MOTORES DE EXPORTAÇÃO RÁPIDA (CSV) COM SKU E QUANTIDADES
        const exportarRelatorioEstoque = () => {
          // O \ufeff força o Excel a ler acentos corretamente (UTF-8)
          let csvContent = "data:text/csv;charset=utf-8,\ufeffSKU;PRODUTO;CATEGORIA;ESTOQUE_ATUAL;CUSTO_UNITARIO;CAPITAL_IMOBILIZADO\n";
          const rows = [...products]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => {
                  const stock = p.stock || 0;
                  const cost = p.cost || 0;
                  const totalVal = stock * cost;
                  return `${p.sku || '-'};${p.name};${p.category || '-'};${stock};${cost.toFixed(2).replace('.',',')};${totalVal.toFixed(2).replace('.',',')}`;
              });
          csvContent += rows.join("\n");
          const link = document.createElement("a");
          link.href = encodeURI(csvContent);
          link.download = `Posicao_Estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
          link.click();
          showToast("Relatório de Estoque baixado!");
      };

      const exportarRelatorioVendas = () => {
          let csvContent = "data:text/csv;charset=utf-8,\ufeffSKU;PRODUTO;QTD_VENDIDA;PRECO_MEDIO;TOTAL_ARRECADADO\n";
          const currentStats = {};
          
          // Varre o lote e soma as quantidades vendidas de cada produto
          currentCycleOrders.forEach(o => (o.items || []).forEach(i => {
             if (!currentStats[i.id]) {
                 // Busca o SKU original do produto no catálogo
                 const prodCatalogo = products.find(p => String(p.id) === String(i.id));
                 const sku = prodCatalogo ? (prodCatalogo.sku || '-') : '-';
                 currentStats[i.id] = { sku: sku, name: i.name, qty: 0, val: 0 };
             }
             const qtd = i.qtd || i.qty || 1;
             currentStats[i.id].qty += qtd; 
             currentStats[i.id].val += ((i.price || 0) * qtd);
          }));

          // Organiza do que vendeu mais para o que vendeu menos
          const rows = Object.values(currentStats)
              .sort((a,b) => b.qty - a.qty)
              .map(p => {
                  const avgPrice = p.qty > 0 ? p.val / p.qty : 0;
                  return `${p.sku};${p.name};${p.qty};${avgPrice.toFixed(2).replace('.',',')};${p.val.toFixed(2).replace('.',',')}`;
              });
          csvContent += rows.join("\n");
          const link = document.createElement("a");
          link.href = encodeURI(csvContent);
          link.download = `Vendas_${filtroAtivo.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
          link.click();
          showToast("Relatório de Vendas baixado!");
      };

        return (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h2 className="text-2xl font-black text-slate-800">DRE do Lote</h2>
                
                {/* 👇 ATUALIZADO PARA USAR O filtroAtivo 👇 */}
                <div className="bg-white p-2 border border-emerald-200 rounded-xl shadow-sm flex items-center gap-3">
                     <span className="font-bold text-slate-500 text-xs pl-2">Analisar:</span>
                     <select value={filtroAtivo} onChange={e => setDashCycleFilter(e.target.value)} className="p-2 border-none outline-none font-black text-emerald-800 bg-emerald-50 rounded-lg text-sm cursor-pointer">
                         {ciclosExistentes.map(data => (
                             <option key={data} value={data}>{data}</option>
                         ))}
                     </select>
                </div>
                {/* BOTÕES DE RELATÓRIO RÁPIDO */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button onClick={exportarRelatorioEstoque} className="bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center transition-colors">
                        <Download className="w-4 h-4 mr-2 text-orange-500"/> Baixar Posição de Estoque (Atual)
                    </button>
                    <button onClick={exportarRelatorioVendas} className="bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center transition-colors">
                        <Download className="w-4 h-4 mr-2 text-emerald-600"/> Baixar Vendas do Lote
                    </button>
                </div>

            </div>

           {/* 🚀 GRID ESTRATÉGICO: 4 CARDS (2x2 no Celular) */}
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
               
                {/* Card 1: Faturamento Bruto */}
                <div className="bg-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl text-white border border-slate-700 relative overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[135px]">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 sm:w-24 sm:h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 line-clamp-1">Faturamento Bruto</p>
                        <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-none mt-1 sm:mt-2 text-white truncate">R$ {faturamentoLote.toFixed(2).replace('.', ',')}</h3>
                    </div>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-medium mt-2 leading-tight">Total transacionado</p>
                </div>

                {/* Card 2: Lucro Líquido */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]">
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 line-clamp-1">Lucro Líquido</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-none mt-1 sm:mt-2 truncate">R$ {lucroLiquidoLote.toFixed(2).replace('.', ',')}</h3>
                    </div>
                    <div className="mt-2">
                        <span className="text-[8px] sm:text-[9px] bg-emerald-50 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-200 font-black truncate block w-fit">Margem: {margemLucroLote.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Card 3: Capital em Estoque */}
                <div className="bg-emerald-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-200/60 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]">
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1 line-clamp-1">Capital em Estoque</p>
                        <h3 className="text-lg sm:text-2xl font-black text-emerald-900 tracking-tight leading-none mt-1 sm:mt-2 truncate">R$ {capitalImobilizado.toFixed(2).replace('.', ',')}</h3>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600 mt-2 leading-tight truncate">{totalItensEstoque} un a pronta entrega</p>
                </div>

                {/* Card 4: Comunidade */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]">
                    <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 line-clamp-1">Membros Atendidos</p>
                        <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-none mt-1 sm:mt-2">{uniqueCustomers.length}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 text-[8px] font-black uppercase tracking-wider mt-2">
                        <span className="bg-slate-100 text-emerald-600 px-1.5 py-0.5 rounded w-fit">+{membrosNovos} Novos</span>
                        <span className="bg-slate-100 text-blue-600 px-1.5 py-0.5 rounded w-fit">{membrosRecorrentes} Voltas</span>
                    </div>
                  </div>
            </div>
          
           {/* 📊 SEÇÃO DE DETALHAMENTO: CUSTOS LOGÍSTICOS E OPERACIONAIS */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                
                {/* Bloco de Deduções DRE (CMV e Impostos alinhados horizontalmente) */}
                <div className="lg:col-span-2 bg-slate-100/50 p-5 rounded-3xl border border-gray-200/60 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Demonstrativo de Custos do Fornecedor</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Custos de Compra (CMV)</p>
                            <p className="text-lg font-black text-red-500">- R$ {custoMercadoriaLote.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impostos Retidos (8%)</p>
                            <p className="text-lg font-black text-orange-500">- R$ {impostosLote.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                </div>

                {/* Volume Girado (Focado na Logística da Sede) */}
                <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-slate-700/30 rounded-full blur-xl"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume Total Girado</p>
                        <p className="text-2xl font-black text-white mt-1 leading-none">{unidadesVendidas} <span className="text-xs font-medium text-slate-400">unidades</span></p>
                        <p className="text-[9px] text-slate-400 mt-2.5 font-medium">Movimentadas fisicamente pela van</p>
                    </div>
                    <Package className="w-10 h-10 text-slate-600 opacity-40 shrink-0 relative z-10"/>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GRÁFICO DINÂMICO */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-sm text-slate-800 mb-6">Picos de Venda no Período</h3>
                    <div className="flex items-end justify-between h-40 gap-1">
                        {sortedDays.length > 0 ? sortedDays.map((day, i) => {
                            const val = salesByDay[day];
                            const heightPercentage = Math.max((val / maxSale) * 75, 2);
                            return (
                                <div key={i} className="flex flex-col justify-end items-center flex-1 group relative h-full">
                                    <div className="opacity-0 group-hover:opacity-100 absolute text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded shadow-sm transition-opacity whitespace-nowrap z-10" style={{ bottom: `calc(${heightPercentage}% + 28px)` }}>
                                        R$ {val.toFixed(0)}
                                    </div>
                                    <div className="w-full max-w-[32px] bg-emerald-500 rounded-t hover:bg-emerald-400 transition-colors" style={{ height: `${heightPercentage}%` }}></div>
                                    <span className="text-[8px] font-bold text-gray-400 mt-2 h-4 shrink-0">{day}</span>
                                </div>
                            );
                        }) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300">Nenhuma venda registrada neste lote.</div>
                        )}
                    </div>
                </div>

                {/* DESEMPENHO POR POLO */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-sm text-slate-800 mb-4">Desempenho por JC</h3>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {Object.entries(currentCycleOrders.reduce((acc, o) => {
                            if (!acc[o.polo]) acc[o.polo] = 0;
                            acc[o.polo] += (o.total || 0);
                            return acc;
                        }, {})).sort((a, b) => b[1] - a[1]).map(([polo, valor]) => (
                            <div key={polo} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-600"/>
                                    <span className="font-bold text-slate-700 text-xs">{polo}</span>
                                </div>
                                <span className="font-black text-emerald-800 text-sm">R$ {valor.toFixed(2).replace('.', ',')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        );
      }
   
      if (adminTab === 'vendas') {
        // 1. FILTRO DE BUSCA (Por Nome/ID) e POR DATA
        const filteredVendas = validOrders.filter(o => {
            // Filtro de Texto
            const matchText = (o.customer || '').toLowerCase().includes(vendasSearchTerm.toLowerCase()) || 
                              (o.id || '').toLowerCase().includes(vendasSearchTerm.toLowerCase());
            
            // Filtro de Data
            let matchDate = true;
            if (vendasStartDate || vendasEndDate) {
                const oDate = new Date(o.date);
                oDate.setHours(0,0,0,0); // Zera as horas para comparar o dia inteiro
                
                if (vendasStartDate) {
                    const start = new Date(vendasStartDate + 'T00:00:00');
                    if (oDate < start) matchDate = false;
                }
                if (vendasEndDate) {
                    const end = new Date(vendasEndDate + 'T23:59:59');
                    if (oDate > end) matchDate = false;
                }
            }
            return matchText && matchDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordena: Mais Novo no Topo

        const totalFiltrado = filteredVendas.reduce((sum, o) => sum + (o.total || 0), 0);

        return (
          <div className="space-y-6 text-left max-w-6xl mx-auto">
            {/* CABEÇALHO E FILTROS */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Histórico de Vendas</h2>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                        Mostrando <span className="text-emerald-600">{filteredVendas.length} pedidos</span> • Total: R$ {totalFiltrado.toFixed(2)}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* FILTRO DE DATAS */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-emerald-500 transition-colors">
                        <input 
                            type="date" 
                            value={vendasStartDate} 
                            onChange={e => setVendasStartDate(e.target.value)} 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer" 
                        />
                        <span className="text-[10px] font-black text-gray-400 uppercase">ATÉ</span>
                        <input 
                            type="date" 
                            value={vendasEndDate} 
                            onChange={e => setVendasEndDate(e.target.value)} 
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer" 
                        />
                        {(vendasStartDate || vendasEndDate) && (
                            <button onClick={() => {setVendasStartDate(''); setVendasEndDate('');}} className="text-gray-400 hover:text-red-500 ml-1 bg-gray-100 p-1 rounded-md"><X className="w-3 h-3"/></button>
                        )}
                    </div>
                    
                    {/* BARRA DE BUSCA (Texto) */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-64 focus-within:border-emerald-500 transition-colors">
                        <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0"/>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou #PED..." 
                            value={vendasSearchTerm}
                            onChange={(e) => setVendasSearchTerm(e.target.value)}
                            className="bg-transparent outline-none w-full text-sm font-medium text-slate-700"
                        />
                        {vendasSearchTerm && <button onClick={() => setVendasSearchTerm('')} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>}
                    </div>
                </div>
            </div>

            {/* TABELA LINHA A LINHA */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Títulos da Tabela (Some no celular, aparece no PC) */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <div className="col-span-3">Data / Pedido</div>
                    <div className="col-span-3">Cliente</div>
                    <div className="col-span-2">Unidade (JC)</div>
                    <div className="col-span-2 text-right">Valor Final</div>
                    <div className="col-span-2 text-right">Ações Rápidas</div>
                </div>

                {filteredVendas.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-3"/>
                        <p className="text-gray-500 font-medium text-sm">Nenhum pedido encontrado com estes filtros.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredVendas.map(o => (
                            <div key={o.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 items-center hover:bg-slate-50/50 transition-colors">
                                
                                {/* COLUNA 1: Data e ID */}
                                <div className="md:col-span-3 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start">
                                    <span className="text-xs font-bold text-slate-500">{new Date(o.date).toLocaleString('pt-BR')}</span>
                                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded w-fit md:mt-1">#{o.id.slice(0,5).toUpperCase()}</span>
                                </div>
                                
                                {/* COLUNA 2: Nome do Cliente */}
                                <div className="md:col-span-3">
                                    <p className="font-black text-slate-800 text-sm leading-tight">{o.customer}</p>
                                </div>
                                
                                {/* COLUNA 3: Polo */}
                                <div className="md:col-span-2">
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                                        <MapPin className="w-3 h-3 mr-1 shrink-0"/> <span className="truncate">{o.polo}</span>
                                    </span>
                                </div>
                                
                                {/* COLUNA 4: Valor */}
                                <div className="md:col-span-2 md:text-right">
                                    <span className="font-black text-slate-800 text-base">R$ {(o.total||0).toFixed(2)}</span>
                                </div>
                                
                                {/* COLUNA 5: Botões de Ação */}
                                <div className="md:col-span-2 flex items-center md:justify-end gap-2 mt-2 md:mt-0">
                                    <button onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditingAdminOrder(o);
                                        setEditCart(o.items ? JSON.parse(JSON.stringify(o.items)) : []);
                                    }} className="flex-1 md:flex-none text-blue-600 hover:text-blue-800 hover:bg-blue-100 text-[10px] font-bold flex items-center justify-center bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-100">
                                        <Edit2 className="w-3 h-3 md:mr-1.5"/> <span className="md:hidden lg:inline">Editar</span>
                                    </button>
                                    
                                    <button onClick={(e) => { 
                                        e.stopPropagation();
                                        showConfirm(
                                            'Cancelar Pedido', 
                                            `Deseja realmente excluir o pedido de ${o.customer}? O estoque será devolvido se for pronta entrega.`, 
                                            async () => {
                                                try {
                                                    const isPedidoFeira = (o.deliveryDate || '').toLowerCase().includes('pronta entrega') || o.status === 'pago_polo';
                                                    if (storeMode === 'estoque' || storeMode === 'pronta_entrega' || isPedidoFeira) {
                                                        for (const item of (o.items || [])) {
                                                            if (item.id !== 'oferta-1') {
                                                                const prodRef = doc(db, "products", item.id);
                                                                const prodDoc = await getDoc(prodRef);
                                                                if (prodDoc.exists()) {
                                                                    const estoqueAtual = prodDoc.data().stock || 0;
                                                                    const quantidadeDevolvida = item.qtd || item.qty || 1;
                                                                    await updateDoc(prodRef, { stock: estoqueAtual + quantidadeDevolvida });
                                                                }
                                                            }
                                                        }
                                                    }
                                                    await deleteDoc(doc(db, "orders", o.id)); 
                                                    showToast('Pedido cancelado e resolvido!');
                                                } catch(err) { showToast('Erro ao cancelar', 'error'); }
                                            }, 'danger'
                                        );
                                    }} className="flex-1 md:flex-none text-red-600 hover:text-red-800 hover:bg-red-100 text-[10px] font-bold flex items-center justify-center bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100">
                                        <Trash2 className="w-3 h-3 md:mr-1.5"/> <span className="md:hidden lg:inline">Excluir</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* MODAL DE EDIÇÃO DO ADMIN */}
            {editingAdminOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800">Editar Pedido</h3>
                                <p className="text-xs text-gray-500 font-bold">{editingAdminOrder.customer}</p>
                            </div>
                            <button onClick={() => setEditingAdminOrder(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        {/* LISTA DE PRODUTOS PARA EDITAR */}
                        <div className="p-4 overflow-y-auto space-y-3 flex-1">
                            {editCart.map((item, idx) => {
                                const quantidade = item.qtd || item.qty || 1;
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                                        <div className="flex-1 pr-3">
                                            <p className="font-bold text-sm text-slate-800 leading-tight">{item.name}</p>
                                            <p className="text-xs text-gray-400 font-bold mt-0.5">R$ {(item.price || 0).toFixed(2)} / un</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 border border-gray-200 rounded-lg p-1">
                                            <button onClick={() => {
                                                const newCart = [...editCart];
                                                if (quantidade > 1) {
                                                    newCart[idx].qtd = quantidade - 1;
                                                    newCart[idx].qty = quantidade - 1;
                                                    setEditCart(newCart);
                                                } else {
                                                    if(window.confirm('Remover este item do pedido?')) {
                                                        newCart.splice(idx, 1);
                                                        setEditCart(newCart);
                                                    }
                                                }
                                            }} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-red-500 rounded-md font-bold text-lg transition-colors shadow-sm">-</button>
                                            
                                            <span className="w-4 text-center font-black text-slate-800 text-sm">{quantidade}</span>
                                            
                                            <button onClick={() => {
                                                const newCart = [...editCart];
                                                newCart[idx].qtd = quantidade + 1;
                                                newCart[idx].qty = quantidade + 1;
                                                setEditCart(newCart);
                                            }} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-emerald-500 rounded-md font-bold text-lg transition-colors shadow-sm">+</button>
                                        </div>
                                    </div>
                                )
                            })}
                            {editCart.length === 0 && (
                                <div className="text-center py-6 bg-red-50 rounded-xl border border-red-100">
                                    <p className="text-red-600 font-bold text-sm">O pedido ficará vazio.</p>
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ DO MODAL */}
                        <div className="p-4 border-t border-gray-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setEditingAdminOrder(null)} className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSaveAdminOrder} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition-colors">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
          </div>
        );
      }

      if (adminTab === 'itens_vendidos') {
        // 1. Filtro de Ciclo (Reaproveita o consolidado blindado do dashboard)
        const lotesLogisticos = [...new Set(validOrders.filter(o => {
            const ciclo = o.cicloFinanceiro || 'Julho/2026';
            return ciclo === mesReferenciaGlobal;
        }).map(o => o.deliveryDate || 'Ciclo Mensal'))].sort();

        const pastasFinanceiras = [...new Set(validOrders.map(o => {
            if (o.cicloFinanceiro) return `Consolidado: ${o.cicloFinanceiro}`;
            return `Consolidado: Julho/2026`; 
        }))].sort();

        const ciclosExistentes = [...pastasFinanceiras, ...lotesLogisticos];
        const filtroAtivo = ciclosExistentes.includes(dashCycleFilter) ? dashCycleFilter : (ciclosExistentes[0] || '');

        const currentCycleOrders = validOrders.filter(o => {
          const cicloDoPedido = o.cicloFinanceiro || 'Julho/2026';

          if (filtroAtivo.startsWith('Consolidado:')) {
              const pastaFiltro = filtroAtivo.replace('Consolidado:', '').trim();
              return cicloDoPedido === pastaFiltro;
          } else {
               // 👇 A TRAVA DO MÊS ESTÁ AQUI 👇
               return (o.deliveryDate || 'Ciclo Mensal') === filtroAtivo && cicloDoPedido === mesReferenciaGlobal;
          }
      });

        // 2. O CÉREBRO: Agrupa todos os pedidos, quebrando-os por Produto
        const produtosAgrupados = {};
        currentCycleOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const prodId = item.id;
                if (!produtosAgrupados[prodId]) {
                    produtosAgrupados[prodId] = {
                        id: prodId,
                        name: item.name,
                        totalQty: 0,
                        buyers: []
                    };
                }
                const qty = item.qtd || item.qty || 1;
                produtosAgrupados[prodId].totalQty += qty;
                
                // Status da entrega e financeiro
                const isPago = order.status === 'pago' || order.status === 'pago_polo';
                const isEntregue = order.entregue;

                produtosAgrupados[prodId].buyers.push({
                    orderId: order.id,
                    customer: order.customer,
                    polo: order.polo,
                    qty: qty,
                    isPago: isPago,
                    isEntregue: isEntregue,
                    date: order.date
                });
            });
        });

        const listaProdutos = Object.values(produtosAgrupados)
            .filter(p => p.name.toLowerCase().includes((itensVendidosSearch || '').toLowerCase()))
            .sort((a, b) => b.totalQty - a.totalQty); // Os que venderam mais ficam no topo

        return (
            <div className="space-y-6 text-left max-w-6xl mx-auto">
                {/* CABEÇALHO */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Saídas por Produto</h2>
                        <p className="text-xs font-bold text-gray-500 mt-1">Veja exatamente quem comprou cada item e controle as retiradas.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Filtro de Ciclo/Lote */}
                        <div className="bg-white p-2 border border-emerald-200 rounded-xl shadow-sm flex items-center gap-2">
                             <span className="font-bold text-slate-500 text-xs pl-2">Analisar:</span>
                             <select value={filtroAtivo} onChange={e => setDashCycleFilter(e.target.value)} className="p-2 border-none outline-none font-black text-emerald-800 bg-emerald-50 rounded-lg text-sm cursor-pointer">
                                 {ciclosExistentes.map(data => (
                                     <option key={data} value={data}>{data}</option>
                                 ))}
                             </select>
                        </div>
                        {/* Busca de Produto Rápida */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-64 focus-within:border-emerald-500 transition-colors">
                            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0"/>
                            <input 
                                type="text" 
                                placeholder="Buscar Hamburguer, Ovo..." 
                                value={itensVendidosSearch}
                                onChange={(e) => setItensVendidosSearch(e.target.value)}
                                className="bg-transparent outline-none w-full text-sm font-medium text-slate-700"
                            />
                            {itensVendidosSearch && <button onClick={() => setItensVendidosSearch('')} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>}
                        </div>
                    </div>
                </div>

                {/* LISTAGEM DE PRODUTOS */}
                <div className="space-y-3">
                    {listaProdutos.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                            <Package className="w-12 h-12 mx-auto text-gray-200 mb-3"/>
                            <p className="text-gray-500 font-medium text-sm">Nenhum produto encontrado neste lote.</p>
                        </div>
                    ) : (
                        listaProdutos.map(prod => {
                            const isExpanded = expandedProductReport[prod.id];
                            
                            // Calcula quantos itens dessa mercadoria já foram entregues
                            const entregues = prod.buyers.filter(b => b.isEntregue).reduce((sum, b) => sum + b.qty, 0);
                            const pendentes = prod.totalQty - entregues;

                            return (
                                <div key={prod.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                                    <div 
                                        onClick={() => setExpandedProductReport(prev => ({...prev, [prod.id]: !prev[prod.id]}))}
                                        className="p-4 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-lg shrink-0 border border-emerald-100 shadow-sm">
                                                {prod.totalQty}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-base leading-tight">{prod.name}</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${pendentes === 0 ? 'bg-gray-100 text-gray-400' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                                        {pendentes} a retirar
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${entregues > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                                                        {entregues} já entregues
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 ml-4">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
                                        </div>
                                    </div>

                                    {/* LISTA DE CLIENTES QUE COMPRARAM ESTE PRODUTO */}
                                    {isExpanded && (
                                        <div className="bg-slate-50 border-t border-gray-100 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {prod.buyers.sort((a,b) => new Date(b.date) - new Date(a.date)).map((buyer, idx) => (
                                                    <div key={idx} className={`p-3 rounded-xl border shadow-sm flex flex-col gap-2 ${buyer.isEntregue ? 'bg-white border-gray-200 opacity-60' : 'bg-white border-emerald-200'}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-1" title={buyer.customer}>{buyer.customer}</p>
                                                                <p className="text-[10px] text-gray-500 font-black mt-0.5 uppercase tracking-widest"><MapPin className="w-3 h-3 inline mr-1 -mt-0.5"/>{buyer.polo}</p>
                                                            </div>
                                                            <div className="font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs shrink-0">
                                                                {buyer.qty}x
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${buyer.isPago ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                                                {buyer.isPago ? '💲 Pago' : '⏳ Não Pago'}
                                                            </span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${buyer.isEntregue ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                                                {buyer.isEntregue ? '✅ Entregue' : '🛍️ No Balcão'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        );
      }

      if (adminTab === 'compras') {
        // 1. O SISTEMA LÊ AS DATAS AQUI (E consolida o passado no filtro):
        const datasExistentes = [...new Set(
            orders.filter(o => {
                if(!o.date) return false;
                const ciclo = o.cicloFinanceiro || 'Julho/2026';
                return ciclo === mesReferenciaGlobal;
            }).map(o => o.deliveryDate || 'Ciclo Mensal')
        )].sort();
       return (
         <div className="space-y-6 text-left max-w-6xl mx-auto">
           <h2 className="text-2xl font-black text-emerald-900 mb-4">Inteligência de Compras</h2>
           
           {!purchasePlan ? (
               <div className="flex flex-col gap-3 bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm text-center sm:text-left">
                  <h3 className="font-black text-emerald-900 text-lg mb-1">Mesa Operacional</h3>
                  <p className="text-sm font-medium text-emerald-800 mb-4 max-w-2xl">O algoritmo calculará o envio direto para os JCs de Cross-docking e organizará a demanda da Sede. Você poderá alterar as quantidades de compra sugeridas antes de gerar o arquivo do fornecedor.</p>
                  
                  {/* 👇 2. O NOVO FILTRO ENTRA EXATAMENTE AQUI 👇 */}
                 <div className="mb-2 bg-white p-4 border border-emerald-100 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                     <span className="font-bold text-slate-800 text-sm shrink-0">Filtrar Lote:</span>
                     <select value={mesaDateFilter} onChange={e => setMesaDateFilter(e.target.value)} className="p-2.5 border border-emerald-200 rounded-lg outline-none font-black text-emerald-800 bg-emerald-50 text-sm flex-1 cursor-pointer">
                         <option value="Todos">Mostrar Tudo Misturado</option>
                         {datasExistentes.map(data => (
                             <option key={data} value={data}>Lote: {data}</option>
                         ))}
                     </select>
                 </div>
                 {/* 👆 FIM DO NOVO FILTRO 👆 */}

                  <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={generatePurchasePlan} className="bg-emerald-700 text-white font-black px-6 py-4 rounded-xl shadow-lg hover:bg-emerald-800 flex items-center justify-center text-sm transition-transform hover:scale-[1.02] flex-1"><Package className="w-5 h-5 mr-2"/> Iniciar Mesa de Compras</button>
                      <button onClick={() => setIsPrintMode(true)} className="bg-white text-emerald-800 font-black px-6 py-4 rounded-xl shadow-sm border-2 border-emerald-200 hover:bg-emerald-50 flex items-center justify-center text-sm flex-1"><Printer className="w-5 h-5 mr-2"/> Emitir Romaneio (Logística Sede)</button>
                  </div>
               </div>
           ) : (
               <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200">
                   <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-5">
                       <div>
                       <h3 className="font-black text-slate-800 text-2xl tracking-tight">Painel de Compras e Estoque</h3>
                           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Ajuste as caixas no controlador abaixo</p>
                       </div>
                       <button onClick={() => setPurchasePlan(null)} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><X className="w-6 h-6"/></button>
                   </div>

                   <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto pr-2">
                       {purchasePlan.map(item => {
                           const newStock = (item.stock + (item.boxesToBuy * item.minBox)) - item.demandSede;
                           const isShortage = newStock < 0;

                           return (
                               <div key={item.id} className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all ${isShortage ? 'border-red-300 bg-red-50/50' : 'border-gray-100 bg-white hover:border-emerald-200'}`}>
                                   <div className="flex-1">
                                       <p className="font-black text-slate-800 text-base mb-1">{item.name}</p>
                                       <div className="flex flex-wrap gap-2 text-[10px] font-bold text-gray-600 font-mono">
                                          <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">Estoque Local: {item.stock}</span>
                                          <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">Pedidos Sede (HUB): {item.demandSede}</span>
                                          <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">Caixa Mínima: {item.minBox} un</span>
                                       </div>
                                       
                                       {item.demandCross.length > 0 && (
                                           <div className="mt-3 flex flex-wrap gap-2">
                                               {item.demandCross.map((cd, idx) => (
                                                   <span key={idx} className="bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-md flex items-center shadow-sm"><Truck className="w-3.5 h-3.5 mr-1.5"/> {cd.boxes} Cx ➔ JC {cd.polo}</span>
                                               ))}
                                           </div>
                                       )}
                                   </div>
                                   
                                   <div className="flex items-center gap-6 border-t xl:border-t-0 border-gray-100 pt-4 xl:pt-0">
                                       <div className="flex flex-col items-center">
                                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comprar para Sede</span>
                                           <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                               <button onClick={() => setPurchasePlan(plan => plan.map(p => p.id === item.id ? {...p, boxesToBuy: Math.max(0, p.boxesToBuy - 1)} : p))} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-black text-lg transition-colors">-</button>
                                               <span className="w-12 text-center font-black text-slate-800 text-base">{item.boxesToBuy} cx</span>
                                               <button onClick={() => setPurchasePlan(plan => plan.map(p => p.id === item.id ? {...p, boxesToBuy: p.boxesToBuy + 1} : p))} className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 font-black text-lg transition-colors">+</button>
                                           </div>
                                       </div>

                                       <div className="flex flex-col items-end min-w-[100px] bg-slate-50 p-3 rounded-xl border border-gray-100">
                                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{isShortage ? 'Faltará' : 'Estoque Final'}</span>
                                           <span className={`font-black text-2xl tracking-tight ${isShortage ? 'text-red-600' : 'text-emerald-600'}`}>
                                               {isShortage ? newStock : `+${newStock}`}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                           );
                       })}
                   </div>

                   <button onClick={confirmAndExportPurchasePlan} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-700 flex items-center justify-center transition-all text-base">
                       <Download className="w-5 h-5 mr-2"/> Gravar Estoque Local e Baixar CSV
                   </button>
               </div>
           )}
         </div>
       );
     }

     if (adminTab === 'logistica') {
      const currentCycleOrders = validOrders.filter(o => {
          const ciclo = o.cicloFinanceiro || 'Julho/2026';
          return ciclo === sysConfig.mesReferencia;
      });

      const demandaPorProduto = {};
      
      currentCycleOrders.forEach(order => {
          (order.items || []).forEach(item => {
              if (!demandaPorProduto[item.id]) {
                  demandaPorProduto[item.id] = {
                      id: item.id,
                      name: item.name,
                      reqTaubate: 0, 
                      reqAdyana: 0,
                  };
              }
              const qty = item.qtd || item.qty || 1;
              
              if (order.polo === 'Taubaté' || order.polo === 'Pindamonhangaba') {
                  demandaPorProduto[item.id].reqTaubate += qty;
              } else if (order.polo === 'Vila Adyana') {
                  demandaPorProduto[item.id].reqAdyana += qty;
              }
          });
      });

      const listaLogistica = Object.values(demandaPorProduto).map(demanda => {
          const prodCatalogo = products.find(p => p.id === demanda.id);
          const tamanhoCaixa = prodCatalogo?.minBox || prodCatalogo?.itensPorCaixa || 1; 
          
          const sugeridoTaubate = Math.floor(demanda.reqTaubate / tamanhoCaixa);
          const sugeridoAdyana = Math.floor(demanda.reqAdyana / tamanhoCaixa);
          
          const inputTaubate = caixasDirecionadas[demanda.id]?.taubate !== undefined ? caixasDirecionadas[demanda.id].taubate : sugeridoTaubate;
          const inputAdyana = caixasDirecionadas[demanda.id]?.adyana !== undefined ? caixasDirecionadas[demanda.id].adyana : sugeridoAdyana;
          
          const numTaubate = Number(inputTaubate) || 0;
          const numAdyana = Number(inputAdyana) || 0;

          const unidadesTaubate = numTaubate * tamanhoCaixa;
          const unidadesAdyana = numAdyana * tamanhoCaixa;

          // Calcula o que faltou ou o que sobrou
          const retiraTaubate = demanda.reqTaubate - unidadesTaubate;
          const retiraAdyana = demanda.reqAdyana - unidadesAdyana;

          return {
              ...demanda,
              tamanhoCaixa,
              inputTaubate,
              inputAdyana,
              unidadesTaubate,
              unidadesAdyana,
              retiraTaubate,
              retiraAdyana
          };
      }).filter(item => item.reqTaubate > 0 || item.reqAdyana > 0);

      // 👇 CORREÇÃO AQUI: Permite digitar ZERO ou apagar o número sem o React travar
      const handleAtualizarCaixa = (prodId, polo, valor) => {
          let num = valor === '' ? '' : parseInt(valor);
          if (num !== '' && isNaN(num)) num = 0;

          setCaixasDirecionadas(prev => ({
              ...prev,
              [prodId]: {
                  ...(prev[prodId] || {}),
                  [polo]: num
              }
          }));
      };

      return (
          <div className="space-y-6 text-left max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800">Mapa de Separação (Cross-Docking)</h2>
                      <p className="text-sm font-medium text-gray-500 mt-1">Ajuste as caixas enviadas. O sistema calculará o que vai na Van e o que a unidade precisará buscar na Sede.</p>
                  </div>
                  <button onClick={() => setPrintLayout('logistica')} className="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl shadow-md hover:bg-emerald-700 transition flex items-center shrink-0">
                      <Printer className="w-5 h-5 mr-2"/> Imprimir Ordem de Separação
                  </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                              <tr>
                                  <th className="px-4 py-4">Produto</th>
                                  <th className="px-4 py-4 text-center border-l border-gray-200 bg-blue-50/50">Taubaté + Pinda</th>
                                  <th className="px-4 py-4 text-center border-l border-gray-200 bg-orange-50/50">Vila Adyana</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {listaLogistica.length === 0 ? (
                                  <tr><td colSpan="3" className="text-center py-8 text-gray-400 font-medium">Nenhum pedido para estes polos neste ciclo.</td></tr>
                              ) : (
                                  listaLogistica.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3">
                                              <p className="font-bold text-slate-800">{item.name}</p>
                                              <p className="text-[10px] text-gray-500 font-black uppercase mt-0.5">Caixa com: {item.tamanhoCaixa} un</p>
                                          </td>
                                          
                                          {/* COLUNA TAUBATÉ */}
                                          <td className="px-4 py-3 border-l border-gray-100 bg-blue-50/10">
                                              <div className="flex flex-col items-center gap-2">
                                                  <div className="text-xs font-medium text-gray-600">
                                                      Pedidos: <span className="font-black text-slate-800">{item.reqTaubate} un</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-[10px] font-bold uppercase text-gray-400">Caixas:</span>
                                                      <input 
                                                          type="number" 
                                                          min="0"
                                                          value={item.inputTaubate === '' ? '' : item.inputTaubate} 
                                                          onChange={e => handleAtualizarCaixa(item.id, 'taubate', e.target.value)}
                                                          className="w-16 p-1 text-center border border-gray-300 rounded font-bold outline-none focus:border-blue-500"
                                                      />
                                                  </div>
                                                  <div className="flex flex-col gap-1.5 w-full mt-1 px-4">
                                                      {item.unidadesTaubate > 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center justify-center">
                                                              <Truck className="w-3.5 h-3.5 mr-1.5 shrink-0"/> Na Van: {item.unidadesTaubate} un
                                                          </div>
                                                      )}
                                                      {item.retiraTaubate > 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 shadow-sm flex items-center justify-center text-center">
                                                              🛒 Separar na Sede: {item.retiraTaubate} un
                                                          </div>
                                                      )}
                                                      {item.retiraTaubate < 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 shadow-sm flex items-center justify-center text-center">
                                                              ⚠️ Sobram: {Math.abs(item.retiraTaubate)} un
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </td>

                                          {/* COLUNA VILA ADYANA */}
                                          <td className="px-4 py-3 border-l border-gray-100 bg-orange-50/10">
                                              <div className="flex flex-col items-center gap-2">
                                                  <div className="text-xs font-medium text-gray-600">
                                                      Pedidos: <span className="font-black text-slate-800">{item.reqAdyana} un</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-[10px] font-bold uppercase text-gray-400">Caixas:</span>
                                                      <input 
                                                          type="number" 
                                                          min="0"
                                                          value={item.inputAdyana === '' ? '' : item.inputAdyana} 
                                                          onChange={e => handleAtualizarCaixa(item.id, 'adyana', e.target.value)}
                                                          className="w-16 p-1 text-center border border-gray-300 rounded font-bold outline-none focus:border-orange-500"
                                                      />
                                                  </div>
                                                  <div className="flex flex-col gap-1.5 w-full mt-1 px-4">
                                                      {item.unidadesAdyana > 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white shadow-sm flex items-center justify-center">
                                                              <Truck className="w-3.5 h-3.5 mr-1.5 shrink-0"/> Na Van: {item.unidadesAdyana} un
                                                          </div>
                                                      )}
                                                      {item.retiraAdyana > 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 shadow-sm flex items-center justify-center text-center">
                                                              🛒 Separar na Sede: {item.retiraAdyana} un
                                                          </div>
                                                      )}
                                                      {item.retiraAdyana < 0 && (
                                                          <div className="px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 shadow-sm flex items-center justify-center text-center">
                                                              ⚠️ Sobram: {Math.abs(item.retiraAdyana)} un
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
    }

     if (adminTab === 'catalogo') {
      const baixarModeloCSV = () => {
          let csvContent = "data:text/csv;charset=utf-8,\ufeffSKU;NOME_DO_PRODUTO;CATEGORIA;PRECO_VENDA;CUSTO_COMPRA;QTD_CAIXA\n";
          if (products && products.length > 0) {
              const rows = products.map(p => `${p.sku || ''};${p.name || ''};${p.category || 'Geral'};${(p.price || 0).toFixed(2)};${(p.cost || 0).toFixed(2)};${p.minBox || 1}`);
              csvContent += rows.join("\n");
          } else {
              csvContent += "EX-001;Sobrecoxa de Frango 1Kg;Carnes;22.50;15.00;1\nEX-002;Arroz Orgânico 5Kg;Mercearia;25.90;18.00;1";
          }
          const link = document.createElement("a");
          link.href = encodeURI(csvContent);
          link.download = "Catalogo_Produtos.csv";
          link.click();
      };

      const handleZerarEstoque = async () => {
        showConfirm('Zerar Estoque', 'ATENÇÃO: Você tem certeza que deseja ZERAR o estoque local de TODOS os produtos? Essa ação não pode ser desfeita.', async () => {
            try {
                for (const p of products) {
                    if ((p.stock || 0) > 0) {
                        await updateDoc(doc(db, "products", p.id), { stock: 0 });
                    }
                }
                showToast('Estoque zerado com sucesso!');
                setProducts(prev => prev.map(prod => ({...prod, stock: 0})));
            } catch(e) { showToast('Erro ao zerar estoque', 'error'); }
        }, 'danger');
      };

      const handleTogglePausa = async (produtoId, estadoAtual) => {
        try {
            await updateDoc(doc(db, "products", produtoId), { pausado: !estadoAtual });
            showToast(estadoAtual ? 'Produto reativado na vitrine!' : 'Produto pausado com sucesso!');
            setProducts(prev => prev.map(p => p.id === produtoId ? { ...p, pausado: !estadoAtual } : p));
        } catch(e) { showToast('Erro ao atualizar status', 'error'); }
      };

      // 1. INTELIGÊNCIA: Agrupa os produtos por Categoria automaticamente
      const productsByCategory = products.reduce((acc, p) => {
        const cat = p.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {});

      const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort();

      return (
        <div className="space-y-6 text-left max-w-7xl mx-auto">
          <h2 id="topo-catalogo" className="text-2xl font-black text-slate-800 mb-4">Gestão de Catálogo</h2>
          
          {/* BARRA DE IMPORTAÇÃO */}
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h3 className="font-black text-emerald-900 text-sm">Importação & Edição em Lote (CSV)</h3>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">Planilha completa integrada: SKU, Nome, Categoria, Preço, Custo e Caixa do Fornecedor.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                   <button onClick={() => setPrintLayout('catalogo')} className="bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-lg font-black hover:bg-gray-50 shadow-sm inline-flex items-center text-xs transition-colors w-full sm:w-auto justify-center">
                     <Printer className="w-4 h-4 mr-2"/> Catálogo de Mesa
                   </button>
                    {/* 👇 NOVO BOTÃO DO CARTAZ 👇 */}
                   <button onClick={() => setPrintLayout('cartaz')} className="bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-lg font-black hover:bg-gray-50 shadow-sm inline-flex items-center text-xs transition-colors w-full sm:w-auto justify-center">
                     <Printer className="w-4 h-4 mr-2"/> Cartaz de Parede (A4)
                   </button>
                   {/* 👆 FIM DO NOVO BOTÃO 👆 */}
                   <button onClick={() => setPrintLayout('plaquinhas')} className="bg-white text-slate-700 border border-gray-200 px-4 py-2.5 rounded-lg font-black hover:bg-gray-50 shadow-sm inline-flex items-center text-xs transition-colors w-full sm:w-auto justify-center">
                     <Printer className="w-4 h-4 mr-2"/> Gerar Plaquinhas
                   </button>
                   <button onClick={handleZerarEstoque} className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2.5 rounded-lg font-black hover:bg-orange-100 shadow-sm inline-flex items-center text-xs transition-colors w-full sm:w-auto justify-center">
                     <Trash2 className="w-4 h-4 mr-2"/> Zerar Estoque Geral
                   </button>
                   <button onClick={baixarModeloCSV} className="bg-white text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-lg font-black hover:bg-emerald-100 shadow-sm inline-flex items-center text-xs transition-colors w-full sm:w-auto justify-center">
                     <Download className="w-4 h-4 mr-2"/> Baixar Base (.CSV)
                   </button>
                 <label className="bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-black cursor-pointer hover:bg-emerald-800 shadow-sm inline-flex items-center text-xs transition-colors m-0 w-full sm:w-auto justify-center">
                   <Upload className="w-4 h-4 mr-2"/> Subir Tabela Atualizada
                   <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload}/>
                 </label>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LADO ESQUERDO: FORMULÁRIO */}
              <div className="w-full lg:col-span-5 lg:sticky lg:top-20 bg-transparent">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center justify-between">
                          {editingProduct ? '✏️ Editando Produto' : '✨ Novo Produto'}
                          {editingProduct && <button onClick={() => setEditingProduct(null)} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded hover:bg-gray-200">Cancelar</button>}
                      </h3>
                      
                      <form key={editingProduct?.id || 'new'} onSubmit={async(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const np = { 
                         name: fd.get('name'), sku: fd.get('sku'), category: fd.get('category'), 
                         price: parseFloat(fd.get('price').replace(',','.')), 
                         promotionalPrice: parseFloat(fd.get('promotionalPrice').replace(',','.')) || 0, 
                         cost: parseFloat(fd.get('cost').replace(',','.')) || 0,
                         stock: parseInt(fd.get('stock')||'0'), minBox: parseInt(fd.get('minBox')||'1'), 
                         image: editingProduct?.image || '📦',
                         pausado: editingProduct?.pausado || false
                        };
                        const fileInput = e.target.querySelector('input[type="file"]');
                        if (fileInput.files[0]) { 
                            const imageBlob = await compressImage(fileInput.files[0]);
                            const imageName = `produtos/${Date.now()}_${fileInput.files[0].name}`;
                            const imageRef = ref(storage, imageName);
                            await uploadBytes(imageRef, imageBlob);
                            np.image = await getDownloadURL(imageRef);
                        }
                        try { 
                           if(editingProduct) await updateDoc(doc(db,"products",editingProduct.id), np);
                           else await addDoc(collection(db,"products"), np); 
                           setEditingProduct(null); e.target.reset(); showToast('Salvo!');
                        } catch(er){ showToast('Erro', 'error'); }
                      }} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        
                         <div className="flex flex-col gap-3">
                           <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                 {editingProduct?.image?.length > 50 ? <img src={editingProduct.image} className="w-full h-full object-cover"/> : <ImageIcon className="w-5 h-5 text-gray-400"/>}
                              </div>
                              <label className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold cursor-pointer text-xs transition-colors hover:bg-emerald-100">Escolher Foto <input type="file" accept="image/*" className="hidden" /></label>
                           </div>
                           
                           <input name="name" defaultValue={editingProduct?.name} placeholder="Nome do Produto" required className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                           
                           <div className="grid grid-cols-2 gap-3">
                               <input name="sku" defaultValue={editingProduct?.sku} placeholder="SKU (Código)" required className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                               <input name="category" defaultValue={editingProduct?.category} placeholder="Selecione ou Digite..." list="categories-datalist" required className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium bg-white" />
                               <datalist id="categories-datalist">
                                   {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                               </datalist>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                               <input name="price" defaultValue={editingProduct?.price} placeholder="Preço (R$)" required className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" />
                               <input name="promotionalPrice" defaultValue={editingProduct?.promotionalPrice || ''} placeholder="Promoção (R$)" className="w-full p-3 rounded-lg border border-emerald-200 bg-emerald-50 outline-none text-sm font-bold text-emerald-800" />
                           </div>
                           
                           <input name="cost" defaultValue={editingProduct?.cost || ''} placeholder="Custo de Compra (R$)" required className="w-full p-3 rounded-lg border border-red-200 bg-red-50 outline-none text-sm font-bold text-red-800" />
                           
                           <div className="grid grid-cols-2 gap-3 items-end">
                              <div><label className="text-[10px] font-bold ml-1 block text-gray-500 mb-1 truncate">Itens por Caixa</label><input name="minBox" defaultValue={editingProduct?.minBox||'1'} className="w-full p-3 rounded-lg border border-gray-200 outline-none text-sm font-medium" /></div>
                              <div><label className="text-[10px] font-bold text-orange-600 ml-1 block mb-1 truncate">Estoque Local</label><input name="stock" defaultValue={editingProduct?.stock||'0'} className="w-full p-3 rounded-lg border border-orange-200 bg-orange-50 outline-none text-sm font-bold text-orange-800" /></div>
                           </div>
                           
                           <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow mt-2 text-sm hover:bg-slate-900 transition-colors">
                               {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                           </button>
                         </div>
                      </form>
                  </div>
              </div>

              {/* LADO DIREITO: LISTA DE PRODUTOS ORGANIZADA POR CATEGORIAS COLAPSÁVEIS */}
              <div className="lg:col-span-7 space-y-3">
                  <h3 className="font-black text-slate-800 text-lg mb-4">Produtos Cadastrados ({products.length})</h3>
                  
                  {Object.entries(productsByCategory).sort((a, b) => a[0].localeCompare(b[0])).map(([categoryName, catProducts]) => {
                      const isCatExpanded = expandedCatalogCats[categoryName];
                      const sortedCatProducts = [...catProducts].sort((a, b) => a.name.localeCompare(b.name));

                      return (
                          <div key={categoryName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                              {/* CABEÇALHO DA CATEGORIA (SANFONA) */}
                              <div 
                                  onClick={() => setExpandedCatalogCats(prev => ({...prev, [categoryName]: !prev[categoryName]}))}
                                  className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                              >
                                  <div className="flex items-center gap-2">
                                      {isCatExpanded ? <ChevronUp className="w-5 h-5 text-emerald-600"/> : <ChevronDown className="w-5 h-5 text-gray-400"/>}
                                      <span className="font-black text-slate-800 text-sm capitalize">{categoryName}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                      {catProducts.length} {catProducts.length === 1 ? 'item' : 'itens'}
                                  </span>
                              </div>

                              {/* LISTA DE PRODUTOS DA CATEGORIA */}
                              {isCatExpanded && (
                                  <div className="p-3 space-y-2.5 bg-slate-50/40">
                                      {sortedCatProducts.map(p => (
                                          <div key={p.id} className="p-3 border border-gray-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-200 transition-colors bg-white shadow-sm">
                                              
                                              {/* Bloco Superior/Esquerdo: Detalhes do Produto */}
                                              <div className="flex items-start gap-3 text-left flex-1 min-w-0">
                                                  <div className="w-12 h-12 bg-gray-50 rounded-md flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                                                      {p.image?.length > 50 ? <img src={p.image} className="w-full h-full object-cover"/> : <span className="text-sm">📦</span>}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <p className="font-bold text-slate-800 text-sm leading-tight break-words">
                                                          {p.name}
                                                          {p.pausado && <span className="ml-2 bg-orange-100 text-orange-800 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-black inline-block">Pausado</span>}
                                                      </p>
                                                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">SKU: {p.sku}</p>
                                                      
                                                      {/* Badges de Custo, Caixa e Estoque */}
                                                      <div className="flex flex-wrap gap-1.5 mt-2 text-[9px] font-bold font-mono">
                                                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">Custo: R$ {(p.cost || 0).toFixed(2).replace('.',',')}</span>
                                                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-gray-200">Cx: {p.minBox || 1} un</span>
                                                          <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">Estoque: {p.stock || 0}</span>
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* Bloco Inferior/Direito: Preço de Venda e Botões de Ação */}
                                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                                                  <div className="text-left sm:text-right">
                                                      <p className="text-[8px] font-bold text-gray-400 uppercase sm:hidden leading-none mb-0.5">Preço</p>
                                                      <span className="font-black text-slate-800 text-base">R$ {p.price.toFixed(2).replace('.',',')}</span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-1.5">
                                                      <button 
                                                          onClick={() => handleTogglePausa(p.id, p.pausado)} 
                                                          className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center text-[10px] font-bold ${p.pausado ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                                                      >
                                                          {p.pausado ? '▶ Ativar' : '⏸ Pausar'}
                                                      </button>
                                                      <button 
                                                          onClick={() => { setEditingProduct(p); setTimeout(() => document.getElementById('topo-catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }} 
                                                          className="bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition-colors flex items-center text-[10px] font-bold"
                                                      >
                                                          <Edit2 className="w-3 h-3 mr-1"/> Editar
                                                      </button>
                                                      <button 
                                                          onClick={() => { showConfirm('Excluir Produto', 'Tem certeza que deseja remover este produto do catálogo da loja?', async () => { await deleteDoc(doc(db,"products",p.id)); }, 'danger'); }} 
                                                          className="bg-red-50 text-red-600 p-1.5 rounded-md hover:bg-red-100 transition-colors"
                                                      >
                                                          <Trash2 className="w-3.5 h-3.5"/>
                                                      </button>
                                                  </div>
                                              </div>

                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>

          </div>
        </div>
      );
     }

     if (adminTab === 'clientes') {
      // 1. Aplica a Busca, o Filtro por Cargo e Ordena Alfabeticamente
      const filteredUsers = allUsers.filter(u => {
          if (u.role === 'consolidador') return false; // Esconde os gestores master por padrão
          
          const matchName = (u.name || '').toLowerCase().includes(crmSearch.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(crmSearch.toLowerCase());
          const matchRole = crmRoleFilter === 'Todos' || u.role === crmRoleFilter;
          
          return matchName && matchRole;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return (
          <div className="space-y-4 text-left max-w-6xl mx-auto">
              {/* CABEÇALHO E FILTROS */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800">Base de Clientes (CRM)</h2>
                      <p className="text-xs font-bold text-gray-500 mt-1">Gerencie os membros, representantes e caixas.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                      {/* Filtro de Papel (Dropdown) */}
                      <select value={crmRoleFilter} onChange={e => setCrmRoleFilter(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-emerald-500 outline-none text-sm font-bold text-slate-700 cursor-pointer">
                          <option value="Todos">Todos os Papéis</option>
                          <option value="cliente">Apenas Clientes</option>
                          <option value="representante">Apenas Representantes</option>
                          <option value="pdv">Apenas Caixas (PDV)</option>
                      </select>
                      
                      {/* Barra de Busca (Nome/Email) */}
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-64 focus-within:border-emerald-500 transition-colors">
                          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0"/>
                          <input 
                              type="text" 
                              placeholder="Buscar nome ou email..." 
                              value={crmSearch}
                              onChange={(e) => setCrmSearch(e.target.value)}
                              className="bg-transparent outline-none w-full text-sm font-medium text-slate-700"
                          />
                          {crmSearch && <button onClick={() => setCrmSearch('')} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>}
                      </div>
                  </div>
              </div>

              {/* LISTA DE CLIENTES */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  {filteredUsers.length === 0 ? (
                      <div className="text-center py-10">
                          <Users className="w-10 h-10 mx-auto text-gray-200 mb-3"/>
                          <p className="text-gray-500 font-medium text-sm">Nenhum usuário encontrado com estes filtros.</p>
                      </div>
                  ) : (
                      filteredUsers.map(u => (
                          <div key={u.id} className="p-3 border border-gray-100 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-emerald-200 transition-colors">
                              <div>
                                  <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      {u.name} 
                                      {u.role === 'representante' && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded uppercase font-black">Rep</span>}
                                      {u.role === 'pdv' && <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded uppercase font-black">PDV</span>}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{u.email} • Unidade: <span className="font-bold text-slate-700">{u.polo}</span></p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button onClick={()=>window.open(`https://wa.me/55${(u.whatsapp||'').replace(/\D/g,'')}`)} title="Conversar no WhatsApp" className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg hover:bg-emerald-100 transition-colors"><MessageCircle className="w-4 h-4"/></button>
                                  <button onClick={()=>setEditingUser(u)} title="Editar Cadastro" className="bg-blue-50 text-blue-600 p-2.5 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4"/></button>
                                  <button onClick={async()=>{ 
                                      showConfirm('Excluir Cliente', `Tem certeza que deseja apagar o cadastro de ${u.name}? Esta ação não pode ser desfeita.`, async () => { 
                                          await deleteDoc(doc(db,"users",u.id)); 
                                          showToast('Cliente Apagado'); 
                                      }, 'danger'); 
                                  }} title="Excluir Definitivamente" className="bg-red-50 text-red-500 p-2.5 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4"/></button>
                              </div>
                          </div>
                      ))
                  )}
              </div>

              {/* MODAL (POP-UP) DE EDIÇÃO DE CLIENTE */}
              {editingUser && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-gray-100">
                          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                              <div>
                                  <h3 className="font-black text-slate-800 text-lg">Editar Usuário</h3>
                                  <p className="text-xs text-gray-500 font-medium">{editingUser.name}</p>
                              </div>
                              <button onClick={() => setEditingUser(null)} className="p-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                          </div>
                          
                          <form onSubmit={async (e) => {
                                 e.preventDefault();
                                 const fd = new FormData(e.target);
                                 const novoPolo = fd.get('polo');
                                 const novoRole = fd.get('role');

                                 try {
                                     // 1. Atualiza o cadastro do usuário
                                     await updateDoc(doc(db, "users", editingUser.id), {
                                         polo: novoPolo,
                                         role: novoRole
                                     });

                                     // 2. MÁGICA DA MIGRAÇÃO DE PEDIDOS
                                     // Se o gestor mudou o polo do cliente, o sistema caça os pedidos vigentes e altera a rota de entrega!
                                     if (novoPolo !== editingUser.polo) {
                                         const pedidosVigentes = orders.filter(o => 
                                             (o.email === editingUser.email || (o.customer === editingUser.name && o.whatsapp === editingUser.whatsapp)) &&
                                             (o.cicloFinanceiro || 'Julho/2026') === sysConfig.mesReferencia
                                         );

                                         let pedidosMigrados = 0;
                                         for (const pedido of pedidosVigentes) {
                                             await updateDoc(doc(db, "orders", pedido.id), { polo: novoPolo });
                                             pedidosMigrados++;
                                         }

                                         if (pedidosMigrados > 0) {
                                             showToast(`Cadastro atualizado e ${pedidosMigrados} pedido(s) redirecionado(s) para ${novoPolo}!`, 'success');
                                         } else {
                                             showToast('Cadastro atualizado com sucesso!');
                                         }
                                     } else {
                                         showToast('Cadastro atualizado com sucesso!');
                                     }
                                     
                                     setEditingUser(null);
                                 } catch(err) {
                                     showToast('Erro ao atualizar usuário.', 'error');
                                 }
                             }} className="space-y-4">
                                 
                                 {/* Edição do Polo */}
                                 <div>
                                     <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Unidade (Polo)</label>
                                     <select name="polo" defaultValue={editingUser.polo} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-800 text-sm focus:border-emerald-500 cursor-pointer">
                                         {polos.map(p => <option key={p} value={p}>{p}</option>)}
                                     </select>
                                 </div>
                                 
                                 {/* Edição do Papel (Cargo) */}
                                 <div>
                                     <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Nível de Acesso no App</label>
                                     <select name="role" defaultValue={editingUser.role} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-800 text-sm focus:border-emerald-500 cursor-pointer">
                                         <option value="cliente">Membro Comum (Cliente)</option>
                                         <option value="representante">Representante (Logística)</option>
                                         <option value="pdv">Caixa Local (PDV)</option>
                                         <option value="consolidador">Gestor Master (Sede)</option>
                                     </select>
                                 </div>
                                 
                                 {/* Botões do Formulário */}
                                 <div className="pt-4 border-t border-gray-100 flex gap-3">
                                     <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 text-sm transition-colors">Cancelar</button>
                                     <button type="submit" className="flex-1 bg-emerald-600 text-white font-black py-3.5 rounded-xl shadow-md hover:bg-emerald-700 text-sm flex justify-center items-center transition-colors"><CheckCircle className="w-4 h-4 mr-2"/> Salvar Alterações</button>
                                 </div>
                             </form>
                      </div>
                  </div>
              )}
          </div>
      )
   }

      if (adminTab === 'config') {

        // 🛠️ FUNÇÃO DE SOCORRO: DESFAZER FALTA GLOBAL DE UM ITEM
        const handleEstornarFaltaGlobal = async () => {
          const skuAlvo = window.prompt("🆘 ESTORNO DE FALTA GLOBAL\n\nDigite o código SKU exato do produto que você marcou como falta por engano (Ex: 1414):");
          
          if (!skuAlvo) return; // Usuário cancelou ou deixou em branco

          // Busca o produto oficial no catálogo para garantir
          const produtoRef = products.find(p => String(p.sku) === String(skuAlvo));
          
          if (!produtoRef) {
              return showToast("Produto não encontrado com esse SKU no catálogo.", "error");
          }

          showConfirm(
              'Desfazer Falta Global',
              `Isso vai vasculhar o ciclo atual (${sysConfig.mesReferencia}), remover a falta de "${produtoRef.name}" e DEVOLVER o item para a sacola dos membros, somando o valor novamente. Continuar?`,
              async () => {
                  try {
                      // Filtra APENAS pedidos do ciclo atual que possuam este item na lista de FALTAS
                      const pedidosComFalta = orders.filter(o => {
                          const ciclo = o.cicloFinanceiro || 'Julho/2026';
                          return ciclo === sysConfig.mesReferencia && 
                                 o.faltas && 
                                 o.faltas.some(f => String(f.productId) === String(produtoRef.id));
                      });

                      if (pedidosComFalta.length === 0) {
                          return showToast('Nenhuma falta deste produto foi encontrada neste ciclo.', 'error');
                      }

                      let pedidosAtualizados = 0;

                      for (const pedido of pedidosComFalta) {
                          const faltaIndex = pedido.faltas.findIndex(f => String(f.productId) === String(produtoRef.id));
                          if (faltaIndex === -1) continue;

                          const registroFalta = pedido.faltas[faltaIndex];
                          const qtyDevolvida = registroFalta.qtyMissing || 1;
                          const valorEstornado = registroFalta.value || registroFalta.refundValue || 0;

                          // 1. Remove da lista de Faltas
                          const novasFaltas = [...pedido.faltas];
                          novasFaltas.splice(faltaIndex, 1);

                          // 2. Devolve para a lista de Itens
                          const novosItens = [...(pedido.items || [])];
                          const itemExistenteIndex = novosItens.findIndex(i => String(i.id) === String(produtoRef.id));

                          if (itemExistenteIndex >= 0) {
                              // Se sobrou algum (ex: pediu 5, faltaram 2), só soma a quantidade de volta
                              const currentQty = novosItens[itemExistenteIndex].qtd || novosItens[itemExistenteIndex].qty || 0;
                              novosItens[itemExistenteIndex] = {
                                  ...novosItens[itemExistenteIndex],
                                  qtd: currentQty + qtyDevolvida,
                                  qty: currentQty + qtyDevolvida
                              };
                          } else {
                              // Se a falta foi total e o item sumiu da sacola, recria ele
                              const unitPrice = valorEstornado / qtyDevolvida;
                              novosItens.push({
                                  id: produtoRef.id,
                                  name: produtoRef.name,
                                  price: unitPrice,
                                  qtd: qtyDevolvida,
                                  qty: qtyDevolvida
                              });
                          }

                          // 3. Atualiza o Total do Pedido (adicionando o valor de volta)
                          const novoTotal = pedido.total + valorEstornado;

                          // 4. Salva o pedido corrigido no banco de dados
                          await updateDoc(doc(db, "orders", pedido.id), {
                              items: novosItens,
                              faltas: novasFaltas,
                              total: novoTotal
                          });

                          pedidosAtualizados++;
                      }

                      showToast(`Sucesso! A falta de ${produtoRef.name} foi revertida em ${pedidosAtualizados} pedidos.`);
                  } catch (e) {
                      console.error("Erro ao estornar falta:", e);
                      showToast("Erro ao reverter falta no banco de dados.", "error");
                  }
              },
              'warning'
          );
      };

        // 🛠️ FUNÇÃO DE MIGRAÇÃO: OVOS 20 UN (OVOS20U) ➔ OVOS 30 UN (OVOS30U) NAS UNIDADES ESPECÍFICAS
        const handleMigrarOvos = async () => {
          // 1. Busca os IDs corretos através dos SKUs
          const produtoAntigo = products.find(p => String(p.sku) === 'OVOS20U');
          const produtoNovo = products.find(p => String(p.sku) === 'OVOS30U');

          if (!produtoAntigo || !produtoNovo) {
              return showToast('Erro: Verifique se os produtos com SKUs OVOS20U e OVOS30U existem no catálogo!', 'error');
          }

          // Calcula o preço da nova bandeja (considerando se está em promo)
          const isPromo = produtoNovo.promotionalPrice > 0 && produtoNovo.promotionalPrice < produtoNovo.price;
          const novoPrecoUnitario = isPromo ? produtoNovo.promotionalPrice : produtoNovo.price;

          // Lista estrita de polos que sofrerão a alteração
          const polosAlvo = ['Caçapava', 'Jacareí', 'Caraguatatuba', 'Cruzeiro', 'Guaratinguetá', 'São José dos Campos (Sede)'];

          showConfirm(
              'Atualizar Pedidos de Ovos',
              `Isto trocará "${produtoAntigo.name}" por "${produtoNovo.name}" apenas para os polos de satélite e sede. O valor passará a ser R$ ${novoPrecoUnitario.toFixed(2).replace('.', ',')}. Deseja continuar?`,
              async () => {
                  try {
                      // Filtro Duplo: Mês Vigente E Unidades Alvo
                      const pedidosDoCiclo = orders.filter(o => {
                          const ciclo = o.cicloFinanceiro || 'Julho/2026';
                          return ciclo === sysConfig.mesReferencia && polosAlvo.includes(o.polo);
                      });

                      let pedidosAtualizados = 0;

                      for (const pedido of pedidosDoCiclo) {
                          let teveAlteracao = false;
                          let novoTotalItens = 0;

                          const novosItens = (pedido.items || []).map(item => {
                              // Encontrou a bandeja antiga? Substitui pela nova!
                              if (String(item.id) === String(produtoAntigo.id)) {
                                  teveAlteracao = true;
                                  
                                  const quantidade = item.qtd || item.qty || 1;
                                  novoTotalItens += (novoPrecoUnitario * quantidade);

                                  return {
                                      ...item,
                                      id: produtoNovo.id,
                                      name: produtoNovo.name,
                                      price: novoPrecoUnitario
                                      // Diferente do fígado, aqui a quantidade não é multiplicada
                                  };
                              } else {
                                  const quantidade = item.qtd || item.qty || 1;
                                  novoTotalItens += ((item.price || 0) * quantidade);
                                  return item;
                              }
                          });

                          if (teveAlteracao) {
                              // Abate eventuais cortes
                              const totalFaltas = (pedido.faltas || []).reduce((sum, f) => sum + (f.value || f.refundValue || 0), 0);
                              const totalFinal = Math.max(0, novoTotalItens - totalFaltas);

                              await updateDoc(doc(db, "orders", pedido.id), {
                                  items: novosItens,
                                  total: totalFinal
                              });
                              pedidosAtualizados++;
                          }
                      }

                      showToast(`Sucesso! ${pedidosAtualizados} pedido(s) foram atualizados para a Bandeja de 30.`, 'success');
                  } catch (err) {
                      console.error("Erro na atualização em lote:", err);
                      showToast('Erro ao atualizar pedidos no banco de dados.', 'error');
                  }
              },
              'warning'
          );
      };
        
        // 🛠️ FUNÇÃO DE MIGRAÇÃO: FÍGADO ANTIGO (1kg) ➔ Figado Bp Bd 600 (SKU 1414) COM DOBRA DE QTD
        const handleMigrarFigadoAgosto = async () => {
          const produtoNovo = products.find(p => String(p.sku) === '1414');

          if (!produtoNovo) {
              return showToast('Produto SKU 1414 não encontrado no catálogo! Verifique o cadastro.', 'error');
          }

          const isPromo = produtoNovo.promotionalPrice > 0 && produtoNovo.promotionalPrice < produtoNovo.price;
          const novoPrecoUnitario = isPromo ? produtoNovo.promotionalPrice : produtoNovo.price;

          showConfirm(
              'Atualizar Pedidos de Fígado',
              `Isto trocará o Fígado antigo pelo "${produtoNovo.name}" (SKU 1414) a R$ ${novoPrecoUnitario.toFixed(2).replace('.', ',')} e DOBRARÁ a quantidade pedida (ex: quem pediu 1kg leva 2x 600g). Afeta apenas o ciclo ${sysConfig.mesReferencia}. Continuar?`,
              async () => {
                  try {
                      // O filtro perfeito que você mencionou: Blinda os outros meses!
                      const pedidosDoCiclo = orders.filter(o => {
                          const ciclo = o.cicloFinanceiro || 'Julho/2026';
                          return ciclo === sysConfig.mesReferencia;
                      });

                      let pedidosAtualizados = 0;

                      for (const pedido of pedidosDoCiclo) {
                          let teveAlteracao = false;
                          let novoTotalItens = 0;

                          const novosItens = (pedido.items || []).map(item => {
                              const nomeItemLower = (item.name || '').toLowerCase();
                              const ehFigadoAntigo = nomeItemLower.includes('fígado') || nomeItemLower.includes('figado');

                              if (ehFigadoAntigo && String(item.id) !== String(produtoNovo.id)) {
                                  teveAlteracao = true;
                                  
                                  // 👇 A MÁGICA DA QUANTIDADE DOBRADA 👇
                                  const quantidadeOriginal = item.qtd || item.qty || 1;
                                  const novaQuantidade = quantidadeOriginal * 2; 
                                  
                                  novoTotalItens += (novoPrecoUnitario * novaQuantidade);

                                  return {
                                      ...item,
                                      id: produtoNovo.id,         
                                      name: produtoNovo.name,     
                                      price: novoPrecoUnitario,   
                                      qtd: novaQuantidade,     // Salva a nova quantidade (x2)
                                      qty: novaQuantidade      // Salva a nova quantidade (x2)
                                  };
                              } else {
                                  const quantidade = item.qtd || item.qty || 1;
                                  novoTotalItens += ((item.price || 0) * quantidade);
                                  return item;
                              }
                          });

                          if (teveAlteracao) {
                              const totalFaltas = (pedido.faltas || []).reduce((sum, f) => sum + (f.value || f.refundValue || 0), 0);
                              const totalFinal = Math.max(0, novoTotalItens - totalFaltas);

                              await updateDoc(doc(db, "orders", pedido.id), {
                                  items: novosItens,
                                  total: totalFinal
                              });
                              pedidosAtualizados++;
                          }
                      }

                      showToast(`Sucesso! ${pedidosAtualizados} pedido(s) atualizados com o dobro de quantidade.`, 'success');
                  } catch (err) {
                      console.error("Erro na atualização em lote:", err);
                      showToast('Erro ao atualizar pedidos no banco de dados.', 'error');
                  }
              },
              'warning'
          );
      };


        // 👇 NOVA FUNÇÃO: O BOTÃO MÁGICO DE CORREÇÃO 👇
        const handleCorrigirPrecosAntigos = async () => {
          if (!window.confirm('Isto fará uma varredura nos pedidos deste ciclo e atualizará os valores com os preços promocionais atuais do catálogo. Deseja continuar?')) return;
          
          try {
              // Pega todos os pedidos que pertencem ao ciclo atual
              const pedidosDesteCiclo = orders.filter(o => {
                  const ciclo = o.cicloFinanceiro || 'Julho/2026';
                  return ciclo === sysConfig.mesReferencia;
              });

              let pedidosCorrigidos = 0;

              for (const pedido of pedidosDesteCiclo) {
                  let precisaAtualizar = false;
                  let novoTotalItens = 0;
                  const novosItens = [];

                  // Analisa item por item do pedido
                  for (const item of (pedido.items || [])) {
                      const prodCatalogo = products.find(p => String(p.id) === String(item.id));
                      let precoCorreto = item.price; // Começa com o preço que já estava

                      if (prodCatalogo) {
                          // Verifica se o produto tem promoção ativa hoje
                          const isPromo = prodCatalogo.promotionalPrice > 0 && prodCatalogo.promotionalPrice < prodCatalogo.price;
                          precoCorreto = isPromo ? prodCatalogo.promotionalPrice : prodCatalogo.price;
                      }

                      // Se o preço do catálogo estiver diferente do salvo no pedido, marca para atualizar
                      if (precoCorreto !== item.price) {
                          precisaAtualizar = true;
                      }

                      novosItens.push({ ...item, price: precoCorreto });
                      const quantidade = item.qtd || item.qty || 1;
                      novoTotalItens += (precoCorreto * quantidade);
                  }

                  // Se encontrou alguma diferença de preço, atualiza o banco de dados
                  if (precisaAtualizar) {
                      // Deduz as faltas (se houver) do novo total
                      const totalFaltas = (pedido.faltas || []).reduce((sum, f) => sum + (f.value || f.refundValue || 0), 0);
                      const totalFinalizado = Math.max(0, novoTotalItens - totalFaltas);

                      await updateDoc(doc(db, "orders", pedido.id), {
                          items: novosItens,
                          total: totalFinalizado
                      });
                      pedidosCorrigidos++;
                  }
              }

              showToast(`Varredura concluída! ${pedidosCorrigidos} pedidos foram corrigidos.`, 'success');
          } catch (err) {
              console.error(err);
              showToast('Erro ao corrigir pedidos.', 'error');
          }
      };
      // 👆 FIM DA NOVA FUNÇÃO 👆
      const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            // Converte o texto separado por vírgulas em uma lista de verdade
            const polosArray = polosText.split(',').map(p => p.trim()).filter(Boolean);

            await setDoc(doc(db, "settings", "global"), { 
                sysConfig: sysConfig,
                polos: polosArray
            }, { merge: true });
            
            showToast('Configurações Salvas com Sucesso!');
        } catch(err) {
            showToast('Erro ao salvar as configurações.', 'error');
        }
    };

        return (
           <div className="space-y-6 text-left max-w-4xl mx-auto pb-10">
               <h2 className="text-2xl font-black text-slate-800 mb-4">Configurações Gerais do Sistema</h2>
               
               {/* 🚪 NOVO BLOCO: PORTA DA LOJA (STATUS DA VITRINE) */}
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                   <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
                       <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><Home className="w-5 h-5"/></div>
                       <div>
                           <h3 className="font-black text-slate-800 text-lg">Status da Vitrine (Visão do Cliente)</h3>
                           <p className="text-xs text-gray-500 font-medium">Controle instantâneo da fase operacional da sua loja.</p>
                       </div>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-2">
                       <button type="button" onClick={() => toggleStoreMode('mensal')} className={`flex-1 p-3.5 rounded-xl font-black text-xs transition-all ${storeMode === 'mensal' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🟢 Aberta (Encomendas)</button>
                       <button type="button" onClick={() => toggleStoreMode('estoque')} className={`flex-1 p-3.5 rounded-xl font-black text-xs transition-all ${storeMode === 'estoque' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🟠 Pronta Entrega</button>
                       <button type="button" onClick={() => toggleStoreMode('pausado')} className={`flex-1 p-3.5 rounded-xl font-black text-xs transition-all ${storeMode === 'pausado' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>🔴 Fechada (Pausada)</button>
                   </div>
               </div>
               
               <form onSubmit={handleSaveSettings} className="space-y-6">

                {/* 🔧 BLOCO DE MANUTENÇÃO */}
                <div className="bg-orange-50 p-6 rounded-3xl shadow-sm border border-orange-200 mb-6">
                       <div className="flex items-center gap-3 mb-3">
                           <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5"/></div>
                           <div>
                               <h3 className="font-black text-orange-900 text-lg">Manutenção do Banco de Dados</h3>
                               <p className="text-xs text-orange-700 font-medium">Ações de atualização e correção em lote.</p>
                           </div>
                       </div>
                       <div className="flex flex-col gap-3">
                           <button type="button" onClick={handleCorrigirPrecosAntigos} className="w-full bg-white text-orange-600 border-2 border-orange-300 font-black py-3 rounded-xl hover:bg-orange-100 transition-colors text-sm shadow-sm">
                               🔄 Recalcular Preços de Pedidos Manuais Antigos
                           </button>
                           
                           {/* 👇 NOVO BOTÃO DE ATUALIZAÇÃO DO FÍGADO 👇 */}
                           <button type="button" onClick={handleMigrarFigadoAgosto} className="w-full bg-orange-600 text-white font-black py-3 rounded-xl hover:bg-orange-700 transition-colors text-sm shadow-sm">
                               🥩 Converter Fígado 1kg ➔ Fígado 600g nos Pedidos de Agosto
                           </button>
                           {/* 👇 NOVO BOTÃO DE ATUALIZAÇÃO DOS OVOS 👇 */}
                           <button type="button" onClick={handleMigrarOvos} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm shadow-sm">
                               🥚 Converter OVOS 20un ➔ OVOS 30un (Sede e Satélites)
                           </button>
                            {/* 👇 NOVO BOTÃO DE ESTORNO DE FALTA 👇 */}
                           <button type="button" onClick={handleEstornarFaltaGlobal} className="w-full bg-red-50 text-red-600 border-2 border-red-200 font-black py-3 rounded-xl hover:bg-red-100 transition-colors text-sm shadow-sm flex items-center justify-center">
                               <AlertTriangle className="w-4 h-4 mr-2"/> Desfazer Falta Global de um Produto (Por SKU)
                           </button>
                       </div>
                   </div>
                   
                   {/* BLOCO 1: PARAMETRIZAÇÃO DO CICLO */}
                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                       <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><LayoutDashboard className="w-5 h-5"/></div>
                           <div>
                               <h3 className="font-black text-slate-800 text-lg">Parâmetros do Ciclo Vigente</h3>
                               <p className="text-xs text-gray-500 font-medium">Define para onde vão os pedidos principais (Carnes, etc).</p>
                           </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Pasta Financeira (DRE)</label>
                               <input type="text" value={sysConfig.mesReferencia} onChange={e => setSysConfig({...sysConfig, mesReferencia: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-blue-900 text-sm" placeholder="Ex: Agosto/2026"/>
                           </div>
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Lote Logístico (Carnes)</label>
                               <input type="text" value={sysConfig.loteMensal} onChange={e => setSysConfig({...sysConfig, loteMensal: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-blue-900 text-sm" placeholder="Ex: Ciclo|Lote - Agosto"/>
                           </div>
                           {/* 👇 NOVO CAMPO DA DATA DE CORTE 👇 */}
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Data / Hora Limite</label>
                               <input type="text" value={sysConfig.dataCorte || ''} onChange={e => setSysConfig({...sysConfig, dataCorte: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black text-blue-900 text-sm" placeholder="Ex: 31/07 às 14:00hs"/>
                           </div>
                       </div>
                   </div>

                   {/* BLOCO 2: CAMPANHA RELÂMPAGO */}
                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mt-10 -mr-10"></div>
                       
                       <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4 relative z-10">
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0"><Package className="w-5 h-5"/></div>
                               <div>
                                   <h3 className="font-black text-slate-800 text-lg">Oferta Relâmpago (Expressa)</h3>
                                   <p className="text-xs text-gray-500 font-medium">Banner inteligente na vitrine com botão de 1-Clique.</p>
                               </div>
                           </div>
                           
                           <button type="button" onClick={() => setSysConfig({...sysConfig, ofertaAtiva: !sysConfig.ofertaAtiva})} className={`px-4 py-2 rounded-xl font-black text-xs transition-colors shadow-sm border ${sysConfig.ofertaAtiva ? 'bg-red-600 text-white border-red-700' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                               {sysConfig.ofertaAtiva ? '🟢 OFERTA LIGADA' : '🔴 OFERTA DESLIGADA'}
                           </button>
                       </div>

                       <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 transition-opacity ${!sysConfig.ofertaAtiva && 'opacity-50 grayscale-[30%]'}`}>
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Título no Banner</label>
                               <input type="text" disabled={!sysConfig.ofertaAtiva} value={sysConfig.ofertaTitulo} onChange={e => setSysConfig({...sysConfig, ofertaTitulo: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-800 text-sm"/>
                           </div>
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nome do Produto</label>
                               <input type="text" disabled={!sysConfig.ofertaAtiva} value={sysConfig.ofertaProduto} onChange={e => setSysConfig({...sysConfig, ofertaProduto: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-800 text-sm"/>
                           </div>
                           <div>
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Lote/Entrega (Vai para a Van)</label>
                               <input type="text" disabled={!sysConfig.ofertaAtiva} value={sysConfig.ofertaEntrega} onChange={e => setSysConfig({...sysConfig, ofertaEntrega: e.target.value})} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none font-bold text-slate-800 text-sm" placeholder="Ex: 30/06 - Ovos"/>
                           </div>
                           <div>
                               <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1 block">Preço de Venda (R$)</label>
                               <input type="number" step="0.01" disabled={!sysConfig.ofertaAtiva} value={sysConfig.ofertaPreco} onChange={e => setSysConfig({...sysConfig, ofertaPreco: e.target.value})} className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl outline-none font-black text-orange-900 text-sm"/>
                           </div>
                       </div>
                   </div>

                    {/* BLOCO 3: GESTÃO DE UNIDADES (POLOS) */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0"><MapPin className="w-5 h-5"/></div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Unidades da Franquia (Polos)</h3>
                                    <p className="text-xs text-gray-500 font-medium">Digite os nomes dos JCs separados por vírgula.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <textarea 
                                value={polosText} 
                                onChange={e => setPolosText(e.target.value)} 
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 font-bold text-slate-700 text-sm min-h-[100px]" 
                                placeholder="Ex: Sede, Centro, Norte..."
                            />
                        </div>
                    </div>

                   <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl hover:bg-slate-900 transition flex items-center justify-center text-sm">
                      <CheckCircle className="w-5 h-5 mr-2"/> Gravar e Atualizar Loja Agora
                   </button>
               </form>
           </div>
        );
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
            <button onClick={() => {setAdminTab('itens_vendidos'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='itens_vendidos'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Saídas por Produto</button>
            <button onClick={() => {setAdminTab('compras'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='compras'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Compras & Logística</button>
            <button onClick={() => {setAdminTab('logistica'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${adminTab==='logistica'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>
                <Truck className="w-4 h-4"/> Logística de Transferência
            </button>
            <button onClick={() => {setAdminTab('catalogo'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='catalogo'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Catálogo de Produtos</button>
            <button onClick={() => {setAdminTab('clientes'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='clientes'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Base de Clientes</button>
            <button onClick={() => {setAdminTab('config'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='config'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>⚙️ Configurações Globais</button>
            {!CONFIG_APENAS_COLETA && (
               <button onClick={() => {setAdminTab('financeiro'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='financeiro'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Financeiro (Estornos)</button>
            )}            
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

{confirmDialog.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 text-left">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-gray-100">
             <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${confirmDialog.type === 'danger' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                   <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="pt-1">
                    <h3 className="text-lg font-black text-slate-800 leading-tight mb-1">{confirmDialog.title}</h3>
                    <p className="text-xs text-gray-500 font-medium leading-snug">{confirmDialog.message}</p>
                </div>
             </div>
             <div className="flex gap-3 mt-6">
               <button onClick={() => setConfirmDialog({ open: false })} className="flex-1 bg-gray-100 text-slate-600 font-black py-3.5 rounded-xl text-xs hover:bg-gray-200 transition-colors">Cancelar</button>
               <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ open: false }); }} className={`flex-1 text-white font-black py-3.5 rounded-xl shadow-md transition-colors text-xs ${confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar Ação</button>
             </div>
          </div>
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
                <button onClick={() => {setFaltaGlobalModal(false); setShortagePreview(null); setShortageSelectedOrders({});}} className="p-1.5 bg-gray-100 rounded-md"><X className="w-4 h-4"/></button>
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
                    {products
                      .filter(p => orders.some(order => {
                         // 👇 MÁGICA: O dropdown também só vai mostrar produtos pedidos neste ciclo 👇
                         const ciclo = order.cicloFinanceiro || 'Julho/2026';
                         const ehDoCicloAtual = ciclo === sysConfig.mesReferencia;

                         return ehDoCicloAtual && 
                                ['confirmado', 'pago_polo', 'pago'].includes(order.status) && 
                                (order.items || []).some(item => String(item.id) === String(p.id));
                      }))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                 </div>
                 <button onClick={analyzeFaltaGlobal} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg shadow text-sm">Analisar Impacto</button>
               </div>
             ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
                <h4 className="font-black text-slate-800 text-sm mb-3 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-orange-500"/> Impacto da Falta: {shortagePreview.product?.name}</h4>
                <p className="text-xs text-gray-500 font-medium mb-4">Ajuste as quantidades que <strong>FALTARAM</strong> para cada membro. O sistema abaterá a diferença e manterá os demais itens no pedido.</p>
                
                <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-2">
                  {shortagePreview.impact.map((imp) => {
                    const qtyToRemove = shortageSelectedOrders[imp.orderId] || 0;
                    const refundValue = qtyToRemove * imp.itemPrice;

                    return (
                      <div key={imp.orderId} className={`p-3 rounded-xl border transition-all flex flex-col gap-3 ${qtyToRemove > 0 ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                         {/* Andar de Cima: Informações do Membro */}
                         <div>
                             <p className="font-bold text-slate-800 text-xs leading-tight">{imp.customer}</p>
                             <p className="text-[10px] text-gray-500 mt-1">JC: {imp.polo} • Comprou: {imp.maxQty}x</p>
                         </div>
                         
                         {/* Andar de Baixo: Controles e Valores */}
                         <div className="flex items-center justify-between w-full pt-2 border-t border-orange-200/50">
                             {/* CONTROLADOR DE QUANTIDADE DA FALTA */}
                             <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm shrink-0">
                                 <button onClick={() => setShortageSelectedOrders(prev => ({...prev, [imp.orderId]: Math.max(0, (prev[imp.orderId] || 0) - 1)}))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-black">-</button>
                                 <span className={`w-8 text-center font-black text-xs ${qtyToRemove > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{qtyToRemove}</span>
                                 <button onClick={() => setShortageSelectedOrders(prev => ({...prev, [imp.orderId]: Math.min(imp.maxQty, (prev[imp.orderId] || 0) + 1)}))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-black">+</button>
                             </div>
                             <span className={`font-black text-sm shrink-0 ${qtyToRemove > 0 ? 'text-orange-700' : 'text-gray-400'}`}>- R$ {refundValue.toFixed(2)}</span>
                         </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 mb-4 shadow-sm">
                   <span className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total a Estornar:</span>
                   <span className="font-black text-orange-600 text-xl">
                      R$ {shortagePreview.impact.reduce((sum, imp) => sum + ((shortageSelectedOrders[imp.orderId] || 0) * imp.itemPrice), 0).toFixed(2)}
                   </span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => {setShortagePreview(null); setShortageSelectedOrders({});}} className="flex-1 bg-white border border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition text-sm">Cancelar</button>
                  <button onClick={confirmFaltaGlobal} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black shadow-lg hover:bg-orange-700 transition flex items-center justify-center text-sm">
                    ⚠️ Confirmar Corte Parcial
                  </button>
                </div>
              </div>
             )}
          </div>
        </div>
      )}

      {/* 👇 O PASSO 4 ENTRA EXATAMENTE AQUI 👇 */}
      {expressModalOpen && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 text-left">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-gray-100">
               <button onClick={() => setExpressModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-gray-100 p-1.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
               
               <div className="mb-6 mt-2 text-center">
                   <h3 className="font-black text-2xl text-slate-800 leading-tight mb-2">{campanhaAtiva.produtoNome}</h3>
                   <span className="bg-red-50 text-red-700 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider border border-red-100">Entrega: {campanhaAtiva.dataEntrega}</span>
               </div>

               <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
                  <span className="font-bold text-gray-600 text-sm">Quantidade:</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                     <button onClick={() => setExpressQty(Math.max(1, expressQty - 1))} className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-black text-xl transition-colors">-</button>
                     <span className="w-10 text-center font-black text-slate-800 text-lg">{expressQty}</span>
                     <button onClick={() => setExpressQty(expressQty + 1)} className="w-12 h-12 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 font-black text-xl transition-colors">+</button>
                  </div>
               </div>

               <div className="flex justify-between items-end mb-6 px-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">Total a pagar<br/>na retirada:</span>
                  <span className="text-4xl font-black text-emerald-700">R$ {(campanhaAtiva.preco * expressQty).toFixed(2).replace('.', ',')}</span>
               </div>

               <button onClick={handleExpressCheckout} disabled={isProcessingPayment} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition flex justify-center items-center text-base">
                  {isProcessingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Pedido Expresso'}
               </button>
            </div>
         </div>
      )}
      {/* 👆 FIM DO PASSO 4 👆 */}

      {printLayout === 'catalogo' ? renderPrintCatalog() :
       printLayout === 'plaquinhas' ? renderPrintTags() :
       printLayout === 'cartaz' ? renderPrintCartaz() : // 👈 NOVA LINHA AQUI
       printLayout === 'logistica' ? renderPrintLogistica() : // 👈 ADICIONE ESTA LINHA
       isPrintMode ? renderDispatchPDF() : (
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
                   <h2 className="text-2xl font-black text-slate-800 tracking-tight text-center">{nomeUnidade}</h2>
                   <p className="text-center text-gray-500 font-bold text-xs mb-6">Acesse a sua conta</p>
                   
                   <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                     <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Entrar</button>
                     <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Nova Conta</button>
                   </div>

                   {/* SE ESTIVER NA SALA DE ESPERA DO GOOGLE */}
                   {authMode === 'complete_google' ? (
                     <form onSubmit={handleCompleteGoogleProfile} className="space-y-3 animate-in fade-in duration-300">
                       <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4 text-center">
                          <p className="font-black text-emerald-800 text-sm mb-1">Falta muito pouco, {tempGoogleUser?.displayName?.split(' ')[0]}! 🎉</p>
                          <p className="text-xs text-emerald-600 font-medium">Para sua segurança e envio das encomendas, precisamos de mais alguns dados.</p>
                       </div>
                       
                       <input type="tel" placeholder="WhatsApp (DDD+Num)" value={loginWhatsapp} onChange={e=>setLoginWhatsapp(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                       
                       <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                           <select value={selectedPolo} onChange={e=>setSelectedPolo(e.target.value)} className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-800 cursor-pointer">
                             {polos.map(p => <option key={p} value={p}>Unidade: {p}</option>)}
                           </select>
                       </div>
                       
                       <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                           <select value={registerRole} onChange={e=>setRegisterRole(e.target.value)} className="w-full bg-transparent p-2 outline-none font-black text-sm text-emerald-700 cursor-pointer">
                             <option value="cliente">Sou Cliente</option>
                             <option value="representante">Sou Representante</option>
                             <option value="consolidador">Sou Gestor Geral</option>
                             <option value="pdv">Sou Caixa (PDV)</option>
                           </select>
                       </div>

                       {['consolidador', 'representante', 'pdv'].includes(registerRole) && (
                           <div><input type="password" placeholder="Código de Segurança" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required className="w-full bg-red-50 border border-red-200 p-3 rounded-lg outline-none focus:border-red-500 font-black text-sm text-red-800 placeholder-red-300" /></div>
                       )}
                       
                       <button type="submit" disabled={authLoading} className="w-full bg-emerald-700 text-white font-black py-3.5 rounded-lg shadow-md hover:bg-emerald-800 transition-all text-sm flex items-center justify-center mt-4">
                         {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar e Entrar na Loja'}
                       </button>
                     </form>

                   ) : (

                     /* FORMULÁRIO PADRÃO (LOGIN OU CADASTRO MANUAL) */
                     <form onSubmit={handleAuth} className="space-y-3">
                       {authMode === 'register' && (
                         <div className="space-y-3">
                           <input type="text" placeholder="Nome Completo" value={loginName} onChange={e=>setLoginName(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                           <input type="tel" placeholder="WhatsApp (DDD+Num)" value={loginWhatsapp} onChange={e=>setLoginWhatsapp(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                           <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                             <select value={selectedPolo} onChange={e=>setSelectedPolo(e.target.value)} className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-800 cursor-pointer">
                               {polos.map(p => <option key={p} value={p}>Unidade: {p}</option>)}
                             </select>
                           </div>
                           <div className="bg-slate-50 border border-gray-200 rounded-lg p-0.5 focus-within:border-emerald-500">
                             <select value={registerRole} onChange={e=>setRegisterRole(e.target.value)} className="w-full bg-transparent p-2 outline-none font-black text-sm text-emerald-700 cursor-pointer">
                               <option value="cliente">Sou Cliente</option>
                               <option value="representante">Sou Representante</option>
                               <option value="consolidador">Sou Gestor Geral</option>
                               <option value="pdv">Sou Caixa (PDV)</option>
                             </select>
                           </div>
                           {['consolidador', 'representante','pdv'].includes(registerRole) && (
                               <div><input type="password" placeholder="Código de Segurança" value={secretCode} onChange={e=>setSecretCode(e.target.value)} required className="w-full bg-red-50 border border-red-200 p-3 rounded-lg outline-none focus:border-red-500 font-black text-sm text-red-800 placeholder-red-300" /></div>
                           )}
                         </div>
                       )}
                       
                       <input type="email" placeholder="E-mail" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                       <input type="password" placeholder="Senha" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required className="w-full bg-slate-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-emerald-500 font-medium text-sm text-slate-800" />
                       {authMode === 'login' && (
                           <div className="text-right mt-1 mb-2">
                               <button type="button" onClick={handleForgotPassword} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors">Esqueceu a senha?</button>
                           </div>
                       )}

                       <button type="submit" disabled={authLoading} className="w-full bg-emerald-700 text-white font-black py-3.5 rounded-lg shadow-md hover:bg-emerald-800 transition-all text-sm flex items-center justify-center mt-4">
                         {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Acessar Loja' : 'Finalizar Cadastro')}
                       </button>

                       {/* DIVISÓRIA E BOTÃO DO GOOGLE */}
                       <div className="flex items-center gap-3 my-4">
                           <div className="flex-1 h-px bg-gray-200"></div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ou</span>
                           <div className="flex-1 h-px bg-gray-200"></div>
                       </div>

                       <button type="button" onClick={handleGoogleLogin} disabled={authLoading} className="w-full bg-white border-2 border-gray-200 text-slate-700 font-black py-3.5 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-sm flex items-center justify-center relative">
                           <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                           </svg>
                           Continuar com o Google
                       </button>
                     </form>
                   )}
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