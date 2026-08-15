(() => {
  const STREAM_URL = 'https://radio.matheusribeiro.dev.br/radio.mp3';
  const STATUS_URL = 'https://radio.matheusribeiro.dev.br/status-json.xsl';
  const ACCENT = '#B3122A';
  const ACCENT_BRIGHT = '#E8323F';

  const toggleBtn = document.getElementById('radio-toggle');
  const closeBtn = document.getElementById('radio-close');
  const panel = document.getElementById('radio-panel');
  const nowPlayingEl = document.getElementById('radio-now-playing');
  const canvas = document.getElementById('radio-radar');
  if (!toggleBtn || !canvas) return;

  const ctx2d = canvas.getContext('2d');
  let audioEl = null;
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let rafId = null;
  let sweepAngle = 0;
  let statusInterval = null;
  let playing = false;

  function drawRadar() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) / 2 - 2;

    analyser.getByteFrequencyData(dataArray);
    const bass = avg(dataArray, 0, 8) / 255;
    const mid = avg(dataArray, 8, 24) / 255;
    const treble = avg(dataArray, 24, dataArray.length) / 255;
    const level = (bass + mid + treble) / 3;

    ctx2d.clearRect(0, 0, w, h);

    // background disc
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx2d.fillStyle = 'rgba(179,18,42,0.06)';
    ctx2d.fill();

    // concentric rings pulsing with bass/mid/treble
    [bass, mid, treble].forEach((v, i) => {
      const r = maxR * ((i + 1) / 3) * (0.7 + v * 0.3);
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2d.strokeStyle = ACCENT;
      ctx2d.globalAlpha = 0.25 + v * 0.6;
      ctx2d.lineWidth = 1;
      ctx2d.stroke();
    });
    ctx2d.globalAlpha = 1;

    // rotating sweep line, Daredevil-radar style
    sweepAngle += 0.06 + level * 0.05;
    const gradient = ctx2d.createConicGradient
      ? ctx2d.createConicGradient(sweepAngle - Math.PI / 2, cx, cy)
      : null;
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, maxR, sweepAngle - 0.5, sweepAngle);
    ctx2d.closePath();
    ctx2d.fillStyle = ACCENT_BRIGHT;
    ctx2d.globalAlpha = 0.35;
    ctx2d.fill();
    ctx2d.restore();
    ctx2d.globalAlpha = 1;

    // center dot pulsing with overall level
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, 1.5 + level * 2.5, 0, Math.PI * 2);
    ctx2d.fillStyle = ACCENT_BRIGHT;
    ctx2d.fill();

    rafId = requestAnimationFrame(drawRadar);
  }

  function avg(arr, from, to) {
    let sum = 0;
    for (let i = from; i < to; i++) sum += arr[i];
    return sum / (to - from);
  }

  async function pollNowPlaying() {
    try {
      const res = await fetch(STATUS_URL, { cache: 'no-store' });
      const data = await res.json();
      const title = data?.icestats?.source?.title;
      if (nowPlayingEl) nowPlayingEl.textContent = title || 'ao vivo';
    } catch {
      if (nowPlayingEl) nowPlayingEl.textContent = 'ao vivo';
    }
  }

  function startRadio() {
    if (!audioEl) {
      audioEl = new Audio(STREAM_URL);
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'none';
    }
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audioEl);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    audioCtx.resume();
    audioEl.play().catch(() => {});

    panel.classList.remove('hidden');
    panel.classList.add('flex');
    toggleBtn.setAttribute('aria-pressed', 'true');
    document.getElementById('radio-label').textContent = 'on air';

    drawRadar();
    pollNowPlaying();
    statusInterval = setInterval(pollNowPlaying, 8000);
    playing = true;
  }

  function stopRadio() {
    if (audioEl) audioEl.pause();
    if (rafId) cancelAnimationFrame(rafId);
    if (statusInterval) clearInterval(statusInterval);
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    panel.classList.add('hidden');
    panel.classList.remove('flex');
    toggleBtn.setAttribute('aria-pressed', 'false');
    document.getElementById('radio-label').textContent = 'radio';
    playing = false;
  }

  toggleBtn.addEventListener('click', () => (playing ? stopRadio() : startRadio()));
  closeBtn?.addEventListener('click', stopRadio);
})();
