import React, { useState, useEffect } from 'react';
import { ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ChevronDown, ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, Download, Copy, Clock, MessageCircle, LayoutDashboard, Store, Eye, Wallet, Landmark } from 'lucide-react';

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
const categorias = ['Todos', 'Carnes & Aves', 'Peixes', 'Grãos & Cereais', 'Mercearia'];

// --- ATUALIZAÇÃO: CATÁLOGO BASEADO NA TABELA KORIN ---
const initialProducts = [
  { sku: '1423', category: 'Carnes & Aves', name: 'Coxa NGMO Cong Pct 1kg', description: 'Coxa de frango sem antibióticos.', price: 11.50, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: '1563', category: 'Carnes & Aves', name: 'Coxinha Asa NGMO Cong Pct 1kg', description: 'Coxinha da asa sem antibióticos.', price: 14.04, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: '1438', category: 'Carnes & Aves', name: 'Sobrecoxa NGMO Cong Pct 1kg', description: 'Sobrecoxa de frango sem transgênicos.', price: 22.27, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: '1420', category: 'Carnes & Aves', name: 'Pé NGMO Cong Pct 1kg', description: 'Pé de frango sem transgênicos.', price: 6.66, minOrderQuantity: 10, stockLocal: 0, image: '🍗' },
  { sku: '1441', category: 'Carnes & Aves', name: 'Pescoço NGMO Cong Pct 1kg', description: 'Pescoço de frango sem transgênicos.', price: 5.93, minOrderQuantity: 10, stockLocal: 0, image: '🍗' },
  { sku: '1414', category: 'Carnes & Aves', name: 'Fígado BP Cong BD 600g', description: 'Fígado de frango congelado.', price: 4.80, minOrderQuantity: 12, stockLocal: 0, image: '🥩' },
  { sku: '1407', category: 'Carnes & Aves', name: 'Filé Coxa c/Sbr s/Pé NGMO Cong BD 600g', description: 'Filé de coxa com sobrecoxa.', price: 21.65, minOrderQuantity: 12, stockLocal: 0, image: '🍗' },
  { sku: '1409', category: 'Carnes & Aves', name: 'Meio da Asa NGMO Cong BD 600g', description: 'Meio da asa de frango.', price: 12.05, minOrderQuantity: 12, stockLocal: 0, image: '🍗' },
  { sku: '1445', category: 'Carnes & Aves', name: 'Coxa c/Sbr s/Osso c/Pele NGMO BD 600g', description: 'Coxa e sobrecoxa desossada com pele.', price: 17.16, minOrderQuantity: 12, stockLocal: 0, image: '🍗' },
  { sku: '41013', category: 'Carnes & Aves', name: 'Hambúrguer Bovino Org Cong Pct 340g', description: 'Hambúrguer orgânico bovino de alta qualidade.', price: 34.44, minOrderQuantity: 12, stockLocal: 0, image: '🍔' },
  { sku: '41027', category: 'Carnes & Aves', name: 'Carne Moída de Frango NGMO Pct 400g', description: 'Carne moída de frango.', price: 15.42, minOrderQuantity: 15, stockLocal: 0, image: '🥩' },
  { sku: '1413', category: 'Carnes & Aves', name: 'Coração NGMO Cong BD 600g', description: 'Coração de frango.', price: 29.38, minOrderQuantity: 12, stockLocal: 0, image: '❤️' },
  { sku: '1408', category: 'Carnes & Aves', name: 'Filé Peito NGMO Cong BD 600g', description: 'Filé de peito de frango Korin.', price: 30.81, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: '41014', category: 'Carnes & Aves', name: 'Carne Moída Bovina Org Cong Pct 400g', description: 'Carne moída bovina orgânica.', price: 45.11, minOrderQuantity: 15, stockLocal: 0, image: '🥩' },
  { sku: '41116', category: 'Carnes & Aves', name: 'Hambúrguer Frango NGMO Cong 360g', description: 'Hambúrguer de frango.', price: 25.94, minOrderQuantity: 12, stockLocal: 0, image: '🍔' },
  { sku: '56004', category: 'Peixes', name: 'Filé de Truta Korin Cong Pct 500g', description: 'Filé de truta sustentável.', price: 73.45, minOrderQuantity: 10, stockLocal: 0, image: '🐟' },
  { sku: '56005', category: 'Peixes', name: 'Filé de Tilápia s/Pele Korin Cong 450g', description: 'Tilápia sustentável Korin.', price: 40.82, minOrderQuantity: 10, stockLocal: 0, image: '🐟' },
  { sku: '57501', category: 'Grãos & Cereais', name: 'Arroz Agulhinha Polido Org Vácuo 1kg', description: 'Arroz branco orgânico tipo 1.', price: 19.50, minOrderQuantity: 20, stockLocal: 0, image: '🍚' },
  { sku: '57503', category: 'Grãos & Cereais', name: 'Arroz Agulhinha Integral Org Vácuo 1kg', description: 'Arroz integral orgânico.', price: 18.85, minOrderQuantity: 20, stockLocal: 0, image: '🍚' },
  { sku: '58009', category: 'Grãos & Cereais', name: 'Feijão Carioca Org 500g', description: 'Feijão carioca 100% orgânico.', price: 13.65, minOrderQuantity: 20, stockLocal: 0, image: '🫘' },
  { sku: '58008', category: 'Grãos & Cereais', name: 'Feijão Preto Org 500g', description: 'Feijão preto orgânico.', price: 13.39, minOrderQuantity: 20, stockLocal: 0, image: '🫘' },
  { sku: '57010', category: 'Mercearia', name: 'Extrato de Própolis Verde Org 30ml', description: 'Própolis verde puro.', price: 23.14, minOrderQuantity: 12, stockLocal: 0, image: '🍯' },
  { sku: '57001', category: 'Mercearia', name: 'Mel Org Bisnaga 300g', description: 'Mel orgânico em bisnaga.', price: 25.09, minOrderQuantity: 12, stockLocal: 0, image: '🍯' },
  { sku: '57009', category: 'Mercearia', name: 'Mel Org Pt 1kg', description: 'Mel orgânico no pote.', price: 65.65, minOrderQuantity: 10, stockLocal: 0, image: '🍯' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // NOVO: Guarda o perfil de todos para o financeiro
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
  const [imagePreview, setImagePreview] = useState('');
  const [toast, setToast] = useState(null);

  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [selectedPolo, setSelectedPolo] = useState(polos[1]);

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

        // Buscar utilizadores para o painel financeiro do Gestor
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
      // Cria a estrutura com a carteira digital zerada
      const newUserProfile = { name: loginName, email: loginEmail, whatsapp: loginWhatsapp, polo: selectedPolo, role: registerRole, walletBalance: 0, pendingPixRefund: 0 };
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

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qtd), 0);

  const addToManualCart = (product) => {
    const existing = manualCart.find(item => item.id === product.id);
    if (existing) setManualCart(manualCart.map(item => item.id === product.id ? { ...item, qtd: item.qtd + 1 } : item));
    else setManualCart([...manualCart, { ...product, qtd: 1 }]);
  };

  const manualCartTotal = manualCart.reduce((sum, item) => sum + (item.price * item.qtd), 0);

  const confirmManualOrder = async (e) => {
    e.preventDefault();
    if(manualCart.length === 0) return showToast('Adicione produtos à encomenda!', 'error');
    
    try {
      const newOrderData = {
        customer: `${manualCustomerName} (Via Rep)`,
        email: manualCustomerEmail,
        whatsapp: manualCustomerWhatsapp,
        polo: user.polo,
        total: manualCartTotal,
        method: 'dinheiro/pix direto',
        status: 'pago',
        date: new Date().toISOString(),
        items: manualCart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd, price: item.price }))
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
        customer: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        polo: user.polo,
        total: finalTotal,
        method: finalTotal <= 0 ? 'saldo_carteira' : paymentMethod,
        status: finalTotal <= 0 ? 'pago' : 'aguardando_pagamento',
        walletDiscountApplied: walletDiscount,
        date: new Date().toISOString(),
        items: cart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd, price: item.price }))
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      const savedOrder = { id: orderRef.id, ...newOrderData };
      
      setOrders([...orders, savedOrder]);
      setCart([]);
      
      // Se a carteira pagou 100% do pedido, não precisa de banco
      if (finalTotal <= 0 && walletDiscount > 0) {
          const newWalletBalance = user.walletBalance - walletDiscount;
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
      
      // Abate o saldo da carteira apenas quando o banco confirma o valor restante
      if (pendingOrder.walletDiscountApplied > 0) {
         const newWalletBalance = user.walletBalance - pendingOrder.walletDiscountApplied;
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
    
    const newItems = missingItemsModal.missingItems.map(i => ({...i, qtd: i.qtd - i.removedQtd})).filter(i => i.qtd > 0);
    const newTotal = missingItemsModal.order.total - missingTotal;

    try {
        await updateDoc(doc(db, "orders", missingItemsModal.order.id), {
            items: newItems,
            total: Math.max(0, newTotal),
            refundStatus: 'credito_gerado',
            refundAmount: missingTotal
        });

        // Gera Crédito Automaticamente na Carteira Digital do Cliente
        const q = query(collection(db, "users"), where("email", "==", missingItemsModal.order.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const currentWallet = userDoc.data().walletBalance || 0;
            await updateDoc(doc(db, "users", userDoc.id), { walletBalance: currentWallet + missingTotal });
            
            // Atualiza localmente e na visão do Gestor
            setAllUsers(prev => prev.map(u => u.id === userDoc.id ? { ...u, walletBalance: currentWallet + missingTotal } : u));
            if (user.uid === userDoc.id) setUser({...user, walletBalance: currentWallet + missingTotal});
        } else {
            if (missingItemsModal.order.method === 'dinheiro/pix direto') {
                showToast("Nota: Para clientes avulsos sem conta, o crédito é simbólico. Registe manualmente.", "success");
            }
        }

        setOrders(orders.map(o => o.id === missingItemsModal.order.id ? { ...o, items: newItems, total: Math.max(0, newTotal), refundStatus: 'credito_gerado', refundAmount: missingTotal } : o));
        setMissingItemsModal({open: false, order: null, missingItems: []});
        showToast("Falta registada e crédito adicionado à carteira!", "success");
    } catch(e) {
        showToast("Erro ao processar falta e crédito.", "error");
    }
  }

  // --- SOLICITAR ESTORNO PIX (CLIENTE) ---
  const requestPixRefund = async () => {
    if (!user || user.walletBalance <= 0) return;
    try {
      const amountToRefund = user.walletBalance;
      const currentPending = user.pendingPixRefund || 0;
      
      await updateDoc(doc(db, "users", user.uid), {
        walletBalance: 0,
        pendingPixRefund: currentPending + amountToRefund
      });
      
      setUser({ ...user, walletBalance: 0, pendingPixRefund: currentPending + amountToRefund });
      setAllUsers(prev => prev.map(u => u.id === user.uid ? { ...u, walletBalance: 0, pendingPixRefund: currentPending + amountToRefund } : u));
      
      showToast("Solicitação de PIX enviada à equipa financeira!", "success");
    } catch(e) {
      showToast("Erro ao solicitar PIX", "error");
    }
  };

  // --- CONFIRMAR ESTORNO PIX (GESTOR) ---
  const confirmPixTransfer = async (userId) => {
    try {
       await updateDoc(doc(db, "users", userId), { pendingPixRefund: 0 });
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
    if (order.refundStatus === 'credito_gerado') refundInfo = `\n🎁 *Adicionamos R$ ${order.refundAmount.toFixed(2)} de CRÉDITO* na sua Carteira Digital por um item não entregue pelo fornecedor. Pode usá-lo na próxima compra ou solicitar o PIX no nosso aplicativo!`;

    const itemsList = order.items.map(i => `▫️ ${i.qtd}x ${i.name}`).join('\n');
    const total = `R$ ${order.total.toFixed(2).replace('.', ',')}`;
    const text = `Olá, ${order.customer}! 🌿\n\nAqui é do *Clube de Compras*.\nA sua encomenda (Nº ${order.id.slice(0,5)}) está confirmada!\n\n*Resumo da sua Cesta:*\n${itemsList}\n\n*Total:* ${total}\n*Polo de Retirada:* ${order.polo}${refundInfo}\n\nAvisaremos por aqui quando estiver pronta para recolha. Obrigado! 💚`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendCRMWhatsApp = (customer) => {
    if (!customer.whatsapp) {
      showToast('O cliente não tem WhatsApp registado.', 'error');
      return;
    }
    let phone = customer.whatsapp.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = '55' + phone;
    const text = `Olá, ${customer.name}! 🌿 Aqui é do Clube de Compras. Em que podemos ajudar hoje?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  // ------------------------------------------

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
    const sample = "1423,Carnes & Aves,Coxa NGMO Cong Pct 1kg,Coxa de frango.,11.50,15,5,🍗\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "modelo_catalogo.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Modelo descarregado!', 'success');
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Tabela "${file.name}" carregada! Em breve processaremos.`, 'success');
    e.target.value = null;
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
    const filteredProducts = shopCategory === 'Todos' ? products : products.filter(p => p.category === shopCategory);
    return (
      <div className="pb-24 pt-6 px-4 max-w-5xl mx-auto">
        <div className="bg-white border border-emerald-100 text-emerald-900 p-4 rounded-2xl mb-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center"><MapPin className="w-5 h-5 mr-3 text-emerald-600" /><span>Polo de Retirada: <strong className="font-black text-emerald-800">{user.polo}</strong></span></div>
        </div>
        
        <div className="flex overflow-x-auto space-x-3 mb-10 pb-2 scrollbar-hide">
          {categorias.map(cat => (
            <button key={cat} onClick={() => setShopCategory(cat)} className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${shopCategory === cat ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transform scale-105' : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700'}`}>
              {cat}
            </button>
          ))}
        </div>
        
        <div className="mb-6 flex justify-between items-end">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Seleção da Semana</h2>
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{filteredProducts.length} itens</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const cartItem = cart.find(c => c.id === product.id);
            const isImageUrl = product.image && product.image.length > 5; 
            return (
              <div key={product.id} className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full overflow-hidden group">
                <div className="h-48 bg-gray-50 flex items-center justify-center relative overflow-hidden p-6">
                  {isImageUrl ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <span className="text-6xl drop-shadow-md transition-transform duration-500 group-hover:scale-110">{product.image}</span>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[9px] uppercase font-black text-emerald-800 px-2 py-1 rounded-full shadow-sm">{product.category}</span>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="font-bold text-gray-800 leading-snug mb-2 text-lg">{product.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-grow">{product.description}</p>
                  
                  <div className="flex items-end justify-between mt-auto mb-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Por Apenas</span>
                      <p className="text-2xl text-emerald-700 font-black tracking-tight">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>

                  {cartItem ? (
                     <div className="flex items-center justify-between w-full bg-emerald-50 border border-emerald-200 rounded-xl p-1.5 shadow-inner">
                       <button onClick={() => setCart(cart.map(i => i.id === product.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-800 font-black hover:bg-emerald-100 transition">-</button>
                       <span className="font-black text-emerald-800 text-lg w-10 text-center">{cartItem.qtd}</span>
                       <button onClick={() => addToCart(product)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-700 font-black hover:bg-emerald-100 transition">+</button>
                     </div>
                  ) : (
                    <button onClick={() => addToCart(product)} className="w-full bg-white text-emerald-700 py-3.5 rounded-xl font-bold hover:bg-emerald-700 hover:text-white transition-colors border-2 border-emerald-100 flex items-center justify-center gap-2">
                      Adicionar <Plus className="w-4 h-4" />
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
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-gray-700 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-emerald-700 border border-gray-100">{item.qtd}x</div>
                  <span className="font-bold">{item.name}</span>
                </div>
                <span className="font-bold text-gray-500">R$ {(item.price * item.qtd).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-5 mt-6">
            <div className="flex justify-between text-gray-600 mb-3 font-medium"><span>Subtotal dos Produtos</span><span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span></div>
            {hasFee && (
              <div className="flex justify-between text-orange-600 mb-3 text-sm font-bold"><span>Taxa de Cartão (5%)</span><span>+ R$ {feeAmount.toFixed(2).replace('.', ',')}</span></div>
            )}
            
            {walletDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 mb-3 text-sm font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <span className="flex items-center"><Wallet className="w-4 h-4 mr-2"/> Saldo da Carteira Aplicado</span>
                <span>- R$ {walletDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
              <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total a Pagar</span>
              <span className="font-black text-3xl text-emerald-700 tracking-tighter">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
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
          {isProcessingPayment ? <span className="animate-pulse flex items-center">A processar o seu pedido...</span> : finalTotal <= 0 ? 'Pagar Usando Saldo' : `Gerar Pagamento Seguro`}
        </button>
      </div>
    );
  };

  const renderPixGateway = () => {
    if (!pendingOrder) return null;
    const pixCode = `00020126580014br.gov.bcb.pix0136${pendingOrder.id}-teste-simulado-sjc5204000053039865405${pendingOrder.total.toFixed(2)}5802BR5913MARCELO SILVA6009SAO PAULO62070503***6304${pendingOrder.id.slice(0,4)}6804A92B`;
    
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
    const myOrders = orders.filter(o => o.customer === user.name && o.email === user.email);
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
                <p className="text-sm font-medium text-emerald-700">Adicionamos <strong>R$ {user.walletBalance.toFixed(2).replace('.', ',')} de crédito</strong> na sua Carteira para abater automaticamente na próxima compra!</p>
              </div>
            </div>
            <button onClick={requestPixRefund} className="whitespace-nowrap w-full md:w-auto bg-white text-emerald-700 border-2 border-emerald-200 px-6 py-3 rounded-xl font-black hover:bg-emerald-100 transition-all shadow-sm">
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
              <p className="text-sm font-medium text-orange-700">O nosso setor financeiro fará a transferência de <strong>R$ {user.pendingPixRefund.toFixed(2).replace('.', ',')}</strong> para a chave (Telemóvel: {user.whatsapp}) em breve.</p>
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
                    <p className="font-bold text-gray-400 text-xs tracking-widest uppercase mb-1">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
                    <p className="font-black text-gray-800 text-lg">Pedido <span className="text-emerald-700">#{order.id.slice(0, 5)}</span></p>
                  </div>
                  
                  {order.status === 'aguardando_pagamento' ? (
                     <span className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm flex items-center"> <Clock className="w-3 h-3 mr-1 animate-spin"/> A Aguardar PIX </span>
                  ) : (
                     <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm flex items-center"> <CheckCircle className="w-3 h-3 mr-1"/> Confirmado </span>
                  )}
                  
                </div>
                
                <div className="space-y-3 mb-6">
                  {order.items.map((item, idx) => (<div key={idx} className="flex items-center text-sm text-gray-600"><span className="w-8 h-8 bg-gray-50 text-emerald-700 font-black rounded-lg flex items-center justify-center mr-3 border border-gray-100">{item.qtd}x</span> <span className="font-medium">{item.name}</span></div>))}
                </div>
                <div className="flex justify-between items-end bg-slate-50 p-4 rounded-xl">
                  <div>
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Total a Pagar</span>
                     <span className="font-black text-2xl text-emerald-800">R$ {order.total.toFixed(2).replace('.', ',')}</span>
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
    const myPoloOrders = orders.filter(o => o.polo === user.polo && o.status === 'pago');
    const appOrders = myPoloOrders.filter(o => o.method !== 'dinheiro/pix direto');
    const manualOrders = myPoloOrders.filter(o => o.method === 'dinheiro/pix direto');
    const sumTotal = (arr) => arr.reduce((sum, o) => sum + o.total, 0);

    const ordersByMonth = myPoloOrders.reduce((acc, order) => {
      const d = order.date ? new Date(order.date) : new Date();
      const monthYear = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!acc[capitalizedMonth]) acc[capitalizedMonth] = { orders: [], total: 0, count: 0 };
      acc[capitalizedMonth].orders.push(order);
      acc[capitalizedMonth].total += order.total;
      acc[capitalizedMonth].count += 1;
      return acc;
    }, {});

    const toggleMonth = (month) => setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));

    return (
      <div className="p-4 max-w-4xl mx-auto pt-8 pb-24">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Painel Representante</h2>
          <p className="text-emerald-700 font-bold mt-1">Gestão da unidade de <strong>{user.polo}</strong></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Pelo App (Confirmados)</span>
            <span className="text-4xl font-black text-gray-800 tracking-tighter">{appOrders.length} <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">pedidos</span></span>
            <span className="text-sm text-emerald-600 font-black mt-2 bg-emerald-50 self-start px-2 py-1 rounded-md">R$ {sumTotal(appOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Seus Lançamentos</span>
            <span className="text-4xl font-black text-gray-800 tracking-tighter">{manualOrders.length} <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">pedidos</span></span>
            <span className="text-sm text-orange-600 font-black mt-2 bg-orange-50 self-start px-2 py-1 rounded-md">R$ {sumTotal(manualOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-emerald-800 p-6 rounded-[2rem] shadow-lg shadow-emerald-800/20 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-5 rounded-full"></div>
            <span className="text-xs text-emerald-200 font-bold uppercase tracking-widest mb-2">Volume da Unidade</span>
            <span className="text-5xl font-black tracking-tighter">{myPoloOrders.length}</span>
            <span className="text-lg font-black text-emerald-300 mt-2">R$ {sumTotal(myPoloOrders).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <button onClick={() => setIsManualOrderModalOpen(true)} className="flex-1 bg-white text-emerald-700 border-2 border-emerald-100 font-black py-4 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm"><Plus className="w-5 h-5 mr-2" /> Novo Pedido Avulso</button>
          <button onClick={() => setCurrentScreen('print_rep')} className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"><Printer className="w-5 h-5 mr-2" /> Gerar Lista de Separação</button>
        </div>

        <h3 className="font-black text-emerald-800 mb-5 uppercase tracking-widest text-sm pl-2 flex items-center"><ClipboardList className="w-4 h-4 mr-2"/> Histórico Mensal</h3>
        <div className="space-y-4">
          {Object.entries(ordersByMonth).length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-white rounded-[2rem] border border-gray-100">Nenhum pedido processado ainda.</p>
          ) : (
            Object.entries(ordersByMonth).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([month, data]) => {
              const isExpanded = expandedMonths[month] !== false; 
              return (
                <div key={month} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden transition-all">
                  <button onClick={() => toggleMonth(month)} className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-gray-50">
                    <div className="text-left"><p className="font-black text-gray-800 capitalize text-lg">{month}</p><p className="text-sm text-gray-500 font-medium mt-1"><span className="text-emerald-700 font-bold">{data.count}</span> pedidos • R$ {data.total.toFixed(2).replace('.', ',')}</p></div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">{isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}</div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-50 p-2">
                      {data.orders.slice().reverse().map(order => (
                        <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 rounded-xl transition-colors m-2 border border-transparent hover:border-gray-100">
                          <div>
                            <p className="font-black text-gray-800 text-lg mb-1">{order.customer}</p>
                            <p className="text-xs text-gray-500 mb-2 font-medium">#{order.id.slice(0,5)}... • <span className="font-bold text-gray-700">R$ {order.total.toFixed(2).replace('.', ',')}</span></p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {order.items.map((item, idx) => (<span key={idx} className="bg-white text-gray-600 text-[10px] px-2.5 py-1 rounded-md border border-gray-200 uppercase font-bold shadow-sm">{item.qtd}x {item.name.split(' ')[0]}</span>))}
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${order.method === 'dinheiro/pix direto' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {order.method === 'dinheiro/pix direto' ? 'S/ CAIXA' : 'APP'}
                            </span>
                            
                            <div className="flex gap-2">
                                {order.refundStatus === 'credito_gerado' && <span className="flex items-center justify-center text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">Crédito Gerado</span>}
                                
                                {(!order.refundStatus || order.refundStatus === '') && order.status === 'pago' && (
                                   <button onClick={() => setMissingItemsModal({open: true, order, missingItems: order.items.map(i=>({...i, removedQtd:0}))})} className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200 transition-colors shadow-sm">
                                      Faltas
                                   </button>
                                )}
                                
                                <button onClick={() => handleSendWhatsApp(order)} className="flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm">
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              <h3 className="text-2xl font-black text-gray-800 mb-6 tracking-tight">Pedido Rápido</h3>
              <form onSubmit={confirmManualOrder}>
                <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Já é cliente?</label>
                  <select className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white focus:border-emerald-500 outline-none mb-4 font-medium transition-colors cursor-pointer"
                    onChange={(e) => {
                      const c = customers.find(x => x.id === e.target.value);
                      if (c) { setManualCustomerName(c.name); setManualCustomerEmail(c.email); setManualCustomerWhatsapp(c.whatsapp); }
                    }}>
                    <option value="">Não (Cadastrar Novo)</option>
                    {customers.filter(c => c.polo === user.polo).map(c => (<option key={c.id} value={c.id}>{c.name} - {c.whatsapp}</option>))}
                  </select>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest mt-2">Dados do Cliente</label>
                  <input required value={manualCustomerName} onChange={(e) => setManualCustomerName(e.target.value)} placeholder="Nome Completo" className="w-full border-b-2 border-gray-200 bg-white rounded-t-lg p-3 text-sm mb-3 focus:border-emerald-500 outline-none" />
                  <div className="flex gap-3 mb-2">
                    <input type="tel" value={manualCustomerWhatsapp} onChange={(e) => setManualCustomerWhatsapp(e.target.value)} placeholder="WhatsApp" className="w-full border-b-2 border-gray-200 bg-white rounded-t-lg p-3 text-sm focus:border-emerald-500 outline-none" />
                  </div>
                </div>
                
                <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Adicionar Produtos</label>
                <div className="space-y-2 mb-6 max-h-56 overflow-y-auto border border-gray-100 rounded-2xl p-2 bg-slate-50/50">
                  {products.map(p => {
                    const mItem = manualCart.find(i => i.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3"><span className="text-2xl">{p.image && p.image.length < 5 ? p.image : '📦'}</span><span className="text-sm font-bold text-gray-700">{p.name}</span></div>
                        {mItem ? (
                           <div className="flex items-center space-x-2 bg-emerald-50 rounded-lg border border-emerald-100 p-1 shadow-inner">
                             <button type="button" onClick={() => setManualCart(manualCart.map(i => i.id === p.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-7 h-7 flex items-center justify-center font-black text-emerald-800 hover:bg-white rounded-md transition-colors">-</button>
                             <span className="text-sm font-black w-4 text-center text-emerald-800">{mItem.qtd}</span>
                             <button type="button" onClick={() => addToManualCart(p)} className="w-7 h-7 flex items-center justify-center font-black text-emerald-800 hover:bg-white rounded-md transition-colors">+</button>
                           </div>
                        ) : (<button type="button" onClick={() => addToManualCart(p)} className="text-xs bg-white text-emerald-700 border-2 border-emerald-100 px-4 py-2 rounded-lg font-black hover:bg-emerald-50 transition-colors">ADD</button>)}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-between items-end bg-slate-800 text-white p-5 rounded-2xl mb-6 shadow-lg">
                  <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">Total da Compra</span>
                  <span className="text-3xl font-black tracking-tighter">R$ {manualCartTotal.toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="flex space-x-3">
                  <button type="button" onClick={() => {setIsManualOrderModalOpen(false); setManualCart([]); setManualCustomerName('');}} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-1">Gravar</button>
                </div>
              </form>
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
      order.items.forEach(item => {
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
          csvContent += `${prod.sku || ''},${prod.name},${totalVendidos},${estoqueLocalAtual},${caixasParaComprar},${moq},${caixasParaComprar * moq}\n`;
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
          {/* NOVO BOTÃO FINANCEIRO */}
          <button onClick={() => setAdminTab('financeiro')} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${adminTab === 'financeiro' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400 hover:text-emerald-700 hover:bg-emerald-50'}`}>Financeiro & Reembolsos</button>
        </div>

        {adminTab === 'financeiro' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-emerald-700 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Wallet className="w-40 h-40"/></div>
                  <p className="text-emerald-200 font-black uppercase tracking-widest text-xs mb-2">Crédito Total nas Carteiras (Retido)</p>
                  <p className="text-5xl font-black tracking-tighter">R$ {allUsers.reduce((sum, u) => sum + (u.walletBalance || 0), 0).toFixed(2).replace('.', ',')}</p>
               </div>
               <div className="bg-orange-500 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Landmark className="w-40 h-40"/></div>
                  <p className="text-orange-200 font-black uppercase tracking-widest text-xs mb-2">Total a Devolver via PIX (Estornos)</p>
                  <p className="text-5xl font-black tracking-tighter">R$ {allUsers.reduce((sum, u) => sum + (u.pendingPixRefund || 0), 0).toFixed(2).replace('.', ',')}</p>
               </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-gray-100 font-black text-slate-800 text-lg tracking-tight">Solicitações de Estorno (PIX)</div>
              <div className="divide-y divide-gray-50">
                {allUsers.filter(u => u.pendingPixRefund > 0).length === 0 ? (
                  <p className="p-10 text-center text-gray-400 font-medium">Nenhuma solicitação de estorno pendente neste momento.</p>
                ) : (
                  allUsers.filter(u => u.pendingPixRefund > 0).map(u => (
                    <div key={u.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                       <div>
                          <p className="font-black text-slate-800 text-xl mb-1">{u.name}</p>
                          <p className="text-sm font-medium text-gray-500">Chave Telefone/WhatsApp: <strong className="text-slate-700">{u.whatsapp}</strong></p>
                          <p className="text-xs text-gray-400 mt-1">Email: {u.email}</p>
                       </div>
                       <div className="flex flex-col sm:flex-row items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Valor a Transferir</p>
                            <p className="text-2xl font-black text-orange-800">R$ {u.pendingPixRefund.toFixed(2).replace('.', ',')}</p>
                          </div>
                          <button onClick={() => confirmPixTransfer(u.id)} className="bg-orange-600 text-white font-black px-6 py-3 rounded-xl hover:bg-orange-700 transition shadow-md w-full sm:w-auto">Confirmar Envio</button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'pedidos' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 p-6 font-bold text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-4 border-emerald-600">
              <span className="flex items-center text-xl font-black tracking-tight"><Package className="w-6 h-6 mr-3 text-emerald-400" /> Inteligência de Stock</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-slate-900/50 px-4 py-2 rounded-xl text-sm text-emerald-400 font-black border border-slate-700">Faturação Paga: R$ {paidOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2).replace('.', ',')}</span>
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
                      
                      {/* --- FIX MOBILE OVERFLOW AQUI: DE FLEX PARA GRID --- */}
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
                <p className="text-sm font-medium text-emerald-700/80 mb-4 max-w-md">Atualize todos os preços e SKUs de uma vez fazendo o upload da folha de cálculo mensal.</p>
                <button onClick={downloadCSVTemplate} className="text-xs font-black text-emerald-700 uppercase tracking-widest hover:text-emerald-900 flex items-center bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm"><Download className="w-4 h-4 mr-2" /> Baixar Modelo Padrão</button>
              </div>
              <label className="cursor-pointer bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl hover:bg-emerald-800 transition-all flex items-center shadow-lg shadow-emerald-700/30 hover:-translate-y-1 transform whitespace-nowrap">
                <Upload className="w-5 h-5 mr-3" /><span>Fazer Upload CSV</span><input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
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
                    <select name="category" defaultValue={editingProduct?.category || categorias[1]} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-colors cursor-pointer">
                      {categorias.filter(c => c !== 'Todos').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Preço (R$)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required placeholder="0.00" className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl p-3 focus:border-emerald-500 focus:bg-white outline-none font-black text-emerald-700 transition-colors" /></div>
                    <div><label className="block text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Sobra (Local)</label><input name="stockLocal" type="number" min="0" defaultValue={editingProduct?.stockLocal || 0} required className="w-full bg-orange-50/50 border-2 border-orange-100 rounded-xl p-3 focus:border-orange-500 focus:bg-white outline-none font-black text-orange-700 transition-colors" /></div>
                  </div>
                  <div><label className="block text-xs font-black text-blue-600 mb-2 uppercase tracking-widest">Caixa do Fornecedor (Un)</label><input name="minOrderQuantity" type="number" min="1" defaultValue={editingProduct?.minOrderQuantity || 1} required placeholder="Ex: 20" className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-xl p-3 focus:border-blue-500 focus:bg-white outline-none font-black text-blue-700 transition-colors" /></div>
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
                  return (
                    <div key={p.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center">
                        <div className="w-14 h-14 bg-white rounded-xl border border-gray-100 flex items-center justify-center mr-5 overflow-hidden shadow-sm flex-shrink-0">
                          {isImageUrl ? <img src={p.image} alt="" className="w-full h-full object-contain p-1"/> : <span className="text-2xl">{p.image}</span>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg mb-0.5">{p.name}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <span>Cx: <span className="text-gray-600">{p.minOrderQuantity}</span></span> • 
                            <span>Local: <span className="text-orange-500">{p.stockLocal}</span></span> • 
                            <span className="text-emerald-600">R$ {p.price.toFixed(2)}</span>
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
    const myPoloOrders = orders.filter(o => o.polo === user.polo && o.status === 'pago').sort((a, b) => a.customer.localeCompare(b.customer));
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
        <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentScreen('dashboard_rep')} className="flex items-center text-gray-500 hover:text-gray-800 font-bold px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ArrowLeft className="w-5 h-5 mr-2" /> Voltar</button>
          <button onClick={() => window.print()} className="flex items-center bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-800 shadow-lg transition"><Printer className="w-5 h-5 mr-2" /> Imprimir Documento</button>
        </div>
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-16 shadow-xl rounded-[2rem] print:shadow-none print:rounded-none print:p-0">
          <div className="text-center border-b-4 border-slate-800 pb-8 mb-10">
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Manifesto de Separação</h1>
            <p className="text-xl text-emerald-700 font-bold mt-2">Unidade Logística: {user.polo}</p>
          </div>
          <div className="space-y-10">
            {myPoloOrders.length === 0 ? (<p className="text-center text-gray-400 font-medium">Não há romaneios abertos para esta unidade.</p>) : (
              myPoloOrders.map(order => (
                <div key={order.id} className="break-inside-avoid border-2 border-gray-100 rounded-2xl p-8 bg-slate-50/30 relative">
                  <div className="absolute top-0 right-8 bg-slate-800 text-white px-4 py-1 rounded-b-lg font-black text-sm">#{order.id.slice(0,5)}</div>
                  <div className="flex justify-between items-start border-b-2 border-gray-200 pb-5 mb-5">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">{order.customer}</h2>
                      {order.whatsapp && <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center">Contato: {order.whatsapp}</p>}
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead><tr className="text-xs uppercase font-black text-gray-400 border-b border-gray-200"><th className="pb-3 w-20">Volume</th><th className="pb-3">Descrição do Produto</th><th className="pb-3 text-right">Check</th></tr></thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0"><td className="py-4 font-black text-2xl text-slate-800">{item.qtd}x</td><td className="py-4 text-gray-700 font-bold text-lg">{item.name}</td><td className="py-4 text-right"><div className="w-8 h-8 border-4 border-gray-300 rounded-lg inline-block"></div></td></tr>
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
      order.items.forEach(item => {
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
                      <tr key={item.id} className="border-b border-gray-50 last:border-0"><td className="py-4 font-black text-3xl text-emerald-700">{item.totalQtd}</td><td className="py-4 text-gray-800 font-bold text-xl">{item.name}</td><td className="py-4 text-gray-400 font-black text-xs uppercase tracking-widest">{item.sku}</td><td className="py-4 text-right"><div className="w-8 h-8 border-4 border-gray-300 rounded-xl inline-block"></div></td></tr>
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
                if (user.role === 'consolidador') setCurrentScreen('dashboard_admin');
                else if (user.role === 'representante') setCurrentScreen('dashboard_rep');
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
              {user?.role === 'cliente' && (
                <button onClick={() => setCurrentScreen(currentScreen === 'my_orders' ? 'shop' : 'my_orders')} className="text-xs bg-white text-emerald-700 border-2 border-emerald-100 px-4 py-2 rounded-xl font-black hover:bg-emerald-50 transition-colors shadow-sm">
                  {currentScreen === 'my_orders' ? 'Voltar à Loja' : 'Minhas Encomendas'}
                </button>
              )}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{user.role === 'consolidador' ? 'Gestor Master' : user.role}</span>
                <span className="text-sm font-black text-slate-800">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm border border-red-100" title="Sair">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
          
          {/* Menu Mobile para Gestor e Representante */}
          {(user?.role === 'consolidador' || user?.role === 'representante') && (
            <div className="md:hidden flex justify-around p-3 border-t bg-slate-50">
              <button onClick={() => setCurrentScreen('shop')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'shop' ? 'text-emerald-700' : 'text-gray-400'}`}><Store className="w-5 h-5"/> Loja</button>
              <button onClick={() => setCurrentScreen('dashboard_rep')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'dashboard_rep' ? 'text-emerald-700' : 'text-gray-400'}`}><LayoutDashboard className="w-5 h-5"/> {user.role === 'consolidador' ? 'Rep' : 'Unidade'}</button>
              {user.role === 'consolidador' && (
                <button onClick={() => setCurrentScreen('dashboard_admin')} className={`text-[10px] font-black uppercase flex flex-col items-center gap-1 ${currentScreen === 'dashboard_admin' ? 'text-emerald-700' : 'text-gray-400'}`}><Package className="w-5 h-5"/> Admin</button>
              )}
            </div>
          )}
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
            <button onClick={() => setCurrentScreen(user?.role === 'cliente' ? 'my_orders' : 'dashboard_rep')} className="bg-emerald-700 text-white font-black py-4 px-10 rounded-2xl hover:bg-emerald-800 shadow-xl shadow-emerald-700/20 transition-all hover:-translate-y-1">Continuar</button>
          </div>
        )}
      </main>

      {/* --- MODAL DE GESTÃO DE FALTAS / CRÉDITOS --- */}
      {missingItemsModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Registar Falta (Gerar Crédito)</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Pedido #{missingItemsModal.order.id.slice(0,5)} - {missingItemsModal.order.customer}</p>

            <div className="space-y-3 mb-6">
              {missingItemsModal.missingItems.map((item, idx) => {
                 const price = item.price || products.find(p => p.id === item.id)?.price || 0;
                 return (
                   <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-gray-100">
                      <div className="pr-4">
                        <p className="font-black text-sm text-slate-800 leading-tight mb-1">{item.name}</p>
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
               const missingTotal = missingItemsModal.missingItems.reduce((sum, i) => sum + ((i.price || products.find(p=>p.id === i.id)?.price || 0) * (i.removedQtd || 0)), 0);
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

      {/* Barra Inferior de Compras (Modo Loja para qualquer papel) */}
      {currentScreen === 'shop' && cart.length > 0 && (
        <div className="fixed bottom-0 w-full p-4 z-40 bg-white/80 backdrop-blur-md border-t border-gray-200">
          <button onClick={() => setCurrentScreen('checkout')} className="max-w-md mx-auto w-full bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-700/30 flex justify-between px-8 items-center hover:bg-emerald-800 hover:-translate-y-1 transition-all">
            <span className="flex items-center"><ShoppingCart className="w-5 h-5 mr-3"/> Finalizar Cesta</span>
            <span className="bg-white text-emerald-700 px-3 py-1 rounded-lg text-xs">{cart.reduce((sum, i) => sum + i.qtd, 0)} itens</span>
          </button>
        </div>
      )}
    </div>
  );
}