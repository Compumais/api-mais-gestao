import 'package:flutter/material.dart';

import '../pdv/dinheiro.dart';
import '../pdv/modelos.dart';
import '../pdv/pdv_api.dart';
import '../sessao/sessao_store.dart';
import '../tef/pagamento_fechamento.dart';
import '../tef/retorno_tef.dart';
import '../tef/tef_bridge.dart';
import 'ajustes_page.dart';
import 'conta_page.dart';
import 'login_page.dart';
import 'mesas_page.dart';
import 'resultado_page.dart';

class PosShell extends StatefulWidget {
  const PosShell({
    super.key,
    required this.store,
    required this.tef,
  });

  final SessaoStore store;
  final TefBridge tef;

  @override
  State<PosShell> createState() => _PosShellState();
}

enum _Destino { login, mesas, conta, ajustes, resultado }

class _PosShellState extends State<PosShell> {
  _Destino _destino = _Destino.login;
  PdvApi? _api;
  bool _ocupado = false;
  bool _carregandoMesas = false;
  bool _carregandoConta = false;
  String? _erroMesas;
  String? _erroConta;
  bool _comanda = false;
  List<MesaResumo> _mesas = const [];
  ContaDetalhe? _conta;
  FechamentoPendente? _pendente;
  _Recibo? _recibo;

  @override
  void initState() {
    super.initState();
    _comanda = widget.store.comanda;
    _pendente = widget.store.pendente;
    final token = widget.store.token;
    if (token != null) {
      _api = PdvApi(baseUrl: widget.store.url, token: token);
      _destino = _Destino.mesas;
      _atualizarMesas();
    }
  }

  Future<String?> _entrar(String url, String usuario, String senha) async {
    final endereco = url.trim();
    if (endereco.isEmpty || usuario.trim().isEmpty || senha.isEmpty) {
      return 'Informe o endereço do PDV, o usuário e a senha.';
    }
    setState(() => _ocupado = true);
    try {
      final api = PdvApi(baseUrl: endereco);
      final token = await api.login(
        usuario: usuario,
        senha: senha,
        identificador: widget.store.terminalId,
      );
      final comanda = await api.modeloComanda();
      await widget.store.salvarLogin(
        url: endereco,
        token: token,
        usuario: usuario,
        comanda: comanda,
      );
      setState(() {
        _api = api;
        _comanda = comanda;
        _destino = _Destino.mesas;
        _ocupado = false;
      });
      await _atualizarMesas();
      return null;
    } on PdvErro catch (erro) {
      setState(() => _ocupado = false);
      return erro.mensagem;
    } catch (_) {
      setState(() => _ocupado = false);
      return 'Não foi possível entrar no PDV.';
    }
  }

  Future<void> _atualizarMesas() async {
    final api = _api;
    if (api == null) {
      return;
    }
    setState(() {
      _carregandoMesas = true;
      _erroMesas = null;
    });
    try {
      final comanda = await api.modeloComanda();
      final mesas = await api.listarAbertas();
      if (!mounted) {
        return;
      }
      setState(() {
        _comanda = comanda;
        _mesas = mesas;
        _carregandoMesas = false;
      });
    } on PdvErro catch (erro) {
      if (erro.naoAutorizado) {
        await _sair();
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _carregandoMesas = false;
        _erroMesas = erro.mensagem;
      });
    }
  }

  Future<void> _abrirConta(MesaResumo mesa) async {
    final id = mesa.idConta;
    if (id == null) {
      return;
    }
    setState(() {
      _destino = _Destino.conta;
      _conta = null;
      _carregandoConta = true;
      _erroConta = null;
    });
    await _carregarConta(id);
  }

  Future<void> _carregarConta(String id) async {
    final api = _api;
    if (api == null) {
      return;
    }
    try {
      final conta = await api.obterConta(id);
      if (!mounted) {
        return;
      }
      setState(() {
        _conta = conta;
        _carregandoConta = false;
      });
    } on PdvErro catch (erro) {
      if (erro.naoAutorizado) {
        await _sair();
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _carregandoConta = false;
        _erroConta = erro.mensagem;
      });
    }
  }

  Future<void> _pagar(String funcao) async {
    final conta = _conta;
    final api = _api;
    if (conta == null || api == null || conta.aPagar <= 0) {
      return;
    }
    final pendente = _pendente;
    if (pendente != null && pendente.idConta == conta.id) {
      await _concluirPendente();
      return;
    }
    if (!await widget.tef.disponivel()) {
      setState(() {
        _erroConta = 'Intent Digital Hub não está instalado neste aparelho.';
      });
      return;
    }
    setState(() {
      _ocupado = true;
      _erroConta = null;
    });
    final retorno = await widget.tef.executar(
      extrasTransacao(funcao: funcao, valor: valorTef(conta.aPagar)),
    );
    if (!mounted) {
      return;
    }
    if (!retorno.aprovado || retorno.nsu == null) {
      setState(() {
        _ocupado = false;
        _erroConta = retorno.mensagem ?? 'Pagamento não aprovado.';
      });
      return;
    }
    final fechamento = FechamentoPendente(
      idConta: conta.id,
      numero: conta.numero,
      valor: conta.aPagar,
      funcao: funcao,
      nsu: retorno.nsu!,
      autorizacao: retorno.autorizacao,
      bandeira: retorno.bandeira,
      viaCliente: retorno.viaCliente,
    );
    await _registrar(api, fechamento);
  }

  Future<void> _concluirPendente() async {
    final pendente = _pendente;
    final api = _api;
    if (pendente == null || api == null) {
      return;
    }
    setState(() => _ocupado = true);
    await _registrar(api, pendente);
  }

  Future<void> _registrar(PdvApi api, FechamentoPendente fechamento) async {
    try {
      await api.fecharConta(fechamento.idConta, pagamentoDoPendente(fechamento));
      await widget.store.limparPendente();
      if (!mounted) {
        return;
      }
      setState(() {
        _pendente = null;
        _ocupado = false;
        _recibo = _Recibo(
          numero: fechamento.numero,
          valor: fechamento.valor,
          nsu: fechamento.nsu,
          viaCliente: fechamento.viaCliente,
        );
        _destino = _Destino.resultado;
      });
    } on PdvErro catch (erro) {
      await widget.store.salvarPendente(fechamento);
      if (erro.naoAutorizado) {
        await _sair();
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _pendente = fechamento;
        _ocupado = false;
        _erroConta =
            '${erro.mensagem} O TEF já aprovou (NSU ${fechamento.nsu}). Use concluir fechamento, sem cobrar de novo.';
        _erroMesas = _erroConta;
      });
    }
  }

  Future<String?> _configurarTef() async {
    if (!await widget.tef.disponivel()) {
      return 'Intent Digital Hub não está instalado neste aparelho.';
    }
    setState(() => _ocupado = true);
    final retorno = await widget.tef.executar(extrasConfigurar(), exigeNsu: false);
    if (mounted) {
      setState(() => _ocupado = false);
    }
    return retorno.mensagem ?? (retorno.aprovado ? 'Configuração enviada.' : 'Configuração não concluída.');
  }

  Future<String?> _ativarTef(String cnpj) async {
    if (cnpj.trim().isEmpty) {
      return 'Informe o CNPJ ou CPF.';
    }
    if (!await widget.tef.disponivel()) {
      return 'Intent Digital Hub não está instalado neste aparelho.';
    }
    await widget.store.salvarCnpj(cnpj);
    setState(() => _ocupado = true);
    final retorno = await widget.tef.executar(extrasAtivar(cnpj), exigeNsu: false);
    if (mounted) {
      setState(() => _ocupado = false);
    }
    return retorno.mensagem ?? (retorno.aprovado ? 'Ativação enviada.' : 'Ativação não concluída.');
  }

  Future<void> _sair() async {
    await widget.store.sair();
    if (!mounted) {
      return;
    }
    setState(() {
      _api = null;
      _destino = _Destino.login;
      _mesas = const [];
      _conta = null;
      _ocupado = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return switch (_destino) {
      _Destino.login => LoginPage(
          urlInicial: widget.store.url,
          usuarioInicial: widget.store.usuario,
          ocupado: _ocupado,
          entrar: _entrar,
        ),
      _Destino.mesas => MesasPage(
          comanda: _comanda,
          mesas: _mesas,
          carregando: _carregandoMesas,
          erro: _erroMesas,
          pendente: _pendente,
          aoAtualizar: _atualizarMesas,
          aoAbrir: _abrirConta,
          aoAjustes: () => setState(() => _destino = _Destino.ajustes),
          aoSair: _sair,
          aoConcluirPendente: _concluirPendente,
        ),
      _Destino.conta => ContaPage(
          comanda: _comanda,
          conta: _conta,
          carregando: _carregandoConta,
          erro: _erroConta,
          pagando: _ocupado,
          aoPagar: _pagar,
          aoVoltar: () {
            setState(() => _destino = _Destino.mesas);
            _atualizarMesas();
          },
        ),
      _Destino.ajustes => AjustesPage(
          cnpjInicial: widget.store.cnpj,
          ocupado: _ocupado,
          aoConfigurar: _configurarTef,
          aoAtivar: _ativarTef,
          aoVoltar: () => setState(() => _destino = _Destino.mesas),
        ),
      _Destino.resultado => ResultadoPage(
          comanda: _comanda,
          numero: _recibo?.numero ?? 0,
          valor: _recibo?.valor ?? 0,
          nsu: _recibo?.nsu ?? '',
          viaCliente: _recibo?.viaCliente,
          aoVoltar: () {
            setState(() => _destino = _Destino.mesas);
            _atualizarMesas();
          },
        ),
    };
  }
}

class _Recibo {
  const _Recibo({
    required this.numero,
    required this.valor,
    required this.nsu,
    this.viaCliente,
  });

  final int numero;
  final double valor;
  final String nsu;
  final String? viaCliente;
}
