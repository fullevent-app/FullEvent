"use client";

import * as Tone from "tone";

// Lazy-initialize synth with reverb to avoid SSR issues
let synth: Tone.Synth | null = null;
let ambientSynth: Tone.PolySynth | null = null;
let reverb: Tone.Reverb | null = null;
let ambientReverb: Tone.Reverb | null = null;
let initialized = false;
let loopSequence: Tone.Sequence | Tone.Loop | null = null;

async function getSynth() {
    if (!synth) {
        // Create a lush reverb for airy sound
        reverb = new Tone.Reverb({
            decay: 2.5,
            wet: 0.6,
            preDelay: 0.01,
        }).toDestination();

        // Wait for reverb to generate its impulse response
        await reverb.ready;

        synth = new Tone.Synth({
            oscillator: {
                type: "sine",
            },
            envelope: {
                attack: 0.02,
                decay: 0.2,
                sustain: 0.1,
                release: 1.2, // Longer release for airy tail
            },
            volume: -16,
        }).connect(reverb);
    }
    return synth;
}

async function getAmbientSynth() {
    if (!ambientSynth) {
        ambientReverb = new Tone.Reverb({
            decay: 2.5,
            wet: 0.5,
            preDelay: 0.02,
        }).toDestination();

        await ambientReverb.ready;

        ambientSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: "sine",
            },
            envelope: {
                attack: 0.05,
                decay: 0.3,
                sustain: 0.2,
                release: 0.8,
            },
            volume: -22,
        }).connect(ambientReverb);
    }
    return ambientSynth;
}

async function ensureAudioContext() {
    if (!initialized && Tone.getContext().state !== "running") {
        await Tone.start();
        initialized = true;
    }
}

// Pleasant high notes for airy clicks
const clickNotes = ["C6", "D6", "E6", "G5", "A5", "B5", "F#6", "G6"];

function randomNote() {
    return clickNotes[Math.floor(Math.random() * clickNotes.length)];
}

/**
 * Play a soft, airy click sound with a random note
 */
export async function playClickSound() {
    try {
        await ensureAudioContext();
        const s = await getSynth();
        s.triggerAttackRelease(randomNote(), "16n");
    } catch {
        // Silently fail if audio isn't available
    }
}

/**
 * Play a success/confirmation sound
 */
export async function playSuccessSound() {
    try {
        await ensureAudioContext();
        const s = await getSynth();
        // Quick ascending arpeggio with space between notes
        const now = Tone.now();
        s.triggerAttackRelease("E5", "16n", now);
        s.triggerAttackRelease("G5", "16n", now + 0.08);
        s.triggerAttackRelease("C6", "8n", now + 0.16);
    } catch {
        // Silently fail if audio isn't available
    }
}

// Windchime notes - Pentatonic E minor / G major for calming feel
const windchimeNotes = ["E5", "G5", "A5", "B5", "D6", "E6", "G6"];

/**
 * Start a gentle ambient loop with random windchime sounds
 */
export async function startAmbientLoop() {
    try {
        await ensureAudioContext();
        const s = await getAmbientSynth();

        // Stop any existing loop
        if (loopSequence) {
            loopSequence.stop();
            loopSequence.dispose();
        }

        Tone.getTransport().bpm.value = 100; // Increased tempo

        // Use a loop to trigger random notes
        loopSequence = new Tone.Loop((time) => {
            // 40% chance to play a note on each 8th note
            if (Math.random() > 0.6) {
                const note = windchimeNotes[Math.floor(Math.random() * windchimeNotes.length)];
                // Vary velocity for more organic feel (0.2 to 0.6)
                const velocity = Math.random() * 0.4 + 0.2;
                s.triggerAttackRelease(note, "16n", time, velocity);
            }
        }, "8n");

        loopSequence.start(0);
        Tone.getTransport().start();
    } catch {
        // Silently fail if audio isn't available
    }
}

/**
 * Stop the ambient loop
 */
export function stopAmbientLoop() {
    try {
        if (loopSequence) {
            loopSequence.stop();
            loopSequence.dispose();
            loopSequence = null;
        }
        Tone.getTransport().stop();
    } catch {
        // Silently fail
    }
}

/**
 * Play a failure/error sound
 */
export async function playFailSound() {
    try {
        await ensureAudioContext();
        const s = await getSynth();
        // Quick descending minor notes
        const now = Tone.now();
        s.triggerAttackRelease("E5", "16n", now);
        s.triggerAttackRelease("D5", "16n", now + 0.1);
        s.triggerAttackRelease("C5", "8n", now + 0.2);
    } catch {
        // Silently fail if audio isn't available
    }
}
