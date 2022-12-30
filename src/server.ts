import { appendFile, readFile } from "fs";
import { ChildProcess, exec, spawn } from "child_process";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import * as path from "path";

const wssPort = 8080;
const wss = new WebSocketServer({ port: wssPort });
const port = 80;
const app = express();

interface IMPVStreamInfo {
  status: "idle" | "searching" | "playing" | "buffering" | "paused";
  metadata?: string;
  videoUrl?: string;
  searchQuery?: string;
  queue?: string[];
}

let mpv_process: ChildProcess;
let mpv_info: IMPVStreamInfo = {
  status: "idle",
  queue: [],
};
const connectionList: WebSocket[] = [];
const history: string[] = [];

readFile("dist/history", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  history.push(...data.split("\n"));
});

const startMPVStream = (searchquery: string) => {
  killMPVStream();

  MPVStatus({
    status: "searching",
    searchQuery: searchquery,
    videoUrl: " ",
  });
  addQueryToHistory(searchquery);

  let formattedQuery = searchquery.replace(/[^\w\s]/gi, "");
  mpv_process = spawn(
    `yt-dlp -f bestaudio ytsearch:'${formattedQuery}' -o - 2>/dev/null | mpv --demuxer-readahead-secs=3 --demuxer-max-bytes=3MiB --demuxer-max-back-bytes=3MiB --force-seekable=yes --cache=no --audio-device=alsa/plughw:CARD=Headphones,DEV=0 --input-ipc-server=~/socket -`,
    { shell: "/bin/bash" }
  );

  mpv_process.stdout?.on("data", (data) => {
    handleStreamOut(data.toString());
  });

  const updateRate = 14;
  let updateFrame = updateRate;
  mpv_process.stderr?.on("data", (data) => {
    const dataString: string = data.toString();
    if (dataString.includes("A:")) {
      if (updateFrame >= updateRate) {
        MPVStatus({
          status: mpv_info.status,
          metadata: dataString,
        });
        updateFrame = 0;
      }
      updateFrame++;
      return;
    }
  });

  mpv_process.on("exit", (code) => {
    if (code == 0) {
      playNextInQueue();
    }
  });
};

const killMPVStream = () => {
  MPVStatus({
    status: "idle",
    searchQuery: undefined,
    videoUrl: undefined,
    metadata: undefined,
  });
  if (!mpv_process) return;
  spawn(`killall mpv`, { shell: "/bin/bash" });
  mpv_process.kill();
};

const handleAddQueryToQueue = (query: string) => {
  const MPVInfo = MPVStatus();
  if (MPVInfo.queue?.length == 0 && MPVInfo.status == "idle") {
    startMPVStream(query);
  } else {
    MPVStatus();
    MPVInfo.queue?.push(query);
  }
};
const clearQueue = () => {
  MPVStatus().queue!.length = 0;
};

const playNextInQueue = () => {
  const MPVInfo = MPVStatus();
  MPVStatus({
    status: "idle",
    searchQuery: undefined,
    videoUrl: undefined,
    metadata: undefined,
  });
  if (MPVInfo.queue?.length == 0) return;
  startMPVStream(MPVInfo.queue![0]);
  MPVInfo.queue?.shift();
};

const handleStreamOut = (data: string) => {
  if (data.includes("Failed")) {
    console.error("Error:", data);
    connectionList.forEach((connection) => connection.send("error"));
    killMPVStream();
    return;
  }
  if (data.includes("https://")) {
    MPVStatus({
      status: "buffering",
      videoUrl: `https${data.split("https")[1].trim()}`,
    });
  }
  if (data.includes("(+)")) {
    MPVStatus({ status: "playing" });
  }
};

const MPVStatus = (setInfo?: IMPVStreamInfo) => {
  if (setInfo) {
    Object.assign(mpv_info, setInfo);
    connectionList.forEach((connection) =>
      connection.send(JSON.stringify(mpv_info))
    );
  }
  return mpv_info;
};

const forceBroadcastMPVStatus = () => {
  connectionList.forEach((connection) =>
    connection.send(JSON.stringify(mpv_info))
  );
};

const handleSetIndex = (index: number) => {
  exec(
    `echo '{ "command": ["set_property", "time-pos", ${index}] }' | socat - ~/socket`,
    {
      shell: "/bin/bash",
    }
  );
};

const handleSetPause = (pause: boolean) => {
  exec(
    `echo '{ "command": ["set_property", "pause", ${pause}] }' | socat - ~/socket`,
    {
      shell: "/bin/bash",
    }
  );
  MPVStatus({ status: pause ? "paused" : "playing" });
};

const handleConnection = (connection: WebSocket) => {
  connectionList.push(connection);
  connection.on("close", (socket: WebSocket) => {
    connectionList.splice(connectionList.indexOf(socket), 1);
  });
  connection.on("message", (data, isBinary) => {
    const message = isBinary ? data : data.toString();
    const isString = message instanceof String || typeof message === "string";
    const split = isString ? message.split(":") : null;
    if (!split) return;

    const msgType = split[0];
    const msgContent = split.length > 2 ? split[1] + split[2] : split[1];

    switch (msgType) {
      case "play":
        if (msgContent && msgContent?.length > 1) startMPVStream(msgContent);
        sendHistoryToSocket(connection);
        clearQueue();
        break;
      case "status":
        connection.send(JSON.stringify(MPVStatus()));
        break;
      case "kill":
        killMPVStream();
        playNextInQueue();
        forceBroadcastMPVStatus();
        break;
      case "history":
        sendHistoryToSocket(connection);
        break;
      case "shutdown":
        exec("shutdown now");
        break;
      case "index":
        handleSetIndex(parseFloat(msgContent));
        break;
      case "pause":
        handleSetPause(msgContent === "true");
        break;
      case "queue":
        if (msgContent && msgContent?.length > 1)
          handleAddQueryToQueue(msgContent);
        forceBroadcastMPVStatus();
        break;
    }
  });
};

const sendHistoryToSocket = (connection: WebSocket) => {
  connection.send(JSON.stringify(history));
};

const addQueryToHistory = (query: string) => {
  appendFile("dist/history", `${query}\n`, () => null);
  history.push(query);
};

wss.on("connection", handleConnection);

app.use(express.static("dist"));
app.all("/", function (request, response) {
  response.sendFile(path.join(__dirname, "index.html"));
});
app.listen(port, () => {
  console.log(`Listening on ${port} 🚀`);
});
