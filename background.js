(() => {
  const canvas = document.querySelector('.ambient-cubes');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const vertices = [
    [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
    [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]
  ];
  const faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  let width = 0, height = 0, dpr = 1, cubes = [], frame = 0, lastTime = 0;

  const randomCube = (index, count) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return {
      x: ((column + .42 + Math.random() * .18) / 4) * width,
      y: ((row + .25 + Math.random() * .5) / Math.ceil(count / 4)) * height,
      size: 14 + Math.random() * 22,
      ax: Math.random() * Math.PI,
      ay: Math.random() * Math.PI,
      az: Math.random() * Math.PI,
      speed: (.00008 + Math.random() * .00012) * (Math.random() < .5 ? -1 : 1),
      vx: (.012 + Math.random() * .022) * (Math.random() < .5 ? -1 : 1),
      vy: (.009 + Math.random() * .018) * (Math.random() < .5 ? -1 : 1),
      drift: 3 + Math.random() * 7,
      phase: Math.random() * Math.PI * 2,
      alpha: .022 + Math.random() * .026
    };
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 640 ? 20 : width < 1000 ? 32 : 44;
    cubes = Array.from({ length: count }, (_, i) => randomCube(i, count));
  };

  const rotate = ([x,y,z], ax, ay, az) => {
    let c = Math.cos(ax), s = Math.sin(ax);
    [y,z] = [y*c-z*s, y*s+z*c];
    c = Math.cos(ay); s = Math.sin(ay);
    [x,z] = [x*c+z*s, -x*s+z*c];
    c = Math.cos(az); s = Math.sin(az);
    return [x*c-y*s, x*s+y*c, z];
  };

  const drawCube = (cube, time, delta) => {
    const motion = reduceMotion.matches ? 0 : time;
    const angle = motion * cube.speed;
    if (!reduceMotion.matches) {
      cube.x += cube.vx * delta;
      cube.y += cube.vy * delta;
      const margin = cube.size * 1.8;
      const minX = margin;
      const maxX = Math.max(margin, width - margin);
      const minY = margin;
      const maxY = Math.max(margin, height - margin);
      if (cube.x <= minX) {
        cube.x = minX;
        cube.vx = Math.abs(cube.vx);
      } else if (cube.x >= maxX) {
        cube.x = maxX;
        cube.vx = -Math.abs(cube.vx);
      }
      if (cube.y <= minY) {
        cube.y = minY;
        cube.vy = Math.abs(cube.vy);
      } else if (cube.y >= maxY) {
        cube.y = maxY;
        cube.vy = -Math.abs(cube.vy);
      }
    }
    const cx = cube.x + Math.cos(motion * .00021 + cube.phase) * cube.drift;
    const cy = cube.y + Math.sin(motion * .00017 + cube.phase) * cube.drift;
    const projected = vertices.map(v => {
      const [x,y,z] = rotate(v, cube.ax + angle*.7, cube.ay + angle, cube.az + angle*.35);
      const scale = cube.size * (1 + z * .055);
      return [cx + x * scale, cy + y * scale, z];
    });

    faces
      .map(face => ({ face, depth: face.reduce((sum, i) => sum + projected[i][2], 0) }))
      .sort((a,b) => a.depth - b.depth)
      .forEach(({ face }, faceIndex) => {
        ctx.beginPath();
        face.forEach((i, n) => n ? ctx.lineTo(projected[i][0], projected[i][1]) : ctx.moveTo(projected[i][0], projected[i][1]));
        ctx.closePath();
        const gradient = ctx.createLinearGradient(cx-cube.size, cy-cube.size, cx+cube.size, cy+cube.size);
        gradient.addColorStop(0, `rgba(255,255,255,${cube.alpha * 1.9})`);
        gradient.addColorStop(.48, `rgba(168,220,247,${cube.alpha})`);
        gradient.addColorStop(1, `rgba(89,174,222,${cube.alpha * .7})`);
        ctx.fillStyle = gradient;
        ctx.fill();
        if (faceIndex > 3) {
          ctx.strokeStyle = `rgba(255,255,255,${cube.alpha * 2.2})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      });

    ctx.strokeStyle = `rgba(80,161,205,${cube.alpha * 2.1})`;
    ctx.lineWidth = .65;
    edges.forEach(([a,b]) => {
      ctx.beginPath();
      ctx.moveTo(projected[a][0], projected[a][1]);
      ctx.lineTo(projected[b][0], projected[b][1]);
      ctx.stroke();
    });
  };

  const render = time => {
    ctx.clearRect(0, 0, width, height);
    const delta = lastTime ? Math.min(time - lastTime, 40) : 0;
    lastTime = time;
    cubes.forEach(cube => drawCube(cube, time, delta));
    if (!reduceMotion.matches) frame = requestAnimationFrame(render);
  };

  const restart = () => {
    cancelAnimationFrame(frame);
    lastTime = 0;
    render(0);
    if (!reduceMotion.matches) frame = requestAnimationFrame(render);
  };

  resize();
  restart();
  window.addEventListener('resize', () => { resize(); restart(); }, { passive: true });
  reduceMotion.addEventListener?.('change', restart);
})();
