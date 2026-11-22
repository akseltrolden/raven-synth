
class RavenArticulation extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "gate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "a-rate"
      },
      {
        name: "attack",
        defaultValue: 10,
        minValue: 0.1,
        maxValue: 5000,
        automationRate: "k-rate"
      },
      {
        name: "sustain",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate"
      },
      {
        name: "release",
        defaultValue: 100,
        minValue: 0.1,
        maxValue: 5000,
        automationRate: "k-rate"
      },
      {
        name: "pulseRate",
        defaultValue: 0,
        minValue: 0,
        maxValue: 100,
        automationRate: "k-rate"
      },
      {
        name: "dutyCycle",
        defaultValue: 0.5,
        minValue: 0.01,
        maxValue: 0.99,
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
    this.envelope = 0;
    this.pulsePhase = 0;
  }

  process(inputs, outputs, parameters) {
    const inputChannels = inputs[0];
    const outputChannels = outputs[0];

    if (!outputChannels.length) return true;

    const gateValues = parameters.gate;
    const attack = parameters.attack[0] / 1000;
    const sustain = parameters.sustain[0];
    const release = parameters.release[0] / 1000;
    const pulseRate = parameters.pulseRate[0];
    const dutyCycle = parameters.dutyCycle[0];
    const amplitudes = parameters.amplitude;

    const attackStep = 1 / Math.max(1, attack * sampleRate);
    const releaseStep = 1 / Math.max(1, release * sampleRate);

    const frameCount = outputChannels[0].length;

    for (let i = 0; i < frameCount; i++) {
      const gate = gateValues.length > 1
        ? gateValues[i]
        : gateValues[0];

      const amplitude = amplitudes.length > 1
        ? amplitudes[i]
        : amplitudes[0];

      // Overall attack / sustain / release envelope.
      if (gate > 0.5) {
        this.envelope = Math.min(
          sustain,
          this.envelope + attackStep
        );
      } else {
        this.envelope = Math.max(
          0,
          this.envelope - releaseStep
        );
      }

      // Optional repeating pulse.
      let pulse = 1;

      if (pulseRate > 0) {
        this.pulsePhase += pulseRate / sampleRate;

        if (this.pulsePhase >= 1) {
          this.pulsePhase -= Math.floor(this.pulsePhase);
        }

        pulse = this.pulsePhase < dutyCycle ? 1 : 0;
      }

      const gain = this.envelope * pulse * amplitude;

      for (let channel = 0; channel < outputChannels.length; channel++) {
        const input = inputChannels[channel] || inputChannels[0];
        outputChannels[channel][i] = input
          ? input[i] * gain
          : 0;
      }
    }

    return true;
  }
}

registerProcessor("raven-articulation", RavenArticulation);
