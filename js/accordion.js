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

	var coursesForLocale = [];
	var courseGifOrder = [];

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
		var title = localStorage.getItem("courseName") || i18("free_training");
		var desc = localStorage.getItem("courseSinopse") || i18("free_training_description");
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
		courseGifOrder = [];
		var videoId = localStorage.getItem("courseVideoId");
		var moduleId = localStorage.getItem("courseModuleId");
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
				courseGifOrder.push({ videoId: v.videoId, moduleId: m.moduleId });
				html += "<li class='" + (String(v.videoId) === String(videoId) ? "selectedGif" : "") + "'>";
				html += "<a href='#' data-course-video='" + escapeHtml(v.videoId) + "' data-course-module='" + escapeHtml(m.moduleId) + "' class='courseGifClick'>" + escapeHtml(v.name) + "</a></li>";
			}
			html += "</ul></div>";
		}
		$acc.html(html);
		if (modules.length) {
			$acc.accordion({ heightStyle: "content", collapsible: true, active: active });
		}
	}

	function courseGifIndex(videoId) {
		for (var i = 0; i < courseGifOrder.length; i++) {
			if (String(courseGifOrder[i].videoId) === String(videoId)) {
				return i;
			}
		}
		return -1;
	}

	function courseGifAt(offsetFromCurrent) {
		var n = courseGifOrder.length;
		if (!n) {
			return null;
		}
		var idx = courseGifIndex(localStorage.getItem("videoId"));
		if (idx < 0) {
			idx = courseGifIndex(localStorage.getItem("courseVideoId"));
		}
		if (idx < 0) {
			idx = 0;
		}
		var next = (idx + offsetFromCurrent) % n;
		if (next < 0) {
			next += n;
		}
		return courseGifOrder[next];
	}

	function loadModules() {
		var courseId = localStorage.getItem("internationalization.training_id");
		renderSidebar();
		if (!courseId) {
			return $.Deferred().resolve([]).promise();
		}
		return firewall("/module/v1/retrieveByTrainingIdWithVideos", {
			trainingId: courseId,
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

	function closeCoursePicker() {
		$("#coursePickerList").attr("hidden", true);
		$("#coursePickerBtn").attr("aria-expanded", "false");
	}

	function fillCoursePicker(courses, selectedId) {
		coursesForLocale = courses || [];
		var selected = courseById(selectedId) || coursesForLocale[0];
		if (selected) {
			$("#coursePickerName").text(selected.name || "");
			$("#coursePickerSinopse").text(selected.sinopse || "");
		}
		var html = "";
		for (var i = 0; i < coursesForLocale.length; i++) {
			var c = coursesForLocale[i];
			var current = String(c.courseId) === String(selected && selected.courseId) ? " is-current" : "";
			html += "<li><button type='button' class='" + current.trim() + "' data-course='" + escapeHtml(c.courseId) + "'>";
			html += "<div class='sidebar-icon'>🎓</div><div><h2>" + escapeHtml(c.name || "") + "</h2><p>" + escapeHtml(c.sinopse || "") + "</p></div>";
			html += "</button></li>";
		}
		$("#coursePickerList").html(html);
		closeCoursePicker();
	}

	function loadCourses() {
		return firewall("/course/v1/retrieveByLocale", {
			locale: localStorage.getItem("language")
		});
	}

	function applyCourseMeta(course) {
		if (!course) {
			return;
		}
		localStorage.setItem("internationalization.training_id", course.courseId);
		localStorage.setItem("courseFamilyId", course.familyId || "");
		localStorage.setItem("courseName", course.name || "");
		localStorage.setItem("courseSinopse", course.sinopse || "");
		localStorage.setItem("isTraining", "true");
		localStorage.setItem("isCourse", "true");
	}

	function courseById(id) {
		for (var i = 0; i < coursesForLocale.length; i++) {
			if (String(coursesForLocale[i].courseId) === String(id)) {
				return coursesForLocale[i];
			}
		}
		return null;
	}

	function courseByFamily(familyId) {
		if (!familyId) {
			return null;
		}
		for (var i = 0; i < coursesForLocale.length; i++) {
			if (String(coursesForLocale[i].familyId) === String(familyId)) {
				return coursesForLocale[i];
			}
		}
		return null;
	}

	function openCourse(course, goToFirst) {
		applyCourseMeta(course);
		fillCoursePicker(coursesForLocale, course.courseId);
		return loadModules().done(function (modules) {
			if (goToFirst) {
				var first = firstLesson(modules);
				if (first) {
					goToLesson(first.videoId, first.moduleId, true, "course");
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
		var videoId = localStorage.getItem("courseVideoId");
		$("#accordion li").removeClass("selectedGif");
		$("#accordion a.courseGifClick").filter(function () {
			return String($(this).attr("data-course-video")) === String(videoId);
		}).parent("li").addClass("selectedGif");
		$("#accordion h3").removeClass("selectedModule");
		var $match = $("#accordion a.courseGifClick").filter(function () {
			return String($(this).attr("data-course-video")) === String(videoId);
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
		return new URL(String(path).replace(/^\//, ""), MEDIA_BASE).href + "?v=" + Date.now();
	}

	function renderLesson(video) {
		var nav = "";
		if (courseGifOrder.length) {
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
		markSelected(localStorage.getItem("lessonSource") || "course");
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
		source = source || "course";
		var changed = String(videoId) !== String(localStorage.getItem("videoId"));
		localStorage.setItem("videoId", videoId);
		localStorage.setItem("moduleId", moduleId || "");
		localStorage.setItem("lessonSource", source);
		if (source === "nav") {
			localStorage.setItem("navVideoId", videoId);
			localStorage.setItem("navModuleId", moduleId || "");
		} else {
			localStorage.setItem("courseVideoId", videoId);
			localStorage.setItem("courseModuleId", moduleId || "");
		}
		localStorage.setItem("isTraining", "true");
		localStorage.setItem("isCourse", "true");
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
		var familyId = localStorage.getItem("courseFamilyId");
		localStorage.setItem("language", locale);
		loadI18n().done(function () {
			updateChrome();
			loadCourses().done(function (courses) {
				fillCoursePicker(courses);
				var course = courseByFamily(familyId) || courses[0];
				if (course) {
					openCourse(course, true);
				}
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}

	$(document).on("click", ".navClick", function (e) {
		e.preventDefault();
		goToLesson($(this).attr("data-nav-video"), $(this).attr("data-nav-module"), true, "nav");
	});

	$(document).on("click", ".courseGifClick", function (e) {
		e.preventDefault();
		goToLesson($(this).attr("data-course-video"), $(this).attr("data-course-module"), true, "course");
	});

	$(document).on("click", "#nextVideo", function (e) {
		e.preventDefault();
		var next = courseGifAt(1);
		if (next) {
			goToLesson(next.videoId, next.moduleId, true, "course");
		}
	});

	$(document).on("click", "#previousVideo", function (e) {
		e.preventDefault();
		var previous = courseGifAt(-1);
		if (previous) {
			goToLesson(previous.videoId, previous.moduleId, true, "course");
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

	var paneMs = 450;
	var paneEase = $.easing.easeInOutQuad ? "easeInOutQuad" : "swing";

	function paneOpenWidth($pane) {
		return $pane.data("openWidth") || Math.max(240, Math.round($(window).width() * 0.22));
	}

	function collapsePane($pane, shellClass) {
		var w = $pane.outerWidth();
		$pane.data("openWidth", w);
		$pane.css({ minWidth: 0, overflow: "hidden" });
		$pane.stop(true, false).animate({
			width: 0,
			paddingLeft: 0,
			paddingRight: 0,
			opacity: 0
		}, paneMs, paneEase, function () {
			$pane.hide().addClass("collapsed");
			$(".lesson-shell").addClass(shellClass);
			$pane.css({ width: "", minWidth: "", paddingLeft: "", paddingRight: "", opacity: "", overflow: "" });
		});
	}

	function expandPane($pane, shellClass) {
		var w = paneOpenWidth($pane);
		$(".lesson-shell").removeClass(shellClass);
		$pane.removeClass("collapsed").css({
			display: "flex",
			width: 0,
			paddingLeft: 0,
			paddingRight: 0,
			opacity: 0,
			overflow: "hidden"
		});
		$pane.stop(true, false).animate({
			width: w,
			paddingLeft: 16,
			paddingRight: 16,
			opacity: 1
		}, paneMs, paneEase, function () {
			$pane.css({ width: "", paddingLeft: "", paddingRight: "", opacity: "", overflow: "" });
		});
	}

	$(document).on("click", "#toggleNav", function (e) {
		e.preventDefault();
		var collapsed = !$(".sidebar").hasClass("collapsed") && $(".sidebar").is(":visible") && $(".sidebar").width() > 8;
		if ($(".sidebar").is(":animated")) {
			return;
		}
		if (collapsed) {
			collapsePane($(".sidebar"), "nav-collapsed");
			$(this).text(">>").attr("aria-expanded", "false");
		} else {
			expandPane($(".sidebar"), "nav-collapsed");
			$(this).text("<<").attr("aria-expanded", "true");
		}
	});

	$(document).on("click", "#toggleModules", function (e) {
		e.preventDefault();
		if ($(".modules").is(":animated")) {
			return;
		}
		var collapsed = !$(".modules").hasClass("collapsed") && $(".modules").is(":visible") && $(".modules").width() > 8;
		if (collapsed) {
			collapsePane($(".modules"), "mod-collapsed");
			$(this).text("<<").attr("aria-expanded", "false");
		} else {
			expandPane($(".modules"), "mod-collapsed");
			$(this).text(">>").attr("aria-expanded", "true");
		}
	});

	$(document).on("click", "#coursePickerBtn", function (e) {
		e.stopPropagation();
		var $list = $("#coursePickerList");
		var open = !$list.attr("hidden");
		if (open) {
			closeCoursePicker();
		} else {
			$list.removeAttr("hidden");
			$("#coursePickerBtn").attr("aria-expanded", "true");
		}
	});

	$(document).on("click", "#coursePickerList button", function (e) {
		e.stopPropagation();
		var course = courseById($(this).data("course"));
		closeCoursePicker();
		if (course) {
			openCourse(course, true);
		}
	});

	$(document).on("click", function () {
		closeCoursePicker();
	});

	loadI18n().done(function () {
		updateChrome();
		loadCourses().done(function (courses) {
			fillCoursePicker(courses);
			var currentId = localStorage.getItem("internationalization.training_id");
			var course = courseById(currentId) || courseByFamily(localStorage.getItem("courseFamilyId")) || courses[0];
			if (course) {
				applyCourseMeta(course);
				fillCoursePicker(courses, course.courseId);
			}
			loadModules().done(function (modules) {
				var videoId = localStorage.getItem("videoId");
				if (!videoId) {
					var first = firstLesson(modules);
					if (first) {
						goToLesson(first.videoId, first.moduleId, false, "course");
						return;
					}
				}
				loadLesson(false);
			}).fail(ajaxFailed);
		}).fail(ajaxFailed);
	}).fail(ajaxFailed);
});
