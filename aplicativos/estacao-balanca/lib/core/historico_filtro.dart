import 'package:estacao_balanca/core/pesagem.dart';
import 'package:estacao_balanca/core/produto_busca.dart';

enum PeriodoHistorico { todos, hoje, ontem, ultimos7, personalizado }

extension PeriodoHistoricoRotulo on PeriodoHistorico {
  String get rotulo => switch (this) {
        PeriodoHistorico.todos => 'Todos',
        PeriodoHistorico.hoje => 'Hoje',
        PeriodoHistorico.ontem => 'Ontem',
        PeriodoHistorico.ultimos7 => '7 dias',
        PeriodoHistorico.personalizado => 'Período…',
      };
}

/// Filtros do histórico de lançamentos.
class FiltroHistorico {
  const FiltroHistorico({
    this.periodo = PeriodoHistorico.todos,
    this.inicio,
    this.fim,
    this.comanda = '',
    this.produto = '',
  });

  final PeriodoHistorico periodo;

  /// Só valem com [PeriodoHistorico.personalizado] (datas inclusivas).
  final DateTime? inicio;
  final DateTime? fim;

  /// Número da comanda. Compara o número inteiro, não um trecho (a comanda 1
  /// não deve trazer a 12, 101...).
  final String comanda;

  /// Trecho do nome do produto (sem acento e sem diferença de caixa).
  final String produto;

  bool get ativo =>
      periodo != PeriodoHistorico.todos ||
      comanda.trim().isNotEmpty ||
      produto.trim().isNotEmpty;

  FiltroHistorico copyWith({
    PeriodoHistorico? periodo,
    DateTime? inicio,
    DateTime? fim,
    String? comanda,
    String? produto,
  }) {
    return FiltroHistorico(
      periodo: periodo ?? this.periodo,
      inicio: inicio ?? this.inicio,
      fim: fim ?? this.fim,
      comanda: comanda ?? this.comanda,
      produto: produto ?? this.produto,
    );
  }
}

DateTime _inicioDoDia(DateTime d) => DateTime(d.year, d.month, d.day);

/// Intervalo `[inicio, fim)` do período, ou `null` quando não restringe.
({DateTime inicio, DateTime fim})? intervaloDoPeriodo(
  FiltroHistorico filtro,
  DateTime agora,
) {
  final hoje = _inicioDoDia(agora);
  switch (filtro.periodo) {
    case PeriodoHistorico.todos:
      return null;
    case PeriodoHistorico.hoje:
      return (inicio: hoje, fim: hoje.add(const Duration(days: 1)));
    case PeriodoHistorico.ontem:
      return (inicio: DateTime(hoje.year, hoje.month, hoje.day - 1), fim: hoje);
    case PeriodoHistorico.ultimos7:
      return (
        inicio: DateTime(hoje.year, hoje.month, hoje.day - 6),
        fim: DateTime(hoje.year, hoje.month, hoje.day + 1),
      );
    case PeriodoHistorico.personalizado:
      final ini = filtro.inicio;
      final fim = filtro.fim ?? ini;
      if (ini == null || fim == null) return null;
      final a = _inicioDoDia(ini);
      final b = _inicioDoDia(fim);
      final menor = a.isBefore(b) ? a : b;
      final maior = a.isBefore(b) ? b : a;
      return (
        inicio: menor,
        fim: DateTime(maior.year, maior.month, maior.day + 1),
      );
  }
}

/// Aplica os filtros mantendo a ordem recebida (mais recente primeiro).
List<SessaoPesagem> filtrarHistorico(
  List<SessaoPesagem> itens,
  FiltroHistorico filtro, {
  DateTime? agora,
}) {
  final intervalo = intervaloDoPeriodo(filtro, agora ?? DateTime.now());
  final numero = int.tryParse(filtro.comanda.trim());
  final comandaInformada = filtro.comanda.trim().isNotEmpty;
  final termoProduto = normalizarTextoBusca(filtro.produto);

  return itens.where((s) {
    if (intervalo != null &&
        (s.quando.isBefore(intervalo.inicio) ||
            !s.quando.isBefore(intervalo.fim))) {
      return false;
    }
    if (comandaInformada && s.numero != numero) return false;
    if (termoProduto.isNotEmpty &&
        !normalizarTextoBusca(s.produtoDescricao).contains(termoProduto)) {
      return false;
    }
    return true;
  }).toList();
}

/// Soma dos totais (R$) dos lançamentos.
double totalHistorico(List<SessaoPesagem> itens) =>
    itens.fold(0.0, (soma, s) => soma + s.total);
