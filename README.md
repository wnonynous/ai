# Berry AI Agent · 1.0

Agente WhatsApp em Node.js/TypeScript com BerryProtocol, APInex, painel administrativo e SQLite. A base original de schemas, prompt, normalização, executor e fila foi preservada e ampliada. O frontend usa HTML/CSS/JavaScript sem build separado para simplificar a instalação.

## Requisitos

- Node.js **22 ou 24 LTS** e npm. Compatibilidade declarada pelo BerryProtocol: Node 20 ou >=22 <27; este projeto exige >=22 <27.
- Internet e WhatsApp no telefone para autenticar.
- Chave APInex fornecida por você. Nenhuma chave acompanha o projeto.
- `better-sqlite3` usa binário nativo. Se não existir prebuild para seu sistema, instale ferramentas de compilação (Python + C/C++; no Windows, Visual Studio Build Tools).

## Instalação

Extraia o ZIP e abra o terminal dentro de `berry-ai-agent`:

```sh
npm install
```

Copie `.env.example` para `.env`:

```sh
# Linux/macOS
cp .env.example .env
# Windows PowerShell
Copy-Item .env.example .env
```

Edite `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mínimo 12 caracteres) e `APINEX_API_KEY`. A senha exemplo é apenas um placeholder; troque antes de iniciar. O painel funciona sem APInex configurada, mas o agente não conseguirá gerar respostas.

```env
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=sua-senha-forte-com-pelo-menos-12-caracteres
APINEX_API_KEY=sua-chave
APINEX_MODEL=free/gpt-6-luna
```

Nunca envie seu `.env`, pasta `data` ou backups para repositórios públicos. A chave permanece somente no backend; o navegador recebe apenas “Configurada”/“Não configurada”.

## Executar

```sh
npm run dev
npm run typecheck
npm run build
npm start
npm test
```

`dev` inicia o TypeScript em watch; `build` gera `dist`; `start` executa o build. Acesse **http://localhost:3000** (ou a porta `PORT`). Entre com as credenciais do `.env`.

## WhatsApp: QR, pairing e sessão

Na página **WhatsApp**, clique em **Conectar QR**. A operação retorna imediatamente; o painel consulta o estado a cada três segundos. Abra WhatsApp → Dispositivos conectados → Conectar dispositivo e escaneie o QR.

Para pairing, informe apenas dígitos, com país e DDD (ex.: `5511999999999`), clique em **Gerar pairing code** e use “Conectar com número de telefone” no aplicativo WhatsApp. O código vem do evento real `auth.pairing_code` do BerryProtocol; o QR vem de `auth.qr`. Os artefatos aparecem somente no painel autenticado e são limpos quando a conexão abre/fecha.

- **Desconectar** encerra a conexão sem apagar credenciais.
- **Reconectar** reutiliza a sessão salva.
- **Logout WhatsApp** encerra e remove a pasta de credenciais daquela sessão. Exige nova autenticação.
- **Sair** encerra apenas sua sessão administrativa.
- Sessão WhatsApp: `BERRY_AUTH_FOLDER/BERRY_SESSION_ID`; metadados: `BERRY_DATABASE_PATH`.
- `WHATSAPP_AUTO_CONNECT=true` tenta restaurar a sessão no início. O padrão é conexão manual.
- O número é extraído do perfil das credenciais depois da conexão, quando disponível; não são expostos tokens/chaves.

Não substituímos BerryProtocol. O pacote é fixado pelo lockfile. Algumas dependências internas do próprio Berry usam seu transporte WhatsApp; a aplicação utiliza exclusivamente a API pública BerryProtocol.

## Agente e memória

Em **Agente**, configure nome, contexto da empresa, modelo, max tokens, temperatura opcional, limite de histórico e ativação. As alterações são persistidas imediatamente em SQLite. Os valores do `.env` inicializam as configurações somente na primeira criação do banco; depois use o painel.

Informe fatos reais: produtos, preços, horários, políticas, links, códigos e coordenadas. O agente decide entre texto, botões reply/quick reply/copy/CTA, listas, carrossel com imagem ou vídeo, imagens, documentos, reações e localização. O modelo retorna somente um plano de ações validado por Zod, nunca nomes de funções arbitrárias. Ele não executa pagamentos, pedidos ou reservas externas: não há integração transacional com esses serviços.

O prompt ensina `*negrito*`, `_itálico_`, `~riscado~` e código, e orienta a não inventar informações nem expor instruções internas. Ele não usa botões em toda resposta. JSON inválido recebe uma tentativa de reparo; se continuar inválido, o backend envia uma mensagem genérica segura.

Mensagens e escolhas são persistidas por JID, com role, tipo, data e ID selecionado. Botões/listas/native flow entram no contexto como escolhas explícitas. A fila processa cada conversa em sequência e permite contatos diferentes em paralelo. IDs de mensagens recebidas são deduplicados. Apenas ações enviadas com sucesso entram na memória como respostas. O histórico do banco permanece completo; apenas as últimas `MAX_HISTORY_MESSAGES` entram no contexto da IA. A página Conversas exibe até 100 mensagens por página e permite carregar anteriores.

Mensagens de áudio, imagem e documento recebidas são descritas por tipo/legenda; **não há transcrição de áudio, OCR ou análise visual de anexos** nesta versão. O agente não deve inventar seu conteúdo.

## URLs e mídias

Defina hosts **exatos**, sem protocolo/caminho, separados por vírgula:

```env
ALLOWED_CTA_HOSTS=meusite.com.br,checkout.meusite.com.br
ALLOWED_MEDIA_HOSTS=cdn.meusite.com.br
```

CTA aceita HTTP/HTTPS somente para hosts explicitamente autorizados, sem credenciais na URL. Subdomínios exigem entrada própria. CTA proibido é removido; se nenhum botão restar, o texto é enviado.

Mídia exige HTTPS na porta 443 e host autorizado. Se `ALLOWED_MEDIA_HOSTS` estiver vazio, reutiliza hosts CTA. Sem hosts autorizados, não envia mídia. O download resolve DNS, bloqueia IPs privados/locais, fixa o IP validado na conexão, não segue redirects e limita tamanho a 25 MiB e timeout a 15 segundos. Carrosséis exigem uma imagem **ou** vídeo por card. URLs só podem vir de fatos reais conhecidos pelo agente. Documentos/imagens inexistentes ou incompatíveis resultam em falha tratada, não encerram o processo.

## APInex

Backend: `POST ${APINEX_BASE_URL}/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`, JSON. Corpo: `model`, `max_tokens`, `system`, `messages`; `temperature` somente se configurada. Deixe temperatura vazia se seu modelo não suportar.

Cliente isolado em `src/ai/apinex.ts`, timeout de 30 segundos por tentativa e até três tentativas para falhas transitórias/429/5xx. Erros nunca incluem corpo remoto, chave ou dados de autenticação nos logs. Em Configurações, **Testar APInex** faz uma requisição pequena real (pode consumir cota). O dashboard distingue chave ausente, ainda não testada, disponível e indisponível; não finge sucesso sem chamada válida.

## Autenticação e produção

Senha com scrypt, sal aleatório e comparação em tempo constante. Tokens de sessão aleatórios, armazenados por SHA-256 no banco; expiração em oito horas; cookie HttpOnly/SameSite=Strict e Secure em produção. CSRF em operações autenticadas, rejeição de origem externa, validação Zod, Helmet, limite de corpo e rate limits para login/APIs.

A senha do `.env` sincroniza o hash do administrador ao iniciar; mudar senha invalida suas sessões. A aplicação exige credenciais administrativas no início. Não registra senha, cookies, chave APInex, QR ou pairing em logs.

Para produção: `NODE_ENV=production`, execute `npm run build && npm start` atrás de proxy HTTPS. `TRUST_PROXY=1` somente com um proxy reverso confiável que controle headers encaminhados; cookies Secure não funcionam em HTTP. Não exponha a porta diretamente à internet. A aplicação serve o frontend e API na mesma origem.

Faça backup protegido de `data` com a aplicação parada. Banco app contém administradores, sessões, configurações, conversas e mensagens. Banco/pasta Berry contêm dados sensíveis de autenticação WhatsApp. Use uma única instância do processo: a fila é em memória, não distribuída. Reiniciar durante geração descarta trabalho pendente; mensagens já recebidas permanecem no banco. Uma migração inicial e índices estão em `src/db/database.ts`; o Store centraliza a persistência para futura adaptação ao PostgreSQL.

## Estrutura

```
src/
  agent/       schema, prompt, normalizer, FIFO, executor, serviço
  ai/          cliente APInex e planejador
  auth/        hash, sessões, middleware CSRF/autenticação
  db/          Store SQLite, migração e configurações
  server/      rotas e middleware Express
  whatsapp/    cliente Berry, QR/pairing e download seguro de mídia
  config.ts
  index.ts
public/        painel responsivo dark/light
tests/         testes automatizados; mocks apenas nos testes
```

## Verificação e limites do ambiente de entrega

Consulte `VERIFICATION.md` para os comandos executados, resultados e testes não concluídos. Testes automatizados usam doubles para evitar mensagens reais; a aplicação entregue usa BerryProtocol e APInex reais, sem modo mock. Autenticação completa de WhatsApp e envio real dependem do telefone do operador. Chamadas APInex reais dependem de sua chave. Não há credenciais reais incluídas no ZIP.

## Railway sem GitHub

O projeto inclui Dockerfile Node 24, railway.toml e exclusões de upload. O build Docker instala dependências, verifica TypeScript e compila o backend. O container completo não foi construído localmente porque Docker não está disponível neste ambiente.

Após `railway login`, crie/vincule o serviço, adicione um volume em `/data`, configure `APP_DATABASE_PATH=/data/app.db`, `BERRY_DATABASE_PATH=/data/berry.db`, `BERRY_AUTH_FOLDER=/data/auth`, credenciais administrativas, chave APInex, `NODE_ENV=production` e `TRUST_PROXY=1`. Use `railway up` para enviar a pasta sem GitHub. Gere um domínio HTTPS pelo Railway. Configure apenas uma réplica.

## Groq (alternativa à APInex)

Configure `AI_PROVIDER=groq`, `GROQ_API_KEY` e `GROQ_MODEL=openai/gpt-oss-20b` no Railway ou .env. Sem `AI_PROVIDER=groq`, APInex permanece ativa por compatibilidade. O modelo salvo no painel prevalece; modelos antigos com prefixo `free/` são migrados para GROQ_MODEL na inicialização quando Groq está ativa. Na página Agente, confirme o modelo e use max tokens 2048 ou mais se houver truncamento.

A API Groq usa Bearer no backend e chat/completions. Modelos GPT OSS suportados utilizam JSON Schema estrito; opcionais viram null no schema de transporte e são removidos antes da validação Zod. Outros modelos usam JSON object mode e a mesma validação/reparo local. Nenhuma resposta é enviada diretamente ao WhatsApp sem validar. A chave não vai ao navegador. O teste de provedor pode retornar o código HTTP seguro (401: chave, 400: configuração, 429: cota, 5xx: serviço); nenhum corpo remoto é exibido. O plano gratuito tem limites, não é ilimitado. Testes Groq feitos com mock; conexão real exige sua chave.
