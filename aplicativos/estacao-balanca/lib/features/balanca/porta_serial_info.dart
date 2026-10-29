/// Identificador estável do conversor USB-Serial (ex.: `1027:24577`).
class PortaSerialInfo {
  const PortaSerialInfo({
    required this.id,
    required this.label,
  });

  final String id;
  final String label;
}
