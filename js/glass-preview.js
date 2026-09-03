/* TEST-GLASS-PREVIEW — removable. Delete this file + css/glass-preview.css + GLASS-PREVIEW-TEST tags in html/video.html. */
(function () {
	var KEY = "glassPreview";
	var ALL = ["glass-preview-off", "glass-preview-sheen", "glass-preview-rim", "glass-preview-sheen-rim"];
	var MODES = [
		{ id: "off", cls: "glass-preview-off", label: "Atual" },
		{ id: "sheen", cls: "glass-preview-sheen", label: "Sheen" },
		{ id: "rim", cls: "glass-preview-rim", label: "Rim" },
		{ id: "sheen-rim", cls: "glass-preview-sheen-rim", label: "Sheen+Rim" }
	];

	function modeById(id) {
		var i;
		for (i = 0; i < MODES.length; i++) {
			if (MODES[i].id === id) return MODES[i];
		}
		return MODES[0];
	}

	function apply(id) {
		var body = document.body;
		var mode;
		var bar;
		var btns;
		var i;
		var on;
		if (!body || !body.classList.contains("layout-cinema")) return;
		mode = modeById(id);
		for (i = 0; i < ALL.length; i++) body.classList.remove(ALL[i]);
		body.classList.add(mode.cls);
		try { localStorage.setItem(KEY, mode.id); } catch (e) {}
		bar = document.getElementById("glassPreviewBar");
		if (!bar) return;
		btns = bar.querySelectorAll("button[data-glass]");
		for (i = 0; i < btns.length; i++) {
			on = btns[i].getAttribute("data-glass") === mode.id;
			if (on) btns[i].classList.add("is-active");
			else btns[i].classList.remove("is-active");
			btns[i].setAttribute("aria-pressed", on ? "true" : "false");
		}
	}

	function mount() {
		var body = document.body;
		var bar;
		var label;
		var saved;
		var i;
		if (!body || !body.classList.contains("layout-cinema")) return;
		if (document.getElementById("glassPreviewBar")) return;
		bar = document.createElement("div");
		bar.id = "glassPreviewBar";
		bar.setAttribute("role", "group");
		bar.setAttribute("aria-label", "Vidro");
		label = document.createElement("span");
		label.className = "glass-preview-label";
		label.textContent = "Vidro:";
		bar.appendChild(label);
		for (i = 0; i < MODES.length; i++) {
			(function (m) {
				var b = document.createElement("button");
				b.type = "button";
				b.setAttribute("data-glass", m.id);
				b.textContent = m.label;
				b.addEventListener("click", function () { apply(m.id); });
				bar.appendChild(b);
			})(MODES[i]);
		}
		body.appendChild(bar);
		saved = "off";
		try { saved = localStorage.getItem(KEY) || "off"; } catch (e) {}
		apply(saved);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", mount);
	} else {
		mount();
	}
})();
