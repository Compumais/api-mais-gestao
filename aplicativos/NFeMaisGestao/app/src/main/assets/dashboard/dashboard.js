(function () {
  var charts = {};
  var NAVY = '#0B3A82';
  var NAVY_DARK = '#082E69';
  var GREEN = '#009540';
  var RED = '#E7000B';
  var MUTED = '#B8B8AF';

  function parseNumber(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    var s = String(value).trim();
    if (!s) return 0;
    if (s.indexOf(',') >= 0) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function formatMoney(value) {
    return parseNumber(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatInt(value) {
    return parseNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  function destroyChart(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }

  function waitForChart(callback, attempts) {
    attempts = attempts || 0;
    if (typeof Chart !== 'undefined') {
      callback();
      return;
    }
    if (attempts > 40) {
      showError('Não foi possível carregar os gráficos.');
      return;
    }
    setTimeout(function () { waitForChart(callback, attempts + 1); }, 100);
  }

  function showError(msg) {
    var state = document.getElementById('stateMessage');
    var root = document.getElementById('dashboardRoot');
    if (root) root.classList.add('hidden');
    if (state) {
      state.textContent = msg;
      state.classList.remove('hidden');
    }
  }

  function metricCard(label, value) {
    return (
      '<div class="metric">' +
      '<div class="metric-label">' + label + '</div>' +
      '<div class="metric-value">' + value + '</div>' +
      '</div>'
    );
  }

  window.renderDashboard = function (payload) {
    waitForChart(function () {
      try {
        var data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!data || data.error) {
          showError(data && data.error ? data.error : 'Não foi possível carregar o dashboard.');
          return;
        }

        var dash = data.dashboard || {};
        var exec = data.executivo || {};

        var pagar = parseNumber(dash.totalContasPagar);
        var receber = parseNumber(dash.totalContasReceber);
        var usuarios = dash.quantidadeUsuarios != null ? formatInt(dash.quantidadeUsuarios) : '—';

        var fatValor = 0;
        if (exec.faturamento && exec.faturamento.valor != null) {
          fatValor = parseNumber(exec.faturamento.valor);
        }

        var qtdVendas = '—';
        var ticket = '—';
        var clientes = '—';
        if (exec.vendas) {
          if (exec.vendas.quantidade != null) qtdVendas = formatInt(exec.vendas.quantidade);
          if (exec.vendas.ticketMedio != null) ticket = formatMoney(exec.vendas.ticketMedio);
        }
        if (exec.clientesAtendidos != null) {
          clientes = formatInt(exec.clientesAtendidos);
        }

        var caixaAtual = 0;
        var caixaProj = 0;
        if (exec.caixa) {
          caixaAtual = parseNumber(exec.caixa.saldoAtual);
          caixaProj = parseNumber(exec.caixa.saldoProjetado);
        }

        document.getElementById('metricsRow').innerHTML =
          metricCard('Ticket médio', ticket) +
          metricCard('Clientes atendidos', clientes) +
          metricCard('Usuários', usuarios) +
          metricCard('Vendas (qtd.)', qtdVendas);

        document.getElementById('fatValor').textContent = formatMoney(fatValor);
        document.getElementById('fatVendas').textContent =
          'Quantidade de vendas: ' + qtdVendas;

        document.getElementById('stateMessage').classList.add('hidden');
        document.getElementById('dashboardRoot').classList.remove('hidden');

        var fontFamily = 'system-ui, sans-serif';
        Chart.defaults.font.family = fontFamily;
        Chart.defaults.color = '#4E4E3F';

        destroyChart('contas');
        charts.contas = new Chart(document.getElementById('chartContas'), {
          type: 'bar',
          data: {
            labels: ['Contas a pagar', 'Contas a receber'],
            datasets: [{
              label: 'Valor (R$)',
              data: [pagar, receber],
              backgroundColor: [RED, GREEN],
              borderRadius: 8,
              maxBarThickness: 56
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return formatMoney(ctx.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (v) {
                    return formatMoney(v);
                  }
                }
              }
            }
          }
        });

        destroyChart('fat');
        charts.fat = new Chart(document.getElementById('chartFaturamento'), {
          type: 'bar',
          data: {
            labels: ['Mês atual'],
            datasets: [{
              label: 'Faturamento',
              data: [fatValor],
              backgroundColor: NAVY,
              borderRadius: 8,
              maxBarThickness: 80
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return formatMoney(ctx.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (v) {
                    return formatMoney(v);
                  }
                }
              }
            }
          }
        });

        destroyChart('caixa');
        charts.caixa = new Chart(document.getElementById('chartCaixa'), {
          type: 'bar',
          data: {
            labels: ['Caixa'],
            datasets: [
              {
                label: 'Saldo atual',
                data: [caixaAtual],
                backgroundColor: NAVY,
                borderRadius: 8,
                maxBarThickness: 48
              },
              {
                label: 'Saldo projetado',
                data: [caixaProj],
                backgroundColor: MUTED,
                borderRadius: 8,
                maxBarThickness: 48
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: function (ctx) {
                    return ctx.dataset.label + ': ' + formatMoney(ctx.raw);
                  }
                }
              }
            },
            scales: {
              y: {
                ticks: {
                  callback: function (v) {
                    return formatMoney(v);
                  }
                }
              }
            }
          }
        });

        if (window.AndroidDashboard && window.AndroidDashboard.onContentHeight) {
          setTimeout(function () {
            var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            window.AndroidDashboard.onContentHeight(h);
          }, 120);
        }
      } catch (e) {
        showError('Erro ao exibir o dashboard.');
      }
    });
  };

  window.showDashboardError = function (message) {
    showError(message || 'Não foi possível carregar o dashboard.');
  };
})();
