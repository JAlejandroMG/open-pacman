// render.js
// Dibujo arcade sobre canvas. Usa game.grid (no MAZE) para reflejar dots comidos.

const TILE = 20;
const WALL_COLOR = '#2121ff';
const DOOR_COLOR = '#ffb8ff';
const DOT_COLOR = '#ffb897';
const FRIGHTENED_COLOR = '#2121de';

function cellCenter( x, y ) {
  return { cx: x * TILE + TILE / 2, cy: y * TILE + TILE / 2 };
}

// Paredes estilo arcade: lineas finas redondeadas que conectan los centros
// de celdas-pared adyacentes. Produce el trazado continuo del original.
function drawWalls( ctx, grid ) {
  const H = grid.length;
  const W = grid[ 0 ].length;
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for ( let y = 0; y < H; y++ ) {
    for ( let x = 0; x < W; x++ ) {
      if ( grid[ y ][ x ] !== 1 ) continue;
      const { cx, cy } = cellCenter( x, y );
      // Conectar solo hacia derecha y abajo evita trazos duplicados.
      if ( x + 1 < W && grid[ y ][ x + 1 ] === 1 ) {
        ctx.moveTo( cx, cy );
        ctx.lineTo( cx + TILE, cy );
      }
      if ( y + 1 < H && grid[ y + 1 ][ x ] === 1 ) {
        ctx.moveTo( cx, cy );
        ctx.lineTo( cx, cy + TILE );
      }
      // Celda-pared aislada (sin vecino): punto corto para que se vea.
      const lone =
        ( x + 1 >= W || grid[ y ][ x + 1 ] !== 1 ) &&
        ( x - 1 < 0 || grid[ y ][ x - 1 ] !== 1 ) &&
        ( y + 1 >= H || grid[ y + 1 ][ x ] !== 1 ) &&
        ( y - 1 < 0 || grid[ y - 1 ][ x ] !== 1 );
      if ( lone ) {
        ctx.moveTo( cx - 3, cy );
        ctx.lineTo( cx + 3, cy );
      }
    }
  }
  ctx.stroke();
}

function drawDoor( ctx, grid ) {
  const H = grid.length;
  const W = grid[ 0 ].length;
  ctx.strokeStyle = DOOR_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for ( let y = 0; y < H; y++ ) {
    for ( let x = 0; x < W; x++ ) {
      if ( grid[ y ][ x ] !== 3 ) continue;
      const px = x * TILE;
      const py = y * TILE + TILE / 2;
      ctx.moveTo( px, py );
      ctx.lineTo( px + TILE, py );
    }
  }
  ctx.stroke();
}

function drawDots( ctx, grid ) {
  ctx.fillStyle = DOT_COLOR;
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ 0 ].length; x++ ) {
      if ( grid[ y ][ x ] !== 2 ) continue;
      const { cx, cy } = cellCenter( x, y );
      ctx.beginPath();
      ctx.arc( cx, cy, 2.5, 0, Math.PI * 2 );
      ctx.fill();
    }
  }
}

// Power pellets: circulo grande blanco con parpadeo (alterna cada 15 frames).
function drawPowerPellets( ctx, grid, frame ) {
  if ( Math.floor( frame / 15 ) % 2 === 1 ) return;
  ctx.fillStyle = '#ffffff';
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ 0 ].length; x++ ) {
      if ( grid[ y ][ x ] !== 4 ) continue;
      const { cx, cy } = cellCenter( x, y );
      ctx.beginPath();
      ctx.arc( cx, cy, 4, 0, Math.PI * 2 );
      ctx.fill();
    }
  }
}

function drawPacman( ctx, p, frame ) {
  const { cx, cy } = cellCenter( p.x, p.y );
  let rot = 0;
  if ( p.dir === 'right' ) rot = 0;
  else if ( p.dir === 'down' ) rot = Math.PI / 2;
  else if ( p.dir === 'left' ) rot = Math.PI;
  else if ( p.dir === 'up' ) rot = -Math.PI / 2;

  // Boca animada: abre/cierra con el frame.
  const open = ( Math.sin( frame * 0.3 ) * 0.5 + 0.5 ) * 0.28 + 0.02;

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.moveTo( cx, cy );
  ctx.arc( cx, cy, TILE / 2 - 1, rot + open * Math.PI, rot - open * Math.PI );
  ctx.closePath();
  ctx.fill();
}

function drawGhost( ctx, g, color, frightened ) {
  const { cx, cy } = cellCenter( g.x, g.y );
  const r = TILE / 2 - 1;
  const top = cy - r;
  const bottom = cy + r;
  const left = cx - r;
  const right = cx + r;

  ctx.fillStyle = color;
  ctx.beginPath();

  if ( frightened ) {
    // Forma invertida: domo abajo y boca apuntando hacia arriba.
    ctx.arc( cx, cy + 1, r, Math.PI, 0, true );
    ctx.lineTo( left, top );
    ctx.lineTo( cx, top - 4 );
    ctx.lineTo( right, top );
    ctx.closePath();
    ctx.fill();
    // Ojos fijos (sin direccion) durante el modo.
    for ( const off of [ -3.5, 3.5 ] ) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc( cx + off, cy + 1, 3, 0, Math.PI * 2 );
      ctx.fill();
      ctx.fillStyle = '#0000bb';
      ctx.beginPath();
      ctx.arc( cx + off, cy + 1, 1.5, 0, Math.PI * 2 );
      ctx.fill();
    }
    return; // sin nombre durante el modo
  }

  ctx.arc( cx, cy - 1, r, Math.PI, 0, false ); // cabeza
  ctx.lineTo( right, bottom );

  // Falda/contorno distinto segun el tipo de comportamiento.
  if ( g.kind === 'hunter' ) {
    // picos clasicos (3)
    ctx.lineTo( right - r * 0.66, bottom - 4 );
    ctx.lineTo( cx, bottom );
    ctx.lineTo( left + r * 0.66, bottom - 4 );
    ctx.lineTo( left, bottom );
  } else if ( g.kind === 'random' ) {
    // curva suave
    ctx.quadraticCurveTo( cx, bottom - r * 0.7, left, bottom );
  } else if ( g.kind === 'patroller' ) {
    // picos grandes
    ctx.lineTo( right - r * 0.5, bottom - 6 );
    ctx.lineTo( cx, bottom );
    ctx.lineTo( left + r * 0.5, bottom - 6 );
    ctx.lineTo( left, bottom );
  } else if ( g.kind === 'ambusher' ) {
    // forma puntiaguda: pico central largo
    ctx.lineTo( right - r * 0.5, bottom - 4 );
    ctx.lineTo( cx, bottom + 3 );
    ctx.lineTo( left + r * 0.5, bottom - 4 );
    ctx.lineTo( left, bottom );
  } else {
    ctx.lineTo( right - r * 0.66, bottom - 4 );
    ctx.lineTo( cx, bottom );
    ctx.lineTo( left + r * 0.66, bottom - 4 );
    ctx.lineTo( left, bottom );
  }
  ctx.closePath();
  ctx.fill();

  // ojos mirando segun direccion
  const dir = DIRS[ g.dir ] || { x: 0, y: 0 };
  const ex = dir.x * 1.6;
  const ey = dir.y * 1.6;
  for ( const off of [ -3.5, 3.5 ] ) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc( cx + off, cy - 1, 3, 0, Math.PI * 2 );
    ctx.fill();
    ctx.fillStyle = '#0000bb';
    ctx.beginPath();
    ctx.arc( cx + off + ex, cy - 1 + ey, 1.5, 0, Math.PI * 2 );
    ctx.fill();
  }

  // Nombre del fantasma sobre el cuerpo.
  const info = GHOST_TYPE_INFO[ g.kind ];
  ctx.fillStyle = color;
  ctx.font = '8px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText( info.name, cx, top - 2 );
}

function drawHUD( ctx, game, W ) {
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText( 'SCORE ' + game.score, 8, 4 );
  ctx.textAlign = 'right';
  ctx.fillText( 'VIDAS ' + game.lives, W * TILE - 8, 4 );
}

function draw( ctx, game, frame ) {
  const grid = game.grid;

  const W = grid[ 0 ].length;
  const H = grid.length;

  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, W * TILE, H * TILE );

  drawWalls( ctx, grid );
  drawDoor( ctx, grid );
  drawDots( ctx, grid );
  drawPowerPellets( ctx, grid, frame );
  drawPacman( ctx, game.pacman, frame );
  game.ghosts.forEach( ( g ) => {
    // En cola de salida (inPen, sin animar): no se dibuja.
    if ( g.inPen && !g.exitingPen ) return;
    const info = GHOST_TYPE_INFO[ g.kind ];
    const frightened = game.powerTimer > 0;
    drawGhost( ctx, g, frightened ? FRIGHTENED_COLOR : info.color, frightened );
  } );
  drawHUD( ctx, game, W );
}

window.draw = draw;
