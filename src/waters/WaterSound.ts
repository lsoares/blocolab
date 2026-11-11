export class WaterSound {
  private audio?: { context: AudioContext; volume: GainNode }

  play() {
    const { context, volume } = this.prepare()
    void context.resume()
    volume.gain.setTargetAtTime(0.12, context.currentTime, 0.1)
  }

  silence() {
    if (!this.audio) return
    this.audio.volume.gain.setTargetAtTime(0, this.audio.context.currentTime, 0.1)
  }

  private prepare() {
    this.audio ??= createAudio()
    return this.audio
  }
}

function createAudio() {
  const context = new AudioContext()
  const volume = context.createGain()
  volume.gain.value = 0
  const rush = context.createBufferSource()
  rush.buffer = createNoise(context)
  rush.loop = true
  const stream = context.createBiquadFilter()
  stream.type = 'bandpass'
  stream.frequency.value = 700
  stream.Q.value = 0.8
  const burble = context.createGain()
  burble.gain.value = 0.7
  const wobble = context.createOscillator()
  wobble.frequency.value = 3
  const wobbleDepth = context.createGain()
  wobbleDepth.gain.value = 0.3
  wobble.connect(wobbleDepth).connect(burble.gain)
  rush.connect(stream).connect(burble).connect(volume).connect(context.destination)
  rush.start()
  wobble.start()
  return { context, volume }
}

function createNoise(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1
  return buffer
}
