$(document).ready(function () {
	var FIREWALL = "http://localhost:8080/firewall";
	var MEDIA_BASE = new URL("../", window.location.href).href;
	var GURU_ID = "java";
	var guruPages = [];
	var lessonSeq = 0;

	if (!localStorage.getItem("language")) {
		localStorage.setItem("language", "pt_BR");
	}

	function i18(key) {
		var value = localStorage.getItem("internationalization." + key);
		return value && value !== "null" ? value : "";
	}

	function escapeHtml(s) {
		return String(s == null ? "" : s)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function safeHttpUrl(u) {
		if (!u) {
			return "";
		}
		return /^https?:\/\//i.test(String(u)) ? String(u) : "";
	}

	function tokenUuid() {
		var t = localStorage.getItem("token") || "";
		if (t.indexOf("Bearer ") === 0) {
			t = t.slice(7);
		}
		return t;
	}

	function bearerToken() {
		var t = tokenUuid();
		return t ? "Bearer " + t : "";
	}

	function storeToken(uuid) {
		if (!uuid) {
			return;
		}
		uuid = String(uuid);
		if (uuid.indexOf("Bearer ") === 0) {
			uuid = uuid.slice(7);
		}
		localStorage.setItem("token", uuid);
	}

	function firewall(path, body) {
		var headers = {};
		var auth = bearerToken();
		if (auth) {
			headers.Authorization = auth;
		}
		return $.ajax({
			url: FIREWALL + path,
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(body || {}),
			dataType: "json",
			headers: headers
		});
	}

	var accountStep = tokenUuid() ? "in" : "email";
	var accountEmail = localStorage.getItem("email") || "";
	var accountCodePrefill = "";

	function accountCopy() {
		var en = localStorage.getItem("language") === "en_US";
		return {
			email: "Email",
			send: en ? "Sign in / create account" : "Entrar com/criar conta",
			code: en ? "Code" : "Código",
			confirm: en ? "Send code" : "Enviar código",
			out: en ? "Sign out" : "Deslogar",
			signed: en ? "Signed in" : "Entrou",
			back: en ? "Change email" : "Trocar email",
			settings: en ? "Settings" : "Configurações",
			settingsBack: en ? "Back" : "Voltar",
			myData: en ? "My details" : "Meus dados",
			myPurchases: en ? "My purchases" : "Minhas compras",
			idioma: en ? "Language" : "Idioma",
			myDataTitle: en ? "My details" : "Meus dados",
			nameLabel: en ? "Name" : "Nome",
			ageLabel: en ? "Age" : "Idade",
			save: en ? "Save" : "Salvar",
			savedOk: en ? "Saved." : "Salvo.",
			purchasesEmpty: en ? "No purchases yet" : "Nenhuma compra ainda",
			purchasesSubActive: en ? "Java subscription active" : "Mensalidade Java ativa",
			purchasesLoading: en ? "Loading…" : "Carregando…",
			saveBackground: en ? "Save background color" : "Salvar cor de fundo",
			alwaysChangeBackground: en ? "Always change background color" : "Sempre trocar cor de fundo",
			backgrounds: en ? "Background colors" : "Cores de fundo",
			backgroundsEmpty: en ? "No saved backgrounds yet" : "Nenhuma cor de fundo salva",
			backgroundsLoading: en ? "Loading…" : "Carregando…",
			backgroundSavedOk: en ? "Background saved." : "Cor de fundo salva.",
			swapTraining: en ? "Switch training" : "Trocar treinamento",
			swapList: en ? "List trainings" : "Listar treinamentos",
			swapFav: en ? "Favorites" : "Favoritos",
			swapBuy: en ? "Purchases" : "Compras",
			swapOrders: en ? "Order list" : "Lista de pedidos",
			listTrainingsSearch: en ? "Search" : "Buscar",
			listTrainingsFree: en ? "Free" : "Gratuito",
			listTrainingsPaid: en ? "Paid" : "Pago",
			listTrainingsEmpty: en ? "No trainings found" : "Nenhum treinamento encontrado",
			listTrainingsLoading: en ? "Loading…" : "Carregando…",
			wrongCode: en ? "Wrong code. Try again." : "Código errado. Tenta de novo.",
			emptyCode: en ? "Enter the code" : "Informe o código"
		};
	}

	function emailFrontHtml(c) {
		var html = "";
		html += "<form id='accountEmailForm' action='#' style='margin:0;padding:0;border:0'>";
		html += "<label class='account-label' for='accountEmail'>" + escapeHtml(c.email) + "</label>";
		html += "<input id='accountEmail' class='account-input' type='email' autocomplete='email' value='" + escapeHtml(accountEmail) + "' />";
		html += "<button type='submit' class='account-btn' id='accountSend'>" + escapeHtml(c.send) + "</button>";
		html += "</form>";
		return html;
	}

	function signedFrontHtml(c, shown) {
		var html = "";
		var auto = localStorage.getItem("backgroundAuto") !== "false";
		var bgLabel = auto ? c.saveBackground : c.alwaysChangeBackground;
		html += "<p class='account-signed-email'>" + escapeHtml(shown) + "</p>";
		html += "<button type='button' class='account-btn' id='accountSettings'>" + escapeHtml(c.settings) + "</button>";
		html += "<button type='button' class='account-btn account-btn-ghost' id='saveBackgroundBtn'>" + escapeHtml(bgLabel) + "</button>";
		return html;
	}

	function codeBackHtml(c) {
		var html = "";
		html += "<form id='accountCodeForm' action='#' style='margin:0;padding:0;border:0'>";
		html += "<label class='account-label' for='accountCode'>" + escapeHtml(c.code) + "</label>";
		html += "<input id='accountCode' class='account-input' type='text' inputmode='numeric' maxlength='6' autocomplete='one-time-code' value='" + escapeHtml(accountCodePrefill) + "' />";
		html += "<p class='account-msg' id='accountCodeMsg'></p>";
		html += "<button type='submit' class='account-btn' id='accountConfirm'>" + escapeHtml(c.confirm) + "</button>";
		html += "</form>";
		html += "<button type='button' class='account-btn account-btn-ghost' id='accountBack'>" + escapeHtml(c.back) + "</button>";
		return html;
	}

	function showCodeMsg(text) {
		var $msg = $("#accountCodeMsg");
		if (!$msg.length) {
			return;
		}
		$msg.text(text || "").toggleClass("is-on", !!(text && String(text)));
	}

	function clearCodeMsg() {
		showCodeMsg("");
	}

	function renderAccount() {
		var c = accountCopy();
		var logged = !!tokenUuid();
		var liveEmail = $("#accountEmail").val();
		if (liveEmail != null && String(liveEmail).trim()) {
			accountEmail = String(liveEmail).trim();
		}
		if (accountStep === "code") {
			var liveCode = $("#accountCode").val();
			if (liveCode != null && String(liveCode) !== "") {
				accountCodePrefill = String(liveCode);
			}
		}
		if (logged) {
			if (accountStep !== "settings") {
				accountStep = "in";
			}
		} else if (accountStep !== "code") {
			accountStep = "email";
			flipSidebar(false);
		}
		var shown = accountEmail || localStorage.getItem("email") || "";
		var frontHtml = logged ? signedFrontHtml(c, shown) : emailFrontHtml(c);
		var innerFlipped = !logged && accountStep === "code";
		var html = "";
		html += "<div class='account-flip-scene'>";
		html += "<div class='account-flip-card" + (innerFlipped ? " is-flipped" : "") + "'>";
		html += "<div class='account-flip-face account-flip-front'>";
		html += frontHtml;
		html += "</div>";
		html += "<div class='account-flip-face account-flip-back'>";
		html += codeBackHtml(c);
		html += "</div>";
		html += "</div>";
		html += "</div>";
		$("#accountBox").html(html);
		fillSettingsLabels();
		if (logged && accountStep === "settings") {
			flipSidebar(true);
		}
	}

	function isEnterKey(e) {
		return e.key === "Enter" || e.which === 13 || e.keyCode === 13;
	}

	function focusAccountCode() {
		var $code = $("#accountCode");
		if (!$code.length) {
			return;
		}
		$code.trigger("focus").select();
	}

	function flipAccountCard(toCode) {
		var $card = $("#accountBox .account-flip-card");
		if (!$card.length) {
			renderAccount();
			if (toCode) {
				setTimeout(focusAccountCode, 0);
			}
			return;
		}
		clearCodeMsg();
		$card.off("transitionend.accountCodeFocus");
		if (toCode) {
			$("#accountEmail").trigger("blur");
			$("#accountCode").val(accountCodePrefill);
			var alreadyFlipped = $card.hasClass("is-flipped");
			$card.addClass("is-flipped");
			if (alreadyFlipped) {
				focusAccountCode();
				return;
			}
			var focused = false;
			function focusWhenUsable() {
				if (focused) {
					return;
				}
				focused = true;
				$card.off("transitionend.accountCodeFocus");
				focusAccountCode();
			}
			$card.on("transitionend.accountCodeFocus", function (e) {
				if (e.target !== $card[0]) {
					return;
				}
				focusWhenUsable();
			});
			setTimeout(focusWhenUsable, 520);
		} else {
			$("#accountCode").val("");
			$card.removeClass("is-flipped");
		}
	}

	function rollInnerToSigned() {
		var c = accountCopy();
		var shown = accountEmail || localStorage.getItem("email") || "";
		var $card = $("#accountBox .account-flip-card");
		if (!$card.length) {
			renderAccount();
			return;
		}
		$("#accountBox .account-flip-front").html(signedFrontHtml(c, shown));
		var finished = false;
		function snapFront() {
			if (finished) {
				return;
			}
			finished = true;
			$card.off("transitionend.accountSpin");
			$card.addClass("no-transition");
			$card.removeClass("is-flipped is-spinning-left");
			void $card[0].offsetWidth;
			$card.removeClass("no-transition");
		}
		$card.off("transitionend.accountSpin").on("transitionend.accountSpin", function (e) {
			if (e.target !== $card[0]) {
				return;
			}
			snapFront();
		});
		requestAnimationFrame(function () {
			$card.addClass("is-spinning-left");
		});
		setTimeout(snapFront, 650);
	}

	function fillSettingsLabels() {
		var c = accountCopy();
		$("#settingsTitle").text(c.settings);
		$("#accountLogout").text(c.out);
		$("#accountSettingsBack").text(c.settingsBack);
		$(".settings-link-label[data-k='myData']").text(c.myData);
		$(".settings-link-label[data-k='myPurchases']").text(c.myPurchases);
		$(".settings-link-label[data-k='backgrounds']").text(c.backgrounds);
		$(".settings-link-label[data-k='idioma']").text(c.idioma);
	}

	function showSettingsHome() {
		$("#settingsHomeView").prop("hidden", false);
	}

	function clearMyDataChrome() {
		$("body").removeClass("my-data-open my-purchases-open my-backgrounds-open list-trainings-open");
	}

	function showMyDataMsg(text) {
		var $msg = $("#myDataMsg");
		if (!$msg.length) {
			return;
		}
		$msg.text(text || "").toggleClass("is-on", !!(text && String(text)));
	}

	function openMyDataScreen(animate) {
		flipLanguagePanel(false);
		localStorage.setItem("lessonSource", "my-data");
		$(".topic-nav li").removeClass("selectedNav");
		clearAccordionSelection();
		var c = accountCopy();
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		var videoEl = document.getElementById("video");
		if (window.GifPlayer) {
			window.GifPlayer.mount(videoEl, "", "", "");
		} else if (videoEl) {
			videoEl.innerHTML = "";
		}
		var email = accountEmail || localStorage.getItem("email") || "";
		var name = localStorage.getItem("userName") || "";
		var age = localStorage.getItem("userAge") || "";
		var html = "";
		html += "<div class='my-data-panel'>";
		html += "<label class='account-label' for='myDataName'>" + escapeHtml(c.nameLabel) + "</label>";
		html += "<input id='myDataName' class='account-input' type='text' autocomplete='name' value='" + escapeHtml(name) + "' />";
		html += "<label class='account-label' for='myDataAge'>" + escapeHtml(c.ageLabel) + "</label>";
		html += "<input id='myDataAge' class='account-input' type='number' min='0' max='150' inputmode='numeric' value='" + escapeHtml(age) + "' />";
		html += "<label class='account-label' for='myDataEmail'>" + escapeHtml(c.email) + "</label>";
		html += "<input id='myDataEmail' class='account-input' type='email' readonly autocomplete='email' value='" + escapeHtml(email) + "' />";
		html += "<p class='account-msg' id='myDataMsg'></p>";
		html += "<button type='button' class='account-btn' id='myDataSave'>" + escapeHtml(c.save) + "</button>";
		html += "</div>";
		if (videoEl) {
			videoEl.innerHTML = html;
		}
		$("#previousAndNextVideo").empty();
		$("#name").text(c.myDataTitle);
		$("#description").empty();
		$("#links").empty();
		$("body").removeClass("my-purchases-open my-backgrounds-open list-trainings-open").addClass("my-data-open");
		requestAnimationFrame(function () {
			if (seq !== lessonSeq) {
				return;
			}
			$fields.removeClass("lesson-swap");
		});
		var userId = localStorage.getItem("userId");
		if (!userId) {
			return;
		}
		var headers = {};
		var auth = bearerToken();
		if (auth) {
			headers.Authorization = auth;
		}
		$.ajax({
			url: FIREWALL + "/user/v1/" + encodeURIComponent(userId) + "/retrieve",
			type: "GET",
			dataType: "json",
			headers: headers
		}).done(function (user) {
			if (seq !== lessonSeq) {
				return;
			}
			if (user && user.name != null) {
				$("#myDataName").val(String(user.name));
				localStorage.setItem("userName", String(user.name));
			}
			if (user && user.email) {
				$("#myDataEmail").val(String(user.email));
			}
			if (user && user.age != null && user.age !== "") {
				$("#myDataAge").val(String(user.age));
				localStorage.setItem("userAge", String(user.age));
			}
		});
	}

	function openMyPurchasesScreen(animate) {
		flipLanguagePanel(false);
		localStorage.setItem("lessonSource", "my-purchases");
		$(".topic-nav li").removeClass("selectedNav");
		clearAccordionSelection();
		var c = accountCopy();
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		var videoEl = document.getElementById("video");
		if (window.GifPlayer) {
			window.GifPlayer.mount(videoEl, "", "", "");
		} else if (videoEl) {
			videoEl.innerHTML = "";
		}
		var html = "";
		html += "<div class='my-purchases-panel'>";
		html += "<p class='my-purchases-status'>" + escapeHtml(c.purchasesLoading) + "</p>";
		html += "</div>";
		if (videoEl) {
			videoEl.innerHTML = html;
		}
		$("#previousAndNextVideo").empty();
		$("#name").text(c.myPurchases);
		$("#description").empty();
		$("#links").empty();
		$("body").removeClass("my-data-open my-backgrounds-open list-trainings-open").addClass("my-purchases-open");
		requestAnimationFrame(function () {
			if (seq !== lessonSeq) {
				return;
			}
			$fields.removeClass("lesson-swap");
		});
		function renderPurchases(me) {
			if (seq !== lessonSeq) {
				return;
			}
			var panel = document.querySelector("#video .my-purchases-panel");
			if (!panel) {
				return;
			}
			var c2 = accountCopy();
			var ids = (me && me.purchasedTrainingIds) || [];
			var parts = [];
			if (me && me.javaSubscriptionActive) {
				parts.push("<div class='my-purchases-sub'>" + escapeHtml(c2.purchasesSubActive) + "</div>");
			}
			for (var i = 0; i < ids.length; i++) {
				var tid = ids[i];
				var t = trainingById(tid);
				var name = (t && t.name) || String(tid);
				var sinopse = (t && t.sinopse) || "";
				parts.push("<button type='button' class='my-purchases-item' data-training-id='" + escapeHtml(String(tid)) + "'>");
				parts.push("<span class='my-purchases-item-name'>" + escapeHtml(name) + "</span>");
				if (sinopse) {
					parts.push("<span class='my-purchases-item-sinopse'>" + escapeHtml(sinopse) + "</span>");
				}
				parts.push("</button>");
			}
			if (!parts.length) {
				panel.innerHTML = "<p class='my-purchases-empty'>" + escapeHtml(c2.purchasesEmpty) + "</p>";
			} else {
				panel.innerHTML = parts.join("");
			}
		}
		function ensureTrainingsThenRender(me) {
			if (trainingsForLocale && trainingsForLocale.length) {
				renderPurchases(me);
				return;
			}
			loadTrainings().done(function (trainings) {
				trainingsForLocale = trainings || [];
				renderPurchases(me);
			}).fail(function () {
				renderPurchases(me);
			});
		}
		loadBillingMe().done(function (me) {
			ensureTrainingsThenRender(me || { purchasedTrainingIds: [], javaSubscriptionActive: false });
		}).fail(function () {
			ensureTrainingsThenRender({ purchasedTrainingIds: [], javaSubscriptionActive: false });
		});
	}

	function openListTrainingsScreen(animate) {
		flipLanguagePanel(false);
		localStorage.setItem("lessonSource", "list-trainings");
		$(".topic-nav li").removeClass("selectedNav");
		clearAccordionSelection();
		var c = accountCopy();
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		var videoEl = document.getElementById("video");
		if (window.GifPlayer) {
			window.GifPlayer.mount(videoEl, "", "", "");
		} else if (videoEl) {
			videoEl.innerHTML = "";
		}
		var html = "";
		html += "<div class='list-trainings-panel'>";
		html += "<input id='listTrainingsSearch' class='list-trainings-search' type='search' autocomplete='off' placeholder='" + escapeHtml(c.listTrainingsSearch) + "' />";
		html += "<div class='list-trainings-list'><p class='list-trainings-status'>" + escapeHtml(c.listTrainingsLoading) + "</p></div>";
		html += "</div>";
		if (videoEl) {
			videoEl.innerHTML = html;
		}
		$("#previousAndNextVideo").empty();
		$("#name").text(c.swapList);
		$("#description").empty();
		$("#links").empty();
		$("body").removeClass("my-data-open my-purchases-open my-backgrounds-open").addClass("list-trainings-open");
		requestAnimationFrame(function () {
			if (seq !== lessonSeq) {
				return;
			}
			$fields.removeClass("lesson-swap");
		});
		function badgeHtml(training, c2) {
			if (training && training.paid) {
				var price = formatBrl(training.price);
				return "<span class='list-trainings-badge list-trainings-badge-paid'>" + escapeHtml(c2.listTrainingsPaid + " · " + price) + "</span>";
			}
			return "<span class='list-trainings-badge list-trainings-badge-free'>" + escapeHtml(c2.listTrainingsFree) + "</span>";
		}
		function shortSinopse(text) {
			var s = String(text || "").trim();
			if (s.length <= 120) {
				return s;
			}
			return s.slice(0, 117).replace(/\s+\S*$/, "") + "…";
		}
		function renderList(trainings, query) {
			if (seq !== lessonSeq) {
				return;
			}
			var wrap = document.querySelector("#video .list-trainings-list");
			if (!wrap) {
				return;
			}
			var c2 = accountCopy();
			var q = String(query || "").trim().toLowerCase();
			var parts = [];
			for (var i = 0; i < trainings.length; i++) {
				var t = trainings[i] || {};
				var name = t.name || String(t.trainingId || "");
				var sinopse = t.sinopse || "";
				if (q) {
					var hay = (name + " " + sinopse).toLowerCase();
					if (hay.indexOf(q) === -1) {
						continue;
					}
				}
				var tid = t.trainingId;
				parts.push("<button type='button' class='list-trainings-item' data-training-id='" + escapeHtml(String(tid)) + "'>");
				parts.push("<span class='list-trainings-item-top'>");
				parts.push("<span class='list-trainings-item-name'>" + escapeHtml(name) + "</span>");
				parts.push(badgeHtml(t, c2));
				parts.push("</span>");
				var short = shortSinopse(sinopse);
				if (short) {
					parts.push("<span class='list-trainings-item-sinopse'>" + escapeHtml(short) + "</span>");
				}
				parts.push("</button>");
			}
			if (!parts.length) {
				wrap.innerHTML = "<p class='list-trainings-empty'>" + escapeHtml(c2.listTrainingsEmpty) + "</p>";
			} else {
				wrap.innerHTML = parts.join("");
			}
		}
		function paint(trainings) {
			renderList(trainings, $("#listTrainingsSearch").val());
			$("#listTrainingsSearch").off("input.listTrainings").on("input.listTrainings", function () {
				renderList(trainings, $(this).val());
			});
		}
		if (trainingsForLocale && trainingsForLocale.length) {
			paint(trainingsForLocale);
			return;
		}
		loadTrainings().done(function (trainings) {
			trainingsForLocale = trainings || [];
			if (seq !== lessonSeq) {
				return;
			}
			paint(trainingsForLocale);
		}).fail(function () {
			if (seq !== lessonSeq) {
				return;
			}
			paint([]);
		});
	}

	function syncSaveBackgroundBtn() {
		var c = accountCopy();
		var auto = localStorage.getItem("backgroundAuto") !== "false";
		var label = auto ? c.saveBackground : c.alwaysChangeBackground;
		$("#saveBackgroundBtn").text(label);
	}

	function syncBackgroundLocalPrefs(prefs) {
		if (!prefs) {
			return;
		}
		var auto = prefs.backgroundAuto !== false && prefs.backgroundAuto !== "false";
		localStorage.setItem("backgroundAuto", auto ? "true" : "false");
		if (!auto && prefs.pinnedBackgroundId) {
			localStorage.setItem("backgroundPinnedId", String(prefs.pinnedBackgroundId));
		} else {
			localStorage.removeItem("backgroundPinnedId");
		}
		if (!auto && prefs.wallpaperData && typeof window.isSafeWallpaper === "function"
				&& window.isSafeWallpaper(prefs.wallpaperData)) {
			localStorage.setItem("backgroundPinnedUrl", prefs.wallpaperData);
			if (typeof window.applyWallpaper === "function") {
				window.applyWallpaper(prefs.wallpaperData, true);
			}
			if (typeof window.syncMenuFromBackground === "function") {
				window.syncMenuFromBackground();
			}
		} else if (auto) {
			localStorage.removeItem("backgroundPinnedUrl");
		}
		syncSaveBackgroundBtn();
	}

	function loadBackgroundPrefs() {
		if (!tokenUuid()) {
			return $.Deferred().resolve(null).promise();
		}
		return firewall("/background/v1/prefs", {}).done(function (prefs) {
			syncBackgroundLocalPrefs(prefs);
		});
	}

	var ITALIAN_WOMAN_NAMES = [
		"Giulia", "Sofia", "Francesca", "Chiara", "Alessandra", "Valentina", "Martina",
		"Giorgia", "Elena", "Isabella", "Beatrice", "Aurora", "Serena", "Lucia",
		"Federica", "Greta", "Camilla", "Vittoria", "Ludovica", "Noemi"
	];

	function colorNameFromRgb(r, g, b, en) {
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);
		var l = (max + min) / 2 / 255;
		var s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
		if (s < 0.12 || l < 0.12 || l > 0.9) {
			return en ? "Gray" : "Cinza";
		}
		var h;
		var d = max - min;
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
		else if (max === g) h = ((b - r) / d + 2) * 60;
		else h = ((r - g) / d + 4) * 60;
		if (h < 15 || h >= 345) return en ? "Red" : "Vermelho";
		if (h < 40) return en ? "Orange" : "Laranja";
		if (h < 70) return en ? "Yellow" : "Amarelo";
		if (h < 160) return en ? "Green" : "Verde";
		if (h < 255) return en ? "Blue" : "Azul";
		if (h < 290) return en ? "Purple" : "Roxo";
		if (h < 345) return en ? "Pink" : "Rosa";
		if (l < 0.35 && s < 0.45) return en ? "Brown" : "Marrom";
		return en ? "Gray" : "Cinza";
	}

	function sampleDominantColor(dataUrl, done) {
		var img = new Image();
		img.onload = function () {
			var canvas = document.createElement("canvas");
			var w = Math.max(80, Math.min(img.width, 640));
			var h = Math.max(80, Math.min(img.height, 640));
			canvas.width = w;
			canvas.height = h;
			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, w, h);
			var best = { score: -1, r: 255, g: 122, b: 61 };
			function consider(x, y) {
				var p = ctx.getImageData(x, y, 1, 1).data;
				var rr = p[0] / 255, gg = p[1] / 255, bb = p[2] / 255;
				var mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
				var l = (mx + mn) / 2;
				var s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(mx + mn - 1));
				var score = s * (1 - Math.abs(l - 0.48) * 1.4);
				if (score > best.score) {
					best = { score: score, r: p[0], g: p[1], b: p[2] };
				}
			}
			var x, y;
			for (x = 8; x < w * 0.28; x += 18) {
				for (y = 8; y < h - 8; y += 22) {
					consider(x, y);
				}
			}
			for (x = Math.floor(w * 0.4); x < w * 0.7; x += 28) {
				for (y = Math.floor(h * 0.25); y < h * 0.7; y += 28) {
					consider(x, y);
				}
			}
			done(best.r, best.g, best.b);
		};
		img.onerror = function () {
			done(255, 122, 61);
		};
		img.src = dataUrl;
	}

	function buildBackgroundName(r, g, b) {
		var en = localStorage.getItem("language") === "en_US";
		var color = colorNameFromRgb(r, g, b, en);
		var name = ITALIAN_WOMAN_NAMES[Math.floor(Math.random() * ITALIAN_WOMAN_NAMES.length)];
		return color + " " + name;
	}

	function openBackgroundsScreen(animate) {
		flipLanguagePanel(false);
		localStorage.setItem("lessonSource", "my-backgrounds");
		$(".topic-nav li").removeClass("selectedNav");
		clearAccordionSelection();
		var c = accountCopy();
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		var videoEl = document.getElementById("video");
		if (window.GifPlayer) {
			window.GifPlayer.mount(videoEl, "", "", "");
		} else if (videoEl) {
			videoEl.innerHTML = "";
		}
		var html = "";
		html += "<div class='my-backgrounds-panel'>";
		html += "<p class='my-backgrounds-status'>" + escapeHtml(c.backgroundsLoading) + "</p>";
		html += "</div>";
		if (videoEl) {
			videoEl.innerHTML = html;
		}
		$("#previousAndNextVideo").empty();
		$("#name").text(c.backgrounds);
		$("#description").empty();
		$("#links").empty();
		$("body").removeClass("my-data-open my-purchases-open list-trainings-open").addClass("my-backgrounds-open");
		requestAnimationFrame(function () {
			if (seq !== lessonSeq) {
				return;
			}
			$fields.removeClass("lesson-swap");
		});
		firewall("/background/v1/list", {}).done(function (rows) {
			if (seq !== lessonSeq) {
				return;
			}
			var panel = document.querySelector("#video .my-backgrounds-panel");
			if (!panel) {
				return;
			}
			var c2 = accountCopy();
			var list = rows || [];
			if (!list.length) {
				panel.innerHTML = "<p class='my-backgrounds-empty'>" + escapeHtml(c2.backgroundsEmpty) + "</p>";
				return;
			}
			var parts = [];
			for (var i = 0; i < list.length; i++) {
				var row = list[i] || {};
				var id = row.id || row.backgroundId || "";
				var name = row.name || id;
				var swatch = row.dominantColor || "#888";
				parts.push("<button type='button' class='my-backgrounds-item' data-background-id='" + escapeHtml(String(id)) + "'>");
				parts.push("<span class='my-backgrounds-swatch' style='background-color:" + escapeHtml(String(swatch)) + "'></span>");
				parts.push("<span class='my-backgrounds-item-name'>" + escapeHtml(name) + "</span>");
				parts.push("</button>");
			}
			panel.innerHTML = parts.join("");
		}).fail(function () {
			if (seq !== lessonSeq) {
				return;
			}
			var panel = document.querySelector("#video .my-backgrounds-panel");
			if (panel) {
				panel.innerHTML = "<p class='my-backgrounds-empty'>" + escapeHtml(accountCopy().backgroundsEmpty) + "</p>";
			}
		});
	}

	function flipSidebar(toSettings) {
		var $card = $("#sidebarFlip");
		if (!$card.length) {
			return;
		}
		if (toSettings) {
			fillSettingsLabels();
			$card.addClass("is-flipped");
		} else {
			$card.removeClass("is-flipped");
		}
	}

	function fillSwapLabels() {
		var c = accountCopy();
		$("#swapTrainingTitle").text(c.swapTraining);
		$("#swapTrainingBtn").text(c.swapTraining);
		$("#swapTrainingBack").text(c.settingsBack);
		$(".swap-link-label[data-k='list']").text(c.swapList);
		$(".swap-link-label[data-k='fav']").text(c.swapFav);
		$(".swap-link-label[data-k='buy']").text(c.swapBuy);
		$(".swap-link-label[data-k='orders']").text(c.swapOrders);
	}

	function flipModules(toSwap) {
		var $card = $("#modulesFlip");
		if (!$card.length) {
			return;
		}
		if (toSwap) {
			fillSwapLabels();
			$card.addClass("is-flipped");
		} else {
			$card.removeClass("is-flipped");
		}
	}

	function rollOuterToEmail() {
		flipSidebar(false);
		renderAccount();
	}

	function ajaxFailed(xhr) {
		if (xhr.responseText == undefined) {
			alert("Server offline");
			return;
		}
		try {
			alert(JSON.parse(xhr.responseText).message || xhr.responseText);
		} catch (e) {
			alert(xhr.responseText);
		}
	}

	function loadI18n() {
		return firewall("/internationalization/v1/frontend", {
			locale: localStorage.getItem("language")
		}).done(function (rows) {
			for (var i = 0; i < rows.length; i++) {
				localStorage.setItem("internationalization." + rows[i].keyy, rows[i].message);
			}
		});
	}

	function lessonFields() {
		return $("#name, #description, #links, #video");
	}

	var trainingsForLocale = [];
	var trainingGifOrder = [];

	function lastVideoKey() {
		return "guru." + GURU_ID + ".lastVideoId";
	}

	function lastModuleKey() {
		return "guru." + GURU_ID + ".lastModuleId";
	}

	function titleFromSrc(src) {
		var name = String(src || "").split("?")[0].split("/").pop() || "";
		name = name.replace(/\.html$/i, "").replace(/[-_]+/g, " ").trim();
		if (!name) {
			return "Página";
		}
		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	function pageTitle(page) {
		var key = page && page.titleKey;
		var fromI18 = key ? i18(key) : "";
		if (fromI18) {
			return fromI18;
		}
		return titleFromSrc(page && page.src);
	}

	function pageSrc(page) {
		var path = (page && page.src) || "";
		if (!path) {
			return "";
		}
		if (/^https?:\/\//i.test(path)) {
			return path;
		}
		if (/\.\.|\\/.test(path)) {
			return "";
		}
		var rel = String(path).replace(/^\//, "");
		if (rel.indexOf("buckets/digitus-forum-media/") !== 0) {
			if (rel.indexOf("gurus/") === 0) {
				rel = "buckets/digitus-forum-media/" + rel;
			} else if (rel.indexOf("/") === -1 && /\.html$/i.test(rel)) {
				rel = "buckets/digitus-forum-media/gurus/" + GURU_ID + "/" + rel;
			} else {
				return "";
			}
		}
		if (rel.indexOf("buckets/digitus-forum-media/gurus/") !== 0) {
			return "";
		}
		return new URL(rel, MEDIA_BASE).href + "?v=" + Date.now();
	}

	function renderGuruPages(pages) {
		guruPages = pages || [];
		var title = (i18("guru_java") || "Java") + " — linha dois do título pra ver o wrap do cabeçalho esquerdo e linha três ainda aqui";
		var desc = (i18("guru_java_sinopse") || "Vitrine") + " com texto longo de teste: segunda linha da sinopse do guru e uma terceira linha pra estressar o layout";
		var selectedSrc = localStorage.getItem("guruPageSrc") || "";
		var html = "<div class='sidebar-head brand-head'>";
		html += "<div class='sidebar-icon'>☕</div>";
		html += "<div><h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(desc) + "</p></div>";
		html += "</div><ul class='topic-nav'>";
		for (var i = 0; i < guruPages.length; i++) {
			var page = guruPages[i];
			var src = page.src || "";
			var cls = String(selectedSrc) === String(src) ? "selectedNav" : "";
			html += "<li class='" + cls + "'><a href='#' data-guru-src='" + escapeHtml(src) + "' data-guru-page='" + escapeHtml(page.guruPageId || "") + "' class='guruPageClick'><span class='nav-ico'>●</span>" + escapeHtml(pageTitle(page)) + "</a></li>";
		}
		html += "</ul>";
		$("#leftAccordion").html(html);
	}

	function loadGuruPages() {
		return firewall("/guru/v1/" + GURU_ID + "/pages", {}).done(renderGuruPages);
	}

	function clearAccordionSelection() {
		$("#accordion li.selectedGif").removeClass("selectedGif");
		$("#accordion h3.selectedModule").removeClass("selectedModule");
	}

	function markGuruPage(src) {
		$(".topic-nav li").removeClass("selectedNav");
		$(".guruPageClick").filter(function () {
			return String($(this).attr("data-guru-src")) === String(src);
		}).parent("li").addClass("selectedNav");
		clearAccordionSelection();
	}

	function openGuruPage(page, animate) {
		if (!page) {
			return;
		}
		var src = pageSrc(page);
		if (!src) {
			return;
		}
		clearMyDataChrome();
		localStorage.setItem("guruPageSrc", page.src || "");
		localStorage.setItem("lessonSource", "guru-page");
		markGuruPage(page.src || "");
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		var videoEl = document.getElementById("video");
		if (window.GifPlayer) {
			window.GifPlayer.mount(videoEl, "", "", "");
		} else if (videoEl) {
			videoEl.innerHTML = "";
		}
		var iframe = document.createElement("iframe");
		iframe.className = "guru-page-frame";
		iframe.setAttribute("title", pageTitle(page));
		iframe.src = src;
		if (videoEl) {
			videoEl.appendChild(iframe);
		}
		$("#previousAndNextVideo").empty();
		$("#name").text(pageTitle(page));
		$("#description").empty();
		$("#links").empty();
		requestAnimationFrame(function () {
			if (seq !== lessonSeq) {
				return;
			}
			$fields.removeClass("lesson-swap");
		});
	}

	function renderModules(modules) {
		var $acc = $("#accordion");
		if ($acc.hasClass("ui-accordion")) {
			$acc.accordion("destroy");
		}
		trainingGifOrder = [];
		var videoId = localStorage.getItem("trainingVideoId");
		var moduleId = localStorage.getItem("trainingModuleId");
		var active = 0;
		var html = "";
		for (var i = 0; i < modules.length; i++) {
			var m = modules[i];
			if (String(m.moduleId) === String(moduleId)) {
				active = i;
			}
			html += "<h3 class='" + (String(m.moduleId) === String(moduleId) ? "selectedModule" : "") + "'>" + escapeHtml(i18("module")) + " " + escapeHtml(m.number) + " · " + escapeHtml(m.name) + "</h3>";
			html += "<div><p class='moduleDescription'>" + escapeHtml(m.description || "") + "</p><ul>";
			var videos = m.videos || [];
			for (var j = 0; j < videos.length; j++) {
				var v = videos[j];
				trainingGifOrder.push({ videoId: v.videoId, moduleId: m.moduleId });
				html += "<li class='" + (String(v.videoId) === String(videoId) ? "selectedGif" : "") + "'>";
				html += "<a href='#' data-training-video='" + escapeHtml(v.videoId) + "' data-training-module='" + escapeHtml(m.moduleId) + "' class='trainingGifClick'>" + escapeHtml(v.name) + "</a></li>";
			}
			html += "</ul></div>";
		}
		$acc.html(html);
		if (modules.length) {
			$acc.accordion({ heightStyle: "content", collapsible: true, active: active });
		}
	}

	function trainingGifIndex(videoId) {
		for (var i = 0; i < trainingGifOrder.length; i++) {
			if (String(trainingGifOrder[i].videoId) === String(videoId)) {
				return i;
			}
		}
		return -1;
	}

	function trainingGifAt(offsetFromCurrent) {
		var n = trainingGifOrder.length;
		if (!n) {
			return null;
		}
		var idx = trainingGifIndex(localStorage.getItem("videoId"));
		if (idx < 0) {
			idx = trainingGifIndex(localStorage.getItem("trainingVideoId"));
		}
		if (idx < 0) {
			idx = 0;
		}
		var next = (idx + offsetFromCurrent) % n;
		if (next < 0) {
			next += n;
		}
		return trainingGifOrder[next];
	}

	function loadModules() {
		var trainingId = localStorage.getItem("internationalization.training_id");
		if (!trainingId) {
			return $.Deferred().resolve([]).promise();
		}
		return firewall("/module/v1/retrieveByTrainingIdWithVideos", {
			trainingId: trainingId,
			language: localStorage.getItem("language")
		}).done(renderModules);
	}

	function firstLesson(modules) {
		if (!modules || !modules.length) {
			return null;
		}
		for (var i = 0; i < modules.length; i++) {
			var videos = modules[i].videos || [];
			if (videos.length) {
				return { videoId: videos[0].videoId, moduleId: modules[i].moduleId };
			}
		}
		return null;
	}

	function closeTrainingPicker() {
		$("#trainingPickerList").attr("hidden", true);
		$("#trainingPickerBtn").attr("aria-expanded", "false");
	}

	function fillTrainingPicker(trainings, selectedId) {
		trainingsForLocale = trainings || [];
		var selected = trainingById(selectedId) || trainingsForLocale[0];
		if (selected) {
			$("#trainingPickerName").text((selected.name || "") + " — segunda linha do nome do treinamento e terceira linha de teste");
			$("#trainingPickerSinopse").text((selected.sinopse || "") + " Texto longo de teste: segunda linha da vitrine e terceira linha pra ver o wrap");
		}
		var html = "";
		for (var i = 0; i < trainingsForLocale.length; i++) {
			var c = trainingsForLocale[i];
			var current = String(c.trainingId) === String(selected && selected.trainingId) ? " is-current" : "";
			html += "<li><button type='button' class='" + current.trim() + "' data-training='" + escapeHtml(c.trainingId) + "'>";
			html += "<div class='sidebar-icon'>🎓</div><div><h2>" + escapeHtml(c.name || "") + "</h2><p>" + escapeHtml(c.sinopse || "") + "</p></div>";
			html += "</button></li>";
		}
		$("#trainingPickerList").html(html);
		closeTrainingPicker();
	}

	function loadTrainings() {
		return firewall("/training/v1/retrieveAll", {});
	}

	function applyTrainingMeta(training) {
		if (!training) {
			return;
		}
		localStorage.setItem("internationalization.training_id", training.trainingId);
		localStorage.setItem("trainingFamilyId", training.familyId || "");
		localStorage.setItem("trainingName", training.name || "");
		localStorage.setItem("trainingSinopse", training.sinopse || "");
		localStorage.setItem("isTraining", "true");
	}

	function trainingById(id) {
		for (var i = 0; i < trainingsForLocale.length; i++) {
			if (String(trainingsForLocale[i].trainingId) === String(id)) {
				return trainingsForLocale[i];
			}
		}
		return null;
	}

	function trainingByFamily(familyId) {
		if (!familyId) {
			return null;
		}
		for (var i = 0; i < trainingsForLocale.length; i++) {
			if (String(trainingsForLocale[i].familyId) === String(familyId)) {
				return trainingsForLocale[i];
			}
		}
		return null;
	}

	var billingMeCache = null;
	var DEFAULT_TRUST = "O Digitus Forum não salva nem recebe o número do cartão. O pagamento vai direto para a Stripe, uma das maiores processadoras de cartões do mundo.";

	function trustLine() {
		return i18("billing_trust_line") || DEFAULT_TRUST;
	}

	function formatBrl(cents) {
		var n = Number(cents || 0) / 100;
		if (isNaN(n)) {
			n = 0;
		}
		return "R$ " + n.toFixed(2).replace(".", ",");
	}

	function ownsTraining(training, me) {
		if (!training) {
			return false;
		}
		if (!training.paid) {
			return true;
		}
		if (!me) {
			return false;
		}
		if (me.javaSubscriptionActive && String(training.guruId || "java") === "java") {
			return true;
		}
		var ids = me.purchasedTrainingIds || [];
		for (var i = 0; i < ids.length; i++) {
			if (String(ids[i]) === String(training.trainingId)) {
				return true;
			}
		}
		return false;
	}

	function loadBillingMe() {
		if (!tokenUuid()) {
			billingMeCache = null;
			return $.Deferred().resolve(null).promise();
		}
		return firewall("/billing/v1/me", {}).then(function (me) {
			billingMeCache = me || { purchasedTrainingIds: [], javaSubscriptionActive: false };
			return billingMeCache;
		});
	}

	function clearModules() {
		var $acc = $("#accordion");
		if ($acc.hasClass("ui-accordion")) {
			$acc.accordion("destroy");
		}
		trainingGifOrder = [];
		$acc.empty();
	}

	function hidePaidLock() {
		$("#paidLock").remove();
	}

	function showPaidLock(training, reason) {
		hidePaidLock();
		clearMyDataChrome();
		if (window.GifPlayer) {
			window.GifPlayer.mount(document.getElementById("video"), "", "", "");
		} else {
			$("#video").empty();
		}
		$("#previousAndNextVideo").empty();
		$("#description").empty();
		$("#links").empty();
		$("#name").text((training && training.name) || "");
		clearModules();
		var en = localStorage.getItem("language") === "en_US";
		var priceLabel = formatBrl(training && training.price);
		var title = en ? "This training is paid" : "Este treinamento é pago";
		var needLogin = !tokenUuid();
		var btn = needLogin ? (en ? "Sign in to buy" : "Entre para comprar") : (en ? "Buy (" + priceLabel + ")" : "Comprar (" + priceLabel + ")");
		var subBtn = needLogin ? (en ? "Sign in to subscribe" : "Entre para assinar") : (en ? "Subscribe (R$ 59)" : "Assinar (R$ 59)");
		var html = "<div class='paid-lock glass' id='paidLock'>";
		html += "<p class='paid-lock-title'>" + escapeHtml(title) + "</p>";
		html += "<button type='button' class='account-btn' id='paidBuyBtn' data-training='" + escapeHtml((training && training.trainingId) || "") + "'>" + escapeHtml(btn) + "</button>";
		html += "<button type='button' class='account-btn account-btn-ghost' id='paidSubBtn' data-training='" + escapeHtml((training && training.trainingId) || "") + "'>" + escapeHtml(subBtn) + "</button>";
		html += "<p class='paid-lock-trust'>" + escapeHtml(trustLine()) + "</p>";
		html += "<p class='paid-lock-msg' id='paidLockMsg'></p>";
		html += "</div>";
		$("#video").html(html);
		if (reason === "503") {
			$("#paidLockMsg").text(en ? "Stripe test is not on yet." : "Stripe test ainda não está ligado.");
		}
	}

	function ensureTrainingAccess(training) {
		if (!training || !training.paid) {
			hidePaidLock();
			return $.Deferred().resolve(true).promise();
		}
		if (!tokenUuid()) {
			showPaidLock(training, "login");
			return $.Deferred().resolve(false).promise();
		}
		return loadBillingMe().then(function (me) {
			if (ownsTraining(training, me)) {
				hidePaidLock();
				return true;
			}
			showPaidLock(training, "buy");
			return false;
		}, function (xhr) {
			showPaidLock(training, xhr && xhr.status === 503 ? "503" : "buy");
			return false;
		});
	}

	function openTraining(training, goToFirst) {
		applyTrainingMeta(training);
		fillTrainingPicker(trainingsForLocale, training.trainingId);
		return ensureTrainingAccess(training).done(function (owned) {
			if (!owned) {
				return;
			}
			hidePaidLock();
			return loadModules().done(function (modules) {
				if (goToFirst) {
					var first = firstLesson(modules);
					if (first) {
						goToLesson(first.videoId, first.moduleId, true, "training");
					}
				}
			});
		});
	}

	function markSelected(source) {
		if (source === "guru-page") {
			markGuruPage(localStorage.getItem("guruPageSrc") || "");
			return;
		}
		$(".topic-nav li").removeClass("selectedNav");
		var videoId = localStorage.getItem("trainingVideoId");
		$("#accordion li").removeClass("selectedGif");
		$("#accordion a.trainingGifClick").filter(function () {
			return String($(this).attr("data-training-video")) === String(videoId);
		}).parent("li").addClass("selectedGif");
		$("#accordion h3").removeClass("selectedModule");
		var $match = $("#accordion a.trainingGifClick").filter(function () {
			return String($(this).attr("data-training-video")) === String(videoId);
		}).first();
		var $h3 = $match.closest("div").prev("h3");
		$h3.addClass("selectedModule");
		if ($("#accordion").hasClass("ui-accordion") && $h3.length) {
			var idx = $("#accordion > h3").index($h3);
			if (idx >= 0) {
				$("#accordion").accordion("option", "active", idx);
			}
		}
	}

	function lessonMediaPath(videoId, ext) {
		var id = String(videoId || "");
		if (!id || /\.\.|[\\/]/.test(id)) {
			return "";
		}
		return "buckets/digitus-forum-media/videos/" + id + "." + ext;
	}

	function gifSrc(video) {
		var path = (video && video.gif) || "";
		if (!path && video && video.videoId) {
			path = lessonMediaPath(video.videoId, "gif");
		}
		if (!path) {
			return "";
		}
		if (/^https?:\/\//i.test(path)) {
			return path;
		}
		if (/\.\.|\\/.test(path)) {
			return "";
		}
		var rel = String(path).replace(/^\//, "");
		if (rel.indexOf("buckets/digitus-forum-media/") !== 0) {
			return "";
		}
		return new URL(rel, MEDIA_BASE).href + "?v=" + Date.now();
	}

	function audioSrc(video) {
		if (!video || !video.videoId) {
			return "";
		}
		var rel = lessonMediaPath(video.videoId, "m4a");
		if (!rel) {
			return "";
		}
		return new URL(rel, MEDIA_BASE).href;
	}

	function renderLesson(video) {
		var nav = "";
		if (trainingGifOrder.length) {
			nav += "<a id='previousVideo' href='#'>" + escapeHtml(i18("previous_video") || "Previous") + "</a>";
			nav += "<a id='nextVideo' href='#'>" + escapeHtml(i18("next_video") || "Next") + "</a>";
		}
		$("#previousAndNextVideo").html(nav);
		$("#name").text(video.name || "");
		$("#description").text(video.description || "");
		var links = "";
		var videoLinks = video.links || [];
		for (var i = 0; i < videoLinks.length; i++) {
			var href = safeHttpUrl(videoLinks[i].url);
			if (!href) {
				continue;
			}
			links += "<a target='_blank' href='" + escapeHtml(href) + "'>↗ " + escapeHtml(videoLinks[i].name || "") + "</a>";
		}
		$("#links").html(links);
		var src = gifSrc(video);
		var m4a = audioSrc(video);
		if (src) {
			var title = escapeHtml(video.name || "");
			if (window.GifPlayer) {
				window.GifPlayer.mount(document.getElementById("video"), src, title, m4a);
			} else {
				$("#video").html("<img alt=\"" + title + "\" src=\"" + src + "\" />");
			}
		} else {
			if (window.GifPlayer) {
				window.GifPlayer.mount(document.getElementById("video"), "", "", m4a);
			} else {
				$("#video").empty();
			}
		}
		markSelected(localStorage.getItem("lessonSource") || "training");
	}

	function loadLesson(animate) {
		var seq = ++lessonSeq;
		var $fields = lessonFields();
		if (animate) {
			$fields.addClass("lesson-swap");
		}
		firewall("/video/v1/retrieveById", {
			videoId: localStorage.getItem("videoId"),
			moduleId: localStorage.getItem("moduleId")
		}).done(function (video) {
			if (seq !== lessonSeq) {
				return;
			}
			renderLesson(video);
			requestAnimationFrame(function () {
				$fields.removeClass("lesson-swap");
			});
		}).fail(function (xhr) {
			$fields.removeClass("lesson-swap");
			ajaxFailed(xhr);
		});
	}

	function goToLesson(videoId, moduleId, animate, source) {
		if (!videoId) {
			return;
		}
		clearMyDataChrome();
		source = source || "training";
		var changed = String(videoId) !== String(localStorage.getItem("videoId"));
		localStorage.setItem("videoId", videoId);
		localStorage.setItem("moduleId", moduleId || "");
		localStorage.setItem("lessonSource", source);
		if (source === "nav") {
			localStorage.setItem("navVideoId", videoId);
			localStorage.setItem("navModuleId", moduleId || "");
		} else {
			localStorage.setItem("trainingVideoId", videoId);
			localStorage.setItem("trainingModuleId", moduleId || "");
			localStorage.setItem(lastVideoKey(), videoId);
			localStorage.setItem(lastModuleKey(), moduleId || "");
		}
		localStorage.setItem("isTraining", "true");
		if (changed && typeof window.advanceBackground === "function") {
			window.advanceBackground();
		}
		loadLesson(animate);
	}

	function updateChrome() {
		var en = localStorage.getItem("language") === "en_US";
		$(".modules-title").text(en ? "Modules" : "Módulos");
		fillSwapLabels();
		$(".idioma-title").text(en ? "Language" : "Idioma");
		$(".idioma-hint").text(en ? "Choose the showcase language" : "Escolha o idioma da vitrine");
		$("#englishVersion").toggleClass("is-current", en);
		$("#portugueseVersion").toggleClass("is-current", !en);
		renderAccount();
	}

	function flipLanguagePanel(open) {
		$("#lessonFlip").toggleClass("is-flipped", open);
	}

	function switchLanguage(locale) {
		var familyId = localStorage.getItem("trainingFamilyId");
		localStorage.setItem("language", locale);
		loadI18n().done(function () {
			updateChrome();
			loadGuruPages();
			loadTrainings().done(function (trainings) {
				fillTrainingPicker(trainings);
				var training = trainingByFamily(familyId) || trainings[0];
				if (training) {
					openTraining(training, true);
				}
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}

	$(document).on("click", ".guruPageClick", function (e) {
		e.preventDefault();
		var src = $(this).attr("data-guru-src");
		var page = null;
		for (var i = 0; i < guruPages.length; i++) {
			if (String(guruPages[i].src) === String(src)) {
				page = guruPages[i];
				break;
			}
		}
		if (page) {
			openGuruPage(page, true);
		}
	});

	$(document).on("click", ".trainingGifClick", function (e) {
		e.preventDefault();
		goToLesson($(this).attr("data-training-video"), $(this).attr("data-training-module"), true, "training");
	});

	$(document).on("click", "#nextVideo", function (e) {
		e.preventDefault();
		var next = trainingGifAt(1);
		if (next) {
			goToLesson(next.videoId, next.moduleId, true, "training");
		}
	});

	$(document).on("click", "#previousVideo", function (e) {
		e.preventDefault();
		var previous = trainingGifAt(-1);
		if (previous) {
			goToLesson(previous.videoId, previous.moduleId, true, "training");
		}
	});

	$(document).on("click", ".idioma-toggle", function (e) {
		e.preventDefault();
		flipLanguagePanel(!$("#lessonFlip").hasClass("is-flipped"));
	});

	$("#englishVersion").click(function () {
		flipLanguagePanel(false);
		switchLanguage("en_US");
	});

	$("#portugueseVersion").click(function () {
		flipLanguagePanel(false);
		switchLanguage("pt_BR");
	});

	function fsElement() {
		return document.fullscreenElement || document.webkitFullscreenElement || null;
	}

	function requestFs(el) {
		if (!el) {
			return;
		}
		if (el.requestFullscreen) {
			el.requestFullscreen();
		} else if (el.webkitRequestFullscreen) {
			el.webkitRequestFullscreen();
		}
	}

	function exitFs() {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}

	var CINEMA_ICON_OFF = '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z"/></svg>';
	var CINEMA_ICON_ON = '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z"/></svg>';
	var FS_ICON_OFF = '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z"/></svg>';
	var FS_ICON_ON = '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" d="m 14,14 -4,0 0,2 6,0 0,-6 -2,0 0,4 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="m 22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="m 20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 0,0 z"/><path fill="#fff" fill-rule="evenodd" d="m 10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 0,0 z"/></svg>';

	function syncFullscreenBtn() {
		var on = !!fsElement();
		$("#toggleFullscreen").attr("aria-pressed", on ? "true" : "false").html(on ? FS_ICON_ON : FS_ICON_OFF);
	}

	function lockCenterSquare() {
		var $col = $(".center-col");
		var $box = $("#box");
		var $frame = $(".player-frame");
		$col.css({ width: $col.outerWidth() + "px" });
		$box.css({ width: $box.outerWidth() + "px", height: $box.outerHeight() + "px" });
		$frame.css({ width: $frame.outerWidth() + "px", height: $frame.outerHeight() + "px", flex: "0 0 auto" });
	}

	function unlockCenterSquare() {
		$(".center-col, #box, .player-frame").css({ width: "", height: "", flex: "" });
	}

	$(document).on("click", "#toggleFullscreen", function (e) {
		e.preventDefault();
		e.stopPropagation();
		var frame = document.querySelector(".player-frame");
		if (fsElement()) {
			exitFs();
		} else {
			requestFs(frame);
		}
	});

	$(document).on("fullscreenchange webkitfullscreenchange", syncFullscreenBtn);

	$(document).on("click", "#toggleCinema", function (e) {
		e.preventDefault();
		e.stopPropagation();
		var $body = $("body");
		var $btn = $(this);
		var $panes = $(".sidebar, .modules");
		var on = $body.hasClass("is-cinema-mode");
		if (on) {
			$body.removeClass("is-cinema-mode");
			$btn.attr("aria-pressed", "false").html(CINEMA_ICON_OFF);
			$panes.stop(true, true).fadeIn(400, function () {
				unlockCenterSquare();
			});
		} else {
			lockCenterSquare();
			$body.addClass("is-cinema-mode");
			$btn.attr("aria-pressed", "true").html(CINEMA_ICON_ON);
			$panes.stop(true, true).fadeOut(400);
		}
	});


	$(document).on("click", "#trainingPickerBtn", function (e) {
		e.stopPropagation();
		var $list = $("#trainingPickerList");
		var open = !$list.attr("hidden");
		if (open) {
			closeTrainingPicker();
		} else {
			$list.removeAttr("hidden");
			$("#trainingPickerBtn").attr("aria-expanded", "true");
		}
	});

	$(document).on("click", "#trainingPickerList button", function (e) {
		e.stopPropagation();
		var training = trainingById($(this).data("training"));
		closeTrainingPicker();
		if (training) {
			openTraining(training, true);
		}
	});

	$(document).on("click", "#swapTrainingBtn", function (e) {
		e.preventDefault();
		closeTrainingPicker();
		flipModules(true);
	});

	$(document).on("click", "#swapTrainingBack", function (e) {
		e.preventDefault();
		flipModules(false);
	});

	$(document).on("click", ".swapNavClick", function (e) {
		e.preventDefault();
		var id = this.id;
		if (id === "swapPurchases") {
			openMyPurchasesScreen(true);
			return;
		}
		if (id === "swapListTrainings") {
			openListTrainingsScreen(true);
			return;
		}
	});

	$(document).on("click", function () {
		closeTrainingPicker();
	});


	var stripeCheckout = null;

	function checkoutReturnUrl() {
		var origin = window.location.origin || "";
		if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) || /eusouprogramadorjunior\.com|digitusforum\.com/i.test(origin)) {
			return window.location.href.split("#")[0];
		}
		return "";
	}

	function loadStripeJs() {
		if (window.Stripe) {
			return $.Deferred().resolve().promise();
		}
		var d = $.Deferred();
		var s = document.createElement("script");
		s.src = "https://js.stripe.com/v3/";
		s.async = true;
		s.onload = function () { d.resolve(); };
		s.onerror = function () { d.reject(); };
		document.head.appendChild(s);
		return d.promise();
	}

	function closeStripeOverlay() {
		if (stripeCheckout && stripeCheckout.destroy) {
			try { stripeCheckout.destroy(); } catch (err) {}
		}
		stripeCheckout = null;
		$("#stripeOverlay").remove();
	}

	function xhrMessage(xhr) {
		try {
			return JSON.parse(xhr.responseText).message || "";
		} catch (err) {
			return "";
		}
	}

	function showStripeFail(training, xhr) {
		if (xhr && xhr.status === 409) {
			billingMeCache = null;
			closeStripeOverlay();
			openTraining(training, true);
			return;
		}
		if (xhr && xhr.status === 503) {
			showPaidLock(training, "503");
			var en = localStorage.getItem("language") === "en_US";
			$("#paidLockMsg").text(xhrMessage(xhr) || (en ? "Stripe test is not on yet." : "Stripe test ainda não está ligado."));
			return;
		}
		ajaxFailed(xhr);
	}

	function confirmThenUnlock(sessionId, training) {
		firewall("/billing/v1/checkout/confirm", { sessionId: sessionId }).done(function () {
			billingMeCache = null;
			loadBillingMe().then(function (me) {
				closeStripeOverlay();
				if (ownsTraining(training, me)) {
					openTraining(training, true);
				}
			}, function (xhr) {
				showStripeFail(training, xhr);
			});
		}).fail(function (xhr) {
			showStripeFail(training, xhr);
		});
	}

	function openStripeOverlay(clientSecret, publishableKey, sessionId, training) {
		closeStripeOverlay();
		var html = "<div class='stripe-overlay glass' id='stripeOverlay'>";
		html += "<button type='button' class='stripe-overlay-close' id='stripeOverlayClose' aria-label='Fechar'>×</button>";
		html += "<p class='paid-lock-trust'>" + escapeHtml(trustLine()) + "</p>";
		html += "<div id='stripeCheckoutMount'></div>";
		html += "<p class='paid-lock-msg' id='stripeOverlayMsg'></p>";
		html += "</div>";
		$(".center-col").append(html);
		return loadStripeJs().then(function () {
			var d = $.Deferred();
			window.Stripe(publishableKey).initEmbeddedCheckout({
				clientSecret: clientSecret,
				onComplete: function () {
					confirmThenUnlock(sessionId, training);
				}
			}).then(function (checkout) {
				stripeCheckout = checkout;
				checkout.mount("#stripeCheckoutMount");
				d.resolve();
			}).catch(function () {
				d.reject();
			});
			return d.promise();
		});
	}

	function startEmbeddedCheckout(training, kind) {
		if (!training) {
			return;
		}
		if (!tokenUuid()) {
			$("#accountEmail").trigger("focus");
			return;
		}
		var path = kind === "sub" ? "/billing/v1/checkout/subscription" : "/billing/v1/checkout/training";
		var body = kind === "sub" ? {} : { trainingId: training.trainingId };
		var ret = checkoutReturnUrl();
		if (ret) {
			body.returnUrl = ret;
		}
		firewall("/billing/v1/publishable-key", {}).done(function (pk) {
			var key = pk && pk.publishableKey;
			if (!key || key.indexOf("pk_test_") !== 0) {
				showPaidLock(training, "503");
				return;
			}
			firewall(path, body).done(function (res) {
				var secret = res && res.clientSecret;
				if (!secret || String(secret).indexOf("sk_") === 0) {
					showPaidLock(training, "503");
					return;
				}
				var sessionId = (res && res.sessionId) || "";
				if (!sessionId && String(secret).indexOf("_secret_") > 0) {
					sessionId = String(secret).split("_secret_")[0];
				}
				openStripeOverlay(secret, key, sessionId, training).fail(function () {
					var en = localStorage.getItem("language") === "en_US";
					$("#paidLockMsg").text(en ? "Could not load Stripe Checkout." : "Não foi possível abrir o checkout Stripe.");
				});
			}).fail(function (xhr) {
				showStripeFail(training, xhr);
			});
		}).fail(function (xhr) {
			showStripeFail(training, xhr);
		});
	}

	$(document).on("click", "#paidBuyBtn", function (e) {
		e.preventDefault();
		var training = trainingById($(this).attr("data-training")) || trainingById(localStorage.getItem("internationalization.training_id"));
		startEmbeddedCheckout(training, "buy");
	});

	$(document).on("click", "#paidSubBtn", function (e) {
		e.preventDefault();
		var training = trainingById($(this).attr("data-training")) || trainingById(localStorage.getItem("internationalization.training_id"));
		startEmbeddedCheckout(training, "sub");
	});

	$(document).on("click", "#stripeOverlayClose", function (e) {
		e.preventDefault();
		closeStripeOverlay();
	});

	var accountSendBusy = false;

	function submitAccountEmail() {
		if (accountSendBusy) {
			return;
		}
		var email = String($("#accountEmail").val() || "").trim();
		if (!email) {
			alert(localStorage.getItem("language") === "en_US" ? "Email is required" : "Informe o email");
			return;
		}
		accountSendBusy = true;
		firewall("/emailVerification/v1/sendValidationEmail", { email: email }).done(function (res) {
			accountSendBusy = false;
			accountEmail = email;
			accountCodePrefill = res && res.readableNumber != null ? String(res.readableNumber) : "";
			accountStep = "code";
			flipAccountCard(true);
		}).fail(function (xhr) {
			accountSendBusy = false;
			ajaxFailed(xhr);
		});
	}

	function submitAccountCode() {
		var $btn = $("#accountConfirm");
		if ($btn.data("busy")) {
			return;
		}
		var raw = String($("#accountCode").val() || "").trim();
		var code = parseInt(raw, 10);
		if (!raw || isNaN(code)) {
			showCodeMsg(accountCopy().emptyCode);
			return;
		}
		$btn.data("busy", true).prop("disabled", true);
		firewall("/emailVerification/v1/validateEmail", {
			email: accountEmail,
			readableNumber: code
		}).done(function (tokenVO) {
			storeToken(tokenVO && tokenVO.token);
			if (tokenVO && tokenVO.email) {
				accountEmail = tokenVO.email;
			}
			localStorage.setItem("email", accountEmail);
			if (tokenVO && tokenVO.userId) {
				localStorage.setItem("userId", String(tokenVO.userId));
			}
			if (tokenVO && tokenVO.userName) {
				localStorage.setItem("userName", String(tokenVO.userName));
			}
			accountStep = "in";
			accountCodePrefill = "";
			clearCodeMsg();
			rollInnerToSigned();
			billingMeCache = null;
			loadBackgroundPrefs();
			var current = trainingById(localStorage.getItem("internationalization.training_id"));
			if (current) {
				openTraining(current, true);
			}
		}).fail(function (xhr) {
			$btn.data("busy", false).prop("disabled", false);
			if (xhr && xhr.status >= 400 && xhr.status < 500) {
				showCodeMsg(accountCopy().wrongCode);
				return;
			}
			ajaxFailed(xhr);
		});
	}

	$(document).on("keydown", "#accountEmail", function (e) {
		if (!isEnterKey(e)) {
			return;
		}
		e.preventDefault();
		submitAccountEmail();
	});

	$(document).on("keydown", "#accountCode", function (e) {
		if (!isEnterKey(e)) {
			return;
		}
		e.preventDefault();
		submitAccountCode();
	});

	$(document).on("submit", "#accountEmailForm", function (e) {
		e.preventDefault();
		submitAccountEmail();
	});

	$(document).on("submit", "#accountCodeForm", function (e) {
		e.preventDefault();
		submitAccountCode();
	});

	$(document).on("click", "#accountSend", function (e) {
		e.preventDefault();
		submitAccountEmail();
	});

	$(document).on("click", "#accountConfirm", function (e) {
		e.preventDefault();
		submitAccountCode();
	});

	$(document).on("input", "#accountCode", function () {
		clearCodeMsg();
	});

	$(document).on("click", "#accountBack", function (e) {
		e.preventDefault();
		accountStep = "email";
		accountCodePrefill = "";
		billingMeCache = null;
		clearCodeMsg();
		flipAccountCard(false);
		var current = trainingById(localStorage.getItem("internationalization.training_id"));
		if (current && current.paid) {
			showPaidLock(current, "login");
		}
	});

	$(document).on("click", "#accountSettings", function (e) {
		e.preventDefault();
		accountStep = "settings";
		showSettingsHome();
		flipSidebar(true);
	});

	$(document).on("click", "#accountSettingsBack", function (e) {
		e.preventDefault();
		accountStep = "in";
		flipSidebar(false);
	});

	$(document).on("click", ".settingsNavClick", function (e) {
		e.preventDefault();
		var id = this.id;
		if (id === "settingsMyData") {
			openMyDataScreen(true);
			return;
		}
		if (id === "settingsMyPurchases") {
			openMyPurchasesScreen(true);
			return;
		}
		if (id === "settingsBackgrounds") {
			openBackgroundsScreen(true);
			return;
		}
		if (id === "settingsIdioma") {
			flipLanguagePanel(true);
			return;
		}
	});

	$(document).on("click", ".my-purchases-item", function (e) {
		e.preventDefault();
		var tid = $(this).attr("data-training-id");
		if (!tid) {
			return;
		}
		var training = trainingById(tid) || { trainingId: tid, name: String(tid) };
		openTraining(training, true);
	});

	$(document).on("click", ".list-trainings-item", function (e) {
		e.preventDefault();
		var tid = $(this).attr("data-training-id");
		if (!tid) {
			return;
		}
		var training = trainingById(tid) || { trainingId: tid, name: String(tid) };
		openTraining(training, true);
	});

	$(document).on("click", "#myDataSave", function (e) {
		e.preventDefault();
		var userId = localStorage.getItem("userId");
		if (!userId) {
			ajaxFailed({ status: 401 });
			return;
		}
		var name = String($("#myDataName").val() || "").trim();
		var ageRaw = String($("#myDataAge").val() || "").trim();
		var body = { name: name };
		if (ageRaw !== "") {
			var ageNum = parseInt(ageRaw, 10);
			if (!isNaN(ageNum)) {
				body.age = ageNum;
			}
		}
		firewall("/user/v1/" + encodeURIComponent(userId) + "/update", body).done(function () {
			localStorage.setItem("userName", name);
			if (ageRaw === "") {
				localStorage.removeItem("userAge");
			} else {
				localStorage.setItem("userAge", String(body.age));
			}
			showMyDataMsg(accountCopy().savedOk);
		}).fail(ajaxFailed);
	});


	$(document).on("click", "#saveBackgroundBtn", function (e) {
		e.preventDefault();
		if (!tokenUuid()) {
			return;
		}
		var auto = localStorage.getItem("backgroundAuto") !== "false";
		if (!auto) {
			firewall("/background/v1/setAuto", {}).done(function (prefs) {
				syncBackgroundLocalPrefs(prefs || { backgroundAuto: true });
			}).fail(ajaxFailed);
			return;
		}
		var visible = typeof window.getVisibleWallpaperDataUrl === "function"
			? window.getVisibleWallpaperDataUrl()
			: "";
		if (!visible || (typeof window.isSafeWallpaper === "function" && !window.isSafeWallpaper(visible))) {
			alert(localStorage.getItem("language") === "en_US"
				? "No background to save."
				: "Nenhuma cor de fundo para salvar.");
			return;
		}
		sampleDominantColor(visible, function (r, g, b) {
			var name = buildBackgroundName(r, g, b);
			var dominant = "rgb(" + r + "," + g + "," + b + ")";
			firewall("/background/v1/save", {
				name: name,
				wallpaperData: visible,
				dominantColor: dominant
			}).done(function (saved) {
				var bgId = saved && (saved.id || saved.backgroundId);
				if (!bgId) {
					localStorage.setItem("backgroundAuto", "false");
					localStorage.setItem("backgroundPinnedUrl", visible);
					syncSaveBackgroundBtn();
					return;
				}
				firewall("/background/v1/select", { backgroundId: bgId }).done(function (res) {
					syncBackgroundLocalPrefs(res || {
						backgroundAuto: false,
						pinnedBackgroundId: bgId,
						wallpaperData: visible
					});
				}).fail(ajaxFailed);
			}).fail(ajaxFailed);
		});
	});

	$(document).on("click", ".my-backgrounds-item", function (e) {
		e.preventDefault();
		var backgroundId = $(this).attr("data-background-id");
		if (!backgroundId) {
			return;
		}
		firewall("/background/v1/select", { backgroundId: backgroundId }).done(function (res) {
			syncBackgroundLocalPrefs(res || { backgroundAuto: false, pinnedBackgroundId: backgroundId });
		}).fail(ajaxFailed);
	});

	$(document).on("click", "#accountLogout", function (e) {
		e.preventDefault();
		localStorage.removeItem("token");
		localStorage.removeItem("email");
		localStorage.removeItem("userId");
		localStorage.removeItem("userName");
		localStorage.removeItem("userAge");
		localStorage.removeItem("backgroundPinnedId");
		localStorage.removeItem("backgroundPinnedUrl");
		localStorage.setItem("backgroundAuto", "true");
		accountStep = "email";
		accountEmail = "";
		accountCodePrefill = "";
		billingMeCache = null;
		rollOuterToEmail();
	});

	renderAccount();
	if (tokenUuid()) {
		loadBackgroundPrefs();
	}

	loadI18n().done(function () {
		updateChrome();
		loadGuruPages().done(function (pages) {
			loadTrainings().done(function (trainings) {
				fillTrainingPicker(trainings);
				var currentId = localStorage.getItem("internationalization.training_id");
				var training = trainingById(currentId) || trainingByFamily(localStorage.getItem("trainingFamilyId")) || trainings[0];
				if (training) {
					applyTrainingMeta(training);
					fillTrainingPicker(trainings, training.trainingId);
				}
				ensureTrainingAccess(training).done(function (owned) {
					if (!owned) {
						return;
					}
					loadModules().done(function (modules) {
						var lastVideo = localStorage.getItem(lastVideoKey());
						if (lastVideo) {
							goToLesson(lastVideo, localStorage.getItem(lastModuleKey()) || "", false, "training");
							return;
						}
						if (pages && pages.length) {
							openGuruPage(pages[0], false);
							return;
						}
						var first = firstLesson(modules);
						if (first) {
							goToLesson(first.videoId, first.moduleId, false, "training");
						}
					}).fail(ajaxFailed);
				});
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}).fail(ajaxFailed);
});
