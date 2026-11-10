"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_crypto = require("node:crypto");
function hashSenhaGerencial(senha, saltExistente) {
  const texto = senha.trim();
  if (texto.length < 4) {
    throw new Error("A senha gerencial precisa ter ao menos 4 caracteres");
  }
  const salt = saltExistente?.trim() || node_crypto.randomBytes(16).toString("hex");
  const hash = node_crypto.createHash("sha256").update(`${salt}:${texto}`).digest("hex");
  return { salt, hash };
}
function senhaGerencialConfere(senha, salt, hash) {
  if (!salt || !hash) return false;
  const calc = node_crypto.createHash("sha256").update(`${salt}:${senha.trim()}`).digest("hex");
  const a = Buffer.from(calc, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return node_crypto.timingSafeEqual(a, b);
}
exports.hashSenhaGerencial = hashSenhaGerencial;
exports.senhaGerencialConfere = senhaGerencialConfere;
