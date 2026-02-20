export declare const usuariosRelations: import("drizzle-orm").Relations<"usuarios", {
    empresas: import("drizzle-orm").Many<"empresas">;
    usuarioEmpresas: import("drizzle-orm").Many<"usuario_empresas">;
    auditLogs: import("drizzle-orm").Many<"audit_logs">;
    sessions: import("drizzle-orm").Many<"sessoes">;
    accounts: import("drizzle-orm").Many<"contas">;
}>;
export declare const empresaRelations: import("drizzle-orm").Relations<"empresas", {
    proprietario: import("drizzle-orm").One<"usuarios", true>;
    usuarioEmpresas: import("drizzle-orm").Many<"usuario_empresas">;
    entidades: import("drizzle-orm").Many<"entidade">;
    contacorrentes: import("drizzle-orm").Many<"contacorrente">;
    financeiros: import("drizzle-orm").Many<"financeiro">;
    planocontas: import("drizzle-orm").Many<"planocontas">;
    tipodocumentofinanceiros: import("drizzle-orm").Many<"tipodocumentofinanceiro">;
    motivobaixafinanceiros: import("drizzle-orm").Many<"motivobaixafinanceiro">;
}>;
export declare const usuarioEmpresaRelations: import("drizzle-orm").Relations<"usuario_empresas", {
    user: import("drizzle-orm").One<"usuarios", true>;
    empresa: import("drizzle-orm").One<"empresas", true>;
}>;
export declare const auditLogsRelations: import("drizzle-orm").Relations<"audit_logs", {
    user: import("drizzle-orm").One<"usuarios", false>;
}>;
export declare const sessoesRelations: import("drizzle-orm").Relations<"sessoes", {
    user: import("drizzle-orm").One<"usuarios", true>;
}>;
export declare const contasRelations: import("drizzle-orm").Relations<"contas", {
    user: import("drizzle-orm").One<"usuarios", true>;
}>;
export declare const entidadeRelations: import("drizzle-orm").Relations<"entidade", {
    empresa: import("drizzle-orm").One<"empresas", true>;
}>;
export declare const financeiroRelations: import("drizzle-orm").Relations<"financeiro", {
    empresa: import("drizzle-orm").One<"empresas", true>;
    tipodocumentofinanceiro: import("drizzle-orm").One<"tipodocumentofinanceiro", false>;
    financeirolancamentos: import("drizzle-orm").Many<"financeirolancamento">;
}>;
export declare const planocontasRelations: import("drizzle-orm").Relations<"planocontas", {
    empresa: import("drizzle-orm").One<"empresas", true>;
}>;
export declare const contacorrenteRelations: import("drizzle-orm").Relations<"contacorrente", {
    empresa: import("drizzle-orm").One<"empresas", true>;
    lancamentos: import("drizzle-orm").Many<"contacorrentelancamento">;
}>;
export declare const contacorrentelancamentoRelations: import("drizzle-orm").Relations<"contacorrentelancamento", {
    contacorrente: import("drizzle-orm").One<"contacorrente", true>;
}>;
export declare const financeirolancamentoRelations: import("drizzle-orm").Relations<"financeirolancamento", {
    financeiro: import("drizzle-orm").One<"financeiro", true>;
}>;
export declare const tipodocumentofinanceiroRelations: import("drizzle-orm").Relations<"tipodocumentofinanceiro", {
    financeiros: import("drizzle-orm").Many<"financeiro">;
    motivobaixafinanceiro: import("drizzle-orm").One<"motivobaixafinanceiro", false>;
}>;
export declare const motivobaixafinanceiroRelations: import("drizzle-orm").Relations<"motivobaixafinanceiro", {
    financeiros: import("drizzle-orm").Many<"tipodocumentofinanceiro">;
}>;
//# sourceMappingURL=relations.d.ts.map