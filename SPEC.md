<!-- para IA. não é README de humano. -->
# SPEC — frontend (vitrine)

status: v0.3
sha: `f0e611d`
data: 2026-08-28

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
- REGRA-API-1: único host de API = firewall. Base no código hoje: `http://localhost:8080/firewall` (ver GAP-BASE).
- REGRA-I18-1: locale em `localStorage.language` (`pt_BR` / `en_US`). Textos de UI vêm do i18n (via borda).
- REGRA-MEDIA-1: gif da aula é estático sob `buckets/digitus-forum-media/` (stand-in de S3). Não buscar origem arbitrária.
- REGRA-XSS-1: strings da API/i18 são texto, não HTML. (PRs #1–#3 pendentes alinham o código.)
- REGRA-AUTH-1: vitrine de **curso gratuito** é pública (sem token). Login + compra só para **curso pago** (REGRA-AUTH-PAID no firewall). Conta existe mesmo assim (testar cadastro/login).
- REGRA-IDIOMA-1: troca pt/en = i18n (`localStorage.language`). **Não** troca `courseId` nem usa `familyId`.
- REGRA-CONTA-1: UI = email → CONTRATO-EV-SEND → tela de código. **Mock:** campos do código já vêm populados com `readableNumber` da API. Usuário confirma. CONTRATO-EV-OK → token.
- REGRA-CONTA-2: sem campos de senha. Cadastro não pede nome (nome depois no perfil/user update).
- REGRA-CONTA-3: um fluxo só. Email novo cria conta; existente entra.
- REGRA-TOKEN-STORE: token (só o UUID) em `localStorage`. **Não** senha. **Não** cookie. Persiste entre dias e abas até logout explícito ou o cache da borda expirar (~4 dias). Header `Authorization: Bearer <uuid>`. Cookie `HttpOnly` é upgrade futuro (GAP-EMAIL-REAL), não agora.
- REGRA-GURU-FRONT: um domínio, um front, vários gurus. Lançamento: guru `java`. Aluno global (mesmo user em qualquer guru).

## NÃO
- NÃO-LOGIN-BKP: não religar o **form** do bkp (pedia senha e gravava senha+token). UI nova = REGRA-CONTA-*. Token UUID em `localStorage` é produto; senha no storage **não**.
- NÃO-FAMILY: sem `familyId` / `retrieveByLocale`.
- NÃO-CHATBOT: `html/chatbot.html` (hospitalvetprev, telefone) **não** é Digitus.
- NÃO-ARTICLE: `html/article.html` leftover, não é fluxo da vitrine.
- NÃO-MS-PORT: nunca 8081–8088.
- NÃO-BKP: não commitar backups; não republicar `debugToken`.
- NÃO-PASSWORD: sem input de senha.
- NÃO-GURU-HOST: sem site/front por guru.

## DADOS (só client)
localStorage de produto: `language`, `internationalization.*`, `internationalization.training_id` (courseId), `courseName`, `courseSinopse`, `videoId`/`moduleId`/`lessonSource`, `nav*`/`course*`, `isTraining`/`isCourse`, `backgroundUrl` (data:image). Sem `courseFamilyId`.
localStorage também: token (UUID cru ou `Bearer <uuid>` — prefixar no header). **Não** senha. **Não** o código depois de validar.
**Não** é fonte de verdade. Servidor não lê isso.

Chaves i18 que a vitrine lê (39): labels `welcome_title` `continue_training` `database_indexes` `internationalization` `scalability` `manutenability` `documentation` `tests` `requirement` `free_training` `free_training_description` `simplicity` `module` `previous_video` `next_video`; ids de vídeo `welcome_video` `continue_training_video` `start_training_video` `frontend_video` `backend_video` `database_indexes_video` `internationalization_video` `scalability_video` `manutenability_video` `documentation_video` `tests_video` `requirement_video`; ids de módulo `general_module` `continue_training_module` `start_training_module` `frontend_module` `backend_module` `database_indexes_module` `internationalization_module` `scalability_module` `manutenability_module` `documentation_module` `tests_module` `requirement_module`. “Frontend”/“Backend” e “Módulos/Idioma” estão hardcoded.

## CONTRATO que a vitrine deve chamar
- i18: `POST /firewall/internationalization/v1/i18` (público). Bundle `/frontend` **não** existe — GAP-FRONT-BUNDLE.
- course: `retrieveAll` / `retrieveById` (público se gratuito). **Não** `retrieveByLocale`.
- module: `retrieveByCourseIdWithVideos` body `{courseId}` (não `retrieveByTrainingIdWithVideos`).
- video: `retrieveById` body `{videoId}` — campo de mídia `gif`. Público se o curso for gratuito.
- CONTRATO-CONTA-SEND `POST /firewall/emailVerification/v1/sendValidationEmail` `{email}` — mock: usa `readableNumber` da response para popular a tela.
- CONTRATO-CONTA-OK `POST /firewall/emailVerification/v1/validateEmail` `{email, readableNumber}` — guarda token em `localStorage`, prefixa `Bearer` no header.

Não chama: `createToken` com senha, reset password, 8081–8088, login do bkp.

## GAP
- GAP-VITRINE: **revogado** (2026-08-28). Gratuito público; pago = token + compra.
- GAP-GIF: **revogado**. Campo `gif`.
- GAP-FAMILY: **revogado**. Idioma = i18n.
- GAP-BASE: `localhost:8080` vs same-origin `/firewall`.
- GAP-AUDIO: player ainda não toca áudio da aula.
- GAP-FRONT-BUNDLE: dump de i18 por locale. Borda só tem `/i18` por chave.
- GAP-EMAIL-REAL: SES; não pré-preencher código; recaptcha. Cookie `HttpOnly` no lugar de `localStorage` fica pra essa fatia, se a gente quiser.
- GAP-GURU-NAV: como o front escolhe o guru na UI (path, query, seletor). Não é site separado. Lançamento = só `java`, então não bloqueia.
