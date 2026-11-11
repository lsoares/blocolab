export class TrainSound {
  private audio?: { context: AudioContext; volume: GainNode }
  private rolling = false

  play() {
    const { context, volume } = this.prepare()
    if (context.state === 'suspended') void context.resume()
    if (this.rolling) return
    this.rolling = true
    volume.gain.setTargetAtTime(0.14, context.currentTime, 0.15)
  }

  silence() {
    if (!this.audio || !this.rolling) return
    this.rolling = false
    this.audio.volume.gain.setTargetAtTime(0, this.audio.context.currentTime, 0.2)
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
  volume.connect(context.destination)
  const noise = createNoise(context)
  chuffing(context, noise, 3.5).connect(volume)
  clacking(context, noise, 7).connect(volume)
  return { context, volume }
}

function chuffing(context: AudioContext, noise: AudioBuffer, beatsPerSecond: number) {
  const puffs = context.createGain()
  puffs.gain.value = 0.5
  pulse(context, beatsPerSecond, 0.5).connect(puffs.gain)
  const steam = context.createBiquadFilter()
  steam.type = 'lowpass'
  steam.frequency.value = 900
  loop(context, noise).connect(steam).connect(puffs)
  return puffs
}

function clacking(context: AudioContext, noise: AudioBuffer, beatsPerSecond: number) {
  const clicks = context.createGain()
  clicks.gain.value = 0.15
  pulse(context, beatsPerSecond, 0.15).connect(clicks.gain)
  const metal = context.createBiquadFilter()
  metal.type = 'bandpass'
  metal.frequency.value = 2400
  loop(context, noise).connect(metal).connect(clicks)
  return clicks
}

function pulse(context: AudioContext, beatsPerSecond: number, depth: number) {
  const beat = context.createOscillator()
  beat.type = 'sawtooth'
  beat.frequency.value = beatsPerSecond
  const swing = context.createGain()
  swing.gain.value = depth
  beat.connect(swing)
  beat.start()
  return swing
}

function loop(context: AudioContext, noise: AudioBuffer) {
  const source = context.createBufferSource()
  source.buffer = noise
  source.loop = true
  source.start()
  return source
}

function createNoise(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1
  return buffer
}
