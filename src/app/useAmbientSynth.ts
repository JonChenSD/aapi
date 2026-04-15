"use client";

import { useCallback, useEffect, useRef } from "react";

// Ambient arpeggio – Poly-800 style: overlapping notes, chorus-like detune, more reverb
const BPM = 56;
const ARP_INTERVAL = 60 / BPM; // notes overlap; next starts while previous is still fading
export const ARP_INTERVAL_SECONDS = ARP_INTERVAL;
export const ADVANCE_EVERY_BEATS = 2; // advance one slot every N arp beats (spawn in tempo)
export const IMAGE_HOLD_BEATS = 2;     // image holds until next chord (2 arp counts)
export const IMAGE_FADE_BEATS = 6;    // then fades out over 6 arp counts
const MASTER_GAIN = 0.09;
const ATTACK = 0.05;
const SUSTAIN = 0.18;
const RELEASE = 2.4;    // long fade, let notes overlap
const NOTE_DURATION = ATTACK + SUSTAIN + RELEASE;
const DETUNE_CENTS = 7;   // second osc for Poly-800 chorus thickness
const DELAY_TIME = 0.38;
const DELAY_FEEDBACK = 0.4;
const DELAY_MIX = 0.22;
const REVERB_MIX = 0.48;  // more reverb
const REVERB_DECAY = 2.2; // seconds

// Am7 arpeggio – gentle, low register
const ARP_NOTES = [110, 130.81, 164.81, 196, 130.81, 164.81, 196, 220];

// Spawn chords – alternating melody alongside arpeggio (Yoshimura-style)
// Cmaj7, Fmaj7, Am7, Em7 – gentle progression
const SPAWN_CHORDS: number[][] = [
  [523.25, 659.25, 783.99, 987.77],   // C5 E5 G5 B5  (Cmaj7)
  [349.23, 523.25, 659.25, 783.99],   // F4 C5 E5 G5  (Fmaj7)
  [220, 261.63, 329.63, 392],         // A3 C4 E4 G4  (Am7)
  [164.81, 196, 246.94, 293.66],      // E3 G3 B3 D4 (Em7)
];
const SPAWN_ATTACK = 0.02;
const SPAWN_HOLD = 0.35;
const SPAWN_RELEASE = 1.5;
export const SPAWN_CHORD_DURATION = SPAWN_ATTACK + SPAWN_HOLD + SPAWN_RELEASE; // for synced image animation
const SPAWN_NOTE_STAGGER = 0.032;
const SPAWN_GAIN = 0.14;
const SPAWN_REVERB_ONLY = 0.82; // mostly reverb so it sits in background

// Background pad – Kokubo/Yoshimura style: slow bloom, chorus shimmer, reverb as architecture
const PAD_ATTACK_S = 5;            // bloom in over 5s – "always-already-there", no event
const PAD_SMOOTH = 0.022;         // gentle pitch drift with cursor
const PAD_GAIN = 0.078;            // per-voice level – more noticeable
const PAD_FIFTH_GAIN = 0.14;       // fifth above (open voicing) – subtle
// Chorus: slight detune for width without motion (Juno-style)
const PAD_DETUNE_CENTS = [-5, 0, 8];  // three voices
const PAD_LONG_REVERB_DECAY = 10;  // 10s – reverb tail is the sustained sound
const PAD_DRY_MIX = 0.12;          // a bit more dry so pad is more present
// A minor scale, low register – open, floating (A1, C2, D2, E2, G2, A2)
const PAD_SCALE_HZ = [55, 65.41, 73.42, 82.41, 98, 110];
const PAD_NOISE_GAIN = 0.052;       // water layer – blends with reverb tail
const PAD_NOISE_RUMBLE_GAIN = 0.042;
const WATER_LFO_RATE = 0.18;
const WATER_BANDPASS_CENTER = 380;
const WATER_BANDPASS_WIDTH = 240;

function createNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Pink-ish noise (1/f-ish) for softer, water-like texture */
function createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    data[i] = (b0 + b1 + b2) / 3;
  }
  return buffer;
}

function createReverbIR(ctx: AudioContext, decaySeconds: number, maxLengthSeconds: number = 3): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.min(sampleRate * decaySeconds, sampleRate * maxLengthSeconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * (3 / decaySeconds));
    L[i] = (Math.random() * 2 - 1) * decay;
    R[i] = (Math.random() * 2 - 1) * decay * 0.97;
  }
  // normalize
  let max = 0;
  for (let i = 0; i < length; i++) {
    max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
  }
  if (max > 0) {
    const scale = 0.5 / max;
    for (let i = 0; i < length; i++) {
      L[i] *= scale;
      R[i] *= scale;
    }
  }
  return buffer;
}

/** Play a silent buffer during user gesture to unlock audio on iOS. */
function unlockAudioContext(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    buffer.getChannelData(0)[0] = 0;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (_) {}
}

export type AudioMuteRefs = {
  arpMutedRef?: React.MutableRefObject<boolean>;
  spawnChordsMutedRef?: React.MutableRefObject<boolean>;
  padMutedRef?: React.MutableRefObject<boolean>;
};

export function useAmbientSynth(options?: {
  cursorRef?: React.MutableRefObject<{ x: number; y: number } | null>;
} & AudioMuteRefs) {
  const cursorRef = options?.cursorRef;
  const arpMutedRef = options?.arpMutedRef;
  const spawnChordsMutedRef = options?.spawnChordsMutedRef;
  const padMutedRef = options?.padMutedRef;
  const ctxRef = useRef<AudioContext | null>(null);
  const reverbSendRef = useRef<GainNode | null>(null);
  const padOscsRef = useRef<OscillatorNode[]>([]);
  const padMuteGainRef = useRef<GainNode | null>(null);
  const padMasterGainRef = useRef<GainNode | null>(null); // slow bloom envelope
  const padRafIdRef = useRef<number>(0);
  const padFreqRef = useRef(PAD_SCALE_HZ[2]);
  const waterBandpassRef = useRef<BiquadFilterNode | null>(null);
  const startedRef = useRef(false);
  const nextNoteTimeRef = useRef(0);
  const arpIndexRef = useRef(0);
  const rafIdRef = useRef<number>(0);

  const playNote = useCallback((ctx: AudioContext, freq: number, startTime: number, reverbSend: GainNode) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscMix = ctx.createGain();
    oscMix.gain.setValueAtTime(0.5, startTime);
    osc1.type = "sine";
    osc2.type = "triangle"; // Poly-800: a bit of bite, not pure sine
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq, startTime);
    osc2.detune.setValueAtTime(DETUNE_CENTS, startTime);
    osc1.connect(oscMix);
    osc2.connect(oscMix);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, startTime); // brighter, 80s digital sheen
    filter.Q.setValueAtTime(0.8, startTime);
    oscMix.connect(filter);

    const noteGain = ctx.createGain();
    filter.connect(noteGain);

    const delay = ctx.createDelay(2);
    const feedbackGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();

    delay.delayTime.setValueAtTime(DELAY_TIME, startTime);
    feedbackGain.gain.setValueAtTime(DELAY_FEEDBACK, startTime);
    dryGain.gain.setValueAtTime(1 - DELAY_MIX, startTime);
    wetGain.gain.setValueAtTime(DELAY_MIX, startTime);

    noteGain.connect(dryGain);
    noteGain.connect(delay);
    noteGain.connect(reverbSend);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);
    dryGain.connect(ctx.destination);
    wetGain.connect(ctx.destination);

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(MASTER_GAIN, startTime + ATTACK);
    noteGain.gain.setValueAtTime(MASTER_GAIN, startTime + ATTACK + SUSTAIN);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + NOTE_DURATION);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + NOTE_DURATION + 0.02);
    osc2.stop(startTime + NOTE_DURATION + 0.02);
  }, []);

  const playSpawnChord = useCallback((step: number = 0) => {
    if (spawnChordsMutedRef?.current) return;
    const ctx = ctxRef.current;
    const reverbSend = reverbSendRef.current;
    if (!ctx || ctx.state !== "running" || !reverbSend) return;

    const freqs = SPAWN_CHORDS[step % SPAWN_CHORDS.length];
    const now = ctx.currentTime;
    const chordGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.setValueAtTime(1 - SPAWN_REVERB_ONLY, now);
    wetGain.gain.setValueAtTime(SPAWN_REVERB_ONLY, now);
    chordGain.connect(dryGain);
    chordGain.connect(wetGain);
    dryGain.connect(ctx.destination);
    wetGain.connect(reverbSend);

    for (let i = 0; i < freqs.length; i++) {
      const t = now + i * SPAWN_NOTE_STAGGER;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqs[i], t);
      osc.connect(noteGain);
      noteGain.connect(chordGain);
      noteGain.gain.setValueAtTime(0, t);
      noteGain.gain.linearRampToValueAtTime(SPAWN_GAIN, t + SPAWN_ATTACK);
      noteGain.gain.setValueAtTime(SPAWN_GAIN, t + SPAWN_ATTACK + SPAWN_HOLD);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + SPAWN_ATTACK + SPAWN_HOLD + SPAWN_RELEASE);
      osc.start(t);
      osc.stop(t + SPAWN_ATTACK + SPAWN_HOLD + SPAWN_RELEASE + 0.05);
    }
  }, [spawnChordsMutedRef]);

  const scheduleLoop = useCallback(() => {
    const ctx = ctxRef.current;
    const reverbSend = reverbSendRef.current;
    if (!ctx || ctx.state !== "running" || !reverbSend) return;

    const now = ctx.currentTime;
    while (nextNoteTimeRef.current < now + 0.2) {
      if (!arpMutedRef?.current) {
        const freq = ARP_NOTES[arpIndexRef.current % ARP_NOTES.length];
        playNote(ctx, freq, nextNoteTimeRef.current, reverbSend);
      }
      arpIndexRef.current += 1;
      nextNoteTimeRef.current += ARP_INTERVAL;
    }
    rafIdRef.current = requestAnimationFrame(scheduleLoop);
  }, [playNote, arpMutedRef]);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Unlock iOS: play silent buffer in same user gesture so Web Audio is allowed to play
    unlockAudioContext(ctx);

    // Mobile: resume() must be called in user gesture; do all setup only after context is running
    const runAfterResume = () => {
      if (ctx.state === "closed") return;

      const reverbIR = createReverbIR(ctx, REVERB_DECAY);
    const convolver = ctx.createConvolver();
    convolver.buffer = reverbIR;
    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(REVERB_MIX, ctx.currentTime);
    const reverbSend = ctx.createGain();
    reverbSend.gain.setValueAtTime(1, ctx.currentTime);
    reverbSend.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(ctx.destination);
    reverbSendRef.current = reverbSend;

    nextNoteTimeRef.current = ctx.currentTime;
    arpIndexRef.current = 0;

    scheduleLoop();

    // Pad: Juno-style chorus (3 detuned voices) + subtle fifth, slow bloom, long reverb
    const t0 = ctx.currentTime;
    const padUnisonMix = ctx.createGain();
    padUnisonMix.gain.setValueAtTime(1, t0);

    const padOscs: OscillatorNode[] = [];
    for (let i = 0; i < PAD_DETUNE_CENTS.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(padFreqRef.current, t0);
      osc.detune.setValueAtTime(PAD_DETUNE_CENTS[i], t0);
      osc.start(t0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(PAD_GAIN, t0);
      osc.connect(g);
      g.connect(padUnisonMix);
      padOscs.push(osc);
    }
    const padFifth = ctx.createOscillator();
    padFifth.type = "sine";
    padFifth.frequency.setValueAtTime(padFreqRef.current * 1.5, t0);
    padFifth.start(t0);
    const padFifthGain = ctx.createGain();
    padFifthGain.gain.setValueAtTime(PAD_GAIN * PAD_FIFTH_GAIN, t0);
    padFifth.connect(padFifthGain);
    padFifthGain.connect(padUnisonMix);
    padOscs.push(padFifth);

    padOscsRef.current = padOscs;

    const padMasterGain = ctx.createGain();
    padMasterGain.gain.setValueAtTime(0, t0);
    padMasterGain.gain.linearRampToValueAtTime(1, t0 + PAD_ATTACK_S);
    padMasterGainRef.current = padMasterGain;

    // Water: rumble + stream (blends with pad reverb tail)
    const rumbleNoise = ctx.createBufferSource();
    rumbleNoise.buffer = createPinkNoiseBuffer(ctx, 2);
    rumbleNoise.loop = true;
    rumbleNoise.start(t0);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(PAD_NOISE_RUMBLE_GAIN, t0);
    rumbleNoise.connect(rumbleGain);
    const rumbleLp = ctx.createBiquadFilter();
    rumbleLp.type = "lowpass";
    rumbleLp.frequency.setValueAtTime(180, t0);
    rumbleLp.Q.setValueAtTime(0.4, t0);
    rumbleGain.connect(rumbleLp);

    const streamNoise = ctx.createBufferSource();
    streamNoise.buffer = createPinkNoiseBuffer(ctx, 2);
    streamNoise.loop = true;
    streamNoise.start(t0);
    const streamGain = ctx.createGain();
    streamGain.gain.setValueAtTime(PAD_NOISE_GAIN, t0);
    streamNoise.connect(streamGain);
    const waterBandpass = ctx.createBiquadFilter();
    waterBandpass.type = "bandpass";
    waterBandpass.frequency.setValueAtTime(WATER_BANDPASS_CENTER, t0);
    waterBandpass.Q.setValueAtTime(0.6, t0);
    streamGain.connect(waterBandpass);
    waterBandpassRef.current = waterBandpass;

    const padMix = ctx.createGain();
    padMix.gain.setValueAtTime(1, t0);
    padUnisonMix.connect(padMix);
    rumbleLp.connect(padMix);
    waterBandpass.connect(padMix);

    const padMasterLp = ctx.createBiquadFilter();
    padMasterLp.type = "lowpass";
    padMasterLp.frequency.setValueAtTime(400, t0);
    padMasterLp.Q.setValueAtTime(0.5, t0);
    padMix.connect(padMasterLp);
    padMasterLp.connect(padMasterGain);

    const padMuteGain = ctx.createGain();
    padMuteGain.gain.setValueAtTime(1, t0);
    padMasterGain.connect(padMuteGain);
    padMuteGainRef.current = padMuteGain;

    const padLongIR = createReverbIR(ctx, PAD_LONG_REVERB_DECAY, 12);
    const padConvolver = ctx.createConvolver();
    padConvolver.buffer = padLongIR;
    const padReverbWet = ctx.createGain();
    padReverbWet.gain.setValueAtTime(1 - PAD_DRY_MIX, t0);
    const padDry = ctx.createGain();
    padDry.gain.setValueAtTime(PAD_DRY_MIX, t0);
    padMuteGain.connect(padReverbWet);
    padMuteGain.connect(padDry);
    padReverbWet.connect(padConvolver);
    padConvolver.connect(ctx.destination);
    padDry.connect(ctx.destination);

    if (cursorRef) {
      const cursorRefLocal = cursorRef;
      function padTick() {
        const ctx = ctxRef.current;
        const oscs = padOscsRef.current;
        if (!ctx || ctx.state !== "running" || !oscs.length) {
          padRafIdRef.current = requestAnimationFrame(padTick);
          return;
        }
        const t = ctx.currentTime;
        const cur = cursorRefLocal.current;
        const x = cur?.x ?? 50;
        const y = cur?.y ?? 50;
        const scaleIndex = Math.min(
          PAD_SCALE_HZ.length - 1,
          Math.max(0, Math.floor((x / 100) * PAD_SCALE_HZ.length * 0.95 + (y / 100) * PAD_SCALE_HZ.length * 0.4))
        );
        const targetFreq = PAD_SCALE_HZ[scaleIndex];
        const current = padFreqRef.current;
        const next = current + (targetFreq - current) * PAD_SMOOTH;
        padFreqRef.current = next;
        for (let i = 0; i < PAD_DETUNE_CENTS.length; i++) {
          oscs[i].frequency.setValueAtTime(next, t);
        }
        oscs[3].frequency.setValueAtTime(next * 1.5, t);

        const padMuteGain = padMuteGainRef.current;
        if (padMuteGain) {
          padMuteGain.gain.setValueAtTime(padMutedRef?.current ? 0 : 1, t);
        }
        const bandpass = waterBandpassRef.current;
        if (bandpass) {
          const phase = t * WATER_LFO_RATE * Math.PI * 2;
          const center = WATER_BANDPASS_CENTER + WATER_BANDPASS_WIDTH * Math.sin(phase);
          bandpass.frequency.setValueAtTime(Math.max(80, Math.min(1200, center)), t);
        }
        padRafIdRef.current = requestAnimationFrame(padTick);
      }
      padRafIdRef.current = requestAnimationFrame(padTick);
    }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(runAfterResume).catch(() => {
        startedRef.current = false;
      });
    } else {
      runAfterResume();
    }
  }, [scheduleLoop, cursorRef]);

  useEffect(() => {
    return () => {
      if (padRafIdRef.current) cancelAnimationFrame(padRafIdRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (padRafIdRef.current) {
      cancelAnimationFrame(padRafIdRef.current);
      padRafIdRef.current = 0;
    }
    const oscs = padOscsRef.current;
    if (oscs.length) {
      for (const osc of oscs) {
        try {
          osc.stop();
        } catch (_) {}
      }
      padOscsRef.current = [];
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    startedRef.current = false;
  }, []);

  return { start, stop, playSpawnChord, isStarted: startedRef.current };
}
