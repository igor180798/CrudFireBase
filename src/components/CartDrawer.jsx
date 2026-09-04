import React from 'react';

export default function CartDrawer({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) {
    if (!isOpen) return null;

    const total = cartItems.reduce((acc, item) => acc + (Number(item.preco) || 0) * item.qtd, 0);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Overlay Escuro */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-slate-900 text-slate-100 border-l border-slate-800 flex flex-col shadow-2xl">

                    {/* Header */}
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                        <h2 className="text-base font-bold text-sky-400 flex items-center gap-2">
                            🛒 Meu Carrinho
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white p-1 text-lg font-bold"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {cartItems.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="text-4xl mb-2">🛍️</p>
                                <p className="text-xs">Seu carrinho está vazio.</p>
                            </div>
                        ) : (
                            cartItems.map((item, index) => {
                                const img = item.imagemUrl || item.imagem || item.foto;
                                return (
                                    <div key={`${item.id}-${item.tamanho}-${index}`} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex gap-3 items-center">
                                        <div className="w-16 h-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-800 flex items-center justify-center">
                                            {img ? (
                                                <img src={img} alt={item.nome} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl">👟</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-200 truncate">{item.nome}</h4>
                                            <p className="text-[11px] text-sky-400 font-semibold mt-0.5">
                                                Tamanho: <span className="text-slate-200">{item.tamanho}</span>
                                            </p>
                                            <p className="text-xs font-extrabold text-slate-100 mt-1">
                                                R$ {(Number(item.preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => onUpdateQuantity(index, -1)}
                                                    className="px-2 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                                                >
                                                    -
                                                </button>
                                                <span className="px-2 text-xs font-bold text-slate-200">{item.qtd}</span>
                                                <button
                                                    onClick={() => onUpdateQuantity(index, 1)}
                                                    className="px-2 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => onRemoveItem(index)}
                                                className="text-[10px] text-red-400 hover:text-red-300 transition"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Total:</span>
                            <span className="text-xl font-extrabold text-sky-400">
                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <button
                            disabled={cartItems.length === 0}
                            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-sky-600/20"
                        >
                            Finalizar Pedido
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}