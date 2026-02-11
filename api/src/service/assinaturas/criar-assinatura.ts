
import { randomUUID } from "node:crypto";
import { buscarClienteAsaas, criarAssinatura, criarClienteAsaas } from "@/repositories/assinatura-repositories";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories";
import { AsaasService } from "../asaas/asaas.service";

interface CriarAssinaturaParams {
    idempresa: string;
    plano: "BASIC" | "PREMIUM";
    ciclo: "MONTHLY";
    creditCard: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode?: string;
        address?: string;
        addressNumber?: string;
        complement?: string;
        province?: string;
        city?: string;
        phone: string;
    };
    remoteIp: string;
}

export async function criarAssinaturaService({
    idempresa,
    plano,
    ciclo,
    creditCard,
    creditCardHolderInfo,
    remoteIp,
}: CriarAssinaturaParams) {
    // 1. Verificar se empresa existe
    const empresa = await buscarEmpresaPorId(idempresa);
    if (!empresa) {
        throw new Error("Empresa não encontrada");
    }

    // 2. Verificar/Criar Cliente no Asaas
    let clienteAsaas = await buscarClienteAsaas(idempresa);

    if (!clienteAsaas) {
        // Procura no Asaas pelo email da empresa ou do holder
        // Mas o ideal é usar os dados da empresa se tiver, ou do holder.
        // O prompt diz "Criar cliente no Asass(caso não exista)".

        // Vamos usar os dados do Credit Card Holder como dados do cliente Asaas, 
        // pois a assinatura é cobrada dele.

        const asaasCustomer = await AsaasService.createCustomer({
            name: creditCardHolderInfo.name,
            email: creditCardHolderInfo.email,
            cpfCnpj: creditCardHolderInfo.cpfCnpj,
            phone: creditCardHolderInfo.phone,
            externalReference: idempresa
        });

        clienteAsaas = await criarClienteAsaas({
            id: randomUUID(),
            idempresa,
            idclienteasaas: asaasCustomer.id,
            criadoem: new Date(),
        });
    }

    // 3. Definir valor do plano
    let valor = 0;
    if (plano === "BASIC") valor = 99.00;
    else if (plano === "PREMIUM") valor = 199.00;
    else throw new Error("Plano inválido");

    // 4. Criar Assinatura no Asaas
    const asaasSubscription = await AsaasService.createSubscription({
        customer: clienteAsaas.idclienteasaas,
        billingType: "CREDIT_CARD",
        value: valor,
        nextDueDate: new Date().toISOString().split('T')[0], // Hoje ou amanhã? Asaas aceita hoje? Geralmente sim.
        cycle: "MONTHLY",
        description: `Assinatura Plano ${plano}`,
        externalReference: idempresa,
        creditCard,
        creditCardHolderInfo,
        remoteIp
    });

    // 5. Salvar Assinatura localmente
    const assinatura = await criarAssinatura({
        id: randomUUID(),
        idempresa,
        idassinaturaasaas: asaasSubscription.id,
        status: asaasSubscription.status,
        plano,
        valor: valor.toString(), // numeric field expects string or number, drizzle types usually string for numeric
        ciclo,
        proximovencimento: asaasSubscription.nextDueDate,
        urlpagamento: asaasSubscription.invoiceUrl,
        criadoem: new Date(),
        atualizadoem: new Date(),
    });

    return assinatura;
}
