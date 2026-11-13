<?php

use Nfse\Dto\Nfse\ObraData;
use Nfse\Dto\Nfse\ServicoData;
use Nfse\Dto\Nfse\ValoresData;

it('can instantiate DPS with Civil Construction (Obra)', function () {
    $servico = new ServicoData([
        'locPrest' => [
            'cLocPrest' => '3550308',
            'cPaisPrest' => null,
        ],
        'cServ' => [
            'cTribNac' => '07.02.01',
            'cTribMun' => '702',
            'xServ' => 'Execução de obra...',
            'cNBS' => '123456789',
            'cIntContrib' => null,
        ],
        'comExt' => null,
        'obra' => [
            'inscImobFisc' => '123456',
            'cObra' => 'OBRA-2023-001',
            'end' => [
                'endNac.cMun' => '3550308',
                'endNac.CEP' => '01001000',
                'xLgr' => 'Rua da Obra',
                'nro' => '100',
                'xBairro' => 'Centro',
                'xCpl' => null,
                'endExt' => null,
            ],
        ],
        'atvEvento' => null,
        'infocompl' => null,
        'idDocTec' => null,
        'docRef' => null,
        'xInfComp' => null,
    ]);

    expect($servico->obra)->toBeInstanceOf(ObraData::class);
    expect($servico->obra->codigoObra)->toBe('OBRA-2023-001');
});

it('can instantiate DPS with ISS Retained at Source', function () {
    $valores = new ValoresData([
        'vServPrest' => [
            'vServ' => 1000.00,
            'vRec' => null,
        ],
        'vDescCondIncond' => null,
        'vDedRed' => null,
        'trib' => [
            'tribMun.tribISSQN' => 1,
            'tribMun.tpImun' => null,
            'tribMun.tpRetISSQN' => 2,
            'tribMun.tpSusp' => null,
            'tribMun.nProcesso' => null,
            'tribMun.bm' => null,
            'trib.cstPisCofins' => null,
            'totTrib.pTotalTribSN' => null,
            'totTrib.indTotTrib' => 0,
        ],
    ]);

    expect($valores->tributacao->tipoRetencaoIssqn)->toBe(\Nfse\Enums\TipoRetencaoIssqn::RetidoTomador);
});
