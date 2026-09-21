import React, { useState } from 'react';

export default function ModalDetalhesProduto({ produto, isOpen, onClose, onAddToCart, ordenarTamanhos }) {
    if (!isOpen || !produto) return null;

    // Obter e ordenar os tamanhos disponíveis do produto
    const obterListaTamanhos = () => {
        let listaBruta = [];
        if (Array.isArray(produto.tamanhosEstoque) && produto.tamanhosEstoque.length > 0) {
            listaBruta = produto.tamanhosEstoque;
        } else {
            const campoObj = produto.tamanhos || produto.tamanho;
            if (campoObj && typeof campoObj === 'object' && !Array.isArray(campoObj)) {
                listaBruta = Object.entries(campoObj).map(([t, q]) => ({ tamanho: String(t), quantidade: Number(q) || 0 }));
            } else {
                listaBruta = [{ tamanho: 'Único', quantidade: 10 }];
            }
        }
        return ordenarTamanhos ? ordenarTamanhos(listaBruta) : listaBruta;
    };

    const listaTamanhos = obterListaTamanhos();
    const primeiroDisponivel = listaTamanhos.find(i => i.quantidade > 0)?.tamanho || listaTamanhos[0]?.tamanho || 'Único';

    const [tamanhoSelecionado, setTamanhoSelecionado] = useState(primeiroDisponivel);

    const img = produto.imagem || produto.imagemUrl || produto.url || produto.foto || 'https://via.placeholder.com/400';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 text-xs">
            {/* Overlay Escuro */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Caixa do Modal */}
            <div className="relative bg-[#131a27] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 z-10 shadow-2xl text-slate-100 flex flex-col md:flex-row gap-6">

                {/* Botão Fechar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-full w-8 h-8 flex items-center justify-center font-bold transition"
                >
                    ✕
                </button>

                {/* Imagem do Produto */}
                <div className="w-full md:w-1/2 h-64 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-4">
                    <img src={img} alt={produto.nome} className="max-h-full object-contain" />
                </div>

                {/* Informações e Opções */}
                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
                            Sneaker Oficial
                        </span>
                        <h2 className="text-lg font-bold text-slate-100">{produto.nome}</h2>
                        <p className="text-xl font-extrabold text-sky-400">
                            R$ {Number(produto.preco || 0).toFixed(2)}
                        </p>
                        <p className="text-slate-400 leading-relaxed text-[11px] pt-1 border-t border-slate-800/80">
                            {produto.descricao || 'Sneaker exclusivo de alta qualidade, desenvolvido para proporcionar máximo conforto, durabilidade e estilo em qualquer ocasião.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-slate-400 font-semibold mb-1.5">Selecione o Tamanho:</label>
                            <div className="flex flex-wrap gap-1.5">
                                {listaTamanhos.map((item) => {
                                    const esgotado = item.quantidade <= 0;
                                    return (
                                        <button
                                            key={item.tamanho}
                                            type="button"
                                            disabled={esgotado}
                                            onClick={() => setTamanhoSelecionado(item.tamanho)}
                                            className={`px-3 py-1.5 rounded-lg border font-bold transition ${esgotado
                                                    ? 'bg-slate-950 border-slate-900 text-slate-700 line-through cursor-not-allowed'
                                                    : tamanhoSelecionado === item.tamanho
                                                        ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                                }`}
                                        >
                                            {item.tamanho}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                onAddToCart(produto, tamanhoSelecionado);
                                onClose();
                            }}
                            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-sky-600/20"
                        >
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}