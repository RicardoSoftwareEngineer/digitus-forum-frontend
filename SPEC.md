<!-- para IA. não é README de humano. -->
# SPEC — frontend (vitrine)

status: v0.9
sha: `pending`
data: 2026-09-03

## Como usar
- Este arquivo é a fonte. Código ≠ spec → **bug de código**. Spec errada → Ricardo muda **este** arquivo, depois o código.
- IDs estáveis (`REGRA-` `DADOS-` `CONTRATO-` `NÃO-` `GAP-`). Não apague ID; marque `revogado`.
- "achei bug" → cita REGRA/CONTRATO. Se não existir, é GAP, não patch.
- "não estamos salvando X" → olha DADOS. Campo ausente = não é bug.
- "cadastrar campo X" → conflita se quebra REGRA/NÃO; senão vira GAP e só então código.
- GAP = pergunta aberta. Não trate GAP como regra.

## Papel
Vitrine estática (jQuery) **de todos os gurus** no mesmo domínio / mesmo front. Lançamento mostra o guru `java`. Fala **só** com o firewall (`/firewall`) e arquivos estáticos de mídia. Nunca 8081–8088. Inclui criação de conta / login por código (sem senha).

## REGRA
- REGRA-LIVE-1: produto vivo = `index.html` → `html/video.html` + `js/accordion.js` + UI de conta (email → código). Backups (`index bkp*`, `bkp/`) **não** são produto.
- REGRA-LANDING-2: `index2.html` é **proposta** de home (confiança/venda). Não substitui `index.html` até Ricardo fechar. Não é bkp.
- TEST-CINEMA-MENU-TINT (2026-09-03): cinema — menus esquerdo e direito chips/botões = vidro branco translúcido (soft 0.14 / stronger 0.24). Sem --accent-show nesses controles. Teste visual; Ricardo julga.
- REGRA-VIDEO-LAYOUT: player padrão = `html/video.html` cinema (gif grande, gavetas de vidro sobre Trianglify, class `layout-cinema`). Controles no palco: tela cheia (Fullscreen API) e modo cinema (esconde os dois menus; o quadro do gif não cresce). **Revogado** (2026-08-28): `html/video3.html` / `html/video4.html` (propostas experimentais). Fundo Trianglify + `.glass`. Não são bkp.
- REGRA-API-1: único host de API = firewall. Base no código hoje: `http://localhost:8080/firewall` (ver GAP-BASE).
- REGRA-I18-1: locale em `localStorage.language` (`pt_BR` / `en_US`). Textos de UI vêm do i18n (via borda).
- REGRA-MEDIA-1: gif da aula é estático sob `buckets/digitus-forum-media/` (stand-in de S3). Não buscar origem arbitrária.
- REGRA-XSS-1: strings da API/i18 são texto, não HTML. (PRs #1–#3 pendentes alinham o código.)
- REGRA-AUTH-1: vitrine de **treinamento gratuito** é pública (sem token). Login + compra só para **treinamento pago** (REGRA-AUTH-PAID no firewall). Conta existe mesmo assim (testar cadastro/login).
- REGRA-IDIOMA-1: troca pt/en = i18n (`localStorage.language`). **Não** troca `trainingId` nem usa `familyId`.
- REGRA-CONTA-1: UI = email → CONTRATO-EV-SEND → tela de código. **Mock:** campos do código já vêm populados com `readableNumber` da API. Usuário confirma. CONTRATO-EV-OK → token.
- REGRA-CONTA-2: sem campos de senha. Cadastro não pede nome/idade (preenchidos depois em Meus dados).
- REGRA-CONTA-MYDATA: Configurações → Meus dados abre formulário no **centro do cinema** (lessonSource `my-data`, painel em `#video`), não na sidebar. Campos: Nome, Idade, Email (readonly). Salva `POST /firewall/user/v1/{userId}/update` body `{name, age?}`; cache `userName`/`userAge` no localStorage (limpa no logout).
- REGRA-CONTA-BACKGROUND: logado: botão **Salvar cor de fundo** / **Sempre trocar cor de fundo** no painel da conta (perto de Configurações). Salvar = wallpaper **visível** (`#wallpaperBack`/`body`, não o próximo em `backgroundUrl`), nome `[NomeCor] [NomeItaliana]`, POST `/firewall/background/v1/save`. Pin → `backgroundAuto=false` + localStorage `backgroundAuto`/`backgroundPinnedUrl`/`backgroundPinnedId`; `advanceBackground` só reaplica o pin. Configurações → **Cores de fundo** abre centro (lessonSource `my-backgrounds`) listando saves; clique → select + aplica + para auto. Sempre trocar → setAuto. EN: Save/Always change background color / Background colors. PT: **cor de fundo** (não "cor do fundo").
- REGRA-CONTA-PURCHASES: Configurações → Minhas compras abre lista no **centro do cinema** (lessonSource `my-purchases`, painel `.my-purchases-panel` em `#video`). Lista DADOS-COMPRA via CONTRATO-ME (`purchasedTrainingIds` + linha se `javaSubscriptionActive`); nomes/sinopse via `trainingsForLocale` (`retrieveAll`). Não inventar endpoint. Clique abre o treinamento; Configurações permanece aberta.
- REGRA-LIST-TRAININGS: `#swapTrainingBtn` (**Trocar treinamento**) e `#swapTrainingBack` (**Voltar**) só alternam o flip do menu direito (`flipModules`); **não** mudam a tela central. **Listar treinamentos** (`#swapListTrainings`) abre a lista no **centro do cinema** (lessonSource `list-trainings`, painel `.list-trainings-panel` em `#video`). Busca filtra por nome/sinopse. Fonte = `trainingsForLocale` / `POST /firewall/training/v1/retrieveAll` (pago + grátis). Badge Gratuito/Pago (preço R$ = centavos/100). Clique → `openTraining(training, true)`. Menu Trocar treinamento permanece aberto nos links; só Voltar fecha o flip.
- REGRA-SWAP-RETURN: **revogado**. Trocar/Voltar não capturam nem restauram a tela central; lista só via `#swapListTrainings`.
- REGRA-CONTA-3: um fluxo só. Email novo cria conta; existente entra.
- REGRA-TOKEN-STORE: token (só o UUID) em `localStorage`. **Não** senha. **Não** cookie. Persiste entre dias e abas até logout explícito ou o cache da borda expirar (~4 dias). Header `Authorization: Bearer <uuid>`. Cookie `HttpOnly` é upgrade futuro (GAP-EMAIL-REAL), não agora.
- REGRA-GURU-FRONT: um domínio, um front, vários gurus. Lançamento: guru `java`. Aluno global (mesmo user em qualquer guru).
- REGRA-MVP1-MENU-L: menu esquerdo = páginas do guru (`titleKey` i18n + `src` HTML estático noutro host, iframe). Ver SPEC-MVP1.md.
- REGRA-MVP1-MENU-R: menu direito = módulos/aulas do Training.
- REGRA-MVP1-AUDIO: baixar `videos/{videoId}.m4a` **inteiro** e sincronizar com o gif. Seek imediato.
- REGRA-MVP1-OPEN: último vídeo daquele guru (client) ou primeira página da esquerda.
- REGRA-MVP1-PAY: Stripe **Embedded** Checkout na nossa página. Mensalidade = cartão (guru java). Avulso = **card-only** até Dashboard PIX (não inventar PIX). Aviso `billing_trust_line` (não salvamos o cartão; vai pra Stripe). `pk_test_` vem da borda (CONTRATO-STRIPE-PK); nunca no repo.

## NÃO
- NÃO-LOGIN-BKP: não religar o **form** do bkp (pedia senha e gravava senha+token). UI nova = REGRA-CONTA-*. Token UUID em `localStorage` é produto; senha no storage **não**.
- NÃO-FAMILY: sem `familyId` / `retrieveByLocale`.
- NÃO-CHATBOT: `html/chatbot.html` (hospitalvetprev, telefone) **não** é Digitus.
- NÃO-ARTICLE: `html/article.html` leftover, não é fluxo da vitrine.
- NÃO-MS-PORT: nunca 8081–8088.
- NÃO-BKP: não commitar backups; não republicar `debugToken`.
- NÃO-PASSWORD: sem input de senha.
- NÃO-GURU-HOST: sem site/front por guru.
- NÃO-HTML-DB: HTML do guru não vai no banco; arquivo estático noutro origin.
- NÃO-PIX-SUB: PIX não paga mensalidade.

## DADOS (só client)
localStorage de produto: `language`, `internationalization.*`, `internationalization.training_id` (trainingId), `trainingName`, `trainingSinopse`, `videoId`/`moduleId`/`lessonSource`, `nav*`/`training*`, `isTraining`, `backgroundUrl` (data:image), `backgroundAuto` (`true`/`false`), `backgroundPinnedUrl`, `backgroundPinnedId`. Sem `trainingFamilyId`/`familyId`. **Revogado:** `courseName`/`courseSinopse`/`isCourse`/`course*`.
localStorage também: token (UUID cru ou `Bearer <uuid>` — prefixar no header). **Não** senha. **Não** o código depois de validar.
**Não** é fonte de verdade. Servidor não lê isso.

Chaves i18 que a vitrine lê (39): labels `welcome_title` `continue_training` `database_indexes` `internationalization` `scalability` `manutenability` `documentation` `tests` `requirement` `free_training` `free_training_description` `simplicity` `module` `previous_video` `next_video`; ids de vídeo `welcome_video` `continue_training_video` `start_training_video` `frontend_video` `backend_video` `database_indexes_video` `internationalization_video` `scalability_video` `manutenability_video` `documentation_video` `tests_video` `requirement_video`; ids de módulo `general_module` `continue_training_module` `start_training_module` `frontend_module` `backend_module` `database_indexes_module` `internationalization_module` `scalability_module` `manutenability_module` `documentation_module` `tests_module` `requirement_module`. “Frontend”/“Backend” e “Módulos/Idioma” estão hardcoded.

## CONTRATO que a vitrine deve chamar
- i18: `POST /firewall/internationalization/v1/i18` (público, uma chave).
- CONTRATO-FRONT-BUNDLE `POST /firewall/internationalization/v1/frontend` `{locale}` — dump de todas as i18 do locale (público). JSON array `{keyy, message}`.
- **Revogado** (2026-08-28): prefixo `/course/v1` e `retrieveByCourseIdWithVideos` body `{courseId}`.
- training: `retrieveAll` / `retrieveById` (público se gratuito). **Não** `retrieveByLocale`. JSON `trainingId`.
- module: `retrieveByTrainingIdWithVideos` body `{trainingId}`.
- video: `retrieveById` body `{videoId}` — campo de mídia `gif`. Público se o treinamento for gratuito.
- CONTRATO-CONTA-SEND `POST /firewall/emailVerification/v1/sendValidationEmail` `{email}` — mock: usa `readableNumber` da response para popular a tela. código alinhado (video.html).
- CONTRATO-CONTA-OK `POST /firewall/emailVerification/v1/validateEmail` `{email, readableNumber}` — guarda token em `localStorage`, prefixa `Bearer` no header. código alinhado.

- CONTRATO-STRIPE-SUB / CONTRATO-STRIPE-BUY / CONTRATO-ME / CONTRATO-GURU-PAGES — ver SPEC-MVP1.md.
- Vitrine: se `training.paid===true`, exige token, chama CONTRATO-ME; sem compra/assinatura java não carrega módulos/player — vidro + Comprar (R$ price/100) + Assinar (R$ 59) + `billing_trust_line`. Comprar/Assinar (logado): publishable-key → checkout → Stripe.js `initEmbeddedCheckout` num overlay de vidro no centro (não estica o cinema) → confirm → `/me` e destrava se owned. 409 = já tem. 503 = Stripe test ainda não está ligado. Gratuito = player público.
- CONTRATO-GURU-PAGE-SRC: iframe `src` = host de mídia (`buckets/.../gurus/{guruId}/{pageId}.html`), **não** o origin da vitrine.
Chaves i18 sugeridas (comentário; **não** gravadas no i18 MS neste PR). Se a key faltar, o front usa o filename: `guru_page_sobre` `guru_page_como_funciona` `guru_java` `guru_java_sinopse`.

Não chama: `createToken` com senha, reset password, 8081–8088, login do bkp, Stripe.js com secret.

## GAP
- GAP-VITRINE: **revogado** (2026-08-28). Gratuito público; pago = token + compra.
- GAP-GIF: **revogado**. Campo `gif`.
- GAP-FAMILY: **revogado**. Idioma = i18n.
- GAP-BASE: `localhost:8080` vs same-origin `/firewall`.
- GAP-AUDIO: **revogado** como path. Path = `videos/{videoId}.m4a`. Player ainda não implementa (código ≠ spec).
- GAP-FRONT-BUNDLE: **revogado** (2026-08-28). CONTRATO-FRONT-BUNDLE.
- GAP-EMAIL-REAL: SES; não pré-preencher código; recaptcha. Cookie `HttpOnly` no lugar de `localStorage` fica pra essa fatia, se a gente quiser.
- GAP-GURU-NAV: como o front escolhe o guru na UI (path, query, seletor). Não é site separado. Lançamento = só `java`, então não bloqueia.
