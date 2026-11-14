# POC local de contenção de navegação

## Estado

Experimento manual separado do CLI `npm run ronda` e do visor Next. Não habilita `--base-url`, não altera o fixture público e não aceita URL informada por usuário. Executa Chromium local contra dois servidores sintéticos ligados apenas em `127.0.0.1`.

Rodar: `npm run sandbox:poc`.

## O que demonstra

- Só libera `GET` HTTP para a origem IPv4 loopback exata do servidor sintético.
- Bloqueia origens/portas diferentes, esquemas `file:`/`data:`, HTTP(S) fora da origem, credenciais na URL e endereços alternativos de loopback/privados usados nos casos do script.
- Intercepta subrecursos, bloqueia `POST` e WebSocket, faz fetch de cada GET autorizado sem seguir redirects (`maxRedirects: 0`) e responde 502 local quando encontra redirect.
- Executa uma rota GET sintética que incrementa contador no servidor permitido, provando que a allowlist de rede não torna GET sem efeitos.
- Um servidor canário em outra porta confirma que os pedidos interceptados não chegaram a ele neste teste.
- Fecha contexto, Chromium e servidores no `finally`; nenhum recurso externo ou dado de loja é usado.

## Limite essencial

É uma POC de interceptação dentro do Playwright, não isolamento do sistema operacional. Não prova que o Chromium não pode contornar rotas, acessar arquivos/serviços do host ou usar DNS de forma hostil; não testa rebinding, endereços reais de metadata, IPv6 em socket, tráfego fora do navegador, efeitos de `GET`, nem uma VM/container sem credenciais. Não equivale a sandbox e não autoriza preview/loja real. A Ronda publicada continua fixture-only; qualquer falha mantém `--base-url` desativado.
