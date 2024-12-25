// src/components/SimulationPanel.tsx
"use client";

import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

type OutputType = "output" | "error" | "complete";

interface SimulationOutput {
  type: OutputType;
  data: string;
}

export default function SimulationPanel() {
  const [mounted, setMounted] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [output, setOutput] = useState<SimulationOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const newSocket = io("http://localhost:4444");

    newSocket.on("connect", () => {
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("simulationOutput", (message: SimulationOutput) => {
      setOutput((prev) => [...prev, message]);
      if (message.type === "complete") {
        setIsRunning(false);
      }
    });

    return () => {
      socket.off("simulationOutput");
    };
  }, [socket]);

  if (!mounted) return null;

  const startSimulation = () => {
    if (!socket || !isConnected) return;

    setIsRunning(true);
    setOutput([]);
    socket.emit("startSimulation");
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
        style={{ whiteSpace: "pre-wrap" }} // 줄바꿈과 공백 유지
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
