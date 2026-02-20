import { criarAssinaturaService } from "@/service/assinaturas/criar-assinatura";
import { z } from "zod";
const checkoutBodySchema = z.object({
    idempresa: z.string().uuid(),
    plano: z.enum(["BASIC", "PREMIUM"]),
    ciclo: z.enum(["MONTHLY"]),
    creditCard: z.object({
        holderName: z.string(),
        number: z.string(),
        expiryMonth: z.string(),
        expiryYear: z.string(),
        ccv: z.string(),
    }),
    creditCardHolderInfo: z.object({
        name: z.string(),
        email: z.string().email(),
        cpfCnpj: z.string(),
        postalCode: z.string().optional(),
        address: z.string().optional(),
        addressNumber: z.string().optional(),
        complement: z.string().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        phone: z.string(),
    }),
});
export async function checkoutController(request, reply) {
    const body = checkoutBodySchema.parse(request.body);
    // TODO: Validate if user belongs to empresa or has permission
    // verifyJwt middleware ensures user is logged in, but we should check permission.
    // For now, simpler implementation.
    try {
        const assinatura = await criarAssinaturaService({
            ...body,
            remoteIp: request.ip,
        });
        return reply.status(201).send(assinatura);
    }
    catch (error) {
        if (error.message === "Empresa não encontrada") {
            return reply.status(404).send({ message: error.message });
        }
        console.error("Checkout Error:", error);
        return reply.status(500).send({ message: "Erro ao processar assinatura", error: error.message });
    }
}
//# sourceMappingURL=checkout.js.map