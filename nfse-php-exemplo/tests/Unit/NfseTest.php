<?php

namespace Nfse\Tests\Unit;

use Nfse\Http\NfseContext;
use Nfse\Nfse;
use Nfse\Service\ContribuinteService;
use Nfse\Service\MunicipioService;
use PHPUnit\Framework\TestCase;

class NfseTest extends TestCase
{
    public function test_can_instantiate_services()
    {
        $context = new NfseContext(
            \Nfse\Enums\TipoAmbiente::Homologacao,
            'cert.pfx',
            'password'
        );
        $nfse = new Nfse($context);

        $this->assertInstanceOf(ContribuinteService::class, $nfse->contribuinte());
        $this->assertInstanceOf(MunicipioService::class, $nfse->municipio());
    }
}
