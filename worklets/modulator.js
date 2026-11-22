
class RavenModulator extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "rate",
        defaultValue: 2,
        minValue: 0,
        maxValue: 40,
        automationRate: "k-rate"
      },
      {
        name: "depth",
        defaultValue: 100,
        minValue: 0,
        maxValue: 2000,
        automationRate: "k-rate"
      },
      {
        name: "waveform",
        defaultValue: 0,
        minValue: 0,
        maxValue: 3,
        automationRate: "k-rate"
      }
    ];
  }

  constructor() {
    super();

    this.phase = 0;
    this.seed = 246813579;
    this.randomValue = 0;
  }

  random() {
    let x = this.seed;

    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;

    this.seed = x >>> 0;

    return (this.seed / 4294967296) * 2 - 1;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];

    if (!output || !output.length) return true;

    const rate = parameters.rate[0];
    const depth = parameters.depth[0];
    const waveform = Math.round(parameters.waveform[0]);

    const channel = output[0];

    if (rate <= 0 || depth <= 0) {
      channel.fill(0);
      return true;
    }

    const phaseStep = rate / sampleRate;

    for (let i = 0; i < channel.length; i++) {
      this.phase += phaseStep;

      if (this.phase >= 1) {
        this.phase -= Math.floor(this.phase);
        this.randomValue = this.random();
      }

      let value = 0;

      switch (waveform) {
        case 0:
          // Sine
          value = Math.sin(this.phase * 2 * Math.PI);
          break;

        case 1:
          // Triangle
          value = 1 - 4 * Math.abs(this.phase - 0.5);
          break;

        case 2:
          // Sawtooth
          value = this.phase * 2 - 1;
          break;

        case 3:
          // Random sample and hold
          value = this.randomValue;
          break;
      }

      channel[i] = value * depth;
    }

    return true;
  }
}

registerProcessor("raven-modulator", RavenModulator);
