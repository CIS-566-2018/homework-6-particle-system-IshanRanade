import {vec3,vec4} from 'gl-matrix';

class Particle {
  position: vec3;
  color: vec4;

  constructor(position: vec3, color: vec4) {
    this.position = position;
    this.color = color;
  }
};

class ParticleHolder {
  particles: Array<Particle>;
  particleCount: number;

  offsetsArray: Float32Array;
  colorsArray: Float32Array;

  constructor() {
    this.particles = new Array<Particle>();

    this.particleCount = 0.0;

    let n: number = 100.0;

    for(let i = 0; i < n; i++) {
      for(let j = 0; j < n; j++) {
        this.particles.push(new Particle(
          vec3.fromValues(i, j, 0), vec4.fromValues(i / n, j / n, 1.0, 1.0)));
        this.particleCount++;
      }
    }
  }

  processBuffers() {
    this.offsetsArray = new Float32Array(this.particleCount * 3);
    this.colorsArray = new Float32Array(this.particleCount * 4);

    for(let i: number = 0; i < this.particleCount; ++i) {
      let particle = this.particles[i];

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

export default ParticleHolder;