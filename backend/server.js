const express = require("express");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
const server = require("http").createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = 4444;
// 현재는 작업 디렉토리가 하드코딩 되어 있어서 본인에 맞게 수정 필요
const OPENFOAM_DIR = "/Users/sark/OpenFOAM/sark-11"; // OpenFOAM 작업 디렉토리

// 서버 시작 전에 작업 디렉토리 존재 여부 확인
if (!fs.existsSync(OPENFOAM_DIR)) {
  console.error(`Error: Directory ${OPENFOAM_DIR} does not exist`);
  process.exit(1);
}

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("startSimulation", () => {
    console.log("Simulation started");
    // 단계별 명령어 실행
    // 해당 명령어는 미리 세팅을 해둔 상황이 가정되어 있음
    const commands = [
      "cd \\$FOAM_RUN", // $FOAM_RUN으로 이동
      "cd pitzDaily", // pitzDaily로 이동
      "./Allrun", // Allrun 스크립트 실행
    ];

    // 명령어를 조합
    const fullCommand = commands.join(" && ");

    // Docker 명령 실행
    runDockerCommand(fullCommand, socket);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

function runDockerCommand(command, socket) {
  console.log(`Executing in Docker: ${command}`);

  // Docker 명령어 생성
  const dockerCommand = `
  docker run --rm --platform linux/amd64 \
  --entrypoint /bin/bash \
  -v ${OPENFOAM_DIR}:/home/openfoam \
  -e DISPLAY=:0 \
  openfoam/openfoam11-graphical-apps \
  -c ". /opt/openfoam11/etc/bashrc && ${command}"
`;

  console.log("Docker command:", dockerCommand); // 명령어 디버깅

  // Docker 명령 실행
  const childProcess = exec(dockerCommand, { shell: true });

  let output = "";

  childProcess.stdout?.on("data", (data) => {
    output += data.toString();
    console.log(`STDOUT: ${data}`);
    socket.emit("simulationOutput", { type: "output", data: data.toString() });
  });

  childProcess.stderr?.on("data", (data) => {
    output += data.toString();
    console.error(`STDERR: ${data}`);
    socket.emit("simulationOutput", { type: "error", data: data.toString() });
  });

  childProcess.on("close", (code) => {
    console.log(`Docker command completed with code ${code}`);
    socket.emit("simulationOutput", {
      type: "complete",
      data: `Command completed with code ${code}`,
      //   data: `Command completed with code ${code}\nOutput:\n${output}`,
    });
  });

  childProcess.on("error", (err) => {
    console.error(`Failed to start Docker process: ${err.message}`);
    socket.emit("simulationOutput", {
      type: "error",
      data: `Failed to start Docker process: ${err.message}`,
    });
  });
}

// 서버 시작
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using OpenFOAM directory: ${OPENFOAM_DIR}`);
});
