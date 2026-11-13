import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
    title: string;
    description: ReactNode;
};

const FeatureList: FeatureItem[] = [
    {
        title: "Padronização Nacional",
        description: (
            <>
                Totalmente compatível com o padrão nacional da NFS-e (Receita
                Federal), seguindo rigorosamente os schemas e regras de
                validação.
            </>
        ),
    },
    {
        title: "DTOs Tipados e Validados",
        description: (
            <>
                Utiliza <code>Tipagem forte</code> para garantir que seus
                dados estejam sempre corretos antes mesmo de gerar o XML.
            </>
        ),
    },
    {
        title: "Integração Simplificada",
        description: (
            <>
                Abstraia a complexidade técnica dos webservices e foque no que
                importa: a lógica de negócio da sua aplicação.
            </>
        ),
    },
    {
        title: "Assinatura Digital Nativa",
        description: (
            <>
                Suporte completo a certificados A1 (PKCS#12) e assinatura
                XML-DSig, garantindo a validade jurídica de todos os documentos
                gerados.
            </>
        ),
    },
    {
        title: "Arquitetura Moderna",
        description: (
            <>
                Desenvolvido com PHP 8.2+, aproveitando as últimas
                funcionalidades da linguagem para um código limpo, seguro e
                performático.
            </>
        ),
    },
    {
        title: "APIs de Serviços e Utilitários",
        description: (
            <>
                Integração com endpoints de utilidades e serviços —
                Contribuinte, Municípios e ADN — para emissão, consulta, eventos
                e parâmetros municipais.
            </>
        ),
    },
];

function Feature({ title, description }: FeatureItem) {
    return (
        <div className={clsx("col col--4")}>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
