import {vec2,vec3,vec4,mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import ParticleSystem from './Particle';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
};

let square: Square;
let time: number = 0.0;

let camera: Camera;

let particleSystem: ParticleSystem;

let mousePosition: vec2 = null;

function loadScene() {
  square = new Square();
  square.create();

  particleSystem = new ParticleSystem();
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

function keyPressed(e: Event) {
  if(this.mousePosition != null) {
    var mouseX = this.mousePosition[0];
    var mouseY = this.mousePosition[1];

    //console.log(mouseX + " " + mouseY);

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
    let p0: vec3 = vec3.create();
    vec3.copy(p0, camera.up);

    let denom: number = vec3.dot(n, l);
    let p010: vec3 = vec3.create();
    vec3.subtract(p010, p0, l0);
    
    let t: number = vec3.dot(p010, n) / denom;

    let worldPoint: vec3 = vec3.create();
    vec3.scale(worldPoint, l, t);
    vec3.add(worldPoint, worldPoint, l0);

    console.log(worldPoint[0] + ", " + worldPoint[1] + ", " + worldPoint[2]);

    particleSystem.updateUserForce(worldPoint);
    //return vec3.dot(p010, n) / denom;
  }
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
  document.addEventListener('mousemove', mouseMove, false);

  // Add controls to the gui
  const gui = new DAT.GUI();

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
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
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

main();
