<!-- para IA. não é README de humano. -->
# SPEC — MVP1

status: v0.1
data: 2026-08-28
fonte: este arquivo é o recorte do produto até o MVP1. SPEC.md de cada repo continua a fonte do MS. Conflito: Ricardo muda aqui, depois o SPEC do MS.

## Como usar
- Loop até o MVP1: código ≠ este arquivo → bug. GAP aqui = não implementar.
- IDs estáveis. Não apague; marque `revogado`.

## No MVP1
1. Conta: email + código, sem senha. Mock SES (código volta na API, front pré-preenche). Token em `localStorage`.
2. Pagamento **Stripe Checkout** (página hospedada, sem form de cartão nosso).
   - Mensalidade: **só cartão** (crédito ou débito que o Checkout aceitar). **PIX não paga mensalidade.**
   - MVP1: mensalidade libera **só o guru `java`** (todos os trainings pagos daquele guru).
   - Depois (fora do MVP1): mensalidade todos os gurus + mensalidade por guru.
   - Avulso: **PIX e cartão**, por `trainingId`.
   - Lista de trainings comprados (avulso) + se a mensalidade java está ativa.
3. Gurus prontos (tabela + `guruId` no Training + páginas do menu). MVP1 **mostra** só `java`.
4. Player: gif + áudio sincronizados. Áudio é arquivo inteiro no front (seek em qualquer segundo).
5. Menu esquerdo: páginas do guru (HTML **estático**, outro host). Menu direito: módulos/aulas do Training (como hoje).

## Fora do MVP1
- NÃO-PIX-SUB: Pix Automático / PIX recorrente.
- NÃO-SUB-GLOBAL / NÃO-SUB-POR-GURU: mensalidade todos os gurus ou por guru (depois).
- NÃO-BACKOFFICE: admin UI. Páginas HTML e gurus entram por arquivo local + SQL local.
- NÃO-EMAIL-REAL: SES de verdade (continua mock).
- NÃO-COOKIE: cookie HttpOnly.

## REGRA
- REGRA-MVP1-PAY: provedor = Stripe Checkout. Avulso `mode=payment` (`card` + `pix`). Mensalidade `mode=subscription` (`card` só).
- REGRA-MVP1-SUB-JAVA: assinatura ativa → acesso a trainings **pagos** do guru `java`. Gratuitos continuam públicos.
- REGRA-MVP1-AVULSO: compra avulsa → acesso àquele `trainingId` (pago). Independente da mensalidade.
- REGRA-MVP1-LISTA: aluno logado vê lista dos trainings que comprou avulso + flag da assinatura java.
- REGRA-MVP1-GURU-SHOW: UI mostra um guru (`java`). Sistema aceita N gurus.
- REGRA-MVP1-MENU-L: esquerda = `DADOS-GURU-PAGE` do guru selecionado (`titleKey` i18n + `src` arquivo estático). Clique → centro carrega o HTML **de outro origin** (iframe). Não `innerHTML` na vitrine (token no `localStorage`).
- REGRA-MVP1-MENU-R: direita = módulos/aulas do Training selecionado.
- REGRA-MVP1-OPEN: ao abrir o guru: último vídeo assistido daquele guru (client) **ou**, se não houver, a primeira página da esquerda.
- REGRA-MVP1-AUDIO: aula = `gif` + áudio. Path áudio: `buckets/digitus-forum-media/videos/{videoId}.m4a`. Front baixa o arquivo **inteiro** antes de tocar. Gzip na hora **não**. Compactar = encode em disco (m4a/opus), não no request.
- REGRA-MVP1-WEBHOOK: liberar acesso **só** depois do webhook Stripe verificado (não confiar no redirect de sucesso).
- REGRA-MVP1-UX: um botão (Assinar ou Comprar). Stripe Checkout com **email preenchido** da conta. Sem form nosso, sem senha, sem conta Stripe. Cartão / Apple Pay / Google Pay / Link; PIX só no avulso (QR). Volta pra aula.

## DADOS (MVP1)
| id | onde | campos |
|---|---|---|
| DADOS-ASSINATURA | user MS | id, userId, scope=`guru`, guruId (`java` no MVP1), stripeCustomerId, stripeSubscriptionId, status (active/canceled/past_due), deleted |
| DADOS-COMPRA | user MS | id, userId, trainingId, stripeCheckoutSessionId, stripePaymentIntentId, status paid, createdIn |
| DADOS-GURU-PAGE | course MS | guruPageId, guruId, titleKey (i18n `keyy`), src (path estático), position, deleted |
| DADOS-VID.audio | convenção | `buckets/digitus-forum-media/videos/{videoId}.m4a` (não coluna obrigatória se o path for fixo) |

HTML da página do guru **não** está no banco. Arquivo: `buckets/digitus-forum-media/gurus/{guruId}/{pageId}.html` (outro host no prod).

## CONTRATO (borda, firewall)
- CONTRATO-STRIPE-SUB `POST /firewall/billing/v1/checkout/subscription` (token) → Stripe Checkout Session mensalidade java, `card`. Response: `url` pra redirecionar.
- CONTRATO-STRIPE-BUY `POST /firewall/billing/v1/checkout/training` (token) body `{trainingId}` → Session avulsa, `card`+`pix`. Response: `url`.
- CONTRATO-STRIPE-HOOK `POST /firewall/billing/v1/stripe/webhook` (público, assinado `Stripe-Signature`). `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted` → user MS grava DADOS-ASSINATURA / DADOS-COMPRA.
- CONTRATO-ME `GET /firewall/billing/v1/me` (token) → assinatura java + lista `trainingId` comprados.
- CONTRATO-GURU-PAGES `GET/POST /firewall/guru/v1/{guruId}/pages` (público no MVP1, só leitura) → páginas do menu esquerdo.

Quem grava página/guru: operador, SQL **local**. Sem CONTRATO de escrita pública.

## GAP (não bloqueia gravar o resto)
- GAP-WATCH-SERVER: último vídeo por guru no servidor vs só `localStorage`. MVP1 pode ser client.
- GAP-AUDIO: **revogado como “não sabemos o path”**. Path fechado. Código do player ainda não toca: isso é alinhamento, não GAP de produto.
- GAP-COMPRA: **revogado**. DADOS-COMPRA / DADOS-ASSINATURA no user MS.
- GAP-GURU-NAV: ainda aberto (path vs seletor). MVP1 mostra só java, não bloqueia.
