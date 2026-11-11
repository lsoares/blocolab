export class BuzzerSound {
  private audio?: { context: AudioContext; volume: GainNode }

  play() {
    const { context, volume } = this.prepare()
    void context.resume()
    volume.gain.setTargetAtTime(0.04, context.currentTime, 0.02)
  }

  silence() {
    if (!this.audio) return
    this.audio.volume.gain.setTargetAtTime(0, this.audio.context.currentTime, 0.02)
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
  const buzz = context.createOscillator()
  buzz.type = 'square'
  buzz.frequency.value = 440
  buzz.connect(volume).connect(context.destination)
  buzz.start()
  return { context, volume }
}
