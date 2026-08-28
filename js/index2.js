(function () {
  var copy = {
    pt_BR: {
      tagline: "Guru Java",
      enter: "Entrar",
      kicker: "Treinamento em Java",
      h1: "Aula clara. Entra com o email. Sem senha.",
      lede: "O Guru Java no Digitus Forum: gif sincronizado com áudio, trainings grátis e pagos. Conta em um código. Cartão nunca passa pelo nosso servidor.",
      cta: "Começar agora",
      how: "Como funciona",
      trust: "O Digitus Forum não salva nem recebe o número do cartão. O pagamento vai direto para a Stripe, uma das maiores processadoras de cartões do mundo.",
      panelTitle: "Três passos",
      panelLead: "O mesmo fluxo pra criar conta e pra entrar.",
      s1: "Informa o email.",
      s2: "Recebe um código. Confirma.",
      s3: "Se o email é novo, a conta nasce. Se já existe, você entra. Assiste.",
      whyTitle: "Por que isso vende confiança",
      whySub: "Menos tela, menos fricção, pagamento fora da nossa mão.",
      c1t: "Sem senha",
      c1p: "Ninguém inventa senha fraca nem pede reset. Email e código. Nome você coloca depois, se quiser.",
      c2t: "Aula no seu ritmo",
      c2p: "Gif + áudio no aparelho. O arquivo de áudio inteiro no front, pra ir a qualquer segundo na hora.",
      c3t: "Stripe na página",
      c3p: "Assinatura no cartão. Compra avulsa no cartão ou PIX. O Digitus não vê o número do cartão.",
      note: "Mensalidade do MVP1 libera o Guru Java. Trainings avulsos você compra um a um. Gratuitos continuam abertos, sem conta.",
      foot: "Pagamentos processados pela Stripe. Não armazenamos cartão."
    },
    en_US: {
      tagline: "Java guru",
      enter: "Enter",
      kicker: "Java training",
      h1: "Clear lessons. Sign in with email. No password.",
      lede: "Java guru on Digitus Forum: gif synced with audio, free and paid trainings. Account from a code. Your card never hits our server.",
      cta: "Start now",
      how: "How it works",
      trust: "Digitus Forum does not save or receive your card number. Payment goes straight to Stripe, one of the largest card processors in the world.",
      panelTitle: "Three steps",
      panelLead: "The same flow to create an account and to sign in.",
      s1: "Enter your email.",
      s2: "Get a code. Confirm.",
      s3: "New email creates the account. Existing email signs you in. Then watch.",
      whyTitle: "Why this feels safe to buy",
      whySub: "Fewer screens, less friction, we never hold the card.",
      c1t: "No password",
      c1p: "No weak password, no reset. Email and a code. Name comes later, if you want.",
      c2t: "Learn at your pace",
      c2p: "Gif + audio on the device. The full audio file is on the front, so any second is ready.",
      c3t: "Stripe on the page",
      c3p: "Membership on card. One-off on card or PIX. Digitus never sees the card number.",
      note: "MVP1 membership unlocks the Java guru. Individual trainings are sold one by one. Free ones stay open, no account needed.",
      foot: "Payments processed by Stripe. We do not store cards."
    }
  };

  var PT = {
    videoId: "8a102755-e1ab-4f6a-9bba-93bbcd1cc500",
    moduleId: "138b45c2-1436-40b2-909b-0da9671aa823",
    trainingId: "ebe50463-91b9-48a7-a228-37570f6ea247"
  };
  var EN = {
    videoId: "4182b2bc-5fd9-4347-962c-fc6da703f6b3",
    moduleId: "b5df4f95-556d-47eb-928e-7449ac27e312",
    trainingId: "e249fd2d-07d9-4687-83d3-37d04de4a20d"
  };

  function applyLang(lang) {
    var dict = copy[lang] || copy.pt_BR;
    document.documentElement.lang = lang === "en_US" ? "en" : "pt-BR";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    var ids = lang === "en_US" ? EN : PT;
    localStorage.setItem("language", lang);
    localStorage.setItem("videoId", ids.videoId);
    localStorage.setItem("moduleId", ids.moduleId);
    localStorage.setItem("internationalization.training_id", ids.trainingId);
    localStorage.setItem("isTraining", "true");
    document.getElementById("langPt").classList.toggle("is-on", lang === "pt_BR");
    document.getElementById("langEn").classList.toggle("is-on", lang === "en_US");
    document.getElementById("langPt").setAttribute("aria-pressed", lang === "pt_BR" ? "true" : "false");
    document.getElementById("langEn").setAttribute("aria-pressed", lang === "en_US" ? "true" : "false");
  }

  var start = localStorage.getItem("language") === "en_US" ? "en_US" : "pt_BR";
  applyLang(start);
  document.getElementById("langPt").addEventListener("click", function () { applyLang("pt_BR"); });
  document.getElementById("langEn").addEventListener("click", function () { applyLang("en_US"); });
})();
