
class RavenVocalResonance extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "frequency1",
        defaultValue: 500,
        minValue: 20,
        maxValue: 18000,
        automationRate: "k-rate"
      },
      {
        name: "frequency2",
        defaultValue: 1500,
        minValue: 20,
        maxValue: 18000,
        automationRate: "k-rate"
      },
      {
        name: "frequency3",
        defaultValue: 2500,
        minValue: 20,
        maxValue: 18000,
        automationRate: "k-rate"
      },
      {
        name: "frequency4",
        defaultValue: 4000,
        minValue: 20,
        maxValue: 18000,
        automationRate: "k-rate"
      },

      {
        name: "q1",
        defaultValue: 3,
        minValue: 0.5,
        maxValue: 30,
        automationRate: "k-rate"
      },
      {
        name: "q2",
        defaultValue: 4,
        minValue: 0.5,
        maxValue: 30,
        automationRate: "k-rate"
      },
      {
        name: "q3",
        defaultValue: 5,
        minValue: 0.5,
        maxValue: 30,
        automationRate: "k-rate"
      },
      {
        name: "q4",
        defaultValue: 6,
        minValue: 0.5,
        maxValue: 30,
        automationRate: "k-rate"
      },

      {
        name: "gain1",
        defaultValue: 1,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate"
      },
      {
        name: "gain2",
        defaultValue: 1,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate"
      },
      {
        name: "gain3",
        defaultValue: 0.7,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate"
      },
      {
        name: "gain4",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate"
      },

      {
        name: "level",
        defaultValue: 0.25,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate"
      }
    ];
  }

  constructor() {
    super();

    // Two filter-state values for each resonator and channel.
    this.states = Array.from(
      { length: 4 },
      () => []
    );
  }

  process(inputs, outputs, parameters) {
    const inputChannels = inputs[0];
    const outputChannels = outputs[0];

    if (!outputChannels.length) return true;

    const nyquist = sampleRate * 0.49;

    // Calculate the four resonator filters.
    const filters = [];

    for (let n = 0; n < 4; n++) {
      const frequency = Math.min(
        Math.max(20, parameters["frequency" + (n + 1)][0]),
        nyquist
      );

      const q = Math.max(
        0.5,
        parameters["q" + (n + 1)][0]
      );

      const gain = parameters["gain" + (n + 1)][0];

      const omega = 2 * Math.PI * frequency / sampleRate;
      const sin = Math.sin(omega);
      const cos = Math.cos(omega);
      const alpha = sin / (2 * q);
      const a0 = 1 + alpha;

      filters.push({
        b0: alpha / a0,
        b2: -alpha / a0,
        a1: -2 * cos / a0,
        a2: (1 - alpha) / a0,
        gain
      });
    }

    const level = parameters.level[0];

    for (let channelIndex = 0;
         channelIndex < outputChannels.length;
         channelIndex++) {

      const output = outputChannels[channelIndex];

      const input =
        inputChannels[channelIndex] ||
        inputChannels[0];

      if (!input) {
        output.fill(0);
        continue;
      }

      for (let n = 0; n < 4; n++) {
        if (!this.states[n][channelIndex]) {
          this.states[n][channelIndex] = {
            z1: 0,
            z2: 0
          };
        }
      }

      for (let i = 0; i < output.length; i++) {
        const x = input[i];
        let sum = 0;

        for (let n = 0; n < 4; n++) {
          const filter = filters[n];
          const state = this.states[n][channelIndex];

          const y = filter.b0 * x + state.z1;

          state.z1 =
            -filter.a1 * y + state.z2;

          state.z2 =
            filter.b2 * x - filter.a2 * y;

          sum += y * filter.gain;
        }

        output[i] = sum * level;
      }
    }

    return true;
  }
}

registerProcessor(
  "raven-vocal-resonance",
  RavenVocalResonance
);
