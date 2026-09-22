import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import Home from './Pages/Home';
import Login from './Pages/Login';
import PainelAdmin from './Pages/PainelAdmin';
import Perfil from './Pages/Perfil';
import Toast from './components/Toast';
import CartDrawer from './components/CartDrawer';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState('home'); // 'home', 'admin', 'perfil'
  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);

  // Perfil do Utilizador para validação de cadastro incompleto
  const [dadosPerfil, setDadosPerfil] = useState(null);

  // Carrinho e Drawer
  const [carrinho, setCarrinho] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [toast, setToast] = useState(null);

  const dispararToast = (mensagem, tipo = 'success') => {
    setToast({ mensagem, tipo });
  };

  // Monitorizar Sessão, carregar carrinho, dados do perfil e verificar papel (role)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const carrinhoSalvo = localStorage.getItem(`sneakerstore_carrinho_${currentUser.uid}`);
        if (carrinhoSalvo) {
          try {
            setCarrinho(JSON.parse(carrinhoSalvo));
          } catch (e) {
            console.error("Erro ao carregar carrinho:", e);
          }
        }

        // CARREGAR DADOS DO PERFIL E VERIFICAR PAPEL (ADMIN OU CLIENTE) NO FIRESTORE
        try {
          const docRef = doc(db, 'usuarios', currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            // Normaliza os dados para o App/Home lerem perfeitamente
            setDadosPerfil({
              nome: data.nomeCompleto || data.nome || '',
              telefone: data.telefone || '',
              rua: data.endereco?.rua || data.rua || '',
              bairro: data.endereco?.bairro || data.bairro || '',
              numero: data.endereco?.numero || data.numero || '',
              cidade: data.endereco?.cidade || data.cidade || '',
              estado: data.endereco?.estado || data.estado || '',
              cep: data.endereco?.cep || data.cep || ''
            });

            // Definição profissional do papel: Se for o e-mail master ou tiver role === 'admin'
            const ehAdminMaster = currentUser.email === 'igortosquibenatti@gmail.com';
            const temRoleAdmin = data.role === 'admin' || data.admin === true;
            setIsAdmin(ehAdminMaster || temRoleAdmin);

          } else {
            setDadosPerfil({ nome: '', telefone: '', rua: '', bairro: '', numero: '', cidade: '', estado: '', cep: '' });
            setIsAdmin(currentUser.email === 'igortosquibenatti@gmail.com');
          }
        } catch (err) {
          console.error("Erro ao carregar perfil/permissões:", err);
          setDadosPerfil(null);
          setIsAdmin(currentUser.email === 'igortosquibenatti@gmail.com');
        }

      } else {
        setIsAdmin(false);
        setCarrinho([]);
        setDadosPerfil(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Guardar carrinho no localStorage sempre que houver alterações
  useEffect(() => {
    if (user) {
      localStorage.setItem(`sneakerstore_carrinho_${user.uid}`, JSON.stringify(carrinho));
    }
  }, [carrinho, user]);

  // Carregar Produtos do Firestore
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const querySnapshot = await getDocs(collection(db, 'produtos'));
        const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProdutos(lista);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      } finally {
        setCarregandoProdutos(false);
      }
    }
    carregarProdutos();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPaginaAtual('home');
      setIsCartOpen(false);
      dispararToast('Sessão terminada.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = (produto, tamanho) => {
    setCarrinho(prev => {
      const indexExistente = prev.findIndex(item => item.id === produto.id && item.tamanho === tamanho);
      if (indexExistente >= 0) {
        const novoCarrinho = [...prev];
        novoCarrinho[indexExistente].qtd += 1;
        return novoCarrinho;
      } else {
        return [...prev, { ...produto, tamanho, qtd: 1 }];
      }
    });
    dispararToast(`${produto.nome} (${tamanho}) adicionado ao carrinho!`, 'success');
  };

  const handleUpdateQuantity = (index, delta) => {
    setCarrinho(prev => {
      const novoCarrinho = [...prev];
      const novaQtd = novoCarrinho[index].qtd + delta;
      if (novaQtd <= 0) {
        novoCarrinho.splice(index, 1);
        dispararToast('Item removido do carrinho.', 'info');
      } else {
        novoCarrinho[index].qtd = novaQtd;
      }
      return novoCarrinho;
    });
  };

  const handleRemoveItem = (indexParaRemover) => {
    setCarrinho(prev => prev.filter((_, index) => index !== indexParaRemover));
    dispararToast('Item removido do carrinho.', 'info');
  };

  const handleCheckout = async () => {
    if (carrinho.length === 0) return;

    try {
      const totalPedido = carrinho.reduce((acc, item) => acc + (Number(item.preco) * Number(item.qtd)), 0);

      const novaEncomenda = {
        userId: user.uid,
        userEmail: user.email,
        itens: carrinho.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: Number(item.preco),
          tamanho: item.tamanho,
          qtd: Number(item.qtd)
        })),
        total: totalPedido,
        status: 'Aprovado / Pago',
        criadoEm: new Date()
      };

      await addDoc(collection(db, 'encomendas'), novaEncomenda);

      dispararToast('Pedido finalizado com sucesso! Encomenda registada.', 'success');
      setCarrinho([]);
      if (user) {
        localStorage.removeItem(`sneakerstore_carrinho_${user.uid}`);
      }
      setIsCartOpen(false);
      setPaginaAtual('perfil');
    } catch (err) {
      console.error("ERRO AO FINALIZAR PEDIDO:", err);
      dispararToast(`Erro: ${err.message || 'Erro ao processar encomenda.'}`, 'error');
    }
  };

  const handleCadastrarProduto = async (novoProduto) => {
    try {
      const docRef = await addDoc(collection(db, 'produtos'), novoProduto);
      setProdutos(prev => [...prev, { id: docRef.id, ...novoProduto }]);
      dispararToast('Produto cadastrado com sucesso!', 'success');
      setPaginaAtual('home');
    } catch (err) {
      console.error(err);
      dispararToast('Erro ao cadastrar produto.', 'error');
    }
  };

  const aoExcluirProduto = async (idProduto) => {
    try {
      await deleteDoc(doc(db, 'produtos', idProduto));
      setProdutos(prev => prev.filter(prod => prod.id !== idProduto));
      dispararToast('Produto excluído com sucesso!', 'info');
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      dispararToast('Erro ao excluir produto.', 'error');
    }
  };

  if (!user) {
    return (
      <>
        {toast && (
          <Toast message={toast.mensagem} type={toast.tipo} onClose={() => setToast(null)} />
        )}
        <Login dispararToast={dispararToast} />
      </>
    );
  }

  const totalItensCarrinho = carrinho.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <div className="min-h-screen bg-[#0b101d] text-slate-100 flex flex-col">
      {toast && (
        <Toast message={toast.mensagem} type={toast.tipo} onClose={() => setToast(null)} />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={carrinho}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Navbar Superior */}
      <header className="border-b border-slate-800 bg-[#131a27] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <span className="font-extrabold text-sm text-sky-400">SneakerStore</span>
            <nav className="flex space-x-4">
              <button
                onClick={() => setPaginaAtual('home')}
                className={`transition cursor-pointer ${paginaAtual === 'home' ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-400'}`}
              >
                Catálogo
              </button>

              <button
                onClick={() => setPaginaAtual('perfil')}
                className={`transition cursor-pointer ${paginaAtual === 'perfil' ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-400'}`}
              >
                Meu Perfil
              </button>

              {isAdmin && (
                <button
                  onClick={() => setPaginaAtual('admin')}
                  className={`transition cursor-pointer ${paginaAtual === 'admin' ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-400'}`}
                >
                  Painel Admin
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-slate-400 hidden sm:inline">Olá, <strong className="text-slate-200">{user.email}</strong></span>

            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <span>🛒 Carrinho</span>
              <span className="bg-sky-800 px-1.5 py-0.5 rounded-md text-[10px]">{totalItensCarrinho}</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition border border-slate-700 cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Dinâmico */}
      <main className="flex-grow">
        {paginaAtual === 'home' ? (
          <Home
            produtos={produtos}
            carregandoProdutos={carregandoProdutos}
            onAddToCart={handleAddToCart}
            dadosPerfil={dadosPerfil}
            IrParaPerfil={() => setPaginaAtual('perfil')}
          />
        ) : paginaAtual === 'perfil' ? (
          <Perfil user={user} dispararToast={dispararToast} />
        ) : (
          <PainelAdmin
            isAdmin={isAdmin}
            produtos={produtos}
            aoCadastrarProduto={handleCadastrarProduto}
            aoExcluirProduto={aoExcluirProduto}
            dispararToast={dispararToast}
          />
        )}
      </main>
    </div>
  );
}