
import { atualizarPlanoUsuario, buscarPlanoUsuario } from './dist/src/repositories/usuarios-repositories.js';
import { buscarEntitlementService } from './dist/src/service/planos/buscar-plano-efetivo.js';

const id = '4VZFeBIZJ3v696vu1yqMwBp36PbRgpYU';
const empresa = '82ca533e-323e-4fca-a06f-50a8f342cb9f';

const hoje = new Date();
const fim = new Date(hoje);
fim.setMonth(fim.getMonth() + 1);

console.log('updating with Date objects...');
try {
  const r = await atualizarPlanoUsuario(id, {
    plano: 'ENTERPRISE',
    plano_inicio_ciclo: hoje,
    plano_fim_ciclo: fim,
    plano_proximo: null,
  });
  console.log('update result plano=', r?.plano, 'inicio=', r?.plano_inicio_ciclo, 'fim=', r?.plano_fim_ciclo);
} catch (e) {
  console.error('UPDATE FAILED', e);
}

const row = await buscarPlanoUsuario(id);
console.log('buscarPlanoUsuario', row);

const ent = await buscarEntitlementService({ idusuario: id, idempresa: empresa });
console.log('entitlement plano', ent.plano, 'modulos', ent.modulos, 'features', ent.features);

process.exit(0);
