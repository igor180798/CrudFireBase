import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Login({ dispararToast }) {
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');

  // Campos adicionais de cadastro
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false);

  // Função para limpar todos os campos do formulário
  const limparCampos = () => {
    setEmailAuth('');
    setSenhaAuth('');
    setNome('');
    setCpf('');
    setDataNascimento('');
    setTelefone('');
    setCep('');
    setRua('');
    setNumero('');
    setBairro('');
    setCidade('');
    setEstado('');
  };

  // Funções de Máscaras Automáticas
  const formatarCPF = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatarCEP = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
  };

  const formatarTelefone = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatarData = (valor) => {
    return valor
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{4})\d+?$/, '$1');
  };

  // Buscar Endereço Automático via CEP
  const handleCepChange = async (e) => {
    const cepFormatado = formatarCEP(e.target.value);
    setCep(cepFormatado);

    const cepLimpo = cepFormatado.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const dados = await resposta.json();
        if (!dados.erro) {
          setRua(dados.logradouro || '');
          setBairro(dados.bairro || '');
          setCidade(dados.localidade || '');
          setEstado(dados.uf || '');
          dispararToast('Endereço encontrado pelo CEP!', 'info');
        } else {
          dispararToast('CEP não encontrado.', 'error');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modoCadastro) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailAuth, senhaAuth);
        const user = userCredential.user;

        // Guardar dados completos no Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
          nome,
          cpf,
          dataNascimento,
          telefone,
          email: emailAuth,
          endereco: {
            cep,
            rua,
            numero,
            bairro,
            cidade,
            estado
          },
          criadoEm: new Date()
        });

        dispararToast('Conta criada com sucesso!');
      } else {
        await signInWithEmailAndPassword(auth, emailAuth, senhaAuth);
        dispararToast('Sessão iniciada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      dispararToast(err.message || 'Erro na autenticação.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[#0b101d]">
      <div className="bg-[#131a27] border border-slate-800 p-8 rounded-xl w-full max-w-xl shadow-2xl flex flex-col items-center">

        {/* Ícone personalizado */}
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-2 mb-4 shadow-md">
          <img src="/sneaker.png" alt="Ícone Sneaker" className="max-h-full object-contain" />
        </div>

        <h2 className="text-2xl font-bold text-sky-400 text-center mb-2">
          {modoCadastro ? 'Criar Nova Conta' : 'Acessar Catálogo'}
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          {modoCadastro ? 'Preencha os seus dados e morada abaixo' : 'Entre com a sua conta para ver os sneakers'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs w-full">
          {modoCadastro && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="O seu nome"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">CPF</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => setCpf(formatarCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Data de Nascimento</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(formatarData(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Telemóvel / Telefone</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-3">
                <p className="font-bold text-sky-400 mb-2">Morada / Endereço</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">CEP</label>
                    <input
                      type="text"
                      required
                      maxLength={9}
                      value={cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1 font-semibold text-slate-300">Rua / Logradouro</label>
                    <input
                      type="text"
                      required
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      placeholder="Nome da rua"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Número</label>
                    <input
                      type="text"
                      required
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Bairro</label>
                    <input
                      type="text"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Cidade</label>
                    <input
                      type="text"
                      required
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Cidade"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Estado (UF)</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-slate-800 pt-3 mt-3">
            <div className="mb-3">
              <label className="block mb-1 font-semibold text-slate-300">E-mail</label>
              <input
                type="email"
                required
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-slate-300">Senha</label>
              <input
                type="password"
                required
                value={senhaAuth}
                onChange={(e) => setSenhaAuth(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0b101d] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#0284c7] hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-xs mt-4 transition shadow-md disabled:opacity-50"
          >
            {carregando ? 'A processar...' : (modoCadastro ? 'Registar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              limparCampos();
              setModoCadastro(!modoCadastro);
            }}
            className="text-slate-400 hover:text-sky-400 transition underline"
          >
            {modoCadastro ? 'Já tem uma conta? Faça login' : 'Não tem conta? Crie uma agora'}
          </button>
        </div>

      </div>
    </div>
  );
}