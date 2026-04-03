(function () {
  const PF = {
    mediaRecorder: null,
    chunks: [],
    recordingUrl: null,
    recordingMime: "audio/webm",
    targetUrl: null,
    stream: null,
    audioContext: null,
    analyser: null,
    animationFrameId: null,
    mineSpeed: 1.0,
    targetSpeed: 1.0,

    init() {
      const state = window.__PF_STATE__;
      if (!state) return;

      this.state = state;
      this.bind();
      this.renderSpeedButtons(
        this.el.mineSpeeds,
        state.mineSpeedOptions || [0.7, 0.85, 1.0],
        "mineSpeed",
      );
      this.renderSpeedButtons(
        this.el.targetSpeeds,
        state.targetSpeedOptions || [0.7, 0.85, 1.0],
        "targetSpeed",
      );

      if (state.side === "back") {
        this.showBack();
        this.pycmd({ action: "loadBackState", cardId: state.cardId });
      }
    },

    bind() {
      this.el = {
        wave: document.getElementById("pf-wave"),
        waveCanvas: document.getElementById("pf-wave-canvas"),
        waveStatus: document.getElementById("pf-wave-status"),
        record: document.getElementById("pf-record"),
        stop: document.getElementById("pf-stop"),
        playMine: document.getElementById("pf-play-mine"),
        redo: document.getElementById("pf-redo"),
        back: document.getElementById("pf-back"),
        playTarget: document.getElementById("pf-play-target"),
        compare: document.getElementById("pf-compare"),
        score: document.getElementById("pf-score"),
        mineSpeeds: document.getElementById("pf-mine-speeds"),
        targetSpeeds: document.getElementById("pf-target-speeds"),
      };

      this.el.record?.addEventListener("click", () => this.startRecording());
      this.el.stop?.addEventListener("click", () => this.stopRecording());
      this.el.playMine?.addEventListener("click", () => this.playMine());
      this.el.redo?.addEventListener("click", () => this.redoRecording());
      this.el.playTarget?.addEventListener("click", () => this.playTarget());
      this.el.compare?.addEventListener("click", () => this.compare());
      this.clearWaveCanvas();
    },

    showBack() {
      this.el.back?.classList.remove("pf-hidden");
      if (!this.state.showScore) {
        this.el.score.textContent = "Pronunciation match: unavailable";
      }
      this.setTargetAvailability(false);
    },

    getPreferredMimeType() {
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      for (const mime of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      }
      return "";
    },

    async startRecording() {
      try {
        const mimeType = this.getPreferredMimeType();
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.stream, { mimeType })
          : new MediaRecorder(this.stream);
        this.recordingMime = this.mediaRecorder.mimeType || mimeType || "audio/webm";

        this.chunks = [];
        this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
        this.mediaRecorder.start();
        this.setupLiveWaveform();
        this.drawLiveWaveform();

        this.setWaveStatus("Recording...");
        this.el.record.classList.add("pf-hidden");
        this.el.stop.classList.remove("pf-hidden");
      } catch (err) {
        this.setWaveStatus(`Microphone error: ${err.message || err}`);
      }
    },

    async stopRecording() {
      if (!this.mediaRecorder) return;

      await new Promise((resolve) => {
        this.mediaRecorder.onstop = resolve;
        this.mediaRecorder.stop();
      });

      this.teardownLiveWaveform();

      const blob = new Blob(this.chunks, { type: this.recordingMime });
      this.recordingUrl = URL.createObjectURL(blob);
      await this.renderStaticWaveform(blob);
      this.setWaveStatus("Recording captured");

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

      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
      }
    },

    playMine() {
      if (!this.recordingUrl) return;
      const a = new Audio(this.recordingUrl);
      a.playbackRate = this.mineSpeed;
      a.play();
    },

    redoRecording() {
      this.recordingUrl = null;
      this.chunks = [];
      this.clearWaveCanvas();
      this.setWaveStatus("No recording yet");
      this.el.playMine.classList.add("pf-hidden");
      this.el.redo.classList.add("pf-hidden");
      this.el.score.textContent = "Pronunciation match: unavailable";
      this.pycmd({ action: "redoRecording", cardId: this.state.cardId });
    },

    playTarget() {
      if (!this.targetUrl) {
        this.pycmd({ action: "playTarget", cardId: this.state.cardId });
        return;
      }
      const a = new Audio(this.targetUrl);
      a.playbackRate = this.targetSpeed;
      a.play();
    },

    async compare() {
      if (!this.targetUrl) return;
      this.pycmd({ action: "compare", cardId: this.state.cardId });
      if (this.recordingUrl) {
        await this.playAudioPromise(this.recordingUrl, this.mineSpeed);
      }
      if (this.targetUrl) {
        await this.playAudioPromise(this.targetUrl, this.targetSpeed);
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

    renderSpeedButtons(container, speeds, key) {
      if (!container) return;
      container.innerHTML = "";
      speeds.forEach((s) => {
        const btn = document.createElement("button");
        btn.className = "pf-speed";
        btn.textContent = `${s}x`;
        btn.addEventListener("click", () => {
          this[key] = s;
        });
        container.appendChild(btn);
      });
    },

    setTargetAvailability(hasTarget) {
      this.el.playTarget.disabled = !hasTarget;
      this.el.compare.disabled = !hasTarget;
    },

    setupLiveWaveform() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    },

    teardownLiveWaveform() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.analyser = null;
    },

    drawLiveWaveform() {
      if (!this.analyser || !this.el.waveCanvas) return;
      const canvas = this.el.waveCanvas;
      const ctx = canvas.getContext("2d");
      const data = new Uint8Array(this.analyser.frequencyBinCount);

      const draw = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(data);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = canvas.width / data.length;

        for (let i = 0; i < data.length; i += 1) {
          const h = (data[i] / 255) * canvas.height;
          ctx.fillStyle = "#3268ff";
          ctx.fillRect(i * barWidth, canvas.height - h, Math.max(barWidth - 1, 1), h);
        }
        this.animationFrameId = requestAnimationFrame(draw);
      };

      draw();
    },

    async renderStaticWaveform(blob) {
      if (!this.el.waveCanvas) return;
      const canvas = this.el.waveCanvas;
      const ctx = canvas.getContext("2d");
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      try {
        const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const samples = decoded.getChannelData(0);
        const bars = 100;
        const step = Math.floor(samples.length / bars) || 1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#8aa5ff";
        for (let i = 0; i < bars; i += 1) {
          let peak = 0;
          const start = i * step;
          const end = Math.min(samples.length, start + step);
          for (let j = start; j < end; j += 1) {
            const v = Math.abs(samples[j]);
            if (v > peak) peak = v;
          }
          const h = peak * canvas.height;
          const bw = canvas.width / bars;
          ctx.fillRect(i * bw, (canvas.height - h) / 2, Math.max(bw - 1, 1), h);
        }
      } catch (_err) {
        this.clearWaveCanvas();
      } finally {
        audioCtx.close();
      }
    },

    clearWaveCanvas() {
      if (!this.el.waveCanvas) return;
      const canvas = this.el.waveCanvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    setWaveStatus(text) {
      if (this.el.waveStatus) {
        this.el.waveStatus.textContent = text;
      }
    },

    pycmd(payload) {
      if (typeof window.pycmd === "function") {
        window.pycmd(`pf:${JSON.stringify(payload)}`);
      }
    },

    onPythonMessage(payload) {
      if (payload.type === "backState") {
        this.targetUrl = payload.targetUrl;
        this.setTargetAvailability(Boolean(this.targetUrl));

        if (payload.recordingB64 && !this.recordingUrl) {
          const blob = this.base64ToBlob(payload.recordingB64, payload.recordingMime || "audio/webm");
          this.recordingUrl = URL.createObjectURL(blob);
          this.renderStaticWaveform(blob);
          this.setWaveStatus("Recording captured");
          this.el.playMine.classList.remove("pf-hidden");
          this.el.redo.classList.remove("pf-hidden");
        }

        if (payload.error) {
          this.setWaveStatus(`Audio error: ${payload.error}`);
        }

        if (this.state.playTargetOnReveal && this.targetUrl) {
          this.playTarget();
        }
      }
      if (payload.type === "targetUrl") {
        this.targetUrl = payload.url;
        this.setTargetAvailability(Boolean(this.targetUrl));
        this.playTarget();
      }
      if (payload.type === "score" && this.state.showScore) {
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

    base64ToBlob(b64, mime) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) {
        bytes[i] = bin.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    },
  };

  window.PF = PF;
  PF.init();
})();
