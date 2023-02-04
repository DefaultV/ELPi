import { appendFile, readFile } from "fs";
import { ChildProcess, exec, spawn } from "child_process";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import * as path from "path";
import { writeFile } from "fs";

const wssPort = 8080;
const wss = new WebSocketServer({ port: wssPort });
const port = 3001;
const app = express();

interface IMPVStreamInfo {
  status?: "idle" | "searching" | "playing" | "buffering" | "paused";
  metadata?: string;
  videoUrl?: string;
  searchQuery?: string;
  queue?: string[];
}

interface IELPiSongInfo {
  searchTitle: string;
  videoId: string;
}

interface IELPiConfig {
  searchWithToken: boolean;
  highQualityAudio: boolean;
  experimentalLoader: boolean;
}

let mpv_process: ChildProcess;
let mpv_info: IMPVStreamInfo = {
  status: "idle",
  queue: [],
};

const eLPiConfig: IELPiConfig = {
  searchWithToken: false,
  highQualityAudio: false,
  experimentalLoader: false,
};

const connectionList: WebSocket[] = [];
const history: IELPiSongInfo[] = [];

readFile("dist/config", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  if (data) {
    Object.assign(eLPiConfig, JSON.parse(data));
  }
});

readFile("dist/history", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  if (data) {
    Object.assign(history, JSON.parse(data));
  }
});

const startMPVStream = async (searchquery: string) => {
  await killMPVStream();

  MPVStatus({
    status: "searching",
    searchQuery: searchquery,
    videoUrl: undefined,
  });

  let formattedQuery = searchquery.replace(/[^\w\s]/gi, "");
  const audioQuality = eLPiConfig.highQualityAudio ? "bestaudio" : "worstaudio";
  mpv_process = spawn(
    eLPiConfig.experimentalLoader
      ? `yt-dlp -f ${audioQuality} ytsearch:'${formattedQuery}' -o - | mpv --demuxer-readahead-secs=3 --demuxer-max-bytes=3MiB --demuxer-max-back-bytes=3MiB --force-seekable=yes --cache=yes --audio-device=alsa/plughw:CARD=Headphones,DEV=0 --input-ipc-server=~/socket -`
      : `mpv --ytdl-format=${audioQuality} ytdl://ytsearch:"${formattedQuery}" --demuxer-readahead-secs=3 --demuxer-max-bytes=3MiB --demuxer-max-back-bytes=3MiB --force-seekable=yes --cache=yes --audio-device=alsa/plughw:CARD=Headphones,DEV=0 --input-ipc-server=~/socket`,
    { shell: "/bin/bash" }
  );

  if (eLPiConfig.experimentalLoader) {
    mpv_process.stderr.addListener("data", (data) =>
      handleStreamOut(data.toString())
    );
  } else {
    mpv_process.stdout.addListener("data", (data) =>
      handleStreamOut(data.toString())
    );
    mpv_process.stderr.addListener("data", (data) =>
      handleStreamOut(data.toString())
    );
  }

  mpv_process.on("exit", (code) => {
    if (code == 0) {
      playNextInQueue();
    }
  });
};

const killMPVStream = () => {
  return new Promise((resolve) => {
    MPVStatus({
      status: "idle",
      searchQuery: undefined,
      videoUrl: undefined,
      metadata: undefined,
    });

    const pKill = spawn(`killall mpv yt-dlp`, { shell: "/bin/bash" });
    mpv_process?.kill();

    pKill.addListener("exit", () => {
      resolve(null);
    });
  });
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
  if (data.includes("ERROR") || data.includes("Failed")) {
    connectionList.forEach((connection) => connection.send("error"));
    killMPVStream();
    return;
  }

  if (data.includes("Terminated")) {
    startMPVStream(MPVStatus().searchQuery);
  }

  if (data.includes("A:") && connectionList.length > 0) {
    MPVStatus({
      metadata: data,
    });
  }

  if (data.includes("[info]") || data.includes("Playing:")) {
    const videoId = eLPiConfig.experimentalLoader
      ? data.split("[info] ")[1].split(":")[0].trim()
      : data.split("=")[1].trim();
    MPVStatus({
      status: "playing",
      videoUrl: videoId,
    });

    addQueryToHistory(MPVStatus().searchQuery, videoId);
    connectionList.forEach((connection) => sendHistoryToSocket(connection));
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
        if (msgContent && msgContent?.length > 1) {
          startMPVStream(msgContent);
        }
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
      case "config":
        if (msgContent && msgContent?.length > 1) {
          if (msgContent == "all") {
            sendConfigToSocket(connection);
          } else {
            const configSplit = msgContent.split(" ");
            if (configSplit?.length > 1) {
              eLPiConfig[configSplit[0]] = configSplit[1] == "true";
              saveConfig(eLPiConfig);
              sendConfigToSocket(connection);
            }
          }
        }
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

const sendConfigToSocket = (connection: WebSocket) => {
  connection.send(JSON.stringify(eLPiConfig));
};

const arrayContainsObject = <T extends Record<string, unknown>>(
  array: T[],
  object: T
) => {
  return array.some((item) =>
    Object.keys(item).every((key) => item[key] === object[key])
  );
};

const addQueryToHistory = (query: string, videoId: string) => {
  if (query?.length <= 0 || videoId?.length <= 0) {
    return;
  }
  const newHistoryItem = { searchTitle: query, videoId: videoId };
  if (!arrayContainsObject(history, newHistoryItem)) {
    history.push({ searchTitle: query, videoId: videoId });
    writeFile("dist/history", JSON.stringify(history), (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
};

const saveConfig = (newConfig: IELPiConfig) => {
  writeFile("dist/config", JSON.stringify(newConfig), (err) => {
    if (err) {
      console.error(err);
    }
  });
};

wss.on("connection", handleConnection);

app.use(express.static("dist"));
app.all("/", function (request, response) {
  response.sendFile(path.join(__dirname, "index.html"));
});
app.listen(port, () => {
  console.log(`Listening on ${port} 🚀`);
});
