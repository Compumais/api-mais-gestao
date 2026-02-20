import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarFinanceiroLancamentoService } from "@/service/financeirolancamento/criar-financeiro-lancamento";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";
const criarFinanceiroLancamentoBodySchema = z.object({
    idfinanceiro: z.string(),
    valoranterior: z.string().optional(),
    desconto: z.string().optional(),
    valor: z.string().optional(),
    pagamento: z.string().optional(),
    baixa: z.string().optional(),
    juros: z.string().optional(),
    multa: z.string().optional(),
    usuario: z.string().max(10).optional(),
    cancelado: z.number().optional(),
    datahoracancelado: z.string().optional(),
    evento: z.number(),
    historico: z.string().optional(),
    reabertura: z.string().optional(),
    observacao: z.string().optional(),
});
export async function criarFinanceiroLancamento(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const dadosValidados = criarFinanceiroLancamentoBodySchema.parse(request.body);
        const dadosFinanceiroLancamento = {
            id: uuidv4(),
            idfinanceiro: dadosValidados.idfinanceiro,
            valoranterior: dadosValidados.valoranterior,
            desconto: dadosValidados.desconto,
            valor: dadosValidados.valor,
            pagamento: dadosValidados.pagamento,
            baixa: dadosValidados.baixa,
            juros: dadosValidados.juros,
            multa: dadosValidados.multa,
            usuario: dadosValidados.usuario,
            cancelado: dadosValidados.cancelado,
            datahoracancelado: dadosValidados.datahoracancelado,
            evento: dadosValidados.evento,
            historico: dadosValidados.historico,
            reabertura: dadosValidados.reabertura,
            observacao: dadosValidados.observacao,
        };
        const resultado = await criarFinanceiroLancamentoService({
            dadosFinanceiroLancamento,
        });
        if (!resultado.success) {
            return reply.status(resultado.status).send(resultado);
        }
        return reply.status(resultado.status).send(resultado.body);
    }
    catch (err) {
        console.error(err);
        if (err instanceof z.ZodError) {
            return reply.status(400).send({
                error: "Erro de validação",
                code: "VALIDATION_ERROR",
                details: err.issues,
            });
        }
        return reply.status(httpErroInterno().status).send(httpErroInterno());
    }
}
//# sourceMappingURL=criar.js.map