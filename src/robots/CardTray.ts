import type { Card } from './Cards.ts'

type Handlers = { onCard(card: Card): void; onRun(): void; onClear(): void }

type TrayState = { cards: Card[]; running: boolean; current?: number }

const looks: Record<Card, { name: string; icon: string }> = {
  forward: { name: 'Avançar', icon: '⬆️' },
  'turn-left': { name: 'Virar à esquerda', icon: '↩️' },
  'turn-right': { name: 'Virar à direita', icon: '↪️' },
}

export class CardTray {
  private readonly queue: HTMLOListElement
  private readonly runButton: HTMLButtonElement
  private readonly clearButton: HTMLButtonElement
  private readonly cardButtons: HTMLButtonElement[]

  constructor(after: HTMLElement, handlers: Handlers) {
    const tray = document.createElement('section')
    tray.className = 'program'
    tray.setAttribute('aria-label', 'Programa')
    tray.innerHTML = `
      <div class="cards">${(Object.keys(looks) as Card[])
        .map(
          (card) =>
            `<button type="button" data-card="${card}"><span aria-hidden="true">${looks[card].icon}</span>${looks[card].name}</button>`,
        )
        .join('')}</div>
      <ol class="queue" aria-label="Cartas do programa"></ol>
      <div class="actions">
        <button type="button" class="run"><span aria-hidden="true">▶</span> Executar</button>
        <button type="button" class="clear">Limpar</button>
      </div>`
    after.insertAdjacentElement('afterend', tray)
    this.queue = tray.querySelector('.queue') as HTMLOListElement
    this.runButton = tray.querySelector('.run') as HTMLButtonElement
    this.clearButton = tray.querySelector('.clear') as HTMLButtonElement
    this.cardButtons = [...tray.querySelectorAll<HTMLButtonElement>('[data-card]')]
    for (const button of this.cardButtons) {
      button.addEventListener('click', () => handlers.onCard(button.dataset.card as Card))
    }
    this.runButton.addEventListener('click', handlers.onRun)
    this.clearButton.addEventListener('click', handlers.onClear)
  }

  show({ cards, running, current }: TrayState) {
    this.queue.innerHTML = cards
      .map(
        (card, index) =>
          `<li${index === current ? ' class="current" aria-current="step"' : ''}><span aria-hidden="true">${looks[card].icon}</span><span class="visually-hidden">${looks[card].name}</span></li>`,
      )
      .join('')
    this.runButton.disabled = running || cards.length === 0
    this.clearButton.disabled = running || cards.length === 0
    for (const button of this.cardButtons) button.disabled = running
  }
}
