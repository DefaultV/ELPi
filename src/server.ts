import { readFile } from "fs";
import { ChildProcess, exec, spawn } from "child_process";
import WebSocket, { WebSocketServer } from "ws";
import { writeFile } from "fs";
const port = 80;

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

let mpv_process: ChildProcess;
let mpv_info: IMPVStreamInfo = {
  status: "idle",
  queue: [],
};
const connectionList: WebSocket[] = [];
const history: IELPiSongInfo[] = [];

readFile("dist/history", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  if (data) {
    Object.assign(history, JSON.parse(data));
  }
});

const startMPVStream = (searchquery: string) => {
  killMPVStream();

  MPVStatus({
    status: "searching",
    searchQuery: searchquery,
    videoUrl: undefined,
  });

  let formattedQuery = searchquery.replace(/[^\w\s]/gi, "");
  mpv_process = spawn(
    `yt-dlp -f bestaudio ytsearch:'${formattedQuery}' -o - | mpv --demuxer-readahead-secs=3 --demuxer-max-bytes=3MiB --demuxer-max-back-bytes=3MiB --force-seekable=yes --cache=no --audio-device=alsa/plughw:CARD=Headphones,DEV=0 --input-ipc-server=~/socket -`,
    { shell: "/bin/bash" }
  );

  mpv_process.stderr.addListener("data", (data) =>
    handleStreamOut(data.toString())
  );

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
  spawn(`killall mpv yt-dlp`, { shell: "/bin/bash" });
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
  if (data.includes("ERROR")) {
    connectionList.forEach((connection) => connection.send("error"));
    killMPVStream();
    return;
  }
  if (data.includes("A:")) {
    MPVStatus({
      metadata: data,
    });
  }
  if (data.includes("[info]")) {
    const videoId = data.split("[info] ")[1].split(":")[0];
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

const handleConnection = (connection: WebSocket, message: string) => {
  const split = message.split(":");
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
};

const sendHistoryToSocket = (connection: WebSocket) => {
  connection.send(JSON.stringify(history));
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

Bun.serve({
  websocket: {
    message(ws, msg) {
      if (typeof msg == "string") {
        handleConnection(ws, msg);
        // handleSocketMessage(ws, msg);
      }
    },
    open(ws) {
      connectionList.push(ws);
    },
    close(ws) {
      connectionList.splice(connectionList.indexOf(ws), 1);
    },
  },
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }

    const path = req.url.split("/") as string[];
    const item = path.slice(3, path.length);
    const filepath = "dist/" + item.join("/");
    if (item[0] == "") {
      return new Response(Bun.file("dist/index.html"));
    } else {
      return new Response(Bun.file(filepath));
    }
  },
  port: port,
});
