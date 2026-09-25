import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function PainelAdmin({
  isAdmin,
  produtos,
  marcasManuais,       // Recebido via props do App.jsx
  setMarcasManuais,    // Recebido via props do App.jsx
  marcasExcluidas,     // Recebido via props do App.jsx
  setMarcasExcluidas,  // Recebido via props do App.jsx
  aoCadastrarProduto,
  aoExcluirProduto,
  dispararToast,
  onRecarregar
}) {
  const [abaAtiva, setAbaAtiva] = useState('produtos'); // 'produtos', 'vendas', 'usuarios' ou 'marcas'

  // Lista base de marcas padrão do sistema
  const marcasBasePadrao = ['Nike', 'Adidas', 'All Star', 'Vans', 'Puma', 'New Balance'];

  // Lista dinâmica e combinada de marcas disponíveis (Base + Manuais + Produtos, menos as excluídas)
  const marcasDisponiveis = React.useMemo(() => {
    const marcasDosProdutos = produtos.map(p => p.marca).filter(Boolean);
    const todas = Array.from(new Set([...marcasBasePadrao, ...marcasManuais, ...marcasDosProdutos]));
    // Remove as marcas que o utilizador excluiu explicitamente
    return todas.filter(m => !marcasExcluidas.includes(m)).sort();
  }, [produtos, marcasManuais, marcasExcluidas]);

  // Estados para nova marca no CADASTRO
  const [novaMarcaInput, setNovaMarcaInput] = useState('');
  const [mostrarCampoNovaMarca, setMostrarCampoNovaMarca] = useState(false);

  // Estados para nova marca na EDIÇÃO
  const [editNovaMarcaInput, setEditNovaMarcaInput] = useState('');
  const [mostrarCampoEditNovaMarca, setMostrarCampoEditNovaMarca] = useState(false);

  // Estados de Cadastro
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('Nike');
  const [preco, setPreco] = useState('');
  const [descricao, setDescdescricao] = useState('');
  const [imagemBase64, setImagemBase64] = useState('');
  const [nomeFicheiro, setNomeFicheiro] = useState('');

  // Gestão de tamanhos e stock no cadastro
  const [tamanhoAtual, setTamanhoAtual] = useState('38');
  const [qtdAtual, setQtdAtual] = useState('1');
  const [listaTamanhos, setListaTamanhos] = useState([]);

  // Estados para gestão/exclusão e seleções múltiplas
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [tamanhosFormatados, setTamanhosFormatados] = useState([]);

  // Estados de Edição do Produto Selecionado
  const [editNome, setEditNome] = useState('');
  const [editMarca, setEditMarca] = useState('Nike');
  const [editPreco, setEditPreco] = useState('');

  // Estados para Gestão de Stock do Produto Selecionado
  const [modoGestao, setModoGestao] = useState('adicionar'); // 'adicionar' ou 'remover'
  const [alvoGestao, setAlvoGestao] = useState('especifico'); // 'especifico' ou 'todos'
  const [tamanhoParaGerir, setTamanhoParaGerir] = useState('');
  const [quantidadeMovimento, setQuantidadeMovimento] = useState(1);

  const [idsSelecionados, setIdsSelecionados] = useState([]);

  // Estados para Vendas / Encomendas
  const [encomendas, setEncomendas] = useState([]);
  const [carregandoEncomendas, setCarregandoEncomendas] = useState(false);

  // Estados para Gestão de Utilizadores
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [utilizadorSelecionado, setUtilizadorSelecionado] = useState(null);
  const [historicoUtilizador, setHistoricoUtilizador] = useState([]);
  const [carregandoDetalhesUser, setCarregandoDetalhesUser] = useState(false);

  useEffect(() => {
    carregarEncomendas();
    carregarUsuarios();
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

  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(lista);
    } catch (err) {
      console.error("Erro ao carregar utilizadores:", err);
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  const selecionarUtilizadorParaDetalhes = async (user) => {
    setUtilizadorSelecionado(user);
    setCarregandoDetalhesUser(true);
    try {
      const q = query(collection(db, 'encomendas'), where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);
      const historico = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoricoUtilizador(historico);
    } catch (err) {
      console.error("Erro ao buscar histórico do utilizador:", err);
    } finally {
      setCarregandoDetalhesUser(false);
    }
  };

  const alternarPermissaoAdmin = async (userId, statusAtual) => {
    try {
      const novoStatus = !statusAtual;
      const docRef = doc(db, 'usuarios', userId);

      await updateDoc(docRef, {
        isAdmin: novoStatus,
        role: novoStatus ? 'admin' : 'cliente'
      });

      setUsuarios(usuarios.map(u => u.id === userId ? { ...u, isAdmin: novoStatus, role: novoStatus ? 'admin' : 'cliente' } : u));
      if (utilizadorSelecionado && utilizadorSelecionado.id === userId) {
        setUtilizadorSelecionado({ ...utilizadorSelecionado, isAdmin: novoStatus, role: novoStatus ? 'admin' : 'cliente' });
      }

      if (dispararToast) dispararToast(`Permissão alterada com sucesso para ${novoStatus ? 'Admin' : 'Cliente'}!`, 'success');
    } catch (err) {
      console.error("Erro ao alterar permissão:", err);
      if (dispararToast) dispararToast('Erro ao alterar permissão do utilizador.', 'error');
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

  const handleAdicionarNovaMarca = () => {
    const nomeMarcaFormatado = novaMarcaInput.trim();
    if (!nomeMarcaFormatado) {
      dispararToast('Insira o nome da nova marca.', 'error');
      return;
    }

    if (marcasDisponiveis.some(m => m.toLowerCase() === nomeMarcaFormatado.toLowerCase())) {
      dispararToast('Esta marca já existe na lista.', 'error');
      return;
    }

    setMarcasExcluidas(prev => prev.filter(m => m.toLowerCase() !== nomeMarcaFormatado.toLowerCase()));
    setMarcasManuais(prev => [...prev, nomeMarcaFormatado]);
    setMarca(nomeMarcaFormatado);
    setNovaMarcaInput('');
    setMostrarCampoNovaMarca(false);
    dispararToast(`Marca "${nomeMarcaFormatado}" adicionada e selecionada com sucesso!`, 'success');
  };

  const handleAdicionarNovaMarcaEdicao = () => {
    const nomeMarcaFormatado = editNovaMarcaInput.trim();
    if (!nomeMarcaFormatado) {
      dispararToast('Insira o nome da nova marca.', 'error');
      return;
    }

    if (marcasDisponiveis.some(m => m.toLowerCase() === nomeMarcaFormatado.toLowerCase())) {
      dispararToast('Esta marca já existe na lista.', 'error');
      return;
    }

    setMarcasExcluidas(prev => prev.filter(m => m.toLowerCase() !== nomeMarcaFormatado.toLowerCase()));
    setMarcasManuais(prev => [...prev, nomeMarcaFormatado]);
    setEditMarca(nomeMarcaFormatado);
    setEditNovaMarcaInput('');
    setMostrarCampoEditNovaMarca(false);
    dispararToast(`Marca "${nomeMarcaFormatado}" adicionada e selecionada!`, 'success');
  };

  const handleExcluirMarca = (marcaParaExcluir) => {
    const produtosComEstaMarca = produtos.filter(p => p.marca?.toLowerCase() === marcaParaExcluir.toLowerCase());

    if (produtosComEstaMarca.length > 0) {
      dispararToast(`Não é possível excluir "${marcaParaExcluir}" porque existem ${produtosComEstaMarca.length} produtos associados. Altere a marca desses produtos primeiro.`, 'error');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir a marca "${marcaParaExcluir}"?`)) {
      setMarcasManuais(prev => prev.filter(m => m !== marcaParaExcluir));
      setMarcasExcluidas(prev => [...prev, marcaParaExcluir]);

      if (marca === marcaParaExcluir) setMarca('Nike');
      if (editMarca === marcaParaExcluir) setEditMarca('Nike');

      if (dispararToast) dispararToast(`Marca "${marcaParaExcluir}" excluída com sucesso!`, 'success');
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

  const formatarPrecoInput = (valorEmCentavos) => {
    if (!valorEmCentavos) return '';
    return (parseInt(valorEmCentavos, 10) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setPreco('');
      return;
    }
    setPreco(formatarPrecoInput(valor));
  };

  const handleEditPrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setEditPreco('');
      return;
    }
    setEditPreco(formatarPrecoInput(valor));
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

    if (!nome.trim() || !marca || !preco || !imagemBase64 || listaTamanhos.length === 0) {
      dispararToast('Preencha todos os campos obrigatórios e adicione tamanhos/stock.', 'error');
      return;
    }

    const precoNumerico = parseFloat(preco.replace(/\./g, '').replace(',', '.'));

    const novoProduto = {
      nome,
      marca,
      preco: precoNumerico,
      descricao: descricao || '',
      imagem: imagemBase64,
      tamanhosEstoque: listaTamanhos,
      criadoEm: new Date()
    };

    aoCadastrarProduto(novoProduto);

    setNome('');
    setPreco('');
    setDescdescricao('');
    setImagemBase64('');
    setNomeFicheiro('');
    setListaTamanhos([]);
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome && p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const usuariosFiltrados = usuarios.filter(u =>
    (u.email && u.email.toLowerCase().includes(buscaUsuario.toLowerCase())) ||
    (u.nome && u.nome.toLowerCase().includes(buscaUsuario.toLowerCase()))
  );

  const extrairTamanhosDoProduto = (prod) => {
    if (!prod) return [];
    let extraidos = [];

    if (Array.isArray(prod.tamanhosEstoque) && prod.tamanhosEstoque.length > 0) {
      extraidos = prod.tamanhosEstoque.map(item => ({
        tamanho: String(item.tamanho || item),
        quantidade: Number(item.quantidade || 1)
      }));
    }
    return ordenarTamanhos(extraidos);
  };

  const selecionarProdutoParaGestao = (produto) => {
    setProdutoSelecionado(produto);
    setEditNome(produto.nome || '');
    setEditMarca(produto.marca || 'Nike');
    setEditPreco(produto.preco ? Number(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');

    const tamanhosExtraidos = extrairTamanhosDoProduto(produto);
    setTamanhosFormatados(tamanhosExtraidos);
    setTamanhoParaGerir(tamanhosExtraidos[0]?.tamanho || '');
    setQuantidadeMovimento(1);
    setMostrarCampoEditNovaMarca(false);
  };

  const salvarAlteracoesProduto = async () => {
    if (!produtoSelecionado) return;

    if (!editNome.trim() || !editMarca || !editPreco) {
      dispararToast('Nome, marca e preço são obrigatórios.', 'error');
      return;
    }

    const precoNumerico = parseFloat(editPreco.replace(/\./g, '').replace(',', '.'));

    try {
      const docRef = doc(db, 'produtos', produtoSelecionado.id);
      await updateDoc(docRef, {
        nome: editNome.trim(),
        marca: editMarca,
        preco: precoNumerico
      });

      setProdutoSelecionado({
        ...produtoSelecionado,
        nome: editNome.trim(),
        marca: editMarca,
        preco: precoNumerico
      });

      dispararToast('Informações do produto atualizadas com sucesso!', 'success');
      if (typeof onRecarregar === 'function') onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar produto:", err);
      dispararToast('Erro ao atualizar dados do produto.', 'error');
    }
  };

  const obterQuantidadeMaximaDisponivel = () => {
    if (alvoGestao === 'especifico' && tamanhoParaGerir) {
      const itemEncontrado = tamanhosFormatados.find(t => t.tamanho === tamanhoParaGerir);
      return itemEncontrado ? itemEncontrado.quantidade : 1;
    }
    return 999999;
  };

  const executarAtualizacaoStock = async () => {
    if (!produtoSelecionado) return;

    let qtdNum = parseInt(quantidadeMovimento, 10);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      dispararToast('Insira uma quantidade válida superior a 0.', 'error');
      return;
    }

    if (modoGestao === 'remover' && alvoGestao === 'especifico') {
      const maxDisponivel = obterQuantidadeMaximaDisponivel();
      if (qtdNum > maxDisponivel) {
        dispararToast(`Não pode remover ${qtdNum} unidades. O stock atual deste tamanho é apenas ${maxDisponivel}.`, 'error');
        setQuantidadeMovimento(maxDisponivel);
        return;
      }
    }

    let novosTamanhos = [...tamanhosFormatados];

    if (alvoGestao === 'todos') {
      if (modoGestao === 'adicionar') {
        novosTamanhos = novosTamanhos.map(item => ({
          ...item,
          quantidade: item.quantidade + qtdNum
        }));
      } else {
        novosTamanhos = novosTamanhos.map(item => {
          const novaQtd = item.quantidade - qtdNum;
          return {
            ...item,
            quantidade: novaQtd < 0 ? 0 : novaQtd
          };
        }).filter(item => item.quantidade > 0);
      }
    } else {
      const index = novosTamanhos.findIndex(item => item.tamanho === tamanhoParaGerir);

      if (modoGestao === 'adicionar') {
        if (index >= 0) {
          novosTamanhos[index].quantidade += qtdNum;
        } else {
          novosTamanhos.push({ tamanho: tamanhoParaGerir, quantidade: qtdNum });
        }
      } else {
        if (index >= 0) {
          const qtdAtualNoStock = novosTamanhos[index].quantidade;
          if (qtdNum > qtdAtualNoStock) {
            dispararToast(`Stock insuficiente. Disponível: ${qtdAtualNoStock}.`, 'error');
            return;
          }
          novosTamanhos[index].quantidade -= qtdNum;

          if (novosTamanhos[index].quantidade <= 0) {
            novosTamanhos = novosTamanhos.filter(item => item.tamanho !== tamanhoParaGerir);
          }
        } else {
          dispararToast('Este tamanho não existe no stock atual.', 'error');
          return;
        }
      }
    }

    novosTamanhos = ordenarTamanhos(novosTamanhos);

    try {
      const docRef = doc(db, 'produtos', produtoSelecionado.id);
      await updateDoc(docRef, { tamanhosEstoque: novosTamanhos });

      setTamanhosFormatados(novosTamanhos);
      const produtoAtualizadoLocal = { ...produtoSelecionado, tamanhosEstoque: novosTamanhos };
      setProdutoSelecionado(produtoAtualizadoLocal);

      dispararToast('Stock atualizado com sucesso!', 'success');
      if (typeof onRecarregar === 'function') onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar stock:", err);
      dispararToast('Erro ao atualizar stock no servidor.', 'error');
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131a27] border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-2xl font-extrabold text-sky-400 tracking-tight">Painel Administrativo</h2>
          <p className="text-slate-400 mt-0.5">Registo, gestão de stock, encomendas, marcas e utilizadores</p>
        </div>

        <div className="flex flex-wrap bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1 w-full sm:w-auto">
          <button
            onClick={() => setAbaAtiva('produtos')}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-bold transition cursor-pointer text-center ${abaAtiva === 'produtos' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            📦 Produtos
          </button>
          <button
            onClick={() => {
              setAbaAtiva('marcas');
            }}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-bold transition cursor-pointer text-center ${abaAtiva === 'marcas' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            🏷️ Marcas ({marcasDisponiveis.length})
          </button>
          <button
            onClick={() => {
              setAbaAtiva('vendas');
              carregarEncomendas();
            }}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-bold transition cursor-pointer text-center ${abaAtiva === 'vendas' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            🛒 Vendas ({encomendas.length})
          </button>
          <button
            onClick={() => {
              setAbaAtiva('usuarios');
              carregarUsuarios();
            }}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-bold transition cursor-pointer text-center ${abaAtiva === 'usuarios' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            👥 Utilizadores ({usuarios.length})
          </button>
        </div>
      </div>

      {abaAtiva === 'produtos' && (
        <div className="space-y-6">
          <div className="bg-[#131a27] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200">Adicionar Novo Produto</h3>
              <p className="text-slate-400 text-[11px]">Preencha as informações do artigo e defina os tamanhos disponíveis.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold text-slate-300">Nome do Sneaker</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Nike Air Max"
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-300">Marca</label>
                    <button
                      type="button"
                      onClick={() => setMostrarCampoNovaMarca(!mostrarCampoNovaMarca)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-bold underline bg-transparent cursor-pointer"
                    >
                      {mostrarCampoNovaMarca ? 'Cancelar' : '+ Nova Marca'}
                    </button>
                  </div>

                  {mostrarCampoNovaMarca ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={novaMarcaInput}
                        onChange={(e) => setNovaMarcaInput(e.target.value)}
                        placeholder="Nome da marca"
                        className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAdicionarNovaMarca}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl font-bold cursor-pointer shrink-0"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition cursor-pointer"
                    >
                      {marcasDisponiveis.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Preço (R$)</label>
                  <div className="flex items-center bg-[#0b101d] border border-slate-800 rounded-xl overflow-hidden focus-within:border-sky-500 transition">
                    <span className="pl-3.5 text-slate-400 font-semibold">R$</span>
                    <input
                      type="text"
                      value={preco}
                      onChange={handlePrecoChange}
                      placeholder="0,00"
                      className="w-full bg-transparent p-3 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Imagem do Dispositivo</label>
                  <label className="flex items-center justify-center w-full bg-[#0b101d] border border-slate-800 hover:border-sky-500 rounded-xl p-3 text-slate-300 cursor-pointer transition shadow-inner">
                    <span className="truncate">{nomeFicheiro ? nomeFicheiro : '📁 Procurar imagem...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagemChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-300">Descrição do Sneaker</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescdescricao(e.target.value)}
                  rows="2"
                  placeholder="Detalhes sobre o conforto, material e design..."
                  className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-300">Gerir Tamanhos e Stock</label>
                <div className="flex gap-2">
                  <select
                    value={tamanhoAtual}
                    onChange={(e) => setTamanhoAtual(e.target.value)}
                    className="bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 flex-1"
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
                    className="w-20 bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 text-center"
                  />

                  <button
                    type="button"
                    onClick={handleAdicionarTamanho}
                    className="bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-semibold px-4 py-3 rounded-xl transition border border-slate-700 cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {listaTamanhos.length > 0 && (
                <div className="bg-[#0b101d] border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <span className="block font-semibold text-slate-400">Tamanhos e Stock Configurados:</span>
                  <div className="flex flex-wrap gap-2">
                    {listaTamanhos.map((item) => (
                      <div key={item.tamanho} className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 space-x-2 shadow-sm">
                        <span className="text-slate-200 font-bold">Tam: {item.tamanho}</span>
                        <span className="text-sky-400">({item.quantidade} un.)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverTamanhoLista(item.tamanho)}
                          className="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg cursor-pointer"
                >
                  Cadastrar Produto
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#131a27] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Gerir / Excluir Produtos do Estoque</h3>
                <p className="text-slate-400 text-[11px]">Total cadastrado: {produtos.length} produtos</p>
              </div>

              {produtosFiltrados.length > 0 && (
                <div className="flex items-center gap-3">
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
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-2 rounded-xl transition shadow-md cursor-pointer"
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
                className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            {produtos.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhum produto cadastrado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {produtosFiltrados.map((produto) => {
                  const isSelecionadoParaGestao = produtoSelecionado?.id === produto.id;
                  const isMarcado = idsSelecionados.includes(produto.id);

                  return (
                    <div
                      key={produto.id}
                      onClick={() => selecionarProdutoParaGestao(produto)}
                      className={`flex items-center justify-between bg-[#0b101d] border p-3.5 rounded-xl cursor-pointer transition ${isSelecionadoParaGestao ? 'border-sky-500 bg-sky-950/20 shadow' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <input
                          type="checkbox"
                          checked={isMarcado}
                          onChange={(e) => handleToggleCheckboxProduto(e, produto.id)}
                          className="w-4 h-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500 bg-slate-900 cursor-pointer shrink-0"
                        />
                        <img
                          src={produto.imagem || 'https://via.placeholder.com/50'}
                          alt={produto.nome}
                          className="w-10 h-10 object-contain bg-slate-900 rounded-lg border border-slate-800 shrink-0 p-0.5"
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-200 truncate">{produto.nome}</p>
                          <span className="text-[10px] text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/40">
                            {produto.marca || 'Sem Marca'}
                          </span>
                          <p className="text-slate-300 font-medium">R$ {Number(produto.preco || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ml-2 ${isSelecionadoParaGestao ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {isSelecionadoParaGestao ? 'A gerir' : 'Selecionar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {produtoSelecionado && (
            <div className="bg-[#131a27] border border-sky-500/50 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={produtoSelecionado.imagem}
                    alt={produtoSelecionado.nome}
                    className="w-12 h-12 object-contain bg-slate-900 rounded-xl border border-slate-800 p-1"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-sky-400">A Gerir / Editar: {produtoSelecionado.nome}</h3>
                    <p className="text-slate-400 text-[11px]">Atualize nome, marca, preço ou faça a gestão de stock.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProdutoSelecionado(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="bg-[#0b101d] border border-slate-800 p-4 rounded-xl space-y-4">
                <span className="block font-bold text-slate-200 text-xs">Informações Principais do Produto:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block mb-1 font-semibold text-slate-400 text-[11px]">Nome do Sneaker</label>
                    <input
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-400 text-[11px]">Marca</label>
                      <button
                        type="button"
                        onClick={() => setMostrarCampoEditNovaMarca(!mostrarCampoEditNovaMarca)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 font-bold underline bg-transparent cursor-pointer"
                      >
                        {mostrarCampoEditNovaMarca ? 'Cancelar' : '+ Nova Marca'}
                      </button>
                    </div>

                    {mostrarCampoEditNovaMarca ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editNovaMarcaInput}
                          onChange={(e) => setEditNovaMarcaInput(e.target.value)}
                          placeholder="Nome da marca"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={handleAdicionarNovaMarcaEdicao}
                          className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-xl font-bold cursor-pointer shrink-0"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <select
                        value={editMarca}
                        onChange={(e) => setEditMarca(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {marcasDisponiveis.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold text-slate-400 text-[11px]">Preço (R$)</label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-sky-500">
                      <span className="pl-3 text-slate-400 font-semibold">R$</span>
                      <input
                        type="text"
                        value={editPreco}
                        onChange={handleEditPrecoChange}
                        className="w-full bg-transparent p-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={salvarAlteracoesProduto}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl transition shadow cursor-pointer text-xs"
                  >
                    💾 Salvar Alterações de Dados
                  </button>
                </div>
              </div>

              <div className="bg-[#0b101d] border border-slate-800 p-4 rounded-xl space-y-2">
                <span className="block font-bold text-slate-300 text-xs">Stock Atual por Tamanho:</span>
                <div className="flex flex-wrap gap-2">
                  {tamanhosFormatados.length === 0 ? (
                    <p className="text-red-400 text-xs italic">Sem tamanhos cadastrados no momento.</p>
                  ) : (
                    tamanhosFormatados.map((item) => (
                      <div key={item.tamanho} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                        <span className="text-slate-300 font-bold">Tam {item.tamanho}:</span>
                        <span className="text-sky-400 font-extrabold">{item.quantidade} un.</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Operação</label>
                  <select
                    value={modoGestao}
                    onChange={(e) => setModoGestao(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="adicionar">➕ Adicionar Stock</option>
                    <option value="remover">➖ Remover Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Aplicar a</label>
                  <select
                    value={alvoGestao}
                    onChange={(e) => setAlvoGestao(e.target.value)}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="especifico">Tamanho Específico</option>
                    <option value="todos">Todos os Tamanhos</option>
                  </select>
                </div>

                {alvoGestao === 'especifico' ? (
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Escolher Tamanho</label>
                    <select
                      value={tamanhoParaGerir}
                      onChange={(e) => setTamanhoParaGerir(e.target.value)}
                      className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {tamanhosFormatados.map((t) => (
                        <option key={t.tamanho} value={t.tamanho}>
                          Tam {t.tamanho} (Atual: {t.quantidade})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Âmbito</label>
                    <div className="bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-sky-400 font-bold text-center">
                      Todos em simultâneo
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end pt-2">
                <div className="w-full sm:w-48">
                  <label className="block mb-1 font-semibold text-slate-300">
                    Quantidade {modoGestao === 'remover' && alvoGestao === 'especifico' && `(Max: ${obterQuantidadeMaximaDisponivel()})`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={modoGestao === 'remover' && alvoGestao === 'especifico' ? obterQuantidadeMaximaDisponivel() : undefined}
                    value={quantidadeMovimento}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val !== '' && modoGestao === 'remover' && alvoGestao === 'especifico') {
                        const num = parseInt(val, 10);
                        const max = obterQuantidadeMaximaDisponivel();
                        if (num > max) val = max;
                      }
                      setQuantidadeMovimento(val);
                    }}
                    className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 text-center font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={executarAtualizacaoStock}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition shadow-lg cursor-pointer ${modoGestao === 'adicionar' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                >
                  {modoGestao === 'adicionar' ? 'Confirmar Adição' : 'Confirmar Remoção'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'marcas' && (
        <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-sky-400">🏷️ Gestão Geral de Marcas</h3>
              <p className="text-slate-400 text-[11px]">Consulte todas as marcas ativas no sistema e remova as que não utiliza.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {marcasDisponiveis.map((m, idx) => {
              const produtosAssociados = produtos.filter(p => p.marca?.toLowerCase() === m.toLowerCase());
              const temProdutos = produtosAssociados.length > 0;
              const isBase = marcasBasePadrao.includes(m);

              return (
                <div key={idx} className="bg-[#0b101d] border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-extrabold text-slate-200 text-sm block">{m}</span>
                      <span className="text-[10px] text-slate-400">
                        {temProdutos ? `${produtosAssociados.length} produto(s) associado(s)` : 'Nenhum produto associado'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isBase ? 'bg-slate-800 text-slate-300' : 'bg-sky-950/40 text-sky-400 border border-sky-900/40'}`}>
                      {isBase ? 'Padrão' : 'Personalizada'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                    <span className={`text-[10px] ${temProdutos ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                      {temProdutos ? '⚠️ Bloqueado (Em uso)' : 'Disponível'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExcluirMarca(m)}
                      disabled={temProdutos}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${temProdutos ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50' : 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white cursor-pointer'}`}
                      title={temProdutos ? 'Não pode excluir marcas com produtos vinculados' : 'Excluir marca'}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {abaAtiva === 'vendas' && (
        <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-2 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-sky-400">🛒 Gestão de Encomendas dos Clientes</h3>
            <button
              onClick={carregarEncomendas}
              className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer"
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
                        <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
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

                      <select
                        value={enc.status || 'Aprovado / Pago'}
                        onChange={(e) => atualizarStatusEncomenda(enc.id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="Aprovado / Pago">Aprovado / Pago</option>
                        <option value="Em Separação">Em Separação</option>
                        <option value="Enviado / Em Trânsito">Enviado / Em Trânsito</option>
                        <option value="Entregue">Entregue</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'usuarios' && (
        <div className="bg-[#131a27] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="text-sm font-bold text-sky-400">👥 Gestão Completa de Utilizadores</h3>
              <p className="text-slate-400 text-[11px]">Veja os dados cadastrados, carrinho pendente, histórico de compras e altere permissões.</p>
            </div>
            <button
              onClick={carregarUsuarios}
              className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer"
            >
              🔄 Atualizar Lista
            </button>
          </div>

          <div>
            <input
              type="text"
              value={buscaUsuario}
              onChange={(e) => setBuscaUsuario(e.target.value)}
              placeholder="🔍 Pesquisar utilizador por nome ou e-mail..."
              className="w-full bg-[#0b101d] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {carregandoUsuarios ? (
            <p className="text-slate-400 py-12 text-center animate-pulse">A carregar utilizadores...</p>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-3xl mb-2">👤</p>
              <p>Nenhum utilizador encontrado na coleção "usuarios".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {usuariosFiltrados.map((user) => {
                const isSelected = utilizadorSelecionado?.id === user.id;
                const qtdCarrinhoUser = (user.carrinho || user.cart || user.itensCarrinho || []).length;

                return (
                  <div
                    key={user.id}
                    onClick={() => selecionarUtilizadorParaDetalhes(user)}
                    className={`bg-[#0b101d] border p-4 rounded-xl cursor-pointer transition space-y-3 ${isSelected ? 'border-sky-500 bg-sky-950/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{user.nome || 'Utilizador sem nome'}</p>
                        <p className="text-slate-400 text-xs">{user.email || user.id}</p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${user.isAdmin ? 'bg-purple-950/60 border border-purple-500/30 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                          {user.isAdmin ? 'Admin' : 'Cliente'}
                        </span>
                        <button
                          type="button"
                          onClick={() => alternarPermissaoAdmin(user.id, user.isAdmin)}
                          className="bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition border border-slate-700 cursor-pointer"
                        >
                          {user.isAdmin ? 'Tornar Cliente' : 'Tornar Admin'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                      <span>Carrinho Pendente: <strong className="text-sky-400">{qtdCarrinhoUser} itens</strong></span>
                      <span className="text-sky-400 underline">{isSelected ? 'A visualizar dados e histórico' : 'Ver dados, carrinho e histórico →'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {utilizadorSelecionado && (
            <div className="bg-[#0b101d] border border-sky-500/50 p-5 rounded-2xl space-y-5 mt-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">Painel de Detalhes: <span className="text-sky-400">{utilizadorSelecionado.email}</span></h4>
                  <p className="text-slate-400 text-[11px]">ID do Utilizador: {utilizadorSelecionado.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUtilizadorSelecionado(null)}
                  className="text-slate-400 hover:text-slate-200 font-bold cursor-pointer text-xs px-2.5 py-1 bg-slate-900 rounded-lg"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="space-y-2 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <h5 className="font-bold text-slate-300 text-xs">📋 Dados Cadastrados:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <p><strong className="text-slate-400">Nome:</strong> {utilizadorSelecionado.nome || 'Não preenchido'}</p>
                  <p><strong className="text-slate-400">E-mail:</strong> {utilizadorSelecionado.email || 'Não informado'}</p>
                  <p><strong className="text-slate-400">Telemóvel/Telefone:</strong> {utilizadorSelecionado.telefone || utilizadorSelecionado.phone || 'Não informado'}</p>
                  <p><strong className="text-slate-400">Perfil:</strong> <span className={utilizadorSelecionado.isAdmin ? 'text-purple-400 font-bold' : 'text-sky-400 font-bold'}>{utilizadorSelecionado.isAdmin ? 'Administrador' : 'Cliente'}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-300 text-xs">🛒 Carrinho Atual (Itens não finalizados):</h5>
                {(() => {
                  const carrinhoDoUser = utilizadorSelecionado.carrinho || utilizadorSelecionado.cart || utilizadorSelecionado.itensCarrinho || [];

                  if (carrinhoDoUser.length === 0) {
                    return <p className="text-slate-500 text-xs italic">O carrinho deste utilizador está vazio de momento.</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {carrinhoDoUser.map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                          <span className="font-bold text-slate-200 truncate">{item.nome || item.produtoNome} (Tam: {item.tamanho || 'Único'})</span>
                          <span className="text-sky-400 shrink-0 ml-2">Qtd: {item.qtd || item.quantidade || 1}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h5 className="font-bold text-slate-300 text-xs">📦 Histórico de Pedidos Finalizados:</h5>
                {carregandoDetalhesUser ? (
                  <p className="text-slate-500 text-xs animate-pulse">A carregar compras do utilizador...</p>
                ) : historicoUtilizador.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Este utilizador ainda não finalizou nenhuma compra.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {historicoUtilizador.map((compra) => {
                      const dataCompraFormatada = compra.criadoEm?.toDate
                        ? compra.criadoEm.toDate().toLocaleString('pt-BR')
                        : 'Recente';

                      return (
                        <div key={compra.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <p className="font-bold text-sky-400">Pedido #{compra.id.slice(0, 8)}</p>
                            <p className="text-slate-400 text-[10px]">Data: {dataCompraFormatada} — Status: <span className="text-emerald-400 font-bold">{compra.status || 'Pago'}</span></p>
                          </div>
                          <span className="font-extrabold text-slate-200">R$ {Number(compra.total || 0).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}