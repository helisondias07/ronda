# Sandbox de navegador — proposta ainda não habilitada

Esta proposta não ativa URL arbitrária. A CLI continua limitada ao fixture local; o visor hospedado continua sem endpoint de navegação. Os testes atuais verificam regras unitárias e execução do fixture, não provam isolamento contra um hostil navegador ou rede.

## Ameaças que precisam ser contidas

- SSRF por URL inicial, redirect, subrecurso, iframe, worker, service worker, websocket, DNS rebinding, IPv4/IPv6 mapeado e link-local.
- Efeitos colaterais em GET, formulários, scripts e controles com rótulo ambíguo; bloquear POST sozinho não torna a visita somente leitura.
- Acesso a credenciais locais, arquivos, metadata/cloud, localhost, rede privada, DevTools e serviços do host.
- Persistência de estado entre ambientes, evidência com dados pessoais e custos/loops de navegação.

## Barreiras mínimas antes de considerar um preview autorizado

1. Processo descartável em container/VM sem credenciais, montagem de arquivos do host, sockets ou acesso ao perfil do usuário; limites de CPU, memória, tempo, páginas e tamanho de resposta.
2. Egress negado pelo sistema operacional por padrão. Proxy de saída próprio aceita somente host/porta autorizados, resolve DNS uma vez por conexão e valida/pina cada IP permitido; rejeita loopback, privado, link-local, multicast, reservado, IPv4-mapped IPv6 e mudanças de resposta DNS.
3. Redirects desativados ou revalidados hop a hop. Cada navegação e subrecurso passa pelo proxy; negar outros esquemas, WebSocket, service worker e conexões diretas. O teste precisa provar que o processo não consegue contornar o proxy.
4. URL e método não são autorização suficiente. Jornada usa passos revisados por ambiente, sem clique genérico. Bloquear formulários, downloads, compras, autenticação, mutações e qualquer CTA não explicitamente inofensivo. GET pode alterar estado; não alegar read-only sem contrato do ambiente.
5. Ambiente staging efêmero com dados sintéticos e autorização escrita. Sem conta/cookie real; nunca produção de cliente.
6. Saída e evidências isoladas, com retenção curta e revisão de segredo/PII; relatório rotula claramente falha, cobertura e hipóteses.

## Portão adversarial obrigatório

Antes de ativar qualquer ambiente além do fixture, testes em processo isolado devem provar bloqueio de: redirects públicos→privados e públicos→404; DNS público→privado e rebinding entre consultas; loopback/link-local/private IPv4/IPv6, IPv4-mapped IPv6, metadata, esquema `file:`, recurso externo em imagem/iframe/script/worker/WebSocket, GET com efeito conhecido e controles ambíguos. Verificar também timeout/limites, limpeza em falhas e ausência de tráfego fora do proxy por captura no host. Falha em qualquer caso mantém URL arbitrária desativada.

## Worker local experimental — 15/11/2026

`npx tsx tools/fixture-worker.ts` executa somente a jornada fixa em processo filho, numa cópia temporária de `src` e `fixture`, sem copiar `.env`, com ambiente reduzido e dependências ligadas à instalação local. Cada execução cria diretório próprio em `%TEMP%`/`os.tmpdir()`; valida cinco etapas aprovadas, parada antes de pagamento e relatório do fixture. Não aceita argumentos ou URL; limita saída capturada a 64 KiB e o processo principal a 45 s. `npm test` cobre filtro de ambiente, prazo inválido e timeout; o comando acima executou a jornada real do fixture local. Artefatos temporários permanecem para inspeção.

**Isto não é isolamento:** o processo e o Chromium ainda têm os privilégios e acesso a arquivos/rede do usuário, as dependências são compartilhadas, a cópia não atesta integridade e o timeout não garante encerramento de descendentes ou limpeza de recursos. Não há fila, autenticação, proxy ou barreira do SO. Não usar segredos, clientes ou sites reais. Próximo gate: ambiente descartável sem segredos com egress negado pelo SO, encerramento de toda a árvore de processos e testes com canário/captura de rede, incluindo DNS e redirects. Até passar, `--base-url` continua desativado.

Não executado: sandbox OS/VM, interceptação de rede Chromium, teste DNS adversarial, ambiente Wake staging ou validação de efeitos de GET. Não há alegação de proteção comprovada para sites reais.
