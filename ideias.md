# Ideias — jogo de construção para crianças (three.js)

> Photoshop × Minecraft: uma barra à esquerda com **poucos blocos** e **poucas ferramentas**,
> que combinados dão muito. As crianças não "jogam um nível": constroem uma máquina,
> carregam ▶ e vêem o mundo reagir.

Nome provisório da pasta: `blocolab`.

---

## 1. Princípio de design

- **Fazer muito com pouco.** Cada bloco tem _uma_ regra simples; o interessante nasce da combinação
  (margens + água = rio; rampa + bola = descida; parede + água = barragem).
- **Dois modos, como no Incredible Machine / Poly Bridge:** ✏️ _Construir_ (mundo parado) e
  ▶ _Correr_ (física e água ligadas). Voltar a ✏️ repõe o estado inicial — experimentar não custa nada.
- **Desfazer é sagrado.** Ctrl+Z / botão grande. Errar tem de ser grátis.
- **Sem texto para os mais novos.** Ícones, cores, sons. Texto opcional para 10+.
- **Sandbox + desafios.** O mesmo editor serve o modo livre e os desafios ("leva a água até à flor").

### Referências a estudar

| Jogo                           | O que roubar                                                       |
| ------------------------------ | ------------------------------------------------------------------ |
| **Algodoo**                    | sandbox de física 2D para escolas — o mais próximo do que queremos |
| **From Dust**                  | água e terreno a interagir; rios que se formam sozinhos            |
| **Townscaper**                 | colocar blocos sem fricção, tudo encaixa e fica bonito             |
| **The Incredible Machine**     | desafios com peças limitadas, modo construir/correr                |
| **Minecraft (redstone, água)** | água em autómato celular; lógica com blocos                        |
| **The Powder Toy / Noita**     | "falling sand": materiais com regras simples                       |
| **Lightbot / Scratch Jr**      | programação por cartas para 5–8 anos                               |
| **GraviTrax**                  | pistas de berlindes — o brinquedo físico equivalente               |

---

## 2. A barra lateral (paleta)

### Ferramentas (lado Photoshop)

| Ícone | Ferramenta                                          | Notas                                                     |
| ----- | --------------------------------------------------- | --------------------------------------------------------- |
| 🖌️    | **Pincel** — põe o bloco escolhido                  | arrastar pinta uma linha de blocos                        |
| 🧽    | **Borracha**                                        |                                                           |
| 🪣    | **Balde** — enche uma área fechada                  | encher um lago, um chão                                   |
| ⛏️    | **Pá** — sobe/desce terreno                         | esculpir margens e vales                                  |
| 🔍    | **Conta-gotas** — escolhe o bloco que está no mundo |                                                           |
| 📋    | **Carimbo** — copia uma seleção                     | repetir um troço de pista                                 |
| 🧱    | **Camada** — ver/editar só um nível de altura       | equivalente às layers; resolve "não consigo clicar atrás" |
| ✋    | **Câmara** — rodar em passos de 90°, zoom           | rotação livre só para 10+                                 |

### Blocos — MVP (6)

| Bloco           | Regra                                 |
| --------------- | ------------------------------------- |
| ⬜ **Cubo**     | sólido, não se mexe                   |
| 📐 **Rampa**    | cunha; roda em 4 direções             |
| ⚪ **Bola**     | corpo físico (rola, cai, choca)       |
| 💧 **Nascente** | gera água sem parar                   |
| 🕳️ **Ralo**     | faz desaparecer água e bolas          |
| 🚩 **Alvo**     | "chegou aqui?" → vitória nos desafios |

### Blocos — depois do MVP

🌀 Ventoinha (empurra) · 🟩 Trampolim · 🧊 Gelo (sem atrito) · 🟫 Areia (cai, desliza) ·
🧲 Íman · ⚙️ Motor/roda · 🔦 Laser · 🪞 Espelho · 🔘 Botão de pressão · 💡 Lâmpada ·
🚪 Porta · 🔥 Lava · 🌱 Semente · 🤖 Robô programável · 🪵 Prancha (gangorra/alavanca) ·
⛓️ Corda/dobradiça · 🚤 Barco/boia

---

## 3. Mini-jogos e o que ensinam

Idade = idade mínima sugerida. Dificuldade técnica: 🟢 fácil · 🟡 médio · 🔴 difícil.

### Física / mecânica

| Mini-jogo                                                                | Conceito                   | Idade | Técnico                                                  |
| ------------------------------------------------------------------------ | -------------------------- | ----- | -------------------------------------------------------- |
| **Pista de berlindes** — leva a bola do topo ao 🚩                       | gravidade, plano inclinado | 5     | 🟢                                                       |
| **Corrida de rampas** — 3 rampas de inclinações diferentes, cronómetro   | velocidade vs. inclinação  | 8     | 🟢                                                       |
| **Planeta diferente** — slider de gravidade (Terra, Lua, Marte, Júpiter) | gravidade, peso            | 7     | 🟢                                                       |
| **Gelo, madeira, areia** — mesmo desafio com atrito diferente            | atrito                     | 7     | 🟢                                                       |
| **Dominó** — montar uma fila e derrubar                                  | energia em cadeia          | 5     | 🟢                                                       |
| **Bola pesada vs. leve** — massa e choques (bilhar)                      | massa, momento             | 9     | 🟢                                                       |
| **Trampolim** — acertar no alvo com saltos                               | elasticidade, trajetória   | 6     | 🟢                                                       |
| **Catapulta / gangorra** — alavanca com ponto de apoio móvel             | alavancas, binário         | 8     | 🟡                                                       |
| **Pêndulo** — bola numa corda                                            | período, energia           | 10    | 🟡                                                       |
| **Engrenagens** — ligar motor a rodas de tamanhos diferentes             | relação de transmissão     | 9     | 🟡 (fingir com restrição de rácio, não com dentes reais) |
| **Máquina de Rube Goldberg** — encadear tudo para tocar um sino          | sistemas, causa-efeito     | 8     | 🟡                                                       |
| **Ponte que aguenta** — ponte com peças que partem acima de X força      | estruturas, tensão         | 11    | 🔴                                                       |
| **Gráficos** (16+): velocidade/altura ao longo do tempo da bola          | cinemática, energia        | 13    | 🟡                                                       |

### Fluidos

| Mini-jogo                                                        | Conceito               | Idade | Técnico                       |
| ---------------------------------------------------------------- | ---------------------- | ----- | ----------------------------- |
| **Faz um rio** — margens + nascente → a água corre a descer      | escoamento, declive    | 5     | 🟡                            |
| **Rega a flor** — leva a água até à 🌱; a flor cresce            | caminhos, gravidade    | 5     | 🟡                            |
| **Barragem** — segura a água, abre uma comporta                  | pressão, armazenamento | 7     | 🟡                            |
| **Vasos comunicantes** — dois tanques ligados por baixo          | nível da água          | 9     | 🟡                            |
| **Flutua ou afunda** — bolas/barcos de materiais diferentes      | densidade, impulsão    | 7     | 🟡 (impulsão "fingida" chega) |
| **Moinho de água** — a corrente faz girar uma roda que liga algo | energia hidráulica     | 9     | 🟡                            |
| **Lava + água = pedra**                                          | estados da matéria     | 6     | 🟡                            |
| **Erosão** — a água vai comendo a areia e muda o rio             | geologia               | 10    | 🔴                            |

### Labirintos e algoritmos

| Mini-jogo                                                                                | Conceito                                         | Idade | Técnico |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ----- | ------- |
| **Constrói um labirinto, a bola encontra a saída**                                       | orientação espacial                              | 5     | 🟢      |
| **Água que resolve labirintos** — a água enche o labirinto e o caminho mais curto acende | **BFS** de forma visual (a água _é_ o algoritmo) | 8     | 🟢      |
| **Labirinto para o amigo** — partilhar por código                                        | criação, desafio                                 | 7     | 🟢      |
| **Mão na parede** — o robô segue sempre a parede direita; há labirintos onde falha       | algoritmos e os seus limites                     | 10    | 🟢      |
| **Corrida de algoritmos** — BFS vs. A* vs. aleatório, contador de passos                 | eficiência                                       | 13    | 🟢      |

### Programação

| Mini-jogo                                                              | Conceito            | Idade | Técnico                    |
| ---------------------------------------------------------------------- | ------------------- | ----- | -------------------------- |
| **Cartas de setas** — o robô segue ⬆️⬆️↪️⬆️                            | sequências          | 5     | 🟢                         |
| **Repetir** — carta "×3"                                               | ciclos              | 7     | 🟢                         |
| **Se vir parede…**                                                     | condições           | 9     | 🟡                         |
| **Funções** — gravar uma sequência como carta nova                     | abstração           | 10    | 🟡                         |
| **Lógica no mundo (redstone)** — botão → porta, E/OU/NÃO com blocos    | lógica booleana     | 9     | 🟡                         |
| **Fábrica** — tapetes rolantes + sensores separam bolas por cor        | autómatos, sistemas | 11    | 🟡                         |
| **Código a sério** (14+): o robô controla-se com JavaScript num editor | programação textual | 14    | 🟡 (sandbox em Web Worker) |

### Luz, eletricidade, magnetismo, vida

| Mini-jogo                                                  | Conceito           | Idade | Técnico                   |
| ---------------------------------------------------------- | ------------------ | ----- | ------------------------- |
| **Espelhos e laser** — acender o alvo                      | reflexão           | 7     | 🟢                        |
| **Circuitos** — pilha + fios + lâmpada; série vs. paralelo | eletricidade       | 10    | 🟡                        |
| **Ímanes** — atraem bolas de metal                         | forças à distância | 7     | 🟢                        |
| **Vento** — ventoinhas empurram barcos/balões              | forças             | 6     | 🟢                        |
| **Jardim** — plantas precisam de água e luz; espalham-se   | ecossistemas       | 6     | 🟡                        |
| **Dia e noite** — sol que se mexe, sombras                 | astronomia         | 8     | 🟢 (three.js faz sombras) |

---

## 4. O que é possível, difícil, impossível

### 🟢 Fácil (o three.js e o ecossistema dão quase tudo)

- **Mundo de blocos em grelha** — `InstancedMesh`, milhares de cubos a 60 fps.
- **Colocar/apagar com rato e toque** — raycasting do three.js.
- **Corpos rígidos** (bolas, rampas, dominós, choques, gravidade/atrito ajustáveis) —
  **Rapier** (WASM, rápido, determinista). Melhor que cannon-es.
- **Labirintos e pathfinding** — grelha + BFS/A*; animar a "inundação".
- **Laser e espelhos** — raycasting.
- **Sombras, dia/noite, materiais bonitos** — nativo.
- **Desfazer/refazer** — padrão de comandos sobre o modelo do mundo.
- **Guardar e partilhar** — o mundo é JSON pequeno; `localStorage` + código/URL comprimido.

### 🟡 Médio (dá, mas exige desenho cuidado)

- **Água.** A escolha central do projeto:
  - _Autómato celular à Minecraft_ (cada célula tem um nível 0–7, escorre para baixo e para os lados):
    simples, previsível, perfeito para "fiz as margens e tenho um rio". **Recomendado para o MVP.**
  - _Campo de alturas / águas rasas_ (estilo From Dust): mais bonito e com ondas; um pouco mais difícil.
  - Desenhar a superfície bonita (shader com transparência e ondulação) é trabalho à parte.
- **Água ↔ bolas.** Impulsão fingida (força para cima se a bola estiver numa célula com água)
  e arrasto pela corrente (vetor de fluxo da célula) — barato e convincente.
- **UX 3D para uma criança de 5 anos.** O maior risco _não técnico_. Mitigações: câmara isométrica
  fixa que roda em passos de 90°; ferramenta "camada"; blocos que encaixam sempre; botões grandes.
- **Juntas** (gangorras, pêndulos, rodas, motores) — o Rapier tem; afinar para não "explodir" dá trabalho.
- **Engrenagens** — fingir com restrição de rácio entre rodas em vez de dentes que colidem.
- **Lógica/redstone e circuitos** — propagação de sinal num grafo; simples no modelo, difícil de
  explicar visualmente.
- **Programação por cartas** — UI própria ou Blockly; o intérprete é fácil, a UI é que leva tempo.
- **Desempenho em tablets fracos / Chromebooks escolares** — limitar nº de bolas e tamanho do mundo.

### 🔴 Difícil (só depois do MVP, e talvez nunca)

- **Fluidos 3D realistas** (SPH/partículas, splashes) a correr no browser com muitos blocos.
  Possível em demos com WebGPU compute, caro de manter e de pôr a interagir com tudo.
- **Pontes que partem com tensão realista** — dá com juntas que quebram acima de um limiar,
  mas afinar para ser justo e compreensível é muito trabalho.
- **Erosão** que muda o terreno de forma credível.
- **Multijogador em tempo real** — sincronizar física é duro (e traz questões de segurança infantil).
- **Mundos grandes com física em todo o lado** — tem de haver "chunks" adormecidos.

### ⛔ Impossível ou não vale a pena

- **Simulação fluida exata (Navier-Stokes 3D) ao vivo** em hardware de criança.
- **Física 100% determinista entre browsers/dispositivos diferentes** (afeta "partilha o teu desafio
  e vai dar igual") — o Rapier ajuda muito mas floats em plataformas diferentes podem divergir;
  aceitar pequenas diferenças.
- **Tecidos, corpos moles, cordas longas realistas** com muitos objetos ao mesmo tempo.
- **Chat aberto entre crianças** — tecnicamente possível, legalmente (RGPD / COPPA) e eticamente não.
  Partilha só por código, sem contas, sem dados pessoais.

---

## 5. MVP

**Pergunta a validar:** _uma criança de 6–8 anos, sem ajuda, consegue em menos de 2 minutos
fazer um rio ou uma pista de bolas e quer mostrar a alguém?_

### Âmbito

- Mundo 32×32×12, câmara isométrica que roda em 90°.
- 6 blocos: Cubo, Rampa, Bola, Nascente, Ralo, Alvo.
- 5 ferramentas: Pincel, Borracha, Pá, Desfazer, Câmara.
- Modos ✏️ Construir / ▶ Correr (repõe ao voltar).
- Bolas com Rapier; água em autómato celular; impulsão fingida.
- 3 desafios: **"Leva a bola ao 🚩"**, **"Rega a flor"**, **"A água resolve o labirinto"**.
- Guardar no browser. Sem contas, sem servidor.

### Fora do MVP

Programação, lógica, luz, ímanes, multijogador, partilha online, gráficos, sons elaborados.

### Fatias verticais (cada uma jogável)

1. Grelha + câmara + pôr/tirar cubos (rato e toque).
2. Desfazer + rampas com rotação + ferramenta Pá.
3. Bola + Rapier + modo Construir/Correr.
4. Água em autómato celular (nascente, ralo, escorrer); superfície simples.
5. Bolas a flutuar e a ser levadas pela corrente.
6. Alvo + desafios + ecrã de vitória.
7. Guardar/carregar local.
8. Teste com crianças reais → decidir o que vem a seguir.

### Stack sugerida

- **Vite + TypeScript + three.js** — ou **react-three-fiber + drei + @react-three/rapier**
  se a UI das barras for em React (acelera muito).
- **Rapier** (`@dimforge/rapier3d-compat`) para física.
- **Modelo do mundo sem three.js** (grelha, blocos, água, regras dos desafios) — testável com Vitest,
  rápido, e a renderização é só um adaptador. A simulação de água é lógica pura: ótima para testes.
- **Playwright** para os fluxos de UI (pintar, correr, ganhar desafio).
- PWA para funcionar offline em tablets.

---

## 6. Faixas etárias (5–16 é muita coisa)

| Idade | Interface                                                                      | Tipo de desafio                                    |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 5–7   | só ícones, câmara fixa, poucos blocos, sem falhar "mal"                        | "leva a bola ali", "rega a flor"                   |
| 8–11  | todos os blocos, desafios com peças limitadas, cartas de programação           | Rube Goldberg, labirintos, circuitos               |
| 12–16 | câmara livre, sliders (gravidade, atrito, massa), medidores e gráficos, código | experiências "científicas", otimização, algoritmos |

Ideia: **ferramentas de medição** como blocos — 📏 régua, ⏱️ cronómetro, 🚀 velocímetro.
Transformam brincadeira em experiência científica sem mudar de jogo.

---

## 7. Perguntas em aberto

- Plataforma principal: tablet (toque) ou computador da escola (rato)? Muda a UX toda.
- Escolas como público (precisa de modo professor / desafios por turma) ou só famílias?
- Estética: voxel colorido (Townscaper) ou mais "brinquedo de madeira" (GraviTrax)?
- Som/narração para quem ainda não lê?
