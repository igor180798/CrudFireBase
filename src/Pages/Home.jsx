import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig'; // Ajuste o caminho conforme o seu projeto

export default function PainelAdmin({ currentUser, dispararToast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [utilizadorSelecionado, setUtilizadorSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Buscar utilizadores do Firestore
  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const listaUsuarios = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setUsuarios(listaUsuarios);
    } catch (error) {
      console.error("Erro ao carregar utilizadores:", error);
      if (dispararToast) dispararToast('Erro ao carregar lista de utilizadores.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // Função robusta para alterar permissão entre Admin e Cliente
  const alternarPermissaoAdmin = async (userId, statusAtual) => {
    try {
      const novoStatus = !statusAtual;
      const docRef = doc(db, 'usuarios', userId);

      // Atualiza explicitamente ambos os campos para manter total consistência
      await updateDoc(docRef, {
        isAdmin: novoStatus,
        role: novoStatus ? 'admin' : 'cliente'
      });

      // Atualiza o estado local da lista
      setUsuarios(usuarios.map(u => u.id === userId ? { ...u, isAdmin: novoStatus, role: novoStatus ? 'admin' : 'cliente' } : u));

      // Atualiza também o utilizizador selecionado se for o mesmo
      if (utilizadorSelecionado && utilizadorSelecionado.id === userId) {
        setUtilizadorSelecionado({ ...utilizadorSelecionado, isAdmin: novoStatus, role: novoStatus ? 'admin' : 'cliente' });
      }

      if (dispararToast) dispararToast(`Permissão alterada com sucesso para ${novoStatus ? 'Admin' : 'Cliente'}!`, 'success');
    } catch (err) {
      console.error("Erro ao alterar permissão:", err);
      if (dispararToast) dispararToast('Erro ao alterar permissão do utilizador.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Painel Administrativo</h1>
        <button
          onClick={carregarUsuarios}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm transition"
        >
          Atualizar Lista
        </button>
      </div>

      {carregando ? (
        <p className="text-slate-400 text-center py-10">A carregar utilizadores...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usuarios.map(user => {
            const isAdm = user.isAdmin === true || user.role === 'admin';
            return (
              <div key={user.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{user.nome || 'Utilizador sem nome'}</h3>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAdm ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'}`}>
                    {isAdm ? 'Admin' : 'Cliente'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="text-slate-400">
                    Carrinho Atual: <strong className="text-slate-200">
                      {((user.carrinho || user.cart || user.itensCarrinho || []).reduce((acc, item) => acc + (item.qtd || item.quantidade || 1), 0))} itens
                    </strong>
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setUtilizadorSelecionado(user)}
                      className="text-sky-400 hover:underline text-xs font-medium"
                    >
                      Ver histórico e carrinho →
                    </button>
                    <button
                      onClick={() => alternarPermissaoAdmin(user.id, isAdm)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${isAdm ? 'bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border border-amber-800/50' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
                    >
                      {isAdm ? 'Tornar Cliente' : 'Tornar Admin'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Caixa / Gaveta de Detalhes do Utilizador Selecionado */}
      {utilizadorSelecionado && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl mt-6 relative shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Detalhes de: <span className="text-sky-400">{utilizadorSelecionado.nome || utilizadorSelecionado.email}</span>
              </h3>
              <p className="text-slate-500 text-xs">ID: {utilizadorSelecionado.id}</p>
            </div>
            <button
              onClick={() => setUtilizadorSelecionado(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="space-y-6">
            {/* Bloco do Carrinho Atual */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">🛒 Carrinho Atual (Não Finalizado):</h5>
              {(() => {
                const carrinhoDoUser = utilizadorSelecionado.carrinho || utilizadorSelecionado.cart || utilizadorSelecionado.itensCarrinho || [];

                if (carrinhoDoUser.length === 0) {
                  return <p className="text-slate-500 text-xs italic bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">O carrinho deste utilizador está vazio de momento.</p>;
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {carrinhoDoUser.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200 text-sm">{item.nome || item.produtoNome}</p>
                          <p className="text-slate-400 text-xs">Tamanho: {item.tamanho || 'Único'} | Preço: R$ {item.preco}</p>
                        </div>
                        <span className="bg-sky-950 text-sky-400 border border-sky-800 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ml-2">
                          Qtd: {item.qtd || item.quantidade || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Bloco do Histórico de Compras */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">📦 Histórico de Compras:</h5>
              {(!utilizadorSelecionado.compras || utilizadorSelecionado.compras.length === 0) ? (
                <p className="text-slate-500 text-xs italic bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">Este utilizador ainda não realizou nenhuma compra.</p>
              ) : (
                <div className="space-y-2">
                  {utilizadorSelecionado.compras.map((compra, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
                      Pedido #{compra.id || idx} - Total: R$ {compra.total}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}