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
			wrongCode: en ? "Wrong code. Try again." : "Código errado. Tenta de novo.",
			emptyCode: en ? "Enter the code" : "Informe o código"
		};
	}

	function emailFrontHtml(c) {
		var html = "";
		html += "<label class='account-label' for='accountEmail'>" + escapeHtml(c.email) + "</label>";
		html += "<input id='accountEmail' class='account-input' type='email' autocomplete='email' value='" + escapeHtml(accountEmail) + "' />";
		html += "<button type='button' class='account-btn' id='accountSend'>" + escapeHtml(c.send) + "</button>";
		return html;
	}

	function signedFrontHtml(c, shown) {
		var html = "";
		html += "<p class='account-signed-email'>" + escapeHtml(shown) + "</p>";
		html += "<button type='button' class='account-btn' id='accountSettings'>" + escapeHtml(c.settings) + "</button>";
		return html;
	}

	function codeBackHtml(c) {
		var html = "";
		html += "<label class='account-label' for='accountCode'>" + escapeHtml(c.code) + "</label>";
		html += "<input id='accountCode' class='account-input' type='text' inputmode='numeric' maxlength='6' autocomplete='one-time-code' value='" + escapeHtml(accountCodePrefill) + "' />";
		html += "<p class='account-msg' id='accountCodeMsg'></p>";
		html += "<button type='button' class='account-btn' id='accountConfirm'>" + escapeHtml(c.confirm) + "</button>";
		html += "<button type='button' class='account-btn account-btn-ghost' id='accountBack'>" + escapeHtml(c.back) + "</button>";
		return html;
	}

	function settingsBackHtml(c) {
		return "<button type='button' class='account-btn' id='accountLogout'>" + escapeHtml(c.out) + "</button>";
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
		}
		var shown = accountEmail || localStorage.getItem("email") || "";
		var frontHtml = logged ? signedFrontHtml(c, shown) : emailFrontHtml(c);
		var innerFlipped = !logged && accountStep === "code";
		var outerFlipped = logged && accountStep === "settings";
		var html = "";
		html += "<div class='account-outer-scene'>";
		html += "<div class='account-outer-card" + (outerFlipped ? " is-flipped" : "") + "'>";
		html += "<div class='account-outer-face account-outer-front'>";
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
		html += "</div>";
		html += "<div class='account-outer-face account-outer-back'>";
		html += settingsBackHtml(c);
		html += "</div>";
		html += "</div>";
		html += "</div>";
		$("#accountBox").html(html);
	}

	function flipAccountCard(toCode) {
		var $card = $("#accountBox .account-flip-card");
		if (!$card.length) {
			renderAccount();
			return;
		}
		clearCodeMsg();
		if (toCode) {
			$("#accountCode").val(accountCodePrefill);
			$card.addClass("is-flipped");
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

	function rollOuterToEmail() {
		var c = accountCopy();
		var $outer = $("#accountBox .account-outer-card");
		var $inner = $("#accountBox .account-flip-card");
		if (!$outer.length) {
			renderAccount();
			return;
		}
		$("#accountBox .account-flip-front").html(emailFrontHtml(c));
		if ($inner.length) {
			$inner.removeClass("is-flipped");
		}
		clearCodeMsg();
		requestAnimationFrame(function () {
			$outer.removeClass("is-flipped");
		});
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
		var title = i18("guru_java") || "Java";
		var desc = i18("guru_java_sinopse") || "";
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

	function markGuruPage(src) {
		$(".topic-nav li").removeClass("selectedNav");
		$(".guruPageClick").filter(function () {
			return String($(this).attr("data-guru-src")) === String(src);
		}).parent("li").addClass("selectedNav");
	}

	function openGuruPage(page, animate) {
		if (!page) {
			return;
		}
		var src = pageSrc(page);
		if (!src) {
			return;
		}
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
			$("#trainingPickerName").text(selected.name || "");
			$("#trainingPickerSinopse").text(selected.sinopse || "");
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
		$(".idioma-toggle").text(en ? "Language" : "Idioma");
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

	$(document).on("click", "#accountSend", function (e) {
		e.preventDefault();
		var email = String($("#accountEmail").val() || "").trim();
		if (!email) {
			alert(localStorage.getItem("language") === "en_US" ? "Email is required" : "Informe o email");
			return;
		}
		firewall("/emailVerification/v1/sendValidationEmail", { email: email }).done(function (res) {
			accountEmail = email;
			accountCodePrefill = res && res.readableNumber != null ? String(res.readableNumber) : "";
			accountStep = "code";
			flipAccountCard(true);
		}).fail(ajaxFailed);
	});

	$(document).on("click", "#accountConfirm", function (e) {
		e.preventDefault();
		var raw = String($("#accountCode").val() || "").trim();
		var code = parseInt(raw, 10);
		if (!raw || isNaN(code)) {
			showCodeMsg(accountCopy().emptyCode);
			return;
		}
		firewall("/emailVerification/v1/validateEmail", {
			email: accountEmail,
			readableNumber: code
		}).done(function (tokenVO) {
			storeToken(tokenVO && tokenVO.token);
			if (tokenVO && tokenVO.email) {
				accountEmail = tokenVO.email;
			}
			localStorage.setItem("email", accountEmail);
			accountStep = "in";
			accountCodePrefill = "";
			clearCodeMsg();
			rollInnerToSigned();
			billingMeCache = null;
			var current = trainingById(localStorage.getItem("internationalization.training_id"));
			if (current) {
				openTraining(current, true);
			}
		}).fail(function (xhr) {
			if (xhr && xhr.status >= 400 && xhr.status < 500) {
				showCodeMsg(accountCopy().wrongCode);
				return;
			}
			ajaxFailed(xhr);
		});
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
		var $outer = $("#accountBox .account-outer-card");
		if ($outer.length) {
			$outer.addClass("is-flipped");
		} else {
			renderAccount();
		}
	});

	$(document).on("click", "#accountLogout", function (e) {
		e.preventDefault();
		localStorage.removeItem("token");
		localStorage.removeItem("email");
		accountStep = "email";
		accountEmail = "";
		accountCodePrefill = "";
		billingMeCache = null;
		rollOuterToEmail();
	});

	renderAccount();

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
