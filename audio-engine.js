/**
 * REALISTIC GUITAR AUDIO SYNTHESIS ENGINE
 * Menggunakan Extended Karplus-Strong Physical Modeling,
 * Resonansi Ruang Suara Kayu (Acoustic Body Cavity Resonance),
 * String Inharmonicity, Dynamic Tension Twang, dan Amp Emulation.
 */

class RealisticGuitarAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.85;

    // Standard Guitar Tuning (Fret 0: E2, A2, D3, G3, B3, E4)
    // String index 0 = Low E (String 6), index 5 = High E (String 1)
    this.stringBaseFreqs = [
      82.407,  // String 6: E2
      110.000, // String 5: A2
      146.832, // String 4: D3
      195.998, // String 3: G3
      246.942, // String 2: B3
      329.628  // String 1: E4
    ];

    this.stringNames = ['E2 (Senar 6)', 'A2 (Senar 5)', 'D3 (Senar 4)', 'G3 (Senar 3)', 'B3 (Senar 2)', 'E4 (Senar 1)'];

    // Preset Nada Suara: 'acoustic-steel' | 'nylon' | 'electric-clean' | 'electric-rock'
    this.guitarType = 'acoustic-steel';

    // Efek
    this.effects = {
      reverb: 0.35,
      chorus: 0.15,
      distortion: 0.0,
      tone: 0.75
    };

    // Buffer Cache untuk zero-latency playback
    this.bufferCache = new Map();
    this.activeVoices = [];

    // Master nodes
    this.masterGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.cabinetFilter = null;
    this.bodyResonator = null;
    this.distortionNode = null;

    // Analyser untuk visualizer waveform
    this.analyser = null;

    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.setupAudioGraph();
    this.isInitialized = true;
  }

  setupAudioGraph() {
    const ctx = this.ctx;

    // Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);

    // Analyser untuk Visualisasi Frekuensi & Gelombang
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    // Distortion Waveshaper
    this.distortionNode = ctx.createWaveShaper();
    this.updateDistortionCurve();

    // Guitar Cabinet / Speaker Emulation Filter (untuk Electric & Acoustic)
    this.cabinetFilter = ctx.createBiquadFilter();
    this.cabinetFilter.type = 'lowpass';
    this.cabinetFilter.frequency.setValueAtTime(6200, ctx.currentTime);
    this.cabinetFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    // Tone Control (High shelf)
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'highshelf';
    this.toneFilter.frequency.setValueAtTime(2800, ctx.currentTime);
    this.toneFilter.gain.setValueAtTime(0, ctx.currentTime);

    // Acoustic Body Resonators (Helmholtz 104Hz + Soundboard 208Hz)
    this.helmholtzFilter = ctx.createBiquadFilter();
    this.helmholtzFilter.type = 'peaking';
    this.helmholtzFilter.frequency.setValueAtTime(104, ctx.currentTime);
    this.helmholtzFilter.Q.setValueAtTime(4.0, ctx.currentTime);
    this.helmholtzFilter.gain.setValueAtTime(4.5, ctx.currentTime);

    this.soundboardFilter = ctx.createBiquadFilter();
    this.soundboardFilter.type = 'peaking';
    this.soundboardFilter.frequency.setValueAtTime(208, ctx.currentTime);
    this.soundboardFilter.Q.setValueAtTime(3.5, ctx.currentTime);
    this.soundboardFilter.gain.setValueAtTime(3.8, ctx.currentTime);

    // Convolver Reverb untuk Resonansi Ruang Badan Gitar
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.generateBodyImpulseResponse(ctx, 1.8, 0.04);

    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.effects.reverb, ctx.currentTime);

    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1 - this.effects.reverb * 0.5, ctx.currentTime);

    // Koneksi Node
    // [Source] -> [Distortion] -> [Tone] -> [Helmholtz] -> [Soundboard] -> [Cabinet]
    //   -> Dry -> Master
    //   -> Reverb -> ReverbGain -> Master
    this.distortionNode.connect(this.toneFilter);
    this.toneFilter.connect(this.helmholtzFilter);
    this.helmholtzFilter.connect(this.soundboardFilter);
    this.soundboardFilter.connect(this.cabinetFilter);

    this.cabinetFilter.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);

    this.cabinetFilter.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  // Buat kurva distorsi hangat untuk electric guitar rock
  updateDistortionCurve() {
    if (!this.ctx || !this.distortionNode) return;
    const amount = this.effects.distortion;
    if (amount <= 0.01) {
      // Linear passthrough
      const linearCurve = new Float32Array(2);
      linearCurve[0] = -1;
      linearCurve[1] = 1;
      this.distortionNode.curve = linearCurve;
      return;
    }

    const k = amount * 35;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft tube clipping curve with asymmetric harmonic richness
      if (x < -0.08) {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)) - 0.05 * Math.sin(Math.PI * x);
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    this.distortionNode.curve = curve;
  }

  // Menghasilkan Impulse Response Badan Akustik Kayu (Wood Body Impulse)
  generateBodyImpulseResponse(ctx, duration = 1.6, decay = 0.05) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Resonansi badan kayu: frekuensi mode akustik (100Hz, 195Hz, 380Hz, 720Hz)
    const modes = [
      { f: 98, d: 0.12, a: 0.4 },
      { f: 196, d: 0.09, a: 0.5 },
      { f: 392, d: 0.06, a: 0.35 },
      { f: 780, d: 0.04, a: 0.2 },
      { f: 1400, d: 0.02, a: 0.1 }
    ];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sampleL = 0;
      let sampleR = 0;

      // Resonansi modal badan gitar
      for (const m of modes) {
        const env = Math.exp(-t / m.d);
        sampleL += Math.sin(2 * Math.PI * m.f * t) * env * m.a;
        sampleR += Math.sin(2 * Math.PI * m.f * t + 0.3) * env * m.a;
      }

      // Difusi pantulan kayu akustik awal (Early reflections)
      const noiseEnv = Math.exp(-t / decay);
      const noiseL = (Math.random() * 2 - 1) * noiseEnv * 0.15;
      const noiseR = (Math.random() * 2 - 1) * noiseEnv * 0.15;

      left[i] = (sampleL * 0.35 + noiseL);
      right[i] = (sampleR * 0.35 + noiseR);
    }

    return impulse;
  }

  setGuitarType(type) {
    this.guitarType = type;
    this.bufferCache.clear(); // Bersihkan cache buffer saat berganti karakter gitar

    if (!this.ctx) return;

    if (type === 'acoustic-steel') {
      this.effects.distortion = 0.0;
      this.effects.tone = 0.8;
      this.effects.reverb = 0.3;
      this.cabinetFilter.frequency.setValueAtTime(7500, this.ctx.currentTime);
      this.soundboardFilter.gain.setValueAtTime(4.2, this.ctx.currentTime);
      this.helmholtzFilter.gain.setValueAtTime(4.5, this.ctx.currentTime);
    } else if (type === 'nylon') {
      this.effects.distortion = 0.0;
      this.effects.tone = 0.45;
      this.effects.reverb = 0.35;
      this.cabinetFilter.frequency.setValueAtTime(5000, this.ctx.currentTime);
      this.soundboardFilter.gain.setValueAtTime(5.5, this.ctx.currentTime);
      this.helmholtzFilter.gain.setValueAtTime(3.8, this.ctx.currentTime);
    } else if (type === 'electric-clean') {
      this.effects.distortion = 0.03;
      this.effects.tone = 0.7;
      this.effects.reverb = 0.25;
      this.cabinetFilter.frequency.setValueAtTime(5200, this.ctx.currentTime);
      this.soundboardFilter.gain.setValueAtTime(1.5, this.ctx.currentTime);
      this.helmholtzFilter.gain.setValueAtTime(1.5, this.ctx.currentTime);
    } else if (type === 'electric-rock') {
      this.effects.distortion = 0.55;
      this.effects.tone = 0.85;
      this.effects.reverb = 0.28;
      this.cabinetFilter.frequency.setValueAtTime(4200, this.ctx.currentTime);
      this.soundboardFilter.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.helmholtzFilter.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }

    this.updateDistortionCurve();
    this.reverbGain.gain.setValueAtTime(this.effects.reverb, this.ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - this.effects.reverb * 0.4, this.ctx.currentTime);
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  setEffectParam(name, val) {
    if (this.effects.hasOwnProperty(name)) {
      this.effects[name] = val;
      if (!this.ctx) return;

      if (name === 'distortion') {
        this.updateDistortionCurve();
      } else if (name === 'reverb') {
        this.reverbGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.02);
        this.dryGain.gain.setTargetAtTime(1 - val * 0.4, this.ctx.currentTime, 0.02);
      } else if (name === 'tone') {
        const gainVal = (val - 0.5) * 14; // -7dB s.d +7dB
        this.toneFilter.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.02);
      }
    }
  }

  /**
   * Hitung frekuensi eksak untuk senar (0=E2 s.d 5=E4) dan fret (0 s.d 15)
   */
  getNoteFrequency(stringIdx, fret) {
    const baseFreq = this.stringBaseFreqs[stringIdx];
    return baseFreq * Math.pow(2, fret / 12);
  }

  /**
   * Dapatkan nama not musik (e.g. "E2", "C3", "G#4")
   */
  getNoteName(stringIdx, fret) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // MIDI note untuk open string:
    // E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
    const baseMidi = [40, 45, 50, 55, 59, 64][stringIdx];
    const midi = baseMidi + fret;
    const note = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
  }

  /**
   * Sintesis Extended Karplus-Strong AudioBuffer dengan Akurasi Fisik Tinggi:
   * - Fractional delay all-pass interpolation (tuning mikro-senar)
   * - Pick comb filter (posisi petikan senar dekat bridge/soundhole)
   * - Pink noise burst + metallic scrape untuk senar berbalut kawat (E, A, D)
   * - Inharmonicity factor (kekakuan senar baja)
   * - Frequency-dependent damping (nada tinggi meluruh lebih cepat dari nada rendah)
   */
  synthesizeKarplusStrongNote(freq, stringIdx, fret, duration = 3.5) {
    const sampleRate = this.ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const audioBuffer = this.ctx.createBuffer(2, numSamples, sampleRate);
    const leftData = audioBuffer.getChannelData(0);
    const rightData = audioBuffer.getChannelData(1);

    // Parameter Fisik berdasarkan jenis senar dan tipe gitar
    const isWoundString = stringIdx <= 2; // Senar 6, 5, 4 (E2, A2, D3) berulir kawat bronze/nickel
    const isHighString = stringIdx >= 4;  // Senar 2, 1 (B3, E4) kawat baja polos

    // Faktor sustain & redaman
    let baseSustain = 0.9968;
    if (this.guitarType === 'nylon') baseSustain = 0.993; // Nylon meluruh lebih cepat
    if (this.guitarType === 'electric-rock') baseSustain = 0.9985; // Sustain panjang distorsi

    // Fret lebih tinggi memiliki panjang senar lebih pendek dan meluruh sedikit lebih cepat
    const fretDamp = 1.0 - (fret * 0.0022);
    const decay = baseSustain * fretDamp;

    // Hitung panjang delay periodik dalam sampel
    // f_n = f_0 * (1 + B * n^2) inharmonicity
    const inharmonicity = isHighString ? 0.00015 : 0.00004;
    const effectiveFreq = freq * (1 + inharmonicity);
    const delayLength = sampleRate / effectiveFreq;
    const integerDelay = Math.floor(delayLength);
    const fracDelay = delayLength - integerDelay;

    // Koefisien Allpass Filter untuk Fractional Delay presisi pecahan sampel
    // H(z) = (C + z^-1) / (1 + C * z^-1), di mana C = (1 - D) / (1 + D)
    const C = (1 - fracDelay) / (1 + fracDelay);

    // Posisi petikan (pluck position beta): ~1/6 hingga 1/7 panjang senar
    const pluckBeta = 0.17;
    const combDelay = Math.max(1, Math.floor(delayLength * pluckBeta));

    // Ring buffer untuk delay line
    const delayBuffer = new Float32Array(integerDelay + 4);
    let delayIdx = 0;

    // Buffer tambahan untuk comb filter eksitasi
    const excitationLength = Math.max(integerDelay, 128);
    const excitation = new Float32Array(excitationLength);

    // Bangkitkan derau awal petikan (Pick Attack Excitation)
    // Karakter: Campuran pink noise berbobot + transient plectrum click
    let b0 = 0, b1 = 0, b2 = 0; // Pink noise filter states
    for (let i = 0; i < excitationLength; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let pink = b0 + b1 + b2 + white * 0.5362;

      // Jika senar berbalut kawat (E2, A2, D3), tambahkan gesekan kawat metalik (wire scrape)
      if (isWoundString) {
        pink += (Math.random() - 0.5) * 0.45 * Math.sin((i / 4) * Math.PI);
      }

      // Bentuk envelope amplop eksitasi segitiga pendek (Pick transient)
      const env = (1 - (i / excitationLength));
      excitation[i] = pink * env;
    }

    // Terapkan comb filter petikan: x[n] - x[n - combDelay]
    for (let i = 0; i < integerDelay; i++) {
      const pastIdx = (i - combDelay + excitationLength) % excitationLength;
      delayBuffer[i] = (excitation[i % excitationLength] - 0.85 * excitation[pastIdx]);
    }

    // Dynamic tension twang: saat senar dipetik kuat, frekuensi awal naik ~15 cent selama 25ms
    const twangSamples = Math.floor(sampleRate * 0.035);

    // Loop filter variables (Two-point lowpass FIR + Allpass fractional delay)
    let prevSample = 0;
    let allpassInPrev = 0;
    let allpassOutPrev = 0;

    // Lowpass Damping Filter Coeff (S)
    // S mengontrol seberapa cepat harmonik tinggi teredam
    let S = isHighString ? 0.38 : 0.48;
    if (this.guitarType === 'nylon') S = 0.54; // Nylon lebih tumpul

    for (let n = 0; n < numSamples; n++) {
      // Ambil sampel dari delay line
      const curr = delayBuffer[delayIdx];

      // Two-point Lowpass Loop Filter: y[n] = (1 - S)*x[n] + S*x[n-1]
      const filtered = (1 - S) * curr + S * prevSample;
      prevSample = curr;

      // Fractional Delay Allpass Filter: y[n] = C * x[n] + x[n-1] - C * y[n-1]
      const allpassOut = C * filtered + allpassInPrev - C * allpassOutPrev;
      allpassInPrev = filtered;
      allpassOutPrev = allpassOut;

      // Decay sustain
      let feedback = allpassOut * decay;

      // Simulasikan pitch relax dari tension twang di awal
      if (n < twangSamples) {
        const twangFactor = (1 - n / twangSamples) * 0.08;
        feedback *= (1 - twangFactor * 0.02);
      }

      delayBuffer[delayIdx] = feedback;
      delayIdx = (delayIdx + 1) % integerDelay;

      // Berikan sedikit perbedaan stereo yang natural (ruang gitar akustik)
      const sampleOut = allpassOut;
      leftData[n] = sampleOut;
      rightData[n] = sampleOut * 0.98 + (n > 8 ? leftData[n - 8] * 0.08 : 0);
    }

    return audioBuffer;
  }

  /**
   * Mainkan not petikan gitar tunggal atau bagian dari chord
   * @param {number} stringIdx 0 (Low E) s.d 5 (High E)
   * @param {number} fret 0 (Open) s.d 15
   * @param {number} velocity 0.1 s.d 1.0 (kekuatan petikan)
   * @param {number} delaySec Waktu jeda (misal untuk efek genjrengan / strumming delay)
   */
  async playNote(stringIdx, fret, velocity = 0.8, delaySec = 0, isMutedString = false) {
    if (this.isMuted) return;

    if (!this.isInitialized) {
      await this.init();
    }

    const freq = this.getNoteFrequency(stringIdx, fret);
    const cacheKey = `${this.guitarType}_${stringIdx}_${fret}_${isMutedString ? 'muted' : 'open'}`;

    let buffer = this.bufferCache.get(cacheKey);
    if (!buffer) {
      const duration = isMutedString ? 0.6 : (stringIdx <= 2 ? 4.2 : 3.2);
      buffer = this.synthesizeKarplusStrongNote(freq, stringIdx, fret, duration);
      this.bufferCache.set(cacheKey, buffer);
    }

    const ctx = this.ctx;
    const startTime = ctx.currentTime + Math.max(0, delaySec);

    // AudioBufferSourceNode
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Gain node untuk not ini
    const noteGain = ctx.createGain();
    const targetVolume = Math.min(1.0, velocity * (isMutedString ? 0.5 : 1.0));
    noteGain.gain.setValueAtTime(targetVolume, startTime);

    // Sedikit variasi petikan acak (humanization)
    const pitchDetune = (Math.random() - 0.5) * 8; // +-4 cent
    source.detune.setValueAtTime(pitchDetune, startTime);

    if (isMutedString) {
      // Palm mute: redam cepat dalam 180ms
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
    }

    // Hubungkan ke distortion/efek chain
    source.connect(noteGain);
    noteGain.connect(this.distortionNode);

    source.start(startTime);

    // Rekam suara aktif untuk penghentian jika senar disentuh ulang
    const voiceInfo = {
      stringIdx,
      fret,
      source,
      gain: noteGain,
      startTime
    };
    this.activeVoices.push(voiceInfo);

    // Bersihkan referensi setelah selesai
    source.onended = () => {
      const idx = this.activeVoices.indexOf(voiceInfo);
      if (idx !== -1) {
        this.activeVoices.splice(idx, 1);
      }
    };

    return voiceInfo;
  }

  /**
   * Genjreng (Strum) beberapa senar sekaligus seperti gitar asli
   * @param {Array<number>} chordFrets Array 6 angka: fret tiap senar [E2, A2, D3, G3, B3, E4] (atau -1 jika senar dimatikan/X)
   * @param {string} direction 'down' (Downstroke senar 6 -> 1) atau 'up' (Upstroke senar 1 -> 6)
   * @param {number} speedKecepatan Waktu total genjrengan dalam ms (e.g. 35ms - 120ms)
   * @param {number} velocity Kekuatan petikan
   */
  async strumChord(chordFrets, direction = 'down', speedMs = 55, velocity = 0.85) {
    if (!this.isInitialized) {
      await this.init();
    }

    const order = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    const stringDelayStep = (speedMs / 1000) / 6;

    let delayAcc = 0;
    const playedNotes = [];

    for (let i = 0; i < order.length; i++) {
      const stringIdx = order[i];
      const fret = chordFrets[stringIdx];

      if (fret !== undefined && fret >= 0) {
        // Dinamika genjrengan: downstroke sedikit lebih kuat pada bass, upstroke pada treble
        let noteVel = velocity;
        if (direction === 'down') {
          noteVel *= (1.0 - i * 0.035);
        } else {
          noteVel *= (0.85 + i * 0.03);
        }

        this.playNote(stringIdx, fret, noteVel, delayAcc);
        playedNotes.push({ stringIdx, fret, delay: delayAcc });
      }

      delayAcc += stringDelayStep;
    }

    return playedNotes;
  }

  /**
   * Efek redam senar (Mute / Dampen all active strings)
   */
  dampenAllStrings() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      } catch (e) {}
    }
  }

  /**
   * Redam senar tertentu saja
   */
  dampenString(stringIdx) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      if (voice.stringIdx === stringIdx) {
        try {
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
          voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        } catch (e) {}
      }
    }
  }
}

// Instance global
window.guitarAudio = new RealisticGuitarAudioEngine();
