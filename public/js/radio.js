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
  const vignetteEl = document.getElementById('daredevil-vignette');
  if (!toggleBtn || !canvas) return;

  const ctx2d = canvas.getContext('2d');
  let audioEl = null;
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let rafId = null;
  let statusInterval = null;
  let playing = false;
  let wasDarkBeforeRadio = false;
  let vignettePulseTimeout = null;

  // Murdock -> Daredevil: the radio playing is the site's "secret identity"
  // trigger. Forces dark mode on (remembering whatever the visitor had, to
  // restore on stop) and lets the beat detection below drive a full-page
  // echolocation-style flash on every kick, not just the corner widget.
  function pulseVignette() {
    if (!vignetteEl) return;
    vignetteEl.classList.remove('pulse');
    // restart the CSS animation even if it's still mid-run from the last beat
    void vignetteEl.offsetWidth;
    vignetteEl.classList.add('pulse');
    clearTimeout(vignettePulseTimeout);
    vignettePulseTimeout = setTimeout(() => vignetteEl.classList.remove('pulse'), 500);
  }

  // Beat detection: an adaptive threshold that jumps up right after a hit
  // (so the tail of that same kick can't immediately re-trigger it) and
  // decays back down toward a floor every frame, so the next genuine beat
  // just needs to clear wherever the threshold has decayed to. A plain
  // rolling average was tried first and failed in practice: on a sustained
  // kick-heavy passage the average gets pulled up by the beats themselves
  // within ~0.5s, so it stops firing after the first hit or two -- verified
  // by sampling ring pixels across 200 animation frames (only the first two
  // beats registered, then nothing). Each detected beat spawns one
  // expanding, fading ring (a sonar ping) rather than a constantly-rotating
  // sweep, so the visual is silent between hits and only pulses on the hit.
  const BEAT_FLOOR = 0.28;
  const BEAT_DECAY = 0.965;
  let beatThreshold = BEAT_FLOOR;
  let lastBeatTime = 0;
  let pulses = [];

  function drawRadar() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) / 2 - 2;

    analyser.getByteFrequencyData(dataArray);
    // bins 1-4 span ~172-689Hz (bin 0 is DC/near-0Hz and often noisy) --
    // kick-drum bass, not the low-mids a wider band would also catch
    const bass = avg(dataArray, 1, 5) / 255;
    const overall = avg(dataArray, 0, dataArray.length) / 255;

    beatThreshold = Math.max(BEAT_FLOOR, beatThreshold * BEAT_DECAY);
    const now = performance.now();
    const isBeat = bass > beatThreshold && now - lastBeatTime > 260;
    if (isBeat) {
      lastBeatTime = now;
      beatThreshold = bass * 1.08;
      pulses.push({ radius: 2, alpha: 1 });
      pulseVignette();
    }

    ctx2d.clearRect(0, 0, w, h);

    // background disc
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx2d.fillStyle = 'rgba(179,18,42,0.06)';
    ctx2d.fill();

    // expanding sonar pings, one per detected beat
    pulses = pulses.filter((p) => p.alpha > 0.03 && p.radius < maxR + 4);
    for (const p of pulses) {
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, p.radius, 0, Math.PI * 2);
      ctx2d.strokeStyle = ACCENT_BRIGHT;
      ctx2d.globalAlpha = p.alpha;
      ctx2d.lineWidth = 1.5;
      ctx2d.stroke();
      p.radius += 1.6;
      p.alpha *= 0.92;
    }
    ctx2d.globalAlpha = 1;

    // center dot -- a small flash on the beat itself, otherwise idles with
    // overall volume so it still reads as "alive" between hits
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, isBeat ? 3.5 : 1.3 + overall * 1.5, 0, Math.PI * 2);
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
      // 256 gives 128 bins at ~172Hz each (44.1kHz / 256) -- fine enough to
      // isolate true bass (kick fundamental, roughly under ~500Hz) instead
      // of the old fftSize=64's ~689Hz-wide bins, which pulled in low-mids
      // and made the "bass" band react to more than just the low end.
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    audioCtx.resume();
    audioEl.play().catch(() => {});

    wasDarkBeforeRadio = document.documentElement.classList.contains('dark');
    document.documentElement.classList.add('dark', 'daredevil');

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
    pulses = [];
    beatThreshold = BEAT_FLOOR;

    document.documentElement.classList.remove('daredevil');
    if (!wasDarkBeforeRadio) document.documentElement.classList.remove('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    panel.classList.add('hidden');
    panel.classList.remove('flex');
    toggleBtn.setAttribute('aria-pressed', 'false');
    document.getElementById('radio-label').textContent = 'radio';
    playing = false;
  }

  toggleBtn.addEventListener('click', () => (playing ? stopRadio() : startRadio()));
  closeBtn?.addEventListener('click', stopRadio);
})();
