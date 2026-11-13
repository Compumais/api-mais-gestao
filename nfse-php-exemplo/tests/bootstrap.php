<?php

require __DIR__.'/../vendor/autoload.php';

set_error_handler(function ($severity, $message, $file, $line) {
    if ($severity === E_DEPRECATED && str_contains($message, 'setAccessible')) {
        return true; // suppress
    }

    return false; // bubble up
});
