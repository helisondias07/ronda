# POC local de contenção de navegação

## Estado

Experimento manual separado do CLI `npm run ronda` e do visor Next. Não habilita `--base-url`, não altera o fixture público e não aceita URL informada por usuário. Executa Chromium local contra dois servidores sintéticos ligados apenas em `127.0.0.1`.

Rodar: `npm run sandbox:poc`.

## Última execução local

Em 14/11/2026 no Windows, a POC passou: `blocked HTTP=6`, `blocked WS=1`, `canary HTTP/WS=0`, `POST received=0`, `synthetic GET side effect=1`. Isso demonstra a regra de interceptação da POC e também que um GET permitido pode mudar estado no servidor sintético.

## O que demonstra

- Só libera `GET` HTTP para a origem IPv4 loopback exata do servidor sintético.
- Bloqueia origens/portas diferentes, esquemas `file:`/`data:`, HTTP(S) fora da origem, credenciais na URL e endereços alternativos de loopback/privados usados nos casos do script.
- Os casos de parser também cobrem IPv6 ULA (`fc00::`), link-local (`fe80::`), IPv4-mapped para loopback/metadata e um hostname sintético que representa resolução pública→privada; o hostname é recusado antes de qualquer resolução. Isso é teste de string/política, não teste de DNS rebinding real.
- Intercepta subrecursos, bloqueia `POST` e WebSocket, faz fetch de cada GET autorizado sem seguir redirects (`maxRedirects: 0`) e responde 502 local quando encontra redirect.
- Executa uma rota GET sintética que incrementa contador no servidor permitido, provando que a allowlist de rede não torna GET sem efeitos.
- Um servidor canário em outra porta confirma que os pedidos interceptados não chegaram a ele neste teste.
- Fecha contexto, Chromium e servidores no `finally`; nenhum recurso externo ou dado de loja é usado.

## Limite essencial

É uma POC de interceptação dentro do Playwright, não isolamento do sistema operacional. Não prova que o Chromium não pode contornar rotas, acessar arquivos/serviços do host ou usar DNS de forma hostil; não testa rebinding, endereços reais de metadata, IPv6 em socket, tráfego fora do navegador nem uma VM/container sem credenciais. O contador acima observa um GET de efeito conhecido; não prova que GET de terceiros seja seguro. Não equivale a sandbox e não autoriza preview/loja real. A Ronda publicada continua fixture-only; qualquer falha mantém `--base-url` desativado.

O JSON/HTML do fixture agora registra um SHA-256 dos nove arquivos de entrada da demo. Serve para detectar que o conjunto local usado na execução mudou; não é assinatura do executável, atestado de execução nem evidência de contenção de rede.

## Ampliação adversarial local — 15/11/2026

`npm run sandbox:poc` passou com `blocked HTTP=13`, `blocked WS=1`, cinco redirects de subrecursos interceptados e canário HTTP/WS zero. Imagem, iframe, script, fetch e script inicial de worker receberam redirects sintéticos para o canário em outra porta; nenhum redirect foi seguido. Um worker dedicado permitido também tentou `importScripts` e `fetch` diretamente ao canário: ambos foram interceptados. O mesmo GET sintético permitido continuou alterando estado (`synthetic GET side effect=1`). Não houve acesso a destino externo.

Esses casos verificam apenas a interceptação observada no Chromium/Playwright local; as verificações de IP privado e DNS continuam testes de strings, não conexões nem DNS rebinding. **Próximo gate:** executar o navegador em ambiente descartável sem credenciais, com saída negada pelo sistema operacional e proxy restrito; demonstrar por captura no host que sockets diretos, redirects, subrecursos, workers e DNS não contornam a barreira, incluindo respostas DNS que mudam para IP privado. Testar timeout/limpeza e efeitos de GET antes de considerar qualquer alvo autorizado. Sem esse gate a CLI continua fixture-only.
