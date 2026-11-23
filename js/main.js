const WORKLETS = [
  "./worklets/oscillator.js",
  "./worklets/noise.js",
  "./worklets/resonator.js",
  "./worklets/articulation.js",
  "./worklets/transient.js",
  "./worklets/modulator.js",
  "./worklets/vocal-resonance.js",
  "./worklets/turbulence.js"
];

let audioContext;

let oscillator;
let noise;
let resonator;
let articulation;
let transient;
let modulator;
let oscillatorGain;
let noiseGain;
let transientGain;
let vocalResonance;
let vocalDryGain;
let vocalWetGain;
let vocalLFOs = [];
let vocalLFOGains = [];
let gestureLFO;
let gestureGains = [];
let voiceSource;
let voiceGain;
let turbulence;

let loading = false;

const $ = id => document.getElementById(id);

async function startSynth() {
  if (loading) return;
  loading = true;

  try {
    if (!audioContext) {
      audioContext = new AudioContext();

    await Promise.all(
      WORKLETS.map(url =>
        audioContext.audioWorklet.addModule(url)
      )
    );

      oscillator = new AudioWorkletNode(
        audioContext, "raven-oscillator"
      );

      noise = new AudioWorkletNode(
        audioContext, "raven-noise"
      );

      resonator = new AudioWorkletNode(
        audioContext, "raven-resonator"
      );

      articulation = new AudioWorkletNode(
        audioContext, "raven-articulation"
      );

      transient = new AudioWorkletNode(
        audioContext, "raven-transient"
      );

      modulator = new AudioWorkletNode(
        audioContext, "raven-modulator"
      );
      
      routeModulator();
      
      vocalResonance = new AudioWorkletNode(audioContext, "raven-vocal-resonance");

      vocalDryGain = audioContext.createGain();
      vocalWetGain = audioContext.createGain();

      vocalLFOs = [];
      vocalLFOGains = [];

      turbulence = new AudioWorkletNode(audioContext, "raven-turbulence");
      
      for (let i = 1; i <= 4; i++) {
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();

        lfo.type = "sine";

        lfo.connect(lfoGain);
        lfoGain.connect(vocalResonance.parameters.get("frequency" + i));

        lfo.start();

        vocalLFOs.push(lfo);
        vocalLFOGains.push(lfoGain);
      }

      gestureLFO = audioContext.createOscillator();
      gestureLFO.type = "sine";

      gestureGains = [];

      const gestureShape = [1, 0.65, -0.5, -0.8];

      for (let i = 1; i <= 4; i++) {
        const gain = audioContext.createGain();

        gestureLFO.connect(gain);

        gain.connect(vocalResonance.parameters.get("frequency" + i));

        gestureGains.push(gain);
      }

      gestureLFO.start();
      
      modulator.connect(oscillator.parameters.get("frequency"));

      voiceSource = audioContext.createOscillator();
      voiceGain = audioContext.createGain();

      voiceSource.type = $("voiceWaveform").value;

      voiceSource.connect(voiceGain);

      // Feed the voiced source into the existing resonator.
      voiceGain.connect(resonator);

      voiceSource.start();
      
      oscillatorGain = audioContext.createGain();
      noiseGain = audioContext.createGain();
      transientGain = audioContext.createGain();
      transientGain.gain.value = 0.1;

      oscillator.connect(oscillatorGain);
      noise.connect(noiseGain);

      oscillatorGain.connect(resonator);
      noiseGain.connect(resonator);
      turbulence.connect(resonator);
      transient.connect(transientGain);
      transientGain.connect(audioContext.destination);
      
      resonator.connect(vocalDryGain);
      resonator.connect(vocalResonance);

      vocalResonance.connect(vocalWetGain);

      vocalDryGain.connect(articulation);
      vocalWetGain.connect(articulation);
      articulation.connect(audioContext.destination);
    }

    await audioContext.resume();
    updateSound();

    console.log("Raven Synth running");
  } catch (error) {
    console.error("Synth error:", error);
  } finally {
    loading = false;
  }
}

function routeModulator() {
  if (!modulator || !oscillator || !resonator) return;

  modulator.disconnect();

  const target = $("modTarget").value;

  if (target === "oscillator") {
    modulator.connect(
      oscillator.parameters.get("frequency")
    );
  } else {
    modulator.connect(
      resonator.parameters.get("frequency")
    );
  }
}

function updateSound() {
  if (!audioContext || !articulation) return;

  const now = audioContext.currentTime;

  const frequency = Number($("frequency").value);
  const amplitude = Number($("amplitude").value) / 100;
  const noiseLevel = Number($("noise").value) / 100;

  const resFrequency = Number($("resFreq").value);
  const q = Number($("q").value);
  const resAmplitude = Number($("resAmp").value) / 100;

  const source = $("source").value;

  const oscillatorEnabled = source === "noise" ? 0 : 1;
  const noiseEnabled = source === "oscillator" ? 0 : 1;

  oscillator.parameters.get("frequency")
    .setValueAtTime(frequency, now);

  oscillator.parameters.get("amplitude")
    .setValueAtTime(1, now);

  oscillatorGain.gain.setValueAtTime(
    amplitude * oscillatorEnabled, now
  );

  noise.parameters.get("amplitude")
    .setValueAtTime(1, now);
 
  noiseGain.gain.setValueAtTime(
    noiseLevel * noiseEnabled, now
  );
  
  turbulence.parameters.get("pressure")
  .setValueAtTime(Number($("turbPressure").value) / 100, now);

  turbulence.parameters.get("brightness")
  .setValueAtTime(Number($("turbBrightness").value), now);

  turbulence.parameters.get("instability")
  .setValueAtTime(Number($("turbInstability").value) / 100, now);

  resonator.parameters.get("frequency")
    .setValueAtTime(resFrequency, now);

  resonator.parameters.get("q")
    .setValueAtTime(q, now);

  resonator.parameters.get("amplitude")
    .setValueAtTime(resAmplitude, now);

  articulation.parameters.get("gate")
    .setValueAtTime($("gate").checked ? 1 : 0, now);

  articulation.parameters.get("attack")
    .setValueAtTime(Number($("attack").value), now);

  articulation.parameters.get("sustain")
    .setValueAtTime(Number($("sustain").value) / 100, now);

  articulation.parameters.get("release")
    .setValueAtTime(Number($("release").value), now);

  articulation.parameters.get("pulseRate")
    .setValueAtTime(Number($("pulseRate").value), now);

  articulation.parameters.get("dutyCycle")
    .setValueAtTime(Number($("duty").value) / 100, now);

  articulation.parameters.get("amplitude")
    .setValueAtTime(Number($("artAmp").value) / 100, now);

  transient.parameters.get("strength")
    .setValueAtTime(Number($("transientStrength").value) / 100, now);

  transient.parameters.get("duration")
    .setValueAtTime(Number($("transientDuration").value), now);

  transient.parameters.get("character")
    .setValueAtTime(Number($("transientCharacter").value) / 100, now);

  transient.parameters.get("pitch")
  .setValueAtTime(Number($("transientPitch").value), now);

  transient.parameters.get("decay")
  .setValueAtTime(Number($("transientDecay").value), now);
  
  transientGain.gain.setValueAtTime(Number($("transientOutput").value) / 100, now);

  modulator.parameters.get("rate").setValueAtTime(Number($("modRate").value), now);

  modulator.parameters.get("depth").setValueAtTime(Number($("modDepth").value), now);

  modulator.parameters.get("waveform").setValueAtTime(Number($("modWaveform").value), now);

  // Select original or vocal resonance path
  const vocalOn = $("vocalEnabled").checked;

  vocalDryGain.gain.setValueAtTime(vocalOn ? 0 : 1, now);

  vocalWetGain.gain.setValueAtTime(vocalOn ? 1 : 0, now);

  // Four vocal resonators
  for (let i = 1; i <= 4; i++) {
    vocalResonance.parameters.get("frequency" + i).setValueAtTime(Number($("vf" + i).value), now);

    vocalResonance.parameters.get("q" + i).setValueAtTime(Number($("vq" + i).value), now);

    vocalResonance.parameters.get("gain" + i).setValueAtTime(Number($("vg" + i).value) / 100, now);
  }

  for (let i = 1; i <= 4; i++) {
    const rate = Number($("vr" + i).value);
    const depth = Number($("vd" + i).value);

    vocalLFOs[i - 1].frequency.setValueAtTime(rate, now);

    vocalLFOGains[i - 1].gain.setValueAtTime($("vocalEnabled").checked ? depth : 0, now);
  }
  
  gestureLFO.frequency.setValueAtTime(Number($("gestureRate").value), now);

  const gestureDepth = Number($("gestureDepth").value);

  const gestureShape = [1, 0.65, -0.5, -0.8];

  for (let i = 0; i < 4; i++) {
    gestureGains[i].gain.setValueAtTime($("vocalEnabled").checked ? gestureDepth * gestureShape[i] : 0, now);
  }

  voiceSource.frequency.setValueAtTime(Number($("voiceFrequency").value), now);

  voiceSource.type = $("voiceWaveform").value;

  voiceGain.gain.setValueAtTime($("voiceEnabled").checked ? Number($("voiceAmplitude").value) / 100 : 0, now);
  
  vocalResonance.parameters.get("level").setValueAtTime(Number($("vocalLevel").value) / 100, now);
}
  // ======================================
  // RAVEN GESTURE SEQUENCER
  // ======================================

  let gestureTimers = [];


const ravenGesture = {
  name: "First Raven Gesture",

  duration: 2.05,

  events: [
    // 1. Initial sharp click
    {
      type: "transient",
      at: 0,
      duration: 3,
      strength: 1,
      character: 1
    },

    // 2. Turbulent airflow burst
    {
      type: "turbulence",
      at: 0.08,
      points: [
        [0, 0],
        [0.05, 0.48],
        [0.15, 0.48],
        [0.26, 0]
      ]
    },

    // 3. Rising voiced call
    {
      type: "voice",
      frequency: [
        [0.35, 440],
        [0.55, 950],
        [0.75, 1450],
        [0.9, 1100]
      ],
      amplitude: [
        [0.35, 0],
        [0.48, 1],
        [0.85, 1],
        [1.0, 0]
      ],
      frequencyMod: [
        {
          rate: 2,
          depth: 100,
          waveform: "drift"
         },
         {
          rate: 9,
          depth: 45,
          waveform: "flutter",
          irregularity: 0.3
        }
      ],
      amplitudeMod: [
        {
          rate: 12,
          depth: 0.3,
          waveform: "random"
        },
        {
          rate: 5,
          depth: 0.2,
          waveform: "sine"
        }
      ],
    },

    // 4. Paired clicks
    {
      type: "transient",
      at: 0.95,
      duration: 4,
      strength: 1,
      character: 0.8
    },
    {
      type: "transient",
      at: 1.08,
      duration: 4,
      strength: 0.9,
      character: 0.8
    },

    // 5. Wavering breathy finish
    {
      type: "voice",
      frequency: [
        [1.2, 750],
        [1.4, 1100],
        [1.55, 650],
        [1.7, 950]
      ],
      amplitude: [
        [1.2, 0],
        [1.3, 0.65],
        [1.65, 0.65],
        [1.9, 0]
      ],
      articulation: {
        attack: 0.08,
        hold: 0.12,
        release: 0.18
      }
    },
{
      type: "curve",
      target: "pressure",
      points: [
        [1.2, 0],
        [1.35, 0.2],
        [1.8, 0]
      ]
    },
    
    
  ]
};


function performRavenGesture() {
  if (
    !audioContext ||
    !voiceSource ||
    !voiceGain ||
    !turbulence ||
    !transient
  ) {
    console.warn("Raven Synth is not ready for gestures.");
    return;
  }

  gestureTimers.forEach(clearTimeout);
  gestureTimers = [];

  const now = audioContext.currentTime;

  const pressure = turbulence.parameters.get("pressure");
  const voiceFrequency = voiceSource.frequency;
  const voiceAmplitude = voiceGain.gain;

  const basePressure =
    Number($("turbPressure").value) / 100;

  const baseFrequency =
    Number($("voiceFrequency").value);

  const baseAmplitude = voiceAmplitude.value;

  const voicePeak = Math.max(
    0.18,
    Math.min(0.4, baseAmplitude || 0.25)
  );

  // Cancel existing automation.
  pressure.cancelScheduledValues(now);
  voiceFrequency.cancelScheduledValues(now);
  voiceAmplitude.cancelScheduledValues(now);

  pressure.setValueAtTime(0, now);
  voiceFrequency.setValueAtTime(baseFrequency, now);
  voiceAmplitude.setValueAtTime(0, now);

  // Schedule a sequence of values on an AudioParam.
  function scheduleCurve(param, points, scale = 1) {
    points.forEach(([time, value], index) => {
      const scheduledTime = now + time;
      const scaledValue = value * scale;

      if (index === 0) {
        param.setValueAtTime(scaledValue, scheduledTime);
      } else {
        param.linearRampToValueAtTime(
          scaledValue,
          scheduledTime
        );
      }
    });
  }


  // Schedule a modulated voice curve.
  function scheduleVoiceCurve(
    param,
    points,
    scale = 1,
    modulation,
    mode = "frequency"
  ) {
    if (!modulation) {
      scheduleCurve(param, points, scale);
      return;
    }


  // Accept either one modulation or an array of layers.
  const layers = Array.isArray(modulation)
    ? modulation
    : [modulation];

  const start = points[0][0];
  const end = points[points.length - 1][0];
  const duration = end - start;

  function interpolate(time) {
    for (let i = 0; i < points.length - 1; i++) {
      const [t1, v1] = points[i];
      const [t2, v2] = points[i + 1];

      if (time <= t2) {
        const fraction = (time - t1) / (t2 - t1);
        return v1 + (v2 - v1) * fraction;
      }
    }

    return points[points.length - 1][1];
  }

  // Give each modulation layer its own independent state.
  const states = layers.map(mod => {
    const interval = 1 / Math.max(0.01, mod.rate || 1);

    return {
      driftFrom: Math.random() * 2 - 1,
      driftTo: Math.random() * 2 - 1,
      driftStart: 0,
      driftEnd: interval,

      flutterStart: 0,
      flutterEnd: interval,
      flutterAmplitude: 1
    };
  });

  function getWave(mod, state, elapsed) {
    const rate = Math.max(0.01, mod.rate || 1);
    const phase = elapsed * rate;
    const cycle = phase - Math.floor(phase);

    switch (mod.waveform || "sine") {
      case "sine":
        return Math.sin(phase * Math.PI * 2);

      case "triangle":
        return 1 - 4 * Math.abs(cycle - 0.5);

      case "sawtooth":
        return 2 * cycle - 1;

      case "square":
        return cycle < 0.5 ? 1 : -1;

      case "random":
        return Math.random() * 2 - 1;

      case "drift": {
        const interval = 1 / rate;

        while (elapsed >= state.driftEnd) {
          state.driftFrom = state.driftTo;
          state.driftTo = Math.random() * 2 - 1;
          state.driftStart = state.driftEnd;
          state.driftEnd += interval;
        }

        const progress =
          (elapsed - state.driftStart) /
          (state.driftEnd - state.driftStart);

        const smooth =
          progress * progress * (3 - 2 * progress);

        return state.driftFrom +
          (state.driftTo - state.driftFrom) * smooth;
      }

      case "flutter": {
        const irregularity = Math.max(
          0,
          Math.min(1, mod.irregularity ?? 0.2)
        );

        while (elapsed >= state.flutterEnd) {
          state.flutterStart = state.flutterEnd;

          const rateVariation =
            1 + (Math.random() * 2 - 1) *
            irregularity * 0.25;

          state.flutterEnd =
            state.flutterStart +
            1 / Math.max(0.01, rate * rateVariation);

          state.flutterAmplitude =
            1 + (Math.random() * 2 - 1) *
            irregularity * 0.3;
        }

        const progress =
          (elapsed - state.flutterStart) /
          (state.flutterEnd - state.flutterStart);

        return Math.sin(progress * Math.PI * 2) *
          state.flutterAmplitude;
      }

      default:
        return Math.sin(phase * Math.PI * 2);
    }
  }

  const sampleCount = Math.max(
    1,
    Math.ceil(duration / 0.01)
  );

  const modulatedPoints = [];

  for (let i = 0; i <= sampleCount; i++) {
    const time = start + duration * i / sampleCount;
    const elapsed = time - start;

    let value = interpolate(time);

    for (let j = 0; j < layers.length; j++) {
      const mod = layers[j];
      const wave = getWave(mod, states[j], elapsed);

      if (mode === "frequency") {
        value += wave * mod.depth;
      }

      if (mode === "amplitude") {
        value *= Math.max(0, 1 + wave * mod.depth);
      }
    }

    modulatedPoints.push([time, value]);
  }

  scheduleCurve(param, modulatedPoints, scale);
}


function scheduleArticulation(event) {
  const articulation = event.articulation;

  const start = event.amplitude[0][0];
  const end = event.amplitude[event.amplitude.length - 1][0];

  const attack = articulation.attack ?? 0.05;
  const hold = articulation.hold ?? 0.1;
  const release = articulation.release ?? 0.1;

  const available = end - start;
  const total = attack + hold + release;

  const scale = total > available
    ? available / total
    : 1;

  const a = attack * scale;
  const h = hold * scale;
  const r = release * scale;

  voiceAmplitude.setValueAtTime(0, now + start);

  voiceAmplitude.linearRampToValueAtTime(
    voicePeak,
    now + start + a
  );

  voiceAmplitude.setValueAtTime(
    voicePeak,
    now + start + a + h
  );

  voiceAmplitude.linearRampToValueAtTime(
    0,
    now + start + a + h + r
  );
}
  // Interpret each event in the gesture score.
  for (const event of ravenGesture.events) {

    if (event.type === "transient") {
      const timer = setTimeout(() => {
        transient.port.postMessage({
          type: "trigger",
          duration: event.duration,
          strength: event.strength,
          character: event.character
        });
      }, event.at * 1000);

      gestureTimers.push(timer);
    }
      
    else if (event.type === "turbulence") {
      const shiftedPoints = event.points.map(
        ([time, value]) => [
          event.at + time,
          value
        ]
      );

      scheduleCurve(pressure, shiftedPoints);
    }
    else if (event.type === "curve") {
      const target =
        event.target === "pressure"
          ? pressure
          : null;

      if (target) {
        scheduleCurve(target, event.points);
      }
    }

    
  else if (event.type === "voice") {
    scheduleVoiceCurve(
      voiceFrequency,
      event.frequency,
      1,
      event.frequencyMod,
      "frequency"
    );

    if (event.articulation) {
      scheduleArticulation(event);
    } else {
      scheduleVoiceCurve(
        voiceAmplitude,
        event.amplitude,
        voicePeak,
        event.amplitudeMod,
        "amplitude"
      );
    }
  }
}

  // Restore the user's original settings.
  pressure.setValueAtTime(
    basePressure,
    now + ravenGesture.duration
  );

  voiceFrequency.setValueAtTime(
    baseFrequency,
    now + ravenGesture.duration
  );

  voiceAmplitude.setValueAtTime(
    baseAmplitude,
    now + ravenGesture.duration
  );
}


  function playVocalGesture() {
    if (!vocalResonance || !audioContext) return;

    const now = audioContext.currentTime + 0.05;

    // Silence the continuous modulators during the gesture.
    for (const gain of vocalLFOGains) {
      gain.gain.setValueAtTime(0, now);
    }

    for (const gain of gestureGains) {
      gain.gain.setValueAtTime(0, now);
    }

    // Read the current vocal tract settings.
    const baseFreq = [];
    const baseGain = [];

    for (let i = 1; i <= 4; i++) {
      baseFreq.push(Number($("vf" + i).value));
      baseGain.push(Number($("vg" + i).value) / 100);
    }

    // Time, frequency offsets, and resonance strengths.
  const sequence = [
    {
      time: 0,
      freq: [0, 0, 0, 0],
      gain: [0.7, 0.6, 0.4, 0.3]
    },
    {
      time: 0.3,
      freq: [-80, 100, 180, 220],
      gain: [1.2, 1.1, 0.8, 0.6]
    },
    {
      time: 1.0,
      freq: [-130, 180, 350, 420],
      gain: [1.3, 1.2, 1.0, 0.75]
    },
    {
      time: 1.8,
      freq: [-40, 80, 250, 100],
      gain: [1.0, 1.15, 1.2, 0.9]
    },
    {
      time: 2.5,
      freq: [30, -50, 80, -120],
      gain: [0.75, 0.7, 0.6, 0.35]
    },
    {
      time: 3.0,
      freq: [0, 0, 0, 0],
      gain: [0.5, 0.4, 0.3, 0.2]
    }
  ];
    // Schedule all four resonators.
    for (let i = 0; i < 4; i++) {
      const frequency = vocalResonance.parameters.get(
        "frequency" + (i + 1)
      );

      const gain = vocalResonance.parameters.get(
        "gain" + (i + 1)
      );

      frequency.cancelScheduledValues(now);
      gain.cancelScheduledValues(now);

      frequency.setValueAtTime(baseFreq[i], now);
      gain.setValueAtTime(baseGain[i], now);

      for (const step of sequence) {
        const time = now + step.time;

        const targetFrequency = Math.max(
          20,
          Math.min(10000, baseFreq[i] + step.freq[i])
        );

        const targetGain = baseGain[i] * step.gain[i];

        frequency.linearRampToValueAtTime(
          targetFrequency,
          time
        );

        gain.linearRampToValueAtTime(
          targetGain,
          time
        );
      }

      // Restore the original vocal tract shape.
      frequency.linearRampToValueAtTime(
        baseFreq[i],
        now + 3.3
      );

      gain.linearRampToValueAtTime(
        baseGain[i],
        now + 3.3
      );
    }
  }
// All slider displays
const controls = [
  ["frequency", "frequencyValue"],
  ["amplitude", "amplitudeValue"],
  ["noise", "noiseValue"],
  ["turbPressure", "turbPressureValue"],
  ["turbBrightness", "turbBrightnessValue"],
  ["turbInstability", "turbInstabilityValue"],
  ["resFreq", "resFreqValue"],
  ["q", "qValue"],
  ["resAmp", "resAmpValue"],
  ["attack", "attackValue"],
  ["sustain", "sustainValue"],
  ["release", "releaseValue"],
  ["pulseRate", "pulseRateValue"],
  ["duty", "dutyValue"],
  ["artAmp", "artAmpValue"],
  ["transientOutput", "transientOutputValue"],
  ["transientStrength", "transientStrengthValue"],
  ["transientDuration", "transientDurationValue"],
  ["transientCharacter", "transientCharacterValue"],
  ["transientPitch", "transientPitchValue"],
  ["transientDecay", "transientDecayValue"],
  ["modRate", "modRateValue"],
  ["modDepth", "modDepthValue"],
  ["vf1", "vf1Value"],
  ["vq1", "vq1Value"],
  ["vg1", "vg1Value"],
  ["vf2", "vf2Value"],
  ["vq2", "vq2Value"],
  ["vg2", "vg2Value"],
  ["vf3", "vf3Value"],
  ["vq3", "vq3Value"],
  ["vg3", "vg3Value"],
  ["vf4", "vf4Value"],
  ["vq4", "vq4Value"],
  ["vg4", "vg4Value"],
  ["vocalLevel", "vocalLevelValue"],
  ["vr1", "vr1Value"],
  ["vd1", "vd1Value"],
  ["vr2", "vr2Value"],
  ["vd2", "vd2Value"],
  ["vr3", "vr3Value"],
  ["vd3", "vd3Value"],
  ["vr4", "vr4Value"],
  ["vd4", "vd4Value"],
  ["gestureRate", "gestureRateValue"],
  ["gestureDepth", "gestureDepthValue"],
  ["voiceFrequency", "voiceFrequencyValue"],
  ["voiceAmplitude", "voiceAmplitudeValue"]
];

controls.forEach(([control, display]) => {
  $(control).addEventListener("input", () => {
    $(display).textContent = $(control).value;
    updateSound();
  });
});

$("source").addEventListener("change", updateSound);
$("gate").addEventListener("change", updateSound);

$("play").addEventListener("click", startSynth);

$("stop").addEventListener("click", () => {
  if (audioContext) audioContext.suspend();
});

$("modTarget").addEventListener("change", routeModulator);
$("modWaveform").addEventListener("change", updateSound);

$("vocalEnabled").addEventListener("change", updateSound);

$("playGesture").addEventListener("click", async () => {
  if (!audioContext) {
    await startSynth();
  }

  if (audioContext.state !== "running") {
    await audioContext.resume();
  }

  $("vocalEnabled").checked = true;
  updateSound();

  playVocalGesture();
});

$("voiceEnabled").addEventListener("change", updateSound);
$("voiceWaveform").addEventListener("change", updateSound);
// Trigger one transient event
$("triggerTransient").addEventListener("click", async () => {
  if (!audioContext) {
    await startSynth();
  }

  if (!transient || audioContext.state !== "running") return;

  transient.port.postMessage({
    type: "trigger",
    strength: 1,
    character: Number($("transientCharacter").value) / 100
  });
});
$("performGesture").addEventListener("click", async () => {
  await startSynth();
  performRavenGesture();
});
