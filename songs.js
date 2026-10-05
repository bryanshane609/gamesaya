/**
 * DATABASE LAGU-LAGU GITAR POPULER & AKURAT
 * Berisi tabulasi dan not-not gitar nyata untuk mode Rhythm Hero & Tab Learner.
 * Senar:
 * 0 = Senar 6 (E rendah)
 * 1 = Senar 5 (A)
 * 2 = Senar 4 (D)
 * 3 = Senar 3 (G)
 * 4 = Senar 2 (B)
 * 5 = Senar 1 (E tinggi)
 */

const GUITAR_SONGS = [
  {
    id: 'sweet_child',
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    difficulty: "Sedang",
    genre: "Rock Klasik",
    recommendedGuitar: "electric-rock",
    bpm: 125,
    description: "Riff gitar paling ikonik sepanjang masa oleh Slash dengan senar 4, 2, dan 3.",
    notes: [
      // Riff intro pembuka ikonik (D4 -> D5 -> A4 -> G4 -> G5 -> G4 -> F#5 -> G4)
      { time: 1.0, string: 2, fret: 12, name: "D4" },
      { time: 1.5, string: 4, fret: 15, name: "D5" },
      { time: 2.0, string: 3, fret: 14, name: "A4" },
      { time: 2.5, string: 3, fret: 12, name: "G4" },
      { time: 3.0, string: 5, fret: 15, name: "G5" },
      { time: 3.5, string: 3, fret: 14, name: "A4" },
      { time: 4.0, string: 5, fret: 14, name: "F#5" },
      { time: 4.5, string: 3, fret: 14, name: "A4" },

      // Bar 2 (ulang motif pertama)
      { time: 5.0, string: 2, fret: 12, name: "D4" },
      { time: 5.5, string: 4, fret: 15, name: "D5" },
      { time: 6.0, string: 3, fret: 14, name: "A4" },
      { time: 6.5, string: 3, fret: 12, name: "G4" },
      { time: 7.0, string: 5, fret: 15, name: "G5" },
      { time: 7.5, string: 3, fret: 14, name: "A4" },
      { time: 8.0, string: 5, fret: 14, name: "F#5" },
      { time: 8.5, string: 3, fret: 14, name: "A4" },

      // Bar 3 (variasi fret 14 senar 4)
      { time: 9.0, string: 2, fret: 14, name: "E4" },
      { time: 9.5, string: 4, fret: 15, name: "D5" },
      { time: 10.0, string: 3, fret: 14, name: "A4" },
      { time: 10.5, string: 3, fret: 12, name: "G4" },
      { time: 11.0, string: 5, fret: 15, name: "G5" },
      { time: 11.5, string: 3, fret: 14, name: "A4" },
      { time: 12.0, string: 5, fret: 14, name: "F#5" },
      { time: 12.5, string: 3, fret: 14, name: "A4" },

      // Bar 4 (variasi fret 12 senar 3)
      { time: 13.0, string: 3, fret: 12, name: "G4" },
      { time: 13.5, string: 4, fret: 15, name: "D5" },
      { time: 14.0, string: 3, fret: 14, name: "A4" },
      { time: 14.5, string: 3, fret: 12, name: "G4" },
      { time: 15.0, string: 5, fret: 15, name: "G5" },
      { time: 15.5, string: 3, fret: 14, name: "A4" },
      { time: 16.0, string: 5, fret: 14, name: "F#5" },
      { time: 16.5, string: 3, fret: 14, name: "A4" }
    ]
  },
  {
    id: 'nothing_else',
    title: "Nothing Else Matters",
    artist: "Metallica",
    difficulty: "Mudah",
    genre: "Acoustic Fingerstyle",
    recommendedGuitar: "nylon",
    bpm: 95,
    description: "Intro petikan senar terbuka (open strings) 6, 3, 2, 1 yang sangat terkenal.",
    notes: [
      // Motif senar terbuka: 6 -> 3 -> 2 -> 1 -> 2 -> 3
      { time: 1.0, string: 0, fret: 0, name: "E2" },
      { time: 1.6, string: 3, fret: 0, name: "G3" },
      { time: 2.2, string: 4, fret: 0, name: "B3" },
      { time: 2.8, string: 5, fret: 0, name: "E4" },
      { time: 3.4, string: 4, fret: 0, name: "B3" },
      { time: 4.0, string: 3, fret: 0, name: "G3" },

      // Ulang motif
      { time: 4.8, string: 0, fret: 0, name: "E2" },
      { time: 5.4, string: 3, fret: 0, name: "G3" },
      { time: 6.0, string: 4, fret: 0, name: "B3" },
      { time: 6.6, string: 5, fret: 0, name: "E4" },
      { time: 7.2, string: 4, fret: 0, name: "B3" },
      { time: 7.8, string: 3, fret: 0, name: "G3" },

      // Frasa melodi fret 7 senar 1
      { time: 8.6, string: 5, fret: 7, name: "B4" },
      { time: 9.4, string: 5, fret: 0, name: "E4" },
      { time: 10.2, string: 5, fret: 7, name: "B4" },
      { time: 11.0, string: 5, fret: 8, name: "C5" },
      { time: 11.6, string: 5, fret: 7, name: "B4" },
      { time: 12.2, string: 5, fret: 5, name: "A4" },
      { time: 13.0, string: 5, fret: 7, name: "B4" },
      { time: 13.8, string: 5, fret: 0, name: "E4" },
      { time: 14.6, string: 4, fret: 0, name: "B3" },
      { time: 15.2, string: 3, fret: 0, name: "G3" }
    ]
  },
  {
    id: 'canon_in_d',
    title: "Canon in D",
    artist: "Johann Pachelbel",
    difficulty: "Sedang",
    genre: "Klasik / Akustik",
    recommendedGuitar: "acoustic-steel",
    bpm: 85,
    description: "Melodi klasik yang sangat syahdu dengan petikan akustik bertingkat.",
    notes: [
      // Melodi D - A - Bm - F#m - G - D - G - A
      { time: 1.0, string: 5, fret: 2, name: "F#4" },
      { time: 1.8, string: 5, fret: 0, name: "E4" },
      { time: 2.6, string: 4, fret: 3, name: "D4" },
      { time: 3.4, string: 4, fret: 2, name: "C#4" },
      { time: 4.2, string: 4, fret: 0, name: "B3" },
      { time: 5.0, string: 3, fret: 2, name: "A3" },
      { time: 5.8, string: 4, fret: 0, name: "B3" },
      { time: 6.6, string: 4, fret: 2, name: "C#4" },

      // Variasi nada tinggi
      { time: 7.6, string: 5, fret: 5, name: "A4" },
      { time: 8.2, string: 5, fret: 3, name: "G4" },
      { time: 8.8, string: 5, fret: 2, name: "F#4" },
      { time: 9.4, string: 5, fret: 0, name: "E4" },
      { time: 10.0, string: 4, fret: 3, name: "D4" },
      { time: 10.6, string: 4, fret: 2, name: "C#4" },
      { time: 11.2, string: 4, fret: 0, name: "B3" },
      { time: 11.8, string: 4, fret: 2, name: "C#4" },
      { time: 12.6, string: 4, fret: 3, name: "D4" },
      { time: 13.4, string: 5, fret: 2, name: "F#4" },
      { time: 14.2, string: 5, fret: 5, name: "A4" }
    ]
  },
  {
    id: 'smoke_water',
    title: "Smoke on the Water",
    artist: "Deep Purple",
    difficulty: "Mudah",
    genre: "Hard Rock",
    recommendedGuitar: "electric-rock",
    bpm: 112,
    description: "Riff double-stop paling legendaris dalam sejarah musik rock.",
    notes: [
      // 0 - 3 - 5
      { time: 1.0, string: 2, fret: 0, name: "D3" },
      { time: 1.8, string: 2, fret: 3, name: "F3" },
      { time: 2.6, string: 2, fret: 5, name: "G3" },

      // 0 - 3 - 6 - 5
      { time: 3.8, string: 2, fret: 0, name: "D3" },
      { time: 4.6, string: 2, fret: 3, name: "F3" },
      { time: 5.3, string: 2, fret: 6, name: "Ab3" },
      { time: 5.9, string: 2, fret: 5, name: "G3" },

      // 0 - 3 - 5 - 3 - 0
      { time: 7.2, string: 2, fret: 0, name: "D3" },
      { time: 8.0, string: 2, fret: 3, name: "F3" },
      { time: 8.8, string: 2, fret: 5, name: "G3" },
      { time: 9.8, string: 2, fret: 3, name: "F3" },
      { time: 10.6, string: 2, fret: 0, name: "D3" }
    ]
  },
  {
    id: 'bengawan_solo',
    title: "Bengawan Solo",
    artist: "Gesang",
    difficulty: "Sedang",
    genre: "Keroncong / Fingerstyle",
    recommendedGuitar: "nylon",
    bpm: 80,
    description: "Karya agung legendaris Nusantara dengan petikan lembut melodi khas keroncong.",
    notes: [
      // Be - nga - wan - So - lo
      { time: 1.0, string: 3, fret: 0, name: "G3" },
      { time: 1.6, string: 3, fret: 2, name: "A3" },
      { time: 2.2, string: 4, fret: 0, name: "B3" },
      { time: 3.0, string: 4, fret: 1, name: "C4" },
      { time: 3.8, string: 4, fret: 3, name: "D4" },

      // Ri - wa - yat - mu - i - ni
      { time: 4.8, string: 4, fret: 1, name: "C4" },
      { time: 5.4, string: 4, fret: 0, name: "B3" },
      { time: 6.0, string: 3, fret: 2, name: "A3" },
      { time: 6.8, string: 3, fret: 0, name: "G3" },
      { time: 7.6, string: 2, fret: 2, name: "E3" },
      { time: 8.4, string: 2, fret: 0, name: "D3" },

      // Se - da - ri - du - lu
      { time: 9.4, string: 2, fret: 0, name: "D3" },
      { time: 10.0, string: 2, fret: 2, name: "E3" },
      { time: 10.6, string: 3, fret: 0, name: "G3" },
      { time: 11.4, string: 3, fret: 2, name: "A3" },
      { time: 12.2, string: 4, fret: 0, name: "B3" },
      { time: 13.0, string: 4, fret: 1, name: "C4" },
      { time: 14.0, string: 4, fret: 0, name: "B3" },
      { time: 14.8, string: 3, fret: 2, name: "A3" },
      { time: 15.6, string: 3, fret: 0, name: "G3" }
    ]
  },
  {
    id: 'hotel_california',
    title: "Hotel California (Intro)",
    artist: "Eagles",
    difficulty: "Ahli",
    genre: "Spanish Acoustic",
    recommendedGuitar: "acoustic-steel",
    bpm: 78,
    description: "Intro arpeggio 12-string legendaris yang penuh nuansa mistis.",
    notes: [
      // Bm arpeggio: Senar 5 -> 3 -> 2 -> 1
      { time: 1.0, string: 1, fret: 2, name: "B2" },
      { time: 1.5, string: 3, fret: 4, name: "B3" },
      { time: 2.0, string: 4, fret: 3, name: "D4" },
      { time: 2.5, string: 5, fret: 2, name: "F#4" },
      { time: 3.0, string: 4, fret: 3, name: "D4" },
      { time: 3.5, string: 3, fret: 4, name: "B3" },

      // F#7
      { time: 4.2, string: 0, fret: 2, name: "F#2" },
      { time: 4.7, string: 3, fret: 3, name: "A#3" },
      { time: 5.2, string: 4, fret: 2, name: "C#4" },
      { time: 5.7, string: 5, fret: 2, name: "F#4" },
      { time: 6.2, string: 4, fret: 2, name: "C#4" },

      // A
      { time: 7.0, string: 1, fret: 0, name: "A2" },
      { time: 7.5, string: 3, fret: 2, name: "A3" },
      { time: 8.0, string: 4, fret: 2, name: "C#4" },
      { time: 8.5, string: 5, fret: 0, name: "E4" },

      // E
      { time: 9.4, string: 0, fret: 0, name: "E2" },
      { time: 9.9, string: 3, fret: 1, name: "G#3" },
      { time: 10.4, string: 4, fret: 0, name: "B3" },
      { time: 10.9, string: 5, fret: 0, name: "E4" },

      // G
      { time: 11.8, string: 0, fret: 3, name: "G2" },
      { time: 12.3, string: 3, fret: 0, name: "G3" },
      { time: 12.8, string: 4, fret: 0, name: "B3" },
      { time: 13.3, string: 5, fret: 3, name: "G4" },

      // D
      { time: 14.2, string: 2, fret: 0, name: "D3" },
      { time: 14.7, string: 3, fret: 2, name: "A3" },
      { time: 15.2, string: 4, fret: 3, name: "D4" },
      { time: 15.7, string: 5, fret: 2, name: "F#4" }
    ]
  }
];

/**
 * DATABASE CHORD GITAR STANDAR
 * Array 6 angka: [Senar 6, Senar 5, Senar 4, Senar 3, Senar 2, Senar 1]
 * -1 berarti senar tidak dibunyikan (Mute/X), 0 berarti senar lepas (open).
 */
const GUITAR_CHORDS = {
  'C': {
    name: 'C Major',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: ['X', '3', '2', '0', '1', '0'],
    bassString: 1
  },
  'G': {
    name: 'G Major',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: ['2', '1', '0', '0', '0', '3'],
    bassString: 0
  },
  'Am': {
    name: 'A Minor',
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: ['X', '0', '2', '3', '1', '0'],
    bassString: 1
  },
  'Em': {
    name: 'E Minor',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: ['0', '1', '2', '0', '0', '0'],
    bassString: 0
  },
  'F': {
    name: 'F Major (Barre)',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: ['1', '3', '4', '2', '1', '1'],
    bassString: 0
  },
  'D': {
    name: 'D Major',
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: ['X', 'X', '0', '1', '3', '2'],
    bassString: 2
  },
  'Dm': {
    name: 'D Minor',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: ['X', 'X', '0', '2', '3', '1'],
    bassString: 2
  },
  'E': {
    name: 'E Major',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: ['0', '2', '3', '1', '0', '0'],
    bassString: 0
  },
  'A': {
    name: 'A Major',
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: ['X', '0', '1', '2', '3', '0'],
    bassString: 1
  },
  'Bm': {
    name: 'B Minor (Barre)',
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: ['X', '1', '3', '4', '2', '1'],
    bassString: 1
  }
};
