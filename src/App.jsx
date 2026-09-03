import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import "./App.css";

const TAMANHOS_PADRAO = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
];

function App() {
  const [nome, setNome] = useState("");
  const [precoDisplay, setPrecoDisplay] = useState("");
  const [tamanhos, setTamanhos] = useState({});
  const [imagemUrl, setImagemUrl] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [idEditando, setIdEditando] = useState(null);

  // Estados para Busca, Filtro e Ordenação
  const [busca, setBusca] = useState("");
  const [filtroTamanho, setFiltroTamanho] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");

  const produtosCollectionRef = collection(db, "produtos");

  const estoqueTotal = Object.values(tamanhos).reduce(
    (acc, qtd) => acc + (Number(qtd) || 0),
    0,
  );

  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const apenasNumeros = valor.replace(/\D/g, "");
    if (!apenasNumeros) return "";
    const valorNumerico = parseFloat(apenasNumeros) / 100;
    return valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const converterMoedaParaNumero = (strMoeda) => {
    if (!strMoeda) return 0;
    const apenasNumeros = strMoeda.replace(/\D/g, "");
    return parseFloat(apenasNumeros) / 100;
  };

  const handlePrecoChange = (e) => {
    const valorDigitado = e.target.value;
    setPrecoDisplay(formatarMoeda(valorDigitado));
  };

  const handleTamanhoChange = (tamanho, quantidade) => {
    const qtdNum = Math.max(0, parseInt(quantidade, 10) || 0);
    setTamanhos((prev) => {
      const novos = { ...prev };
      if (qtdNum > 0) {
        novos[tamanho] = qtdNum;
      } else {
        delete novos[tamanho];
      }
      return novos;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const carregarProdutos = async () => {
    try {
      const data = await getDocs(produtosCollectionRef);
      setProdutos(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const precoNumerico = converterMoedaParaNumero(precoDisplay);

    if (!nome || precoNumerico <= 0 || estoqueTotal <= 0) {
      alert(
        "Por favor, informe o nome, preço e a quantidade em pelo menos um tamanho.",
      );
      return;
    }

    try {
      if (idEditando) {
        const produtoDoc = doc(db, "produtos", idEditando);
        await updateDoc(produtoDoc, {
          nome,
          preco: precoNumerico,
          estoque: estoqueTotal,
          tamanhos,
          imagemUrl,
        });
        setIdEditando(null);
      } else {
        await addDoc(produtosCollectionRef, {
          nome,
          preco: precoNumerico,
          estoque: estoqueTotal,
          tamanhos,
          imagemUrl,
          criadoEm: new Date(),
        });
      }

      setNome("");
      setPrecoDisplay("");
      setTamanhos({});
      setImagemUrl("");
      carregarProdutos();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  const deletarProduto = async (id) => {
    try {
      const produtoDoc = doc(db, "produtos", id);
      await deleteDoc(produtoDoc);
      carregarProdutos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const iniciarEdicao = (produto) => {
    setIdEditando(produto.id);
    setNome(produto.nome);
    const precoCentavos = Math.round(produto.preco * 100).toString();
    setPrecoDisplay(formatarMoeda(precoCentavos));
    setTamanhos(produto.tamanhos || {});
    setImagemUrl(produto.imagemUrl || "");
  };

  const cancelarEdicao = () => {
    setIdEditando(null);
    setNome("");
    setPrecoDisplay("");
    setTamanhos({});
    setImagemUrl("");
  };

  // Aplicação dos Filtros (Busca + Tamanho + Ordenação)
  const produtosFiltrados = produtos
    .filter((prod) => {
      const atendeBusca = prod.nome.toLowerCase().includes(busca.toLowerCase());
      const atendeTamanho = filtroTamanho
        ? prod.tamanhos && prod.tamanhos[filtroTamanho] > 0
        : true;
      return atendeBusca && atendeTamanho;
    })
    .sort((a, b) => {
      if (ordenacao === "menor-preco") return a.preco - b.preco;
      if (ordenacao === "maior-preco") return b.preco - a.preco;
      if (ordenacao === "maior-estoque")
        return (b.estoque || 0) - (a.estoque || 0);
      return 0; // Padrão: Ordem do Firebase
    });

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">🛍️ Catálogo de Produtos</h1>
        <p className="subtitle">
          Gerencie e visualize seu inventário em tempo real
        </p>
      </header>

      <div className="main-content">
        {/* Formulário na Coluna Esquerda */}
        <aside className="sidebar">
          <section className="card-form">
            <h2 className="card-title">
              {idEditando ? "✏️ Editar Produto" : "➕ Novo Produto"}
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

              <div className="input-group">
                <label className="label">
                  Imagem do Produto (Arquivo Local)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="input"
                />
                {imagemUrl && (
                  <div style={{ marginTop: "10px", textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginBottom: "4px",
                      }}
                    >
                      Pré-visualização:
                    </p>
                    <img
                      src={imagemUrl}
                      alt="Pré-visualização"
                      style={{
                        maxWidth: "100px",
                        maxHeight: "100px",
                        borderRadius: "6px",
                        objectFit: "cover",
                      }}
                    />
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
                        value={tamanhos[tam] || ""}
                        onChange={(e) =>
                          handleTamanhoChange(tam, e.target.value)
                        }
                        className="tamanho-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="button-group">
                <button type="submit" className="btn-primary">
                  {idEditando ? "Atualizar Produto" : "Cadastrar Produto"}
                </button>
                {idEditando && (
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>
        </aside>

        {/* Área Principal de Filtros e Exibição de Produtos */}
        <main className="content-area">
          {/* Barra de Busca e Ordenação */}
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
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                className="select-input"
              >
                <option value="recentes">Padrão</option>
                <option value="menor-preco">Menor Preço</option>
                <option value="maior-preco">Maior Preço</option>
                <option value="maior-estoque">Maior Estoque</option>
              </select>
            </div>
          </div>

          {/* Filtro Rápido por Tamanhos */}
          <div className="filter-tamanhos-container">
            <span className="filter-tamanhos-label">Filtrar por Tamanho:</span>
            <div className="filter-tamanhos-buttons">
              <button
                className={`filter-btn ${filtroTamanho === "" ? "active" : ""}`}
                onClick={() => setFiltroTamanho("")}
              >
                Todos
              </button>
              {TAMANHOS_PADRAO.map((tam) => (
                <button
                  key={tam}
                  className={`filter-btn ${filtroTamanho === tam ? "active" : ""}`}
                  onClick={() =>
                    setFiltroTamanho(filtroTamanho === tam ? "" : tam)
                  }
                >
                  {tam}
                </button>
              ))}
            </div>
          </div>

          <h3 className="section-title">
            Produtos Disponíveis ({produtosFiltrados.length})
          </h3>

          {produtosFiltrados.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum produto encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="grid">
              {produtosFiltrados.map((prod) => (
                <div key={prod.id} className="card-product">
                  <div className="product-badge">
                    Estoque Total:{" "}
                    {prod.estoque !== undefined ? prod.estoque : 0}
                  </div>

                  <div className="product-image-container">
                    {prod.imagemUrl ? (
                      <img
                        src={prod.imagemUrl}
                        alt={prod.nome}
                        className="product-image"
                      />
                    ) : (
                      <div className="no-image-placeholder">📦 Sem Imagem</div>
                    )}
                  </div>

                  <h4 className="product-name">{prod.nome}</h4>
                  <div className="product-price">
                    R${" "}
                    {Number(prod.preco).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>

                  <div className="tamanhos-card-container">
                    <span className="tamanhos-card-title">Tamanhos:</span>
                    <div className="tamanhos-badges">
                      {prod.tamanhos &&
                      Object.keys(prod.tamanhos).length > 0 ? (
                        Object.entries(prod.tamanhos).map(([tam, qtd]) => (
                          <span
                            key={tam}
                            className={`tamanho-badge ${filtroTamanho === tam ? "highlight" : ""}`}
                          >
                            {tam} <small>({qtd})</small>
                          </span>
                        ))
                      ) : (
                        <span className="tamanho-badge-empty">
                          Sem estoque por tamanho
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      onClick={() => iniciarEdicao(prod)}
                      className="btn-edit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deletarProduto(prod.id)}
                      className="btn-delete"
                    >
                      Excluir
                    </button>
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
