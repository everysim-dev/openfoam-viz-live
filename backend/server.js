const express = require("express");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const server = require("http").createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = 4444;
const OPENFOAM_DIR = "/Users/sark/OpenFOAM/sark-11";
const BASE_FOLDER = "cavity"; // 기본 폴더 이름

// 서버 시작 전에 작업 디렉토리 존재 여부 확인
if (!fs.existsSync(OPENFOAM_DIR)) {
  console.error(`Error: Directory ${OPENFOAM_DIR} does not exist`);
  process.exit(1);
}

let currentProcess = null; // 현재 실행 중인 프로세스를 추적

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("startSimulation", () => {
    console.log("Simulation started");

    // Docker 내에서 명령어 실행
    const newFolder = createAndCopyCavityFolder();
    if (!newFolder) {
      socket.emit("simulationOutput", {
        type: "error",
        data: "Failed to create and copy cavity folder.",
      });
      return;
    }

    const commands = [
      `cd \\$FOAM_RUN/${path.basename(newFolder)}`, // 컨테이너 내부의 경로 사용
      "blockMesh", // blockMesh 실행
      "foamRun", // foamRun 실행
    ];

    const fullCommand = commands.join(" && ");
    runDockerCommand(fullCommand, socket);
  });

  socket.on("stopSimulation", () => {
    if (currentProcess) {
      console.log("Stopping current simulation...");
      currentProcess.kill(); // 실행 중인 프로세스 종료
      currentProcess = null;
      socket.emit("simulationOutput", {
        type: "complete",
        data: "Simulation stopped by user.",
      });
    } else {
      console.log("No simulation is running to stop.");
      socket.emit("simulationOutput", {
        type: "error",
        data: "No simulation is currently running.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

function createAndCopyCavityFolder() {
  try {
    const cavityPath = path.join(OPENFOAM_DIR, "run", BASE_FOLDER); // $FOAM_RUN/cavity

    // 기본 폴더가 존재하는지 확인
    if (!fs.existsSync(cavityPath)) {
      console.error(`Error: Base folder ${cavityPath} does not exist.`);
      return null;
    }

    // 중복 확인 및 새로운 폴더 이름 생성
    let folderIndex = 1;
    let newFolderPath;

    do {
      newFolderPath = path.join(
        OPENFOAM_DIR,
        "run",
        `${BASE_FOLDER}_${folderIndex.toString().padStart(2, "0")}`
      );
      folderIndex++;
    } while (fs.existsSync(newFolderPath));

    // 폴더 복사
    fs.cpSync(cavityPath, newFolderPath, { recursive: true });
    console.log(`Created and copied folder: ${newFolderPath}`);
    return newFolderPath;
  } catch (error) {
    console.error(`Error creating and copying folder: ${error.message}`);
    return null;
  }
}

function runDockerCommand(command, socket) {
  console.log(`Executing in Docker: ${command}`);

  const dockerCommand = `
  docker run --rm --platform linux/amd64 \
  --entrypoint /bin/bash \
  -v ${OPENFOAM_DIR}:/home/openfoam \
  -e DISPLAY=:0 \
  openfoam/openfoam11-graphical-apps \
  -c ". /opt/openfoam11/etc/bashrc && ${command}"
`;

  console.log("Docker command:", dockerCommand);

  currentProcess = exec(dockerCommand, { shell: true }); // 프로세스를 저장

  currentProcess.stdout?.on("data", (data) => {
    console.log(`STDOUT: ${data}`);
    socket.emit("simulationOutput", { type: "output", data: data.toString() });
  });

  currentProcess.stderr?.on("data", (data) => {
    console.error(`STDERR: ${data}`);
    socket.emit("simulationOutput", { type: "error", data: data.toString() });
  });

  currentProcess.on("close", (code) => {
    console.log(`Docker command completed with code ${code}`);
    socket.emit("simulationOutput", {
      type: "complete",
      data: `Command completed with code ${code}`,
    });
    currentProcess = null; // 프로세스 종료 상태 업데이트
  });

  currentProcess.on("error", (err) => {
    console.error(`Failed to start Docker process: ${err.message}`);
    socket.emit("simulationOutput", {
      type: "error",
      data: `Failed to start Docker process: ${err.message}`,
    });
    currentProcess = null;
  });
}

// 서버 시작
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using OpenFOAM directory: ${OPENFOAM_DIR}`);
});
