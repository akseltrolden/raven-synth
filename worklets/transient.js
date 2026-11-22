class RavenTransient extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "strength",
        defaultValue: 0.7,
        minValue: 0,
        maxValue: 1
      },
      {
        name: "duration",
        defaultValue: 8,
        minValue: 0.1,
        maxValue: 100,
        automationRate: "k-rate"
      },
      {
        name: "character",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate"
      },
      {
        name: "pitch",
        defaultValue: 3000,
        minValue: 200,
        maxValue: 10000,
        automationRate: "k-rate"
      },
      {
        name: "decay",
        defaultValue: 2.5,
        minValue: 0.5,
        maxValue: 8,
        automationRate: "k-rate"
      }
    ];
  }

  constructor() {
    super();

    this.seed = 987654321;
    this.events = [];

    this.port.onmessage = event => {
      if (event.data && event.data.type === "trigger") {
        this.events.push({
          position: 0,
          duration: event.data.duration || null,
          strength: event.data.strength ?? 1,
          character: event.data.character ?? 0.5
        });
      }
    };
  }

  random() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;

    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];

    const defaultDuration = parameters.duration[0];
    const defaultStrength = parameters.strength[0];
    const defaultCharacter = parameters.character[0];
    const pitch = parameters.pitch[0];
    const decay = parameters.decay[0];

    for (const channel of output) {
      channel.fill(0);
    }

    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];

      const duration = event.duration || defaultDuration;

      const length = Math.max(
        1,
        Math.floor(duration * sampleRate / 1000)
      );

      const strength = event.strength * defaultStrength * 10;
      const character = event.character ?? defaultCharacter;

      for (
        let sample = 0;
        sample < output[0].length && event.position < length;
        sample++
      ) {
        const progress = event.position / length;

        // Decay controls how sharply the transient disappears.
        const envelope = Math.pow(
          Math.max(0, 1 - progress),
          decay
        );

        // Broadband component.
        const noise = this.random() * 2 - 1;

        // Tonal component.
        const tonal = Math.sin(
          2 * Math.PI * pitch *
          event.position / sampleRate
        );

        // Blend noisy and tonal components.
        const signal =
          (noise * character + tonal * (1 - character)) *
          envelope * strength;

        for (const channel of output) {
          channel[sample] += signal;
        }

        event.position++;
      }

      if (event.position >= length) {
        this.events.splice(i, 1);
      }
    }

    return true;
  }
}

registerProcessor("raven-transient", RavenTransient);
