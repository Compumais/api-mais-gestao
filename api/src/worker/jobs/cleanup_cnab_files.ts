import { CnabFileRepository } from '../../modules/banking/infrastructure/repositories/cnab_file.repository';

export async function executarLimpezaCnab(): Promise<void> {
  const repo = new CnabFileRepository();
  // 30 dias retention as agreed
  await repo.deleteOlderThan(30);
  console.log('[cnab cleanup] arquivos antigos removidos');
}
