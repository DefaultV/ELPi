interface IMPVStreamInfo {
  status: "idle" | "searching" | "playing" | "buffering" | "paused";
  metadata?: string;
  videoUrl?: string;
  searchQuery?: string;
}
const socket = new WebSocket(`ws://${location.host}:8080`);
const inputField: HTMLInputElement = document.getElementById(
  "queryinput"
) as HTMLInputElement;
const statusField: HTMLDivElement = document.getElementById(
  "status"
) as HTMLDivElement;
const loadingElement: HTMLDivElement = document.getElementById(
  "loader"
) as HTMLDivElement;
const historyElement: HTMLDivElement = document.getElementById(
  "history"
) as HTMLDivElement;
const stopElement: HTMLButtonElement = document.getElementById(
  "stop"
) as HTMLButtonElement;
document.getElementById("play")?.addEventListener("pointerdown", () => {
  sendWSQuery(inputField.value);
});
stopElement?.addEventListener("pointerdown", () => {
  SendWSKill();
});
document.getElementById("shutdown")?.addEventListener("pointerdown", () => {
  sendWSShutdown();
});

const sendWSQuery = (query: string) => {
  socket.send(`play:${query}`);
};
const SendWSKill = () => {
  socket.send("kill:all");
};
const sendWSShutdown = () => {
  socket.send("shutdown:all");
};
const sendWSStatus = () => {
  socket.send("status:all");
};
const sendWSHistory = () => {
  socket.send("history:all");
};

function isMPVStreamInfo(
  info: IMPVStreamInfo | string[]
): info is IMPVStreamInfo {
  return (info as IMPVStreamInfo).status !== undefined;
}

const populateHistory = (items: string[]) => {
  const newItems: HTMLDivElement[] = [];
  const uniqueHistory = new Set(items);

  uniqueHistory.forEach((item) => {
    if (item.length <= 0) return;
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    historyItem.innerHTML = item;
    historyItem.addEventListener("pointerdown", () => {
      inputField.value = item;
    });

    newItems.push(historyItem);
  });

  historyElement.replaceChildren(...newItems);
};

// Listen for messages
socket.addEventListener("message", function (event) {
  const info: IMPVStreamInfo | string[] = JSON.parse(event.data);
  const isMPVInfo = isMPVStreamInfo(info);

  if (isMPVInfo) handleOnInfo(info);
  else populateHistory(info);
});

const handleOnInfo = (info: IMPVStreamInfo) => {
  const isLoading = info.status == "buffering" || info.status == "searching";
  const searchQuery = info.searchQuery ? info.searchQuery : "";
  const videoUrl = info.videoUrl
    ? `${info.status == "playing" ? `(${searchQuery})<br>` : ""}${
        info.videoUrl
      }`
    : "";

  let videoIndex: string = "";
  let videoLength: string = "";
  if (info.metadata) {
    const split = info.metadata.split("/");
    videoIndex = split[0].split("A:")[1];
    videoLength = split[1].split("(")[0];
  }

  const videoData =
    videoIndex && videoLength ? `${videoIndex} / ${videoLength}` : "";

  const streamInfo = `<b>${info.status}</b> ${
    info.status == "searching" ? searchQuery : ""
  } ${videoUrl}<br>${videoData}`;
  statusField.innerHTML = streamInfo;

  specifyClassList(isLoading, loadingElement, "active");
  specifyClassList(info.status != "idle", stopElement, "active");
};

const specifyClassList = (
  add: boolean,
  element: HTMLElement,
  className: string
) => {
  if (add) {
    if (!element.classList.contains(className)) {
      element.classList.add(className);
    }
  } else {
    if (element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }
};

inputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendWSQuery(inputField.value);
  }
});

socket.addEventListener("open", () => {
  sendWSStatus();
  sendWSHistory();
});
