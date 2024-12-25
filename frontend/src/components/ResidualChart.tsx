"use client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LogarithmicScale,
  Legend,
} from "chart.js";
import { ResidualData } from "@/types";
import { useEffect } from "react";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LogarithmicScale,
  Legend
);

const COLORS = {
  Ux: "rgba(75,192,192,1)",
  Uy: "rgba(192,75,75,1)",
  p: "rgba(75,75,192,1)",
  k: "rgba(192,192,75,1)",
  epsilon: "rgba(192,75,192,1)",
};

export default function ResidualChart({
  residualData,
  labels,
}: {
  residualData: ResidualData;
  labels: number[];
}) {
  const data = {
    labels,
    datasets: Object.entries(residualData).map(([key, values]) => ({
      label: key,
      data: values,
      borderColor: COLORS[key as keyof ResidualData],
      backgroundColor: "transparent",
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        type: "logarithmic" as const,
        min: 1e-6,
        max: 1,
      },
      x: {
        ticks: { maxTicksLimit: 10 },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4">Residuals</h2>
      <Line data={data} options={options} />
    </div>
  );
}
