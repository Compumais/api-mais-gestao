/// Protocolo Toledo Prix Prt3 (C14=Prt3, C15=2400, 8N1).
class Prt3Protocol {
  static const int enq = 0x05;
  static const int stx = 0x02;
  static const int etx = 0x03;

  static List<int> solicitarPeso() => [enq];
}
