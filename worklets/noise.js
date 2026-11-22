class RavenNoise extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "amplitude",
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
        automationRate: "a-rate"
      }
    ];
  }

  constructor() {
    super();
    this.seed = 123456789;
  }

  nextRandom() {
    // Xorshift32 pseudo-random generator
    let x = this.seed;

    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;

    this.seed = x >>> 0;

    return (this.seed / 4294967296) * 2 - 1;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const amplitudes = parameters.amplitude;

    for (const channel of output) {
      for (let i = 0; i < channel.length; i++) {
        const amplitude =
          amplitudes.length > 1
            ? amplitudes[i]
            : amplitudes[0];

        channel[i] = this.nextRandom() * amplitude;
      }
    }

    return true;
  }
}

registerProcessor("raven-noise", RavenNoise);
