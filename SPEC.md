<!-- para IA. não é README de humano. -->
# SPEC — frontend (vitrine)

status: v0.2
sha: `5f0dd81`
data: 2026-08-28

## Como usar
- Este arquivo é a fonte. Código ≠ spec → **bug de código**. Spec errada → Ricardo muda **este** arquivo, depois o código.
- IDs estáveis (`REGRA-` `DADOS-` `CONTRATO-` `NÃO-` `GAP-`). Não apague ID; marque `revogado`.
- "achei bug" → cita REGRA/CONTRATO. Se não existir, é GAP, não patch.
- "não estamos salvando X" → olha DADOS. Campo ausente = não é bug.
- "cadastrar campo X" → conflita se quebra REGRA/NÃO; senão vira GAP e só então código.
- GAP = pergunta aberta. Não trate GAP como regra.

## Papel
Vitrine estática (jQuery) do treinamento. **Não** é o app logado de aluno/admin. Fala **só** com o firewall (`/firewall`) e arquivos estáticos de mídia. Nunca 8081–8088.

## REGRA
- REGRA-LIVE-1: produto vivo = `index.html` → `html/video.html` + `js/accordion.js`. Backups (`index bkp*`, `bkp/`) **não** são produto.
- REGRA-API-1: único host de API = firewall. Base no código hoje: `http://localhost:8080/firewall` (ver GAP-BASE).
- REGRA-I18-1: locale em `localStorage.language` (`pt_BR` / `en_US`). Textos de UI vêm do i18n (via borda).
- REGRA-MEDIA-1: gif da aula é estático sob `buckets/digitus-forum-media/` (stand-in de S3). Não buscar origem arbitrária.
- REGRA-XSS-1: strings da API/i18 são texto, não HTML. (PRs #1–#3 pendentes alinham o código.)
- REGRA-AUTH-1: vitrine de **curso gratuito** é pública (sem token). Login + compra só para **curso pago** (REGRA-AUTH-PAID no firewall).
- REGRA-IDIOMA-1: troca pt/en = i18n (`localStorage.language`). **Não** troca `courseId` nem usa `familyId`.

## NÃO
- NÃO-LOGIN-BKP: não religar o login do bkp (token em localStorage) sem spec de cookie/sessão. Login de pago é outro CONTRATO, ainda sem UI nesta vitrine.
- NÃO-FAMILY: sem `familyId` / `retrieveByLocale`.
- NÃO-CHATBOT: `html/chatbot.html` (hospitalvetprev, telefone) **não** é Digitus.
- NÃO-ARTICLE: `html/article.html` leftover, não é fluxo da vitrine.
- NÃO-MS-PORT: nunca 8081–8088.
- NÃO-BKP: não commitar backups; não republicar `debugToken`.

## DADOS (só client)
localStorage de produto: `language`, `internationalization.*`, `internationalization.training_id` (courseId), `courseName`, `courseSinopse`, `videoId`/`moduleId`/`lessonSource`, `nav*`/`course*`, `isTraining`/`isCourse`, `backgroundUrl` (data:image). Sem `courseFamilyId`.
**Não** é fonte de verdade. Servidor não lê isso.

Não persiste user/senha/token no produto vivo.

Chaves i18 que a vitrine lê (39): labels `welcome_title` `continue_training` `database_indexes` `internationalization` `scalability` `manutenability` `documentation` `tests` `requirement` `free_training` `free_training_description` `simplicity` `module` `previous_video` `next_video`; ids de vídeo `welcome_video` `continue_training_video` `start_training_video` `frontend_video` `backend_video` `database_indexes_video` `internationalization_video` `scalability_video` `manutenability_video` `documentation_video` `tests_video` `requirement_video`; ids de módulo `general_module` `continue_training_module` `start_training_module` `frontend_module` `backend_module` `database_indexes_module` `internationalization_module` `scalability_module` `manutenability_module` `documentation_module` `tests_module` `requirement_module`. “Frontend”/“Backend” e “Módulos/Idioma” estão hardcoded.

## CONTRATO que a vitrine deve chamar
- i18: `POST /firewall/internationalization/v1/i18` (público). Bundle `/frontend` **não** existe — GAP-FRONT-BUNDLE.
- course: `retrieveAll` / `retrieveById` (público se gratuito). **Não** `retrieveByLocale`.
- module: `retrieveByCourseIdWithVideos` body `{courseId}` (não `retrieveByTrainingIdWithVideos`).
- video: `retrieveById` body `{videoId}` — campo de mídia `gif`. Público se o curso for gratuito.

## GAP
- GAP-VITRINE: **revogado** (2026-08-28). Gratuito público; pago = token + compra.
- GAP-GIF: **revogado**. Campo `gif`.
- GAP-FAMILY: **revogado**. Idioma = i18n.
- GAP-BASE: `localhost:8080` vs same-origin `/firewall`.
- GAP-AUDIO: player ainda não toca áudio da aula.
