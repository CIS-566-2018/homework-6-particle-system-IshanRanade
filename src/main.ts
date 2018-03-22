import {vec2,vec3,vec4,mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import ParticleSystem from './Particle';

var OBJ = require('webgl-obj-loader');
var meshes: any;
window.onload = function() {
  OBJ.downloadMeshes({
    'Spaceship': 'src/objs/walle.obj',
    'Knuckles': 'src/objs/knuckles.obj',
    'Wall-E': 'src/objs/walle.obj'
  }, function(m: any) {
    meshes = m;
    main();
  });
}

let startMesh = 'Knuckles';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  'Mesh': startMesh
};

let square: Square;
let time: number = 0.0;

let camera: Camera;

let particleSystem: ParticleSystem;

let mousePosition: vec2 = null;

function loadScene() {
  square = new Square();
  square.create();

  particleSystem = new ParticleSystem(meshes, startMesh);
}

function update() {
  particleSystem.update();

  square.setInstanceVBOs(particleSystem.getOffsetsArray(), particleSystem.getColorsArray());
  square.setNumInstances(particleSystem.getInstanceCount());
}

function mouseMove(e: MouseEvent) {
  var rect = document.getElementById('canvas').getBoundingClientRect();

  if(this.mousePosition == null) {
    this.mousePosition = vec2.fromValues(0,0);
  }

  this.mousePosition[0] = e.clientX - rect.left;
  this.mousePosition[1] = e.clientY - rect.top;
}

function getWorldPosition(mouseX: number, mouseY: number) {
  let inside: vec4 = vec4.fromValues(mouseX / window.innerWidth * 2 - 1, 1 - mouseY / window.innerHeight * 2, 1, 1);
  vec4.scale(inside, inside, camera.far);
  let tempVec: vec4 = vec4.transformMat4(vec4.create(), inside, camera.projectionMatrix);

  let l0: vec3 = vec3.fromValues(tempVec[0], tempVec[1], tempVec[2]);

  let l: vec3 = vec3.create();
  vec3.subtract(l, l0, camera.position);
  vec3.normalize(l, l);
  let eye = vec3.create();
  vec3.copy(eye, camera.position);

  let n: vec3 = vec3.create();
  vec3.subtract(n, camera.position, camera.target);
  vec3.normalize(n, n);
  let p0: vec3 = vec3.add(vec3.create(), camera.target, camera.up);

  let denom: number = vec3.dot(n, l);
  let p010: vec3 = vec3.subtract(vec3.create(), p0, l0);
  
  let t: number = vec3.dot(p010, n) / denom;

  let worldPoint: vec3 = vec3.create();
  vec3.scale(worldPoint, l, t);
  vec3.add(worldPoint, worldPoint, l0);

  return worldPoint;
}

function keyPressed(e: KeyboardEvent) {
  if(this.mousePosition != null && e.key == "q") {
    particleSystem.updateUserForce(getWorldPosition(this.mousePosition[0], this.mousePosition[1]));
  }
}

function keyUp(e: KeyboardEvent) {
  if(this.mousePosition != null) {
    if(e.key == "q") {
      particleSystem.cancelUserForce();
    } else if(e.key == "w") {
      particleSystem.addNewForce(getWorldPosition(this.mousePosition[0], this.mousePosition[1]), "Attractor");
    } else if(e.key == "e") {
      particleSystem.addNewForce(getWorldPosition(this.mousePosition[0], this.mousePosition[1]), "Repeller");
    } else if(e.key == "r") {
      particleSystem.addNewForce(getWorldPosition(this.mousePosition[0], this.mousePosition[1]), "Oscillator");
    }
  }
}

let meshActivated = false;
function activateMesh() {
  meshActivated = !meshActivated;

  if(meshActivated) {
    particleSystem.activateMesh();
  } else {
    particleSystem.deactivateMesh();
  }
}

function changeMesh() {

}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  //document.addEventListener('keyup', keyPressed, false);
  document.addEventListener('keydown', keyPressed, false);
  document.addEventListener('keyup', keyUp, false);
  document.addEventListener('mousemove', mouseMove, false);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add({ "Activate Mesh": false}, "Activate Mesh").
    listen().
    onFinishChange(activateMesh);
  gui.add(controls, 'Mesh', [ 'Spaceship', 'Knuckles', 'Wall-E' ]).onChange(function(value: string) {
    particleSystem.currentMesh = value;
  });

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  camera = new Camera(vec3.fromValues(50, 50, 10), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.05, 0.05, 0.1, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    update();

    camera.update();
    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}
