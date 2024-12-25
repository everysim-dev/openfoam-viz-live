"use client";
import ResidualChart from "@/components/ResidualChart";
import SimulationPanel from "@/components/SimulationPanel";
import { ResidualData } from "@/types";
import { useState } from "react";

export default function ClientLayout() {
  const [residualData, setResidualData] = useState<ResidualData>({
    Ux: [],
    Uy: [],
    p: [],
    k: [],
    epsilon: [],
  });
  const [labels, setLabels] = useState<number[]>([]);

  const addResidual = (variable: keyof ResidualData, value: number) => {
    setResidualData((prev) => ({
      ...prev,
      [variable]: [...prev[variable], value].slice(-50),
    }));

    setLabels((prev) => {
      const nextNum = prev.length > 0 ? prev[prev.length - 1] + 1 : 1;
      return [...prev, nextNum].slice(-50);
    });
  };

  return (
    <div>
      <div className="mb-4">
        <SimulationPanel onResidualUpdate={addResidual} />
      </div>
      <ResidualChart residualData={residualData} labels={labels} />
    </div>
  );
}
