(function () {
  const PF = {
    mediaRecorder: null,
    chunks: [],
    recordingUrl: null,
    recordingMime: "audio/webm",
    targetUrl: null,
    speed: 1.0,

    init() {
      const state = window.__PF_STATE__;
      if (!state) return;

      this.state = state;
      this.bind();
      this.renderSpeedButtons(state.speedOptions || [0.7, 0.85, 1.0]);

      if (state.side === "back") {
        this.showBack();
        this.pycmd({ action: "loadBackState", cardId: state.cardId });
      }
    },

    bind() {
      this.el = {
        wave: document.getElementById("pf-wave"),
        record: document.getElementById("pf-record"),
        stop: document.getElementById("pf-stop"),
        playMine: document.getElementById("pf-play-mine"),
        redo: document.getElementById("pf-redo"),
        back: document.getElementById("pf-back"),
        playTarget: document.getElementById("pf-play-target"),
        compare: document.getElementById("pf-compare"),
        score: document.getElementById("pf-score"),
        speeds: document.getElementById("pf-speeds"),
      };

      this.el.record?.addEventListener("click", () => this.startRecording());
      this.el.stop?.addEventListener("click", () => this.stopRecording());
      this.el.playMine?.addEventListener("click", () => this.playMine());
      this.el.redo?.addEventListener("click", () => this.redoRecording());
      this.el.playTarget?.addEventListener("click", () => this.playTarget());
      this.el.compare?.addEventListener("click", () => this.compare());
    },

    showBack() {
      this.el.back?.classList.remove("pf-hidden");
      if (!this.state.showScore) {
        this.el.score.style.display = "none";
      }
    },

    async startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingMime = this.mediaRecorder.mimeType || "audio/webm";
      this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
      this.mediaRecorder.start();
      this.el.wave.textContent = "Recording...";
      this.el.record.classList.add("pf-hidden");
      this.el.stop.classList.remove("pf-hidden");
    },

    async stopRecording() {
      if (!this.mediaRecorder) return;
      await new Promise((resolve) => {
        this.mediaRecorder.onstop = resolve;
        this.mediaRecorder.stop();
      });
      const blob = new Blob(this.chunks, { type: this.recordingMime });
      this.recordingUrl = URL.createObjectURL(blob);
      this.el.wave.textContent = "Recording captured";
      this.el.stop.classList.add("pf-hidden");
      this.el.record.classList.remove("pf-hidden");
      this.el.playMine.classList.remove("pf-hidden");
      this.el.redo.classList.remove("pf-hidden");

      const b64 = await this.blobToBase64(blob);
      this.pycmd({
        action: "saveRecording",
        cardId: this.state.cardId,
        recordingB64: b64,
        mime: this.recordingMime,
      });
    },

    playMine() {
      if (!this.recordingUrl) return;
      const a = new Audio(this.recordingUrl);
      a.play();
    },

    redoRecording() {
      this.recordingUrl = null;
      this.chunks = [];
      this.el.wave.textContent = "No recording yet";
      this.el.playMine.classList.add("pf-hidden");
      this.pycmd({ action: "redoRecording", cardId: this.state.cardId });
    },

    playTarget() {
      if (!this.targetUrl) {
        this.pycmd({ action: "playTarget", cardId: this.state.cardId });
        return;
      }
      const a = new Audio(this.targetUrl);
      a.playbackRate = this.speed;
      a.play();
    },

    async compare() {
      this.pycmd({ action: "compare", cardId: this.state.cardId });
      if (this.recordingUrl) {
        await this.playAudioPromise(this.recordingUrl, 1.0);
      }
      if (this.targetUrl) {
        await this.playAudioPromise(this.targetUrl, this.speed);
      }
    },

    playAudioPromise(url, speed) {
      return new Promise((resolve) => {
        const a = new Audio(url);
        a.playbackRate = speed;
        a.onended = () => resolve();
        a.play().catch(() => resolve());
      });
    },

    renderSpeedButtons(speeds) {
      if (!this.el || !this.el.speeds) return;
      this.el.speeds.innerHTML = "";
      speeds.forEach((s) => {
        const btn = document.createElement("button");
        btn.className = "pf-speed";
        btn.textContent = `${s}x`;
        btn.addEventListener("click", () => {
          this.speed = s;
        });
        this.el.speeds.appendChild(btn);
      });
    },

    pycmd(payload) {
      if (typeof window.pycmd === "function") {
        window.pycmd(`pf:${JSON.stringify(payload)}`);
      }
    },

    onPythonMessage(payload) {
      if (payload.type === "backState") {
        this.targetUrl = payload.targetUrl;
        if (payload.recordingB64 && !this.recordingUrl) {
          this.recordingUrl = this.base64ToObjectUrl(payload.recordingB64, payload.recordingMime || "audio/webm");
          this.el.wave.textContent = "Recording captured";
          this.el.playMine.classList.remove("pf-hidden");
          this.el.redo.classList.remove("pf-hidden");
        }
        if (this.state.playTargetOnReveal) {
          this.playTarget();
        }
      }
      if (payload.type === "targetUrl") {
        this.targetUrl = payload.url;
        this.playTarget();
      }
      if (payload.type === "score") {
        this.el.score.textContent = `Pronunciation match: ${payload.score}/5`;
      }
    },

    blobToBase64(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const out = reader.result.split(",")[1] || "";
          resolve(out);
        };
        reader.readAsDataURL(blob);
      });
    },

    base64ToObjectUrl(b64, mime) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    },
  };

  window.PF = PF;
  PF.init();
})();
