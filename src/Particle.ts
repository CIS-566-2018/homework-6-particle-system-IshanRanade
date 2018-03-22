import {vec3,vec4} from 'gl-matrix';

var seedrandom = require('seedrandom');

class Particle {

  color: vec4;
  position: vec3;
  velocity: vec3;
  acceleration: vec3;

  constructor(position: vec3, color: vec4) {
    this.color = color;
    this.position = position;
    this.velocity = vec3.fromValues(0,0,0);
    this.acceleration = vec3.fromValues(0,0,0);
  }
};

abstract class Exertor {

  position: vec3;

  abstract getForce(particle: Particle): vec3;

  constructor(position: vec3) {
    this.position = position;
  }
};

class NoneExertor extends Exertor {

  constructor() {
    super(vec3.fromValues(0,0,0));
  }

  getForce(particle: Particle) {
    return vec3.fromValues(0,0,0);
  }
};

class Attractor extends Exertor {
  
  power: number;
  radius: number;

  constructor(position: vec3, power: number, radius: number) {
    super(position);

    this.power = power;
    this.radius = radius;
  }

  getForce(particle: Particle) {
    let distance: number = vec3.distance(this.position, particle.position);

    if(distance > this.radius) {
      return vec3.fromValues(0,0,0);
    }

    let currForce = vec3.create();
    vec3.subtract(currForce, this.position, particle.position);
    vec3.scale(currForce, currForce, this.power);

    if(distance > 2.0) {
      vec3.scale(currForce, currForce, 0.0001 * distance * distance);

      if(distance < 6.0) {
        vec3.scale(particle.velocity, particle.velocity, 0.8);
      }
    } else {
      particle.velocity = vec3.fromValues(0,0,0);
    }

    return currForce;
  }
};

class MeshAttractor extends Exertor {
  
  power: number;
  radius: number;

  constructor(position: vec3, power: number, radius: number) {
    super(position);

    this.power = power;
    this.radius = radius;
  }

  getForce(particle: Particle) {
    let distance: number = vec3.distance(this.position, particle.position);

    if(distance > this.radius) {
      return vec3.fromValues(0,0,0);
    }

    let currForce = vec3.create();
    vec3.subtract(currForce, this.position, particle.position);
    vec3.scale(currForce, currForce, this.power);

    if(distance > 2.0) {
      vec3.scale(currForce, currForce, 0.0001 * distance * distance);

      if(distance < 6.0) {
        vec3.scale(particle.velocity, particle.velocity, 0.8);
      }
    } else {
      particle.velocity = vec3.fromValues(0,0,0);
    }

    return currForce;
  }
};

class Oscillator extends Exertor {

  power: number;
  radius: number;

  constructor(position: vec3, power: number, radius: number) {
    super(position);

    this.power = power;
    this.radius = radius;
  }

  getForce(particle: Particle) {
    let distance: number = vec3.distance(this.position, particle.position);

    if(distance > this.radius) {
      return vec3.fromValues(0,0,0);
    }

    let currForce = vec3.create();
    vec3.subtract(currForce, this.position, particle.position);
    vec3.scale(currForce, currForce, this.power);

    vec3.scale(currForce, currForce, 0.001 * Math.pow(distance, 2.0));

    return currForce;
  }
};

class Repeller extends Exertor {

  power: number;
  radius: number;

  constructor(position: vec3, power: number, radius: number) {
    super(position);

    this.power = power;
    this.radius = radius;
  }

  getForce(particle: Particle) {
    let distance: number = vec3.distance(this.position, particle.position);

    if(distance > this.radius) {
      return vec3.fromValues(0,0,0);
    }

    let currForce = vec3.create();
    vec3.subtract(currForce, this.position, particle.position);
    vec3.scale(currForce, currForce, -1);
    vec3.scale(currForce, currForce, this.power);

    vec3.scale(currForce, currForce, 1.0 / Math.pow(distance, 2.0));

    return currForce;
  }
};

class ParticleSystem {

  particles: Array<Particle>;
  particleCount: number;

  offsetsArray: Float32Array;
  colorsArray: Float32Array;

  exertors: Array<Exertor>;

  rng = seedrandom(0);

  meshes: any;
  meshesActivated: boolean;
  currentMesh: string;

  mouseExertorType: string;

  particleIndexToVertex: { [key:number]:Exertor; };

  constructor(meshes: any, currentMesh: string, mouseExertorType: string) {
    this.particles = new Array<Particle>();
    this.exertors = new Array<Exertor>();

    this.meshes = meshes;
    this.meshesActivated = false;
    this.currentMesh = currentMesh;

    this.particleIndexToVertex = {};

    this.exertors.push(new NoneExertor());

    this.particleCount = 0.0;

    this.mouseExertorType = mouseExertorType;

    let n: number = 200.0;

    let maxX = 100;
    let minX = -100;
    let maxY = 100;
    let minY = -100;
    let maxZ = 100;
    let minZ = -100;
    for(let i = 0; i < n; i++) {
      for(let j = 0; j < n; j++) {
        let rngX: number = this.rng();
        let rngY: number = this.rng();
        let rngZ: number = this.rng();

        this.particles.push(new Particle(
          vec3.fromValues((maxX - minX) * rngX + minX, (maxY - minY) * rngY + minY, (maxZ - minZ) * rngZ + minZ), 
            vec4.fromValues(i / n, j / n, 1.0, 1.0)));
        this.particleCount++;
      }
    }

    this.offsetsArray = new Float32Array(this.particleCount * 3);
    this.colorsArray = new Float32Array(this.particleCount * 4);
  }

  update() {
    let deltaT = 1.0/20.0;
    
    for(let i = 0; i < this.particles.length; ++i) {
      let particle = this.particles[i];
  
      let force = vec3.fromValues(0,0,0);

      if(this.meshesActivated) {
        if(this.particleIndexToVertex[i] != undefined) {
          vec3.add(force, force, this.particleIndexToVertex[i].getForce(particle));
        }
      } else {
        this.exertors.forEach(exertor => {
          vec3.add(force, force, exertor.getForce(particle));
        });
      }

      let maxValue = 10.0;
      if(vec3.length(force) > maxValue) {
        vec3.scale(force, force, maxValue / vec3.length(force));
      }

      vec3.copy(particle.acceleration, force);

      let velocityChange = vec3.create();
      vec3.copy(velocityChange, particle.acceleration);
      vec3.scale(velocityChange, velocityChange, deltaT);
      vec3.add(particle.velocity, particle.velocity, velocityChange);

      let positionChange = vec3.create();
      vec3.copy(positionChange, particle.velocity);
      vec3.scale(positionChange, positionChange, deltaT);
      vec3.add(particle.position, particle.position, positionChange);

      this.offsetsArray[i*3]   = particle.position[0];
      this.offsetsArray[i*3+1] = particle.position[1];
      this.offsetsArray[i*3+2] = particle.position[2];

      let maxVelocity: number = 30.0;
      let currVelocity: number = Math.min(maxVelocity, vec3.length(particle.velocity));
      let u: number = currVelocity / maxVelocity;

      let baseColor: vec3 = vec3.fromValues(particle.color[0], particle.color[1], particle.color[2]);
      let speedColor: vec3 = vec3.fromValues(1,0,0);

      let finalColor: vec3 = vec3.add(vec3.create(), vec3.scale(vec3.create(), baseColor, 1-u), vec3.scale(vec3.create(), speedColor, u));

      this.colorsArray[i*4] = finalColor[0];
      this.colorsArray[i*4+1] = finalColor[1];
      this.colorsArray[i*4+2] = finalColor[2];
      this.colorsArray[i*4+3] = particle.color[3];
    }
  }

  getOffsetsArray() {
    return this.offsetsArray;
  }

  getColorsArray() {
    return this.colorsArray;
  }

  getInstanceCount() {
    return this.particleCount;
  }

  updateUserForce(position: vec3) {
    if(this.mouseExertorType == "Attractor") {
      this.exertors[0] = new Attractor(position, 30, 100);
    } else if(this.mouseExertorType == "Repeller") {
      this.exertors[0] = new Repeller(position, 30, 100);
    } else if(this.mouseExertorType == "Oscillator") {
      this.exertors[0] = new Oscillator(position, 30, 100);
    }
  }

  cancelUserForce() {
    this.exertors[0] = new NoneExertor();
  }

  addNewForce(position: vec3, type: string) {
    if(type == "Oscillator") {
      this.exertors.push(new Oscillator(position, 30, 100));
    } else if(type == "Attractor") {
      this.exertors.push(new Attractor(position, 30, 100));
    } else if(type == "Repeller") {
      this.exertors.push(new Repeller(position, 30, 100));
    }
  }

  activateMesh() {
    this.meshesActivated = true;

    for(let i: number = 0; i < this.meshes[this.currentMesh].vertices.length; i += 3) {
      let randomIndex: number = Math.floor(this.rng() * this.particleCount);

      let vertexPosition: vec3 = vec3.fromValues(this.meshes[this.currentMesh].vertices[i], this.meshes[this.currentMesh].vertices[i+1], this.meshes[this.currentMesh].vertices[i+2]);
      
      if(this.currentMesh == "Knuckles") {
        vec3.scale(vertexPosition, vertexPosition, 0.4);
      } else if(this.currentMesh == "Spaceship") {
        vec3.scale(vertexPosition, vertexPosition, 50.0);
      }

      this.particleIndexToVertex[randomIndex] = new Attractor(vertexPosition, 30, Number.MAX_VALUE);
    }
  }

  deactivateMesh() {
    this.meshesActivated = false;
  }

  changeMouseExertorType(value:string) {
    this.mouseExertorType = value;
  }

};

export default ParticleSystem;