"use client";

import { ResidualData, SimulationOutput } from "@/types";
import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

interface Props {
  onResidualUpdate: (variable: keyof ResidualData, value: number) => void;
}

export default function SimulationPanel({ onResidualUpdate }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [output, setOutput] = useState<SimulationOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const newSocket = io("http://localhost:4444");

    newSocket.on("connect", () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setSocket(null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSimulationOutput = (message: SimulationOutput) => {
      setOutput((prev) => [...prev, message]);

      if (message.type === "output") {
        const solverMatches = message.data.matchAll(
          /Solving for (\w+).*Final residual = ([\d.eE+-]+)/g
        );

        for (const match of solverMatches) {
          const [_, variable, residual] = match;
          if (["Ux", "Uy", "p", "k", "epsilon"].includes(variable)) {
            onResidualUpdate(
              variable as keyof ResidualData,
              parseFloat(residual)
            );
          }
        }
      }

      if (message.type === "complete") {
        setIsRunning(false);
      }
    };

    socket.on("simulationOutput", handleSimulationOutput);
    return () => {
      socket.off("simulationOutput");
    };
  }, [socket, onResidualUpdate]);

  const startSimulation = () => {
    if (!socket || !isConnected) return;
    setIsRunning(true);
    setOutput([]);
    socket.emit("startSimulation");
  };

  const stopSimulation = () => {
    if (!socket || !isRunning) return;
    socket.emit("stopSimulation");
    setIsRunning(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={startSimulation}
          disabled={!isConnected || isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isRunning ? "Simulation Running..." : "Start Simulation"}
        </button>
        <button
          onClick={stopSimulation}
          disabled={!isRunning}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
        >
          Stop Simulation
        </button>
        <div
          className={`h-3 w-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm text-gray-600">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div
        className="border rounded p-4 bg-black text-white font-mono h-96 overflow-y-auto"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {output.map((msg, index) => (
          <div
            key={index}
            className={`mb-1 ${
              msg.type === "error"
                ? "text-red-500"
                : msg.type === "complete"
                ? "text-green-500"
                : "text-white"
            }`}
          >
            {msg.data}
          </div>
        ))}
      </div>
    </div>
  );
}
