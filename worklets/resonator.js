class RavenResonator extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "frequency",
        defaultValue: 440,
        minValue: 20,
        maxValue: 18000,
        automationRate: "k-rate"
      },
      {
        name: "q",
        defaultValue: 2.5,
        minValue: 0.5,
        maxValue: 20,
        automationRate: "k-rate"
      },
      {
        name: "amplitude",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: "a-rate"
      }
    ];
  }

  constructor() {
    super();
    this.z1 = [];
    this.z2 = [];
  }

  process(inputs, outputs, parameters) {
    const inputChannels = inputs[0];
    const outputChannels = outputs[0];

    const frequency = parameters.frequency[0];
    const q = parameters.q[0];

    // Keep the center frequency below the Nyquist limit.
    const safeFrequency = Math.min(
      Math.max(20, frequency),
      sampleRate * 0.49
    );

    // Calculate band-pass biquad coefficients.
    const omega = 2 * Math.PI * safeFrequency / sampleRate;
    const sin = Math.sin(omega);
    const cos = Math.cos(omega);
    const alpha = sin / (2 * q);

    const a0 = 1 + alpha;

    const b0 = alpha / a0;
    const b1 = 0;
    const b2 = -alpha / a0;

    const a1 = (-2 * cos) / a0;
    const a2 = (1 - alpha) / a0;

    for (let channel = 0; channel < outputChannels.length; channel++) {
      const output = outputChannels[channel];
      const input =
        inputChannels[channel] || inputChannels[0];

      if (this.z1[channel] === undefined) {
        this.z1[channel] = 0;
        this.z2[channel] = 0;
      }

      let z1 = this.z1[channel];
      let z2 = this.z2[channel];

      const amplitudes = parameters.amplitude;

      for (let i = 0; i < output.length; i++) {
        const x = input ? input[i] : 0;

        const gain =
          amplitudes.length > 1
            ? amplitudes[i]
            : amplitudes[0];

        const y = b0 * x + z1;

        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;

        output[i] = y * gain;
      }

      this.z1[channel] = z1;
      this.z2[channel] = z2;
    }

    return true;
  }
}

registerProcessor("raven-resonator", RavenResonator);
