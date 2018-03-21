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
      vec3.scale(currForce, currForce, 0.0001 * Math.pow(distance, 2.0));
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

  constructor() {
    this.particles = new Array<Particle>();
    this.exertors = new Array<Exertor>();

    this.exertors.push(new Attractor(vec3.fromValues(10,10,10), 30.0, 100.0));
    this.exertors.push(new Attractor(vec3.fromValues(-10,-10,-10), 30.0, 100.0));
    this.exertors.push()

    this.particleCount = 0.0;

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
    let deltaT = 1.0/60.0;
    for(let i = 0; i < this.particles.length; ++i) {
      let particle = this.particles[i];
  
      let force = vec3.fromValues(0,0,0);

      this.exertors.forEach(exertor => {
        vec3.add(force, force, exertor.getForce(particle));
      });

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

      this.colorsArray[i*4] = particle.color[0];
      this.colorsArray[i*4+1] = particle.color[1];
      this.colorsArray[i*4+2] = particle.color[2];
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

};

export default ParticleSystem;