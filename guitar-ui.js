/**
 * GUITAR INTERACTIVE UI & PHYSICS
 * Mengatur Fretboard interaktif, getaran senar (Canvas Physics),
 * Strumming Pad (Petikan & Genjrengan), Chord Pads, dan Audio Visualizer.
 */

class RealisticGuitarUI {
  constructor(audioEngine) {
    this.audio = audioEngine;

    // Status Fretboard: Fret yang sedang ditekan untuk setiap senar (0=Low E s.d 5=High E)
    // 0 = open string, -1 = muted/tidak dimainkan
    this.currentFrets = [0, 0, 0, 0, 0, 0];
    this.selectedChordName = null;

    // Fisika Getaran Senar (Canvas animation)
    // Setiap senar memiliki amplitudo getaran, frekuensi, fase, dan redaman
    this.stringVibrations = [
      { amp: 0, freq: 82.4, phase: 0, decay: 0.985 },
      { amp: 0, freq: 110.0, phase: 0, decay: 0.986 },
      { amp: 0, freq: 146.8, phase: 0, decay: 0.987 },
      { amp: 0, freq: 196.0, phase: 0, decay: 0.988 },
      { amp: 0, freq: 246.9, phase: 0, decay: 0.989 },
      { amp: 0, freq: 329.6, phase: 0, decay: 0.990 }
    ];

    // Riwayat Rekaman
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    // Fret markers
    this.fretMarkers = [3, 5, 7, 9, 12, 15];

    // State strumming drag
    this.isDraggingStrum = false;
    this.lastStrumY = null;
    this.lastStrumTime = null;
    this.strummedStringsInCurrentGesture = new Set();
  }

  init() {
    this.renderFretboard();
    this.renderChordPads();
    this.setupStrumArea();
    this.setupVisualizer();
    this.setupEventListeners();
    this.startPhysicsLoop();
  }

  /**
   * Render Leher & Fretboard Gitar (15 Fret x 6 Senar)
   */
  renderFretboard() {
    const container = document.getElementById('fretboard-container');
    if (!container) return;

    container.innerHTML = '';

    // Buat headstock / nut (fret 0)
    const fretboardEl = document.createElement('div');
    fretboardEl.className = 'fretboard-grid';

    // Fret 0 (Nut) hingga Fret 14 (15 frets total)
    const numFrets = 15;

    for (let f = 0; f < numFrets; f++) {
      const fretCol = document.createElement('div');
      fretCol.className = `fret-column ${f === 0 ? 'fret-nut' : ''}`;
      fretCol.dataset.fret = f;

      // Label nomor fret
      const fretLabel = document.createElement('div');
      fretLabel.className = 'fret-number';
      fretLabel.textContent = f === 0 ? 'OPEN' : f;
      fretCol.appendChild(fretLabel);

      // Marker inlay titik gading / kerang (Mother of Pearl dots)
      if (this.fretMarkers.includes(f)) {
        const marker = document.createElement('div');
        marker.className = `fret-marker ${f === 12 ? 'double-dot' : 'single-dot'}`;
        fretCol.appendChild(marker);
      }

      // Buat 6 sel senar untuk fret ini (dari senar 1 / High E di atas hingga senar 6 / Low E di bawah)
      // Urutan tampilan visual: Senar 1 (atas) s.d Senar 6 (bawah)
      for (let sVisual = 5; sVisual >= 0; sVisual--) {
        const stringIdx = sVisual; // 5 = High E, 0 = Low E
        const cell = document.createElement('div');
        cell.className = 'fret-cell';
        cell.dataset.string = stringIdx;
        cell.dataset.fret = f;

        // Titik penekan jari (Fret Finger Point)
        const dot = document.createElement('div');
        dot.className = 'finger-dot';
        dot.dataset.string = stringIdx;
        dot.dataset.fret = f;

        const noteName = this.audio.getNoteName(stringIdx, f);
        dot.textContent = noteName;
        dot.title = `Senar ${6 - stringIdx} - Fret ${f} (${noteName})`;

        cell.appendChild(dot);

        // Event klik untuk menekan fret dan memainkan nada
        cell.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.onFretCellClicked(stringIdx, f);
        });

        // Touch support
        cell.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.onFretCellClicked(stringIdx, f);
        }, { passive: false });

        fretCol.appendChild(cell);
      }

      fretboardEl.appendChild(fretCol);
    }

    container.appendChild(fretboardEl);
    this.updateActiveFretDots();
  }

  /**
   * Render Tombol Preset Kunci Gitar Cepat (Chord Pads)
   */
  renderChordPads() {
    const chordContainer = document.getElementById('chord-pads-list');
    if (!chordContainer) return;

    chordContainer.innerHTML = '';
    const chordKeys = Object.keys(GUITAR_CHORDS);

    chordKeys.forEach((chordKey, index) => {
      const chordData = GUITAR_CHORDS[chordKey];
      const btn = document.createElement('button');
      btn.className = 'chord-btn';
      btn.dataset.chord = chordKey;

      // Keyboard shortcut 1-9 & 0
      const shortcutKey = index < 9 ? (index + 1) : (index === 9 ? '0' : '');

      btn.innerHTML = `
        <span class="chord-title">${chordKey}</span>
        <span class="chord-sub">${chordData.name.replace(' Major', '').replace(' Minor', 'm')}</span>
        ${shortcutKey ? `<kbd class="chord-key-hint">${shortcutKey}</kbd>` : ''}
      `;

      btn.addEventListener('click', () => {
        this.selectChord(chordKey, true);
      });

      chordContainer.appendChild(btn);
    });
  }

  /**
   * Memilih chord dan menempatkan posisi jari pada fretboard
   */
  selectChord(chordKey, autoStrum = false) {
    const chordData = GUITAR_CHORDS[chordKey];
    if (!chordData) return;

    this.selectedChordName = chordKey;
    this.currentFrets = [...chordData.frets];

    // Update highlight tombol chord aktif
    document.querySelectorAll('.chord-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.chord === chordKey);
    });

    // Update tampilan titik jari pada fretboard
    this.updateActiveFretDots();

    // Tampilkan notifikasi chord aktif
    const activeChordEl = document.getElementById('active-chord-name');
    if (activeChordEl) {
      activeChordEl.textContent = `${chordData.name}`;
    }

    // Jika diinginkan, otomatis genjreng 1x
    if (autoStrum) {
      this.strum(chordData.frets, 'down', 65);
    }

    // Jika sedang dalam mode Tantangan Kunci, evaluasi jawaban
    if (window.rhythmGame && window.rhythmGame.currentMode === 'chord_challenge') {
      window.rhythmGame.checkChordChallenge(chordKey);
    }
  }

  /**
   * Update visualisasi titik jari (Finger dots) pada fretboard
   */
  updateActiveFretDots() {
    const dots = document.querySelectorAll('.finger-dot');
    dots.forEach(dot => {
      const s = parseInt(dot.dataset.string, 10);
      const f = parseInt(dot.dataset.fret, 10);
      const targetFret = this.currentFrets[s];

      if (targetFret === f && targetFret !== -1) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  /**
   * Handler saat sebuah fret diklik langsung
   */
  onFretCellClicked(stringIdx, fret) {
    // Jika fret yang sama sudah aktif, ubah ke open string (0)
    if (this.currentFrets[stringIdx] === fret && fret !== 0) {
      this.currentFrets[stringIdx] = 0;
    } else {
      this.currentFrets[stringIdx] = fret;
    }

    this.selectedChordName = null;
    document.querySelectorAll('.chord-btn').forEach(b => b.classList.remove('active'));

    const activeChordEl = document.getElementById('active-chord-name');
    if (activeChordEl) {
      const noteName = this.audio.getNoteName(stringIdx, this.currentFrets[stringIdx]);
      activeChordEl.textContent = `Senar ${6 - stringIdx} - Nada: ${noteName}`;
    }

    this.updateActiveFretDots();

    // Mainkan not tunggal ini
    this.pluckString(stringIdx, this.currentFrets[stringIdx]);
  }

  /**
   * Petik senar tunggal dengan animasi fisik getaran
   */
  pluckString(stringIdx, fret = null, velocity = 0.85) {
    if (fret === null) {
      fret = this.currentFrets[stringIdx];
    }
    if (fret < 0) return; // Muted

    this.audio.playNote(stringIdx, fret, velocity);

    // Memicu amplitudo getaran senar pada canvas
    const vib = this.stringVibrations[stringIdx];
    vib.amp = Math.min(18, 8 + velocity * 10);
    vib.freq = this.audio.getNoteFrequency(stringIdx, fret);

    // Flash efek visual pada senar
    this.flashStringEffect(stringIdx);
  }

  /**
   * Genjrengan (Strum) penuh
   */
  strum(chordFrets = null, direction = 'down', speedMs = 60, velocity = 0.85) {
    const frets = chordFrets || this.currentFrets;
    this.audio.strumChord(frets, direction, speedMs, velocity);

    // Berikan efek getar pada setiap senar aktif
    frets.forEach((f, stringIdx) => {
      if (f >= 0) {
        setTimeout(() => {
          const vib = this.stringVibrations[stringIdx];
          vib.amp = 14;
          this.flashStringEffect(stringIdx);
        }, (direction === 'down' ? stringIdx : (5 - stringIdx)) * (speedMs / 6));
      }
    });
  }

  flashStringEffect(stringIdx) {
    const stringLane = document.querySelector(`.guitar-string-line[data-string="${stringIdx}"]`);
    if (stringLane) {
      stringLane.classList.add('plucked');
      setTimeout(() => stringLane.classList.remove('plucked'), 280);
    }
  }

  /**
   * Setup Area Strumming Interaktif (Touch / Drag / Hover Strum)
   */
  setupStrumArea() {
    const strumZone = document.getElementById('strum-pad');
    if (!strumZone) return;

    // Render 6 senar interaktif di dalam strum-pad
    strumZone.innerHTML = '';
    // Urutan visual dari atas ke bawah: Senar 1 (High E) s.d Senar 6 (Low E)
    for (let sVisual = 5; sVisual >= 0; sVisual--) {
      const stringIdx = sVisual;
      const strRow = document.createElement('div');
      strRow.className = 'strum-string-row';
      strRow.dataset.string = stringIdx;

      // Ketebalan senar berbeda: Senar 6 paling tebal, senar 1 paling tipis
      const gauge = (6 - stringIdx) * 0.75 + 1.2;

      strRow.innerHTML = `
        <span class="strum-string-label">${['E', 'A', 'D', 'G', 'B', 'e'][stringIdx]}</span>
        <div class="strum-wire" style="height: ${gauge}px;"></div>
        <span class="strum-note-indicator" id="strum-indicator-${stringIdx}"></span>
      `;

      // Klik langsung senar di area petikan
      strRow.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pluckString(stringIdx);
      });

      strumZone.appendChild(strRow);
    }

    // Drag Strumming (Mouse & Touch swipe)
    const handleStart = (y) => {
      this.isDraggingStrum = true;
      this.lastStrumY = y;
      this.lastStrumTime = performance.now();
      this.strummedStringsInCurrentGesture.clear();
    };

    const handleMove = (y) => {
      if (!this.isDraggingStrum) return;
      const rect = strumZone.getBoundingClientRect();
      const relativeY = y - rect.top;
      const totalH = rect.height;

      if (relativeY >= 0 && relativeY <= totalH) {
        // Tentukan senar mana yang dilewati (6 senar dari atas ke bawah: index 5 ke 0)
        const rowHeight = totalH / 6;
        const visualRow = Math.min(5, Math.max(0, Math.floor(relativeY / rowHeight)));
        const stringIdx = 5 - visualRow; // Map ke index senar sebenarnya

        if (!this.strummedStringsInCurrentGesture.has(stringIdx)) {
          this.strummedStringsInCurrentGesture.add(stringIdx);

          // Tentukan arah stroke berdasarkan delta Y
          const now = performance.now();
          const dt = Math.max(1, now - (this.lastStrumTime || now));
          const dy = y - (this.lastStrumY || y);
          const speed = Math.abs(dy) / dt;
          const velocity = Math.min(1.0, Math.max(0.5, speed * 0.8));

          this.pluckString(stringIdx, null, velocity);

          this.lastStrumY = y;
          this.lastStrumTime = now;
        }
      }
    };

    const handleEnd = () => {
      this.isDraggingStrum = false;
      this.strummedStringsInCurrentGesture.clear();
      this.lastStrumY = null;
    };

    strumZone.addEventListener('mousedown', (e) => handleStart(e.clientY));
    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingStrum) handleMove(e.clientY);
    });
    window.addEventListener('mouseup', handleEnd);

    strumZone.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) handleStart(e.touches[0].clientY);
    }, { passive: true });

    strumZone.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', handleEnd);
  }

  /**
   * Fisika Getaran Senar Berbasis Gelombang (Standing Wave Canvas Loop)
   */
  startPhysicsLoop() {
    const canvas = document.getElementById('strings-physics-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const numStrings = 6;
      const spacing = h / (numStrings + 1);

      for (let sVisual = 0; sVisual < numStrings; sVisual++) {
        // sVisual 0 = senar 1 (High E), sVisual 5 = senar 6 (Low E)
        const stringIdx = 5 - sVisual;
        const vib = this.stringVibrations[stringIdx];
        const yBase = spacing * (sVisual + 1);

        // Update fase dan decay amplitudo getaran
        if (vib.amp > 0.05) {
          vib.phase += vib.freq * dt * 2 * Math.PI;
          vib.amp *= vib.decay;
        } else {
          vib.amp = 0;
        }

        // Gambar senar dengan gelombang sinus berdiri
        ctx.beginPath();
        const thickness = (sVisual + 1) * 0.8 + 1.0;
        ctx.lineWidth = thickness;

        // Warna senar: bronze/kuningan untuk senar wound, perak terang untuk treble
        const isWound = stringIdx <= 2;
        ctx.strokeStyle = isWound
          ? (vib.amp > 1 ? '#ffcc00' : '#b38f4d')
          : (vib.amp > 1 ? '#70d6ff' : '#d1d5db');

        ctx.shadowColor = vib.amp > 1 ? 'rgba(255, 204, 0, 0.8)' : 'transparent';
        ctx.shadowBlur = vib.amp > 1 ? 8 : 0;

        ctx.moveTo(0, yBase);
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const x = (w / steps) * i;
          // Gelombang berdiri: simpul tetap di ujung x=0 dan x=w
          const standingWave = Math.sin((Math.PI * i) / steps);
          const oscillation = Math.sin(vib.phase) * vib.amp * standingWave;
          ctx.lineTo(x, yBase + oscillation);
        }
        ctx.stroke();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /**
   * Visualizer Audio (Oscilloscope & Spektrum Frekuensi Nyata)
   */
  setupVisualizer() {
    const canvas = document.getElementById('audio-visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      requestAnimationFrame(render);
      if (!this.audio || !this.audio.analyser) return;

      const w = canvas.width;
      const h = canvas.height;
      const analyser = this.audio.analyser;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(11, 14, 20, 0.4)';
      ctx.fillRect(0, 0, w, h);

      // Gambar gelombang akustik studio
      ctx.lineWidth = 2.2;
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#38bdf8');
      gradient.addColorStop(0.5, '#f43f5e');
      gradient.addColorStop(1, '#eab308');
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };

    render();
  }

  /**
   * Setup Keyboard Listeners & Kontrol
   */
  setupEventListeners() {
    // Keyboard shortcuts untuk memetik dan memainkan chord
    window.addEventListener('keydown', (e) => {
      // Jangan trigger saat mengetik di input text
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const key = e.key.toLowerCase();

      // Angka 1-9 & 0 untuk memilih chord
      const num = parseInt(key, 10);
      if (!isNaN(num)) {
        const chordKeys = Object.keys(GUITAR_CHORDS);
        const idx = num === 0 ? 9 : num - 1;
        if (chordKeys[idx]) {
          this.selectChord(chordKeys[idx], true);
        }
        return;
      }

      // Tombol A, S, D, J, K, L untuk memetik senar 6 hingga senar 1 langsung!
      const stringKeyMap = {
        'z': 0, // Senar 6 (E rendah)
        'x': 1, // Senar 5 (A)
        'c': 2, // Senar 4 (D)
        'v': 3, // Senar 3 (G)
        'b': 4, // Senar 2 (B)
        'n': 5  // Senar 1 (E tinggi)
      };

      if (stringKeyMap.hasOwnProperty(key)) {
        e.preventDefault();
        this.pluckString(stringKeyMap[key]);
        return;
      }

      // Spacebar untuk melakukan strum genjrengan chord saat ini
      if (e.code === 'Space') {
        e.preventDefault();
        this.strum(null, 'down', 55);
        return;
      }

      // Tombol Mute 'M'
      if (key === 'm') {
        this.audio.dampenAllStrings();
      }
    });

    // Pilihan Tipe Suara Gitar
    const guitarTypeSelect = document.getElementById('guitar-type-select');
    if (guitarTypeSelect) {
      guitarTypeSelect.addEventListener('change', (e) => {
        this.audio.setGuitarType(e.target.value);
      });
    }

    // Slider Efek
    const reverbSlider = document.getElementById('effect-reverb');
    if (reverbSlider) {
      reverbSlider.addEventListener('input', (e) => {
        this.audio.setEffectParam('reverb', parseFloat(e.target.value));
      });
    }

    const driveSlider = document.getElementById('effect-drive');
    if (driveSlider) {
      driveSlider.addEventListener('input', (e) => {
        this.audio.setEffectParam('distortion', parseFloat(e.target.value));
      });
    }

    const toneSlider = document.getElementById('effect-tone');
    if (toneSlider) {
      toneSlider.addEventListener('input', (e) => {
        this.audio.setEffectParam('tone', parseFloat(e.target.value));
      });
    }

    const volumeSlider = document.getElementById('master-volume');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.audio.setMasterVolume(parseFloat(e.target.value));
      });
    }

    // Tombol Mute All Strings
    const muteBtn = document.getElementById('btn-mute-strings');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.audio.dampenAllStrings();
      });
    }

    // Tombol Strum Down & Up
    const strumDownBtn = document.getElementById('btn-strum-down');
    if (strumDownBtn) {
      strumDownBtn.addEventListener('click', () => this.strum(null, 'down', 50));
    }
    const strumUpBtn = document.getElementById('btn-strum-up');
    if (strumUpBtn) {
      strumUpBtn.addEventListener('click', () => this.strum(null, 'up', 50));
    }
  }
}
