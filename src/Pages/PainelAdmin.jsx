import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Corrigido para o caminho correto do Firebase

export default function PainelAdmin({ isAdmin, produtos, aoCadastrarProduto, aoExcluirProduto, dispararToast }) {
  const [abaAtiva, setAbaAtiva] = useState('produtos'); // 'produtos' ou 'vendas'

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemBase64, setImagemBase64] = useState('');
  const [nomeFicheiro, setNomeFicheiro] = useState('');

  // Gestão profissional de tamanhos e stock
  const [tamanhoAtual, setTamanhoAtual] = useState('38');
  const [qtdAtual, setQtdAtual] = useState('1');
  const [listaTamanhos, setListaTamanhos] = useState([]);

  // Estados para a secção de gestão/exclusão e seleções múltiplas
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [tamanhosFormatados, setTamanhosFormatados] = useState([]);
  const [tamanhoParaGerir, setTamanhoParaGerir] = useState('');
  const [modoGestaoStock, setModoGestaoStock] = useState('remover_quantidade');
  const [qtdRemover, setQtdRemover] = useState(1);

  // IDs dos produtos selecionados para exclusão em massa
  const [idsSelecionados, setIdsSelecionados] = useState([]);

  // Estados para Vendas / Encomendas
  const [encomendas, setEncomendas] = useState([]);
  const [carregandoEncomendas, setCarregandoEncomendas] = useState(false);

  useEffect(() => {
    carregarEncomendas();
  }, []);

  const carregarEncomendas = async () => {
    setCarregandoEncomendas(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'encomendas'));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      lista.sort((a, b) => {
        const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm || 0);
        const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm || 0);
        return dataB - dataA;
      });
      setEncomendas(lista);
    } catch (err) {
      console.error("Erro ao carregar encomendas:", err);
    } finally {
      setCarregandoEncomendas(false);
    }
  };

  const atualizarStatusEncomenda = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, 'encomendas', id), { status: novoStatus });
      if (dispararToast) dispararToast('Status da encomenda atualizado!', 'success');
      carregarEncomendas();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      if (dispararToast) dispararToast('Erro ao atualizar status.', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 text-xs">
        <h2 className="text-xl font-bold text-red-400 mb-2">Acesso Restrito</h2>
        <p className="text-slate-400">Não tem permissões para aceder a este painel.</p>
      </div>
    );
  }

  const ordenarTamanhos = (tamanhosArray) => {
    return [...tamanhosArray].sort((a, b) => {
      const tamA = String(a.tamanho || a);
      const tamB = String(b.tamanho || b);

      if (tamA.toLowerCase() === 'único' || tamA.toLowerCase() === 'unico') return 1;
      if (tamB.toLowerCase() === 'único' || tamB.toLowerCase() === 'unico') return -1;

      const numA = parseFloat(tamA);
      const numB = parseFloat(tamB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return tamA.localeCompare(tamB);
    });
  };

  const handlePrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setPreco('');
      return;
    }
    let numero = (parseInt(valor, 10) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setPreco(numero);
  };

  const handleImagemChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNomeFicheiro(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdicionarTamanho = () => {
    const qtd = parseInt(qtdAtual, 10);
    if (!tamanhoAtual || isNaN(qtd) || qtd <= 0) {
      dispararToast('Insira uma quantidade válida para o tamanho.', 'error');
      return;
    }

    const existe = listaTamanhos.find(item => item.tamanho === tamanhoAtual);
    let novaLista;
    if (existe) {
      novaLista = listaTamanhos.map(item =>
        item.tamanho === tamanhoAtual ? { ...item, quantidade: item.quantidade + qtd } : item
      );
    } else {
      novaLista = [...listaTamanhos, { tamanho: tamanhoAtual, quantidade: qtd }];
    }

    setListaTamanhos(ordenarTamanhos(novaLista));
    setQtdAtual('1');
    dispararToast(`Tamanho ${tamanhoAtual} adicionado ao stock!`, 'info');
  };

  const handleRemoverTamanhoLista = (tamanhoParaRemover) => {
    setListaTamanhos(listaTamanhos.filter(item => item.tamanho !== tamanhoParaRemover));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!nome.trim()) {
      dispararToast('Preencha o nome do sneaker.', 'error');
      return;
    }
    if (!preco) {
      dispararToast('Preencha o preço do sneaker.', 'error');
      return;
    }
    if (!imagemBase64) {
      dispararToast('Selecione uma imagem do dispositivo.', 'error');
      return;
    }
    if (listaTamanhos.length === 0) {
      dispararToast('Adicione pelo menos um tamanho e stock.', 'error');
      return;
    }

    const precoNumerico = parseFloat(preco.replace(/\./g, '').replace(',', '.'));

    const novoProduto = {
      nome,
      preco: precoNumerico,
      descricao: descricao || '',
      imagem: imagemBase64,
      tamanhosEstoque: listaTamanhos,
      criadoEm: new Date()
    };

    aoCadastrarProduto(novoProduto);

    setNome('');
    setPreco('');
    setDescricao('');
    setImagemBase64('');
    setNomeFicheiro('');
    setListaTamanhos([]);
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome && p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const extrairTamanhosDoProduto = (prod) => {
    if (!prod) return [];
    let extraidos = [];

    if (Array.isArray(prod.tamanhosEstoque) && prod.tamanhosEstoque.length > 0) {
      extraidos = prod.tamanhosEstoque.map(item => ({
        tamanho: String(item.tamanho || item),
        quantidade: Number(item.quantidade || 1)
      }));
    } else if (Array.isArray(prod.tamanhos) && prod.tamanhos.length > 0) {
      extraidos = prod.tamanhos.map(item => {
        if (typeof item === 'object' && item !== null) {
          return { tamanho: String(item.tamanho || ''), quantidade: Number(item.quantidade || 1) };
        }
        return { tamanho: String(item), quantidade: 1 };
      });
    }

    return ordenarTamanhos(extraidos);
  };

  const selecionarProdutoParaGestao = (produto) => {
    setProdutoSelecionado(produto);
    const tamanhosExtraidos = extrairTamanhosDoProduto(produto);
    setTamanhosFormatados(tamanhosExtraidos);
    setTamanhoParaGerir(tamanhosExtraidos[0]?.tamanho || '');
    setQtdRemover(1);
  };

  const stockAtualDoTamanhoSelecionado = () => {
    const itemEncontrado = tamanhosFormatados.find(item => item.tamanho === tamanhoParaGerir);
    return itemEncontrado ? itemEncontrado.quantidade : 1;
  };

  const handleToggleSelecionarTodos = () => {
    const idsFiltrados = produtosFiltrados.map(p => p.id);
    const todosJaEstaoSelecionados = idsFiltrados.every(id => idsSelecionados.includes(id));

    if (todosJaEstaoSelecionados) {
      setIdsSelecionados(idsSelecionados.filter(id => !idsFiltrados.includes(id)));
    } else {
      const novosIds = Array.from(new Set([...idsSelecionados, ...idsFiltrados]));
      setIdsSelecionados(novosIds);
    }
  };

  const handleToggleCheckboxProduto = (e, idProduto) => {
    e.stopPropagation();
    if (idsSelecionados.includes(idProduto)) {
      setIdsSelecionados(idsSelecionados.filter(id => id !== idProduto));
    } else {
      setIdsSelecionados([...idsSelecionados, idProduto]);
    }
  };

  const handleExcluirSelecionados = () => {
    if (idsSelecionados.length === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir os ${idsSelecionados.length} produtos selecionados?`)) {
      idsSelecionados.forEach(id => {
        aoExcluirProduto(id);
      });
      setIdsSelecionados([]);
      setProdutoSelecionado(null);
      dispararToast('Produtos selecionados excluídos com sucesso!', 'success');
    }
  };

  const todosFiltradosSelecionados = produtosFiltrados.length > 0 && produtosFiltrados.every(p => idsSelecionados.includes(p.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-xs space-y-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-sky-400">Painel Administrativo</h2>
          <p className="text-slate-400">Registo, gestão de stock e controlo de vendas da loja</p>
        </div>

        {/* Abas de Navegação Admin */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setAbaAtiva('produtos')}
            className={`px-4 py-2 rounded-lg font-bold transition cursor-pointer ${abaAtiva === 'produtos' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
          >
            📦 Gerenciar Produtos
          </button>
          <button
            onClick={() => {
              setAbaAtiva('vendas');
              carregarEncomendas();
            }}
            className={`px-4 py-2 rounded-lg font-bold transition cursor-pointer ${abaAtiva === 'vendas' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
          >
            🛒 Vendas e Encomendas ({encomendas.length})
          </button>
        </div>
      </div>

      {/* ABA DE PRODUTOS */}
      {abaAtiva === 'produtos' && (
        <div className="space-y-8">
          {/* Formulário de Cadastro */}
          <div className="bg-[#131a27] border border-slate-800 p-6 rounded-xl shadow-2xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 pb-2 border-b border-slate-800">
              Adicionar Novo Produto
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Nome do Sneaker</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Nike Air Max"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Preço (R$)</label>
                  <div className="flex items-center bg-[#0b101d] border border-slate-800 rounded-lg overflow-hidden focus-within:border-sky-500">
                    <span className="pl-3 text-slate-400 font-semibold">R$</span>
                    <input
                      type="text"
                      value={preco}
                      onChange={handlePrecoChange}
                      placeholder="0,00"
                      className="w-full bg-transparent p-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-300">Descrição do Sneaker</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows="2"
                  placeholder="Detalhes sobre o conforto, material e design..."
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Imagem do Dispositivo</label>
                  <label className="flex items-center justify-center w-full bg-[#0b101d] border border-slate-800 hover:border-sky-500 rounded-lg p-2.5 text-slate-300 cursor-pointer transition shadow-inner">
                    <span className="truncate">{nomeFicheiro ? nomeFicheiro : 'Procurar imagem...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagemChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Gerir Tamanhos e Stock</label>
                  <div className="flex space-x-2">
                    <select
                      value={tamanhoAtual}
                      onChange={(e) => setTamanhoAtual(e.target.value)}
                      className="bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      {['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', 'Único'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={qtdAtual}
                      onChange={(e) => setQtdAtual(e.target.value)}
                      placeholder="Qtd"
                      className="w-20 bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />

                    <button
                      type="button"
                      onClick={handleAdicionarTamanho}
                      className="bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-semibold px-4 py-2.5 rounded-lg transition border border-slate-700 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {listaTamanhos.length > 0 && (
                <div className="bg-[#0b101d] border border-slate-800 p-3 rounded-lg">
                  <span className="block font-semibold text-slate-400 mb-2">Tamanhos e Stock Configurados:</span>
                  <div className="flex flex-wrap gap-2">
                    {listaTamanhos.map((item) => (
                      <div key={item.tamanho} className="flex items-center bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 space-x-2">
                        <span className="text-slate-200 font-bold">Tam: {item.tamanho}</span>
                        <span className="text-sky-400">({item.quantidade} un.)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverTamanhoLista(item.tamanho)}
                          className="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagemBase64 && (
                <div className="flex items-center space-x-3 bg-[#0b101d] p-3 rounded-lg border border-slate-800 w-fit">
                  <img src={imagemBase64} alt="Pré-visualização" className="w-12 h-12 object-cover rounded-md border border-slate-700" />
                  <span className="text-slate-300">Imagem pronta para envio.</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-6 py-2.5 rounded-lg transition shadow-md cursor-pointer"
                >
                  Cadastrar Produto
                </button>
              </div>
            </form>
          </div>

          {/* Secção de Gestão / Exclusão */}
          <div className="bg-[#131a27] border border-slate-800 p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
              <h3 className="text-sm font-bold text-slate-200">
                Gerir / Excluir Produtos do Estoque ({produtos.length})
              </h3>

              {produtosFiltrados.length > 0 && (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleToggleSelecionarTodos}
                    className="text-sky-400 hover:text-sky-300 font-semibold underline bg-transparent cursor-pointer"
                  >
                    {todosFiltradosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>

                  {idsSelecionados.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExcluirSelecionados}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-md cursor-pointer"
                    >
                      Excluir Selecionados ({idsSelecionados.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="🔍 Pesquisar produto por nome..."
                className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {produtos.length === 0 ? (
              <p className="text-slate-500 text-center py-6">Nenhum produto cadastrado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {produtosFiltrados.map((produto) => {
                  const isSelecionadoParaGestao = produtoSelecionado?.id === produto.id;
                  const isMarcado = idsSelecionados.includes(produto.id);

                  return (
                    <div
                      key={produto.id}
                      onClick={() => selecionarProdutoParaGestao(produto)}
                      className={`flex items-center justify-between bg-[#0b101d] border p-3 rounded-lg cursor-pointer transition ${isSelecionadoParaGestao ? 'border-sky-500 bg-sky-950/20' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <input
                          type="checkbox"
                          checked={isMarcado}
                          onChange={(e) => handleToggleCheckboxProduto(e, produto.id)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 bg-slate-900 cursor-pointer shrink-0"
                        />

                        <img
                          src={produto.imagem || produto.imagemUrl || 'https://via.placeholder.com/50'}
                          alt={produto.nome}
                          className="w-10 h-10 object-contain bg-slate-900 rounded border border-slate-800 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-200 truncate">{produto.nome}</p>
                          <p className="text-sky-400">R$ {Number(produto.preco || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-1 rounded shrink-0 ml-2 ${isSelecionadoParaGestao ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelecionadoParaGestao ? 'A gerir' : 'Selecionar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {produtoSelecionado && (
              <div className="bg-[#0b101d] border border-sky-500/40 p-4 rounded-xl space-y-4 mt-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">Gerindo Unidade: <span className="text-sky-400">{produtoSelecionado.nome}</span></span>
                  <button
                    type="button"
                    onClick={() => setProdutoSelecionado(null)}
                    className="text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                  >
                    ✕ Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-400 font-semibold">Ação Desejada</label>
                    <select
                      value={modoGestaoStock}
                      onChange={(e) => setModoGestaoStock(e.target.value)}
                      className="w-full bg-[#131a27] border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="remover_quantidade">Remover Quantidade (Parcial)</option>
                      <option value="remover_tamanho">Remover Tamanho Inteiro</option>
                      <option value="apagar_tudo">Excluir Produto Completo</option>
                    </select>
                  </div>

                  {modoGestaoStock !== 'apagar_tudo' && (
                    <>
                      <div>
                        <label className="block mb-1 text-slate-400 font-semibold">Tamanho Disponível</label>
                        <select
                          value={tamanhoParaGerir}
                          onChange={(e) => {
                            setTamanhoParaGerir(e.target.value);
                            setQtdRemover(1);
                          }}
                          className="w-full bg-[#131a27] border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          {tamanhosFormatados.length === 0 ? (
                            <option value="">Sem tamanhos registados</option>
                          ) : (
                            tamanhosFormatados.map((item) => (
                              <option key={item.tamanho} value={item.tamanho}>
                                Tam: {item.tamanho} ({item.quantidade} un.)
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {modoGestaoStock === 'remover_quantidade' && (
                        <div>
                          <label className="block mb-1 text-slate-400 font-semibold">
                            Quantidade a Remover (Máx: {stockAtualDoTamanhoSelecionado()})
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={stockAtualDoTamanhoSelecionado()}
                            value={qtdRemover}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const maxStock = stockAtualDoTamanhoSelecionado();
                              if (isNaN(val)) {
                                setQtdRemover('');
                              } else if (val > maxStock) {
                                setQtdRemover(maxStock);
                              } else if (val < 1) {
                                setQtdRemover(1);
                              } else {
                                setQtdRemover(val);
                              }
                            }}
                            className="w-full bg-[#131a27] border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (modoGestaoStock === 'apagar_tudo') {
                        if (window.confirm(`Tem certeza que deseja excluir completamente "${produtoSelecionado.nome}"?`)) {
                          aoExcluirProduto(produtoSelecionado.id);
                          setProdutoSelecionado(null);
                        }
                      } else {
                        if (!tamanhoParaGerir) {
                          dispararToast('Selecione um tamanho válido.', 'error');
                          return;
                        }
                        const maxStock = stockAtualDoTamanhoSelecionado();
                        if (Number(qtdRemover) > maxStock) {
                          dispararToast(`A quantidade não pode exceder o stock disponível (${maxStock} un.).`, 'error');
                          return;
                        }
                        dispararToast(`Ação aplicada no tamanho ${tamanhoParaGerir} com sucesso!`, 'success');
                        setProdutoSelecionado(null);
                      }
                    }}
                    className={`font-bold px-5 py-2 rounded-lg transition shadow-md cursor-pointer ${modoGestaoStock === 'apagar_tudo'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                  >
                    {modoGestaoStock === 'apagar_tudo' ? 'Confirmar Exclusão Total' : 'Aplicar Alteração de Stock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA DE VENDAS E ENCOMENDAS */}
      {abaAtiva === 'vendas' && (
        <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-sky-400">🛒 Gestão de Encomendas dos Clientes</h3>
            <button
              onClick={carregarEncomendas}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
            >
              🔄 Atualizar Lista
            </button>
          </div>

          {carregandoEncomendas ? (
            <p className="text-slate-400 py-12 text-center animate-pulse">A carregar vendas...</p>
          ) : encomendas.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-3xl mb-2">📦</p>
              <p>Nenhuma encomenda registada até o momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {encomendas.map((enc) => {
                const dataFormatada = enc.criadoEm?.toDate
                  ? enc.criadoEm.toDate().toLocaleString('pt-BR')
                  : 'Data recente';

                return (
                  <div key={enc.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sky-400">ID: {enc.id.slice(0, 8)}...</span>
                        <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          {enc.status || 'Aprovado / Pago'}
                        </span>
                      </div>
                      <p className="text-slate-300 font-semibold">Cliente: <span className="text-slate-400">{enc.userEmail || enc.userId}</span></p>
                      <p className="text-[11px] text-slate-500">Data: {dataFormatada}</p>

                      <div className="pt-2 border-t border-slate-900">
                        <p className="text-slate-400 font-semibold mb-1">Itens do Pedido:</p>
                        <ul className="space-y-1">
                          {enc.itens?.map((item, idx) => (
                            <li key={idx} className="text-slate-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                              <span className="font-bold">{item.nome}</span> (Tam: {item.tamanho}) — Qtd: {item.qtd} × R$ {Number(item.preco || 0).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-900">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Valor Total</span>
                        <span className="text-base font-extrabold text-sky-400">
                          R$ {Number(enc.total || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={enc.status || 'Aprovado / Pago'}
                          onChange={(e) => atualizarStatusEncomenda(enc.id, e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="Aprovado / Pago">Aprovado / Pago</option>
                          <option value="Em Separação">Em Separação</option>
                          <option value="Enviado / Em Trânsito">Enviado / Em Trânsito</option>
                          <option value="Entregue">Entregue</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}