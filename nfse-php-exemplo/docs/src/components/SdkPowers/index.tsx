import React from "react";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type Card = { title: string; description: React.ReactNode; icon?: string };

const cards: Card[] = [
    {
        title: "Gestão de Certificados",
        icon: "🔐",
        description: (
            <>
                Suporte nativo a certificados A1 (PFX). O SDK gerencia o
                carregamento, validação da senha e extração das chaves pública e
                privada automaticamente.
            </>
        ),
    },
    {
        title: "Assinatura Digital (XAdES)",
        icon: "✒️",
        description: (
            <>
                Assinatura automática do XML seguindo o padrão XAdES-BES.
                Canonicalização, digests e tags <code>Signature</code> são
                tratadas pelo SDK.
            </>
        ),
    },
    {
        title: "Validação Prévia",
        icon: "🛡️",
        description: (
            <>
                O SDK valida os dados (DTOs) localmente antes de enviar para a
                API, evitando rejeições desnecessárias e acelerando o
                desenvolvimento.
            </>
        ),
    },
    {
        title: "Respostas Tipadas",
        icon: "📦",
        description: (
            <>
                As respostas da API são convertidas em objetos PHP. Acesse
                <code>$response-&gt;chaveAcesso</code> ou{" "}
                <code>$response-&gt;erros</code>
                com autocompletar.
            </>
        ),
    },
    {
        title: "Ambientes Configuráveis",
        icon: "🔄",
        description: (
            <>
                Altere entre Produção e Homologação com uma única configuração —
                o SDK ajusta automaticamente URLs e cabeçalhos.
            </>
        ),
    },
    {
        title: "Tratamento de Erros",
        icon: "⚠️",
        description: (
            <>
                Exceções claras (<code>NfseContribuinteException</code>) ajudam
                a identificar se o problema foi na validação, assinatura, rede
                ou rejeição.
            </>
        ),
    },
];

function Card({ title, description, icon }: Card) {
    return (
        <div className={styles.card}>
            <div className={styles.cardTitle}>
                <span className={styles.icon}>{icon}</span>
                {title}
            </div>
            <div className={styles.cardDescription}>{description}</div>
        </div>
    );
}

export default function SdkPowers(): React.ReactElement {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>Poderes do SDK</h2>
                <div className={styles.grid}>
                    {cards.map((c, i) => (
                        <Card key={i} {...c} />
                    ))}
                </div>
            </div>
        </section>
    );
}
