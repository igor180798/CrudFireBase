const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.criarPreferenciaPagamento = onRequest({ cors: true }, async (req, res) => {
    try {
        const { itensCarrinho } = req.body;

        if (!itensCarrinho || !Array.isArray(itensCarrinho) || itensCarrinho.length === 0) {
            return res.status(400).json({ erro: "O carrinho está vazio." });
        }

        let totalCalculado = 0;
        const itensValidados = [];

        // Validação de preços consultando a base de dados (servidor seguro)
        for (const item of itensCarrinho) {
            const prodRef = db.collection('produtos').doc(item.id);
            const prodSnap = await prodRef.get();

            if (!prodSnap.exists) {
                return res.status(400).json({ erro: `Produto não encontrado: ${item.nome}` });
            }

            const dadosProduto = prodSnap.data();
            const precoReal = dadosProduto.preco;
            const subtotal = precoReal * item.qtd;

            totalCalculado += subtotal;
            itensValidados.push({
                id: item.id,
                nome: dadosProduto.nome,
                precoUnitario: precoReal,
                qtd: item.qtd,
                tamanho: item.tamanho || 'Único'
            });
        }

        // Retorna os dados validados para o frontend guardar na encomenda
        return res.status(200).json({
            sucesso: true,
            totalCalculado,
            itens: itensValidados
        });

    } catch (err) {
        console.error("Erro na Cloud Function:", err);
        return res.status(500).json({ erro: "Erro interno no servidor de pagamento." });
    }
});