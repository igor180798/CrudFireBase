import { db, auth } from "./src/firebase.js";
import { collection, writeBatch, doc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

// Tamanhos disponíveis
const TAMANHOS = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

// Bancos de dados para geração variada de nomes
const TIPOS = [
  "Tênis",
  "Mocassim",
  "Sapatenis",
  "Bota",
  "Sandália",
  "Slip On",
  "Chuteira",
  "Chinelo Slide",
  "Oxford",
  "Derby"
];

const MODELOS = [
  "Running Nitro",
  "Classic Vintage",
  "Urban Street",
  "Sport Pro",
  "Air Cushion",
  "Casual Leather",
  "Retro Skate",
  "Trail Explorer",
  "Comfort Plus",
  "Speed Dynamic",
  "Flex Walker",
  "Prime Pulse",
  "Ultra Boost",
  "Minimalist Wave",
  "Elite Performance"
];

const CORES = [
  "Preto",
  "Branco",
  "All Black",
  "Cinza Espacial",
  "Azul Marinho",
  "Vermelho Carmim",
  "Verde Militar",
  "Caramelo",
  "Grafite",
  "Off-White"
];

// Imagens públicas e otimizadas de calçados (Unsplash)
const IMAGENS = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512990414788-d97cb4a25db3?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80"
];

function gerarNumeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarPrecoAleatorio(min = 50, max = 800) {
  const preco = Math.random() * (max - min) + min;
  return Number(preco.toFixed(2));
}

function gerarProdutoFicticio(indice) {
  const tipo = TIPOS[indice % TIPOS.length];
  const modelo = MODELOS[Math.floor(indice / TIPOS.length) % MODELOS.length];
  const cor = CORES[indice % CORES.length];
  const sufixo = (indice % 7 === 0) ? ` Ed. ${Math.floor(indice / 10) + 1}` : "";

  const nome = `${tipo} ${modelo} ${cor}${sufixo}`;
  const preco = gerarPrecoAleatorio(50, 800);
  const imagemUrl = IMAGENS[indice % IMAGENS.length];

  // Gera quantidades para os tamanhos
  const tamanhos = {};
  let somaEstoque = 0;

  TAMANHOS.forEach((tam) => {
    // 80% de chance de haver estoque do tamanho
    if (Math.random() > 0.2) {
      const qtd = gerarNumeroAleatorio(1, 15);
      tamanhos[tam] = qtd;
      somaEstoque += qtd;
    }
  });

  // Garante ao menos um tamanho com estoque
  if (somaEstoque === 0) {
    const tamAleatorio = TAMANHOS[gerarNumeroAleatorio(0, TAMANHOS.length - 1)];
    tamanhos[tamAleatorio] = 5;
    somaEstoque = 5;
  }

  return {
    nome,
    preco,
    imagemUrl,
    estoque: somaEstoque,
    estoqueTotal: somaEstoque,
    tamanhos,
    criadoEm: new Date()
  };
}

async function seed() {
  console.log("====================================================");
  console.log("🚀 Iniciando Seed de 1000 Produtos no Firestore");
  console.log("====================================================\n");

  // Se o usuário passou email e senha como argumentos: node seed.js email@exemplo.com senha123
  const [,, emailArg, senhaArg] = process.argv;
  if (emailArg && senhaArg) {
    try {
      console.log(`🔑 Autenticando com ${emailArg}...`);
      await signInWithEmailAndPassword(auth, emailArg, senhaArg);
      console.log("✅ Usuário autenticado com sucesso!\n");
    } catch (authErr) {
      console.warn(`⚠️ Falha ao autenticar com ${emailArg}:`, authErr.message);
      console.warn("Prosseguindo sem autenticação direta...\n");
    }
  }

  const TOTAL_PRODUTOS = 1000;
  const BATCH_SIZE = 250; // Firestore aceita até 500 por lote. 250 garante estabilidade e rapidez.
  const totalLotes = Math.ceil(TOTAL_PRODUTOS / BATCH_SIZE);

  const produtosCollectionRef = collection(db, "produtos");
  let produtosCadastrados = 0;

  console.time("⏱️ Tempo Total de Execução");

  for (let loteIndex = 0; loteIndex < totalLotes; loteIndex++) {
    const batch = writeBatch(db);
    const inicioLote = loteIndex * BATCH_SIZE;
    const fimLote = Math.min(inicioLote + BATCH_SIZE, TOTAL_PRODUTOS);
    const quantidadeNoLote = fimLote - inicioLote;

    for (let i = inicioLote; i < fimLote; i++) {
      const novoProdutoRef = doc(produtosCollectionRef);
      const dadosProduto = gerarProdutoFicticio(i);
      batch.set(novoProdutoRef, dadosProduto);
    }

    const progressoPercent = Math.round((fimLote / TOTAL_PRODUTOS) * 100);
    process.stdout.write(`📦 Enviando lote ${loteIndex + 1}/${totalLotes} (${quantidadeNoLote} itens)... `);

    try {
      await batch.commit();
      produtosCadastrados += quantidadeNoLote;
      console.log(`✅ [${produtosCadastrados}/${TOTAL_PRODUTOS}] (${progressoPercent}%)`);
    } catch (error) {
      console.log(`❌ Erro no lote ${loteIndex + 1}:`);
      console.error(error.message);
      if (error.code === "permission-denied") {
        console.error("\n🔒 DICA DE PERMISSÃO:");
        console.error("O Firestore bloqueou o acesso (PERMISSION_DENIED).");
        console.error("Você pode:");
        console.error("1. Passar suas credenciais criadas no app: node seed.js seu@email.com suaSenha");
        console.error("2. Ou liberar as regras no Firebase Console temporariamente em modo de teste:");
        console.error("   allow read, write: if true;\n");
      }
      process.exit(1);
    }

    // Pequena pausa entre lotes para não sobrecarregar
    if (loteIndex < totalLotes - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log("\n====================================================");
  console.log(`🎉 Concluído com sucesso! ${produtosCadastrados} produtos cadastrados.`);
  console.timeEnd("⏱️ Tempo Total de Execução");
  console.log("====================================================");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
