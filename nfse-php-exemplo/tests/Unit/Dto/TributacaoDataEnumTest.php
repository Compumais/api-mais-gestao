<?php

use Nfse\Dto\Nfse\TributacaoData;
use Nfse\Enums\TributacaoIssqn;

it('can instantiate TributacaoData with enum values', function () {
    $data = new TributacaoData([
        'tribMun.tribISSQN' => 1,
    ]);

    expect($data->tributacaoIssqn)->toBe(TributacaoIssqn::OperacaoTributavel);
});
