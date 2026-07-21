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
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(app);

if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

const polos = ['São José dos Campos (Sede)','Caçapava','Caraguatatuba','Cruzeiro','Guaratinguetá','Jacareí','Pindamonhangaba','Taubaté','Vila Adyana'];
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
        
        // A MÁGICA MUDA AQUI: Em vez de texto Base64, geramos um arquivo binário (Blob) leve!
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.7);
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
  const [shortageSelectedOrders, setShortageSelectedOrders] = useState({});
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);
  const [tempGoogleUser, setTempGoogleUser] = useState(null);
  
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'warning' });
  const showConfirm = (title, message, onConfirm, type = 'warning') => setConfirmDialog({ open: true, title, message, onConfirm, type });
  const [shortageSelectedProduct, setShortageSelectedProduct] = useState('');
  const [shortagePreview, setShortagePreview] = useState(null);
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


  // --- O CÉREBRO: CONFIGURAÇÕES GLOBAIS VINDAS DO FIREBASE ---
  const [sysConfig, setSysConfig] = useState({
    mesReferencia: "Julho/2026",
    loteMensal: "Ciclo Mensal - Julho",
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
  const [expandedPolos, setExpandedPolos] = useState({}); 
  const [editingAdminOrder, setEditingAdminOrder] = useState(null);

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
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("ERRO GOOGLE:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        // Agora o sistema vai cuspir o código exato do erro na tela!
        showToast(`Erro Firebase: ${err.code}`, 'error');
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
    
    const ordersToUpdate = orders.filter(o => 
       ['confirmado', 'pago_polo', 'pago'].includes(o.status) && 
       (o.items || []).some(i => String(i.id) === String(shortageSelectedProduct))
    );
    
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

  const generatePurchasePlan = () => {
    const validOrders = orders.filter(o => {
        // A MÁGICA DA SEGURANÇA: Se o pedido é antigo e não tem a etiqueta, 
        // o sistema carimba ele provisoriamente como 'Ciclo Mensal' na hora de ler!
        const etiquetaDoPedido = o.deliveryDate || 'Ciclo Mensal';
        
        return o.status === (CONFIG_APENAS_COLETA ? 'confirmado' : 'pago') && 
               new Date(o.date).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000) &&
               (mesaDateFilter === 'Todos' || etiquetaDoPedido === mesaDateFilter);
    });
    
    const plan = [];
    products.forEach(p => {
        const minBox = p.minBox || 1;
        const localStockSede = p.stock || 0;
        
        // 1. Calcula a Demanda por Polo
        const demandByPolo = {};
        polos.forEach(polo => demandByPolo[polo] = 0);
        validOrders.forEach(o => {
            const item = o.items?.find(i => String(i.id) === String(p.id));
            if (item) demandByPolo[o.polo] += (item.qtd || item.qty || 0);
        });

        let totalSedeFracionado = 0;
        let totalSatellites = 0;
        const crossDockingDetails = [];

        // 2. Inteligência de Cross-docking (Vila Adyana e Taubaté)
        polosEntregaDireta.forEach(poloDireto => {
            const soldInPolo = demandByPolo[poloDireto];
            if (soldInPolo > 0) {
                const caixasInteiras = Math.floor(soldInPolo / minBox);
                const fracionado = soldInPolo % minBox;
                if (caixasInteiras > 0) crossDockingDetails.push({ polo: poloDireto, boxes: caixasInteiras });
                totalSedeFracionado += fracionado; 
            }
        });

        // 3. Demanda dos polos "Satélites" (que dependem da Sede montar a sacola)
        polos.filter(polo => !polosEntregaDireta.includes(polo)).forEach(poloSat => {
            totalSatellites += demandByPolo[poloSat];
        });

        const totalSedeNeed = totalSatellites + totalSedeFracionado;
        const totalDemandGeral = totalSedeNeed + crossDockingDetails.reduce((acc, c) => acc + c.boxes * minBox, 0);
        
        // 4. Se tiver demanda ou se for pra repor estoque local, entra na Mesa de Compras!
        if (totalDemandGeral > 0 || localStockSede > 0) {
            let needToBuySede = Math.max(0, totalSedeNeed - localStockSede);
            let suggestedBoxesSede = needToBuySede > 0 ? Math.ceil(needToBuySede / minBox) : 0;
            
            plan.push({
                id: p.id, sku: p.sku || '-', name: p.name, minBox, stock: localStockSede,
                demandSede: totalSedeNeed, demandCross: crossDockingDetails, boxesToBuy: suggestedBoxesSede
            });
        }
    });
    
    setPurchasePlan(plan.sort((a,b) => a.name.localeCompare(b.name)));
  };

  const confirmAndExportPurchasePlan = async () => {
    if (!purchasePlan) return;
    const rows = [["LOCAL DESCARGA", "SKU", "PRODUTO", "CAIXAS FECHADAS", "QTDE FRACIONADA USADA", "ESTOQUE FINAL PREVISTO"]];
    
    for (const item of purchasePlan) {
        // As caixas inteiras vão direto para Vila Adyana / Taubaté
        item.demandCross.forEach(cd => {
            rows.push([cd.polo.toUpperCase(), item.sku, item.name, cd.boxes, '-', '-']);
        });

        // Calcula a Nova Sobra após as edições manuais
        const newStock = (item.stock + (item.boxesToBuy * item.minBox)) - item.demandSede;
        
        // Manda comprar as caixas para a HUB
        if (item.boxesToBuy > 0 || item.demandSede > 0) {
            rows.push(["SEDE SJC (HUB)", item.sku, item.name, item.boxesToBuy, item.demandSede, newStock]);
        }
        
        // MÁGICA: Atualiza o catálogo automaticamente com a sobra nova!
        if (item.stock !== newStock) {
           try { await updateDoc(doc(db, "products", item.id), { stock: newStock > 0 ? newStock : 0 }); } catch (e) {}
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

        {/* BARRA DE PESQUISA INTELIGENTE (Pedido da Dona Yoko) */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm mb-4 focus-within:border-emerald-500 transition-colors w-full">
            <Search className="w-5 h-5 text-emerald-600 mr-2 shrink-0"/>
            <input 
                type="text" 
                placeholder="Buscar por produto (Ex: Tomate, Arroz...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none w-full text-base font-bold text-slate-700 placeholder-gray-400"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-red-500 p-1">
                    <X className="w-5 h-5"/>
                </button>
            )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {activeCategories.map(cat => (
             <button key={cat} onClick={() => setShopCategory(cat)} className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-sm border transition-colors ${shopCategory === cat ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {cat}
             </button>
          ))}
        </div>

        {/* 👇 O BANNER DA OFERTA RELÂMPAGO 👇 */}
        {campanhaAtiva.ativo && storeMode !== 'pausado' && !searchTerm && shopCategory === 'Todos' && (
          <div onClick={() => setExpressModalOpen(true)} className={`${campanhaAtiva.cor} rounded-2xl p-5 mb-8 text-white shadow-xl cursor-pointer transform transition hover:scale-[1.02] flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-white/20`}>
            <div>
               <h3 className="text-xl font-black mb-1">{campanhaAtiva.titulo}</h3>
               <p className="font-medium text-sm text-red-100">Clique aqui e reserve a sua: <span className="font-bold text-white">{campanhaAtiva.produtoNome}</span></p>
            </div>
            <button className="bg-white text-red-700 font-black px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 whitespace-nowrap w-full sm:w-auto">
               Comprar Agora
            </button>
          </div>
        )}
        {/* 👆 FIM DO BANNER 👆 */}

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

       {/* GRADE DE PRODUTOS REDESENHADA (Mais compacta e com fontes maiores) */}
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {filteredProducts.map(p => {
            const isPromo = Boolean(p.promotionalPrice > 0 && p.promotionalPrice < p.price);
            const activePrice = isPromo ? p.promotionalPrice : p.price;
            const isOutOfStock = storeMode === 'estoque' && (p.stock || 0) <= 0;
            const isPaused = storeMode === 'pausado';
            const cartItem = cart.find(i => i.id === p.id);
            
            return (
              <div key={p.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-md transition-shadow ${(isOutOfStock && !cartItem) ? 'opacity-70 grayscale-[50%]' : ''}`}>
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center p-2 relative shrink-0">
                  {isPromo && <span className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg z-10">{Math.round((1 - (p.promotionalPrice / p.price)) * 100)}% OFF</span>}
                  {p.image?.length > 50 ? <img src={p.image} className="h-full w-full object-cover rounded-md" alt=""/> : <span className="text-3xl">{p.image || '📦'}</span>}
                </div>
                
                <div className="p-2.5 flex flex-col flex-grow">
                  {/* Nome do Produto Destacado (Maior e Preto) */}
                  <h3 className="text-sm font-black text-slate-900 leading-tight mb-2 flex-grow line-clamp-2">{p.name}</h3>
                  
                  <div className="flex flex-col mb-2 shrink-0">
                      {isPromo ? (
                        <>
                           <span className="text-[9px] text-gray-400 line-through font-bold leading-none">R$ {p.price.toFixed(2)}</span>
                           <span className="text-base text-slate-800 font-black leading-none">R$ {activePrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-base text-slate-800 font-black leading-none">R$ {activePrice.toFixed(2)}</span>
                      )}
                  </div>
                  
                  {isPaused ? (
                      <button disabled className="w-full bg-gray-100 text-gray-400 py-1.5 rounded-lg font-black text-[10px] cursor-not-allowed mt-auto uppercase tracking-wider">Pausado</button>
                  ) : (isOutOfStock && !cartItem) ? (
                      <button disabled className="w-full bg-red-50 text-red-600 border border-red-100 py-1.5 rounded-lg font-black text-[10px] cursor-not-allowed mt-auto uppercase tracking-wider">Esgotado</button>
                  ) : cartItem ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden mt-auto h-8">
                         <button onClick={() => handleDecreaseFromCart(p.id)} className="w-8 h-full flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors font-black text-lg leading-none">-</button>
                         <span className="font-black text-emerald-900 text-xs">{cartItem.qtd}</span>
                         <button onClick={() => handleAddToCart(p)} className="w-8 h-full flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors font-black text-lg leading-none">+</button>
                      </div>
                  ) : (
                      <button onClick={() => handleAddToCart(p)} className="w-full bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-emerald-200 transition-colors mt-auto shadow-sm">Adicionar</button>
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
    
    // 1. LÓGICA DE ETIQUETAS E FILTRO (Idêntica à do Dashboard Master)
    const lotesLogisticos = [...new Set(orders.map(o => o.deliveryDate || 'Ciclo Mensal'))].sort();
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    
    const pastasFinanceiras = [...new Set(orders.map(o => {
        if (o.cicloFinanceiro) return `Consolidado: ${o.cicloFinanceiro}`;
        
        // Proteção para pedidos antigos
        const date = o.date ? new Date(o.date) : new Date();
        return `Consolidado: ${meses[date.getMonth()]}/${date.getFullYear()}`;
    }))].sort();

    const ciclosExistentes = [...pastasFinanceiras, ...lotesLogisticos];
    const filtroAtivo = ciclosExistentes.includes(dashCycleFilter) ? dashCycleFilter : (ciclosExistentes[0] || '');

    // 2. FILTRA OS PEDIDOS APENAS DO POLO E DO CICLO SELECIONADO
    const poloOrdersFiltered = orders.filter(o => {
      if (o.polo !== viewingPolo || !o.date) return false;
      
      if (filtroAtivo.startsWith('Consolidado:')) {
          const pastaFiltro = filtroAtivo.replace('Consolidado:', '').trim();
          if (o.cicloFinanceiro) {
              return o.cicloFinanceiro === pastaFiltro;
          } else {
              // A MÁGICA: Iguala à regra do Dashboard da Gestão (força para o mês atual se não tiver etiqueta)
              return mesReferenciaGlobal === pastaFiltro;
          }
      } else {
          return (o.deliveryDate || 'Ciclo Mensal') === filtroAtivo;
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
                          .map(p => (
                              <option key={p.id} value={p.id}>
                                  {p.name} - R$ {(p.price || 0).toFixed(2)} {(storeMode === 'estoque' || storeMode === 'pronta_entrega') ? `(Restam: ${p.stock})` : ''}
                              </option>
                      ))}
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

       {/* CONTROLE DE ABAS: ESTEIRA LOGÍSTICA */}
       <div className="flex gap-2 mb-6 bg-slate-200 p-1.5 rounded-2xl shadow-inner overflow-x-auto scrollbar-hide">
            <button onClick={() => setRepTab('separar')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'separar' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📦 1. A Separar ({aba1Aseparar.length})</button>
            <button onClick={() => setRepTab('retirada')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'retirada' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🛍️ 2. Prontos ({aba2Retirada.length})</button>
            <button onClick={() => setRepTab('historico')} className={`flex-1 min-w-[110px] py-3 rounded-xl font-black text-[10px] sm:text-xs transition-all ${repTab === 'historico' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>✅ 3. Entregues ({aba3Entregues.length})</button>
        </div>

        {/* LISTAGEM DOS PEDIDOS DA ABA ATIVA */}
        <div className="space-y-6">
            {(() => {
                const currentOrders = repTab === 'separar' ? aba1Aseparar : repTab === 'retirada' ? aba2Retirada : aba3Entregues;
                
                if (currentOrders.length === 0) {
                    return (
                      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                          <Package className="w-10 h-10 mx-auto text-gray-200 mb-3"/>
                          <p className="text-gray-500 font-medium text-sm">Nenhum pedido nesta fase.</p>
                      </div>
                    );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {currentOrders.slice().reverse().map(o => {
                      
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
                                          // MENSAGEM RICA RESTAURADA!
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
    const validOrders = orders.filter(o => {
        const hasValidStatus = (o.status === 'pago' || o.status === 'confirmado' || o.status === 'pago_polo');
        
        // 👇 2. AGORA ELE USA O VIEWING POLO SEM DAR ERRO 👇
        // 🌟 RETROCOMPATIBILIDADE DA SEDE: Se o PDF for aberto na tela de 'compras' (Gestão), 
        // ele ignora os filtros e traz TODOS os polos do lote! Se for na Logística, separa por unidade.
        const hasValidPolo = currentScreen === 'dashboard_admin' ? true : (o.polo === viewingPolo);
        
        const hasDate = !!o.date;

        // Regra de Retrocompatibilidade e Filtro
        const etiquetaDoPedido = o.deliveryDate || 'Ciclo Mensal';
        const matchesLote = mesaDateFilter === 'Todos' || etiquetaDoPedido === mesaDateFilter;

        return hasValidStatus && hasDate && hasValidPolo && matchesLote;
    });

    const summaryByPolo = {};

    validOrders.forEach(o => {
        if (!summaryByPolo[o.polo]) summaryByPolo[o.polo] = { customers: [] };
        summaryByPolo[o.polo].customers.push(o);
    });

    return (
      <div className="bg-white p-8 max-w-4xl mx-auto font-mono text-sm text-black">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          {/* Título dinâmico: Sede ou Representante */}
          <h1 className="text-2xl font-black uppercase">
            {isGestor ? 'Romaneio de Despacho (Sede)' : `Lista de Conferência - JC ${user?.polo}`}
          </h1>
          <p className="mt-2">Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          
          {/* 👇 AVISO GIGANTE NO PDF PARA O MOTORISTA 👇 */}
          {mesaDateFilter !== 'Todos' && (
             <div className="mt-3">
                 <span className="font-black text-lg bg-gray-200 px-4 py-1.5 border-2 border-black uppercase tracking-widest">
                   Lote: {mesaDateFilter}
                 </span>
             </div>
          )}
        </div>

        {Object.entries(summaryByPolo).map(([poloName, data], index) => {
           const poloTotals = {};
           data.customers.forEach(cust => {
               (cust.items || []).forEach(item => {
                   if(!poloTotals[item.name]) poloTotals[item.name] = 0;
                   poloTotals[item.name] += (Number(item.qtd) || Number(item.qty) || 1);
               });
           });

           // 👇 A MÁGICA ENTRA AQUI: Calcula o valor total global que este Polo movimentou 👇
           const totalGeralDoPolo = data.customers.reduce((acc, cust) => acc + (cust.total || 0), 0);

           return (
            <div key={poloName} style={{ pageBreakBefore: index === 0 ? 'auto' : 'always' }} className="mb-10 page-break-after">
              
              {/* BANNER DO POLO ATUALIZADO COM VALOR DO REPASSE */}
              <div className="bg-gray-200 p-2 font-black text-lg mb-4 uppercase border border-black flex justify-between items-center px-4">
                  <span>Destino: Unidade {poloName}</span>
                  <span className="text-sm">Valor Total do Repasse à Sede: R$ {totalGeralDoPolo.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div style={{ pageBreakInside: 'avoid' }} className="mb-6 border border-black p-4">
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
                   <div key={cust.id} style={{ pageBreakInside: 'avoid' }} className="mb-4 border-b border-black pb-2">
                   {/* CABEÇALHO DO CLIENTE COM O TOTAL */}
                   <div className="font-bold bg-gray-100 p-1 flex justify-between items-center px-2">
                       <span>Cliente: {cust.customer} (Pedido #{cust.id.slice(0,5)})</span>
                       <span className="text-sm">Total: R$ {(cust.total || 0).toFixed(2).replace('.', ',')}</span>
                   </div>
                   
                   {/* LISTA DE ITENS COM OS VALORES UNITÁRIOS E TOTAIS */}
                   <div className="pl-4 mt-1">
                     {(cust.items || []).map((it, idx) => {
                         const q = it.qtd || it.qty || 1;
                         const totalItem = (it.price || 0) * q;
                         return (
                           <div key={idx} className="flex items-center justify-between gap-2 mb-1 pr-4">
                              <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border border-black shrink-0"></div>
                                  <span>{q}x {it.name} <span className="text-[10px] text-gray-500 font-normal ml-1">(R$ {(it.price || 0).toFixed(2).replace('.', ',')} /un)</span></span>
                              </div>
                              <span className="font-bold">R$ {totalItem.toFixed(2).replace('.', ',')}</span>
                           </div>
                         )
                     })}
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
        // 1. MAPEIA OS LOTES LOGÍSTICOS EXISTENTES
        const lotesLogisticos = [...new Set(validOrders.map(o => o.deliveryDate || 'Ciclo Mensal'))].sort();

        // 2. MAPEIA OS CONSOLIDADOS FINANCEIROS 
        const pastasFinanceiras = [...new Set(validOrders.map(o => {
            // Se o pedido for novo e já tiver a etiqueta, usa ela
            if (o.cicloFinanceiro) return `Consolidado: ${o.cicloFinanceiro}`;
            
            // A MÁGICA AQUI: Se é um pedido antigo (sem etiqueta), ignora o calendário 
            // e atira ele direto para a pasta financeira global atual para não perder as vendas antecipadas.
            return `Consolidado: ${mesReferenciaGlobal}`;
        }))].sort();

        // Une tudo no menu de seleção do topo
        const ciclosExistentes = [...pastasFinanceiras, ...lotesLogisticos];

        // 🌟 CORREÇÃO DO "ESTADO FANTASMA" DO REACT 🌟
        const filtroAtivo = ciclosExistentes.includes(dashCycleFilter) ? dashCycleFilter : (ciclosExistentes[0] || '');

        // 3. FILTRO INTELIGENTE E BLINDADO
        const currentCycleOrders = validOrders.filter(o => {
            if (filtroAtivo.startsWith('Consolidado:')) {
                const pastaFiltro = filtroAtivo.replace('Consolidado:', '').trim();
                
                if (o.cicloFinanceiro) {
                    return o.cicloFinanceiro === pastaFiltro;
                } else {
                    // Força os pedidos antigos a aparecerem no Consolidado atual
                    return mesReferenciaGlobal === pastaFiltro;
                }
            } else {
                // Filtro por lote logístico específico (Visão da Logística)
                return (o.deliveryDate || 'Ciclo Mensal') === filtroAtivo;
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
        // 1. FILTRO DE BUSCA: Por nome do cliente ou número do pedido
        const filteredVendas = validOrders.filter(o => 
            (o.customer || '').toLowerCase().includes(vendasSearchTerm.toLowerCase()) || 
            (o.id || '').toLowerCase().includes(vendasSearchTerm.toLowerCase())
        );

        // 2. AGRUPAMENTO POR MÊS
        const ordersByMonth = filteredVendas.reduce((acc, order) => {
          const d = new Date(order.date);
          const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
          const capMonth = `${months[d.getMonth()]} ${d.getFullYear()}`;
          const sortKey = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!acc[capMonth]) acc[capMonth] = { ordersByPolo: {}, total: 0, count: 0, sortKey };
          if(!acc[capMonth].ordersByPolo[order.polo]) acc[capMonth].ordersByPolo[order.polo] = [];
          acc[capMonth].ordersByPolo[order.polo].push(order);

          acc[capMonth].total += (order.total || 0);
          acc[capMonth].count += 1;
          return acc;
        }, {});

        return (
          <div className="space-y-6 text-left max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-2xl font-black text-slate-800">Histórico de Vendas</h2>
                
                {/* BARRA DE BUSCA */}
                <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-72 focus-within:border-emerald-500 transition-colors">
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

            {Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => {
              const isExpanded = expandedMonths[month];
              return (
              <div key={month} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all">
                 <div onClick={() => setExpandedMonths(prev => ({...prev, [month]: !prev[month]}))} className="p-4 bg-slate-50 border-b border-gray-50 flex justify-between items-center cursor-pointer hover:bg-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg capitalize flex items-center">
                         {isExpanded ? <ChevronUp className="w-5 h-5 mr-2 text-emerald-600"/> : <ChevronDown className="w-5 h-5 mr-2 text-gray-400"/>}
                         {month}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 ml-7">{data.count} pedidos liquidados</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-gray-400 uppercase">Faturamento</p>
                       <p className="text-xl font-black text-emerald-700">R$ {data.total.toFixed(2)}</p>
                    </div>
                 </div>
                 
                 {isExpanded && (
                   <div className="p-5 space-y-6">
                       {Object.entries(data.ordersByPolo).map(([polo, poloOrders]) => {
                          const poloTotal = poloOrders.reduce((s,o)=>s+(o.total||0), 0);
                          const poloKey = `${month}-${polo}`;
                          const isPoloExpanded = expandedPolos[poloKey];
                          
                          // 3. ORDENAÇÃO: Do mais recente para o mais antigo
                          const sortedOrders = poloOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                          return (
                              <div key={polo} className="space-y-4">
                                  <div onClick={() => setExpandedPolos(prev => ({...prev, [poloKey]: !prev[poloKey]}))} className="flex items-center gap-2 border-b border-gray-200 pb-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                      {isPoloExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                                      <MapPin className="w-4 h-4 text-emerald-600"/>
                                      <h4 className="font-black text-slate-800 text-sm flex-1">JC {polo}</h4>
                                      <span className="font-bold text-emerald-800 text-xs bg-emerald-50 px-2 py-1.5 border border-emerald-100 rounded-lg shadow-sm">R$ {poloTotal.toFixed(2)}</span>
                                  </div>
                                  
                                  {isPoloExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pl-2 sm:pl-6">
                                      {sortedOrders.map(o => (
                                        <div key={o.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col justify-between gap-3 hover:border-emerald-200 transition-colors">
                                          <div>
                                            <p className="font-bold text-slate-800 text-sm mb-1">{o.customer}</p>
                                            <p className="text-[10px] font-medium text-gray-500 font-mono bg-gray-50 inline-block px-1.5 py-0.5 rounded border border-gray-100">#{o.id.slice(0,5).toUpperCase()}</p>
                                            <p className="text-[10px] font-medium text-gray-500 mt-1">{new Date(o.date).toLocaleString('pt-BR')}</p>
                                          </div>
                                          <div className="flex items-center justify-between w-full border-t border-gray-50 pt-3">
                                             <span className="font-black text-slate-800 text-base">R$ {(o.total||0).toFixed(2)}</span>
                                             <div className="flex items-center gap-1.5">
                                              {/* BOTÃO DE EDITAR */}
                                                <button onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setEditingAdminOrder(o);
                                                    // Cria uma cópia exata dos itens do pedido para podermos brincar com eles na tela!
                                                    setEditCart(o.items ? JSON.parse(JSON.stringify(o.items)) : []);
                                                }} className="text-blue-500 hover:text-blue-700 text-[10px] font-bold flex items-center bg-blue-50 px-2 py-1 rounded transition-colors">
                                                    <Edit2 className="w-3 h-3 mr-1"/> Editar
                                                </button>
                                                
                                                {/* BOTÃO DE EXCLUIR */}
                                                <button onClick={(e) => { 
                                                    e.stopPropagation();
                                                    showConfirm(
                                                        'Cancelar Pedido', 
                                                        `Deseja realmente excluir o pedido de ${o.customer}?`, 
                                                        async () => {
                                                            try {
                                                                const isPedidoFeira = (o.deliveryDate || '').toLowerCase().includes('pronta entrega');
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
                                                }} className="text-red-400 hover:text-red-600 text-[10px] font-bold flex items-center bg-red-50 px-2 py-1 rounded transition-colors">
                                                    <Trash2 className="w-3 h-3 mr-1"/> Excluir
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
                 )}
              </div>
            )})}

            {/* MODAL DE EDIÇÃO DE PEDIDO (ESQUELETO) */}
            {/* MODAL DE EDIÇÃO DE PEDIDO (COMPLETO E INTELIGENTE) */}
            {editingAdminOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Editar Pedido</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Membro: {editingAdminOrder.customer}</p>
                            </div>
                            <button onClick={() => {setEditingAdminOrder(null); setEditItemProduct('');}} className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        
                        {/* AREA DE ADICIONAR NOVO PRODUTO */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 mb-4 shrink-0 flex gap-2">
                            <select value={editItemProduct} onChange={e => setEditItemProduct(e.target.value)} className="flex-1 p-2.5 border border-gray-200 rounded-lg text-sm font-medium outline-none truncate bg-white">
                                <option value="">Adicionar novo produto ao pedido...</option>
                                {[...products].sort((a,b)=>a.name.localeCompare(b.name)).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - R$ {(p.price || 0).toFixed(2)}</option>
                                ))}
                            </select>
                            <button onClick={() => {
                                if(!editItemProduct) return;
                                const p = products.find(prod => prod.id === editItemProduct);
                                if(!p) return;
                                const existing = editCart.find(i => i.id === p.id);
                                if(existing) {
                                    setEditCart(editCart.map(i => i.id === p.id ? {...i, qty: (i.qty||i.qtd||0) + 1, qtd: (i.qty||i.qtd||0) + 1} : i));
                                } else {
                                    setEditCart([...editCart, {id: p.id, name: p.name, price: p.price, qty: 1, qtd: 1}]);
                                }
                                setEditItemProduct('');
                            }} className="bg-emerald-100 text-emerald-800 px-4 rounded-lg font-black text-xs hover:bg-emerald-200 transition">Adicionar</button>
                        </div>

                        {/* LISTA DE ITENS DO PEDIDO (EDITÁVEL) */}
                        <div className="overflow-y-auto space-y-2 mb-4 flex-1 pr-1">
                            {editCart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 text-sm shadow-sm">
                                    <div className="flex-1 truncate pr-2">
                                        <p className="font-bold text-slate-700 truncate">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">R$ {(item.price || 0).toFixed(2)} / un</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shrink-0">
                                            <button onClick={() => {
                                                const currentQty = item.qty || item.qtd || 1;
                                                if (currentQty <= 1) {
                                                    setEditCart(editCart.filter(i => i.id !== item.id));
                                                } else {
                                                    setEditCart(editCart.map(i => i.id === item.id ? {...i, qty: currentQty - 1, qtd: currentQty - 1} : i));
                                                }
                                            }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors font-black">-</button>
                                            <span className="w-8 text-center font-black text-slate-800 text-xs">{item.qty || item.qtd || 1}</span>
                                            <button onClick={() => {
                                                const currentQty = item.qty || item.qtd || 1;
                                                setEditCart(editCart.map(i => i.id === item.id ? {...i, qty: currentQty + 1, qtd: currentQty + 1} : i));
                                            }} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors font-black">+</button>
                                        </div>
                                        <button onClick={() => setEditCart(editCart.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                            {editCart.length === 0 && <p className="text-center text-sm font-bold text-gray-400 py-6">O pedido está vazio.</p>}
                        </div>

                        {/* RODAPÉ COM TOTAL E BOTÃO SALVAR */}
                        <div className="border-t border-gray-100 pt-4 shrink-0">
                            <div className="flex justify-between items-end mb-4 px-2">
                                <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">Novo Total:</span>
                                <span className="font-black text-2xl text-emerald-700">
                                    R$ {editCart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.qtd || 1)), 0).toFixed(2)}
                                </span>
                            </div>
                            <button onClick={async () => {
                                try {
                                    const newTotal = editCart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.qtd || 1)), 0);
                                    
                                    // 👇 INTELIGÊNCIA DE DIFERENÇA DE ESTOQUE 👇
                                    const isPedidoFeira = (editingAdminOrder.deliveryDate || '').toLowerCase().includes('pronta entrega');
                                    if (storeMode === 'estoque' || storeMode === 'pronta_entrega' || isPedidoFeira) {
                                        // Mapeia o que tinha antes
                                        const oldMap = {};
                                        (editingAdminOrder.items || []).forEach(i => oldMap[i.id] = (i.qty || i.qtd || 1));
                                        
                                        // Mapeia como ficou agora
                                        const newMap = {};
                                        editCart.forEach(i => newMap[i.id] = (i.qty || i.qtd || 1));
                                        
                                        const allItemIds = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
                                        
                                        for (const id of allItemIds) {
                                            if (id === 'oferta-1') continue;
                                            const oldQ = oldMap[id] || 0;
                                            const newQ = newMap[id] || 0;
                                            const diff = newQ - oldQ; // Se for Positivo: pegou mais. Se for Negativo: devolveu.
                                            
                                            if (diff !== 0) {
                                                const prodRef = doc(db, "products", id);
                                                const prodDoc = await getDoc(prodRef);
                                                if (prodDoc.exists()) {
                                                    const currentStock = prodDoc.data().stock || 0;
                                                    // Ajusta o estoque baseando na diferença
                                                    await updateDoc(prodRef, { stock: Math.max(0, currentStock - diff) });
                                                }
                                            }
                                        }
                                    }
                                    // 👆 FIM DA INTELIGÊNCIA DE ESTOQUE 👆

                                    // Grava o novo pedido no banco
                                    await updateDoc(doc(db, "orders", editingAdminOrder.id), {
                                        items: editCart,
                                        total: newTotal
                                    });

                                    showToast('Pedido atualizado com sucesso!');
                                    setEditingAdminOrder(null);
                                    setEditItemProduct('');
                                } catch(err) {
                                    showToast('Erro ao atualizar pedido.', 'error');
                                }
                            }} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-900 transition flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 mr-2"/> Gravar Novo Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        );
      }

     if (adminTab === 'compras') {
      // 1. O SISTEMA LÊ AS DATAS AQUI:
      const datasExistentes = [...new Set(orders.map(o => o.deliveryDate || 'Ciclo Mensal'))];
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

      if (adminTab === 'config') {
        const handleSaveSettings = async (e) => {
            e.preventDefault();
            try {
                await setDoc(doc(db, "settings", "global"), { sysConfig: sysConfig }, { merge: true });
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
            <button onClick={() => {setAdminTab('compras'); setIsSidebarOpen(false);}} className={`w-full text-left px-3 py-3 rounded-lg font-bold text-xs transition-colors ${adminTab==='compras'?'bg-emerald-600 text-white':'text-gray-400 hover:bg-white/5'}`}>Compras & Logística</button>
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
                   <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight mb-1">Clube de Compras SJC</h2>
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