import React, { useState, useEffect } from 'react';
import { ShoppingCart, Leaf, User, MapPin, CheckCircle, ClipboardList, Package, Users, CreditCard, QrCode, Plus, Edit2, Trash2, ArrowLeft, ChevronDown, ChevronUp, Printer, Upload, FileSpreadsheet, Image as ImageIcon, Download } from 'lucide-react';

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

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

// --- INJEÇÃO DO TAILWIND ---
if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

// Dados iniciais (Usados apenas para semear o banco vazio pela primeira vez)
const polos = ['São José dos Campos (Sede)', 'Jacareí', 'Taubaté', 'Caraguatatuba'];
const categorias = ['Todos', 'Hortifruti', 'Carnes & Aves', 'Grãos & Cereais', 'Mercearia', 'Laticínios'];

const initialProducts = [
  { sku: 'HORT-001', category: 'Hortifruti', name: 'Tomate Orgânico (kg)', description: 'Tomates frescos colhidos no dia. Excelentes para saladas e molhos.', price: 8.50, minOrderQuantity: 20, stockLocal: 5, image: '🍅' },
  { sku: 'HORT-002', category: 'Hortifruti', name: 'Alface Crespa (un)', description: 'Maço grande de alface crespa hidropônica.', price: 3.00, minOrderQuantity: 30, stockLocal: 0, image: '🥬' },
  { sku: 'GRAO-001', category: 'Grãos & Cereais', name: 'Arroz Agulhinha (5kg)', description: 'Arroz branco tipo 1, safra nova.', price: 24.50, minOrderQuantity: 10, stockLocal: 2, image: '🍚' },
  { sku: 'CARN-001', category: 'Carnes & Aves', name: 'Peito de Frango (kg)', description: 'Peito de frango resfriado sem osso e sem pele.', price: 19.90, minOrderQuantity: 15, stockLocal: 0, image: '🍗' },
  { sku: 'CARN-002', category: 'Carnes & Aves', name: 'Coração de Frango (kg)', description: 'Coração de frango limpo e resfriado.', price: 22.50, minOrderQuantity: 10, stockLocal: 0, image: '❤️' },
  { sku: 'MERC-001', category: 'Mercearia', name: 'Mel Silvestre (500g)', description: 'Mel puro de abelhas silvestres da região.', price: 35.00, minOrderQuantity: 12, stockLocal: 1, image: '🍯' },
];

const initialCustomers = [
  { name: 'João Silva', email: 'joao@email.com', whatsapp: '(12) 99999-1111', polo: 'Jacareí' },
  { name: 'Dona Maria', email: 'maria@email.com', whatsapp: '(12) 99999-2222', polo: 'Jacareí' },
  { name: 'Carlos (Padaria)', email: 'carlos@email.com', whatsapp: '(12) 99999-3333', polo: 'São José dos Campos (Sede)' }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  
  // Estados agora começam vazios e são preenchidos pelo Firebase
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

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

  // --- EFEITO PARA CARREGAR DADOS DO FIREBASE ---
  useEffect(() => {
    const fetchFromFirebase = async () => {
      try {
        // 1. Carregar Produtos
        const prodSnapshot = await getDocs(collection(db, "products"));
        if (prodSnapshot.empty) {
          // Semeando o banco de dados vazio
          for (let p of initialProducts) await addDoc(collection(db, "products"), p);
          const newProds = await getDocs(collection(db, "products"));
          setProducts(newProds.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // 2. Carregar Clientes
        const custSnapshot = await getDocs(collection(db, "customers"));
        if (custSnapshot.empty) {
          for (let c of initialCustomers) await addDoc(collection(db, "customers"), c);
          const newCusts = await getDocs(collection(db, "customers"));
          setCustomers(newCusts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // 3. Carregar Pedidos
        const ordSnapshot = await getDocs(collection(db, "orders"));
        setOrders(ordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Erro ao conectar no Firebase:", error);
        showToast("Erro ao carregar dados da nuvem.", "error");
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

  // --- SALVANDO NO FIREBASE ---
  const confirmManualOrder = async (e) => {
    e.preventDefault();
    if(manualCart.length === 0) return showToast('Adicione produtos ao pedido!', 'error');
    
    try {
      const existingCustomer = customers.find(c => c.whatsapp === manualCustomerWhatsapp || c.email === manualCustomerEmail);
      if (!existingCustomer && (manualCustomerEmail || manualCustomerWhatsapp)) {
        const newCustData = { name: manualCustomerName, email: manualCustomerEmail, whatsapp: manualCustomerWhatsapp, polo: user.polo };
        const custRef = await addDoc(collection(db, "customers"), newCustData);
        setCustomers([...customers, { id: custRef.id, ...newCustData }]);
      }
      
      const newOrderData = {
        customer: `${manualCustomerName} (Via Rep)`,
        email: manualCustomerEmail,
        whatsapp: manualCustomerWhatsapp,
        polo: user.polo,
        total: manualCartTotal,
        method: 'dinheiro/pix direto',
        status: 'pago',
        date: new Date().toISOString(),
        items: manualCart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd }))
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      setOrders([...orders, { id: orderRef.id, ...newOrderData }]);
      
      setIsManualOrderModalOpen(false);
      setManualCustomerName(''); setManualCustomerEmail(''); setManualCustomerWhatsapp(''); setManualCart([]);
      showToast('Pedido salvo na nuvem!', 'success');
    } catch(err) {
      showToast('Erro ao salvar pedido.', 'error');
    }
  };

  const processGatewayPayment = async () => {
    setIsProcessingPayment(true);
    const hasFee = paymentMethod === 'credit' || paymentMethod === 'debit';
    const finalTotal = hasFee ? cartTotal * 1.05 : cartTotal;

    try {
      const existingCustomer = customers.find(c => c.email === user.email);
      if (!existingCustomer && user.email) {
        const newCustData = { name: user.name, email: user.email, whatsapp: user.whatsapp, polo: user.polo };
        const custRef = await addDoc(collection(db, "customers"), newCustData);
        setCustomers([...customers, { id: custRef.id, ...newCustData }]);
      }

      const newOrderData = {
        customer: user.name,
        email: user.email,
        whatsapp: user.whatsapp,
        polo: user.polo,
        total: finalTotal,
        method: paymentMethod,
        status: 'pago',
        date: new Date().toISOString(),
        items: cart.map(item => ({ id: item.id, name: item.name, qtd: item.qtd }))
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrderData);
      setOrders([...orders, { id: orderRef.id, ...newOrderData }]);
      setCart([]);
      setIsProcessingPayment(false);
      setCurrentScreen('success');
    } catch(err) {
      setIsProcessingPayment(false);
      showToast('Erro ao processar pagamento.', 'error');
    }
  };

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
      showToast('Produto sincronizado com a nuvem!', 'success');
    } catch(err) {
      showToast('Erro ao salvar produto.', 'error');
    }
  };

  const deleteProduct = async (id) => {
    if(window.confirm('Remover este produto do Firebase?')) {
      try {
        await deleteDoc(doc(db, "products", id));
        setProducts(products.filter(p => p.id !== id));
        showToast('Produto excluído da nuvem.', 'success');
      } catch(err) { showToast('Erro ao excluir.', 'error'); }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const downloadCSVTemplate = () => {
    const headers = "SKU,Categoria,Nome,Descricao,Preco,QtdMinimaFornecedor,EstoqueAtual,Imagem_URL_ou_Emoji\n";
    const sample = "HORT-001,Hortifruti,Tomate Orgânico (kg),Tomates frescos colhidos no dia.,8.50,20,5,🍅\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "modelo_catalogo.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Modelo CSV baixado com sucesso!', 'success');
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Tabela "${file.name}" carregada! Em breve processaremos no Firebase.`, 'success');
    e.target.value = null;
  };

  // --- RENDERIZAÇÕES DE TELA ---
  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-green-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <Leaf className="text-green-600 w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Clube de Compras</h1>
        <p className="text-gray-500 mb-6 text-sm">
          {isLoadingDB ? <span className="animate-pulse text-blue-500 font-bold">Conectando ao Firebase...</span> : 'Preencha seus dados para acessar'}
        </p>
        
        <div className="text-left mb-6 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Seu Nome</label>
            <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Ex: João Silva" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none" disabled={isLoadingDB}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">E-mail</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="seu@email.com" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none" disabled={isLoadingDB}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">WhatsApp</label>
            <input type="tel" value={loginWhatsapp} onChange={(e) => setLoginWhatsapp(e.target.value)} placeholder="(12) 99999-9999" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none" disabled={isLoadingDB}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Unidade (Polo)</label>
            <select value={selectedPolo} onChange={(e) => setSelectedPolo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none bg-white" disabled={isLoadingDB}>
              {polos.map(polo => <option key={polo} value={polo}>{polo}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={() => { if(!loginName || !loginEmail || !loginWhatsapp) return showToast('Preencha os campos!', 'error'); setUser({ name: loginName, email: loginEmail, whatsapp: loginWhatsapp, role: 'cliente', polo: selectedPolo }); setCurrentScreen('shop'); }} className="w-full flex items-center justify-center bg-green-100 text-green-700 font-bold py-3 rounded-xl hover:bg-green-200 transition" disabled={isLoadingDB}>
            <User className="mr-2 w-5 h-5" /> Entrar como Cliente
          </button>
          <button onClick={() => { if(!loginName) return showToast('Digite o nome!', 'error'); setUser({ name: loginName, role: 'representante', polo: selectedPolo }); setCurrentScreen('dashboard_rep'); }} className="w-full flex items-center justify-center bg-blue-100 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-200 transition" disabled={isLoadingDB}>
            <Users className="mr-2 w-5 h-5" /> Entrar como Representante
          </button>
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button onClick={() => { setUser({ name: 'Você (Gestor)', role: 'consolidador', polo: 'Todas as Cidades' }); setCurrentScreen('dashboard_admin'); }} className="w-full flex items-center justify-center bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition shadow-lg" disabled={isLoadingDB}>
              <Package className="mr-2 w-5 h-5" /> Entrar como Gestor Geral
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShop = () => {
    const filteredProducts = shopCategory === 'Todos' ? products : products.filter(p => p.category === shopCategory);
    return (
      <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto">
        <div className="bg-green-100 text-green-800 p-4 rounded-xl mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center"><MapPin className="w-5 h-5 mr-2" /><span>Retirada: <strong>{user.polo}</strong></span></div>
        </div>
        
        <div className="flex overflow-x-auto space-x-2 mb-6 pb-2 scrollbar-hide">
          {categorias.map(cat => (
            <button key={cat} onClick={() => setShopCategory(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${shopCategory === cat ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50'}`}>
              {cat}
            </button>
          ))}
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-4">Catálogo do Mês</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const cartItem = cart.find(c => c.id === product.id);
            const isImageUrl = product.image && product.image.length > 5; 
            return (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col h-full">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-lg border border-gray-100 flex flex-shrink-0 items-center justify-center overflow-hidden">
                    {isImageUrl ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-5xl">{product.image}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{product.category} • SKU: {product.sku}</p>
                    <h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                    <p className="text-xl text-green-600 font-black">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 flex-grow mb-4">{product.description}</p>
                {cartItem ? (
                   <div className="flex items-center justify-between w-full bg-green-50 border border-green-200 rounded-xl p-1">
                     <button onClick={() => setCart(cart.map(i => i.id === product.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 font-bold hover:bg-gray-50">-</button>
                     <span className="font-bold text-green-800 text-lg">{cartItem.qtd}</span>
                     <button onClick={() => addToCart(product)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-green-600 font-bold hover:bg-gray-50">+</button>
                   </div>
                ) : (
                  <button onClick={() => addToCart(product)} className="w-full bg-gray-50 text-gray-700 py-3 rounded-xl font-bold hover:bg-green-600 hover:text-white transition border border-gray-200">Adicionar à Cesta</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const renderCheckout = () => {
    const hasFee = paymentMethod === 'credit' || paymentMethod === 'debit';
    const feeAmount = hasFee ? cartTotal * 0.05 : 0;
    const finalTotal = cartTotal + feeAmount;

    return (
      <div className="p-4 max-w-xl mx-auto pb-24 pt-6">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('shop')} className="mr-4 flex items-center text-green-700 bg-green-100 px-3 py-2 rounded-xl font-bold hover:bg-green-200 transition text-sm shadow-sm"><Edit2 className="w-4 h-4 mr-2" /> Editar Cesta</button>
          <h2 className="text-2xl font-bold text-gray-800">Pagamento</h2>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">Resumo do Pedido</h3>
          {cart.map(item => (
            <div key={item.id} className="flex justify-between text-sm mb-2 text-gray-600">
              <span>{item.qtd}x {item.name}</span><span>R$ {(item.price * item.qtd).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex justify-between text-gray-600 mb-2 font-medium"><span>Subtotal</span><span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span></div>
            {hasFee ? (
              <div className="flex justify-between text-orange-500 mb-2 text-sm font-bold"><span>Taxa da Maquininha (5%)</span><span>+ R$ {feeAmount.toFixed(2).replace('.', ',')}</span></div>
            ) : (
              <div className="flex justify-between text-green-500 mb-2 text-sm font-bold bg-green-50 p-2 rounded-lg"><span>Desconto PIX</span><span>Aplicado! (Sem taxas)</span></div>
            )}
            <div className="flex justify-between font-black text-xl text-gray-800 border-t border-gray-100 pt-3 mt-2">
              <span>Total a Pagar</span><span className="text-green-600">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-gray-700 mb-3">Como deseja pagar?</h3>
        <div className="space-y-3 mb-8">
          <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'pix' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            <input type="radio" name="payment" value="pix" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} className="mr-4 w-5 h-5 text-green-600 focus:ring-green-500" />
            <QrCode className={`w-6 h-6 mr-3 ${paymentMethod === 'pix' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="flex-1"><p className="font-bold text-gray-800">PIX</p><p className="text-xs text-green-600 font-bold">Sem taxas extras (Sua melhor opção)</p></div>
          </label>
          <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'credit' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            <input type="radio" name="payment" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} className="mr-4 w-5 h-5 text-green-600 focus:ring-green-500" />
            <CreditCard className={`w-6 h-6 mr-3 ${paymentMethod === 'credit' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="flex-1"><p className="font-bold text-gray-800">Cartão de Crédito</p><p className="text-xs text-orange-500 font-medium">Possui taxa de 5%</p></div>
          </label>
        </div>

        <button onClick={processGatewayPayment} disabled={isProcessingPayment} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center transition ${isProcessingPayment ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}>
          {isProcessingPayment ? <span className="animate-pulse flex items-center">Processando no Banco...</span> : `Pagar R$ ${finalTotal.toFixed(2).replace('.', ',')}`}
        </button>
      </div>
    );
  };

  const renderMyOrders = () => {
    const myOrders = orders.filter(o => o.customer === user.name && o.email === user.email);
    return (
      <div className="p-4 max-w-4xl mx-auto pt-6 pb-24">
        <div className="flex items-center mb-6">
          <button onClick={() => setCurrentScreen('shop')} className="mr-4 flex items-center text-green-700 bg-green-100 px-3 py-2 rounded-xl font-bold hover:bg-green-200 transition text-sm shadow-sm"><ArrowLeft className="w-4 h-4 mr-1" /> Loja</button>
          <h2 className="text-2xl font-bold text-gray-800">Meus Pedidos</h2>
        </div>

        {myOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Você ainda não fez nenhum pedido.</p>
            <button onClick={() => setCurrentScreen('shop')} className="mt-4 bg-green-100 text-green-700 px-6 py-2 rounded-lg font-bold hover:bg-green-200 transition">Ir às Compras</button>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.slice().reverse().map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-3">
                  <div>
                    <p className="font-bold text-gray-800">Pedido #{order.id.slice(0, 5)}...</p>
                    <p className="text-xs text-gray-500 uppercase">{order.method}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"> Confirmado </span>
                </div>
                <div className="space-y-2 mb-3">
                  {order.items.map((item, idx) => (<div key={idx} className="flex justify-between text-sm text-gray-600"><span>{item.qtd}x {item.name}</span></div>))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="font-bold text-gray-600">Total</span><span className="font-black text-green-600">R$ {order.total.toFixed(2).replace('.', ',')}</span>
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
      <div className="p-4 max-w-4xl mx-auto pt-6 pb-24">
        <div className="mb-6"><h2 className="text-2xl font-bold text-gray-800">Acompanhamento de Pedidos</h2><p className="text-gray-500">Unidade: <strong className="text-blue-600">{user.polo}</strong></p></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden">
            <span className="text-xs text-gray-500 font-bold uppercase mb-1">Pelo Aplicativo</span>
            <span className="text-3xl font-black text-gray-800">{appOrders.length} <span className="text-sm font-medium text-gray-400">pedidos</span></span>
            <span className="text-sm text-green-600 font-bold mt-1">R$ {sumTotal(appOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden">
            <span className="text-xs text-gray-500 font-bold uppercase mb-1">Via Representante</span>
            <span className="text-3xl font-black text-gray-800">{manualOrders.length} <span className="text-sm font-medium text-gray-400">pedidos</span></span>
            <span className="text-sm text-orange-500 font-bold mt-1">R$ {sumTotal(manualOrders).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-blue-600 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
            <span className="text-xs text-blue-200 font-bold uppercase mb-1">Total da Unidade</span>
            <span className="text-4xl font-black">{myPoloOrders.length}</span>
            <span className="text-base font-bold text-white mt-1">R$ {sumTotal(myPoloOrders).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button onClick={() => setIsManualOrderModalOpen(true)} className="flex-1 bg-green-50 text-green-700 border border-green-200 font-bold py-4 rounded-xl flex items-center justify-center hover:bg-green-100 transition"><Plus className="w-5 h-5 mr-2" /> Lançar Pedido (WhatsApp)</button>
          <button onClick={() => setCurrentScreen('print_rep')} className="flex-1 bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center hover:bg-gray-900 transition shadow-lg"><Printer className="w-5 h-5 mr-2" /> Imprimir Separação (PDF)</button>
        </div>

        <h3 className="font-bold text-gray-700 mb-4 flex items-center"><ClipboardList className="w-5 h-5 mr-2 text-blue-500"/> Histórico por Mês</h3>
        <div className="space-y-4">
          {Object.entries(ordersByMonth).length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-white rounded-xl border border-gray-100">Nenhum pedido registrado.</p>
          ) : (
            Object.entries(ordersByMonth).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([month, data]) => {
              const isExpanded = expandedMonths[month] !== false; 
              return (
                <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button onClick={() => toggleMonth(month)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition border-b border-gray-100">
                    <div className="text-left"><p className="font-bold text-gray-800 capitalize">{month}</p><p className="text-xs text-gray-500 font-medium">{data.count} pedidos • R$ {data.total.toFixed(2).replace('.', ',')}</p></div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-50">
                      {data.orders.slice().reverse().map(order => (
                        <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="font-bold text-gray-800">{order.customer}</p>
                            <p className="text-xs text-gray-500 mb-1">Pedido #{order.id.slice(0,5)}... • R$ {order.total.toFixed(2).replace('.', ',')}</p>
                            {order.whatsapp && <p className="text-xs text-gray-400 mb-2">📱 {order.whatsapp} | ✉️ {order.email}</p>}
                            <div className="flex flex-wrap gap-1">
                              {order.items.map((item, idx) => (<span key={idx} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded border border-gray-200 uppercase font-bold">{item.qtd}x {item.name.split(' ')[0]}</span>))}
                            </div>
                          </div>
                          <div className="mt-3 md:mt-0 flex flex-col items-end">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold mb-2 ${order.method === 'dinheiro/pix direto' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                              {order.method === 'dinheiro/pix direto' ? 'PAGO AO REP' : 'PAGO NO APP'}
                            </span>
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

        {isManualOrderModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Novo Pedido via WhatsApp</h3>
              <form onSubmit={confirmManualOrder}>
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Buscar Cliente Cadastrado (Opcional)</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none mb-3"
                    onChange={(e) => {
                      const c = customers.find(x => x.id === e.target.value);
                      if (c) { setManualCustomerName(c.name); setManualCustomerEmail(c.email); setManualCustomerWhatsapp(c.whatsapp); }
                    }}>
                    <option value="">-- Selecionar da base (Novo Cliente) --</option>
                    {customers.filter(c => c.polo === user.polo).map(c => (<option key={c.id} value={c.id}>{c.name} - {c.whatsapp}</option>))}
                  </select>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nome da Cliente</label>
                  <input required value={manualCustomerName} onChange={(e) => setManualCustomerName(e.target.value)} placeholder="Ex: Dona Maria" className="w-full border border-gray-300 rounded p-2 text-sm mb-2" />
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1">WhatsApp</label><input type="tel" value={manualCustomerWhatsapp} onChange={(e) => setManualCustomerWhatsapp(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" /></div>
                    <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1">E-mail</label><input type="email" value={manualCustomerEmail} onChange={(e) => setManualCustomerEmail(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" /></div>
                  </div>
                </div>
                
                <label className="block text-sm font-bold text-gray-600 mb-2">Adicionar Produtos</label>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
                  {products.map(p => {
                    const mItem = manualCart.find(i => i.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center"><span className="text-2xl mr-2">{p.image}</span><span className="text-sm font-medium">{p.name}</span></div>
                        {mItem ? (
                           <div className="flex items-center space-x-2 bg-white rounded border px-2 py-1 shadow-sm">
                             <button type="button" onClick={() => setManualCart(manualCart.map(i => i.id === p.id ? {...i, qtd: Math.max(0, i.qtd - 1)} : i).filter(i => i.qtd > 0))} className="w-6 h-6 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-100 rounded">-</button>
                             <span className="text-sm font-bold w-4 text-center">{mItem.qtd}</span>
                             <button type="button" onClick={() => addToManualCart(p)} className="w-6 h-6 flex items-center justify-center font-bold text-green-600 hover:bg-green-50 rounded">+</button>
                           </div>
                        ) : (<button type="button" onClick={() => addToManualCart(p)} className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold hover:bg-green-200">Add</button>)}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-6">
                  <span className="font-bold text-gray-600">Total a cobrar:</span><span className="text-xl font-black text-green-600">R$ {manualCartTotal.toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="flex space-x-3">
                  <button type="button" onClick={() => {setIsManualOrderModalOpen(false); setManualCart([]); setManualCustomerName('');}} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg">Confirmar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrintView = () => {
    const myPoloOrders = orders.filter(o => o.polo === user.polo && o.status === 'pago').sort((a, b) => a.customer.localeCompare(b.customer));
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <button onClick={() => setCurrentScreen('dashboard_rep')} className="flex items-center text-gray-600 hover:text-gray-800 font-bold px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><ArrowLeft className="w-5 h-5 mr-2" /> Voltar</button>
          <button onClick={() => window.print()} className="flex items-center bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 shadow transition"><Printer className="w-5 h-5 mr-2" /> Imprimir Agora</button>
        </div>
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-0">
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Relatório de Separação</h1><p className="text-lg text-gray-600 mt-2">Unidade: <strong>{user.polo}</strong></p>
          </div>
          <div className="space-y-8">
            {myPoloOrders.length === 0 ? (<p className="text-center text-gray-500 italic">Não há pedidos para separar.</p>) : (
              myPoloOrders.map(order => (
                <div key={order.id} className="break-inside-avoid border border-gray-300 rounded-lg p-6">
                  <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                    <div><h2 className="text-xl font-bold text-gray-900">{order.customer}</h2>{order.whatsapp && <p className="text-sm text-gray-600">Contato: {order.whatsapp}</p>}</div>
                    <div className="text-right"><p className="text-sm font-bold text-gray-500">Pedido #{order.id.slice(0,5)}</p></div>
                  </div>
                  <table className="w-full text-left">
                    <thead><tr className="text-xs uppercase text-gray-500 border-b border-gray-100"><th className="pb-2 w-16">Qtd</th><th className="pb-2">Produto</th><th className="pb-2 text-right">Verificado</th></tr></thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0"><td className="py-2 font-black text-lg">{item.qtd}x</td><td className="py-2 text-gray-800 font-medium">{item.name}</td><td className="py-2 text-right"><div className="w-6 h-6 border-2 border-gray-300 rounded inline-block"></div></td></tr>
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
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <button onClick={() => setCurrentScreen('dashboard_admin')} className="flex items-center text-gray-600 hover:text-gray-800 font-bold px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><ArrowLeft className="w-5 h-5 mr-2" /> Voltar</button>
          <button onClick={() => window.print()} className="flex items-center bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 shadow transition"><Printer className="w-5 h-5 mr-2" /> Imprimir Despacho</button>
        </div>
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-md print:shadow-none print:p-0">
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-8"><h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Relatório de Despacho</h1></div>
          <div className="space-y-12">
            {Object.entries(itemsByPolo).map(([polo, items]) => (
              <div key={polo} className="break-inside-avoid border-2 border-gray-800 p-6 rounded-lg relative mt-4">
                <h2 className="absolute -top-4 left-4 px-4 text-xl font-black tracking-widest bg-gray-800 text-white py-1 rounded">Destino: {polo}</h2>
                <table className="w-full text-left mt-4">
                  <thead><tr className="text-xs uppercase text-gray-500 border-b border-gray-300"><th className="pb-2 w-20">Qtd Enviar</th><th className="pb-2">Produto</th><th className="pb-2">SKU</th><th className="pb-2 text-right">Conferido</th></tr></thead>
                  <tbody>
                    {Object.values(items).sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(item => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0"><td className="py-3 font-black text-xl text-blue-700">{item.totalQtd}x</td><td className="py-3 text-gray-800 font-bold text-lg">{item.name}</td><td className="py-3 text-gray-500 text-xs uppercase">{item.sku}</td><td className="py-3 text-right"><div className="w-6 h-6 border-2 border-gray-400 rounded inline-block"></div></td></tr>
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

      if (!hasItemsToBuy) return showToast('O estoque atual atende a demanda. Nenhuma caixa precisa ser comprada.', 'success');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `pedido_fornecedor_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Pedido Fornecedor baixado!', 'success');
    };

    return (
      <div className="p-4 max-w-5xl mx-auto pt-6 pb-24">
        <div className="flex flex-wrap gap-2 mb-6 bg-gray-200 p-1 rounded-xl">
          <button onClick={() => setAdminTab('pedidos')} className={`flex-1 py-2 px-2 rounded-lg font-bold text-sm transition ${adminTab === 'pedidos' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}>Consolidação e Compra</button>
          <button onClick={() => setAdminTab('catalogo')} className={`flex-1 py-2 px-2 rounded-lg font-bold text-sm transition ${adminTab === 'catalogo' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}>Catálogo & Tabela</button>
          <button onClick={() => setAdminTab('crm')} className={`flex-1 py-2 px-2 rounded-lg font-bold text-sm transition ${adminTab === 'crm' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}>Base de Clientes</button>
        </div>

        {adminTab === 'pedidos' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 p-4 font-bold text-white flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <span className="flex items-center"><Package className="w-5 h-5 mr-2" /> Inteligência de Compras na Nuvem</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-gray-700 px-3 py-1.5 rounded-lg text-sm text-green-400 border border-gray-600 whitespace-nowrap">Arrecadado: R$ {paidOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2).replace('.', ',')}</span>
                <button onClick={downloadPurchaseOrderCSV} className="flex items-center bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap"><Download className="w-4 h-4 mr-1"/> Pedido Fornecedor (CSV)</button>
                <button onClick={() => setCurrentScreen('print_admin')} className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"><Printer className="w-4 h-4 mr-1"/> Despacho (PDF)</button>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 border-b border-blue-100 text-sm text-blue-800">
              <p className="font-bold flex items-center mb-1"><ClipboardList className="w-4 h-4 mr-1"/> Regra de Estoque Automático</p>
              <p>O sistema usa o estoque local do mês passado para abater os pedidos. Só sugere comprar caixas fechadas para o que faltar!</p>
            </div>

            <div className="divide-y divide-gray-100">
              {Object.values(consolidatedItems).length === 0 && <p className="p-8 text-center text-gray-500">Nenhum pedido pago na nuvem ainda.</p>}
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
                  <div key={prod.id} className="p-5 hover:bg-gray-50 transition border-l-4 border-transparent hover:border-blue-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3 gap-4">
                      <div className="flex items-center mb-3 md:mb-0 lg:w-1/3">
                        <div className="w-14 h-14 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                           {isImageUrl ? <img src={prod.image} alt="" className="w-full h-full object-cover"/> : <span className="text-3xl">{prod.image}</span>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-lg leading-tight">{prod.name}</p>
                          <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1 border border-indigo-100">Caixa Fornecedor: {moq} un</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex gap-2">
                        <div className="flex-1 bg-gray-100 border border-gray-200 rounded-xl p-3 shadow-sm text-center">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Pedidos</p><p className="text-2xl font-black text-gray-800">{totalVendidos}</p>
                        </div>
                        <div className="flex-1 bg-gray-100 border border-gray-200 rounded-xl p-3 shadow-sm text-center">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-1">Estoque Local</p><p className="text-2xl font-black text-gray-800">{estoqueLocalAtual}</p>
                        </div>
                        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm text-center relative">
                          <p className="text-xs text-blue-700 font-bold uppercase mb-1 flex justify-center items-center">Pedir</p>
                          <p className="text-2xl font-black text-blue-700">{caixasParaComprar} Cx</p>
                          {caixasParaComprar > 0 && <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">+{totalCompradoDoFornecedor} un</span>}
                        </div>
                        <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 shadow-sm text-center">
                          <p className="text-xs text-green-700 font-bold uppercase mb-1 flex justify-center items-center">Sobra Futura</p>
                          <p className="text-2xl font-black text-green-700">{novoEstoqueLocal}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pl-16 flex gap-2 flex-wrap mt-2">
                      <span className="text-xs text-gray-400 mr-2 flex items-center">Separar para Destinos:</span>
                      {Object.entries(prod.polos).map(([poloName, qtd]) => (
                        <span key={poloName} className="bg-white text-gray-700 text-xs px-2 py-1 rounded border border-gray-300 font-medium shadow-sm">
                          {poloName}: <strong className="font-black text-gray-900">{qtd}</strong>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-blue-600 p-4 font-bold text-white flex justify-between items-center">
              <span className="flex items-center"><Users className="w-5 h-5 mr-2" /> Clientes na Nuvem</span>
              <span className="bg-blue-800 px-3 py-1 rounded-lg text-sm border border-blue-500">{customers.length} Clientes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase border-b border-gray-200"><th className="p-4">Nome</th><th className="p-4">Unidade</th><th className="p-4">WhatsApp</th><th className="p-4">E-mail</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition"><td className="p-4 font-bold text-gray-800">{c.name}</td><td className="p-4 text-sm text-gray-600">{c.polo}</td><td className="p-4 text-sm font-medium text-green-600">{c.whatsapp || '---'}</td><td className="p-4 text-sm text-gray-500">{c.email || '---'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === 'catalogo' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-sm">
              <div className="mb-4 md:mb-0">
                <h3 className="font-bold text-blue-800 flex items-center"><FileSpreadsheet className="w-5 h-5 mr-2"/> Atualização Mensal via Planilha</h3>
                <button onClick={downloadCSVTemplate} className="text-xs mt-2 font-bold text-blue-700 underline hover:text-blue-900 flex items-center"><Download className="w-3 h-3 mr-1" /> Baixar Modelo CSV Padrão</button>
              </div>
              <label className="cursor-pointer bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition flex items-center shadow-lg whitespace-nowrap">
                <Upload className="w-5 h-5 mr-2" /><span>Upload CSV</span><input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </label>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center border-b border-gray-100 pb-4">
                {editingProduct ? <Edit2 className="w-5 h-5 mr-2 text-blue-500"/> : <Plus className="w-5 h-5 mr-2 text-green-500"/>}
                {editingProduct ? 'Editar Produto na Nuvem' : 'Adicionar Novo Produto à Nuvem'}
              </h3>
              <form key={editingProduct?.id || 'new'} onSubmit={saveProduct} className="space-y-4">
                
                {/* --- SEÇÃO DA IMAGEM --- */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : editingProduct?.image && editingProduct.image.length > 5 ? (
                      <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{editingProduct?.image || '📦'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Imagem do Produto</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="cursor-pointer bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center whitespace-nowrap">
                        <ImageIcon className="w-4 h-4 mr-2" /> Escolher Foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <input name="imageFallback" defaultValue={(!editingProduct?.image || editingProduct.image.length > 5) ? '' : editingProduct.image} placeholder="Ou cole um Emoji (Ex: 🍎)" className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Você pode escolher uma foto do celular/computador ou digitar um emoji.</p>
                  </div>
                </div>
                {/* ----------------------- */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 mb-1">Código SKU</label><input name="sku" defaultValue={editingProduct?.sku || ''} required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none uppercase" /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Nome do Produto</label><input name="name" defaultValue={editingProduct?.name || ''} required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Categoria</label>
                    <select name="category" defaultValue={editingProduct?.category || categorias[1]} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none bg-white">
                      {categorias.filter(c => c !== 'Todos').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Preço (R$)</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 text-orange-600">Estoque Local</label><input name="stockLocal" type="number" min="0" defaultValue={editingProduct?.stockLocal || 0} required className="w-full border border-orange-300 bg-orange-50 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none font-bold" /></div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1 text-blue-600">Qtd Mínima (Caixa)</label><input name="minOrderQuantity" type="number" min="1" defaultValue={editingProduct?.minOrderQuantity || 1} required className="w-full border border-blue-300 bg-blue-50 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold" /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Descrição</label><textarea name="description" defaultValue={editingProduct?.description || ''} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none" rows="2"></textarea></div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                  {editingProduct && <button type="button" onClick={() => {setEditingProduct(null); setImagePreview('');}} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">Cancelar</button>}
                  <button type="submit" className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md">Salvar no Firebase</button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">Produtos Sincronizados ({products.length})</div>
              <div className="divide-y divide-gray-100">
                {products.map(p => {
                  const isImageUrl = p.image && p.image.length > 5;
                  return (
                    <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mr-4 overflow-hidden">{isImageUrl ? <img src={p.image} alt="" className="w-full h-full object-cover"/> : <span className="text-xl">{p.image}</span>}</div>
                        <div>
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-sm font-medium text-gray-500">Caixa: {p.minOrderQuantity} un | Estoque Local: {p.stockLocal} un</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => setEditingProduct(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative">
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold text-white transition-all flex items-center ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
          {toast.type === 'error' ? <span className="mr-2">⚠️</span> : <CheckCircle className="w-5 h-5 mr-2 text-green-400" />}
          {toast.msg}
        </div>
      )}

      {currentScreen !== 'login' && currentScreen !== 'print_rep' && currentScreen !== 'print_admin' && (
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="text-green-600 w-6 h-6" />
              <span className="font-bold text-lg text-gray-800 hidden md:block">Clube de Compras</span>
            </div>
            <div className="flex items-center space-x-3">
              {user?.role === 'cliente' && (
                <button onClick={() => setCurrentScreen(currentScreen === 'my_orders' ? 'shop' : 'my_orders')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-bold hover:bg-green-100 transition">
                  {currentScreen === 'my_orders' ? 'Ir às Compras' : 'Meus Pedidos'}
                </button>
              )}
              <span className="text-sm text-gray-500 font-medium">{user.name}</span>
              <button onClick={() => { setUser(null); setCurrentScreen('login'); setCart([]); }} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100">Sair</button>
            </div>
          </div>
        </header>
      )}

      <main>
        {currentScreen === 'login' && renderLogin()}
        {currentScreen === 'shop' && renderShop()}
        {currentScreen === 'checkout' && renderCheckout()}
        {currentScreen === 'my_orders' && renderMyOrders()}
        {currentScreen === 'dashboard_rep' && renderRepDashboard()}
        {currentScreen === 'print_rep' && renderPrintView()}
        {currentScreen === 'print_admin' && renderAdminPrintView()}
        {currentScreen === 'dashboard_admin' && renderAdminDashboard()}
        {currentScreen === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
            <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Pagamento e Pedido Salvos na Nuvem!</h2>
            <button onClick={() => setCurrentScreen('shop')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 shadow-lg mt-4">Voltar para a Loja</button>
          </div>
        )}
      </main>

      {user?.role === 'cliente' && currentScreen !== 'checkout' && currentScreen !== 'success' && currentScreen !== 'my_orders' && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-3 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => cart.length > 0 ? setCurrentScreen('checkout') : showToast('Sua cesta está vazia! Adicione produtos primeiro.', 'error')} 
            className={`w-full flex items-center justify-center py-3 rounded-xl font-bold transition relative ${cart.length > 0 ? 'bg-green-600 text-white shadow-lg hover:bg-green-700' : 'bg-gray-100 text-gray-400'}`}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span>Pagar e Finalizar Pedido</span>
            {cart.length > 0 && (
              <span className="absolute right-4 bg-white text-green-600 text-[11px] font-black px-2 py-1 rounded-md shadow-sm">
                {cart.reduce((sum, i) => sum + i.qtd, 0)} itens
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}