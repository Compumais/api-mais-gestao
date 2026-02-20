import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories";
import { criarContaCorrenteLancamentoService } from "@/service/contacorrentelancamento/criar-conta-corrente-lancamento";
import { httpErroInterno, httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util";
const criarContaCorrenteLancamentoBodySchema = z.object({
    idcontacorrente: z.string(),
    datahora: z.string().optional(),
    tipo: z.enum(["E", "S", "C", "D"]).optional(),
    valor: z.string(),
    historico: z.string().optional(),
    idplanocontas: z.string().optional(),
    evento: z.number().optional(),
    debito: z.string().optional(),
    documento: z.string().max(30).optional(),
    dataconciliacao: z.string().optional(),
});
export async function criarContaCorrenteLancamento(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const dadosValidados = criarContaCorrenteLancamentoBodySchema.parse(request.body);
        // Buscar conta corrente para obter idempresa
        const contaCorrente = await buscarContaCorrentePorId({
            id: dadosValidados.idcontacorrente,
        });
        if (!contaCorrente || !contaCorrente.idempresa) {
            return reply.status(httpNaoEncontrado().status).send({
                error: "Conta corrente não encontrada",
                code: "CONTA_CORRENTE_NOT_FOUND",
            });
        }
        // Mapear tipo: "E" = Entrada (C), "S" = Saída (D)
        const tipoLancamento = dadosValidados.tipo === "E"
            ? "C"
            : dadosValidados.tipo === "S"
                ? "D"
                : dadosValidados.tipo || "C";
        const dadosLancamento = {
            id: uuidv4(),
            idcontacorrente: dadosValidados.idcontacorrente,
            datahora: dadosValidados.datahora || new Date().toISOString().split("T")[0],
            tipo: tipoLancamento,
            valor: dadosValidados.valor,
            historico: dadosValidados.historico || null,
            idplanocontas: dadosValidados.idplanocontas || null,
            evento: dadosValidados.evento || null,
            debito: dadosValidados.debito || null,
            documento: dadosValidados.documento || null,
            dataconciliacao: dadosValidados.dataconciliacao || null,
        };
        const resultado = await criarContaCorrenteLancamentoService(dadosLancamento, request.user.id, contaCorrente.idempresa);
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