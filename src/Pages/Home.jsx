import React, { useState } from 'react';

export default function Home({ produtos, carregandoProdutos, onAddToCart, dadosPerfil, IrParaPerfil, onRecarregar, marcasDisponiveis }) {
  const [busca, setBusca] = useState('');
  const [marcasSelecionadas, setMarcasSelecionadas] = useState([]);
  const [produtoModal, setProdutoModal] = useState(null);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');

  // Manipular alteração das checkboxes de marcas
  const handleToggleMarca = (marca) => {
    setMarcasSelecionadas(prev =>
      prev.includes(marca)
        ? prev.filter(m => m !== marca)
        : [...prev, marca]
    );
  };

  // Filtra os produtos com base na pesquisa de texto e nas marcas selecionadas
  const produtosFiltrados = produtos.filter(produto => {
    const correspondeBusca =
      produto.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      produto.marca?.toLowerCase().includes(busca.toLowerCase());

    const correspondeMarca =
      marcasSelecionadas.length === 0 ||
      marcasSelecionadas.some(m => m.toLowerCase() === produto.marca?.toLowerCase());

    return correspondeBusca && correspondeMarca;
  });

  // Função auxiliar para obter a lista de tamanhos do produto
  const obterTamanhos = (produto) => {
    return produto.tamanhosEstoque || produto.tamanhos || [];
  };

  const abrirModalTamanhos = (produto) => {
    setProdutoModal(produto);
    const listaTamanhos = obterTamanhos(produto);

    if (Array.isArray(listaTamanhos) && listaTamanhos.length > 0) {
      setTamanhoSelecionado(listaTamanhos[0].tamanho);
    } else {
      setTamanhoSelecionado(produto.tamanhoDisponivel || 'Único');
    }
  };

  const confirmarAdicaoCarrinho = () => {
    if (!produtoModal) return;
    onAddToCart(produtoModal, tamanhoSelecionado);
    setProdutoModal(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Aviso caso o perfil esteja incompleto */}
      {dadosPerfil && (!dadosPerfil.nome || !dadosPerfil.telefone || !dadosPerfil.rua) && (
        <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-amber-200">
          <p>⚠️ O seu perfil está incompleto. Complete os seus dados para facilitar as suas compras.</p>
          <button
            onClick={IrParaPerfil}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl transition text-xs shrink-0 cursor-pointer"
          >
            Completar Perfil →
          </button>
        </div>
      )}

      {/* Cabeçalho com Título e Barra de Pesquisa */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Catálogo de Sneakers</h1>
          <p className="text-slate-400 text-xs">Encontre os melhores modelos e lançamentos exclusivos.</p>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Pesquisar sneaker ou marca..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Layout Principal: Filtros à Esquerda + Produtos à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Painel Lateral de Filtros */}
        <aside className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200">Filtrar por Marca</h2>
            {marcasSelecionadas.length > 0 && (
              <button
                onClick={() => setMarcasSelecionadas([])}
                className="text-[10px] text-sky-400 hover:underline cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {Array.isArray(marcasDisponiveis) && marcasDisponiveis.map((marca, index) => {
              const selecionada = marcasSelecionadas.includes(marca);
              return (
                <label
                  key={index}
                  className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer hover:text-slate-100 transition"
                >
                  <input
                    type="checkbox"
                    checked={selecionada}
                    onChange={() => handleToggleMarca(marca)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <span>{marca}</span>
                </label>
              );
            })}
          </div>
        </aside>

        {/* Grelha de Produtos */}
        <div className="lg:col-span-3">
          {carregandoProdutos ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium animate-pulse">A carregar catálogo de sneakers...</p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl">
              <p className="text-3xl">👟</p>
              <p className="text-sm font-medium">Nenhum produto encontrado.</p>
              <p className="text-xs text-slate-600">Tente ajustar os filtros de marca ou a pesquisa.</p>

              {onRecarregar && (
                <button
                  onClick={onRecarregar}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700 shadow-md"
                >
                  🔄 Recarregar Catálogo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtosFiltrados.map(produto => {
                const listaTamanhos = obterTamanhos(produto);
                return (
                  <div key={produto.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-lg">
                    <div>
                      {produto.imagem || produto.foto ? (
                        <img
                          src={produto.imagem || produto.foto}
                          alt={produto.nome}
                          className="w-full h-48 object-cover rounded-xl mb-3 bg-slate-950"
                        />
                      ) : (
                        <div className="w-full h-48 bg-slate-950 rounded-xl mb-3 flex items-center justify-center text-slate-600 text-xs">
                          Sem imagem
                        </div>
                      )}
                      <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-900/50">
                        {produto.marca || 'Sneaker'}
                      </span>
                      <h3 className="font-bold text-slate-100 text-sm mt-1 line-clamp-1">{produto.nome}</h3>
                      <p className="text-slate-400 text-xs mt-1 font-semibold">
                        R$ {Number(produto.preco).toFixed(2)}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {Array.isArray(listaTamanhos) && listaTamanhos.length > 0 ? (
                          listaTamanhos.map((t, idx) => {
                            const qtd = Number(t.quantidade ?? t.qtd ?? 0);
                            return (
                              <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border ${qtd > 0 ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-950 border-slate-900 text-slate-600 line-through'}`}>
                                {t.tamanho}
                              </span>
                            );
                          })
                        ) : produto.tamanhoDisponivel ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-slate-800 border-slate-700 text-slate-300">
                            {produto.tamanhoDisponivel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => abrirModalTamanhos(produto)}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <span>🛒 Selecionar Tamanho</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE TAMANHO */}
      {produtoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl text-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-900/50">
                  {produtoModal.marca || 'Sneaker'}
                </span>
                <h2 className="text-lg font-bold mt-1">{produtoModal.nome}</h2>
                <p className="text-sky-400 font-bold text-sm">R$ {Number(produtoModal.preco).toFixed(2)}</p>
              </div>
              <button
                onClick={() => setProdutoModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Escolha o Tamanho Disponível:</label>

              <div className="grid grid-cols-4 gap-2">
                {(() => {
                  const listaTamanhos = obterTamanhos(produtoModal);
                  return Array.isArray(listaTamanhos) && listaTamanhos.length > 0 ? (
                    listaTamanhos.map((item, idx) => {
                      const qtd = Number(item.quantidade ?? item.qtd ?? 0);
                      const esgotado = qtd <= 0;
                      const selecionado = tamanhoSelecionado === item.tamanho;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={esgotado}
                          onClick={() => setTamanhoSelecionado(item.tamanho)}
                          className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition ${esgotado
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                            : selecionado
                              ? 'bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-900/30 cursor-pointer'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                            }`}
                        >
                          <span className="text-sm">{item.tamanho}</span>
                          <span className="text-[9px] font-normal opacity-80 mt-0.5">
                            {esgotado ? 'Esgotado' : `${qtd} disp.`}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-4">
                      <button
                        type="button"
                        onClick={() => setTamanhoSelecionado(produtoModal.tamanhoDisponivel || 'Único')}
                        className="w-full py-3 rounded-xl border text-xs font-bold bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-900/30 flex flex-col items-center justify-center"
                      >
                        <span className="text-sm">{produtoModal.tamanhoDisponivel || 'Único'}</span>
                        <span className="text-[9px] font-normal opacity-80 mt-0.5">Tamanho único</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProdutoModal(null)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAdicaoCarrinho}
                className="w-1/2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}