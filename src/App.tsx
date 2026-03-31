import React, { useState, useEffect } from 'react';
import { ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ChevronDown, ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, Download, Copy, Clock, MessageCircle, LayoutDashboard, Store, Eye, Wallet, Landmark, Loader2, Home, Search } from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where } from "firebase/firestore";
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

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- INJEÇÃO DO TAILWIND ---
if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

// Dados iniciais
const polos = ['São José dos Campos (Sede)', 'Jacareí', 'Taubaté', 'Caraguatatuba'];

// --- LEITOR INTELIGENTE DE CSV ---
const parseCSVLine = (text) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('cliente');
  const [secretCode, setSecretCode] = useState('');
  
  // --- ESTADOS DE PAGAMENTO E GESTÃO ---
  const [pendingOrder, setPendingOrder] = useState(null);
  const [missingItemsModal, setMissingItemsModal] = useState({ open: false, order: null, missingItems: [] });
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [financeTab, setFinanceTab] = useState('credito');
  const [pixRefundModal, setPixRefundModal] = useState({ open: false, key: '' }); 
  // -------------------------------------

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
  const [searchTerm, setSearchTerm] = useState(''); // NOVO: Pesquisa
  const [imagePreview, setImagePreview] = useState('');
  const [toast, setToast] = useState(null);

  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);

  const activeCategories = ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort()];

  // FUNÇÃO AUXILIAR DE PREÇO (Retorna o preço promocional se existir)
  const getActivePrice = (p) => (p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price) ? p.promotionalPrice : p.price;

  // --- ESCUTADOR DE AUTENTICAÇÃO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            walletBalance: userData.walletBalance || 0, 
            pendingPixRefund: userData.pendingPixRefund || 0,
            pixKey: userData.pixKey || '',
            ...userData 
          });
          
          if (userData.role === 'consolidador') setCurrentScreen('dashboard_admin');
          else if (userData.role === 'representante') setCurrentScreen('dashboard_rep');
          else setCurrentScreen('shop');
        } else {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: 'cliente', name: 'Utilizador', walletBalance: 0, pendingPixRefund: 0 });
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

  // --- CARREGAR DADOS DO CATÁLOGO ---
  useEffect(() => {
    const fetchFromFirebase = async () => {
      try {
        const prodSnapshot = await getDocs(collection(db, "products"));
        setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const custSnapshot = await getDocs(collection(db, "customers"));
        setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const ordSnapshot = await getDocs(collection(db, "orders"));
        setOrders(ordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const usersSnapshot = await getDocs(collection(db, "users"));
        setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Erro ao ligar ao Firebase:", error);
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
      showToast('Sessão iniciada com sucesso!', 'success');
    } catch (error) {
      setAuthLoading(false);
      if(error.code === 'auth/invalid-credential') showToast('E-mail ou palavra-passe incorretos.', 'error');
      else showToast('Erro ao iniciar sessão.', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if(!loginName || !loginEmail || !loginPassword || !loginWhatsapp) return showToast('Preencha todos os campos.', 'error');
    if(loginPassword.length < 6) return showToast('A palavra-passe deve ter pelo menos 6 caracteres.', 'error');
    
    if (registerRole === 'consolidador' && secretCode !== 'GESTOR2024') return showToast('Código de Gestor inválido!', 'error');
    if (registerRole === 'representante' && secretCode !== 'REP2024') return showToast('Código de Representante inválido!', 'error');
    
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const newUserProfile = { name: loginName, email: loginEmail, whatsapp: loginWhatsapp, polo: selectedPolo, role: registerRole, walletBalance: 0, pendingPixRefund: 0, pixKey: '' };
      await setDoc(doc(db, "users", userCredential.user.uid), newUserProfile);
      await addDoc(collection(db, "customers"), newUserProfile);
      showToast('Conta criada com sucesso!', 'success');
    } catch (error) {
      setAuthLoading(false);
      if(error.code === 'auth/email-already-in-use') showToast('Este e-mail já está registado.', 'error');
      else showToast('Erro ao criar conta.', 'error');
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

  const cartTotal = cart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);

  const addToManualCart = (product) => {
    const existing = manualCart.find(item => item.id === product.id);
    if (existing) setManualCart(manualCart.map(item => item.id === product.id ? { ...item, qtd: item.qtd + 1 } : item));
    else setManualCart([...manualCart, { ...product, qtd: 1 }]);
  };

  const manualCartTotal = manualCart.reduce((sum, item) => sum + (getActivePrice(item) * item.qtd), 0);

  const confirmManualOrder = async (e) => {
    e.preventDefault();
    if(manualCart.length === 0) return showToast('Adicione produtos à encomenda!', 'error');
    
    try {
      const newOrderData = {
        customer: `${manualCustomerName} (Via Rep)`,
        email: manualCustomerEmail,
        whatsapp: manualCustomerWhatsapp,
        polo: user?.polo || 'Sede',
        total: manualCartTotal,
        method: 'dinheiro/pix direto',
        status: 'pago',
        date: new Date().toISOString(),
        items: manualCart.map(item => ({ id: item.id, name: item.name || 'Produto', qtd: item.qtd, price: getActivePrice(item) }))
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      setOrders([...orders, { id: orderRef.id, ...newOrderData }]);
      
      setIsManualOrderModalOpen(false);
      setManualCustomerName(''); setManualCustomerEmail(''); setManualCustomerWhatsapp(''); setManualCart([]);
      showToast('Encomenda guardada na nuvem!', 'success');
    } catch(err) {
      showToast('Erro ao guardar encomenda.', 'error');
    }
  };

  const processGatewayPayment = async (finalTotal, walletDiscount) => {
    setIsProcessingPayment(true);
    try {
      const newOrderData = {
        customer: user?.name || 'Cliente',
        email: user?.email || '',
        whatsapp: user?.whatsapp || '',
        polo: user?.polo || 'Sede',
        total: finalTotal,
        method: finalTotal <= 0 ? 'saldo_carteira' : paymentMethod,
        status: finalTotal <= 0 ? 'pago' : 'aguardando_pagamento',
        walletDiscountApplied: walletDiscount,
        date: new Date().toISOString(),
        items: cart.map(item => ({ id: item.id, name: item.name || 'Produto', qtd: item.qtd, price: getActivePrice(item) }))
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      const savedOrder = { id: orderRef.id, ...newOrderData };
      
      setOrders([...orders, savedOrder]);
      setCart([]);
      
      if (finalTotal <= 0 && walletDiscount > 0) {
          const newWalletBalance = (user.walletBalance || 0) - walletDiscount;
          await updateDoc(doc(db, "users", user.uid), { walletBalance: newWalletBalance });
          setUser({...user, walletBalance: newWalletBalance});
          setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, walletBalance: newWalletBalance } : u));
          setIsProcessingPayment(false);
          setCurrentScreen('success');
          return;
      }
      
      setPendingOrder(savedOrder);
      setIsProcessingPayment(false);
      if (paymentMethod === 'pix') setCurrentScreen('gateway_pix');
      else setCurrentScreen('gateway_credit');
      
    } catch(err) {
      setIsProcessingPayment(false);
      showToast('Erro ao processar integração bancária.', 'error');
    }
  };

  const simulateBankWebhook = async () => {
    if (!pendingOrder) return;
    try {
      await updateDoc(doc(db, "orders", pendingOrder.id), { status: 'pago' });
      setOrders(orders.map(o => o.id === pendingOrder.id ? { ...o, status: 'pago' } : o));
      
      if ((pendingOrder.walletDiscountApplied || 0) > 0) {
         const newWalletBalance = (user.walletBalance || 0) - pendingOrder.walletDiscountApplied;
         await updateDoc(doc(db, "users", user.uid), { walletBalance: newWalletBalance });
         setUser({...user, walletBalance: newWalletBalance});
         setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, walletBalance: newWalletBalance } : u));
      }
      
      setCurrentScreen('success');
    } catch (err) {
      showToast('Erro ao simular webhook.', 'error');
    }
  };

  // --- FUNÇÃO PARA PROCESSAR FALTAS / GERAR CRÉDITO ---
  const handleConfirmFaltas = async (missingTotal) => {
    if (missingTotal <= 0) return;
    
    // Calcula itens faltantes para salvar no histórico do pedido
    const missingItemsToSave = (missingItemsModal.missingItems || [])
      .filter(i => (i.removedQtd || 0) > 0)
      .map(i => ({ name: i.name || 'Produto', qtd: i.removedQtd }));

    const newItems = (missingItemsModal.missingItems || []).map(i => ({...i, qtd: i.qtd - (i.removedQtd || 0)})).filter(i => i.qtd > 0);
    const newTotal = (missingItemsModal.order.total || 0) - missingTotal;

    try {
        await updateDoc(doc(db, "orders", missingItemsModal.order.id), {
            items: newItems,
            total: Math.max(0, newTotal),
            refundStatus: 'credito_gerado',
            refundAmount: missingTotal,
            missingItems: missingItemsToSave
        });

        const q = query(collection(db, "users"), where("email", "==", missingItemsModal.order.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const currentWallet = userDoc.data().walletBalance || 0;
            await updateDoc(doc(db, "users", userDoc.id), { walletBalance: currentWallet + missingTotal });
            
            setAllUsers(prev => prev.map(u => u.id === userDoc.id ? { ...u, walletBalance: currentWallet + missingTotal } : u));
            if (user.uid === userDoc.id) setUser({...user, walletBalance: currentWallet + missingTotal});
        } else {
            if (missingItemsModal.order.method === 'dinheiro/pix direto') {
                showToast("Nota: Para clientes avulsos sem conta, o crédito é simbólico. Registe manualmente.", "success");
            }
        }

        setOrders(orders.map(o => o.id === missingItemsModal.order.id ? { ...o, items: newItems, total: Math.max(0, newTotal), refundStatus: 'credito_gerado', refundAmount: missingTotal, missingItems: missingItemsToSave } : o));
        setMissingItemsModal({open: false, order: null, missingItems: []});
        showToast("Falta registada e crédito adicionado à carteira!", "success");
    } catch(e) {
        showToast("Erro ao processar falta e crédito.", "error");
    }
  }

  // --- SOLICITAR ESTORNO PIX (CLIENTE) ---
  const requestPixRefund = async (e) => {
    e.preventDefault();
    if (!user || (user.walletBalance || 0) <= 0) return;
    if (!pixRefundModal.key.trim()) return showToast("Informe a chave PIX.", "error");

    try {
      const amountToRefund = user.walletBalance;
      const currentPending = user.pendingPixRefund || 0;
      
      await updateDoc(doc(db, "users", user.uid), {
        walletBalance: 0,
        pendingPixRefund: currentPending + amountToRefund,
        pixKey: pixRefundModal.key 
      });
      
      const userOrdersWithCredit = orders.filter(o => o.email === user.email && o.refundStatus === 'credito_gerado');
      for (const o of userOrdersWithCredit) {
         await updateDoc(doc(db, "orders", o.id), { refundStatus: 'pendente_estorno' });
      }
      
      setUser({ ...user, walletBalance: 0, pendingPixRefund: currentPending + amountToRefund, pixKey: pixRefundModal.key });
      setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, walletBalance: 0, pendingPixRefund: currentPending + amountToRefund, pixKey: pixRefundModal.key } : u));
      setOrders(orders.map(o => o.email === user.email && o.refundStatus === 'credito_gerado' ? { ...o, refundStatus: 'pendente_estorno' } : o));
      
      setPixRefundModal({ open: false, key: '' });
      showToast("Solicitação de PIX enviada à equipe financeira!", "success");
    } catch(err) {
      showToast("Erro ao solicitar PIX", "error");
    }
  };

  // --- CONFIRMAR ESTORNO PIX (GESTOR) ---
  const confirmPixTransfer = async (userId) => {
    try {
       await updateDoc(doc(db, "users", userId), { pendingPixRefund: 0 });
       
       const targetUser = allUsers.find(u => u.id === userId);
       if (targetUser) {
           const userOrdersWithPending = orders.filter(o => o.email === targetUser.email && o.refundStatus === 'pendente_estorno');
           for (const o of userOrdersWithPending) {
              await updateDoc(doc(db, "orders", o.id), { refundStatus: 'estornado' });
           }
           setOrders(orders.map(o => o.email === targetUser.email && o.refundStatus === 'pendente_estorno' ? { ...o, refundStatus: 'estornado' } : o));
       }

       setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, pendingPixRefund: 0 } : u));
       showToast("Transferência de estorno confirmada!", "success");
    } catch(e) { 
       showToast("Erro ao confirmar transferência.", "error"); 
    }
  };

  // --- FUNÇÕES DE INTEGRAÇÃO COM WHATSAPP ---
  const handleSendWhatsApp = (order) => {
    if (!order.whatsapp) {
      showToast('O cliente não tem WhatsApp registado.', 'error');
      return;
    }
    let phone = order.whatsapp.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) { phone = '55' + phone; }
    
    let refundInfo = '';
    // Emojis removidos para garantir legibilidade e não quebrar URLs
    if (order.refundStatus === 'credito_gerado') refundInfo = `\n*Aviso:* Adicionamos R$ ${(order.refundAmount || 0).toFixed(2)} de CRÉDITO na sua Carteira Digital por um item não entregue pelo fornecedor. Pode usá-lo na próxima compra ou solicitar o PIX na nossa plataforma!`;

    const itemsList = (order.items || []).map(i => `- ${i.qtd}x ${i.name || 'Produto'}`).join('\n');
    const total = `R$ ${(order.total || 0).toFixed(2).replace('.', ',')}`;
    const text = `Olá, ${order.customer}!\n\nAqui é do *Clube de Compras*.\nA sua encomenda (Nº ${(order.id || '').slice(0,5)}) está confirmada!\n\n*Resumo da sua Cesta:*\n${itemsList}\n\n*Total:* ${total}\n*Polo de Retirada:* ${order.polo}${refundInfo}\n\nAvisaremos por aqui quando estiver pronta para recolha. Obrigado!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendCRMWhatsApp = (customer) => {
    if (!customer.whatsapp) {
      showToast('O cliente não tem WhatsApp registrado.', 'error');
      return;
    }
    let phone = customer.whatsapp.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    const text = `Olá, ${customer.name}! Aqui é do Clube de Compras. Em que podemos ajudar hoje?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendPixWhatsApp = (customer, amount) => {
    if (!customer.whatsapp) {
        showToast('O cliente não tem WhatsApp registrado.', 'error');
        return;
    }
    let phone = customer.whatsapp.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    
    const chaveInfor = customer.pixKey ? customer.pixKey : customer.whatsapp;
    const text = `Olá, ${customer.name}!\n\nAqui é do *Clube de Compras*.\nEstamos a entrar em contato para confirmar o seu estorno no valor de *R$ ${(amount || 0).toFixed(2).replace('.', ',')}* referente à falta de produtos na sua encomenda.\n\nA chave PIX que informou foi: *${chaveInfor}*.\n\nA transferência será realizada em breve. Obrigado!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- GRAVAR PRODUTO MANUAL ---
  const saveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const promPriceRaw = formData.get('promotionalPrice');
    const promotionalPrice = promPriceRaw ? parseFloat(promPriceRaw.replace(',', '.')) : 0;
    
    const newProdData = {
      sku: formData.get('sku'),
      category: formData.get('category') || 'Outros',
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price').replace(',', '.')),
      promotionalPrice: promotionalPrice, // NOVO: Preço Promocional salvo no DB
      minOrderQuantity: parseInt(formData.get('minOrderQuantity')) || 1,
      stockLocal: parseInt(formData.get('stockLocal')) || 0,
      image: imagePreview || editingProduct?.image || formData.get('imageFallback') || '📦',
    };

    try {
      if (editingProduct?.id) {
        await updateDoc(doc(db, "products", editingProduct.id), newProdData);
        setProducts(products.map(p => p.id === editingProduct.id ? { id: editingProduct.id, ...newProdData } : p));
      } else {
        const docRef = await addDoc(collection(db, "products"), newProdData);
        setProducts([...products, { id: docRef.id, ...newProdData }]);
      }
      setEditingProduct(null);
      setImagePreview('');
      showToast('Produto sincronizado!', 'success');
    } catch(err) { showToast('Erro ao guardar produto.', 'error'); }
  };

  const deleteProduct = async (id) => {
    if(window.confirm('Remover este produto permanentemente?')) {
      try {
        await deleteDoc(doc(db, "products", id));
        setProducts(products.filter(p => p.id !== id));
        showToast('Produto removido.', 'success');
      } catch(err) { showToast('Erro ao remover.', 'error'); }
    }
  };

  // --- UPLOAD INTELIGENTE DE CSV ---
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingCSV(true);
    showToast(`A processar a folha "${file.name}"... Aguarde.`, 'success');
    
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/);

      if (lines.length < 2) {
        setIsUploadingCSV(false);
        return showToast('O ficheiro CSV parece estar vazio.', 'error');
      }

      const newProducts = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = parseCSVLine(line);
        if (columns.length >= 5) {
          const sku = columns[0]?.trim();
          const category = columns[1]?.trim() || 'Outros';
          const name = columns[2]?.trim();
          const description = columns[3]?.trim() || '';
          
          let priceStr = columns[4]?.replace(/['"]/g, '').trim();
          priceStr = priceStr ? priceStr.replace(',', '.') : '0';
          const price = parseFloat(priceStr) || 0;
          
          const minOrderQuantity = parseInt(columns[5]) || 1;
          const stockLocal = parseInt(columns[6]) || 0;
          const image = columns[7]?.trim() || '📦';

          if (!name) continue;

          newProducts.push({
            sku, category, name, description, price, promotionalPrice: 0, minOrderQuantity, stockLocal, image
          });
        }
      }

      try {
        const prodSnapshot = await getDocs(collection(db, "products"));
        const currentProducts = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const updatedLocalProducts = [...currentProducts];

        for (const np of newProducts) {
           const existingIndex = updatedLocalProducts.findIndex(p => (np.sku && p.sku === np.sku) || (!np.sku && p.name === np.name));

           if (existingIndex >= 0) {
              const existingId = updatedLocalProducts[existingIndex].id;
              await updateDoc(doc(db, "products", existingId), np);
              updatedLocalProducts[existingIndex] = { id: existingId, ...np };
           } else {
              const docRef = await addDoc(collection(db, "products"), np);
              updatedLocalProducts.push({ id: docRef.id, ...np });
           }
        }

        setProducts(updatedLocalProducts);
        showToast(`Sucesso! ${newProducts.length} itens importados ou atualizados.`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao sincronizar com a base de dados.', 'error');
      } finally {
        setIsUploadingCSV(false);
        e.target.value = null;
      }
    };

    reader.readAsText(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
        setImagePreview(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const downloadCSVTemplate = () => {
    const headers = "SKU,Categoria,Nome,Descricao,Preco,QtdMinimaFornecedor,EstoqueAtual,Imagem_URL_ou_Emoji\n";
    const sample = "1423,Carnes & Aves,Coxa NGMO Cong Pct 1kg,Coxa de frango.,\"11,50\",15,5,🍗\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "modelo_catalogo_korin.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Modelo descarregado!', 'success');
  };

  // --- ECRÃS ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-16 h-16 text-emerald-600 animate-bounce mx-auto mb-4" />
          <p className="text-emerald-800 font-bold tracking-widest uppercase animate-pulse">A verificar Segurança...</p>
        </div>
      </div>
    );
  }

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md text-center border border-gray-100">
        <Leaf className="text-emerald-700 w-16 h-16 mx-auto mb-4 drop-shadow-sm" />
        <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Clube de Compras</h1>
        <p className="text-gray-500 mb-8 text-sm font-medium">Alimentos saudáveis diretos para si</p>
        
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">E-mail</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="seu@email.com" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 focus:bg-emerald-50/30 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Palavra-passe</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 focus:bg-emerald-50/30 outline-none transition-colors" />
            </div>
            
            <button type="submit" className="w-full flex items-center justify-center bg-emerald-700 text-white font-bold py-4 rounded-xl hover:bg-emerald-800 transition shadow-lg shadow-emerald-700/20 mt-6">
              Iniciar Sessão Segura
            </button>
            <button type="button" onClick={() => {setAuthMode('register'); setLoginPassword('');}} className="w-full mt-4 text-emerald-600 font-bold hover:underline text-sm">
              Não tem conta? Criar agora
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="text-left space-y-4 max-h-[60vh] overflow-y-auto px-2 pb-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Perfil de Acesso</label>
              <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value)} className="w-full border-2 border-emerald-100 bg-emerald-50/30 text-emerald-800 rounded-xl p-3 focus:border-emerald-600 outline-none font-bold">
                <option value="cliente">👤 Cliente Normal</option>
                <option value="representante">💼 Representante Logístico</option>
                <option value="consolidador">⭐ Gestor Geral (Admin)</option>
              </select>
            </div>

            {registerRole !== 'cliente' && (
              <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl">
                <label className="block text-xs font-bold text-red-700 mb-1 uppercase tracking-wider">Código de Autorização da Equipa</label>
                <input type="password" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} required placeholder="Chave secreta..." className="w-full border-b-2 border-red-200 bg-white rounded-t-lg p-3 focus:border-red-500 outline-none font-bold text-red-700" />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Nome Completo</label>
              <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} required placeholder="Ex: João Silva" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 outline-none transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">WhatsApp</label>
                <input type="tel" value={loginWhatsapp} onChange={(e) => setLoginWhatsapp(e.target.value)} required placeholder="(12) 99999-9999" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Polo Base</label>
                <select value={selectedPolo} onChange={(e) => setSelectedPolo(e.target.value)} className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 outline-none transition-colors">
                  {polos.map(polo => <option key={polo} value={polo}>{polo}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">E-mail</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="seu@email.com" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Criar Palavra-passe</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" minLength="6" className="w-full border-b-2 border-gray-200 bg-gray-50/50 rounded-t-lg p-3 focus:border-emerald-600 outline-none transition-colors" />
            </div>
            
            <button type="submit" className="w-full flex items-center justify-center bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition shadow-lg mt-6">
              Criar Conta e Aceder
            </button>
            <button type="button" onClick={() => {setAuthMode('login'); setLoginPassword(''); setSecretCode('');}} className="w-full mt-4 text-gray-500 font-bold hover:text-gray-800 text-sm">
              Voltar ao Login
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const renderShop = () => {
    const filteredProducts = products.filter(p => {
      const matchesCategory = shopCategory === 'Todos' || p.category === shopCategory;
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    const promoProducts = products.filter(p => p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price);

    return (
      <div className="pb-28 pt-4 px-4 max-w-5xl mx-auto">
        {/* --- CABEÇALHO E PESQUISA --- */}
        <div className="bg-emerald-700 -mx-4 -mt-4 p-6 pb-8 mb-6 rounded-b-[2rem] shadow-md relative">
          <div className="flex items-center justify-between text-emerald-100 mb-4">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1.5" />
              <span className="text-xs font-medium">Enviar para <strong className="text-white">{user?.polo || 'Sede'}</strong></span>
            </div>
            {(user?.walletBalance || 0) > 0 && (
              <div className="flex items-center bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                <Wallet className="w-3.5 h-3.5 text-white mr-1.5"/>
                <span className="text-xs font-medium text-white">R$ {(user.walletBalance || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Estou buscando..." 
              className="w-full bg-white border-none text-gray-800 py-3.5 pl-12 pr-4 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400 font-medium"
            />
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* --- CARROSSEL DE PROMOÇÕES (DINÂMICO) --- */}
        {promoProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center"><span className="text-orange-500 mr-2">🔥</span> Promoções Especiais</h3>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide">
              {promoProducts.map(product => {
                const cartItem = cart.find(c => c.id === product.id);
                const isImageUrl = product.image && product.image.length > 5;
                const discountPercent = Math.round((1 - (product.promotionalPrice / product.price)) * 100);
                return (
                  <div key={`promo-${product.id}`} className="snap-start shrink-0 w-36 sm:w-44 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden group hover:shadow-md transition-shadow relative">
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">-{discountPercent}%</span>
                    <div className="aspect-square bg-white flex items-center justify-center p-3 relative border-b border-gray-50">
                      {isImageUrl ? <img src={product.image} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" /> : <span className="text-4xl transition-transform duration-500 group-hover:scale-105">{product.image || '📦'}</span>}
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <p className="text-[10px] text-gray-400 line-through mb-0.5">R$ {(product.price || 0).toFixed(2).replace('.', ',')}</p>
                      <p className="text-lg text-emerald-600 font-bold leading-none mb-2">R$ {(product.promotionalPrice).toFixed(2).replace('.', ',')}</p>
                      <h3 className="text-[11px] sm:text-xs text-gray-600 leading-tight mb-3 flex-grow line-clamp-2">{product.name}</h3>
                      {cartItem ? (
                        <div className="flex items-center justify-between w-full bg-emerald-50 border border-emerald-200 rounded-lg p-1 mt-auto">
                          <button onClick={() => setCart(cart.map(i => i.id === product.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-emerald-800 font-bold">-</button>
                          <span className="font-semibold text-emerald-800 text-xs">{cartItem.qtd}</span>
                          <button onClick={() => addToCart(product)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-emerald-700 font-bold">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(product)} className="w-full bg-emerald-100 text-emerald-700 py-1.5 rounded-lg font-semibold text-[11px] transition-colors hover:bg-emerald-200 mt-auto">Adicionar</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- FILTRO DE CATEGORIA SUSPENSO --- */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">Catálogo</h2>
          <div className="relative w-40 sm:w-48">
            <select 
              value={shopCategory} 
              onChange={(e) => setShopCategory(e.target.value)}
              className="w-full appearance-none bg-gray-100 border-none text-gray-700 font-semibold py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
            >
              {activeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* --- GRID DE PRODUTOS (ESTILO APP/ML) --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map(product => {
            const cartItem = cart.find(c => c.id === product.id);
            const isImageUrl = product.image && product.image.length > 5; 
            const isPromo = product.promotionalPrice && product.promotionalPrice > 0 && product.promotionalPrice < product.price;
            const activePrice = isPromo ? product.promotionalPrice : product.price;

            return (
              <div key={product.id} className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col overflow-hidden group">
                <div className="aspect-square bg-white flex items-center justify-center p-4 relative border-b border-gray-50">
                  {isImageUrl ? (
                    <img src={product.image} alt={product.name || 'Produto'} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="text-5xl sm:text-6xl drop-shadow-sm transition-transform duration-500 group-hover:scale-105">{product.image || '📦'}</span>
                  )}
                </div>
                
                <div className="p-3 sm:p-4 flex flex-col flex-grow">
                  {isPromo && <p className="text-[10px] text-gray-400 line-through mb-0.5">R$ {(product.price || 0).toFixed(2).replace('.', ',')}</p>}
                  <p className="text-xl sm:text-2xl text-gray-900 font-normal mb-1">R$ {(activePrice || 0).toFixed(2).replace('.', ',')}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mb-2">Chega ao polo em breve</p>
                  <h3 className="text-xs sm:text-sm text-gray-500 leading-snug mb-4 flex-grow line-clamp-2">{product.name || 'Sem nome'}</h3>

                  {cartItem ? (
                     <div className="flex items-center justify-between w-full bg-emerald-50 border border-emerald-200 rounded-lg p-1">
                       <button onClick={() => setCart(cart.map(i => i.id === product.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-md shadow-sm text-emerald-800 font-bold hover:bg-emerald-100 transition">-</button>
                       <span className="font-semibold text-emerald-800 text-sm w-8 text-center">{cartItem.qtd}</span>
                       <button onClick={() => addToCart(product)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-md shadow-sm text-emerald-700 font-bold hover:bg-emerald-100 transition">+</button>
                     </div>
                  ) : (
                    <button onClick={() => addToCart(product)} className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors">
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
      <div className="p-4 max-w-2xl mx-auto pb-24 pt-8">
        <div className="flex items-center mb-8">
          <button onClick={() => setCurrentScreen('shop')} className="mr-4 flex items-center text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition text-sm shadow-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</button>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Finalizar Encomenda</h2>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
          <h3 className="font-black text-emerald-800 mb-5 text-sm uppercase tracking-widest flex items-center"><ShoppingCart className="w-4 h-4 mr-2"/> Resumo do Cesto</h3>
          <div className="space-y-4">
            {(cart || []).map(item => (
              <div key={item.id} className="flex justify-between items-center text-gray-700 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-emerald-700 border border-gray-100">{item.qtd}x</div>
                  <span className="font-bold">{item.name || 'Produto'}</span>
                </div>
                <span className="font-bold text-gray-500">R$ {(getActivePrice(item) * item.qtd).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-5 mt-6">
            <div className="flex justify-between text-gray-600 mb-3 font-medium"><span>Subtotal dos Produtos</span><span>R$ {(cartTotal || 0).toFixed(2).replace('.', ',')}</span></div>
            {hasFee && (
              <div className="flex justify-between text-orange-600 mb-3 text-sm font-bold"><span>Taxa de Cartão (5%)</span><span>+ R$ {(feeAmount || 0).toFixed(2).replace('.', ',')}</span></div>
            )}
            
            {walletDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 mb-3 text-sm font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <span className="flex items-center"><Wallet className="w-4 h-4 mr-2"/> Saldo da Carteira Aplicado</span>
                <span>- R$ {(walletDiscount || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
              <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total a Pagar</span>
              <span className="font-black text-3xl text-emerald-700 tracking-tighter">R$ {(finalTotal || 0).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {finalTotal > 0 && (
          <>
            <h3 className="font-black text-emerald-800 mb-4 text-sm uppercase tracking-widest pl-2">Forma de Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <label className={`flex flex-col items-center p-6 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
                <input type="radio" name="payment" value="pix" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} className="hidden" />
                <QrCode className={`w-10 h-10 mb-3 ${paymentMethod === 'pix' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className="font-black text-gray-800 mb-1">Pagar com PIX</p>
                <p className="text-xs text-emerald-600 font-bold bg-emerald-100/50 px-2 py-1 rounded-md">Recomendado</p>
              </label>
              <label className={`flex flex-col items-center p-6 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'credit' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
                <input type="radio" name="payment" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} className="hidden" />
                <CreditCard className={`w-10 h-10 mb-3 ${paymentMethod === 'credit' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className="font-black text-gray-800 mb-1">Cartão de Crédito</p>
                <p className="text-xs text-gray-400 font-medium">+ 5% de taxa</p>
              </label>
            </div>
          </>
        )}

        <button onClick={() => processGatewayPayment(finalTotal, walletDiscount)} disabled={isProcessingPayment} className={`w-full text-white font-black text-lg py-5 rounded-2xl shadow-xl flex items-center justify-center transition-all ${isProcessingPayment ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-700 hover:bg-emerald-800 hover:shadow-emerald-700/30 hover:-translate-y-1'}`}>
          {isProcessingPayment ? <span className="animate-pulse flex items-center">A processar a sua encomenda...</span> : finalTotal <= 0 ? 'Pagar Usando Saldo' : `Gerar Pagamento Seguro`}
        </button>
      </div>
    );
  };

  const renderPixGateway = () => {
    if (!pendingOrder) return null;
    const pixCode = `00020126580014br.gov.bcb.pix0136${(pendingOrder.id || '').slice(0,5)}-teste-simulado-sjc5204000053039865405${(pendingOrder.total || 0).toFixed(2)}5802BR5913MARCELO SILVA6009SAO PAULO62070503***6304${(pendingOrder.id || '').slice(0,4)}6804A92B`;
    
    return (
      <div className="p-4 max-w-lg mx-auto pt-10 pb-24 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-emerald-500"></div>
          
          <QrCode className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Pague com PIX</h2>
          <p className="text-gray-500 font-medium mb-8">A sua encomenda está guardada! Abra a aplicação do seu banco e leia o QR Code ou cole o código abaixo.</p>
          
          <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-8 inline-block">
             <div className="w-48 h-48 bg-white border border-gray-100 rounded-2xl mx-auto p-2 shadow-sm grid grid-cols-4 grid-rows-4 gap-1">
               {Array.from({length: 16}).map((_, i) => (
                 <div key={i} className={`rounded-sm ${Math.random() > 0.3 ? 'bg-slate-800' : 'bg-transparent'}`}></div>
               ))}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-white p-2 rounded-xl shadow-md"><Leaf className="w-8 h-8 text-emerald-600"/></div></div>
             </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between mb-8 group">
            <p className="text-xs font-mono text-emerald-800 truncate mr-4">{pixCode}</p>
            <button onClick={() => { navigator.clipboard.writeText(pixCode); showToast('Código Copiado!', 'success'); }} className="bg-white text-emerald-700 p-2.5 rounded-xl shadow-sm border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors flex-shrink-0">
              <Copy className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center text-orange-600 font-bold mb-10 text-sm bg-orange-50 py-2 rounded-lg">
            <Clock className="w-4 h-4 mr-2" animate-spin /> Aguardar confirmação do banco...
          </div>

          <div className="border-t border-gray-100 pt-8 mt-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Área de Teste do Programador</p>
            <button onClick={simulateBankWebhook} className="w-full bg-slate-800 text-emerald-400 font-black py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg flex items-center justify-center">
              Simular Confirmação do Banco
            </button>
            <p className="text-xs text-gray-400 mt-3">Na vida real, este ecrã muda de forma automática quando o banco emite o Webhook de pagamento.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCreditGateway = () => {
    if (!pendingOrder) return null;
    return (
      <div className="p-4 max-w-lg mx-auto pt-10 pb-24">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-3 bg-emerald-500"></div>
          <CreditCard className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">Cartão de Crédito</h2>
          <p className="text-gray-500 font-medium mb-8">Introduza os dados de forma segura (Modo de Simulação).</p>
          
          <div className="space-y-4 text-left bg-slate-50 p-6 rounded-2xl border border-gray-100 mb-8">
             <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Número do Cartão</label><input type="text" placeholder="0000 0000 0000 0000" className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-emerald-500 outline-none" /></div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Validade</label><input type="text" placeholder="MM/AA" className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-emerald-500 outline-none" /></div>
               <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">CVC</label><input type="text" placeholder="123" className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-emerald-500 outline-none" /></div>
             </div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Nome Impresso</label><input type="text" placeholder="JOAO SILVA" className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-emerald-500 outline-none uppercase" /></div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Área de Teste do Programador</p>
            <button onClick={simulateBankWebhook} className="w-full bg-slate-800 text-emerald-400 font-black py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
              Simular Pagamento Aprovado
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMyOrders = () => {
    const myOrders = orders.filter(o => o.customer === user?.name && o.email === user?.email);
    return (
      <div className="p-4 max-w-4xl mx-auto pt-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => setCurrentScreen('shop')} className="mr-4 flex items-center text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition text-sm shadow-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Loja</button>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">As Minhas Encomendas</h2>
          </div>
        </div>

        {/* --- BANNER DE NOTIFICAÇÃO DA CARTEIRA E PIX --- */}
        {(user?.walletBalance > 0) && (
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-5">
              <div className="bg-white p-3 rounded-full shadow-sm"><Wallet className="w-8 h-8 text-emerald-600"/></div>
              <div>
                <h3 className="font-black text-emerald-800 text-lg">Houve uma falta na sua encomenda recente.</h3>
                <p className="text-sm font-medium text-emerald-700">Adicionamos <strong>R$ {(user.walletBalance || 0).toFixed(2).replace('.', ',')} de crédito</strong> na sua Carteira para abater automaticamente na próxima compra!</p>
              </div>
            </div>
            <button onClick={() => setPixRefundModal({ open: true, key: user.whatsapp || '' })} className="whitespace-nowrap w-full md:w-auto bg-white text-emerald-700 border-2 border-emerald-200 px-6 py-3 rounded-xl font-black hover:bg-emerald-100 transition-all shadow-sm">
              Prefere receber via PIX?
            </button>
          </div>
        )}

        {(user?.pendingPixRefund > 0) && (
          <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-200 mb-8 flex items-center gap-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
            <div className="bg-white p-3 rounded-full shadow-sm"><Clock className="w-8 h-8 text-orange-600"/></div>
            <div>
              <h3 className="font-black text-orange-800 text-lg">Estorno PIX em Andamento</h3>
              <p className="text-sm font-medium text-orange-700">A nossa equipa financeira fará a transferência de <strong>R$ {(user.pendingPixRefund || 0).toFixed(2).replace('.', ',')}</strong> para a chave PIX <strong>{user.pixKey || user.whatsapp}</strong> em breve.</p>
            </div>
          </div>
        )}
        {/* ----------------------------------------------- */}

        {myOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-gray-100 text-center">
            <Package className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <p className="text-gray-500 font-medium mb-6">A sua despensa de pedidos ainda está vazia.</p>
            <button onClick={() => setCurrentScreen('shop')} className="bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-800 transition shadow-lg">Descobrir Produtos</button>
          </div>
        ) : (
          <div className="space-y-6">
            {myOrders.slice().reverse().map((order) => (
              <div key={order.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border relative overflow-hidden ${order.status === 'aguardando_pagamento' ? 'border-orange-200' : 'border-gray-100'}`}>
                <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'aguardando_pagamento' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                  <div>
                    <p className="font-bold text-gray-400 text-xs tracking-widest uppercase mb-1">{new Date(order.date || new Date()).toLocaleDateString('pt-BR')}</p>
                    <p className="font-black text-gray-800 text-lg">Pedido <span className="text-emerald-700">#{(order.id || '').slice(0, 5)}</span></p>
                  </div>
                  
                  {order.status === 'aguardando_pagamento' ? (
                     <span className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm flex items-center"> <Clock className="w-3 h-3 mr-1 animate-spin"/> A Aguardar PIX </span>
                  ) : (
                     <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm flex items-center"> <CheckCircle className="w-3 h-3 mr-1"/> Confirmado </span>
                  )}
                  
                </div>
                
                {/* --- AVISO DE ESTORNO ATUALIZADO --- */}
                {order.refundStatus && (
                  <div className={`mb-4 border rounded-xl p-3 text-sm flex items-start gap-2 ${order.refundStatus === 'estornado' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                    <span className="text-lg">{order.refundStatus === 'estornado' ? '✅' : '⚠️'}</span>
                    <div>
                      <p className="font-bold">{order.refundStatus === 'estornado' ? 'Estorno Realizado' : 'Atenção à sua encomenda'}</p>
                      <p className="text-xs mt-1">
                        {order.refundStatus === 'credito_gerado' ? `Um item faltou e R$ ${(order.refundAmount || 0).toFixed(2)} foram adicionados como crédito à sua carteira!` : 
                         order.refundStatus === 'estornado' ? `O valor de R$ ${(order.refundAmount || 0).toFixed(2)} referente aos itens em falta foi transferido para a sua conta com sucesso.` :
                         `Um item faltou. Entraremos em contacto para realizar o estorno de R$ ${(order.refundAmount || 0).toFixed(2)}.`}
                      </p>
                    </div>
                  </div>
                )}
                {/* ---------------------------------- */}
                
                <div className="space-y-3 mb-6">
                  {(order.items || []).map((item, idx) => (<div key={idx} className="flex items-center text-sm text-gray-600"><span className="w-8 h-8 bg-gray-50 text-emerald-700 font-black rounded-lg flex items-center justify-center mr-3 border border-gray-100">{item.qtd}x</span> <span className="font-medium">{item.name || 'Produto'}</span></div>))}
                </div>
                <div className="flex justify-between items-end bg-slate-50 p-4 rounded-xl">
                  <div>
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Total a Pagar</span>
                     <span className="font-black text-2xl text-emerald-800">R$ ${(order.total || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                  {order.status === 'aguardando_pagamento' ? (
                     <button onClick={() => { setPendingOrder(order); setPaymentMethod(order.method); setCurrentScreen(order.method === 'pix' ? 'gateway_pix' : 'gateway_credit'); }} className="text-xs font-black text-white uppercase bg-orange-500 px-4 py-2 rounded-lg border border-orange-600 hover:bg-orange-600 transition shadow-sm">Pagar Agora</button>
                  ) : (
                     <span className="text-xs font-bold text-gray-400 uppercase bg-white px-3 py-1 rounded-md border border-gray-200">{order.method}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRepDashboard = () => {
    const myPoloOrders = orders.filter(o => o.polo === user?.polo && o.status === 'pago');
    const appOrders = myPoloOrders.filter(o => o.method !== 'dinheiro/pix direto');
    const manualOrders = myPoloOrders.filter(o => o.method === 'dinheiro/pix direto');
    const sumTotal = (arr) => arr.reduce((sum, o) => sum + (o.total || 0), 0);

    const ordersByMonth = myPoloOrders.reduce((acc, order) => {
      const d = order.date ? new Date(order.date) : new Date();
      const monthYear = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      const sortKey = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!acc[capitalizedMonth]) acc[capitalizedMonth] = { orders: [], total: 0, count: 0, sortKey };
      acc[capitalizedMonth].orders.push(order);
      acc[capitalizedMonth].total += (order.total || 0);
      acc[capitalizedMonth].count += 1;
      return acc;
    }, {});

    const toggleMonth = (month) => setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));

    return (
      <div className="p-4 max-w-4xl mx-auto pt-8 pb-24 text-left">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Painel Representante</h2>
          <p className="text-emerald-700 font-medium mt-1">Gestão da unidade de <strong className="font-bold">{user?.polo || 'Sede'}</strong></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-start justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors text-left">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">Pelo App (Confirmados)</span>
            <span className="text-3xl font-bold text-gray-800 tracking-tight">{appOrders.length} <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">pedidos</span></span>
            <span className="text-sm text-emerald-600 font-semibold mt-2 bg-emerald-50 px-2 py-1 rounded-md">R$ {sumTotal(appOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-start justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors text-left">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">Seus Lançamentos</span>
            <span className="text-3xl font-bold text-gray-800 tracking-tight">{manualOrders.length} <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">pedidos</span></span>
            <span className="text-sm text-orange-600 font-semibold mt-2 bg-orange-50 px-2 py-1 rounded-md">R$ {sumTotal(manualOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-emerald-800 p-6 rounded-[2rem] shadow-lg shadow-emerald-800/20 text-white flex flex-col items-start justify-center relative overflow-hidden text-left">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-5 rounded-full"></div>
            <span className="text-xs text-emerald-200 font-semibold uppercase tracking-widest mb-2">Volume da Unidade</span>
            <span className="text-3xl font-bold tracking-tight">{myPoloOrders.length} <span className="text-sm font-medium text-emerald-300 ml-1 tracking-normal">pedidos</span></span>
            <span className="text-lg font-bold text-emerald-300 mt-2">R$ {sumTotal(myPoloOrders).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <button onClick={() => setIsManualOrderModalOpen(true)} className="flex-1 bg-white text-emerald-700 border border-emerald-200 font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-sm"><Plus className="w-5 h-5 mr-2" /> Novo Pedido Avulso</button>
          <button onClick={() => setCurrentScreen('print_rep')} className="flex-1 bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"><Printer className="w-5 h-5 mr-2" /> Gerar Lista de Separação</button>
        </div>

        <h3 className="font-bold text-emerald-800 mb-5 uppercase tracking-widest text-sm pl-2 flex items-center"><ClipboardList className="w-4 h-4 mr-2"/> Histórico Mensal</h3>
        <div className="space-y-4">
          {Object.entries(ordersByMonth).length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-white rounded-[2rem] border border-gray-100">Nenhum pedido processado ainda.</p>
          ) : (
            Object.entries(ordersByMonth).sort((a,b) => b[1].sortKey.localeCompare(a[1].sortKey)).map(([month, data]) => {
              const isExpanded = expandedMonths[month] !== false; 
              return (
                <div key={month} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all">
                  <button onClick={() => toggleMonth(month)} className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-gray-50 text-left">
                    <div><p className="font-bold text-gray-800 capitalize text-lg">{month}</p><p className="text-sm text-gray-500 font-medium mt-1"><span className="text-emerald-700 font-bold">{data.count}</span> pedidos • R$ {(data.total || 0).toFixed(2).replace('.', ',')}</p></div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">{isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-50 p-2">
                      {data.orders.slice().reverse().map(order => (
                        <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 rounded-xl transition-colors m-2 border border-transparent hover:border-gray-100 text-left">
                          <div>
                            <p className="font-bold text-gray-800 text-base mb-1">{order.customer}</p>
                            <p className="text-xs text-gray-500 mb-2 font-medium">#{(order.id || '').slice(0,5)}... • <span className="font-bold text-gray-700">R$ {(order.total || 0).toFixed(2).replace('.', ',')}</span></p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(order.items || []).map((item, idx) => (<span key={idx} className="bg-white text-gray-600 text-[10px] px-2.5 py-1 rounded-md border border-gray-200 uppercase font-semibold shadow-sm">{item.qtd}x {(item.name || '').split(' ')[0]}</span>))}
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${order.method === 'dinheiro/pix direto' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {order.method === 'dinheiro/pix direto' ? 'S/ CAIXA' : 'APP'}
                            </span>
                            
                            <div className="flex gap-2">
                                {order.refundStatus === 'pendente_estorno' && <span className="flex items-center justify-center text-[9px] font-bold uppercase text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 shadow-sm">Estorno Pend.</span>}
                                {order.refundStatus === 'credito_gerado' && <span className="flex items-center justify-center text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">Crédito Gerado</span>}
                                {order.refundStatus === 'estornado' && <span className="flex items-center justify-center text-[9px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shadow-sm">Estornado</span>}
                                
                                {(!order.refundStatus || order.refundStatus === '') && order.status === 'pago' && (
                                   <button onClick={() => setMissingItemsModal({open: true, order, missingItems: (order.items || []).map(i=>({...i, removedQtd:0})), refundType: 'credit'})} className="flex items-center justify-center text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200 transition-colors shadow-sm">
                                      Faltas
                                   </button>
                                )}
                                
                                <button onClick={() => handleSendWhatsApp(order)} className="flex items-center justify-center text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm">
                                  <MessageCircle className="w-3 h-3 mr-1.5" /> Recibo
                                </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MODAL DE PEDIDO RÁPIDO */}
        {isManualOrderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-left">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-gray-800">Venda via WhatsApp</h3>
              <div className="space-y-4 mb-6">
                <input value={manualCustomerName} onChange={(e) => setManualCustomerName(e.target.value)} placeholder="Nome do Cliente" className="w-full border-b-2 border-gray-200 p-3 outline-none focus:border-emerald-500 transition-colors" />
                <input value={manualCustomerWhatsapp} onChange={(e) => setManualCustomerWhatsapp(e.target.value)} placeholder="WhatsApp" className="w-full border-b-2 border-gray-200 p-3 outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 mb-6 border border-gray-100 rounded-xl p-2 bg-slate-50">
                 {products.map(p => (
                   <div key={p.id} className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                     <span className="text-sm font-medium text-gray-700">{p.name}</span>
                     <button onClick={() => {
                       const existing = manualCart.find(i => i.id === p.id);
                       if (existing) setManualCart(manualCart.map(i => i.id === p.id ? {...i, qtd: i.qtd + 1} : i));
                       else setManualCart([...manualCart, {...p, qtd: 1}]);
                     }} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-md text-xs font-bold hover:bg-emerald-100 transition-colors">+ ADD</button>
                   </div>
                 ))}
              </div>
              {manualCart.length > 0 && <p className="mb-6 font-bold text-emerald-700">Itens na cesta: {manualCart.length}</p>}
              <div className="flex gap-3">
                 <button onClick={() => setIsManualOrderModalOpen(false)} className="flex-1 py-3 font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                 <button onClick={confirmManualOrder} className="flex-1 py-3 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 shadow-md transition-all">Salvar Venda</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdminDashboard = () => {
    const paidOrders = orders.filter(o => o.status === 'pago');
    const consolidatedItems = {};
    
    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        if (!consolidatedItems[item.id]) consolidatedItems[item.id] = { ...products.find(p => p.id === item.id) || item, totalQtd: 0, polos: {} };
        consolidatedItems[item.id].totalQtd += item.qtd;
        if (!consolidatedItems[item.id].polos[order.polo]) consolidatedItems[item.id].polos[order.polo] = 0;
        consolidatedItems[item.id].polos[order.polo] += item.qtd;
      });
    });

    const downloadPurchaseOrderCSV = () => {
      let csvContent = "SKU,Produto,Qtd Vendida,Estoque Local Atual,Caixas para Comprar (Fornecedor),Tamanho da Caixa,Qtd Total a Receber\n";
      let hasItemsToBuy = false;

      Object.values(consolidatedItems).forEach(prod => {
        const moq = prod.minOrderQuantity || 1;
        const estoqueLocalAtual = prod.stockLocal || 0;
        const totalVendidos = prod.totalQtd || 0;
        const necessidadeExterna = Math.max(0, totalVendidos - estoqueLocalAtual);
        const caixasParaComprar = Math.ceil(necessidadeExterna / moq);
        
        if (caixasParaComprar > 0) {
          hasItemsToBuy = true;
          csvContent += `${prod.sku || ''},${prod.name || ''},${totalVendidos},${estoqueLocalAtual},${caixasParaComprar},${moq},${caixasParaComprar * moq}\n`;
        }
      });

      if (!hasItemsToBuy) return showToast('Stock ok. Nenhuma compra necessária.', 'success');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `pedido_fornecedor_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportado para CSV!', 'success');
    };

    return (
      <div className="p-4 max-w-6xl mx-auto pt-8 pb-24">
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
          <button onClick={() => setAdminTab('pedidos')} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${adminTab === 'pedidos' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>Painel de Compras</button>
          <button onClick={() => setAdminTab('catalogo')} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${adminTab === 'catalogo' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>Gestão de Catálogo</button>
          <button onClick={() => setAdminTab('crm')} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${adminTab === 'crm' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>CRM de Clientes</button>
          <button onClick={() => setAdminTab('financeiro')} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${adminTab === 'financeiro' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>Financeiro & Reembolsos</button>
        </div>

        {/* --- PAINEL FINANCEIRO INTERATIVO --- */}
        {adminTab === 'financeiro' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button onClick={() => setFinanceTab('credito')} className={`text-left bg-emerald-700 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden transition-transform ${financeTab === 'credito' ? 'ring-4 ring-emerald-300 scale-[1.02]' : 'hover:scale-[1.02] opacity-90'}`}>
                  <div className="absolute -right-4 -top-4 opacity-10"><Wallet className="w-40 h-40"/></div>
                  <p className="text-emerald-200 font-black uppercase tracking-widest text-xs mb-2">Crédito Total nas Carteiras (Retido)</p>
                  <p className="text-5xl font-black tracking-tighter">R$ {allUsers.reduce((sum, u) => sum + (u.walletBalance || 0), 0).toFixed(2).replace('.', ',')}</p>
               </button>
               <button onClick={() => setFinanceTab('pix')} className={`text-left bg-orange-500 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden transition-transform ${financeTab === 'pix' ? 'ring-4 ring-orange-300 scale-[1.02]' : 'hover:scale-[1.02] opacity-90'}`}>
                  <div className="absolute -right-4 -top-4 opacity-10"><Landmark className="w-40 h-40"/></div>
                  <p className="text-orange-200 font-black uppercase tracking-widest text-xs mb-2">Total a Devolver via PIX (Estornos)</p>
                  <p className="text-5xl font-black tracking-tighter">R$ {allUsers.reduce((sum, u) => sum + (u.pendingPixRefund || 0), 0).toFixed(2).replace('.', ',')}</p>
               </button>
            </div>

            {financeTab === 'credito' && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-emerald-50 border-b border-emerald-100 font-black text-emerald-800 text-lg tracking-tight">Detalhamento de Créditos (Carteiras de Clientes)</div>
                <div className="divide-y divide-gray-50">
                  {allUsers.filter(u => (u.walletBalance || 0) > 0).length === 0 ? (
                    <p className="p-10 text-center text-gray-400 font-medium">Nenhum cliente com crédito na carteira neste momento.</p>
                  ) : (
                    allUsers.filter(u => (u.walletBalance || 0) > 0).map(u => {
                      const uOrders = orders.filter(o => o.email === u.email && o.refundStatus === 'credito_gerado');
                      return (
                        <div key={u.id} className="p-6 flex flex-col md:flex-row justify-between gap-4 hover:bg-slate-50 transition-colors">
                           <div>
                              <p className="font-black text-slate-800 text-xl mb-1">{u.name}</p>
                              <p className="text-sm font-medium text-gray-500">Contato: <strong className="text-slate-700">{u.whatsapp}</strong></p>
                              
                              {uOrders.length > 0 && (
                                <div className="mt-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm max-w-sm">
                                  <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Produtos que geraram este crédito:</p>
                                  {uOrders.map(o => (
                                    <div key={o.id} className="mb-1 text-xs text-gray-600">
                                      <span className="font-bold text-gray-800">Pedido #{(o.id || '').slice(0,5)}:</span> {o.missingItems && o.missingItems.length > 0 ? o.missingItems.map(i => `${i.qtd}x ${i.name}`).join(', ') : 'Itens não detalhados'}
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                           <div className="flex flex-col items-end justify-center gap-3">
                              <div className="text-right bg-emerald-50 p-3 rounded-xl border border-emerald-100 w-full sm:w-auto">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Saldo na Carteira</p>
                                <p className="text-2xl font-black text-emerald-800">R$ {(u.walletBalance || 0).toFixed(2).replace('.', ',')}</p>
                              </div>
                           </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {financeTab === 'pix' && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-orange-50 border-b border-orange-100 font-black text-orange-800 text-lg tracking-tight">Solicitações de Estorno (PIX) Pendentes</div>
                <div className="divide-y divide-gray-50">
                  {allUsers.filter(u => (u.pendingPixRefund || 0) > 0).length === 0 ? (
                    <p className="p-10 text-center text-gray-400 font-medium">Nenhuma solicitação de estorno pendente neste momento.</p>
                  ) : (
                    allUsers.filter(u => (u.pendingPixRefund || 0) > 0).map(u => {
                      const uOrders = orders.filter(o => o.email === u.email && o.refundStatus === 'pendente_estorno');
                      return (
                        <div key={u.id} className="p-6 flex flex-col md:flex-row justify-between gap-4 hover:bg-slate-50 transition-colors">
                           <div>
                              <p className="font-black text-slate-800 text-xl mb-1">{u.name}</p>
                              <p className="text-sm font-medium text-gray-500">Chave PIX Informada: <strong className="text-slate-800 bg-gray-200 px-2 py-1 rounded">{u.pixKey || u.whatsapp}</strong></p>
                              <p className="text-xs text-gray-400 mt-2">Email: {u.email}</p>

                              {uOrders.length > 0 && (
                                <div className="mt-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm max-w-sm">
                                  <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Produtos que geraram o estorno:</p>
                                  {uOrders.map(o => (
                                    <div key={o.id} className="mb-1 text-xs text-gray-600">
                                      <span className="font-bold text-gray-800">Pedido #{(o.id || '').slice(0,5)}:</span> {o.missingItems && o.missingItems.length > 0 ? o.missingItems.map(i => `${i.qtd}x ${i.name}`).join(', ') : 'Itens não detalhados'}
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                           <div className="flex flex-col items-end justify-center gap-3">
                              <div className="text-right bg-orange-50 p-3 rounded-xl border border-orange-100 w-full sm:w-auto">
                                <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Valor a Transferir</p>
                                <p className="text-2xl font-black text-orange-800">R$ {(u.pendingPixRefund || 0).toFixed(2).replace('.', ',')}</p>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => handleSendPixWhatsApp(u, u.pendingPixRefund)} className="flex items-center justify-center bg-emerald-100 text-emerald-800 font-black px-4 py-2 rounded-xl hover:bg-emerald-200 transition shadow-sm border border-emerald-200">
                                  <MessageCircle className="w-4 h-4 mr-2" /> Contatar
                                </button>
                                <button onClick={() => confirmPixTransfer(u.id)} className="flex items-center justify-center bg-orange-600 text-white font-black px-4 py-2 rounded-xl hover:bg-orange-700 transition shadow-sm">
                                  Confirmar Envio
                                </button>
                              </div>
                           </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {adminTab === 'pedidos' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 p-6 font-bold text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-4 border-emerald-600">
              <span className="flex items-center text-xl font-black tracking-tight"><Package className="w-6 h-6 mr-3 text-emerald-400" /> Inteligência de Stock</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-slate-900/50 px-4 py-2 rounded-xl text-sm text-emerald-400 font-black border border-slate-700">Faturação Paga: R$ {paidOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2).replace('.', ',')}</span>
                <button onClick={downloadPurchaseOrderCSV} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-500 transition shadow-lg"><Download className="w-4 h-4 mr-2"/> Gerar Folha Fornecedor</button>
                <button onClick={() => setCurrentScreen('print_admin')} className="flex items-center bg-white text-slate-800 px-4 py-2 rounded-xl font-black hover:bg-gray-100 transition shadow-lg"><Printer className="w-4 h-4 mr-2"/> Carga & Despacho</button>
              </div>
            </div>
            
            <div className="bg-emerald-50/50 p-6 border-b border-emerald-100 text-sm text-emerald-800">
              <p className="font-black flex items-center mb-1 text-base tracking-tight"><ClipboardList className="w-5 h-5 mr-2 text-emerald-600"/> Robô de Abastecimento (Apenas Pedidos Pagos)</p>
              <p className="font-medium text-emerald-700/80">O sistema calcula as sobras do mês passado. Só é sugerida a compra de novas caixas quando a procura dos clientes ultrapassa o stock local.</p>
            </div>

            <div className="divide-y divide-gray-50">
              {Object.values(consolidatedItems).length === 0 && <p className="p-12 text-center text-gray-400 font-medium text-lg">Nenhum pedido pago processado neste ciclo.</p>}
              {Object.values(consolidatedItems).map(prod => {
                const moq = prod.minOrderQuantity || 1;
                const estoqueLocalAtual = prod.stockLocal || 0;
                const totalVendidos = prod.totalQtd || 0;
                const necessidadeExterna = Math.max(0, totalVendidos - estoqueLocalAtual);
                const caixasParaComprar = Math.ceil(necessidadeExterna / moq);
                const totalCompradoDoFornecedor = caixasParaComprar * moq;
                const novoEstoqueLocal = (estoqueLocalAtual - totalVendidos) + totalCompradoDoFornecedor;
                const isImageUrl = prod.image && prod.image.length > 5;

                return (
                  <div key={prod.id} className="p-8 hover:bg-slate-50 transition border-l-8 border-transparent hover:border-emerald-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-6">
                      <div className="flex items-center lg:w-1/3">
                        <div className="w-20 h-20 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mr-5 overflow-hidden shadow-sm flex-shrink-0">
                           {isImageUrl ? <img src={prod.image} alt="" className="w-full h-full object-contain p-2"/> : <span className="text-4xl">{prod.image}</span>}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 text-xl tracking-tight mb-1">{prod.name}</p>
                          <p className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md inline-block uppercase tracking-widest">Cx Fornecedor: {moq} un</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Vendido</p><p className="text-3xl font-black text-slate-800">{totalVendidos}</p>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Local</p><p className="text-3xl font-black text-slate-800">{estoqueLocalAtual}</p>
                        </div>
                        <div className="bg-emerald-700 border border-emerald-800 rounded-2xl p-4 shadow-lg text-center relative text-white transform hover:scale-105 transition">
                          <p className="text-[10px] text-emerald-200 font-black uppercase tracking-widest mb-1">Comprar (Cx)</p>
                          <p className="text-3xl font-black">{caixasParaComprar}</p>
                          {caixasParaComprar > 0 && <span className="absolute -top-3 -right-3 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-md border-2 border-white">+{totalCompradoDoFornecedor} un</span>}
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm text-center">
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Sobra Futura</p>
                          <p className="text-3xl font-black text-emerald-800">{novoEstoqueLocal}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pl-24 flex gap-2 flex-wrap mt-3 items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mr-3">Destinos:</span>
                      {Object.entries(prod.polos).map(([poloName, qtd]) => (
                        <span key={poloName} className="bg-white text-gray-600 text-xs px-3 py-1.5 rounded-lg border border-gray-200 font-bold shadow-sm">
                          {poloName}: <strong className="font-black text-emerald-700 ml-1">{qtd}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {adminTab === 'crm' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-emerald-700 p-6 font-bold text-white flex justify-between items-center border-b-4 border-emerald-800">
              <span className="flex items-center text-xl font-black tracking-tight"><Users className="w-6 h-6 mr-3 text-emerald-200" /> Diretório de Clientes</span>
              <span className="bg-emerald-900/40 px-4 py-1.5 rounded-xl text-sm font-black border border-emerald-600/50 shadow-inner">{customers.length} Registos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100"><th className="p-5">Nome Registado</th><th className="p-5">Polo / Unidade</th><th className="p-5">Contacto</th><th className="p-5">E-mail</th><th className="p-5 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 font-black text-slate-800 text-lg">{c.name}</td>
                      <td className="p-5 text-sm font-bold text-gray-500"><span className="bg-white border border-gray-200 px-3 py-1 rounded-lg">{c.polo}</span></td>
                      <td className="p-5 text-sm font-black text-emerald-600">{c.whatsapp || '---'}</td>
                      <td className="p-5 text-sm font-medium text-gray-400">{c.email || '---'}</td>
                      <td className="p-5 text-right">
                        <button onClick={() => handleSendCRMWhatsApp(c)} className="inline-flex items-center text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-200">
                          <MessageCircle className="w-4 h-4 mr-2" /> Falar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === 'catalogo' && (
          <div className="space-y-8">
            <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between shadow-sm">
              <div className="mb-6 md:mb-0">
                <h3 className="font-black text-emerald-900 text-xl tracking-tight flex items-center mb-2"><FileSpreadsheet className="w-6 h-6 mr-3 text-emerald-600"/> Importação Massiva (Fornecedor)</h3>
                <p className="text-sm font-medium text-emerald-700/80 mb-4 max-w-md">Atualize todos os preços e SKUs de uma vez fazendo o upload da folha de cálculo mensal CSV.</p>
                <button onClick={downloadCSVTemplate} className="text-xs font-black text-emerald-700 uppercase tracking-widest hover:text-emerald-900 flex items-center bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm"><Download className="w-4 h-4 mr-2" /> Baixar Modelo Padrão</button>
              </div>
              <label className={`cursor-pointer bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl transition-all flex items-center shadow-lg shadow-emerald-700/30 whitespace-nowrap ${isUploadingCSV ? 'opacity-70' : 'hover:bg-emerald-800 hover:-translate-y-1 transform'}`}>
                {isUploadingCSV ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Upload className="w-5 h-5 mr-3" />}
                <span>{isUploadingCSV ? 'A Processar...' : 'Fazer Upload CSV'}</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={isUploadingCSV} />
              </label>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              <h3 className="font-black text-slate-800 text-2xl tracking-tight mb-8 flex items-center">
                {editingProduct ? <span className="bg-blue-100 text-blue-700 p-2 rounded-xl mr-3"><Edit2 className="w-5 h-5"/></span> : <span className="bg-emerald-100 text-emerald-700 p-2 rounded-xl mr-3"><Plus className="w-5 h-5"/></span>}
                {editingProduct ? 'Modificar Item do Catálogo' : 'Cadastrar Novo Alimento'}
              </h3>
              <form key={editingProduct?.id || 'new'} onSubmit={saveProduct} className="space-y-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-slate-50 border border-gray-100 rounded-2xl">
                  <div className="w-32 h-32 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative group">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                    ) : editingProduct?.image && editingProduct.image.length > 5 ? (
                      <img src={editingProduct.image} alt="Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-5xl opacity-50 group-hover:opacity-100 transition-opacity">{editingProduct?.image || '📦'}</span>
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Fotografia do Produto</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="cursor-pointer bg-white border-2 border-emerald-100 text-emerald-700 px-6 py-3 rounded-xl text-sm font-black hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center justify-center whitespace-nowrap shadow-sm">
                        <ImageIcon className="w-5 h-5 mr-2" /> Procurar Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <input name="imageFallback" defaultValue={(!editingProduct?.image || editingProduct.image.length > 5) ? '' : editingProduct.image} placeholder="Ou cole um Emoji (Ex: 🍎)" className="flex-1 bg-white border-2 border-gray-100 rounded-xl p-3 text-sm font-medium focus:border-emerald-500 outline-none transition-colors" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Formatos aceites: JPG, PNG ou Emoji direto. Autocompressão ativa.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Código SKU</label><input name="sku" defaultValue={editingProduct?.sku || ''} required placeholder="EX: HORT-001" className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none uppercase font-black text-slate-700 transition-colors" /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Nome do Produto</label><input name="name" defaultValue={editingProduct?.name || ''} required placeholder="Ex: Tomate Orgânico Cereja" className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-800 transition-colors" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Categoria</label>
                    <input name="category" list="categories-list" defaultValue={editingProduct?.category || ''} required placeholder="Ex: Carnes & Aves" className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-colors" />
                    <datalist id="categories-list">
                      {activeCategories.filter(c => c !== 'Todos').map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Preço Original (R$)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required placeholder="0.00" className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-black text-emerald-700 transition-colors" /></div>
                    
                    {/* --- NOVO: CAMPO DE PREÇO PROMOCIONAL --- */}
                    <div><label className="block text-xs font-black text-emerald-600 mb-2 uppercase tracking-widest">Preço Promo (R$)</label><input name="promotionalPrice" type="number" step="0.01" defaultValue={editingProduct?.promotionalPrice || ''} placeholder="Opcional" className="w-full bg-emerald-50/50 border-2 border-emerald-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-black text-emerald-700 transition-colors placeholder-emerald-300" /></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Sobra (Local)</label><input name="stockLocal" type="number" min="0" defaultValue={editingProduct?.stockLocal || 0} required className="w-full bg-orange-50/50 border-2 border-orange-100 rounded-xl p-3 focus:border-orange-500 focus:bg-white outline-none font-black text-orange-700 transition-colors" /></div>
                    <div><label className="block text-xs font-black text-blue-600 mb-2 uppercase tracking-widest">Cx. Fornecedor</label><input name="minOrderQuantity" type="number" min="1" defaultValue={editingProduct?.minOrderQuantity || 1} required placeholder="Ex: 20" className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-xl p-3 focus:border-blue-500 focus:bg-white outline-none font-black text-blue-700 transition-colors" /></div>
                  </div>
                </div>
                <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Descrição</label><textarea name="description" defaultValue={editingProduct?.description || ''} placeholder="Destaque as qualidades do produto..." className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-4 focus:border-emerald-500 focus:bg-white outline-none font-medium text-gray-600 transition-colors" rows="2"></textarea></div>
                <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-gray-100">
                  {editingProduct && <button type="button" onClick={() => {setEditingProduct(null); setImagePreview('');}} className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-500 font-black rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-colors">Cancelar Edição</button>}
                  <button type="submit" className="px-10 py-4 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-800 shadow-lg shadow-emerald-700/30 transition-all hover:-translate-y-1">Guardar na Base de Dados</button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-gray-100 font-black text-slate-800 text-lg tracking-tight flex justify-between items-center">
                Inventário Ativo <span className="bg-white text-emerald-700 border border-emerald-100 px-3 py-1 rounded-lg text-sm">{products.length} itens</span>
              </div>
              <div className="divide-y divide-gray-50">
                {products.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(p => {
                  const isImageUrl = p.image && p.image.length > 5;
                  const isPromo = p.promotionalPrice && p.promotionalPrice > 0 && p.promotionalPrice < p.price;

                  return (
                    <div key={p.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center">
                        <div className="w-14 h-14 bg-white rounded-xl border border-gray-100 flex items-center justify-center mr-5 overflow-hidden shadow-sm flex-shrink-0 relative">
                          {isPromo && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>}
                          {isImageUrl ? <img src={p.image} alt="" className="w-full h-full object-contain p-1"/> : <span className="text-2xl">{p.image}</span>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg mb-0.5">{p.name}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <span>Cx: <span className="text-gray-600">{p.minOrderQuantity}</span></span> • 
                            <span>Local: <span className="text-orange-500">{p.stockLocal}</span></span> • 
                            <span className="text-emerald-600">R$ {isPromo ? p.promotionalPrice.toFixed(2) : (p.price || 0).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingProduct(p)} className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors shadow-sm"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrintView = () => {
    const myPoloOrders = orders.filter(o => o.polo === user?.polo && o.status === 'pago').sort((a, b) => (a.customer || '').localeCompare(b.customer || ''));
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
        <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentScreen('dashboard_rep')} className="flex items-center text-gray-500 hover:text-gray-800 font-bold px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ArrowLeft className="w-5 h-5 mr-2" /> Voltar</button>
          <button onClick={() => window.print()} className="flex items-center bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-800 shadow-lg transition"><Printer className="w-5 h-5 mr-2" /> Imprimir Documento</button>
        </div>
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-16 shadow-xl rounded-[2rem] print:shadow-none print:rounded-none print:p-0">
          <div className="text-center border-b-4 border-slate-800 pb-8 mb-10">
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Manifesto de Separação</h1>
            <p className="text-xl text-emerald-700 font-bold mt-2">Unidade Logística: {user?.polo || 'Sede'}</p>
          </div>
          <div className="space-y-10">
            {myPoloOrders.length === 0 ? (<p className="text-center text-gray-400 font-medium">Não há romaneios abertos para esta unidade.</p>) : (
              myPoloOrders.map(order => (
                <div key={order.id} className="break-inside-avoid border-2 border-gray-100 rounded-2xl p-8 bg-slate-50/30 relative">
                  <div className="absolute top-0 right-8 bg-slate-800 text-white px-4 py-1 rounded-b-lg font-black text-sm">#{(order.id || '').slice(0,5)}</div>
                  <div className="flex justify-between items-start border-b-2 border-gray-200 pb-5 mb-5">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">{order.customer}</h2>
                      {order.whatsapp && <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center">Contato: {order.whatsapp}</p>}
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead><tr className="text-xs uppercase font-black text-gray-400 border-b border-gray-200"><th className="pb-3 w-20">Volume</th><th className="pb-3">Descrição do Produto</th><th className="pb-3 text-right">Check</th></tr></thead>
                    <tbody>
                      {(order.items || []).map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0"><td className="py-4 font-black text-2xl text-slate-800">{item.qtd}x</td><td className="py-4 text-gray-700 font-bold text-lg">{item.name || 'Produto'}</td><td className="py-4 text-right"><div className="w-8 h-8 border-4 border-gray-300 rounded-lg inline-block"></div></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminPrintView = () => {
    const paidOrders = orders.filter(o => o.status === 'pago');
    const itemsByPolo = {};
    paidOrders.forEach(order => {
      if (!itemsByPolo[order.polo]) itemsByPolo[order.polo] = {};
      (order.items || []).forEach(item => {
        if (!itemsByPolo[order.polo][item.id]) itemsByPolo[order.polo][item.id] = { ...products.find(p => p.id === item.id) || item, totalQtd: 0 };
        itemsByPolo[order.polo][item.id].totalQtd += item.qtd;
      });
    });

    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
        <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentScreen('dashboard_admin')} className="flex items-center text-gray-500 hover:text-gray-800 font-bold px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ArrowLeft className="w-5 h-5 mr-2" /> Voltar</button>
          <button onClick={() => window.print()} className="flex items-center bg-slate-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-900 shadow-lg transition"><Printer className="w-5 h-5 mr-2" /> Imprimir Despacho Master</button>
        </div>
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-16 shadow-xl rounded-[2rem] print:shadow-none print:rounded-none print:p-0">
          <div className="text-center border-b-4 border-emerald-700 pb-8 mb-10"><h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Carga e Despacho</h1><p className="text-gray-500 font-bold mt-2">Relatório Consolidado Master</p></div>
          <div className="space-y-12">
            {Object.entries(itemsByPolo).map(([polo, items]) => (
              <div key={polo} className="break-inside-avoid border-4 border-slate-800 rounded-3xl p-8 relative mt-8 bg-white shadow-sm">
                <h2 className="absolute -top-6 left-8 px-6 text-2xl font-black tracking-tighter bg-emerald-700 text-white py-2 rounded-xl shadow-md">DESTINO: {polo}</h2>
                <table className="w-full text-left mt-6">
                  <thead><tr className="text-xs uppercase font-black text-gray-400 border-b-2 border-gray-100"><th className="pb-3 w-28">Volumes</th><th className="pb-3">Mercadoria</th><th className="pb-3">Ref/SKU</th><th className="pb-3 text-right">Status</th></tr></thead>
                  <tbody>
                    {Object.values(items).sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(item => (
                      <tr key={item.id} className="border-b border-gray-50 last:border-0"><td className="py-4 font-black text-3xl text-emerald-700">{item.totalQtd}</td><td className="py-4 text-gray-800 font-bold text-xl">{item.name || 'Produto'}</td><td className="py-4 text-gray-400 font-black text-xs uppercase tracking-widest">{item.sku || 'N/A'}</td><td className="py-4 text-right"><div className="w-8 h-8 border-4 border-gray-300 rounded-xl inline-block"></div></td></tr>
                    ))}
                  </tbody>
                </table>
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
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3.5 rounded-2xl shadow-xl font-black text-white transition-all flex items-center tracking-wide ${toast.type === 'error' ? 'bg-red-500 shadow-red-500/30' : 'bg-slate-800 shadow-slate-800/30'}`}>
          {toast.type === 'error' ? <span className="mr-3 text-xl">⚠️</span> : <CheckCircle className="w-5 h-5 mr-3 text-emerald-400" />}
          {toast.msg}
        </div>
      )}

      {currentScreen !== 'login' && currentScreen !== 'print_rep' && currentScreen !== 'print_admin' && (
        <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {
                if (user?.role === 'consolidador') setCurrentScreen('dashboard_admin');
                else if (user?.role === 'representante') setCurrentScreen('dashboard_rep');
                else setCurrentScreen('shop');
            }}>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                <Leaf className="text-emerald-700 w-6 h-6" />
              </div>
              <span className="font-black text-2xl text-slate-800 tracking-tighter hidden sm:block">Clube de Compras</span>
            </div>

            {/* --- MENU DE NAVEGAÇÃO SUPER USUÁRIO (GESTOR) --- */}
            {user?.role === 'consolidador' && (
              <nav className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl border border-gray-200">
                <button onClick={() => setCurrentScreen('shop')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'shop' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><Store className="w-4 h-4 mr-2"/> Comprar</button>
                <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'dashboard_rep' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><LayoutDashboard className="w-4 h-4 mr-2"/> Logística</button>
                <button onClick={() => setCurrentScreen('dashboard_admin')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'dashboard_admin' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><Package className="w-4 h-4 mr-2"/> Gestão</button>
              </nav>
            )}

            {/* --- MENU DE NAVEGAÇÃO PARA REPRESENTANTE --- */}
            {user?.role === 'representante' && (
              <nav className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl border border-gray-200">
                <button onClick={() => setCurrentScreen('shop')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'shop' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><Store className="w-4 h-4 mr-2"/> Comprar</button>
                <button onClick={() => setCurrentScreen('dashboard_rep')} className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${currentScreen === 'dashboard_rep' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}><LayoutDashboard className="w-4 h-4 mr-2"/> Minha Unidade</button>
              </nav>
            )}

            <div className="flex items-center space-x-4">
              {(!user?.role || user?.role?.toLowerCase() === 'cliente' || currentScreen === 'shop' || currentScreen === 'my_orders') && (
                <button onClick={() => setCurrentScreen(currentScreen === 'my_orders' ? 'shop' : 'my_orders')} className="hidden sm:flex text-xs bg-white text-emerald-700 border-2 border-emerald-100 px-4 py-2 rounded-xl font-black hover:bg-emerald-50 transition-colors shadow-sm">
                  {currentScreen === 'my_orders' ? 'Voltar à Loja' : 'Minhas Encomendas'}
                </button>
              )}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{user?.role === 'consolidador' ? 'Gestor Master' : user?.role}</span>
                <span className="text-sm font-black text-slate-800">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm border border-red-100" title="Sair">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </header>
      )}

      <main>
        {currentScreen === 'login' && renderLogin()}
        {currentScreen === 'shop' && renderShop()}
        {currentScreen === 'checkout' && renderCheckout()}
        {currentScreen === 'gateway_pix' && renderPixGateway()}
        {currentScreen === 'gateway_credit' && renderCreditGateway()}
        {currentScreen === 'my_orders' && renderMyOrders()}
        {currentScreen === 'dashboard_rep' && renderRepDashboard()}
        {currentScreen === 'print_rep' && renderPrintView()}
        {currentScreen === 'print_admin' && renderAdminPrintView()}
        {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
        {currentScreen === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
            <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mb-8 border-4 border-emerald-100">
               <CheckCircle className="w-16 h-16 text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">Tudo Certo!</h2>
            <p className="text-gray-500 font-medium mb-10 text-lg max-w-sm">O seu pedido foi registado na nossa base com segurança e a operação foi concluída.</p>
            <button onClick={() => setCurrentScreen((!user?.role || user?.role?.toLowerCase().includes('cliente')) ? 'my_orders' : 'dashboard_rep')} className="bg-emerald-700 text-white font-black py-4 px-10 rounded-2xl hover:bg-emerald-800 shadow-xl shadow-emerald-700/20 transition-all hover:-translate-y-1">Continuar</button>
          </div>
        )}
      </main>

      {/* --- MENU INFERIOR FIXO PARA O APLICATIVO (APP STYLE) --- */}
      {currentScreen !== 'login' && ['shop', 'my_orders', 'checkout'].includes(currentScreen) && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <button onClick={() => setCurrentScreen('shop')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen === 'shop' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500 transition-colors'}`}>
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Início</span>
          </button>
          
          {(!user?.role || user?.role?.toLowerCase().includes('cliente')) && (
            <button onClick={() => setCurrentScreen('my_orders')} className={`flex flex-col items-center justify-center w-full h-full ${currentScreen === 'my_orders' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500 transition-colors'}`}>
              <Package className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">Pedidos</span>
            </button>
          )}
          
          <button onClick={() => { if (cart.length > 0) setCurrentScreen('checkout'); else showToast('Seu carrinho está vazio!', 'error'); }} className={`flex flex-col items-center justify-center w-full h-full relative ${currentScreen === 'checkout' ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500 transition-colors'}`}>
            <ShoppingCart className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Carrinho</span>
            {cart.length > 0 && (
              <span className="absolute top-1 right-[25%] sm:right-[35%] md:right-[40%] bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cart.reduce((sum, i) => sum + (i.qtd || 0), 0)}
              </span>
            )}
          </button>

          {(user?.role === 'consolidador' || user?.role === 'representante') && (
            <button onClick={() => setCurrentScreen('dashboard_rep')} className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-emerald-500 transition-colors">
              <LayoutDashboard className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">Painel</span>
            </button>
          )}
        </div>
      )}

      {/* --- MODAL DE GESTÃO DE FALTAS / CRÉDITOS --- */}
      {missingItemsModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Registar Falta (Gerar Crédito)</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Pedido #{(missingItemsModal.order?.id || '').slice(0,5)} - {missingItemsModal.order?.customer}</p>

            <div className="space-y-3 mb-6">
              {(missingItemsModal.missingItems || []).map((item, idx) => {
                 const price = item.price || products.find(p => p.id === item.id)?.price || 0;
                 return (
                   <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-gray-100">
                      <div className="pr-4">
                        <p className="font-black text-sm text-slate-800 leading-tight mb-1">{item.name || 'Produto'}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Comprou: {item.qtd} • R$ {price.toFixed(2).replace('.', ',')}/un</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Faltou:</span>
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm">
                          <button onClick={() => {
                             const newArr = [...missingItemsModal.missingItems];
                             newArr[idx].removedQtd = Math.max(0, (newArr[idx].removedQtd || 0) - 1);
                             setMissingItemsModal({...missingItemsModal, missingItems: newArr});
                          }} className="w-8 h-8 flex items-center justify-center font-black text-red-600 hover:bg-red-50 rounded-l-xl">-</button>
                          <span className="w-6 text-center font-black text-slate-800">{item.removedQtd || 0}</span>
                          <button onClick={() => {
                             const newArr = [...missingItemsModal.missingItems];
                             newArr[idx].removedQtd = Math.min(item.qtd, (newArr[idx].removedQtd || 0) + 1);
                             setMissingItemsModal({...missingItemsModal, missingItems: newArr});
                          }} className="w-8 h-8 flex items-center justify-center font-black text-emerald-600 hover:bg-emerald-50 rounded-r-xl">+</button>
                        </div>
                      </div>
                   </div>
                 )
              })}
            </div>

            {(() => {
               const missingTotal = (missingItemsModal.missingItems || []).reduce((sum, i) => sum + ((i.price || products.find(p=>p.id === i.id)?.price || 0) * (i.removedQtd || 0)), 0);
               return (
                 <>
                   <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 mb-6">
                     <p className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-2">Crédito Automático para o Cliente:</p>
                     <p className="text-3xl font-black text-emerald-600 tracking-tighter mb-2">R$ {missingTotal.toFixed(2).replace('.', ',')}</p>
                     <p className="text-xs font-medium text-emerald-700">Este valor será adicionado à Carteira Digital do cliente. Ele poderá solicitar o estorno via PIX posteriormente.</p>
                   </div>
                   
                   <div className="flex gap-3">
                      <button onClick={() => setMissingItemsModal({open: false, order: null, missingItems: []})} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                      <button onClick={() => handleConfirmFaltas(missingTotal)} disabled={missingTotal === 0} className={`flex-[2] py-4 text-white font-black rounded-xl shadow-lg transition-all ${missingTotal === 0 ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 hover:-translate-y-1'}`}>Confirmar Falta</button>
                   </div>
                 </>
               )
            })()}
          </div>
        </div>
      )}

      {/* --- MODAL DE SOLICITAÇÃO DE PIX (CLIENTE) --- */}
      {pixRefundModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
             <h3 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Solicitar Estorno PIX</h3>
             <p className="text-sm text-gray-500 mb-6 font-medium">A nossa equipe financeira irá transferir <strong className="text-slate-800">R$ {(user?.walletBalance || 0).toFixed(2).replace('.', ',')}</strong> para a sua conta bancária.</p>
             <form onSubmit={requestPixRefund}>
               <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Sua Chave PIX</label>
               <input autoFocus required value={pixRefundModal.key} onChange={(e) => setPixRefundModal({...pixRefundModal, key: e.target.value})} placeholder="CPF, E-mail, Celular ou Aleatória" className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:border-emerald-500 outline-none mb-6 font-bold text-slate-700 bg-slate-50" />
               <div className="flex gap-3">
                  <button type="button" onClick={() => setPixRefundModal({ open: false, key: '' })} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-[2] py-4 bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all hover:bg-emerald-800 hover:-translate-y-1">Confirmar Pedido</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}