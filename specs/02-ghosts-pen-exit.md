# SPEC 02 — Salida secuencial de fantasmas desde la pen

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-08-14
> **Objective:** Los 4 fantasmas arrancan dentro de la pen y salen uno por uno con 1 segundo de diferencia, con animación de subida por la puerta, reapareciendo dentro de la pen al ser eliminados y repitiendo la salida secuencial.

## Scope

**In:**

- Los 4 `GHOST_STARTS` se mueven a posiciones dentro de la pen.
- Cola de salida (`penQueue`) que encola fantasmas al iniciar la partida y al reaparecer tras ser eliminados.
- Temporizador de 1 segundo (60 frames a 60 fps) entre cada salida.
- **Animación de salida:** el fantasma sube verticalmente desde su posición de pen hasta la celda de salida (y=11) a `GHOST_SPEED`. Durante la animación no ejecuta IA.
- El fantasma que está en la cola de salida no se dibuja hasta que comience su animación.
- Al ser eliminado (colisión con Pacman), el fantasma reaparece dentro de la pen y se añade al final de la cola de salida.
- `resetPositions` (al perder una vida) mantiene la cola de salida intacta.

**Out of scope (specs futuros):**

- Velocidad de salida distinta a la velocidad normal del fantasma.
- Modo en que los fantasmas "espían" a Pacman desde dentro de la pen antes de salir.

## Data model

```js
const PEN_EXIT_INTERVAL = 60; // frames entre cada salida (1 s a 60 fps)

// Posiciones dentro de la pen (4 celdas vacías en el interior)
const GHOST_PEN_POSITIONS = [
  { x: 13, y: 14 },
  { x: 14, y: 14 },
  { x: 13, y: 15 },
  { x: 14, y: 15 },
];

// Celda donde el fantasma aparece al terminar la animación de salida.
// y=11 es transitable (fila con dots) y desde ahí el fantasma tiene salida
// lateral (x=9-18) hacia el resto del laberinto.
const PEN_EXIT_TARGET = { y: 11 };

// Añadido al objeto game retornado por createGame()
const game = {
  // ...campos existentes...
  penQueue: [],        // índices de fantasmas esperando salir (FIFO)
  penTimer: 0,         // frames desde la última salida
};
```

Cada fantasma añade campos:

```js
g.inPen = true;       // true = en la cola de salida, false = jugando normalmente
g.exitingPen = false; // true = animación de subida en curso
```

Convenciones:

- `penQueue` almacena índices de `game.ghosts`.
- `penTimer` se incrementa en cada frame; al alcanzar `PEN_EXIT_INTERVAL` se extrae el siguiente fantasma de la cola y comienza su animación de salida.
- Un fantasma con `inPen === true` y `exitingPen === false` no se dibuja ni se mueve.
- Un fantasma con `exitingPen === true` se mueve hacia arriba a `GHOST_SPEED` hasta alcanzar `PEN_EXIT_TARGET.y`.

## Implementation plan

1. **Mover `GHOST_STARTS` dentro de la pen en `maze.js`.** Las 4 posiciones apuntan a `GHOST_PEN_POSITIONS`. El juego sigue ejecutable.
2. **Añadir constantes y estado en `game.js`.** Definir `PEN_EXIT_INTERVAL`, `GHOST_PEN_POSITIONS`, `PEN_EXIT_TARGET`. Añadir `penQueue` y `penTimer` al game state. Añadir `inPen` y `exitingPen` a cada fantasma en `createGame`. El juego sigue ejecutable.
3. **Implementar lógica de salida en `update()` en `game.js`.** Cada frame, si `penQueue` no está vacío, incrementar `penTimer`. Al alcanzar `PEN_EXIT_INTERVAL`, sacar el primer elemento de `penQueue`, poner `inPen: false` y `exitingPen: true`, y reiniciar `penTimer`. El primer fantasma sale inmediatamente (timer arranca en `PEN_EXIT_INTERVAL`). Test manual: iniciar la partida y ver que el primer fantasma comienza a subir al segundo, el segundo a los 2 s, etc.
4. **Implementar animación de subida en `moveGhost()` en `game.js`.** Si `g.exitingPen === true`, mover `g.y` hacia arriba a `GHOST_SPEED` sin ejecutar `decideGhost`. Cuando `g.y <= PEN_EXIT_TARGET.y` (11), poner `g.y = PEN_EXIT_TARGET.y`, `g.exitingPen = false` y el fantasma pasa a jugar con su IA normal. La celda (13, 11) es transitable y desde ahí el fantasma puede moverse a los lados (x=9-18), con salida garantizada. Test manual: el fantasma sube por la pen y luego se mueve según su comportamiento.
5. **Bloquear movimiento de fantasmas en cola en `moveGhost()` en `game.js`.** Si `g.inPen === true` y `g.exitingPen === false`, no ejecutar `decideGhost` ni actualizar posición. Test manual: fantasmas en la cola no se mueven.
6. **Reintegro al ser eliminados en `update()` en `game.js`.** Crear el helper `requeueGhost( game, i )` que reintegra un solo fantasma: lo posiciona en `GHOST_PEN_POSITIONS[0]`, pone `inPen: true` y `exitingPen: false`, añade su índice al final de `penQueue` y reinicia `penTimer = 0`. Test manual: verificar que un fantasma eliminado reaparece dentro de la pen y luego sale con animación.
7. **Ajustar `resetPositions()` en `game.js`.** Todos los fantasmas vuelven a `GHOST_PEN_POSITIONS` con `inPen: true` y `exitingPen: false`. La cola se reconstruye (`penQueue = [ 0, 1, 2, 3 ]`) y `penTimer = PEN_EXIT_INTERVAL` para que el primer fantasma salga inmediatamente. Así `resetPositions()` gestiona la pen por completo y evita que un fantasma ya salido reaparezca sin causa. El juego sigue ejecutable.
8. **Dibujar fantasmas en pen en `render.js`.** Si `g.inPen === true` y `g.exitingPen === false`, no dibujar el fantasma (está oculto en la pen). Si `g.exitingPen === true`, dibujar el fantasma en su posición actual (animando la subida). Si `g.inPen === false`, dibujar en su posición normal. Test manual: al iniciar la partida no se ven fantasmas en la pen, pero sí subiendo por la puerta uno por uno.

Cada paso deja el juego ejecutable abriendo `src/index.html`.

## Acceptance criteria

- [ ] Al iniciar la partida, los 4 fantasmas están dentro de la pen (no visibles).
- [ ] El primer fantasma comienza a subir por la pen inmediatamente al iniciar.
- [ ] El segundo fantasma comienza a subir 1 segundo después del primero.
- [ ] El tercero comienza a subir 1 segundo después del segundo.
- [ ] El cuarto comienza a subir 1 segundo después del tercero.
- [ ] Cada fantasma sube a `GHOST_SPEED` (misma velocidad que en el juego).
- [ ] La subida es vertical, desde la posición de pen hasta y=11.
- [ ] Al llegar a y=11, el fantasma comienza a moverse según su IA normal (nunca queda atrapado en un callejón sin salida).
- [ ] Los fantasmas en la cola de salida no se dibujan.
- [ ] Los fantasmas subiendo por la pen sí se dibujan con su color y nombre.
- [ ] Al colisionar con Pacman, el fantasma reaparece dentro de la pen.
- [ ] El fantasma reintegrado sube con animación tras 1 segundo en la cola.
- [ ] Al perder una vida, todos los fantasmas vuelven a la pen y salen secuencialmente.
- [ ] Tras perder una vida, los fantasmas solo salen de la pen una vez cada uno, sin repetir la secuencia de salida de forma espontánea.
- [ ] `resetPositions()` reconstruye la cola (`penQueue = [ 0, 1, 2, 3 ]`) y el temporizador (`penTimer = PEN_EXIT_INTERVAL`).
- [ ] La consola no muestra errores.

## Decisions

- **Sí:** Todos los fantasmas arrancan dentro de la pen. Coincide con el comportamiento clásico.
- **Sí:** Cola FIFO para la salida. Orden predecible y fácil de depurar.
- **Sí:** 1 segundo de intervalo. Ritmo clásico.
- **Sí:** `inPen` y `exitingPen` como booleanos por fantasma. Simple y explícito.
- **Sí:** Animación de subida a `GHOST_SPEED`. Misma velocidad que el juego, coherente.
- **Sí:** Ocultar fantasmas en la cola. Solo se ven cuando comienzan a subir.
- **Sí:** Reintegro en la primera posición disponible de `GHOST_PEN_POSITIONS`.
- **Sí:** `requeueGhost( game, i )` como helper de reintegro individual. Reutilizable para un futuro spec de power pellets.
- **Sí:** `resetPositions()` gestiona la pen por completo (posición, `inPen`, `exitingPen`, `penQueue`, `penTimer`). Evita que un fantasma ya salido reaparezca sin causa.
- **Sí:** `PEN_EXIT_TARGET = { y: 11 }`. La fila y=11 es transitable (x=9-18) y da salida lateral hacia el laberinto. Las filas y=12 (puerta, muro para fantasmas) y y=13 (interior pen, sin salida lateral hacia el laberinto) no sirven como objetivo de salida.
- **No:** Posiciones de pen más abajo (y=16). La fila 16 es muro (`########`); la pen solo tiene 3 filas transitables (13, 14, 15), ya usadas en `GHOST_PEN_POSITIONS`.
- **No:** `penExitIndex`. Código muerto, nunca se usó; la cola es suficiente.
- **No:** Velocidad de salida distinta. La normal basta.
- **No:** Estado intermedio "saliendo de la pen" aparte de la animación. El fantasma pasa directamente a jugar al llegar a y=11.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `GHOST_PEN_POSITIONS` incluye una celda muro | Definir en celdas vacías (0) dentro de la pen; verificar manualmente. |
| Varias colisiones simultáneas causan múltiples reintegros | Procesar en bucle y añadir cada fantasma al final de `penQueue`. |
| `penTimer` acumula frames y produce salidas más rápidas | Reiniciar `penTimer` a 0 cada vez que se extrae un fantasma. |
| Fantasma en animación colisiona con Pacman antes de salir | Durante `exitingPen`, no detectar colisiones hasta que termine la animación. |
| Fantasma ya salido reaparece en la pen sin causa | `resetPositions()` reconstruye cola y temporizador; solo la pérdida de vida o `requeueGhost` reintegran a la pen. |
| Fantasma queda atrapado al terminar la animación (celda de salida sin salida) | `PEN_EXIT_TARGET = { y: 11 }`, celda transitable con salida lateral (x=9-18); no se detiene en el interior de la pen (y=13). |

## Qué **no** está en este spec

- Velocidad de salida diferente a la normal.
- Comportamiento de los fantasmas antes de salir (mirar a Pacman, etc.).
- Modo de juego con menos de 4 fantasmas.
- Cambios en la lógica de colisión o puntuación.

Cada uno de esos, si llega, va en su propio spec.