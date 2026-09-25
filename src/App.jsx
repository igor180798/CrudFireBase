import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import Home from './Pages/Home';
import Login from './Pages/Login';
import PainelAdmin from './Pages/PainelAdmin';
import Perfil from './Pages/Perfil';
import Toast from './components/Toast';
import CartDrawer from './components/CartDrawer';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState('home'); // 'home', 'admin', 'perfil', 'login'
  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);

  // Perfil do Utilizador
  const [dadosPerfil, setDadosPerfil] = useState(null);

  // Carrinho e Drawer
  const [carrinho, setCarrinho] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estados centralizados para Marcas Manuais e Excluídas (com persistência no localStorage)
  const [marcasManuais, setMarcasManuais] = useState(() => {
    const salvo = localStorage.getItem('sneakerstore_marcas_manuais');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [marcasExcluidas, setMarcasExcluidas] = useState(() => {
    const salvo = localStorage.getItem('sneakerstore_marcas_excluidas');
    return salvo ? JSON.parse(salvo) : [];
  });

  // Salvar marcas manuais e excluídas no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('sneakerstore_marcas_manuais', JSON.stringify(marcasManuais));
  }, [marcasManuais]);

  useEffect(() => {
    localStorage.setItem('sneakerstore_marcas_excluidas', JSON.stringify(marcasExcluidas));
  }, [marcasExcluidas]);

  // Lista dinâmica e combinada de marcas disponíveis para toda a aplicação
  const marcasDisponiveis = React.useMemo(() => {
    const marcasDosProdutos = produtos.map(p => p.marca).filter(Boolean);
    const marcasBase = ['Nike', 'Adidas', 'All Star', 'Vans', 'Puma', 'New Balance'];
    const todas = Array.from(new Set([...marcasBase, ...marcasManuais, ...marcasDosProdutos]));
    // Remove as marcas que o utilizador excluiu explicitamente
    return todas.filter(m => !marcasExcluidas.includes(m)).sort();
  }, [produtos, marcasManuais, marcasExcluidas]);

  // Estados para o Modal de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [dadosPagamento, setDadosPagamento] = useState({
    metodo: 'cartao',
    nomeTitular: '',
    numeroCartao: '',
    validade: '',
    cvv: ''
  });

  const [toast, setToast] = useState(null);

  const dispararToast = (mensagem, tipo = 'success') => {
    setToast({ mensagem, tipo });
  };

  const sincronizarCarrinhoNoFirestore = async (novoCarrinho, userId) => {
    if (!userId) return;
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, { carrinho: novoCarrinho });
    } catch (err) {
      console.error("Erro ao sincronizar carrinho no Firestore:", err);
    }
  };

  const carregarProdutos = async () => {
    try {
      setCarregandoProdutos(true);
      const querySnapshot = await getDocs(collection(db, 'produtos'));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProdutos(lista);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setCarregandoProdutos(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'usuarios', currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.carrinho && Array.isArray(data.carrinho)) {
              setCarrinho(data.carrinho);
            } else {
              const carrinhoSalvo = localStorage.getItem(`sneakerstore_carrinho_${currentUser.uid}`);
              if (carrinhoSalvo) {
                try {
                  const parsed = JSON.parse(carrinhoSalvo);
                  setCarrinho(parsed);
                  sincronizarCarrinhoNoFirestore(parsed, currentUser.uid);
                } catch (e) {
                  console.error("Erro ao carregar carrinho:", e);
                }
              }
            }

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
        setDadosPerfil(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
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
      let novoCarrinho;
      if (indexExistente >= 0) {
        novoCarrinho = [...prev];
        novoCarrinho[indexExistente].qtd += 1;
      } else {
        novoCarrinho = [...prev, { ...produto, tamanho, qtd: 1 }];
      }

      if (user) {
        sincronizarCarrinhoNoFirestore(novoCarrinho, user.uid);
        localStorage.setItem(`sneakerstore_carrinho_${user.uid}`, JSON.stringify(novoCarrinho));
      }
      return novoCarrinho;
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

      if (user) {
        sincronizarCarrinhoNoFirestore(novoCarrinho, user.uid);
        localStorage.setItem(`sneakerstore_carrinho_${user.uid}`, JSON.stringify(novoCarrinho));
      }
      return novoCarrinho;
    });
  };

  const handleRemoveItem = (indexParaRemover) => {
    setCarrinho(prev => {
      const novoCarrinho = prev.filter((_, index) => index !== indexParaRemover);
      if (user) {
        sincronizarCarrinhoNoFirestore(novoCarrinho, user.uid);
        localStorage.setItem(`sneakerstore_carrinho_${user.uid}`, JSON.stringify(novoCarrinho));
      }
      return novoCarrinho;
    });
    dispararToast('Item removido do carrinho.', 'info');
  };

  const handleCheckout = () => {
    if (carrinho.length === 0) return;
    if (!user) {
      setPaginaAtual('login');
      setIsCartOpen(false);
      dispararToast('Por favor, faça login para finalizar a compra.', 'info');
      return;
    }
    setIsCartOpen(false);
    setModalPagamentoAberto(true);
  };

  const confirmarEProcessarPagamento = async () => {
    try {
      const itensFormatados = carrinho.map(item => ({
        id: item.id || '',
        nome: item.nome || 'Produto',
        preco: Number(item.preco ?? item.valor ?? 0),
        qtd: Number(item.qtd ?? item.quantidade ?? 1),
        tamanho: item.tamanho || item.tamanhoSelecionado || 'Único',
        imagem: item.imagem || item.foto || ''
      }));

      const valorTotalCalculado = itensFormatados.reduce((total, item) => total + (item.preco * item.qtd), 0);
      const idTransacao = 'PIX-MOCK-' + Math.random().toString(36).substring(2, 9).toUpperCase();

      const novoPedido = {
        itens: itensFormatados,
        valorTotal: valorTotalCalculado,
        status: 'Pago',
        metodoPagamento: dadosPagamento.metodo || 'Pix',
        transacaoId: idTransacao,
        criadoEm: new Date(),
        userId: user?.uid || null,
        emailCliente: user?.email || ''
      };

      await addDoc(collection(db, 'encomendas'), novoPedido);

      setCarrinho([]);
      if (user) {
        await sincronizarCarrinhoNoFirestore([], user.uid);
        localStorage.removeItem(`sneakerstore_carrinho_${user.uid}`);
      }

      alert(`🎉 Pagamento aprovado com sucesso! ID: ${idTransacao}`);
      setModalPagamentoAberto(false);
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      alert("Erro ao finalizar o pedido. Tente novamente.");
    }
  };

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

      {modalPagamentoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-sky-400">Finalizar Pagamento</h3>
              <button
                onClick={() => setModalPagamentoAberto(false)}
                className="text-gray-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-800 p-3 rounded-lg mb-4 text-sm text-gray-300">
              <p className="flex justify-between"><span>Itens no carrinho:</span> <span className="font-semibold">{totalItensCarrinho}</span></p>
              <p className="flex justify-between mt-1 text-base text-white font-bold">
                <span>Total a Pagar:</span>
                <span>R$ {carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0).toFixed(2)}</span>
              </p>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setDadosPagamento({ ...dadosPagamento, metodo: 'cartao' })}
                className={`flex-1 py-2 rounded-lg font-medium border cursor-pointer transition ${dadosPagamento.metodo === 'cartao' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400'}`}
              >
                Cartão de Crédito
              </button>
              <button
                type="button"
                onClick={() => setDadosPagamento({ ...dadosPagamento, metodo: 'pix' })}
                className={`flex-1 py-2 rounded-lg font-medium border cursor-pointer transition ${dadosPagamento.metodo === 'pix' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-400'}`}
              >
                PIX
              </button>
            </div>

            {dadosPagamento.metodo === 'cartao' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome no Cartão</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={dadosPagamento.nomeTitular}
                    onChange={(e) => setDadosPagamento({ ...dadosPagamento, nomeTitular: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={dadosPagamento.numeroCartao}
                    onChange={(e) => setDadosPagamento({ ...dadosPagamento, numeroCartao: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Validade</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={dadosPagamento.validade}
                      onChange={(e) => setDadosPagamento({ ...dadosPagamento, validade: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">CVV</label>
                    <input
                      type="password"
                      placeholder="123"
                      maxLength="4"
                      value={dadosPagamento.cvv}
                      onChange={(e) => setDadosPagamento({ ...dadosPagamento, cvv: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-gray-300 mb-2">O pagamento via PIX será gerado instantaneamente ao confirmar.</p>
                <span className="text-xs text-sky-400 font-semibold">Aprovação imediata</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalPagamentoAberto(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEProcessarPagamento}
                className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 py-2 rounded-lg text-sm font-bold transition cursor-pointer"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

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

              {user && (
                <button
                  onClick={() => setPaginaAtual('perfil')}
                  className={`transition cursor-pointer ${paginaAtual === 'perfil' ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-400'}`}
                >
                  Meu Perfil
                </button>
              )}

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
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <span>🛒 Carrinho</span>
              <span className="bg-sky-800 px-1.5 py-0.5 rounded-md text-[10px]">{totalItensCarrinho}</span>
            </button>

            {user ? (
              <>
                <span className="text-slate-400 hidden sm:inline">Olá, <strong className="text-slate-200">{user?.email}</strong></span>
                <button
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition border border-slate-700 cursor-pointer"
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                onClick={() => setPaginaAtual('login')}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-lg transition cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Dinâmico */}
      <main className="flex-grow">
        {paginaAtual === 'home' && (
          <Home
            produtos={produtos}
            carregandoProdutos={carregandoProdutos}
            onAddToCart={handleAddToCart}
            dadosPerfil={dadosPerfil}
            IrParaPerfil={() => setPaginaAtual('perfil')}
            onRecarregar={carregarProdutos}
            marcasDisponiveis={marcasDisponiveis}
          />
        )}

        {paginaAtual === 'perfil' && (
          user ? <Perfil user={user} dispararToast={dispararToast} /> : <Login aoLogarSucesso={() => setPaginaAtual('perfil')} dispararToast={dispararToast} />
        )}

        {paginaAtual === 'login' && (
          <Login aoLogarSucesso={() => setPaginaAtual('home')} dispararToast={dispararToast} />
        )}

        {paginaAtual === 'admin' && (
          isAdmin ? (
            <PainelAdmin
              isAdmin={isAdmin}
              produtos={produtos}
              aoCadastrarProduto={carregarProdutos}
              dispararToast={dispararToast}
              marcasManuais={marcasManuais}
              setMarcasManuais={setMarcasManuais}
              marcasExcluidas={marcasExcluidas}
              setMarcasExcluidas={setMarcasExcluidas}
            />
          ) : (
            <div className="text-center py-24 text-slate-400 text-sm">
              Acesso restrito a administradores.
            </div>
          )
        )}
      </main>
    </div>
  );
}