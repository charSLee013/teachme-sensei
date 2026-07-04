const paperCourseRoot = document.currentScript?.dataset.root || ".";

function mountPaperChrome(active) {
  const root = paperCourseRoot;
  const nav = [
    ["index.html", "课程主线"],
    ["01-model-card.html", "模型与运行时"],
    ["02-cli-api-contract.html", "CLI 契约"],
    ["03-token-packing.html", "Token Packing"],
    ["04-sampling-cfg.html", "采样 / CFG"],
    ["05-transformer-architecture.html", "Transformer"],
    ["06-json-caption-protocol.html", "JSON Caption"],
    ["07-training-public-record.html", "公开训练信息"],
    ["appendix/module-index.html", "模块索引"],
    ["appendix/evidence.html", "依据说明"]
  ];
  const links = nav.map(([href, label]) => {
    const current = label === active ? ' aria-current="page"' : "";
    return `<a${current} href="${root}/${href}">${label}</a>`;
  }).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="layout">
      <aside class="sidebar">
        <a class="course-mark" href="${root}/index.html">Ideogram 4</a>
        <div class="kicker">Ideogram 4 推理系统课程</div>
        <nav class="nav">${links}</nav>
      </aside>
      <main id="paper-main"></main>
    </div>
  `);
  const original = document.querySelector("main[data-paper]");
  const target = document.getElementById("paper-main");
  if (original && target) target.replaceWith(original);
}

function drawTokenPacking(canvas, opts) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900;
  const height = 380;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const text = opts.textTokens;
  const grid = opts.grid;
  const image = grid * grid;
  const total = text + image;
  const pad = 20;
  const laneH = 42;
  const tokenW = Math.max(4, (width - pad * 2) / total);
  const lanes = [
    ["sequence", "#8f3328"],
    ["position_ids", "#274c6f"],
    ["segment_ids", "#255246"],
    ["indicator", "#514b71"]
  ];
  ctx.font = "12px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#161616";
  ctx.fillText(`text tokens=${text}, image tokens=${image} (${grid}x${grid}), total sequence=${total}`, pad, 24);
  lanes.forEach((lane, li) => {
    const y = 54 + li * laneH;
    ctx.fillStyle = "#66615a";
    ctx.fillText(lane[0], pad, y - 8);
    for (let i = 0; i < total; i++) {
      const x = pad + i * tokenW;
      const isText = i < text;
      ctx.fillStyle = isText ? lane[1] : "#d8a640";
      if (lane[0] === "indicator") ctx.fillStyle = isText ? "#514b71" : "#255246";
      if (lane[0] === "segment_ids") ctx.fillStyle = "#255246";
      if (lane[0] === "position_ids") ctx.fillStyle = isText ? "#274c6f" : "#8f3328";
      ctx.globalAlpha = isText ? .85 : .72;
      ctx.fillRect(x, y, Math.max(1, tokenW - 1), 22);
    }
    ctx.globalAlpha = 1;
  });
  const gridTop = 242;
  const cell = Math.min(22, (width - pad * 2) / grid);
  ctx.fillStyle = "#161616";
  ctx.fillText("image token grid: position_id = [0, h, w] + 65536", pad, gridTop - 14);
  for (let h = 0; h < grid; h++) {
    for (let w = 0; w < grid; w++) {
      ctx.fillStyle = `rgba(143,51,40,${0.35 + 0.45 * ((h + w) / (2 * Math.max(1, grid - 1)))})`;
      ctx.fillRect(pad + w * cell, gridTop + h * cell, cell - 2, cell - 2);
    }
  }
  ctx.fillStyle = "#66615a";
  ctx.fillText("Text slots carry Qwen hidden features; image slots carry noisy latent tokens. Parallel lanes keep role, segment, and position metadata visible.", pad, height - 26);
}

function drawTokenLattice3D(canvas, opts) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900;
  const height = 420;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const grid = opts.grid;
  const text = opts.textTokens;
  const angle = opts.angle * Math.PI / 180;
  const cx = width * 0.54;
  const cy = height * 0.56;
  const scale = Math.min(24, (width * 0.48) / Math.max(8, grid));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  function project(x, y, z) {
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    return {
      x: cx + rx * scale + y * scale * 0.48,
      y: cy + rz * scale * 0.34 - y * scale * 0.78
    };
  }
  ctx.font = "12px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#161616";
  ctx.fillText(`3D schematic: ${text} text rail tokens + ${grid * grid} image grid tokens, angle=${opts.angle}deg`, 24, 26);
  ctx.strokeStyle = "#d7d0c5";
  ctx.lineWidth = 1;
  for (let i = 0; i < grid; i++) {
    const a = project(i - grid/2, 0, -grid/2);
    const b = project(i - grid/2, 0, grid/2 - 1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const c = project(-grid/2, 0, i - grid/2);
    const d = project(grid/2 - 1, 0, i - grid/2);
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  }
  for (let h = 0; h < grid; h++) {
    for (let w = 0; w < grid; w++) {
      const p = project(w - grid/2, 0, h - grid/2);
      ctx.fillStyle = `rgba(143,51,40,${0.42 + 0.45 * ((h + w) / (2 * Math.max(1, grid - 1)))})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const railY = 2.4;
  for (let i = 0; i < text; i++) {
    const x = (i / Math.max(1, text - 1)) * (grid - 1) - grid/2;
    const p = project(x, railY, -grid/2 - 2);
    ctx.fillStyle = "#274c6f";
    ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
  }
  const p0 = project(-grid/2, railY, -grid/2 - 2);
  const p1 = project(grid/2, railY, -grid/2 - 2);
  ctx.strokeStyle = "#274c6f"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  ctx.fillStyle = "#66615a";
  ctx.fillText("blue rail = text token positions with Qwen features", 24, height - 48);
  ctx.fillText("red plane = image latent grid tokens with [0,h,w]+65536 positions", 24, height - 28);
}

function drawSampler(canvas, guidance) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 900;
  const height = 360;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const origin = { x: 90, y: 260 };
  const neg = { x: 145, y: -26 };
  const cond = { x: 62, y: -70 };
  const guided = { x: neg.x + guidance * cond.x, y: neg.y + guidance * cond.y };
  ctx.font = "13px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "#161616";
  ctx.fillText(`v_guided = v_neg + ${guidance.toFixed(1)} * (v_pos - v_neg)`, 26, 28);
  function arrow(vec, color, label, off) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(origin.x + vec.x, origin.y + vec.y); ctx.stroke();
    const ex = origin.x + vec.x, ey = origin.y + vec.y;
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(label, ex + 8, ey + off);
  }
  ctx.fillStyle = "#66615a";
  ctx.fillText("current latent z_i", origin.x - 42, origin.y + 24);
  ctx.fillStyle = "#161616"; ctx.beginPath(); ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2); ctx.fill();
  arrow(neg, "#274c6f", "v_neg: image-only baseline", 0);
  arrow({ x: neg.x + cond.x, y: neg.y + cond.y }, "#255246", "v_pos: text-conditioned", -8);
  arrow(guided, "#8f3328", "guided update direction", 14);
  ctx.strokeStyle = "#d7d0c5"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const x = 360 + i * 42;
    const y = 280 - Math.log1p(i * guidance) * 34;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    ctx.fillStyle = "#8f3328"; ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  ctx.stroke();
  ctx.fillStyle = "#66615a";
  ctx.fillText("schematic latent trajectory across Euler steps", 360, 326);
}
