/**
 * RHYTHM HERO & GUITAR GAME MODES ENGINE
 * Menangani highway falling notes, deteksi timing (Perfect, Great, Good, Miss),
 * scoring, combo multiplier, rock meter, dan mode game Tantangan Chord & Ear Training.
 */

class RhythmGameEngine {
  constructor(audioEngine, guitarUI) {
    this.audio = audioEngine;
    this.ui = guitarUI;

    this.currentMode = 'free'; // 'free' | 'rhythm' | 'chord_challenge' | 'ear_train'
    this.isPlaying = false;
    this.isPaused = false;

    // Data Lagu Aktif
    this.currentSong = null;
    this.songStartTime = 0;
    this.pauseTime = 0;
    this.songDuration = 0;

    // Status Skor
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.rockMeter = 50; // 0 - 100%
    this.stats = { perfect: 0, great: 0, good: 0, miss: 0 };

    // Notes State
    this.activeNotes = [];
    this.hitWindows = {
      perfect: 0.065, // +-65ms
      great: 0.120,   // +-120ms
      good: 0.180,    // +-180ms
      miss: 0.250     // > 250ms = miss
    };

    // Kecepatan jatuh note (highway travel time dalam detik)
    this.travelTime = 2.2;

    // Canvas Highway
    this.canvas = null;
    this.ctx = null;
    this.animId = null;

    // Mode Tantangan Chord
    this.chordChallengeTimer = null;
    this.currentTargetChord = null;
    this.chordChallengeScore = 0;

    // Mode Ear Training
    this.earTargetNote = null;
    this.earScore = 0;
  }

  init() {
    this.canvas = document.getElementById('rhythm-highway-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    this.setupControls();
    this.renderSongList();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  renderSongList() {
    const listEl = document.getElementById('rhythm-song-select');
    if (!listEl) return;

    listEl.innerHTML = '';
    GUITAR_SONGS.forEach(song => {
      const opt = document.createElement('option');
      opt.value = song.id;
      opt.textContent = `${song.title} - ${song.artist} (${song.difficulty})`;
      listEl.appendChild(opt);
    });

    listEl.addEventListener('change', (e) => {
      const selected = GUITAR_SONGS.find(s => s.id === e.target.value);
      if (selected) {
        this.updateSongInfoBadge(selected);
      }
    });

    if (GUITAR_SONGS.length > 0) {
      this.updateSongInfoBadge(GUITAR_SONGS[0]);
    }
  }

  updateSongInfoBadge(song) {
    const titleEl = document.getElementById('song-info-title');
    const descEl = document.getElementById('song-info-desc');
    const diffEl = document.getElementById('song-info-diff');
    if (titleEl) titleEl.textContent = `${song.title} - ${song.artist}`;
    if (descEl) descEl.textContent = song.description;
    if (diffEl) {
      diffEl.textContent = song.difficulty;
      diffEl.className = `diff-badge diff-${song.difficulty.toLowerCase()}`;
    }
  }

  setupControls() {
    // Tombol Mulai Lagu
    const startBtn = document.getElementById('btn-start-song');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const select = document.getElementById('rhythm-song-select');
        const songId = select ? select.value : GUITAR_SONGS[0].id;
        this.startSong(songId);
      });
    }

    // Tombol Berhenti / Ulang
    const stopBtn = document.getElementById('btn-stop-song');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopSong());
    }

    // Tombol Pilihan Mode Game di Navigasi Atas
    document.querySelectorAll('.game-mode-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = tab.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Keyboard Event untuk Rhythm Game Hit
    // Tombol 1, 2, 3, 4, 5, 6 atau A, S, D, J, K, L
    window.addEventListener('keydown', (e) => {
      if (this.currentMode !== 'rhythm' || !this.isPlaying) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const key = e.key.toLowerCase();
      // Mapping ke 6 senar (0 = Low E s.d 5 = High E)
      const rhythmKeyMap = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        'a': 0, 's': 1, 'd': 2, 'j': 3, 'k': 4, 'l': 5
      };

      if (rhythmKeyMap.hasOwnProperty(key)) {
        e.preventDefault();
        const stringIdx = rhythmKeyMap[key];
        this.handlePlayerHit(stringIdx);
      }
    });

    // Klik pada target line pada highway
    if (this.canvas) {
      this.canvas.addEventListener('mousedown', (e) => {
        if (!this.isPlaying) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const colWidth = this.canvas.width / 6;
        const stringIdx = Math.min(5, Math.max(0, Math.floor(clickX / colWidth)));
        this.handlePlayerHit(stringIdx);
      });
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.stopSong();

    // Update active tab visual
    document.querySelectorAll('.game-mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });

    // Sembunyikan / Tampilkan panel yang relevan
    const highwaySection = document.getElementById('rhythm-highway-section');
    const chordChallengeSection = document.getElementById('chord-challenge-section');
    const earTrainSection = document.getElementById('ear-train-section');
    const fretboardContainer = document.getElementById('fretboard-container-wrapper');

    if (highwaySection) highwaySection.style.display = mode === 'rhythm' ? 'block' : 'none';
    if (chordChallengeSection) chordChallengeSection.style.display = mode === 'chord_challenge' ? 'block' : 'none';
    if (earTrainSection) earTrainSection.style.display = mode === 'ear_train' ? 'block' : 'none';
    if (fretboardContainer) fretboardContainer.style.display = 'block';

    if (mode === 'chord_challenge') {
      this.startChordChallenge();
    } else if (mode === 'ear_train') {
      this.startEarTraining();
    }
  }

  async startSong(songId) {
    const song = GUITAR_SONGS.find(s => s.id === songId) || GUITAR_SONGS[0];
    this.currentSong = song;

    await this.audio.init();

    // Set suara gitar sesuai rekomendasi lagu
    if (song.recommendedGuitar) {
      this.audio.setGuitarType(song.recommendedGuitar);
      const sel = document.getElementById('guitar-type-select');
      if (sel) sel.value = song.recommendedGuitar;
    }

    // Reset status
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.rockMeter = 60;
    this.stats = { perfect: 0, great: 0, good: 0, miss: 0 };

    // Kloning notes
    this.activeNotes = song.notes.map(n => ({
      ...n,
      hit: false,
      missed: false
    }));

    // Hitung durasi total lagu
    const lastNote = this.activeNotes[this.activeNotes.length - 1];
    this.songDuration = (lastNote ? lastNote.time : 10) + 3.0;

    this.isPlaying = true;
    this.isPaused = false;
    this.songStartTime = performance.now() / 1000;

    this.updateHUD();

    // Sembunyikan modal kemenangan lama
    const victoryModal = document.getElementById('rhythm-victory-modal');
    if (victoryModal) victoryModal.classList.remove('show');

    // Mulai render loop highway
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  stopSong() {
    this.isPlaying = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  loop() {
    if (!this.isPlaying) return;

    const currentTime = performance.now() / 1000;
    const songTime = currentTime - this.songStartTime;

    this.updateHighway(songTime);
    this.renderHighway(songTime);

    // Cek jika lagu selesai
    if (songTime > this.songDuration) {
      this.endSong();
      return;
    }

    // Cek jika rock meter habis (Game Over)
    if (this.rockMeter <= 0) {
      this.gameOver();
      return;
    }

    this.animId = requestAnimationFrame(() => this.loop());
  }

  updateHighway(songTime) {
    // Cek not yang terlewat (Missed Notes)
    for (const note of this.activeNotes) {
      if (!note.hit && !note.missed) {
        if (songTime - note.time > this.hitWindows.miss) {
          note.missed = true;
          this.registerJudgement('MISS', note.string);
        }
      }
    }
  }

  renderHighway(songTime) {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const numLanes = 6;
    const laneWidth = w / numLanes;
    const targetY = h - 65; // Garis strike target

    // Palet warna tiap senar neon
    const stringColors = [
      '#ef4444', // Senar 6 (Merah)
      '#f97316', // Senar 5 (Oranye)
      '#eab308', // Senar 4 (Kuning Emas)
      '#22c55e', // Senar 3 (Hijau)
      '#06b6d4', // Senar 2 (Sian)
      '#a855f7'  // Senar 1 (Ungu)
    ];

    // Gambar jalur (Lanes)
    for (let i = 0; i < numLanes; i++) {
      const x = i * laneWidth;

      // Garis pemisah jalur
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Label senar & keyboard shortcut di bawah
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      const keyHint = ['1/A', '2/S', '3/D', '4/J', '5/K', '6/L'][i];
      ctx.fillText(keyHint, x + laneWidth / 2, h - 12);
    }

    // Gambar Garis Target (Strike Line)
    const targetGlow = ctx.createLinearGradient(0, targetY, w, targetY);
    targetGlow.addColorStop(0, '#f43f5e');
    targetGlow.addColorStop(0.5, '#38bdf8');
    targetGlow.addColorStop(1, '#a855f7');
    ctx.strokeStyle = targetGlow;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Gambar target ring pada tiap senar
    for (let i = 0; i < numLanes; i++) {
      const cx = i * laneWidth + laneWidth / 2;
      ctx.strokeStyle = stringColors[i];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, targetY, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Gambar Notes yang sedang meluncur ke bawah
    for (const note of this.activeNotes) {
      if (note.hit) continue;

      const timeUntilHit = note.time - songTime;
      // Hanya gambar jika berada di dalam rentang pandang highway
      if (timeUntilHit <= this.travelTime && timeUntilHit >= -0.3) {
        const progress = 1 - (timeUntilHit / this.travelTime);
        const y = progress * targetY;
        const stringIdx = note.string;
        const x = stringIdx * laneWidth + laneWidth / 2;
        const noteRadius = 16;

        // Gemstone glow
        ctx.save();
        ctx.shadowColor = stringColors[stringIdx];
        ctx.shadowBlur = 15;

        // Gradient Note
        const noteGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, noteRadius);
        noteGrad.addColorStop(0, '#ffffff');
        noteGrad.addColorStop(0.4, stringColors[stringIdx]);
        noteGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = noteGrad;

        ctx.beginPath();
        ctx.arc(x, y, noteRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tampilkan nomor fret di dalam note
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(`F${note.fret}`, x, y);

        ctx.restore();
      }
    }
  }

  /**
   * Tangani input pemain saat menekan senar
   */
  handlePlayerHit(stringIdx) {
    if (!this.isPlaying) return;

    const currentTime = performance.now() / 1000;
    const songTime = currentTime - this.songStartTime;

    // Cari not terdekat pada senar ini yang belum di-hit
    let closestNote = null;
    let minTimeDiff = Infinity;

    for (const note of this.activeNotes) {
      if (note.string === stringIdx && !note.hit && !note.missed) {
        const diff = Math.abs(songTime - note.time);
        if (diff < minTimeDiff) {
          minTimeDiff = diff;
          closestNote = note;
        }
      }
    }

    if (closestNote && minTimeDiff <= this.hitWindows.miss) {
      // Not berhasil dipukul!
      closestNote.hit = true;

      // Mainkan suara gitar yang SANGAT AKURAT sesuai fret asli lagu tersebut!
      this.audio.playNote(closestNote.string, closestNote.fret, 0.95);
      this.ui.pluckString(closestNote.string, closestNote.fret, 0.95);

      // Evaluasi Timing Judgement
      if (minTimeDiff <= this.hitWindows.perfect) {
        this.registerJudgement('PERFECT', stringIdx);
      } else if (minTimeDiff <= this.hitWindows.great) {
        this.registerJudgement('GREAT', stringIdx);
      } else if (minTimeDiff <= this.hitWindows.good) {
        this.registerJudgement('GOOD', stringIdx);
      } else {
        this.registerJudgement('MISS', stringIdx);
      }
    } else {
      // Petikan senar kosong / salah waktu (Overstrum penalty)
      this.audio.playNote(stringIdx, 0, 0.6, 0, true); // Muted buzz
      this.combo = 0;
      this.multiplier = 1;
      this.rockMeter = Math.max(0, this.rockMeter - 3);
      this.showJudgementFeedback('OFF BEAT', '#ef4444');
      this.updateHUD();
    }
  }

  registerJudgement(type, stringIdx) {
    let scoreAdd = 0;
    let rockAdd = 0;
    let color = '#22c55e';

    if (type === 'PERFECT') {
      scoreAdd = 100;
      rockAdd = 4;
      this.combo++;
      color = '#eab308'; // Emas
      this.stats.perfect++;
    } else if (type === 'GREAT') {
      scoreAdd = 70;
      rockAdd = 2.5;
      this.combo++;
      color = '#06b6d4'; // Sian
      this.stats.great++;
    } else if (type === 'GOOD') {
      scoreAdd = 40;
      rockAdd = 1;
      this.combo++;
      color = '#22c55e'; // Hijau
      this.stats.good++;
    } else if (type === 'MISS') {
      scoreAdd = 0;
      rockAdd = -8;
      this.combo = 0;
      color = '#ef4444'; // Merah
      this.stats.miss++;
    }

    // Hitung Multiplier (x1 s.d x4)
    if (this.combo >= 30) this.multiplier = 4;
    else if (this.combo >= 20) this.multiplier = 3;
    else if (this.combo >= 10) this.multiplier = 2;
    else this.multiplier = 1;

    this.score += scoreAdd * this.multiplier;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.rockMeter = Math.min(100, Math.max(0, this.rockMeter + rockAdd));

    this.showJudgementFeedback(type, color);
    this.updateHUD();
  }

  showJudgementFeedback(text, color) {
    const feedbackEl = document.getElementById('judgement-display');
    if (!feedbackEl) return;

    feedbackEl.textContent = text;
    feedbackEl.style.color = color;
    feedbackEl.classList.remove('pop');
    void feedbackEl.offsetWidth; // trigger reflow
    feedbackEl.classList.add('pop');
  }

  updateHUD() {
    const scoreEl = document.getElementById('rhythm-score');
    const comboEl = document.getElementById('rhythm-combo');
    const multiEl = document.getElementById('rhythm-multiplier');
    const rockBar = document.getElementById('rock-meter-fill');

    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    if (comboEl) comboEl.textContent = `${this.combo}`;
    if (multiEl) multiEl.textContent = `x${this.multiplier}`;

    if (rockBar) {
      rockBar.style.width = `${this.rockMeter}%`;
      if (this.rockMeter < 25) {
        rockBar.style.backgroundColor = '#ef4444';
      } else if (this.rockMeter < 60) {
        rockBar.style.backgroundColor = '#eab308';
      } else {
        rockBar.style.backgroundColor = '#22c55e';
      }
    }
  }

  endSong() {
    this.stopSong();

    // Hitung akurasi persentase
    const totalNotes = this.stats.perfect + this.stats.great + this.stats.good + this.stats.miss;
    const accuracy = totalNotes > 0
      ? Math.round(((this.stats.perfect * 100 + this.stats.great * 80 + this.stats.good * 50) / (totalNotes * 100)) * 100)
      : 100;

    let rank = 'C';
    if (accuracy >= 95) rank = 'S';
    else if (accuracy >= 85) rank = 'A';
    else if (accuracy >= 70) rank = 'B';

    const victoryModal = document.getElementById('rhythm-victory-modal');
    if (victoryModal) {
      document.getElementById('victory-rank').textContent = rank;
      document.getElementById('victory-score').textContent = this.score.toLocaleString();
      document.getElementById('victory-accuracy').textContent = `${accuracy}%`;
      document.getElementById('victory-max-combo').textContent = `${this.maxCombo}`;
      document.getElementById('victory-perfect-count').textContent = `${this.stats.perfect}`;
      victoryModal.classList.add('show');
    }
  }

  gameOver() {
    this.stopSong();
    alert(`🎸 PERFORMA BERHENTI!\nEnergi panggung habis. Coba latih tempo lagu ini lagi dan raih combo lebih panjang!`);
  }

  // ==========================================
  // MODE 2: TANTANGAN CHORD (CHORD CHALLENGE)
  // ==========================================
  startChordChallenge() {
    this.chordChallengeScore = 0;
    const targetEl = document.getElementById('challenge-target-chord');
    const scoreEl = document.getElementById('challenge-score');
    if (scoreEl) scoreEl.textContent = '0';

    this.nextChordChallengeRound();
  }

  nextChordChallengeRound() {
    const chordKeys = Object.keys(GUITAR_CHORDS);
    const randomKey = chordKeys[Math.floor(Math.random() * chordKeys.length)];
    this.currentTargetChord = randomKey;

    const targetEl = document.getElementById('challenge-target-chord');
    if (targetEl) {
      targetEl.textContent = randomKey;
      targetEl.classList.remove('pop');
      void targetEl.offsetWidth;
      targetEl.classList.add('pop');
    }
  }

  checkChordChallenge(chordKey) {
    if (this.currentMode !== 'chord_challenge') return;
    if (chordKey === this.currentTargetChord) {
      this.chordChallengeScore += 100;
      const scoreEl = document.getElementById('challenge-score');
      if (scoreEl) scoreEl.textContent = `${this.chordChallengeScore}`;

      this.showJudgementFeedback('CHORD BENAR! +100', '#22c55e');
      setTimeout(() => this.nextChordChallengeRound(), 600);
    } else {
      this.showJudgementFeedback('SALAH KUNCI', '#ef4444');
    }
  }

  // ==========================================
  // MODE 3: EAR TRAINING (TEBAK NADA GITAR)
  // ==========================================
  startEarTraining() {
    this.earScore = 0;
    const scoreEl = document.getElementById('ear-train-score');
    if (scoreEl) scoreEl.textContent = '0';
    this.nextEarTrainRound();
  }

  nextEarTrainRound() {
    // Pilih senar acak (0 s.d 5) dan fret acak (0 s.d 5)
    const randomString = Math.floor(Math.random() * 6);
    const randomFret = Math.floor(Math.random() * 6);
    this.earTargetNote = { string: randomString, fret: randomFret };

    // Mainkan nadanya
    this.playEarTrainPrompt();

    // Buat opsi jawaban
    this.renderEarTrainOptions();
  }

  playEarTrainPrompt() {
    if (!this.earTargetNote) return;
    this.audio.playNote(this.earTargetNote.string, this.earTargetNote.fret, 0.95);
    this.ui.flashStringEffect(this.earTargetNote.string);
  }

  renderEarTrainOptions() {
    const container = document.getElementById('ear-options-container');
    if (!container || !this.earTargetNote) return;

    container.innerHTML = '';
    const correctName = this.audio.getNoteName(this.earTargetNote.string, this.earTargetNote.fret);

    // Kumpulkan opsi nama not
    const options = new Set([correctName]);
    const allNoteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    while (options.size < 4) {
      const randN = allNoteNames[Math.floor(Math.random() * allNoteNames.length)] + (2 + Math.floor(Math.random() * 3));
      options.add(randN);
    }

    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);

    shuffled.forEach(optName => {
      const btn = document.createElement('button');
      btn.className = 'ear-opt-btn';
      btn.textContent = optName;
      btn.addEventListener('click', () => {
        if (optName === correctName) {
          this.earScore += 50;
          const scoreEl = document.getElementById('ear-train-score');
          if (scoreEl) scoreEl.textContent = `${this.earScore}`;
          btn.style.backgroundColor = '#22c55e';
          setTimeout(() => this.nextEarTrainRound(), 600);
        } else {
          btn.style.backgroundColor = '#ef4444';
        }
      });
      container.appendChild(btn);
    });
  }
}
