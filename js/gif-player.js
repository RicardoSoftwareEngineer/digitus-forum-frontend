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

	function Player(container, src, alt, audioUrl) {
		this.originalSrc = src;
		this.playSrc = src;
		this.blobUrl = "";
		this.container = container;
		this.alt = alt || "";
		this.audioUrl = audioUrl || "";
		this.audio = null;
		this.audioBlobUrl = "";
		this.audioReady = false;
		this.audioLoading = false;
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
			"</div></div>" +
			'<audio class="yt-player-audio" preload="auto" playsinline></audio>' +
			"</div>";
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
		this.audio = this.container.querySelector(".yt-player-audio");
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
			if (e.target.closest && (e.target.closest(".yt-play") || e.target.closest(".yt-progress") || e.target.closest(".yt-player-audio"))) {
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
		if (this.audioReady && this.audio) {
			this.audio.currentTime = this.elapsed / 1000;
			this.updateTimeUi();
			return;
		}
		this.playing = false;
		this.setPlayUi();
		this.paintAt(this.elapsed);
		this.updateTimeUi();
	};

	Player.prototype.syncDurationFromAudio = function () {
		if (!this.audio || !isFinite(this.audio.duration) || this.audio.duration <= 0) {
			return;
		}
		this.duration = this.audio.duration * 1000;
	};

	Player.prototype.showLoopingGif = function () {
		if (this.originalSrc) {
			this.gif.hidden = false;
			this.freeze.hidden = true;
			if (!this.gif.getAttribute("src")) {
				this.gif.src = this.originalSrc;
			}
		}
	};

	Player.prototype.pauseLoopingGif = function () {
		if (this.gif && !this.gif.hidden && this.gif.naturalWidth) {
			try {
				this.freeze.width = this.gif.naturalWidth;
				this.freeze.height = this.gif.naturalHeight;
				this.ctx.drawImage(this.gif, 0, 0);
				this.gif.hidden = true;
				this.freeze.hidden = false;
			} catch (e) {}
		} else if (this.sprite && this.spec) {
			this.freezeFrame();
		}
	};

	Player.prototype.loadFullAudio = function (url) {
		var self = this;
		this.audioLoading = true;
		this.root.classList.add("is-loading-audio");
		return fetch(url).then(function (res) {
			if (!res.ok) {
				throw new Error("audio " + res.status);
			}
			return res.blob();
		}).then(function (blob) {
			if (self.dead) {
				return;
			}
			if (self.audioBlobUrl) {
				URL.revokeObjectURL(self.audioBlobUrl);
			}
			self.audioBlobUrl = URL.createObjectURL(blob);
			return new Promise(function (resolve, reject) {
				function ok() {
					self.audio.removeEventListener("loadedmetadata", ok);
					self.audio.removeEventListener("error", bad);
					self.audioReady = true;
					self.audioLoading = false;
					self.syncDurationFromAudio();
					resolve();
				}
				function bad() {
					self.audio.removeEventListener("loadedmetadata", ok);
					self.audio.removeEventListener("error", bad);
					reject(new Error("audio decode"));
				}
				self.audio.addEventListener("loadedmetadata", ok);
				self.audio.addEventListener("error", bad);
				self.audio.src = self.audioBlobUrl;
				self.audio.load();
			});
		}).then(function () {
			if (self.dead) {
				return;
			}
			self.root.classList.remove("is-loading-audio");
		}).catch(function (err) {
			if (!self.dead) {
				self.audioLoading = false;
				self.audioReady = false;
				self.root.classList.remove("is-loading-audio");
			}
			throw err;
		});
	};

	Player.prototype.bindAudioClock = function () {
		var self = this;
		if (!this.audio) {
			return;
		}
		this.audio.addEventListener("timeupdate", function () {
			if (self.dead || self.seeking) {
				return;
			}
			self.elapsed = (self.audio.currentTime || 0) * 1000;
			self.syncDurationFromAudio();
			self.updateTimeUi();
		});
		this.audio.addEventListener("ended", function () {
			if (self.dead) {
				return;
			}
			self.playing = false;
			self.elapsed = self.duration;
			self.pauseLoopingGif();
			self.setPlayUi();
			self.updateTimeUi();
		});
		this.audio.addEventListener("play", function () {
			if (self.dead) {
				return;
			}
			if (!self.playing) {
				self.playing = true;
				self.showLoopingGif();
				self.setPlayUi();
				self.tick();
			}
		});
		this.audio.addEventListener("pause", function () {
			if (self.dead || self.seeking || self.audio.ended) {
				return;
			}
			if (self.playing) {
				self.playing = false;
				self.pauseLoopingGif();
				self.setPlayUi();
			}
		});
		this.audio.addEventListener("seeked", function () {
			if (self.dead) {
				return;
			}
			self.elapsed = (self.audio.currentTime || 0) * 1000;
			self.updateTimeUi();
		});
	};

	Player.prototype.startLessonClock = function () {
		var self = this;
		this.showLoopingGif();
		this.updateTimeUi();
		if (this.audioReady && this.audio) {
			var play = this.audio.play();
			if (play && play.then) {
				play.then(function () {
					if (self.dead) {
						return;
					}
					self.playing = true;
					self.lastTs = performance.now();
					self.setPlayUi();
					self.tick();
				}).catch(function () {
					if (self.dead) {
						return;
					}
					self.playing = false;
					self.pauseLoopingGif();
					self.setPlayUi();
				});
				return;
			}
		}
		this.playing = true;
		this.lastTs = performance.now();
		this.setPlayUi();
		this.tick();
	};

	Player.prototype.start = function () {
		var self = this;
		var spec = (window.GIF_SPRITES || {})[fileName(this.originalSrc)];
		this.gif.hidden = true;
		this.freeze.hidden = false;
		this.elapsed = 0;
		this.bindAudioClock();
		if (this.audioUrl) {
			if (this.originalSrc) {
				this.gif.src = this.originalSrc;
			}
			this.duration = mappedDuration(this.originalSrc);
			this.playing = false;
			this.setPlayUi();
			this.updateTimeUi();
			this.loadFullAudio(this.audioUrl).then(function () {
				if (self.dead) {
					return;
				}
				self.startLessonClock();
			}).catch(function () {
				if (self.dead) {
					return;
				}
				self.startVisualOnly(spec);
			});
			return;
		}
		this.startVisualOnly(spec);
	};

	Player.prototype.startVisualOnly = function (spec) {
		var self = this;
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
		if (this.dead || this.audioLoading) {
			return;
		}
		this.playing = !this.playing;
		this.lastTs = performance.now();
		this.setPlayUi();
		if (this.playing) {
			if (this.duration && this.elapsed >= this.duration) {
				this.elapsed = 0;
				if (this.audioReady && this.audio) {
					this.audio.currentTime = 0;
				}
			}
			if (this.audioReady && this.audio) {
				this.showLoopingGif();
				var play = this.audio.play();
				if (play && play.catch) {
					play.catch(function () {});
				}
				this.tick();
				return;
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
			if (this.audio) {
				this.audio.pause();
			}
			if (this.audioReady) {
				this.pauseLoopingGif();
			} else {
				this.freezeFrame();
			}
		}
	};

	Player.prototype.tick = function () {
		if (this.dead || !this.playing) {
			return;
		}
		if (this.audioReady && this.audio) {
			this.elapsed = (this.audio.currentTime || 0) * 1000;
			this.syncDurationFromAudio();
			if (this.audio.ended || (this.duration && this.elapsed >= this.duration)) {
				this.elapsed = this.duration;
				this.playing = false;
				this.pauseLoopingGif();
				this.setPlayUi();
				this.updateTimeUi();
				return;
			}
			this.updateTimeUi();
			this.timer = requestAnimationFrame(this.tick.bind(this));
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
		if (this.audio) {
			this.audio.pause();
			this.audio.removeAttribute("src");
			this.audio.load();
			this.audio = null;
		}
		if (this.audioBlobUrl) {
			URL.revokeObjectURL(this.audioBlobUrl);
			this.audioBlobUrl = "";
		}
	};

	window.GifPlayer = {
		mount: function (container, src, alt, audioUrl) {
			if (active) {
				active.destroy();
				active = null;
			}
			if (!container || (!src && !audioUrl)) {
				if (container) {
					container.innerHTML = "";
				}
				return null;
			}
			active = new Player(container, src, alt, audioUrl);
			return active;
		}
	};
})(window);
