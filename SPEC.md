<!-- para IA. não é README de humano. -->
# SPEC — frontend (vitrine)

status: v0
sha: `5f0dd81`
data: 2026-08-28

## Como usar
- Este arquivo é a fonte. Código ≠ spec → **bug de código**. Spec errada → Ricardo muda **este** arquivo, depois o código.
- IDs estáveis (`INV-` `DADOS-` `END-` `NÃO-` `GAP-`). Não apague ID; marque `revogado`.
- "achei bug" → cita INV/END. Se não existir, é GAP, não patch.
- "não estamos salvando X" → olha DADOS. Campo ausente = não é bug.
- "cadastrar campo X" → conflita se quebra INV/NÃO; senão vira GAP e só então código.
- GAP = pergunta aberta. Não trate GAP como regra.

## Papel
Vitrine estática (jQuery) do treinamento. **Não** é o app logado de aluno/admin. Fala **só** com o firewall (`/firewall`) e arquivos estáticos de mídia. Nunca 8081–8088.

## INV
- INV-LIVE-1: produto vivo = `index.html` → `html/video.html` + `js/accordion.js`. Backups (`index bkp*`, `bkp/`) **não** são produto.
- INV-API-1: único host de API = firewall. Base no código hoje: `http://localhost:8080/firewall` (ver GAP-BASE).
- INV-I18-1: locale em `localStorage.language` (`pt_BR` / `en_US`). Textos de UI vêm do i18n (via borda).
- INV-MEDIA-1: gif da aula é estático sob `buckets/digitus-forum-media/` (stand-in de S3). Não buscar origem arbitrária.
- INV-XSS-1: strings da API/i18 são texto, não HTML. (PRs #1–#3 pendentes alinham o código.)
- INV-AUTH-1: esta vitrine **não tem login**. Header `Authorization` vazio é o estado atual — não é um fluxo de sessão. Ver GAP-VITRINE no firewall.

## NÃO
- NÃO-LOGIN: não religar o login do bkp (token em localStorage) sem spec de cookie/sessão.
- NÃO-CHATBOT: `html/chatbot.html` (hospitalvetprev, telefone) **não** é Digitus.
- NÃO-ARTICLE: `html/article.html` leftover, não é fluxo da vitrine.
- NÃO-MS-PORT: nunca 8081–8088.
- NÃO-BKP: não commitar backups; não republicar `debugToken`.

## DADOS (só client)
localStorage de produto: `language`, `internationalization.*`, `internationalization.training_id`, `courseFamilyId`, `courseName`, `courseSinopse`, `videoId`/`moduleId`/`lessonSource`, `nav*`/`course*`, `isTraining`/`isCourse`, `backgroundUrl` (data:image do gerador).
**Não** é fonte de verdade. Servidor não lê isso.

Não persiste user/senha/token no produto vivo.

## END que a vitrine chama (hoje)
- `POST .../internationalization/v1/frontend` body `{locale}` — **não existe na borda**
- `POST .../module/v1/retrieveByTrainingIdWithVideos` body `{trainingId, language}` — **não existe** (o que existe: `retrieveByCourseIdWithVideos`)
- `POST .../course/v1/retrieveByLocale` body `{locale}` — **não existe**
- `POST .../video/v1/retrieveById` body `{videoId, moduleId}` — existe, **exige token**

## GAP
- GAP-VITRINE: ver firewall. Ou a vitrine é pública (então a borda ganha ENDs públicos e paths reais), ou deixa de ser vitrine sem login.
- GAP-BASE: `localhost:8080` vs same-origin `/firewall`.
- GAP-GIF: front usa `video.gif`; course salva `url`/`thumbnail`. Qual campo?
- GAP-FAMILY: front usa `familyId` para o mesmo curso em pt/en. Course **não** tem familyId/locale.
