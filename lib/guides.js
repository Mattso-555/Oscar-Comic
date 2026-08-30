// Beginner scaffolding: faint construction guides ("bones", never art) and
// step-coach scripts. Guides render on a separate layer and are never exported.

export const COACH = {
  person: ['Start with a big circle for the head.', 'Add two dots for eyes and a smile.', 'Draw a body under the head — any shape!', 'Add arms, legs, and something special: a cape? a hat?', 'Colour it in! This is YOUR character.'],
  animal: ['Draw a big body — an egg shape works great.', 'Add a head at one end.', 'Give it legs, a tail, and ears.', 'Add eyes, a nose, and a mouth.', 'Colour its fur, scales, or feathers!'],
  monster: ['Draw a wild, wobbly body — any shape!', 'Add lots of eyes… or just one big one!', 'Give it horns, spikes, or fangs.', 'Add funny arms and legs.', 'Colour it — monsters can be any colour!'],
  robot: ['Start with a box for the body.', 'Add a square or round head on top.', 'Draw arms and legs from rectangles.', 'Add buttons, dials, and an antenna.', 'Colour it shiny — grey, blue, or metal!'],
  magical: ["Draw your magical being's body.", 'Add wings, a wand, or a sparkly crown.', 'Give it a face full of wonder.', 'Add stars and sparkles around it.', 'Colour it with bright, glowy colours!'],
  outdoors: ['Draw the ground with one long line.', 'Add big things far away: hills, trees.', 'Pop a sun or clouds in the sky.', 'Fill the sky with colour.', 'Add tiny details — flowers, birds!'],
  indoors: ['Draw the floor line and walls.', 'Add a window or a door.', 'Put in some furniture.', 'Add little details — a rug, a lamp.', 'Colour it warm and cosy!'],
  city: ['Draw the road along the bottom.', 'Add tall buildings — boxes work!', 'Give them lots of windows.', 'Add signs, cars, or a bus.', 'Colour it bright and busy!'],
  space: ['Fill the whole page dark for space.', 'Add lots of tiny star dots.', 'Draw planets — circles with rings.', 'Add a moon or a zooming comet.', 'Make it glow with bright colours!'],
  underwater: ['Colour the whole page blue for water.', 'Add wavy lines for the current.', 'Draw seaweed and rocks at the bottom.', 'Add bubbles floating up.', 'Pop in some fish and treasure!'],
  fantasy: ['Draw the ground and a far-off castle.', 'Add mountains or a magic forest.', 'Put a path leading somewhere secret.', 'Add stars, moons, or floating rocks!', 'Colour it magical!'],
  vehicle: ['Draw a big box or oval for the body.', 'Add wheels — or wings, or rockets!', 'Draw windows and a door.', 'Add headlights and details.', 'Colour it and add go-fast stripes!'],
  tool: ['Draw the long part first.', 'Add the handle or grip.', 'Give it something special — glow? spikes?', 'Go over your lines to make them bold.', 'Colour it so it pops!'],
  food: ['Draw the main shape — round? long?', 'Add the yummy details.', 'Give it a face if you like!', 'Make the lines bold.', 'Colour it delicious!'],
  treasure: ['Draw the chest or the gem shape.', 'Add sparkles and shine lines.', 'Put gold coins or jewels around it.', 'Make it look precious!', 'Colour it glittering!'],
  furniture: ['Draw the main shape — a box or seat.', 'Add legs or a base.', 'Give it a fun twist — a throne? bunk bed?', 'Add cushions or patterns.', 'Colour it comfy!'],
  nature: ['Draw the stem or trunk first.', 'Add the top — petals, leaves, branches.', 'Put details in — veins, spots, bugs!', 'Make the lines bold.', 'Colour it alive!'],
  word: ['Pick an action word: POW! SPLASH! ZOOM!', 'Write the letters BIG and chunky.', 'Add spiky or bubbly edges around it.', 'Give it bright colours.', 'Add little lines so it looks LOUD!'],
  weather: ['Pick your weather: rain? sun? storm?', 'Draw the big shape — a cloud or a sun.', 'Add rain lines, snowflakes, or rays.', 'Make it big and bold.', 'Colour it — dark storm or bright sun!'],
  magic: ['Draw a big star or swirl.', 'Add little sparkles around it.', 'Put glow lines coming out.', 'Make it dance across the page!', 'Colour it dazzling!'],
  emotion: ['Pick a feeling: love? grumpy? excited?', 'Draw its shape — heart, cloud, burst!', 'Make it BIG.', 'Add motion lines around it.', 'Colour it with feeling!'],
};

/** Draw a faint construction guide for the sub-type on a guide-layer context. */
export function drawGuide(gctx, W, H, subType) {
  gctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  gctx.save();
  gctx.strokeStyle = 'rgba(124, 92, 217, 0.4)';
  gctx.fillStyle = 'rgba(124, 92, 217, 0.55)';
  gctx.lineWidth = 3;
  gctx.setLineDash([9, 8]);
  const solid = () => gctx.setLineDash([]);
  const dash = () => gctx.setLineDash([9, 8]);
  const dot = (x, y, r) => { solid(); gctx.beginPath(); gctx.arc(x, y, r, 0, 7); gctx.stroke(); dash(); };
  const line = (x1, y1, x2, y2) => { gctx.beginPath(); gctx.moveTo(x1, y1); gctx.lineTo(x2, y2); gctx.stroke(); };
  const circle = (x, y, r) => { gctx.beginPath(); gctx.arc(x, y, r, 0, 7); gctx.stroke(); };
  const oval = (x, y, rx, ry) => { gctx.beginPath(); gctx.ellipse(x, y, rx, ry, 0, 0, 7); gctx.stroke(); };
  const box = (x, y, w, h) => { gctx.beginPath(); gctx.rect(x, y, w, h); gctx.stroke(); };
  const label = (t, x, y) => { gctx.save(); solid(); gctx.font = "700 14px 'Baloo 2', sans-serif"; gctx.fillText(t, x, y); gctx.restore(); };

  const frames = {
    person() {
      const hy = H * 0.2, limb = H * 0.15;
      dot(cx, hy, H * 0.09); line(cx, hy + H * 0.09, cx, cy + H * 0.12);
      line(cx, H * 0.35, cx - limb, H * 0.28); line(cx, H * 0.35, cx + limb, H * 0.28);
      line(cx, cy + H * 0.12, cx - limb, H * 0.84); line(cx, cy + H * 0.12, cx + limb, H * 0.84);
      label('a person', W * 0.06, H * 0.1);
    },
    animal() {
      oval(cx + W * 0.05, cy + H * 0.02, W * 0.24, H * 0.15);
      circle(cx - W * 0.24, cy - H * 0.06, H * 0.11);
      [ -0.15, -0.02, 0.16, 0.26 ].forEach((o, i) =>
        line(cx + W * o, cy + H * (0.13 + (i % 2) * 0.02), cx + W * o, H * 0.84));
      line(cx + W * 0.28, cy - H * 0.02, cx + W * 0.4, cy - H * 0.1);
      label('an animal', W * 0.06, H * 0.1);
    },
    monster() {
      gctx.beginPath();
      const pts = 12, base = W * 0.28;
      for (let i = 0; i <= pts; i++) {
        const a = (Math.PI * 2 * i) / pts;
        const wob = base * (0.8 + 0.25 * Math.sin(i * 1.7));
        const x = cx + Math.cos(a) * wob, y = cy + H * 0.05 + Math.sin(a) * wob * 0.9;
        i ? gctx.lineTo(x, y) : gctx.moveTo(x, y);
      }
      gctx.closePath(); gctx.stroke();
      dot(cx - W * 0.09, cy - H * 0.02, H * 0.03); dot(cx + W * 0.09, cy - H * 0.02, H * 0.03);
      line(cx - W * 0.12, cy - H * 0.22, cx - W * 0.18, cy - H * 0.34);
      line(cx + W * 0.12, cy - H * 0.22, cx + W * 0.18, cy - H * 0.34);
      label('a monster — add more eyes!', W * 0.04, H * 0.1);
    },
    robot() {
      box(cx - W * 0.2, cy - H * 0.02, W * 0.4, H * 0.3);
      box(cx - W * 0.13, cy - H * 0.3, W * 0.26, H * 0.24);
      line(cx, cy - H * 0.3, cx, cy - H * 0.4); dot(cx, cy - H * 0.42, H * 0.02);
      box(cx - W * 0.3, cy, W * 0.1, H * 0.22); box(cx + W * 0.2, cy, W * 0.1, H * 0.22);
      box(cx - W * 0.15, cy + H * 0.28, W * 0.12, H * 0.18); box(cx + W * 0.03, cy + H * 0.28, W * 0.12, H * 0.18);
      label('a robot', W * 0.06, H * 0.1);
    },
    magical() {
      dot(cx, H * 0.24, H * 0.08); line(cx, H * 0.32, cx, cy + H * 0.14);
      line(cx, H * 0.4, cx - W * 0.12, H * 0.34); line(cx, H * 0.4, cx + W * 0.12, H * 0.34);
      line(cx, cy + H * 0.14, cx - W * 0.1, H * 0.82); line(cx, cy + H * 0.14, cx + W * 0.1, H * 0.82);
      gctx.beginPath(); gctx.arc(cx - W * 0.18, H * 0.42, W * 0.14, -0.6, 1.6); gctx.stroke();
      gctx.beginPath(); gctx.arc(cx + W * 0.18, H * 0.42, W * 0.14, 1.5, 3.7); gctx.stroke();
      label('a magical being', W * 0.05, H * 0.1);
    },
    outdoors() {
      line(0, H * 0.66, W, H * 0.66); dot(W * 0.8, H * 0.2, H * 0.08);
      line(W * 0.2, H * 0.66, W * 0.2, H * 0.4); circle(W * 0.2, H * 0.34, H * 0.1);
      label('sky', W * 0.05, H * 0.14); label('ground', W * 0.05, H * 0.76);
    },
    indoors() {
      box(W * 0.1, H * 0.14, W * 0.8, H * 0.72); line(W * 0.1, H * 0.66, W * 0.9, H * 0.66);
      box(W * 0.58, H * 0.24, W * 0.24, H * 0.2);
      label('wall', W * 0.13, H * 0.22); label('floor', W * 0.13, H * 0.76);
    },
    city() {
      line(0, H * 0.8, W, H * 0.8);
      box(W * 0.12, H * 0.4, W * 0.16, H * 0.4); box(W * 0.34, H * 0.28, W * 0.16, H * 0.52);
      box(W * 0.56, H * 0.46, W * 0.16, H * 0.34); box(W * 0.76, H * 0.34, W * 0.14, H * 0.46);
      label('tall buildings', W * 0.05, H * 0.12);
    },
    space() {
      circle(W * 0.28, H * 0.34, H * 0.12);
      gctx.beginPath(); gctx.ellipse(W * 0.28, H * 0.34, H * 0.2, H * 0.06, -0.4, 0, 7); gctx.stroke();
      circle(W * 0.72, H * 0.62, H * 0.07);
      [[0.6, 0.2], [0.8, 0.3], [0.5, 0.5], [0.9, 0.55], [0.15, 0.7], [0.4, 0.8]].forEach(([x, y]) => dot(W * x, H * y, H * 0.008));
      label('space — add stars!', W * 0.05, H * 0.12);
    },
    underwater() {
      for (let i = 0; i < 3; i++) {
        gctx.beginPath();
        gctx.moveTo(0, H * (0.2 + i * 0.1));
        gctx.bezierCurveTo(W * 0.3, H * (0.15 + i * 0.1), W * 0.7, H * (0.25 + i * 0.1), W, H * (0.2 + i * 0.1));
        gctx.stroke();
      }
      oval(cx, cy + H * 0.05, W * 0.14, H * 0.08);
      line(cx + W * 0.14, cy + H * 0.05, cx + W * 0.22, cy - H * 0.02);
      line(cx + W * 0.14, cy + H * 0.05, cx + W * 0.22, cy + H * 0.12);
      [[0.2, 0.85], [0.8, 0.82]].forEach(([x, y]) => line(W * x, H * y, W * x, H * (y - 0.15)));
      label('underwater', W * 0.05, H * 0.12);
    },
    fantasy() {
      line(0, H * 0.78, W, H * 0.78);
      box(W * 0.4, H * 0.44, W * 0.2, H * 0.34);
      box(W * 0.32, H * 0.52, W * 0.1, H * 0.26); box(W * 0.58, H * 0.52, W * 0.1, H * 0.26);
      line(W * 0.1, H * 0.78, W * 0.24, H * 0.5); line(W * 0.24, H * 0.5, W * 0.38, H * 0.78);
      label('a fantasy castle', W * 0.05, H * 0.12);
    },
    vehicle() {
      box(W * 0.18, cy - H * 0.02, W * 0.64, H * 0.2);
      dot(W * 0.34, cy + H * 0.22, H * 0.08); dot(W * 0.66, cy + H * 0.22, H * 0.08);
      box(W * 0.3, cy - H * 0.14, W * 0.3, H * 0.12);
      label('a vehicle', W * 0.06, H * 0.12);
    },
    tool() {
      line(cx, H * 0.2, cx, H * 0.7); box(cx - W * 0.1, H * 0.68, W * 0.2, H * 0.06);
      label('a tool', W * 0.06, H * 0.12);
    },
    food() {
      circle(cx, cy + H * 0.04, W * 0.22); line(cx, cy - H * 0.18, cx + W * 0.04, cy - H * 0.28);
      label('food', W * 0.06, H * 0.12);
    },
    treasure() {
      box(W * 0.24, cy, W * 0.52, H * 0.26);
      gctx.beginPath(); gctx.moveTo(W * 0.24, cy); gctx.quadraticCurveTo(cx, cy - H * 0.18, W * 0.76, cy); gctx.stroke();
      dot(cx, cy + H * 0.1, H * 0.03);
      label('treasure', W * 0.06, H * 0.12);
    },
    furniture() {
      box(W * 0.28, cy - H * 0.02, W * 0.44, H * 0.3); box(W * 0.28, H * 0.2, W * 0.44, H * 0.24);
      label('furniture', W * 0.06, H * 0.12);
    },
    nature() {
      line(cx, H * 0.86, cx, cy);
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        oval(cx + Math.cos(a) * W * 0.12, cy + Math.sin(a) * W * 0.12, W * 0.07, H * 0.05);
      }
      circle(cx, cy, H * 0.05);
      label('a flower', W * 0.06, H * 0.12);
    },
    word() {
      line(W * 0.08, cy + H * 0.14, W * 0.92, cy + H * 0.14);
      line(W * 0.08, cy - H * 0.14, W * 0.92, cy - H * 0.14);
      label('BIG letters here', W * 0.1, cy - H * 0.18);
    },
    weather() {
      gctx.beginPath(); gctx.arc(cx - W * 0.06, H * 0.34, H * 0.12, 0.4, Math.PI * 1.6); gctx.stroke();
      circle(cx + W * 0.1, H * 0.3, H * 0.09);
      for (let i = 0; i < 4; i++) line(W * (0.3 + i * 0.14), H * 0.52, W * (0.28 + i * 0.14), H * 0.7);
      label('weather', W * 0.06, H * 0.12);
    },
    magic() {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        dot(cx + Math.cos(a) * W * 0.24, cy + Math.sin(a) * W * 0.24, H * 0.02);
      }
      gctx.beginPath();
      const sp = 5, ro = W * 0.14, ri = W * 0.06;
      for (let i = 0; i < sp * 2; i++) {
        const a = (Math.PI / sp) * i - Math.PI / 2;
        const r = i % 2 ? ri : ro;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i ? gctx.lineTo(x, y) : gctx.moveTo(x, y);
      }
      gctx.closePath(); gctx.stroke();
      label('magic sparkles', W * 0.05, H * 0.12);
    },
    emotion() {
      gctx.beginPath();
      const s = W * 0.22;
      gctx.moveTo(cx, cy + s * 0.8);
      gctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.4, cx - s * 0.4, cy - s * 1.1, cx, cy - s * 0.3);
      gctx.bezierCurveTo(cx + s * 0.4, cy - s * 1.1, cx + s * 1.4, cy - s * 0.4, cx, cy + s * 0.8);
      gctx.stroke();
      label('an emotion', W * 0.06, H * 0.12);
    },
  };

  (frames[subType] || frames.person)();
  gctx.restore();
}
