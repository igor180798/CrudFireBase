import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Perfil({ user, dispararToast }) {
    const [encomendas, setEncomendas] = useState([]);
    const [carregandoEncomendas, setCarregandoEncomendas] = useState(true);

    useEffect(() => {
        async function carregarEncomendas() {
            if (!user) return;
            try {
                const q = query(collection(db, 'encomendas'), where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                lista.sort((a, b) => {
                    const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(0);
                    const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(0);
                    return dataB - dataA;
                });

                setEncomendas(lista);
            } catch (err) {
                console.error("Erro ao carregar encomendas:", err);
                dispararToast('Erro ao carregar histórico de encomendas.', 'error');
            } finally {
                setCarregandoEncomendas(false);
            }
        }

        carregarEncomendas();
    }, [user]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 text-xs space-y-8">
            {/* Informações do Utilizador */}
            <div className="bg-[#131a27] border border-slate-800 p-6 rounded-xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-sky-400 mb-1">Meu Perfil</h2>
                    <p className="text-slate-400">Gerencie a sua conta e consulte o histórico das suas compras.</p>
                </div>
                <div className="bg-[#0b101d] border border-slate-800 px-4 py-3 rounded-lg flex flex-col">
                    <span className="text-slate-400 font-semibold">E-mail Conectado:</span>
                    <span className="text-slate-200 font-bold text-sm">{user?.email}</span>
                </div>
            </div>

            {/* Histórico de Encomendas */}
            <div className="bg-[#131a27] border border-slate-800 p-6 rounded-xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200 pb-2 border-b border-slate-800">
                    Histórico de Encomendas
                </h3>

                {carregandoEncomendas ? (
                    <p className="text-slate-500 text-center py-8 animate-pulse">A carregar o seu histórico...</p>
                ) : encomendas.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                        <p className="text-2xl">📦</p>
                        <p className="text-slate-300 font-semibold">Ainda não realizou nenhuma encomenda</p>
                        <p className="text-slate-500">Assim que finalizar uma compra no catálogo, ela aparecerá aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {encomendas.map((pedido) => (
                            <div key={pedido.id} className="bg-[#0b101d] border border-slate-800 p-4 rounded-xl space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 pb-2 gap-1">
                                    <div>
                                        <span className="text-slate-400 font-semibold">Pedido ID: </span>
                                        <span className="text-slate-200 font-mono font-bold">{pedido.id}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                                            {pedido.status || 'Processando'}
                                        </span>
                                        <span className="text-slate-400">
                                            {pedido.criadoEm?.toDate ? pedido.criadoEm.toDate().toLocaleDateString('pt-BR') : 'Data recente'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {pedido.itens?.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-slate-300">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-sky-400">{item.qtd}x</span>
                                                <span>{item.nome}</span>
                                                <span className="text-slate-500 text-[11px]">(Tam: {item.tamanho})</span>
                                            </div>
                                            <span className="font-semibold">R$ {(item.preco * item.qtd).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-slate-800/60 pt-2 flex justify-between items-center font-bold">
                                    <span className="text-slate-400">Total Pago:</span>
                                    <span className="text-sky-400 text-sm">R$ {Number(pedido.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}