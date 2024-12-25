// types.ts
export interface ResidualData {
  Ux: number[];
  Uy: number[];
  p: number[];
  k: number[];
  epsilon: number[];
}

export interface SimulationOutput {
  type: OutputType;
  data: string;
}

export type OutputType = "output" | "error" | "complete";
