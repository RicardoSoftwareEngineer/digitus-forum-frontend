(function (window) {
	var active = null;

	function formatTime(ms) {
		var total = Math.max(0, Math.floor((ms || 0) / 1000));
		if (ms > 0 && total === 0) {
			total = 1;
		}
		var m = Math.floor(total / 60);
		var s = total % 60;
		return m + ":" + String(s).padStart(2, "0");
	}

	function fileName(src) {
		return decodeURIComponent(String(src || "").split("?")[0].split("/").pop() || "");
	}

	function mappedDuration(src) {
		var map = window.GIF_DURATIONS || {};
		return map[fileName(src)] || 0;
	}

	function scanGifMeta(u8) {
		var frames = [];
		if (!u8 || u8.length < 13 || u8[0] !== 0x47) {
			return frames;
		}
		var i;
		for (i = 0; i < u8.length - 7; i++) {
			if (u8[i] === 0x21 && u8[i + 1] === 0xf9 && u8[i + 2] === 0x04) {
				var packed = u8[i + 3];
				var delay = u8[i + 4] | (u8[i + 5] << 8);
				frames.push({
					delay: (delay === 0 ? 10 : delay) * 10,
					disposal: (packed >> 2) & 7
				});
			}
		}
		return frames;
	}

	function scanGifDelays(u8) {
		return scanGifMeta(u8).map(function (f) {
			return f.delay;
		});
	}

	function scanGifDurationMs(u8) {
		var delays = scanGifDelays(u8);
		var duration = 0;
		var i;
		for (i = 0; i < delays.length; i++) {
			duration += delays[i];
		}
		return duration;
	}

	function decodeGifFrames(buf) {
		return new Promise(function (resolve, reject) {
			if (typeof GifReader !== "function") {
				reject(new Error("no gif reader"));
				return;
			}
			try {
				var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
				var reader = new GifReader(u8);
				var w = reader.width;
				var h = reader.height;
				var count = reader.numFrames();
				if (!count) {
					reject(new Error("no frames"));
					return;
				}
				var canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				var ctx = canvas.getContext("2d");
				var imageData = ctx.createImageData(w, h);
				var pixels = imageData.data;
				var i;
				for (i = 0; i < w * h * 4; i++) {
					pixels[i] = 0;
				}
				var out = [];
				for (i = 0; i < count; i++) {
					reader.decodeAndBlitFrameRGBA(i, pixels);
					ctx.putImageData(imageData, 0, 0);
					var info = reader.frameInfo(i);
					var delay = info && info.delay ? info.delay * 10 : 100;
					if (delay < 20) {
						delay = 100;
					}
					out.push({
						imageData: ctx.getImageData(0, 0, w, h),
						duration: delay
					});
				}
				resolve(out);
			} catch (e) {
				reject(e);
			}
		});
	}

	function loadBytes(url) {
		return fetch(url).then(function (res) {
			if (!res.ok) {
				throw new Error("fetch " + res.status);
			}
			return res.arrayBuffer();
		}).catch(function () {
			return new Promise(function (resolve, reject) {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", url);
				xhr.responseType = "arraybuffer";
				xhr.onload = function () {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(xhr.response);
					} else {
						reject(new Error("xhr " + xhr.status));
					}
				};
				xhr.onerror = function () {
					reject(new Error("xhr"));
				};
				xhr.send();
			});
		});
	}

	function iconPlay() {
		return '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" d="M12.5 9.5v17l14-8.5z"/></svg>';
	}

	function iconPause() {
		return '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="#fff" d="M12 10h4v16h-4zm8 0h4v16h-4z"/></svg>';
	}

	function Player(container, src, alt) {
		this.originalSrc = src;
		this.playSrc = src;
		this.blobUrl = "";
		this.container = container;
		this.alt = alt || "";
		this.playing = false;
		this.elapsed = 0;
		this.duration = 0;
		this.timer = 0;
		this.lastTs = 0;
		this.frames = [];
		this.frameIndex = 0;
		this.seeking = false;
		this.sprite = null;
		this.spec = null;
		this.dead = false;
		this.build();
		this.bind();
		this.start();
	}

	Player.prototype.build = function () {
		this.container.innerHTML =
			'<div class="yt-player is-paused" tabindex="0">' +
			'<img class="yt-player-gif" alt="" />' +
			'<canvas class="yt-player-freeze" hidden></canvas>' +
			'<div class="yt-player-shade"></div>' +
			'<div class="yt-player-chrome">' +
			'<div class="yt-progress">' +
			'<div class="yt-progress-track"><div class="yt-progress-played"></div><div class="yt-progress-knob"></div></div>' +
			"</div>" +
			'<div class="yt-controls">' +
			'<button type="button" class="yt-play" aria-label="Play">' + iconPlay() + "</button>" +
			'<div class="yt-time"><span class="yt-current">0:00</span> / <span class="yt-duration">0:00</span></div>' +
			"</div></div></div>";
		this.root = this.container.querySelector(".yt-player");
		this.gif = this.container.querySelector(".yt-player-gif");
		this.freeze = this.container.querySelector(".yt-player-freeze");
		this.ctx = this.freeze.getContext("2d");
		this.playedEl = this.container.querySelector(".yt-progress-played");
		this.knobEl = this.container.querySelector(".yt-progress-knob");
		this.currentEl = this.container.querySelector(".yt-current");
		this.durationEl = this.container.querySelector(".yt-duration");
		this.playBtn = this.container.querySelector(".yt-play");
		this.progress = this.container.querySelector(".yt-progress");
		this.gif.alt = this.alt;
	};

	Player.prototype.bind = function () {
		var self = this;
		this.playBtn.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			self.toggle();
		});
		this.root.addEventListener("click", function (e) {
			if (e.target.closest && (e.target.closest(".yt-play") || e.target.closest(".yt-progress"))) {
				return;
			}
			self.toggle();
		});
		this.progress.addEventListener("mousedown", function (e) {
			e.preventDefault();
			e.stopPropagation();
			self.seeking = true;
			self.seekFromEvent(e);
		});
		window.addEventListener("mousemove", function (e) {
			if (self.seeking) {
				self.seekFromEvent(e);
			}
		});
		window.addEventListener("mouseup", function () {
			self.seeking = false;
		});
	};

	Player.prototype.seekFromEvent = function (e) {
		if (this.dead || !this.duration) {
			return;
		}
		var rect = this.progress.getBoundingClientRect();
		this.elapsed = Math.min(this.duration, Math.max(0, ((e.clientX - rect.left) / rect.width) * this.duration));
		this.playing = false;
		this.setPlayUi();
		this.paintAt(this.elapsed);
		this.updateTimeUi();
	};

	Player.prototype.start = function () {
		var self = this;
		var spec = (window.GIF_SPRITES || {})[fileName(this.originalSrc)];
		this.gif.hidden = true;
		this.freeze.hidden = false;
		this.elapsed = 0;
		if (!spec) {
			this.duration = mappedDuration(this.originalSrc);
			this.gif.hidden = false;
			this.gif.src = this.originalSrc;
			this.playing = true;
			this.lastTs = performance.now();
			this.setPlayUi();
			this.updateTimeUi();
			this.tick();
			return;
		}
		this.spec = spec;
		this.duration = 0;
		var i;
		for (i = 0; i < spec.delays.length; i++) {
			this.duration += spec.delays[i];
		}
		this.freeze.width = spec.w;
		this.freeze.height = spec.h;
		this.sprite = new Image();
		var started = false;
		this.sprite.onload = function () {
			if (self.dead || started) {
				return;
			}
			started = true;
			self.playing = true;
			self.lastTs = performance.now();
			self.setPlayUi();
			self.paintAt(0);
			self.updateTimeUi();
			self.tick();
		};
		var sheet = String(this.originalSrc || "").split("?")[0].replace(/\\/g, "/").replace(
			/\/videos\/[^/]+\.gif$/i,
			"/frames/" + fileName(this.originalSrc).replace(/\.gif$/i, ".png")
		);
		if (sheet === String(this.originalSrc || "").split("?")[0].replace(/\\/g, "/") && spec.sheet) {
			try {
				sheet = new URL("../" + spec.sheet, window.location.href).href;
			} catch (e) {
				sheet = "../" + spec.sheet;
			}
		}
		this.sprite.src = sheet + (sheet.indexOf("?") >= 0 ? "&" : "?") + "v=20260826-sprite";
		if (this.sprite.complete && this.sprite.naturalWidth) {
			this.sprite.onload();
		}
	};

	Player.prototype.setPlayUi = function () {
		this.playBtn.innerHTML = this.playing ? iconPause() : iconPlay();
		this.playBtn.setAttribute("aria-label", this.playing ? "Pause" : "Play");
		this.root.classList.toggle("is-paused", !this.playing);
		this.root.classList.toggle("is-playing", this.playing);
	};

	Player.prototype.updateTimeUi = function () {
		var d = this.duration || 0;
		var t = d ? Math.min(this.elapsed, d) : this.elapsed;
		this.currentEl.textContent = formatTime(t);
		this.durationEl.textContent = d ? formatTime(d) : "0:00";
		var pct = d ? Math.min(100, (t / d) * 100) : 0;
		this.playedEl.style.width = pct + "%";
		this.knobEl.style.left = pct + "%";
	};

	Player.prototype.useFrames = function (frames) {
		this.frames = frames || [];
		if (!this.frames.length) {
			return;
		}
		var first = this.frames[0].imageData || this.frames[0].bmp;
		this.freeze.width = first.width;
		this.freeze.height = first.height;
		var sum = 0;
		var i;
		for (i = 0; i < this.frames.length; i++) {
			sum += this.frames[i].duration;
		}
		if (sum > 0) {
			this.duration = sum;
		}
		this.gif.hidden = true;
		this.freeze.hidden = false;
		this.paintAt(this.elapsed);
		this.updateTimeUi();
	};

	Player.prototype.paintAt = function (ms) {
		if (!this.sprite || !this.spec) {
			return;
		}
		var delays = this.spec.delays || [];
		var acc = 0;
		var i;
		var index = delays.length ? delays.length - 1 : 0;
		for (i = 0; i < delays.length; i++) {
			acc += delays[i];
			if (ms < acc) {
				index = i;
				break;
			}
		}
		this.frameIndex = index;
		var w = this.spec.w;
		var h = this.spec.h;
		this.ctx.clearRect(0, 0, this.freeze.width, this.freeze.height);
		this.ctx.drawImage(this.sprite, index * w, 0, w, h, 0, 0, w, h);
	};

	Player.prototype.freezeFrame = function () {
		this.gif.hidden = true;
		this.freeze.hidden = false;
		this.paintAt(this.elapsed);
	};

	Player.prototype.toggle = function () {
		if (this.dead) {
			return;
		}
		this.playing = !this.playing;
		this.lastTs = performance.now();
		this.setPlayUi();
		if (this.playing) {
			if (this.duration && this.elapsed >= this.duration) {
				this.elapsed = 0;
			}
			this.gif.hidden = true;
			this.freeze.hidden = false;
			this.paintAt(this.elapsed);
			this.tick();
		} else {
			if (this.timer) {
				cancelAnimationFrame(this.timer);
				this.timer = 0;
			}
			this.freezeFrame();
		}
	};

	Player.prototype.tick = function () {
		if (this.dead || !this.playing) {
			return;
		}
		var now = performance.now();
		this.elapsed += now - this.lastTs;
		this.lastTs = now;
		if (this.duration && this.elapsed >= this.duration) {
			this.elapsed = this.duration;
			this.playing = false;
			this.freezeFrame();
			this.setPlayUi();
			this.updateTimeUi();
			return;
		}
		this.paintAt(this.elapsed);
		this.updateTimeUi();
		this.timer = requestAnimationFrame(this.tick.bind(this));
	};

	Player.prototype.destroy = function () {
		this.dead = true;
		this.playing = false;
		if (this.timer) {
			cancelAnimationFrame(this.timer);
		}
		this.gif.src = "";
		(this.frames || []).forEach(function (frame) {
			if (frame.bmp && frame.bmp.close) {
				frame.bmp.close();
			}
		});
		this.frames = [];
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = "";
		}
	};

	window.GifPlayer = {
		mount: function (container, src, alt) {
			if (active) {
				active.destroy();
				active = null;
			}
			if (!container || !src) {
				if (container) {
					container.innerHTML = "";
				}
				return null;
			}
			active = new Player(container, src, alt);
			return active;
		}
	};
})(window);
