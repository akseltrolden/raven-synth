
class RavenTurbulence extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "pressure",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1
      },
      {
        name: "brightness",
        defaultValue: 5000,
        minValue: 200,
        maxValue: 16000
      },
      {
        name: "instability",
        defaultValue: 0.2,
        minValue: 0,
        maxValue: 1
      }
    ];
  }

  constructor() {
    super();

    this.filterState = 0;
    this.randomValue = 0;
    this.randomTimer = 0;
    this.seed = 123456789;
  }

  random() {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5;

    return (this.seed >>> 0) / 4294967295 * 2 - 1;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];

    const pressure = parameters.pressure;
    const brightness = parameters.brightness;
    const instability = parameters.instability;

    for (let channel = 0; channel < output.length; channel++) {
      const samples = output[channel];

      for (let i = 0; i < samples.length; i++) {
        const p = pressure.length > 1 ? pressure[i] : pressure[0];
        const b = brightness.length > 1 ? brightness[i] : brightness[0];
        const unstable = instability.length > 1
          ? instability[i]
          : instability[0];

        // Slowly changing airflow irregularity.
        this.randomTimer--;

        if (this.randomTimer <= 0) {
          this.randomValue = this.random();
          this.randomTimer = Math.max(
            1,
            Math.floor(sampleRate / 40)
          );
        }

        // Broadband turbulent excitation.
        const noise = this.random();

        // Spectral shaping.
        const cutoff = Math.min(b, sampleRate * 0.45);
        const coefficient = Math.exp(
          -2 * Math.PI * cutoff / sampleRate
        );

        this.filterState =
          (1 - coefficient) * noise +
          coefficient * this.filterState;

        // Irregular airflow intensity.
        const variation =
          1 + this.randomValue * unstable * 0.6;

        samples[i] = this.filterState * p * variation;
      }
    }

    return true;
  }
}

registerProcessor("raven-turbulence", RavenTurbulence);
