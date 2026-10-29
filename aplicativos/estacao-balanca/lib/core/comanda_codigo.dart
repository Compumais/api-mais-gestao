/// Normaliza o código vindo do leitor HID de comanda.
///
/// Quando [ignorarDigitoVerificador] está ativo e o código tem pelo menos
/// 2 dígitos numéricos, remove o último (DV), como no PDV/Tecnibra.
String normalizarCodigoComanda(
  String raw, {
  required bool ignorarDigitoVerificador,
}) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (!ignorarDigitoVerificador || digits.length < 2) {
    return digits;
  }
  return digits.substring(0, digits.length - 1);
}
