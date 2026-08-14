# SPEC 01 — Cuatro fantasmas con comportamientos únicos

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-12
> **Objective:** Añadir 4 fantasmas al juego, cada uno con nombre, color, forma visual y comportamiento de movimiento diferente, actuando de forma independiente.

## Scope

**In:**

- 4 fantasmas con comportamiento propio: `hunter`, `random`, `patroller`, `ambusher`.
- Nombre y color únicos por fantasma (Blinky, Pinky, Inky, Clyde).
- Forma visual distinta por tipo de comportamiento.
- Asignación aleatoria de posiciones de inicio de los fantasmas.
- Velocidad compartida por todos (`GHOST_SPEED = 0.1`).

**Out (specs futuros):**

- Coordinación entre fantasmas (persecución en equipo).
- Power-ups o habilidades especiales (velocidad temporal, atravesar paredes).
- Niveles de dificultad progresiva relacionados con los fantasmas.

## Data model

```js
// Tipos de fantasma: nombre y color
const GHOST_TYPE_INFO = {
  hunter: { name: 'Blinky', color: '#ff0000' },
  random: { name: 'Clyde', color: '#ffb852' },
  patroller: { name: 'Pinky', color: '#ffb8ff' },
  ambusher: { name: 'Inky', color: '#00ffff' },
};
```

El fantasma `patroller` añade un `patrolIndex` para recorrer un camino fijo en loop:

```js
// Camino de patrulla del patroller, en celdas (x, y) transitables, en loop
const PATROL_PATH = [
  { x: 1, y: 1 }, { x: 6, y: 1 },
  { x: 6, y: 5 }, { x: 1, y: 5 },
];
```

Convenciones:

- Coordenadas: origen arriba-izquierda. Celdas (x, y).
- Velocidad compartida: `GHOST_SPEED = 0.1` (1/10 celda/frame).
- Ningún dato se persiste entre sesiones.

## Implementation plan

1. **Expandir `GHOST_STARTS` en `maze.js`** a 4 posiciones (dos dentro de la pen, dos fuera). Estado tras el paso: 4 fantasmas se crean jugables con los comportamientos ya existentes.
2. **Añadir tipos a `game.js`** — definir `GHOST_TYPE_INFO` y `PATROL_PATH`. Incluir `patrolIndex` en la creación de cada fantasma (`createGame`).
3. **Implementar `patroller` en `decideGhost()`** — desde `g.patrolIndex` mirar el siguiente punto de `PATROL_PATH` elegir la dirección que lo aproxima, avanzar el índice al llegar a cada punto y dar la vuelta al final.
4. **Implementar `ambusher` en `decideGhost()`** — calcular la celda futura de Pacman (su posición actual + hasta 3 celdas hacia delante en `pacman.dir`, sin cruzar paredes) y dirigirse a ella como el `hunter`.
5. **Colorear cada fantasma en `render.js`** — usar `GHOST_TYPE_INFO[g.kind].color` en lugar del array fijo `GHOST_COLORS`.
6. **Dibujar forma distinta por tipo en `render.js`** — variar la falda/contorno del fantasma según `g.kind` (ej: picos para `hunter`, curva suave para `random`, picos grandes para `patroller`, forma puntiaguda para `ambusher`).
7. **Mostrar nombre del fantasma en `render.js`** — pintar `GHOST_TYPE_INFO[g.kind].name` sobre cada fantasma.

Cada paso debe dejar el juego ejecutable abriendo `src/index.html`.

## Acceptance criteria

- [ ] Aparecen exactamente 4 fantasmas al iniciar la partida.
- [ ] Cada fantasma tiene un `kind` de los 4 (`hunter`, `random`, `patroller`, `ambusher`).
- [ ] El `hunter` persigue a Pacman por distancia Manhattan (comportamiento no alterado).
- [ ] El `random` elige direcciones aleatorias válidas (comportamiento no alterado).
- [ ] El `patroller` recorre `PATROL_PATH` en loop sin detenerse ni quedar atrapado.
- [ ] El `ambusher` se dirige a la celda futura de Pacman (predicción hacia delante) en lugar de a su celda actual.
- [ ] Los 4 fantasmas comparten la misma `speed` (`GHOST_SPEED`).
- [ ] Cada fantasma se dibuja con su color según `GHOST_TYPE_INFO`.
- [ ] Cada fantasma se dibuja con una forma distinta según su `kind`.
- [ ] El nombre de cada fantasma se muestra sobre él.
- [ ] Las posiciones de inicio se asignan aleatoriamente entre los fantasmas.
- [ ] Al perder una vida se restablecen las posiciones con la misma aleatoriedad.
- [ ] La consola no muestra errores.

## Decisions

- **Sí:** Reutilizar los tipos existentes `hunter` y `random` sin cambios. Ya cubren dos de los cuatro roles y evitan regresiones.
- **Sí:** Los nuevos tipos son `patroller` (camino fijo en loop) y `ambusher` (predicción de posición futura). Elegidos por ser tácticamente distintos y de implementación acotada.
- **Sí:** Nombres y colores asignados a cada comportamiento (Blinky rojo, Pinky rosa, Inky cian, Clyde naranja). Reutiliza el esquema clásico y el conjunto de colores ya presente en `render.js`.
- **Sí:** Velocidad compartida. Se descarta per-ghost speed para que la diferencia sea de comportamiento y no de atributo.
- **Sí:** Asignación aleatoria de posiciones de inicio. Simple y sin configurar rutas manuales por fantasma.
- **Sí:** Forma/contorno distinto por tipo para distinguir comportamientos visualmente.
- **No:** Coordinación o IA en equipo. El usuario confirmó que actúan independientemente; va a un spec futuro si cambia.
- **No:** Power-ups o habilidades especiales. Fuera del alcance pactado.
- **No:** velocidades distintas por fantasma. Añade superficie sin aportar agresividad de persecución, cosa que ya aporta `ambusher`.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `patroller` se atasca si `PATROL_PATH` incluye una celda muro | `PATROL_PATH` se define solo con celdas transitables del laberinto; verificación manual en el paso 3. |
| `ambusher` predice atravesando paredes | La predicción avanza celda a celda comprobando `canMove`; se detiene antes del primer muro. |
| Cambio en `render.js` rompe formas en posiciones no alineadas | Mantener el trazado basado en `cellCenter` y limites del tile, como el `drawGhost` actual. |
| Asignación aleatoria coloca dos fantasmas en la misma celda al inicio | `GHOST_STARTS` define 4 posiciones válidas; el barajado solo reordena sin duplicar. |

## Qué **no** está en este spec

- Persecución coordinada o formación entre fantasmas.
- Power-ups, habilidades especiales o velocidades distintas.
- Niveles de dificultad progresiva por comportamiento de fantasma.
- Persistencia de ningún dato entre partidas.

Cada uno de esos, si llega, va en su propio spec.