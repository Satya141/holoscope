import { brain } from './brain';
import { dna } from './dna';
import { earth } from './earth';
import { jetEngine } from './jetEngine';
import { sportsCar } from './sportsCar';
import type { ModelDef } from './types';

export { customModel } from './glb';
export const MODELS: ModelDef[] = [earth, jetEngine, sportsCar, brain, dna];
