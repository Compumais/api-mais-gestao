const fs = require("node:fs");

const path = "src/app/(auth)/servicos/components/servico-form.tsx";
let s = fs.readFileSync(path, "utf8");

if (!s.includes('import { useId } from "react"')) {
	s = s.replace(
		'import { useRouter } from "next/navigation";',
		'import { useRouter } from "next/navigation";\nimport { useId } from "react";',
	);
}

if (!s.includes("const formId = useId()")) {
	s = s.replace(
		"export function ServicoForm(props: ServicoFormProps) {\n\tconst router = useRouter();",
		"export function ServicoForm(props: ServicoFormProps) {\n\tconst formId = useId();\n\tconst fid = (nome: string) => `${formId}-${nome}`;\n\tconst router = useRouter();",
	);
}

s = s.replace(/id="([a-z0-9_]+)"/g, 'id={fid("$1")}');
fs.writeFileSync(path, s);
console.log("ok");
