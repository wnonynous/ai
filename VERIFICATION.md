# Verificação da entrega

Data: 12/10/2026. Ambiente: Linux, Node.js 24.19.0.

## Executado e aprovado

- `npm install`: dependências instaladas; BerryProtocol 0.1.10 inspecionado no pacote instalado, incluindo core/events/socket/wa-message.
- `npm run typecheck`: sem erros.
- `npm run build`: sem erros, gera `dist/index.js`.
- `npm test`: 9 grupos, 9 aprovados, 0 falhas.
- `node --check public/app.js`: sintaxe válida.
- `npm start`/entrypoint compilado: processo iniciado com servidor real e BerryProtocol real, em banco temporário.
- Smoke HTTP no processo compilado: login, cookie, sessão, dashboard e todas as páginas administrativas retornaram resultados esperados; rota protegida sem cookie redirecionou ao login.

## Cobertura dos testes

1. Rotas protegidas, senha inválida, login válido, HttpOnly/SameSite, CSRF, settings, logout e expiração.
2. Histórico por contato, limite de contexto, IDs selecionados, deduplicação e configuração persistida.
3. JSON válido e em fence; rejeição de tipos, URLs, campos obrigatórios e carrossel sem mídia.
4. Executor Berry para reply/copy/CTA/list; bloqueio de CTA não autorizado e fallback em texto.
5. Normalização selectedButtonId/buttonId/selectedRowId/native flow.
6. FIFO por JID, paralelismo entre contatos e recuperação após erro.
7. Contrato APInex, headers/corpo, resposta válida, tentativa de reparo e fallback, 429, JSON HTTP inválido e timeout. Mock de transporte exclusivo dos testes.
8. Cookie Secure em produção e rate limit de login.
9. Serviço completo mensagem → memória → IA → executor → memória, deduplicação e falha isolada de envio.

## Não validado de ponta a ponta

- **WhatsApp real:** foi tentado `connectWithQr` usando BerryProtocol real. A conexão falhou neste ambiente antes de disponibilizar o QR. Nenhuma conta foi autenticada. QR, pairing, reconnect, logout e envio para um telefone real precisam ser validados pelo operador na sua rede com seu aparelho. Não há implementação simulada no aplicativo.
- **APInex real:** nenhuma chave foi fornecida no ambiente. Foram usados mocks nos testes; chamada real não foi efetuada. Configure sua chave e use o botão Testar APInex.
- **Verificação visual do painel:** tentativa com Playwright bloqueada por ausência de Chromium. O download do browser retornou arquivo inválido no ambiente. Não afirmamos validação visual automatizada ou teste de responsividade em navegador; as páginas foram testadas via HTTP, e o JS passou no parser.
- **Mídias reais/carrossel:** schemas e proteção de destinos implementados; envio/download reais não foram testados com uma conta WhatsApp autenticada.

Os testes não provam aceitação de cada formato por todas as versões do WhatsApp, nem disponibilidade do endpoint APInex/modelo na conta do usuário.

Atualização Groq: adicionado teste de Bearer, endpoint, schema estrito, max tokens, campos null, HTTP 401 e resposta truncada. Nenhuma chave Groq disponível no ambiente; chamada real não realizada.
