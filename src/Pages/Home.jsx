import React, { useState } from 'react';
import ModalDetalhesProduto from '../components/ModalDetalhesProduto';

export default function Home({ produtos, carregandoProdutos, onAddToCart }) {
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState({});
  const [termoBusca, setTermoBusca] = useState('');
  const [tamanhoFiltro, setTamanhoFiltro] = useState('todos');
  const [ordenacaoPreco, setOrdenacaoPreco] = useState('padrao');

  // Estado para o Modal de Detalhes
  const [produtoSelecionadoModal, setProdutoSelecionadoModal] = useState(null);

  const handleTamanhoChange = (produtoId, tamanho) => {
    setTamanhosSelecionados((prev) => ({ ...prev, [produtoId]: tamanho }));
  };

  const ordenarTamanhos = (tamanhosArray) => {
    if (!Array.isArray(tamanhosArray)) return [];
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

  const obterListaTamanhos = (produto) => {
    let listaBruta = [];

    if (Array.isArray(produto.tamanhosEstoque) && produto.tamanhosEstoque.length > 0) {
      listaBruta = produto.tamanhosEstoque;
    } else {
      const campoTamanhosObj = produto.tamanhos || produto.tamanho;

      if (campoTamanhosObj && typeof campoTamanhosObj === 'object' && !Array.isArray(campoTamanhosObj)) {
        const entradas = Object.entries(campoTamanhosObj);
        if (entradas.length > 0) {
          listaBruta = entradas.map(([tamanho, quantidade]) => ({
            tamanho: String(tamanho).trim(),
            quantidade: Number(quantidade) || 0
          }));
        }
      } else if (Array.isArray(campoTamanhosObj) && campoTamanhosObj.length > 0) {
        listaBruta = campoTamanhosObj.map(t => ({ tamanho: String(t).trim(), quantidade: 10 }));
      } else if (typeof campoTamanhosObj === 'string' && campoTamanhosObj.trim() !== '') {
        listaBruta = campoTamanhosObj.split(',').map(t => ({ tamanho: t.trim(), quantidade: 10 }));
      } else {
        listaBruta = [{ tamanho: 'Único', quantidade: 10 }];
      }
    }

    return ordenarTamanhos(listaBruta);
  };

  const produtosFiltrados = produtos.filter((produto) => {
    const correspondeNome = produto.nome.toLowerCase().includes(termoBusca.toLowerCase());
    const listaTamanhosObj = obterListaTamanhos(produto);

    if (tamanhoFiltro === 'todos') {
      return correspondeNome;
    }

    const temTamanho = listaTamanhosObj.some(item => item.tamanho === tamanhoFiltro && item.quantidade > 0);
    return correspondeNome && temTamanho;
  });

  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    const precoA = Number(a.preco) || 0;
    const precoB = Number(b.preco) || 0;

    if (ordenacaoPreco === 'menor_preco') {
      return precoA - precoB;
    } else if (ordenacaoPreco === 'maior_preco') {
      return precoB - precoA;
    }
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Modal de Detalhes do Produto */}
      <ModalDetalhesProduto
        produto={produtoSelecionadoModal}
        isOpen={Boolean(produtoSelecionadoModal)}
        onClose={() => setProdutoSelecionadoModal(null)}
        onAddToCart={onAddToCart}
        ordenarTamanhos={ordenarTamanhos}
      />

      {/* Cabeçalho e Controlo de Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Catálogo de Sneakers</h1>
          <p className="text-xs text-slate-400">Clique em qualquer modelo para ver os detalhes completos</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-56">
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="🔍 Pesquisar por nome ou marca..."
              className="w-full bg-[#131a27] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 shadow-inner"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={tamanhoFiltro}
              onChange={(e) => setTamanhoFiltro(e.target.value)}
              className="w-full sm:w-auto bg-[#131a27] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="todos">Todos os Tamanhos</option>
              {['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', 'Único'].map(t => (
                <option key={t} value={t}>Tamanho {t}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={ordenacaoPreco}
              onChange={(e) => setOrdenacaoPreco(e.target.value)}
              className="w-full sm:w-auto bg-[#131a27] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="padrao">Ordenar por: Padrão</option>
              <option value="menor_preco">Menor Preço</option>
              <option value="maior_preco">Maior Preço</option>
            </select>
          </div>
        </div>
      </div>

      {carregandoProdutos ? (
        <div className="text-center py-12 text-xs text-slate-400 animate-pulse">A carregar sneakers...</div>
      ) : produtosOrdenados.length === 0 ? (
        <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-12 text-center my-12 text-xs">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-slate-300 font-semibold mb-1">Nenhum sneaker encontrado</p>
          <p className="text-slate-500">Tente procurar por outro termo ou limpar os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {produtosOrdenados.map((produto) => {
            const listaTamanhosObj = obterListaTamanhos(produto);
            const primeiroDisponivel = listaTamanhosObj.find(i => i.quantidade > 0)?.tamanho || listaTamanhosObj[0]?.tamanho || 'Único';
            const tamanhoEscolhido = tamanhosSelecionados[produto.id] || primeiroDisponivel;

            return (
              <div key={produto.id} className="bg-[#131a27] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
                <div
                  onClick={() => setProdutoSelecionadoModal(produto)}
                  className="h-48 bg-slate-900 overflow-hidden flex items-center justify-center p-4 cursor-pointer group"
                >
                  <img
                    src={produto.imagem || produto.imagemUrl || produto.url || produto.foto || produto.image || 'https://via.placeholder.com/300?text=Sem+Imagem'}
                    alt={produto.nome}
                    className="max-h-full object-contain group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300?text=Erro+Na+Imagem';
                    }}
                  />
                </div>
                <div className="p-4 flex flex-col flex-grow text-xs">
                  <h3
                    onClick={() => setProdutoSelecionadoModal(produto)}
                    className="font-bold text-slate-200 text-sm mb-1 cursor-pointer hover:text-sky-400 transition truncate"
                  >
                    {produto.nome}
                  </h3>
                  <p className="text-sky-400 font-extrabold text-sm mb-4">
                    R$ {Number(produto.preco).toFixed(2)}
                  </p>

                  <div className="mb-4 mt-auto">
                    <label className="block text-slate-400 mb-1 font-semibold">Tamanho:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {listaTamanhosObj.map((item) => {
                        const esgotado = item.quantidade <= 0;
                        return (
                          <button
                            key={item.tamanho}
                            type="button"
                            disabled={esgotado}
                            onClick={() => handleTamanhoChange(produto.id, item.tamanho)}
                            className={`px-2.5 py-1 rounded-md border font-bold transition ${esgotado
                                ? 'bg-slate-900/50 border-slate-800 text-slate-600 line-through cursor-not-allowed'
                                : tamanhoEscolhido === item.tamanho
                                  ? 'bg-sky-600 border-sky-500 text-white'
                                  : 'bg-[#0b101d] border-slate-800 text-slate-300 hover:border-slate-600'
                              }`}
                          >
                            {item.tamanho}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(produto, tamanhoEscolhido)}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg transition shadow-md"
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}