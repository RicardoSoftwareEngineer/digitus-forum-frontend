$(document).ready(function () {
	var FIREWALL = "http://localhost:8080/firewall";
	var MEDIA_BASE = new URL("../", window.location.href).href;
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

	function firewall(path, body) {
		return $.ajax({
			url: FIREWALL + path,
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(body || {}),
			dataType: "json",
			headers: { Authorization: "" }
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

	function navItem(selected, video, moduleId, label, icon) {
		var cls = selected ? "selectedNav" : "";
		return "<li class='" + cls + "'><a href='#' data-nav-video='" + escapeHtml(video) + "' data-nav-module='" + escapeHtml(moduleId) + "' class='navClick'><span class='nav-ico'>" + icon + "</span>" + escapeHtml(label) + "</a></li>";
	}

	function leftNavItems() {
		var general = i18("general_module");
		var continueVideo = i18("continue_training_video");
		var continueModule = i18("continue_training_module");
		if (!continueVideo) {
			continueVideo = i18("start_training_video");
			continueModule = i18("start_training_module");
		}
		return [
			{ video: i18("welcome_video"), module: general, label: i18("welcome_title"), icon: "●" },
			{ video: continueVideo, module: continueModule, label: i18("continue_training"), icon: "▷" },
			{ video: i18("frontend_video"), module: i18("frontend_module") || general, label: "Frontend", icon: "▣" },
			{ video: i18("backend_video"), module: i18("backend_module") || general, label: "Backend", icon: "⬡" },
			{ video: i18("database_indexes_video"), module: i18("database_indexes_module") || general, label: i18("database_indexes"), icon: "▤" },
			{ video: i18("internationalization_video"), module: i18("internationalization_module") || general, label: i18("internationalization"), icon: "🌐" },
			{ video: i18("scalability_video"), module: i18("scalability_module") || general, label: i18("scalability"), icon: "↗" },
			{ video: i18("manutenability_video"), module: i18("manutenability_module") || general, label: i18("manutenability"), icon: "🔧" },
			{ video: i18("documentation_video") || i18("manutenability_video"), module: i18("documentation_module") || general, label: i18("documentation"), icon: "📄" },
			{ video: i18("tests_video") || i18("manutenability_video"), module: i18("tests_module") || general, label: i18("tests"), icon: "✓" },
			{ video: i18("requirement_video"), module: i18("requirement_module") || general, label: i18("requirement"), icon: "★" }
		];
	}

	function renderSidebar() {
		var navVideoId = localStorage.getItem("navVideoId");
		var items = leftNavItems();
		var title = localStorage.getItem("trainingName") || i18("free_training");
		var desc = localStorage.getItem("trainingSinopse") || i18("free_training_description");
		var html = "<div class='sidebar-head brand-head'>";
		html += "<div class='sidebar-icon'>🎓</div>";
		html += "<div><h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(desc) + "</p></div>";
		html += "</div><ul class='topic-nav'>";
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			html += navItem(String(navVideoId) === String(item.video), item.video, item.module, item.label, item.icon);
		}
		html += "</ul>";
		html += "<div class='sidebar-profile'><div class='avatar'>LD</div><div><strong>Leonardo Da Vinci</strong><span>" + escapeHtml(i18("simplicity")) + "</span></div></div>";
		$("#leftAccordion").html(html);
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
		renderSidebar();
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
		return firewall("/training/v1/retrieveByLocale", {
			locale: localStorage.getItem("language")
		});
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

	function openTraining(training, goToFirst) {
		applyTrainingMeta(training);
		fillTrainingPicker(trainingsForLocale, training.trainingId);
		return loadModules().done(function (modules) {
			if (goToFirst) {
				var first = firstLesson(modules);
				if (first) {
					goToLesson(first.videoId, first.moduleId, true, "training");
				}
			}
		});
	}

	function markSelected(source) {
		if (source === "nav") {
			var navVideoId = localStorage.getItem("navVideoId");
			$(".topic-nav li").removeClass("selectedNav");
			$(".navClick").filter(function () {
				return String($(this).attr("data-nav-video")) === String(navVideoId);
			}).parent("li").addClass("selectedNav");
			return;
		}
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

	function gifSrc(video) {
		var path = video.gif || "";
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
		if (src) {
			var title = escapeHtml(video.name || "");
			if (window.GifPlayer) {
				window.GifPlayer.mount(document.getElementById("video"), src, title);
			} else {
				$("#video").html("<img alt=\"" + title + "\" src=\"" + src + "\" />");
			}
		} else {
			if (window.GifPlayer) {
				window.GifPlayer.mount(document.getElementById("video"), "");
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
	}

	function flipLanguagePanel(open) {
		$("#lessonFlip").toggleClass("is-flipped", open);
	}

	function switchLanguage(locale) {
		var familyId = localStorage.getItem("trainingFamilyId");
		localStorage.setItem("language", locale);
		loadI18n().done(function () {
			updateChrome();
			loadTrainings().done(function (trainings) {
				fillTrainingPicker(trainings);
				var training = trainingByFamily(familyId) || trainings[0];
				if (training) {
					openTraining(training, true);
				}
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}

	$(document).on("click", ".navClick", function (e) {
		e.preventDefault();
		goToLesson($(this).attr("data-nav-video"), $(this).attr("data-nav-module"), true, "nav");
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

	function syncFullscreenBtn() {
		var on = !!fsElement();
		$("#toggleFullscreen").attr("aria-pressed", on ? "true" : "false");
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
		var on = $body.hasClass("is-cinema-mode");
		if (on) {
			$body.removeClass("is-cinema-mode");
			unlockCenterSquare();
			$(this).attr("aria-pressed", "false");
		} else {
			lockCenterSquare();
			$body.addClass("is-cinema-mode");
			$(this).attr("aria-pressed", "true");
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

	loadI18n().done(function () {
		updateChrome();
		loadTrainings().done(function (trainings) {
			fillTrainingPicker(trainings);
			var currentId = localStorage.getItem("internationalization.training_id");
			var training = trainingById(currentId) || trainingByFamily(localStorage.getItem("trainingFamilyId")) || trainings[0];
			if (training) {
				applyTrainingMeta(training);
				fillTrainingPicker(trainings, training.trainingId);
			}
			loadModules().done(function (modules) {
				var videoId = localStorage.getItem("videoId");
				if (!videoId) {
					var first = firstLesson(modules);
					if (first) {
						goToLesson(first.videoId, first.moduleId, false, "training");
						return;
					}
				}
				loadLesson(false);
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}).fail(ajaxFailed);
});
