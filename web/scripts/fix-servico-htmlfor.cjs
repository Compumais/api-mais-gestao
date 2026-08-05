const fs = require("node:fs");

const path = "src/app/(auth)/servicos/components/servico-form.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(/htmlFor="([a-z0-9_]+)"/g, 'htmlFor={fid("$1")}');
s = s.replace(
	/<FieldLabel htmlFor=\{campo\}>/g,
	"<FieldLabel htmlFor={fid(campo)}>",
);
s = s.replace(/\tid=\{campo\}/g, "\tid={fid(campo)}");

fs.writeFileSync(path, s);
console.log("ok");
