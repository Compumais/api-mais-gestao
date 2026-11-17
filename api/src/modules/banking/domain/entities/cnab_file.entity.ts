export interface CnabFile {
  id: string;
  empresaId: string;
  slipId: string;
  filename: string;
  content: Buffer; // encrypted content
  createdAt: Date;
  updatedAt: Date;
}