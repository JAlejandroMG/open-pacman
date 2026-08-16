# SPEC 03 — Power pellets para comer fantasmas

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-14
> **Objective:** Agregar 4 power pellets en las esquinas del laberinto que al ser comidas activan durante 6 segundos un modo en el que los fantasmas huyen de Pacman y pueden ser comidos, reapareciendo en la pen, y al comer el último dot el laberinto se restaura completo.

## Scope

**In:**

- 4 power pellets en las celdas de las 4 esquinas del laberinto.
- Power pellets visibles (más grandes que un dot normal, con parpadeo).
- Al comer una power pellet: modo poder activo por 6 segundos (360 frames).
- **Modo frightened:** mientras `powerTimer > 0`, todos los fantasmas huyen de Pacman eligiendo la dirección que maximiza la distancia Manhattan; si hay empate, eligen al azar entre las direcciones empatadas.
- Fantasmas en modo vulnerable (cambian de color/apariencia) mientras `powerTimer > 0`.
- Pacman puede comer fantasmas durante el modo poder: 200 puntos por fantasma.
- Fantasma comido reaparece en la pen con `requeueGhost()` del spec 02 y sale secuencialmente.
- Los fantasmas en la pen (en cola o saliendo) también cambian de color durante el modo frightened.
- Timer del modo poder visible en pantalla (barra o indicador).
- Al terminar los 6 segundos, los fantasmas vuelven a su IA original desde su posición actual.
- **Reset completo del laberinto al agotarse todos los dots:** cuando `dotsRemaining === 0` y `powerPellets === 0`, se restaura el laberinto completo desde `MAZE` (pristine), se restablecen las 4 power pellets, y los fantasmas vuelven a la pen y salen secuencialmente. Score y vidas se mantienen.
- Las power pellets comidas desaparecen permanentemente por ciclo: no se restauran al perder una vida.
- No hay condición de victoria: al agotarse todos los dots el laberinto se restaura y el juego continúa (bucle infinito de ciclos).

**Out of scope (specs futuros):**

- Escalado de puntos por orden de comida (200, 400, 800, 1600).
- Sonidos o efectos de sonido.
- Restauración de power pellets al perder una vida (dentro de un ciclo).
- Dificultad progresiva entre ciclos.

## Data model

```js
// Constantes de power pellets
const POWER_DURATION = 360; // frames (6 segundos a 60 fps)
const POWER_POINTS = 200;   // puntos por fantasma comido con poder

// Posiciones de las 4 power pellets (esquinas del laberinto)
const POWER_PELLET_POSITIONS = [
  { x: 1,  y: 1  },  // esquina superior-izquierda
  { x: 26, y: 1  },  // esquina superior-derecha
  { x: 1,  y: 29 },  // esquina inferior-izquierda
  { x: 26, y: 29 },  // esquina inferior-derecha
];
```

El laberinto (`MAZE_STR`) usa un nuevo carácter para power pellets:

| Char | Value | Meaning |
|------|-------|---------|
| `o`  | 4     | Power pellet (walkable, da poder al ser comida) |

Campos añadidos al game state en `createGame()`:

```js
const game = {
  // ...campos existentes...
  powerTimer: 0,   // frames restantes de poder (0 = sin poder)
  powerPellets: 4, // power pellets restantes en el laberinto
};
```

Campo nuevo por fantasma:

```js
g.frightened = false; // true mientras powerTimer > 0
```

Convenciones:

- `powerTimer` se decrementa cada frame mientras es > 0.
- `powerTimer > 0` indica que Pacman tiene el poder activo.
- El carácter `o` (value 4) se parsea como celda transitable (como `.`), pero con valor distinto para distinguirlo en la lógica del juego.
- Las power pellets se eliminan del `game.grid` al ser comidas (su celda se convierte en 0) y no se restauran dentro del ciclo; solo el reset completo del laberinto las restaura.
- Al reset completo, `game.grid` se sobreescribe con `MAZE.map(row => row.slice())`, `dotsRemaining` se recalcula desde el grid restaurado, `powerPellets = 4` y `powerTimer = 0`.

## Implementation plan

1. **Añadir power pellets al laberinto en `maze.js`.** Reemplazar las 4 celdas de esquina (`.` → `o`) en `MAZE_STR` y actualizar la tabla de caracteres. El juego sigue ejecutable: las power pellets se ven como dots hasta que se implemente su lógica.
2. **Parsear power pellets en `maze.js`.** En `parseTile`, tratar `o` como value 4 (celda transitable, no bloquea). Las 4 esquinas ahora son walkable con un valor especial.
3. **Añadir constantes y estado en `game.js`.** Definir `POWER_DURATION`, `POWER_POINTS`, `POWER_PELLET_POSITIONS`. Añadir `powerTimer` y `powerPellets` al game state y `frightened: false` a cada fantasma en `createGame`. El juego sigue ejecutable.
4. **Detectar comida de power pellet en `update()` en `game.js`.** Cuando Pacman entra a una celda con value 4, convertirla a 0 en `game.grid`, poner `powerTimer = POWER_DURATION`, decrementar `powerPellets` y sumar 10 puntos (mismo que un dot normal). Test manual: comer una power pellet en la esquina.
5. **Implementar timer de poder en `update()` en `game.js`.** Si `powerTimer > 0`, decrementar en cada frame. Al llegar a 0, poner `frightened = false` en todos los fantasmas. Test manual: comer una power pellet y verificar que el poder termina a los 6 segundos.
6. **Modo frightened en `decideGhost()` en `game.js`.** Si `g.frightened === true`, calcular la distancia Manhattan a la celda actual de Pacman para cada dirección de `choices` y elegir la que la **maximiza**; si hay empate, elegir al azar entre las empatadas. Este comportamiento reemplaza la IA normal (`hunter`, `patroller`, etc.) mientras está frightened. Test manual: con poder activo, los fantasmas se alejan de Pacman.
7. **Detectar colisión con fantasma durante el poder en `update()` en `game.js`.** Si `powerTimer > 0` y Pacman colisiona con un fantasma que no está en la pen ni saliendo de ella, llamar a `requeueGhost(game, i)` y sumar `POWER_POINTS`. El fantasma reaparece en la pen y sale secuencialmente según el spec 02. Test manual: comer un fantasma con poder activo.
8. **Mantener comportamiento normal de colisión sin poder.** Si `powerTimer === 0` y Pacman colisiona con un fantasma, se ejecuta la lógica actual (perder vida). No se altera. Test manual: chocar con un fantasma sin poder y verificar que se pierde una vida.
9. **Restablecer `powerTimer` en `resetPositions()` en `game.js`.** Al perder una vida, poner `powerTimer = 0` y `frightened = false` en todos los fantasmas. Las power pellets comidas permanecen fuera del laberinto. El juego sigue ejecutable.
10. **Reset completo del laberinto en `update()` en `game.js`.** Al final de `update()`, verificar `if (game.dotsRemaining === 0 && game.powerPellets === 0)`. Si se cumple: `game.grid = MAZE.map(row => row.slice())`, recalcular `dotsRemaining` desde el grid restaurado, `powerPellets = 4`, `powerTimer = 0`, restablecer fantasmas a `GHOST_PEN_POSITIONS` con `frightened = false`, reconstruir `penQueue = [0, 1, 2, 3]` y `penTimer = PEN_EXIT_INTERVAL`. Score y vidas no se tocan. Test manual: comer el último dot (normal o power pellet) y ver el laberinto restaurado con los fantasmas saliendo de la pen.
11. **Dibujar power pellets en `render.js`.** En el bucle de dibujado del laberinto, si la celda es 4, dibujar un círculo grande (radio ~4px) con color blanco/amarillo en lugar del dot pequeño. Añadir efecto de parpadeo (alternar opacidad cada N frames). Test manual: las 4 power pellets se distinguen de los dots normales.
12. **Dibujar fantasmas en modo frightened en `render.js`.** Si `powerTimer > 0`, dibujar fantasmas con color azul oscuro (o color distinto al normal) y con la boca apuntando hacia arriba (forma invertida). El nombre no se muestra durante el modo. Test manual: con poder activo, los fantasmas cambian de aspecto.
13. **Mostrar timer de poder en el HUD en `render.js`.** Si `powerTimer > 0`, dibujar una barra horizontal en la parte superior del canvas que se vacía de izquierda a derecha proporcionalmente al tiempo restante. Color: cian. Test manual: al activar el poder aparece la barra y se vacía en 6 segundos.
14. **Dibujar puntos al comer fantasma en `render.js`.** Al comer un fantasma con poder, mostrar brevemente "200" sobre la posición donde fue comido (1 segundo, ~60 frames). Test manual: comer un fantasma y ver los puntos.

Cada paso deja el juego ejecutable abriendo `src/index.html`.

## Acceptance criteria

- [x] Aparecen exactamente 4 power pellets en las esquinas del laberinto.
- [x] Las power pellets son visibles y se distinguen de los dots normales.
- [x] Las power pellets parpadean (efecto visual).
- [x] Al comer una power pellet, se activa el modo poder por 6 segundos exactos.
- [x] Durante el modo poder, los fantasmas huyen de Pacman: eligen la dirección que maximiza la distancia Manhattan (y al azar entre las empatadas).
- [x] Durante el modo poder, los fantasmas cambian de color (azul oscuro o similar).
- [x] Durante el modo poder, la forma visual de los fantasmas cambia (boca invertida).
- [x] Los fantasmas en la pen (en cola o saliendo) también cambian de color en modo frightened.
- [x] Durante el modo poder, Pacman puede comer fantasmas por 200 puntos cada uno.
- [ ] Al comer un fantasma con poder, aparece "200" sobre la posición de la colisión.
- [x] El fantasma comido reaparece en la pen y sale secuencialmente (spec 02).
- [x] La barra de timer de poder se muestra y se vacía en 6 segundos.
- [x] Al terminar los 6 segundos, los fantasmas vuelven a su color, forma y comportamiento de IA original desde su posición actual.
- [x] Al terminar los 6 segundos, `frightened` se pone a `false` en todos los fantasmas.
- [x] Al terminar los 6 segundos, la barra de timer desaparece.
- [x] Si Pacman choca con un fantasma sin poder activo, pierde una vida (comportamiento actual).
- [x] Al perder una vida, `powerTimer` se restablece a 0 y `frightened` a `false` en todos los fantasmas.
- [x] Las power pellets comidas no se restauran al perder una vida (dentro del ciclo).
- [x] Al perder una vida, los fantasmas vuelven a la pen y salen secuencialmente.
- [x] Al comer el último dot (normal o power pellet) cuando ambos se agotaron, el laberinto se restaura completo.
- [x] Al restaurarse el laberinto, las 4 celdas de esquina vuelven a ser power pellets.
- [x] Al restaurarse el laberinto, los fantasmas vuelven a la pen y salen secuencialmente.
- [x] Al restaurarse el laberinto, `powerTimer` se pone a 0.
- [x] Al restaurarse el laberinto, score y vidas se mantienen.
- [ ] La consola no muestra errores.

## Decisions

- **Sí:** 4 power pellets, una por esquina. Posiciones fijas, simétricas, fáciles de recordar.
- **Sí:** 6 segundos de duración (360 frames). Tiempo clásico, suficiente para comer fantasmas sin ser trivial.
- **Sí:** 200 puntos por fantasma, sin escalado. Más simple y predecible.
- **Sí:** Modo frightened = huir de Pacman maximizando la distancia Manhattan. Es el comportamiento inverso al `hunter` (que la minimiza) y reutiliza la misma infraestructura de `choices`/`bestDirTo`.
- **Sí:** Desempate aleatorio entre direcciones con la misma distancia máxima. Evita trayectorias predecibles.
- **Sí:** Fantasmas en la pen también cambian de color en frightened. No se mueven (la cola/animación los controla), pero se ven afectados visualmente.
- **Sí:** Al terminar el poder, los fantasmas vuelven a su IA original desde su posición actual. Sin teleport ni reinicio de posición.
- **Sí:** Sin animación de muerte. El fantasma reaparece directo en la pen con `requeueGhost()` del spec 02. Mantiene la simplicidad.
- **Sí:** Reset completo del laberinto al agotarse todos los dots. Coincide con el Pacman clásico: nuevo ciclo sin perder score ni vidas.
- **Sí:** Verificación `dotsRemaining === 0 && powerPellets === 0` para el reset. Ambos deben llegar a 0; así el reset ocurre al comer el último dot, ya sea normal o power pellet.
- **Sí:** Sin condición de victoria. El juego es un bucle infinito de ciclos; `won` deja de alcanzarse.
- **Sí:** Power pellets comidas desaparecen permanentemente por ciclo. No se restauran al perder una vida; solo el reset completo las restaura.
- **Sí:** Nuevo carácter `o` (value 4) para power pellets. Permite distinguir dots normales de power pellets en la lógica del juego.
- **Sí:** Parpadeo de power pellets. Efecto visual que las destaca sin complejidad.
- **Sí:** Barra de timer en el HUD. Información clara del tiempo restante.
- **Sí:** Fantasmas en modo frightened con color azul oscuro y boca invertida. Distinto al normal pero sin sonidos ni animaciones complejas.
- **No:** Escalado de puntos (200, 400, 800, 1600). Va en un spec futuro si se desea.
- **No:** Sonidos. Fuera del alcance.
- **No:** Restauración de power pellets al perder una vida. Se descarta; solo el reset completo las restaura.
- **No:** Dificultad progresiva entre ciclos. Va en un spec futuro si se desea.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Power pellet en esquina no es alcanzable por Pacman | Verificar manualmente que las 4 posiciones son transitables desde el laberinto actual |
| `requeueGhost()` recibe un fantasma que ya está en la pen | Verificar `inPen` antes de llamar a `requeueGhost()` |
| Timer de poder no se resetea correctamente al perder vida | `resetPositions()` pone `powerTimer = 0` y `frightened = false` explícitamente |
| Fantasma en modo frightened queda en bucle entre dos celdas | La dirección se re-evalúa en cada intersección (celda alineada) con las mismas reglas que la IA normal |
| Múltiples fantasmas comidos en el mismo frame causan doble reintegro | Procesar cada colisión individualmente en el bucle de fantasmas |
| `dotsRemaining` se desincroniza tras el reset | Recalcular `dotsRemaining` desde el grid restaurado en lugar de asumir el valor anterior |

## Qué **no** está en este spec

- Escalado de puntos por orden de comida.
- Sonidos o efectos de sonido.
- Restauración de power pellets al perder una vida.
- Dificultad progresiva entre ciclos.
- Condición de victoria (el juego es un bucle infinito de ciclos).
- Modo de juego con menos de 4 fantasmas.

Cada uno de esos, si llega, va en su propio spec.