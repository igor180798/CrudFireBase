import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Perfil({ user, dispararToast }) {
    const [dadosPerfil, setDadosPerfil] = useState({
        nome: '',
        telefone: '',
        rua: '',
        bairro: '',
        numero: '',
        cidade: '',
        estado: '',
        cep: ''
    });
    const [carregando, setCarregando] = useState(true);
    const [modoEdicao, setModoEdicao] = useState(false);

    useEffect(() => {
        const carregarPerfil = async () => {
            if (!user) return;
            try {
                const docRef = doc(db, 'usuarios', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setDadosPerfil({
                        nome: data.nomeCompleto || data.nome || '',
                        telefone: data.telefone || '',
                        rua: data.endereco?.rua || data.rua || '',
                        bairro: data.endereco?.bairro || data.bairro || '',
                        numero: data.endereco?.numero || data.numero || '',
                        cidade: data.endereco?.cidade || data.cidade || '',
                        estado: data.endereco?.estado || data.estado || '',
                        cep: data.endereco?.cep || data.cep || ''
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
            } finally {
                setCarregando(false);
            }
        };
        carregarPerfil();
    }, [user]);

    // Funções de Máscara de Formatação
    const formatarTelefone = (valor) => {
        let nums = valor.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 2) return `(${nums}`;
        if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
        return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    };

    const formatarCep = (valor) => {
        let nums = valor.replace(/\D/g, '').slice(0, 8);
        if (nums.length <= 5) return nums;
        return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    };

    const formatarEstado = (valor) => {
        return valor.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
    };

    const formatarNumero = (valor) => {
        return valor.replace(/\D/g, '').slice(0, 6);
    };

    // Verificar se falta algum dado essencial
    const camposEmFalta = !dadosPerfil.nome || !dadosPerfil.telefone || !dadosPerfil.rua || !dadosPerfil.cidade || !dadosPerfil.estado || !dadosPerfil.cep;

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            const docRef = doc(db, 'usuarios', user.uid);
            await updateDoc(docRef, {
                nomeCompleto: dadosPerfil.nome,
                nome: dadosPerfil.nome,
                telefone: dadosPerfil.telefone,
                rua: dadosPerfil.rua,
                bairro: dadosPerfil.bairro,
                numero: dadosPerfil.numero,
                cidade: dadosPerfil.cidade,
                estado: dadosPerfil.estado,
                cep: dadosPerfil.cep
            });
            setModoEdicao(false);
            if (dispararToast) dispararToast('Perfil atualizado com sucesso!', 'success');
        } catch (err) {
            console.error("Erro ao atualizar:", err);
            if (dispararToast) dispararToast('Erro ao atualizar perfil.', 'error');
        }
    };

    if (carregando) return <div className="text-center py-12 text-xs text-slate-400">A carregar perfil...</div>;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 text-xs text-slate-100 space-y-6">
            <h1 className="text-2xl font-bold text-sky-400">Meu Perfil</h1>

            {/* ALERTA DE DADOS EM FALTA */}
            {camposEmFalta && !modoEdicao && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-amber-400 text-sm mb-1">⚠️ Cadastro Incompleto</h3>
                        <p className="text-slate-300">Existem dados essenciais de morada ou contacto em falta no seu registo. Por favor, complete o seu cadastro.</p>
                    </div>
                    <button
                        onClick={() => setModoEdicao(true)}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg transition shadow-md whitespace-nowrap cursor-pointer"
                    >
                        Completar Dados
                    </button>
                </div>
            )}

            {/* SECÇÃO DE EXIBIÇÃO OU EDIÇÃO DO PERFIL */}
            <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 shadow-xl">
                {!modoEdicao ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="text-slate-400">Email:</span>
                            <span className="font-bold text-slate-200">{user?.email}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="text-slate-400">Nome Completo:</span>
                            <span className={`font-bold ${!dadosPerfil.nome ? 'text-red-400' : 'text-slate-200'}`}>
                                {dadosPerfil.nome || 'Não preenchido'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="text-slate-400">Telemóvel:</span>
                            <span className={`font-bold ${!dadosPerfil.telefone ? 'text-red-400' : 'text-slate-200'}`}>
                                {dadosPerfil.telefone || 'Não preenchido'}
                            </span>
                        </div>

                        <div className="border-b border-slate-800 pb-3 space-y-1">
                            <span className="text-slate-400 block font-semibold mb-1">Endereço de Entrega:</span>
                            <p className="text-slate-200">
                                {dadosPerfil.rua ? `${dadosPerfil.rua}, nº ${dadosPerfil.numero || 'S/N'} - ${dadosPerfil.bairro}` : <span className="text-red-400 font-bold">Morada não preenchida</span>}
                            </p>
                            <p className="text-slate-400">
                                {dadosPerfil.cidade && dadosPerfil.estado ? `${dadosPerfil.cidade} / ${dadosPerfil.estado} — CEP: ${dadosPerfil.cep}` : ''}
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setModoEdicao(true)}
                                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-lg transition cursor-pointer"
                            >
                                Editar Perfil
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <h3 className="text-sm font-bold text-sky-400 mb-2">Atualizar Informações</h3>

                        <div>
                            <label className="block text-slate-400 font-semibold mb-1">Nome Completo:</label>
                            <input
                                type="text"
                                value={dadosPerfil.nome}
                                onChange={(e) => setDadosPerfil({ ...dadosPerfil, nome: e.target.value })}
                                placeholder="Digite seu nome completo"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 font-semibold mb-1">Telemóvel:</label>
                            <input
                                type="text"
                                value={dadosPerfil.telefone}
                                onChange={(e) => setDadosPerfil({ ...dadosPerfil, telefone: formatarTelefone(e.target.value) })}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-slate-400 font-semibold mb-1">Rua:</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.rua}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, rua: e.target.value })}
                                    placeholder="Nome da rua / avenida"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Número:</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.numero}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, numero: formatarNumero(e.target.value) })}
                                    placeholder="Ex: 123"
                                    maxLength={6}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Bairro:</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.bairro}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, bairro: e.target.value })}
                                    placeholder="Nome do bairro"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Cidade:</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.cidade}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, cidade: e.target.value })}
                                    placeholder="Nome da cidade"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Estado (UF):</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.estado}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, estado: formatarEstado(e.target.value) })}
                                    placeholder="Ex: SP"
                                    maxLength={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 uppercase"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-slate-400 font-semibold mb-1">CEP:</label>
                                <input
                                    type="text"
                                    value={dadosPerfil.cep}
                                    onChange={(e) => setDadosPerfil({ ...dadosPerfil, cep: formatarCep(e.target.value) })}
                                    placeholder="00000-000"
                                    maxLength={9}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setModoEdicao(false)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-lg transition cursor-pointer"
                            >
                                Salvar Dados
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}