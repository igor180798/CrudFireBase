import React from 'react';
import { Link } from 'react-router-dom';

export default function Carrinho({ carrinho, setCarrinho, dispararToast }) {
  const removerItem = (index) => {
    const novoCarrinho = carrinho.filter((_, i) => i !== index);
    setCarrinho(novoCarrinho);
    dispararToast('Item removido do carrinho.', 'info');
  };

  const valorTotal = carrinho.reduce((acc, item) => acc + item.preco * item.qtd, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-xs">
      <h1 className="text-xl font-bold text-sky-400 mb-6">O seu Carrinho</h1>

      {carrinho.length === 0 ? (
        <div className="bg-[#131a27] border border-slate-800 p-8 rounded-xl text-center space-y-4">
          <p className="text-slate-400">O seu carrinho está vazio.</p>
          <Link
            to="/"
            className="inline-block bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-lg transition"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {carrinho.map((item, index) => (
            <div key={index} className="bg-[#131a27] border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={item.imagem} alt={item.nome} className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-2" />
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">{item.nome}</h3>
                  <p className="text-slate-400">Tamanho: <span className="text-slate-200 font-semibold">{item.tamanho}</span></p>
                  <p className="text-slate-400">Quantidade: <span className="text-slate-200 font-semibold">{item.qtd}</span></p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <span className="font-extrabold text-sky-400 text-sm">
                  R$ {(item.preco * item.qtd).toFixed(2)}
                </span>
                <button
                  onClick={() => removerItem(index)}
                  className="text-red-400 hover:text-red-300 font-semibold transition"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}

          <div className="bg-[#131a27] border border-slate-800 p-6 rounded-xl flex justify-between items-center mt-6">
            <div>
              <p className="text-slate-400">Total a pagar:</p>
              <h2 className="text-xl font-extrabold text-emerald-400">R$ {valorTotal.toFixed(2)}</h2>
            </div>
            <button
              onClick={() => {
                dispararToast('Compra finalizada com sucesso! Obrigado.');
                setCarrinho([]);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition"
            >
              Finalizar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}