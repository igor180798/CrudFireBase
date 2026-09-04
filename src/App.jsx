import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

import CartDrawer from './components/CartDrawer';

const ICONE_SVG_PATH = '/sneaker.png';
const TAMANHOS_PADRAO = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [isCadastrando, setIsCadastrando] = useState(false);
  const [isModalPerfilOpen, setIsModalPerfilOpen] = useState(false);

  // Estados de Auth
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');

  // Estados dos Dados Pessoais
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpf, setCpf] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  // Catálogo e Carrinho
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form Produto
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [nomeProduto, setNomeProduto] = useState('');
  const [precoFormatado, setPrecoFormatado] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [estoqueTamanhos, setEstoqueTamanhos] = useState({});

  // Filtros
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroTamanho, setFiltroTamanho] = useState('Todos');
  const [ordem, setOrdem] = useState('padrao');

  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = ICONE_SVG_PATH;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      if (user) {
        await buscarPerfilUsuario(user.uid);
      } else {
        setPerfilUsuario(null);
      }
      setCarregandoAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const buscarPerfilUsuario = async (uid) => {
    try {
      const userDocRef = doc(db, 'usuarios', uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setPerfilUsuario(dados);
        preencherCamposPerfil(dados);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const preencherCamposPerfil = (dados) => {
    setNomeCompleto(dados.nomeCompleto || '');
    setDataNascimento(dados.dataNascimento || '');
    setCpf(dados.cpf || '');
    setRua(dados.rua || '');
    setBairro(dados.bairro || '');
    setCidade(dados.cidade || '');
    setEstado(dados.estado || '');
    setCep(dados.cep || '');
  };

  const perfilEstaIncompleto = !perfilUsuario || !(
    perfilUsuario.nomeCompleto &&
    perfilUsuario.dataNascimento &&
    perfilUsuario.cpf &&
    perfilUsuario.rua &&
    perfilUsuario.bairro &&
    perfilUsuario.cidade &&
    perfilUsuario.estado &&
    perfilUsuario.cep
  );

  useEffect(() => {
    if (!usuario) return;
    const unsubscribe = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      setProdutos(lista);
    });
    return () => unsubscribe();
  }, [usuario]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isCadastrando) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailAuth, senhaAuth);
        const uid = userCredential.user.uid;
        const dadosPerfil = { email: emailAuth, nomeCompleto, dataNascimento, cpf, rua, bairro, cidade, estado, cep, criadoEm: new Date() };
        await setDoc(doc(db, 'usuarios', uid), dadosPerfil);
        setPerfilUsuario(dadosPerfil);
      } else {
        await signInWithEmailAndPassword(auth, emailAuth, senhaAuth);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const salvarPerfilComplementar = async (e) => {
    e.preventDefault();
    if (!usuario) return;
    try {
      const dadosPerfil = { email: usuario.email, nomeCompleto, dataNascimento, cpf, rua, bairro, cidade, estado, cep, atualizadoEm: new Date() };
      await setDoc(doc(db, 'usuarios', usuario.uid), dadosPerfil, { merge: true });
      setPerfilUsuario(dadosPerfil);
      setIsModalPerfilOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCarrinho([]);
  };

  const handleTamanhoEstoqueChange = (size, val) => {
    setEstoqueTamanhos((prev) => ({
      ...prev,
      [size]: Math.max(0, parseInt(val) || 0)
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagemUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePrecoChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setPrecoFormatado('');
      return;
    }
    const numericValue = parseFloat(rawValue) / 100;
    setPrecoFormatado(numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const converterPrecoParaFloat = (valorStr) => {
    if (!valorStr) return 0;
    const apenasNumeros = valorStr.replace(/\D/g, '');
    return parseFloat(apenasNumeros) / 100;
  };

  const handleIniciarEdicao = (prod) => {
    setProdutoEditandoId(prod.id);
    setNomeProduto(prod.nome || '');
    const precoNum = Number(prod.preco) || 0;
    setPrecoFormatado(precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    setImagemUrl(prod.imagemUrl || prod.imagem || prod.foto || '');
    setEstoqueTamanhos(prod.tamanhos || prod.estoquePorTamanho || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setProdutoEditandoId(null);
    setNomeProduto('');
    setPrecoFormatado('');
    setImagemUrl('');
    setEstoqueTamanhos({});
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    const precoNum = converterPrecoParaFloat(precoFormatado);
    if (!nomeProduto) return alert('Preencha o nome do produto!');
    if (isNaN(precoNum) || precoNum <= 0) return alert('Insira um preço válido!');

    try {
      const dadosProduto = {
        nome: nomeProduto,
        preco: precoNum,
        imagemUrl,
        tamanhos: estoqueTamanhos,
        atualizadoEm: new Date()
      };

      if (produtoEditandoId) {
        await updateDoc(doc(db, 'produtos', produtoEditandoId), dadosProduto);
      } else {
        dadosProduto.criadoEm = new Date();
        await addDoc(collection(db, 'produtos'), dadosProduto);
      }
      handleCancelarEdicao();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExcluirProduto = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await deleteDoc(doc(db, 'produtos', id));
      if (produtoEditandoId === id) handleCancelarEdicao();
    }
  };

  const handleAddToCart = (produto, tamanho) => {
    if (!tamanho) return alert('Selecione um tamanho!');
    setCarrinho((prev) => {
      const existe = prev.find((item) => item.id === produto.id && item.tamanho === tamanho);
      if (existe) {
        return prev.map((item) =>
          item.id === produto.id && item.tamanho === tamanho
            ? { ...item, qtd: item.qtd + 1 }
            : item
        );
      }
      return [...prev, { ...produto, tamanho, qtd: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index, delta) => {
    setCarrinho((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qtd: item.qtd + delta } : item)).filter((item) => item.qtd > 0)
    );
  };

  const handleRemoveItem = (index) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };

  const estoqueTotalForm = Object.values(estoqueTamanhos).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  const getEstoqueTotal = (p) => {
    const ts = p.tamanhos || p.estoquePorTamanho || {};
    return Object.values(ts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  };

  const produtosFiltrados = produtos
    .filter((p) => {
      const bateNome = (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase());
      if (filtroTamanho === 'Todos') return bateNome;
      const stockTamanho = Number(p.tamanhos?.[filtroTamanho] || p.estoquePorTamanho?.[filtroTamanho]) || 0;
      return bateNome && stockTamanho > 0;
    })
    .sort((a, b) => {
      if (ordem === 'maiorPreco') return (Number(b.preco) || 0) - (Number(a.preco) || 0);
      if (ordem === 'menorPreco') return (Number(a.preco) || 0) - (Number(b.preco) || 0);
      if (ordem === 'maiorEstoque') return getEstoqueTotal(b) - getEstoqueTotal(a);
      return 0;
    });

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-[#0b101d] text-slate-100 flex items-center justify-center font-sans">
        <p className="text-sm font-semibold text-sky-400 animate-pulse">Carregando...</p>
      </div>
    );
  }

  // TELA DE LOGIN / CADASTRO
  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#0b101d] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-[#131a27] border border-slate-800 p-8 rounded-xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={ICONE_SVG_PATH} alt="Logo" className="w-8 h-8 object-contain" />
            <h2 className="text-2xl font-bold text-sky-400">
              {isCadastrando ? 'Criar Conta' : 'Acessar Catálogo'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 text-center">
            {isCadastrando ? 'Preencha seus dados' : 'Digite seu e-mail e senha para entrar'}
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block mb-1 font-semibold text-slate-300">E-mail</label>
              <input
                type="email"
                required
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Senha</label>
              <input
                type="password"
                required
                value={senhaAuth}
                onChange={(e) => setSenhaAuth(e.target.value)}
                className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#0284c7] hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-xs transition mt-4"
            >
              {isCadastrando ? 'Finalizar Cadastro' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            <button
              onClick={() => setIsCadastrando(!isCadastrando)}
              className="text-sky-400 font-bold hover:underline"
            >
              {isCadastrando ? 'Já tenho conta' : 'Criar uma conta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL
  return (
    <div className="min-h-screen bg-[#0b101d] text-slate-100 font-sans py-4 px-6">

      <div className="max-w-6xl mx-auto space-y-4">

        {/* Topo Limpo Exatamente Igual à Imagem */}
        <div className="flex justify-between items-center text-xs py-1">
          <span className="text-slate-400">
            Conectado como: <strong className="text-sky-400 font-semibold">{perfilUsuario?.nomeCompleto || usuario.email}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#0284c7] hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-md transition text-xs flex items-center gap-1.5"
            >
              🛒 Carrinho ({carrinho.reduce((acc, item) => acc + item.qtd, 0)})
            </button>
            <button
              onClick={handleLogout}
              className="bg-[#1f2937] hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700/50 font-semibold flex items-center gap-1.5 transition text-xs"
            >
              Sair
              {/* Ícone da Portinha */}
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* ALERTA DE PERFIL */}
        {perfilEstaIncompleto && (
          <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
            <span className="text-amber-200">⚠️ Seu perfil está incompleto! Complete seus dados cadastrais.</span>
            <button
              onClick={() => setIsModalPerfilOpen(true)}
              className="bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-xs"
            >
              Completar
            </button>
          </div>
        )}

        {/* Header com o Sneaker Vermelho/Branco */}
        <header className="text-center py-2">
          <h1 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
            <img
              src={ICONE_SVG_PATH}
              alt="Icon"
              className="w-9 h-9 object-contain"
            />
            Catálogo de Produtos
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gerencie e visualize seu inventário em tempo real</p>
        </header>

        {/* Layout Principal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Form Esquerda */}
          <aside className="lg:col-span-4 bg-[#131a27] p-5 rounded-2xl border border-slate-800/80 space-y-4">
            <h2 className="text-sm font-bold text-sky-400 flex items-center gap-1.5">
              <span className="text-sky-400 font-extrabold text-base">+</span> {produtoEditandoId ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={handleSalvarProduto} className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block mb-1 font-medium text-slate-300">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Tênis Esportivo"
                  value={nomeProduto}
                  onChange={(e) => setNomeProduto(e.target.value)}
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-slate-300">Imagem do Produto (Arquivo Local)</label>
                <label className="border border-dashed border-slate-800 bg-[#0b101d] rounded-lg p-2.5 text-center cursor-pointer hover:border-sky-500 transition block">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <span className="text-amber-500 font-bold flex items-center justify-center gap-1.5">
                    📁 {imagemUrl ? 'Trocar Imagem' : 'Selecionar Imagem'}
                  </span>
                </label>
              </div>

              {imagemUrl && (
                <div className="bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-center">
                  <img src={imagemUrl} alt="Preview" className="h-24 mx-auto object-contain rounded" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 font-medium text-slate-300">Preço</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={precoFormatado}
                    onChange={handlePrecoChange}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-slate-300">Estoque Total</label>
                  <input
                    type="number"
                    readOnly
                    value={estoqueTotalForm}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-sky-400 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-medium text-slate-300">Estoque por Tamanho</label>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {TAMANHOS_PADRAO.map((size) => (
                    <div key={size} className="bg-[#0b101d] border border-slate-800 p-1 rounded-md">
                      <span className="block text-[10px] text-slate-400 font-bold">{size}</span>
                      <input
                        type="number"
                        min="0"
                        value={estoqueTamanhos[size] ?? ''}
                        onChange={(e) => handleTamanhoEstoqueChange(size, e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-center text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                {produtoEditandoId ? (
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#0284c7] hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-xs transition"
                    >
                      Atualizar Produto
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelarEdicao}
                      className="bg-[#1f2937] hover:bg-slate-700 text-slate-300 font-bold px-3 py-2.5 rounded-lg text-xs transition"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-[#0284c7] hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-xs transition"
                  >
                    Cadastrar Produto
                  </button>
                )}
              </div>
            </form>
          </aside>

          {/* Produtos Direita */}
          <section className="lg:col-span-8 space-y-3.5">

            {/* Buscador + Select */}
            <div className="bg-[#131a27] p-3 rounded-xl border border-slate-800/80 flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="🔍 Buscar produto pelo nome..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
                />
              </div>
              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                className="bg-[#0b101d] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="padrao">Padrão</option>
                <option value="maiorPreco">Maior Preço</option>
                <option value="menorPreco">Menor Preço</option>
                <option value="maiorEstoque">Maior Estoque</option>
              </select>
            </div>

            {/* Filtros de Tamanho */}
            <div className="bg-[#131a27] p-3 rounded-xl border border-slate-800/80 flex items-center gap-1.5 text-xs overflow-x-auto">
              <span className="text-slate-400 font-medium whitespace-nowrap mr-1">Filtrar por Tamanho:</span>
              {['Todos', ...TAMANHOS_PADRAO].map((size) => (
                <button
                  key={size}
                  onClick={() => setFiltroTamanho(size)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${filtroTamanho === size
                      ? 'bg-[#0284c7] text-white'
                      : 'bg-[#0b101d] text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Titulo Produtos Disponiveis */}
            <h3 className="text-xs font-bold text-slate-200 pt-1">
              Produtos Disponíveis ({produtosFiltrados.length})
            </h3>

            {/* Grid de Cards */}
            {produtosFiltrados.length === 0 ? (
              <div className="bg-[#131a27] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                Nenhum produto cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produtosFiltrados.map((prod) => (
                  <CardProdutoOriginal
                    key={prod.id}
                    produto={prod}
                    isEditing={produtoEditandoId === prod.id}
                    onEdit={handleIniciarEdicao}
                    onAddToCart={handleAddToCart}
                    onDelete={handleExcluirProduto}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* MODAL PERFIL */}
      {isModalPerfilOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-sky-400">📝 Completar Dados do Perfil</h3>
              <button onClick={() => setIsModalPerfilOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={salvarPerfilComplementar} className="space-y-3">
              <div>
                <label className="block mb-1 text-slate-300">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-slate-300">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-300">CPF</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block mb-1 text-slate-300">Rua</label>
                  <input
                    type="text"
                    required
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-300">CEP</label>
                  <input
                    type="text"
                    required
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 text-slate-300">Bairro</label>
                  <input
                    type="text"
                    required
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-300">Cidade</label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-300">Estado</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2 text-slate-200 uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalPerfilOpen(false)}
                  className="bg-[#1f2937] text-slate-300 px-3 py-1.5 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0284c7] text-white font-bold px-4 py-1.5 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={carrinho}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
}

function CardProdutoOriginal({ produto, isEditing, onEdit, onAddToCart, onDelete }) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');

  const nome = produto.nome || 'Produto sem nome';
  const preco = Number(produto.preco) || 0;
  const imagem = produto.imagemUrl || produto.imagem || produto.foto;
  const tamanhos = produto.tamanhos || produto.estoquePorTamanho || {};

  const estoqueTotal = Object.values(tamanhos).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  return (
    <div
      className={`bg-[#131a27] border rounded-xl overflow-hidden p-3.5 flex flex-col justify-between transition ${isEditing ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-800/80'
        }`}
    >
      <div>
        <div className="relative h-44 bg-[#0b101d] rounded-lg overflow-hidden mb-2.5 border border-slate-800/60 flex items-center justify-center">
          {imagem ? (
            <img src={imagem} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-500 text-xs">Sem Imagem</span>
          )}
          <span className="absolute top-2 right-2 bg-[#0b101d]/90 text-sky-400 text-[10px] px-2 py-0.5 rounded border border-sky-500/30 font-semibold">
            Estoque Total: {estoqueTotal}
          </span>
        </div>

        <h4 className="font-bold text-xs text-slate-100 mb-0.5 truncate" title={nome}>{nome}</h4>
        <p className="text-sky-400 font-extrabold text-sm mb-2">
          R$ {preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        <div className="space-y-1 mb-2">
          <span className="block text-[10px] text-slate-500 font-semibold">Tamanhos:</span>
          <div className="flex flex-wrap gap-1">
            {TAMANHOS_PADRAO.map((size) => {
              const stock = Number(tamanhos[size]) || 0;
              if (stock === 0) return null;
              return (
                <button
                  key={size}
                  onClick={() => {
                    setTamanhoSelecionado(size);
                    onAddToCart(produto, size);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition ${tamanhoSelecionado === size
                      ? 'bg-[#0284c7] border-sky-500 text-white'
                      : 'bg-[#0b101d] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                >
                  {size} ({stock})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex gap-2">
        <button
          onClick={() => onEdit(produto)}
          className="flex-1 bg-[#1f2937] hover:bg-slate-700 text-slate-200 font-bold py-1.5 rounded text-[11px] transition border border-slate-700/50"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(produto.id)}
          className="bg-red-950/30 hover:bg-red-900/50 text-red-400 font-bold px-3 py-1.5 rounded text-[11px] border border-red-900/40 transition"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}