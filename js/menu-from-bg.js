(function () {
	function rgbToHsl(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);
		var h;
		var s;
		var l = (max + min) / 2;
		if (max === min) {
			h = 0;
			s = 0;
		} else {
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h /= 6;
		}
		return { h: h, s: s, l: l };
	}

	function hue2rgb(p, q, t) {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	}

	function hslToRgb(h, s, l) {
		var r;
		var g;
		var b;
		if (s === 0) {
			r = g = b = l;
		} else {
			var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			var p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}
		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255)
		};
	}

	function explode(r, g, b) {
		var hsl = rgbToHsl(r, g, b);
		hsl.s = Math.min(1, hsl.s * 1.55 + 0.18);
		if (hsl.l < 0.42) hsl.l = 0.5;
		else if (hsl.l > 0.62) hsl.l = 0.52;
		else hsl.l = Math.min(0.58, hsl.l + 0.06);
		return hslToRgb(hsl.h, hsl.s, hsl.l);
	}

	function unwrapBgUrl(cssUrl) {
		if (!cssUrl || cssUrl === "null") return "";
		var m = String(cssUrl).match(/url\((['"]?)(.+?)\1\)/);
		return m ? m[2] : cssUrl;
	}

	function applyAccent(r, g, b) {
		var popped = explode(r, g, b);
		var accent = "rgb(" + popped.r + "," + popped.g + "," + popped.b + ")";
		var soft = "rgba(" + popped.r + "," + popped.g + "," + popped.b + ",0.44)";
		var body = document.body;
		if (applyAccent.timer) {
			window.clearTimeout(applyAccent.timer);
			applyAccent.timer = 0;
		}
		if (!body.classList.contains("accent-ready")) {
			body.style.setProperty("--accent", accent);
			body.style.setProperty("--accent-new", accent);
			body.style.setProperty("--accent-soft", soft);
			body.style.setProperty("--accent-soft-new", soft);
			body.style.setProperty("--accent-cover", "0");
			body.classList.add("accent-ready");
			window.requestAnimationFrame(function () {
				body.classList.add("accent-fade");
			});
			return;
		}
		var prevAccent = (body.style.getPropertyValue("--accent-new") || accent).trim();
		var prevSoft = (body.style.getPropertyValue("--accent-soft-new") || soft).trim();
		body.classList.remove("accent-fade");
		body.style.setProperty("--accent", prevAccent);
		body.style.setProperty("--accent-soft", prevSoft);
		body.style.setProperty("--accent-cover", "0");
		body.offsetWidth;
		body.style.setProperty("--accent-new", accent);
		body.style.setProperty("--accent-soft-new", soft);
		body.classList.add("accent-fade");
		body.style.setProperty("--accent-cover", "1");
		applyAccent.timer = window.setTimeout(function () {
			body.classList.remove("accent-fade");
			body.style.setProperty("--accent", accent);
			body.style.setProperty("--accent-soft", soft);
			body.style.setProperty("--accent-cover", "0");
			body.offsetWidth;
			body.classList.add("accent-fade");
			applyAccent.timer = 0;
		}, 1000);
	}

	function sampleImage(src, done) {
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
				var hsl = rgbToHsl(p[0], p[1], p[2]);
				var score = hsl.s * (1 - Math.abs(hsl.l - 0.48) * 1.4);
				if (score > best.score) {
					best = { score: score, r: p[0], g: p[1], b: p[2] };
				}
			}
			var x;
			var y;
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
		img.src = src;
	}

	window.syncMenuFromBackground = function () {
		var src = unwrapBgUrl(document.body.style.backgroundImage);
		if (src) {
			sampleImage(src, applyAccent);
		}
	};

	window.syncMenuFromBackground();
})();
