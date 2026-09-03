import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import './App.css';


const TAMANHOS_PADRAO = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];

function App() {
  // Estados de Autenticação
  const [usuario, setUsuario] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');
  const [isCriandoConta, setIsCriandoConta] = useState(false);
  const [erroAuth, setErroAuth] = useState('');

  // Estados da Aplicação
  const [nome, setNome] = useState('');
  const [precoDisplay, setPrecoDisplay] = useState('');
  const [tamanhos, setTamanhos] = useState({});
  const [imagemUrl, setImagemUrl] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [idEditando, setIdEditando] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTamanho, setFiltroTamanho] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

  const produtosCollectionRef = collection(db, 'produtos');

  // Monitora o estado de login do usuário no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregandoAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const estoqueTotal = Object.values(tamanhos).reduce((acc, qtd) => acc + (Number(qtd) || 0), 0);

  const formatarMoeda = (valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    if (!apenasNumeros) return '';
    const valorNumerico = parseFloat(apenasNumeros) / 100;
    return valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const converterMoedaParaNumero = (strMoeda) => {
    if (!strMoeda) return 0;
    const apenasNumeros = strMoeda.replace(/\D/g, '');
    return parseFloat(apenasNumeros) / 100;
  };

  const handlePrecoChange = (e) => setPrecoDisplay(formatarMoeda(e.target.value));

  const handleTamanhoChange = (tamanho, quantidade) => {
    const qtdNum = Math.max(0, parseInt(quantidade, 10) || 0);
    setTamanhos((prev) => {
      const novos = { ...prev };
      if (qtdNum > 0) novos[tamanho] = qtdNum;
      else delete novos[tamanho];
      return novos;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagemUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Funções de Autenticação
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErroAuth('');
    try {
      if (isCriandoConta) {
        await createUserWithEmailAndPassword(auth, emailAuth, senhaAuth);
      } else {
        await signInWithEmailAndPassword(auth, emailAuth, senhaAuth);
      }
      setEmailAuth('');
      setSenhaAuth('');
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErroAuth('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErroAuth('Este e-mail já está cadastrado.');
      } else if (error.code === 'auth/weak-password') {
        setErroAuth('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setErroAuth('Erro na autenticação. Verifique os dados.');
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // CRUD do Catálogo
  const carregarProdutos = async () => {
    try {
      const data = await getDocs(produtosCollectionRef);
      setProdutos(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  useEffect(() => {
    if (usuario) carregarProdutos();
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const precoNumerico = converterMoedaParaNumero(precoDisplay);

    if (!nome || precoNumerico <= 0 || estoqueTotal <= 0) {
      alert('Por favor, informe o nome, preço e a quantidade em pelo menos um tamanho.');
      return;
    }

    try {
      if (idEditando) {
        const produtoDoc = doc(db, 'produtos', idEditando);
        await updateDoc(produtoDoc, { nome, preco: precoNumerico, estoque: estoqueTotal, tamanhos, imagemUrl });
        setIdEditando(null);
      } else {
        await addDoc(produtosCollectionRef, { nome, preco: precoNumerico, estoque: estoqueTotal, tamanhos, imagemUrl, criadoEm: new Date() });
      }

      setNome(''); setPrecoDisplay(''); setTamanhos({}); setImagemUrl('');
      carregarProdutos();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  const deletarProduto = async (id) => {
    try {
      await deleteDoc(doc(db, 'produtos', id));
      carregarProdutos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const iniciarEdicao = (produto) => {
    setIdEditando(produto.id);
    setNome(produto.nome);
    setPrecoDisplay(formatarMoeda(Math.round(produto.preco * 100).toString()));
    setTamanhos(produto.tamanhos || {});
    setImagemUrl(produto.imagemUrl || '');
  };

  const cancelarEdicao = () => {
    setIdEditando(null); setNome(''); setPrecoDisplay(''); setTamanhos({}); setImagemUrl('');
  };

  const produtosFiltrados = produtos
    .filter(prod => {
      const atendeBusca = prod.nome.toLowerCase().includes(busca.toLowerCase());
      const atendeTamanho = filtroTamanho ? prod.tamanhos && prod.tamanhos[filtroTamanho] > 0 : true;
      return atendeBusca && atendeTamanho;
    })
    .sort((a, b) => {
      if (ordenacao === 'menor-preco') return a.preco - b.preco;
      if (ordenacao === 'maior-preco') return b.preco - a.preco;
      if (ordenacao === 'maior-estoque') return (b.estoque || 0) - (a.estoque || 0);
      return 0;
    });

  // Tela de Carregamento Inicial
  if (carregandoAuth) {
    return <div className="loading-container">Carregando sistema...</div>;
  }

  // Tela de Login / Cadastro
  if (!usuario) {
    return (
      <div className="login-container">
        <div className="card-form login-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <img
              src="/sneaker.png"
              alt="Tênis"
              style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))' }}
            />
          </div>
          <h2 className="title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Catálogo</h2>
          <p className="subtitle" style={{ marginBottom: '24px' }}>
            {isCriandoConta ? 'Crie sua conta para acessar' : 'Faça login para acessar o sistema'}
          </p>

          {erroAuth && <div className="error-badge">{erroAuth}</div>}

          <form onSubmit={handleAuthSubmit} className="form">
            <div className="input-group">
              <label className="label">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="input-group">
              <label className="label">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={senhaAuth}
                onChange={(e) => setSenhaAuth(e.target.value)}
                className="input"
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
              {isCriandoConta ? 'Cadastrar Conta' : 'Entrar no Sistema'}
            </button>
          </form>

          <p className="toggle-auth" onClick={() => { setIsCriandoConta(!isCriandoConta); setErroAuth(''); }}>
            {isCriandoConta ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se'}
          </p>
        </div>
      </div>
    );
  }

  // Interface Principal
  return (
    <div className="container">
      <header className="header">
        <div className="user-bar">
          <span>Conectado como: <strong>{usuario.email}</strong></span>
          <button onClick={handleLogout} className="btn-logout">Sair 🚪</button>
        </div>
        <h1 className="title" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img
            src="/sneaker.png"
            alt="Tênis"
            style={{ width: '42px', height: '42px', objectFit: 'contain' }}
          />
          Catálogo de Produtos
        </h1>
        <p className="subtitle">Gerencie e visualize seu inventário em tempo real</p>
      </header>

      <div className="main-content">
        {/* Formulário Lateral */}
        <aside className="sidebar">
          <section className="card-form">
            <h2 className="card-title">
              {idEditando ? '✏️ Editar Produto' : '➕ Novo Produto'}
            </h2>
            <form onSubmit={handleSubmit} className="form">
              <div className="input-group">
                <label className="label">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Tênis Esportivo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {/* Upload de Imagem Customizado */}
              <div className="input-group">
                <label className="label">Imagem do Produto (Arquivo Local)</label>
                <label className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input-hidden"
                  />
                  <span className="file-input-button">📁 Selecionar Imagem</span>
                </label>
                {imagemUrl && (
                  <div className="preview-container">
                    <p className="preview-label">Pré-visualização:</p>
                    <img src={imagemUrl} alt="Pré-visualização" className="preview-image" />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="input-group flex-1">
                  <label className="label">Preço</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={precoDisplay}
                    onChange={handlePrecoChange}
                    className="input"
                    required
                  />
                </div>
                <div className="input-group flex-1">
                  <label className="label">Estoque Total</label>
                  <input
                    type="number"
                    value={estoqueTotal}
                    className="input input-disabled"
                    disabled
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label">Estoque por Tamanho</label>
                <div className="tamanhos-grid">
                  {TAMANHOS_PADRAO.map((tam) => (
                    <div key={tam} className="tamanho-item">
                      <span className="tamanho-label">{tam}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={tamanhos[tam] || ''}
                        onChange={(e) => handleTamanhoChange(tam, e.target.value)}
                        className="tamanho-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="button-group">
                <button type="submit" className="btn-primary">
                  {idEditando ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
                {idEditando && (
                  <button type="button" onClick={cancelarEdicao} className="btn-secondary">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>
        </aside>

        {/* Área Principal de Produtos */}
        <main className="content-area">
          <div className="filter-bar">
            <div className="search-container flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar produto pelo nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="sort-container">
              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} className="select-input">
                <option value="recentes">Padrão</option>
                <option value="menor-preco">Menor Preço</option>
                <option value="maior-preco">Maior Preço</option>
                <option value="maior-estoque">Maior Estoque</option>
              </select>
            </div>
          </div>

          <div className="filter-tamanhos-container">
            <span className="filter-tamanhos-label">Filtrar por Tamanho:</span>
            <div className="filter-tamanhos-buttons">
              <button
                className={`filter-btn ${filtroTamanho === '' ? 'active' : ''}`}
                onClick={() => setFiltroTamanho('')}
              >
                Todos
              </button>
              {TAMANHOS_PADRAO.map((tam) => (
                <button
                  key={tam}
                  className={`filter-btn ${filtroTamanho === tam ? 'active' : ''}`}
                  onClick={() => setFiltroTamanho(filtroTamanho === tam ? '' : tam)}
                >
                  {tam}
                </button>
              ))}
            </div>
          </div>

          <h3 className="section-title">Produtos Disponíveis ({produtosFiltrados.length})</h3>

          {produtosFiltrados.length === 0 ? (
            <div className="empty-state"><p>Nenhum produto encontrado com os filtros aplicados.</p></div>
          ) : (
            <div className="grid">
              {produtosFiltrados.map((prod) => (
                <div key={prod.id} className="card-product">
                  <div className="product-badge">Estoque Total: {prod.estoque !== undefined ? prod.estoque : 0}</div>
                  <div className="product-image-container">
                    {prod.imagemUrl ? (
                      <img src={prod.imagemUrl} alt={prod.nome} className="product-image" />
                    ) : (
                      <div className="no-image-placeholder">📦 Sem Imagem</div>
                    )}
                  </div>
                  <h4 className="product-name">{prod.nome}</h4>
                  <div className="product-price">
                    R$ {Number(prod.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="tamanhos-card-container">
                    <span className="tamanhos-card-title">Tamanhos:</span>
                    <div className="tamanhos-badges">
                      {prod.tamanhos && Object.keys(prod.tamanhos).length > 0 ? (
                        Object.entries(prod.tamanhos).map(([tam, qtd]) => (
                          <span key={tam} className={`tamanho-badge ${filtroTamanho === tam ? 'highlight' : ''}`}>
                            {tam} <small>({qtd})</small>
                          </span>
                        ))
                      ) : (
                        <span className="tamanho-badge-empty">Sem estoque por tamanho</span>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => iniciarEdicao(prod)} className="btn-edit">Editar</button>
                    <button onClick={() => deletarProduto(prod.id)} className="btn-delete">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;