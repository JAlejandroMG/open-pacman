# AGENTS.md

## Project

Pac-Man clone — vanilla JS, HTML, Canvas. No bundler, no package.json, no build step.
Open `src/index.html` in a browser to run.

## Spec-driven development

Features are designed as specs before code. Two skills drive this:

- `/spec` — create a new spec in `specs/NN-slug.md` (draft → approved)
- `/spec-impl` — implement an approved spec on a dedicated git branch (`spec-NN-slug`)

Specs live in `specs/`. They must be in `Approved` state before `/spec-impl` will run.
Skill definitions are in `.agents/skills/`.

## Architecture

Four JS files loaded via `<script>` tags in `src/index.html`. **Order matters** — each file exports globals consumed by the next:

1. `maze.js` → `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
2. `game.js` → `createGame()`, `update()`, `DIRS` (depends on maze globals)
3. `render.js` → `draw()` (depends on `DIRS` from game.js)
4. `main.js` → entry point, game loop, keyboard input (depends on all above)

Adding a new JS file? Add the `<script>` tag in the correct position in `index.html`.

## Maze encoding

The maze is a 28×31 grid. `maze.js` defines it as readable strings (`MAZE_STR`) then parses to numbers:

| Char | Value | Meaning |
|------|-------|---------|
| `#`  | 1     | Wall (blocks pacman and ghosts) |
| `.`  | 2     | Dot (10 points, win when all eaten) |
| ` `  | 0     | Empty walkable cell |
| `-`  | 3     | Ghost pen door (blocks pacman only) |

`MAZE` is the pristine copy. Each game copies it to `game.grid` — never mutate `MAZE` directly.

## Key constants

- Tile size: `TILE = 20` px (`render.js`)
- Canvas: 560×620 (28×20, 31×20 + HUD)
- `TUNNEL_ROW = 14` — row where actors wrap around screen edges
- `PACMAN_SPEED = 0.125` (1/8 cell/frame, aligns every 8 frames)
- `GHOST_SPEED = 0.1` (1/10 cell/frame)
- Two ghost types: `hunter` (chases Pacman via Manhattan distance) and `random` (picks random valid direction)

## Game states

`game.state` flows: `start` → `playing` → `won` | `lost`

## Conventions

- Comments and UI text are in **Spanish**
- No linting or formatting config — follow existing code style (spaces inside parens, `const` preferred)
- Walls are rendered as connected blue lines (not filled rectangles), so maze edits must maintain adjacency for correct visual rendering