//by @nodws
/*
Using trianglify.js and d3.js library
Also not possible without Tim Berners Lee creator of the www, Brendan Eich creator of javascript, Michael S. Dell founder of Dell Computer who manufactured my PC, my Mom and Dad who manufactured me and The BigBang creator of the universe.
Hope these credits are enough to satisfy snotty commentators
*/
// Apply the wallpaper already stored, then generate the next one for the following screen.

function generateWallpaper() {
	var rn = Math.floor((Math.random() * 150) + 60);
	var t = new Trianglify({
		x_gradient: Trianglify.randomColor(),
		noiseIntensity: 0,
		cellsize: rn
	});
	return t.generate(window.innerWidth, window.innerWidth + 200).dataUrl;
}

function isSafeWallpaper(value) {
	if (!value || value === "null") {
		return false;
	}
	var s = String(value);
	return /^data:image\//i.test(s) || /^url\(\s*["']?data:image\//i.test(s);
}

function asBgImage(dataUrl) {
	if (!isSafeWallpaper(dataUrl)) {
		return "";
	}
	var value = String(dataUrl);
	if (/^url\(/i.test(value)) {
		return value;
	}
	return "url(\"" + value.replace(/"/g, "") + "\")";
}

function unwrapBgDataUrl(cssUrl) {
	if (!cssUrl || cssUrl === "null") {
		return "";
	}
	var m = String(cssUrl).match(/url\(\s*(['"]?)(.+?)\1\s*\)/i);
	return m ? m[2] : String(cssUrl);
}

function ensureWallpaperLayers() {
	if (document.getElementById("wallpaperBack")) {
		return;
	}
	var back = document.createElement("div");
	back.id = "wallpaperBack";
	back.className = "wallpaper-layer";
	var front = document.createElement("div");
	front.id = "wallpaperFront";
	front.className = "wallpaper-layer";
	document.body.insertBefore(back, document.body.firstChild);
	document.body.insertBefore(front, back.nextSibling);
}

var fadeTimer = 0;

function applyWallpaper(dataUrl, fade) {
	if (!isSafeWallpaper(dataUrl)) {
		return;
	}
	ensureWallpaperLayers();
	var img = asBgImage(dataUrl);
	var back = document.getElementById("wallpaperBack");
	var front = document.getElementById("wallpaperFront");
	document.body.style.backgroundImage = img;
	if (fadeTimer) {
		window.clearTimeout(fadeTimer);
		fadeTimer = 0;
	}
	if (!fade || !back.style.backgroundImage) {
		back.style.backgroundImage = img;
		front.classList.remove("is-visible");
		front.style.backgroundImage = "";
		return;
	}
	if (front.classList.contains("is-visible") && front.style.backgroundImage) {
		back.style.backgroundImage = front.style.backgroundImage;
		front.style.transition = "none";
		front.classList.remove("is-visible");
		front.offsetWidth;
		front.style.transition = "";
	}
	front.style.backgroundImage = img;
	front.offsetWidth;
	front.classList.add("is-visible");
	fadeTimer = window.setTimeout(function () {
		back.style.backgroundImage = img;
		front.classList.remove("is-visible");
		front.style.backgroundImage = "";
		fadeTimer = 0;
	}, 1000);
}

function getVisibleWallpaperDataUrl() {
	var front = document.getElementById("wallpaperFront");
	var back = document.getElementById("wallpaperBack");
	var src = "";
	if (front && front.classList.contains("is-visible") && front.style.backgroundImage) {
		src = unwrapBgDataUrl(front.style.backgroundImage);
	}
	if (!isSafeWallpaper(src) && back && back.style.backgroundImage) {
		src = unwrapBgDataUrl(back.style.backgroundImage);
	}
	if (!isSafeWallpaper(src) && document.body && document.body.style.backgroundImage) {
		src = unwrapBgDataUrl(document.body.style.backgroundImage);
	}
	return isSafeWallpaper(src) ? src : "";
}

function backgroundAutoEnabled() {
	return localStorage.getItem("backgroundAuto") !== "false";
}

var wallpaperHasShown = false;

window.applyWallpaper = applyWallpaper;
window.getVisibleWallpaperDataUrl = getVisibleWallpaperDataUrl;
window.isSafeWallpaper = isSafeWallpaper;
window.backgroundAutoEnabled = backgroundAutoEnabled;

window.advanceBackground = function () {
	if (!backgroundAutoEnabled()) {
		var pinned = localStorage.getItem("backgroundPinnedUrl");
		if (!isSafeWallpaper(pinned)) {
			pinned = getVisibleWallpaperDataUrl();
		}
		if (isSafeWallpaper(pinned)) {
			applyWallpaper(pinned, wallpaperHasShown);
			wallpaperHasShown = true;
			if (typeof window.syncMenuFromBackground === "function") {
				window.syncMenuFromBackground();
			}
		}
		return;
	}
	var ready = localStorage.getItem("backgroundUrl");
	if (!isSafeWallpaper(ready)) {
		ready = generateWallpaper();
	}
	applyWallpaper(ready, wallpaperHasShown);
	wallpaperHasShown = true;
	localStorage.setItem("backgroundUrl", generateWallpaper());
	if (typeof window.syncMenuFromBackground === "function") {
		window.syncMenuFromBackground();
	}
};

window.advanceBackground();
