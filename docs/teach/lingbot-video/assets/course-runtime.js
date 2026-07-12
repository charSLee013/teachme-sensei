import { pageConfigs } from "./page-configs.js";

document.documentElement.classList.add("runtime-upgraded");

const OGL_PAGES = new Set([
  "course-map",
  "01-system-map",
  "06-ti2v-conditioning",
  "07-transformer-single-stream",
  "08-sparse-moe",
  "10-serving-fsdp-sglang",
]);

const HERO_VERTEX = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HERO_FRAGMENT = `
precision highp float;
uniform vec3 uTint;
uniform float uGlow;
varying vec3 vNormal;
void main() {
  vec3 lightDir = normalize(vec3(-0.4, 0.8, 0.55));
  float light = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;
  vec3 base = uTint * (0.52 + 0.48 * light) + vec3(0.05, 0.08, 0.14) * uGlow;
  gl_FragColor = vec4(base, 1.0);
}
`;

document.addEventListener("DOMContentLoaded", async () => {
  const pageId = document.body.dataset.coursePage;
  const config = pageConfigs[pageId];
  if (!config) return;

  const article = document.querySelector(".page");
  if (!article) return;

  await mountHero(article, config.hero, pageId);
  mountConfiguredDiagrams(article, config.diagrams || []);
});

function mountConfiguredDiagrams(article, diagrams) {
  const slots = Array.from(article.querySelectorAll("[data-course-diagram]"));
  if (slots.length !== diagrams.length) {
    throw new Error(`Expected ${diagrams.length} diagram slots, found ${slots.length}`);
  }

  slots.forEach((slot, index) => {
    const spec = diagrams[index];
    const wrapper = document.createElement("section");
    wrapper.className = "story-diagram";
    mountDiagramFigure(wrapper, spec, false, undefined, undefined, spec.steps);
    slot.replaceWith(wrapper);
  });
}

async function mountHero(article, heroConfig, pageId) {
  const anchor = article.querySelector(".meta");
  if (!anchor) return;

  const hero = document.createElement("section");
  hero.className = "hero-stage";
  hero.innerHTML = `
    <div class="hero-copy">
      <p class="hero-kicker">${heroConfig.kicker}</p>
      <h2 class="hero-title">${heroConfig.title}</h2>
      <p class="hero-lead">${heroConfig.lead}</p>
      <div class="scene-note">
        <h3>正在建立的心智</h3>
        <p></p>
      </div>
      <div class="camera-pill">镜头: <span>准备中</span></div>
      <ol class="scene-steps"></ol>
      <div class="control-bar">
        <button data-action="intro">观看引子</button>
        <button data-action="prev">上一步</button>
        <button data-action="next">下一步</button>
        <button data-action="focus">关键视角</button>
        <button data-action="replay">重播</button>
      </div>
    </div>
    <div class="stage-shell">
      <div class="stage-footnote">主线只给读者最好的观看点，而不是把找角度外包给读者。</div>
    </div>
  `;

  const placeholder = article.querySelector(".hero-placeholder");
  if (placeholder) placeholder.replaceWith(hero);
  else anchor.insertAdjacentElement("afterend", hero);

  const noteBody = hero.querySelector(".scene-note p");
  const cameraLabel = hero.querySelector(".camera-pill span");
  const stepList = hero.querySelector(".scene-steps");
  const buttons = Object.fromEntries(
    Array.from(hero.querySelectorAll("[data-action]")).map((button) => [button.dataset.action, button]),
  );

  heroConfig.steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = "scene-step";
    item.textContent = step.label;
    stepList.appendChild(item);
  });

  let api;
  if (heroConfig.kind === "diagram") {
    const shell = hero.querySelector(".stage-shell");
    shell.innerHTML = "";
    shell.classList.add("diagram-shell");
    api = mountDiagramFigure(shell, heroConfig.diagram, true, heroConfig.intro, heroConfig.focusStep, heroConfig.steps);
  } else if (heroConfig.kind === "ogl") {
    const shell = hero.querySelector(".stage-shell");
    shell.innerHTML = `<canvas class="stage-canvas" aria-label="${pageId} 主场景"></canvas>`;
    const canvas = shell.querySelector("canvas");
    api = await mountOglStage(canvas, heroConfig);
  } else {
    return;
  }

  const setStepUI = (index) => {
    heroConfig.steps.forEach((step, stepIndex) => {
      stepList.children[stepIndex].classList.toggle("is-active", stepIndex === index);
    });
    const step = heroConfig.steps[index];
    noteBody.textContent = step.note;
    if (api.getViewLabel) {
      cameraLabel.textContent = api.getViewLabel(step);
    }
    buttons.prev.disabled = index === 0;
    buttons.next.disabled = index === heroConfig.steps.length - 1;
    const canvas = hero.querySelector("canvas");
    if (canvas) canvas.dataset.stepIndex = String(index);
  };

  api.onStepChange(setStepUI);
  setStepUI(api.currentStep());
  hero.dataset.runtimeReady = "true";
  const canvas = hero.querySelector("canvas");
  if (canvas) canvas.dataset.runtimeReady = "true";

  buttons.intro.addEventListener("click", () => api.playIntro());
  buttons.prev.addEventListener("click", () => api.prev());
  buttons.next.addEventListener("click", () => api.next());
  buttons.focus.addEventListener("click", () => api.focus());
  buttons.replay.addEventListener("click", () => api.replay());
}

function mountDiagramFigure(container, spec, dark, introOrder, focusStep, steps) {
  const lookup = new Map();
  spec.columns.forEach((column) => {
    column.items.forEach((item) => lookup.set(item.id, item.title));
  });

  container.innerHTML = `
    <h3 class="figure-title">${spec.title}</h3>
    <p class="figure-lead">${spec.description}</p>
    <div class="route-strip"></div>
    <div class="flow-columns"></div>
    <div class="figure-controls">
      <button data-action="prev">上一步</button>
      <button data-action="next">下一步</button>
      <button data-action="replay">重播</button>
    </div>
    <div class="figure-status"><strong></strong><span></span></div>
  `;
  if (!dark) container.classList.add("is-light");

  const routeStrip = container.querySelector(".route-strip");
  const columns = container.querySelector(".flow-columns");
  const statusTitle = container.querySelector(".figure-status strong");
  const statusBody = container.querySelector(".figure-status span");
  const prevButton = container.querySelector('[data-action="prev"]');
  const nextButton = container.querySelector('[data-action="next"]');
  const replayButton = container.querySelector('[data-action="replay"]');

  spec.route.forEach((id, index) => {
    const chip = document.createElement("span");
    chip.className = "route-chip";
    chip.dataset.id = id;
    chip.textContent = lookup.get(id) || id;
    routeStrip.appendChild(chip);
    if (index !== spec.route.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "route-arrow";
      arrow.textContent = "->";
      routeStrip.appendChild(arrow);
    }
  });

  spec.columns.forEach((column) => {
    const node = document.createElement("section");
    node.className = "flow-column";
    node.innerHTML = `<h4>${column.title}</h4>`;
    column.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "flow-card";
      card.dataset.id = item.id;
      card.innerHTML = `<h5>${item.title}</h5><p>${item.body}</p>`;
      node.appendChild(card);
    });
    columns.appendChild(node);
  });

  let current = 0;
  const listeners = [];
  const intro = Array.isArray(introOrder) && introOrder.length ? introOrder : steps.map((_, index) => index);

  const apply = () => {
    const step = steps[current];
    const activeSet = new Set(step.active);
    container.querySelectorAll(".flow-card").forEach((card) => {
      const isActive = activeSet.has(card.dataset.id);
      card.classList.toggle("is-active", isActive);
      card.classList.toggle("is-dim", !isActive);
    });
    container.querySelectorAll(".route-chip").forEach((chip) => {
      chip.classList.toggle("is-active", activeSet.has(chip.dataset.id));
    });
    statusTitle.textContent = step.label;
    statusBody.textContent = step.note;
    prevButton.disabled = current === 0;
    nextButton.disabled = current === steps.length - 1;
    listeners.forEach((listener) => listener(current));
  };

  const api = {
    currentStep: () => current,
    onStepChange(listener) { listeners.push(listener); },
    next() { current = Math.min(steps.length - 1, current + 1); apply(); },
    prev() { current = Math.max(0, current - 1); apply(); },
    focus() {
      current = typeof focusStep === "number" ? focusStep : Math.min(1, steps.length - 1);
      apply();
    },
    replay() { current = 0; apply(); },
    playIntro() {
      current = 0;
      apply();
      let cursor = 0;
      const timer = window.setInterval(() => {
        current = intro[cursor];
        apply();
        cursor += 1;
        if (cursor >= intro.length) {
          window.clearInterval(timer);
          current = 0;
          apply();
        }
      }, 720);
    },
    getViewLabel() {
      return dark ? "关键路径" : "";
    },
  };

  prevButton.addEventListener("click", () => api.prev());
  nextButton.addEventListener("click", () => api.next());
  replayButton.addEventListener("click", () => api.replay());

  apply();
  return api;
}

async function mountOglStage(canvas, heroConfig) {
  const ogl = await import("./ogl-bridge.js");
  const { Renderer, Camera, Transform, Program, Mesh, Box, Sphere } = ogl;

  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  const gl = renderer.gl;
  gl.clearColor(0.02, 0.03, 0.06, 1);

  const camera = new Camera(gl, { fov: 38 });
  const scene = new Transform();

  const boxGeometry = new Box(gl);
  const sphereGeometry = new Sphere(gl);
  const root = new Transform();
  root.setParent(scene);

  const nodes = heroConfig.nodes.map((node, index) => {
    const tint = hexToRgb(node.color);
    const program = new Program(gl, {
      vertex: HERO_VERTEX,
      fragment: HERO_FRAGMENT,
      uniforms: {
        uTint: { value: tint },
        uGlow: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, {
      geometry: node.shape === "sphere" ? sphereGeometry : boxGeometry,
      program,
    });
    mesh.position.set(...node.position);
    mesh.scale.set(...node.size);
    mesh.setParent(root);
    return {
      ...node,
      mesh,
      tint,
      basePosition: node.position.slice(),
      baseScale: node.size.slice(),
      phase: index * 0.42,
    };
  });

  const markerProgram = new Program(gl, {
    vertex: HERO_VERTEX,
    fragment: HERO_FRAGMENT,
    uniforms: {
      uTint: { value: hexToRgb("#ffffff") },
      uGlow: { value: 1.2 },
    },
  });
  const marker = new Mesh(gl, { geometry: sphereGeometry, program: markerProgram });
  marker.scale.set(0.22, 0.22, 0.22);
  let markerTarget = (heroConfig.steps[0].marker || [0, 0, 0]).slice();
  marker.position.set(...markerTarget);
  marker.setParent(root);

  let currentStep = 0;
  const listeners = [];
  let introPlay = null;

  const cameraState = {
    position: heroConfig.cameras[heroConfig.steps[0].camera].position.slice(),
    target: heroConfig.cameras[heroConfig.steps[0].camera].target.slice(),
    desiredPosition: heroConfig.cameras[heroConfig.steps[0].camera].position.slice(),
    desiredTarget: heroConfig.cameras[heroConfig.steps[0].camera].target.slice(),
    label: heroConfig.cameras[heroConfig.steps[0].camera].label,
  };

  function resize() {
    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 640;
    const height = window.matchMedia("(max-width: 760px)").matches ? 380 : 500;
    renderer.setSize(width, height);
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;
    camera.perspective({ aspect: width / height });
  }

  function setView(name) {
    const preset = heroConfig.cameras[name];
    if (!preset) return;
    cameraState.desiredPosition = preset.position.slice();
    cameraState.desiredTarget = preset.target.slice();
    cameraState.label = preset.label;
  }

  function applyStep(stepIndex) {
    currentStep = stepIndex;
    const step = heroConfig.steps[currentStep];
    setView(step.camera || heroConfig.focusPreset);
    const activeSet = new Set(step.activeNodes || []);
    markerTarget = (step.marker || [0, 0, 0]).slice();
    nodes.forEach((node) => {
      const active = activeSet.has(node.id);
      const tint = active ? node.tint.map((value) => Math.min(1, value + 0.18)) : node.tint;
      node.mesh.program.uniforms.uTint.value = tint;
      node.mesh.program.uniforms.uGlow.value = active ? 1 : 0.12;
      const scaleBoost = active ? 1.12 : 0.92;
      node.mesh.scale.set(
        node.baseScale[0] * scaleBoost,
        node.baseScale[1] * scaleBoost,
        node.baseScale[2] * scaleBoost,
      );
    });
    listeners.forEach((listener) => listener(currentStep));
  }

  function playIntro() {
    introPlay = {
      start: performance.now(),
      keys: heroConfig.intro || [heroConfig.focusPreset || heroConfig.steps[0].camera],
      duration: 2800,
    };
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (introPlay) {
      const elapsed = now - introPlay.start;
      const segmentLength = introPlay.duration / Math.max(1, introPlay.keys.length);
      const segmentIndex = Math.min(introPlay.keys.length - 1, Math.floor(elapsed / segmentLength));
      setView(introPlay.keys[segmentIndex]);
      if (elapsed >= introPlay.duration) {
        introPlay = null;
        applyStep(currentStep);
      }
    }

    cameraState.position = lerpVec3(cameraState.position, cameraState.desiredPosition, 0.1);
    cameraState.target = lerpVec3(cameraState.target, cameraState.desiredTarget, 0.1);
    camera.position.set(...cameraState.position);
    camera.lookAt(cameraState.target);

    const markerPos = [marker.position.x, marker.position.y, marker.position.z];
    const nextMarker = lerpVec3(markerPos, markerTarget, 0.14);
    marker.position.set(...nextMarker);

    nodes.forEach((node) => {
      const active = heroConfig.steps[currentStep].activeNodes.includes(node.id);
      const hover = active ? 0.12 : 0.05;
      node.mesh.position.y = node.basePosition[1] + Math.sin(now * 0.0012 + node.phase) * hover;
    });

    renderer.render({ scene, camera });
  }

  window.addEventListener("resize", resize);
  resize();
  applyStep(0);
  playIntro();
  requestAnimationFrame(tick);

  return {
    currentStep: () => currentStep,
    onStepChange(listener) { listeners.push(listener); },
    next() { applyStep(Math.min(heroConfig.steps.length - 1, currentStep + 1)); },
    prev() { applyStep(Math.max(0, currentStep - 1)); },
    focus() {
      const step = heroConfig.steps[currentStep];
      setView(step.camera || heroConfig.focusPreset);
    },
    replay() { applyStep(0); },
    playIntro,
    getViewLabel(step) {
      const preset = heroConfig.cameras[step.camera || heroConfig.focusPreset];
      return preset ? preset.label : cameraState.label;
    },
  };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const size = value.length === 3 ? 1 : 2;
  const parts = size === 1
    ? value.split("").map((item) => parseInt(item + item, 16))
    : value.match(/.{2}/g).map((item) => parseInt(item, 16));
  return parts.map((item) => item / 255);
}

function lerpVec3(from, to, alpha) {
  return [
    from[0] + (to[0] - from[0]) * alpha,
    from[1] + (to[1] - from[1]) * alpha,
    from[2] + (to[2] - from[2]) * alpha,
  ];
}
