interface IMPVStreamInfo {
  status: "idle" | "searching" | "playing" | "buffering" | "paused";
  metadata?: string;
  videoUrl?: string;
  searchQuery?: string;
  queue?: string[];
}

interface IAPIResponse {
  items: { id: { videoId: string }; snippet: { title: string } }[];
}

const socket = new WebSocket(`ws://${location.host.split(":")[0]}`);
const MAX_STRING_LENGTH = 60;

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
const playElement: HTMLButtonElement = document.getElementById(
  "play"
) as HTMLButtonElement;
const pauseElement: HTMLButtonElement = document.getElementById(
  "pause"
) as HTMLButtonElement;
const scrubbarElement: HTMLButtonElement = document.getElementById(
  "scrubbar"
) as HTMLButtonElement;
const randomElement: HTMLButtonElement = document.getElementById(
  "random"
) as HTMLButtonElement;
const inputQueueElement: HTMLButtonElement = document.getElementById(
  "inputqueue"
) as HTMLButtonElement;
const searchHelperResponses = document.getElementById(
  "searchhelper-responses"
) as HTMLDivElement;
const searchHelpIcon = document.getElementById("searchhelp");
const searchHelper = document.getElementById("search-helper") as HTMLDivElement;

let scrubberDown = false;
scrubbarElement?.addEventListener("pointerdown", (ev) => {
  scrubberDown = true;
  setScrubberWidth(ev.offsetX / scrubbarElement.clientWidth, true);
});
scrubbarElement?.addEventListener("pointermove", (ev) => {
  if (scrubberDown) {
    setScrubberWidth(ev.offsetX / scrubbarElement.clientWidth, true);
  }
});
window.addEventListener("pointerup", (ev) => {
  scrubberDown = false;
});
scrubbarElement?.addEventListener("pointerout", (ev) => {
  scrubberDown = false;
});

document.getElementById("search")?.addEventListener("click", () => {
  sendWSQuery(inputField.value);
  inputField.value = "";
});
playElement?.addEventListener("click", () => {
  sendWSPause(false);
});
pauseElement?.addEventListener("click", () => {
  sendWSPause(true);
});
stopElement?.addEventListener("click", () => {
  SendWSKill();
});
document.getElementById("shutdown")?.addEventListener("click", () => {
  sendWSShutdown();
});
document.getElementById("queue")?.addEventListener("click", () => {
  sendWSQueue(inputField.value);
  inputField.value = "";
});
searchHelpIcon?.addEventListener("click", () => {
  searchHelpIcon.style.display = "none";
  sendAPIQueryFromString(inputField.value);
  inputField.value = "";
});

let lastQuery = "";
const sendWSQuery = (query: string) => {
  socket.send(`play:${query}`);
  lastQuery = query;
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
const sendWSPause = (pause: boolean) => {
  socket.send(`pause:${pause}`);
};
const sendWSIndex = (index: number) => {
  socket.send(`index:${index}`);
};
const sendWSQueue = (query: string) => {
  socket.send(`queue:${query}`);
};

const setScrubberWidth = (percentWidth: number, update?: boolean) => {
  (scrubbarElement.firstElementChild! as HTMLDivElement).style.width = `${
    percentWidth * 100
  }%`;

  update && percentIndexToRealIndex(percentWidth);
};

const percentIndexToRealIndex = (indexPercent: number) => {
  const totalLength = getTotalVideoLength();
  sendWSIndex(indexPercent * totalLength);
};

const getTotalVideoLength = () => {
  const info = MPVInfo();
  if (info.metadata) {
    const split = info.metadata.split("/");
    const totalSplit = split[1].split("(")[0].split(":");
    const total =
      parseInt(totalSplit[0]) * 60 * 60 +
      parseInt(totalSplit[1]) * 60 +
      parseInt(totalSplit[2]);

    return total;
  }
  return 0;
};

function isMPVStreamInfo(
  info: IMPVStreamInfo | string[]
): info is IMPVStreamInfo {
  return (info as IMPVStreamInfo).status !== undefined;
}

const populateHistory = (items: string[]) => {
  const newItems: HTMLDivElement[] = [];
  const uniqueHistory = new Set(items.filter((index) => index));

  uniqueHistory.forEach((item) => {
    if (item.length <= 0) return;
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    historyItem.innerHTML = item.substring(0, MAX_STRING_LENGTH);
    historyItem.addEventListener("click", () => {
      sendWSQuery(item);
    });

    specifyClassList(uniqueHistory.size > 0, randomElement, "active");
    if (uniqueHistory.size > 0) {
      randomElement.onclick = () => {
        sendWSQuery(
          Array.from(uniqueHistory)[
            Math.floor(Math.random() * uniqueHistory.size)
          ]
        );
      };
    }
    newItems.push(historyItem);
  });

  historyElement.replaceChildren(...newItems);
};

const populateQueue = (items: string[]) => {
  if (items.length == 0) {
    inputQueueElement.innerHTML = "";
  }
  const newItems: HTMLDivElement[] = [];

  items.forEach((item, i) => {
    const queueItem = document.createElement("div");
    queueItem.classList.add("queue-item");
    queueItem.innerHTML = i == 0 ? `- ${item} -` : item;

    newItems.push(queueItem);
  });

  inputQueueElement.replaceChildren(...newItems);
};

// Listen for messages
socket.addEventListener("message", function (event) {
  if (event.data == "error") {
    if (
      confirm(
        "There was an error preparing the audio stream, do you want to try again?"
      )
    ) {
      sendWSQuery(lastQuery);
    }
    return;
  }
  const info: IMPVStreamInfo | string[] = JSON.parse(event.data);
  const isMPVInfo = isMPVStreamInfo(info);

  if (isMPVInfo) handleOnInfo(info);
  else populateHistory(info);
});

let lastQueueLength = 0;
const handleOnInfo = (info: IMPVStreamInfo) => {
  if (info.status == "idle") setScrubberWidth(0);
  const isLoading = info.status == "buffering" || info.status == "searching";
  const searchQuery = info.searchQuery ? info.searchQuery : "";
  const videoUrl = info.videoUrl
    ? `${
        info.status == "playing" || info.status == "paused"
          ? `(${searchQuery})<br>`
          : ""
      }${info.videoUrl}`
    : "";

  let videoIndex: string = "";
  let videoLength: string = "";
  if (info.metadata) {
    const split = info.metadata.split("/");
    videoIndex = split[0].split("A:")[1];
    videoLength = split[1].split("(")[0];
  }

  if (lastQueueLength != info.queue!.length) {
    lastQueueLength = info.queue!.length;
    populateQueue(info.queue!);
  }

  const videoData =
    videoIndex && videoLength ? `${videoIndex} / ${videoLength}` : "";

  const streamInfo = `<b>${info.status}</b> ${
    info.status == "searching" ? searchQuery : ""
  } ${videoUrl}<br>${videoData}`;
  statusField.innerHTML = streamInfo;

  specifyClassList(isLoading, loadingElement, "active");
  specifyClassList(info.status != "idle", stopElement, "active");
  specifyClassList(info.status == "paused", playElement, "active");
  specifyClassList(info.status == "playing", pauseElement, "active");
  specifyClassList(
    info.status == "playing" || info.status == "paused",
    scrubbarElement,
    "active"
  );

  MPVInfo(info);
  if (info.metadata) {
    const indexSplit = info.metadata?.split("/")[0].split(":");
    indexSplit.shift();
    const index =
      parseInt(indexSplit[0]) * 60 * 60 +
      parseInt(indexSplit[1]) * 60 +
      parseInt(indexSplit[2]);
    setScrubberWidth(index / getTotalVideoLength());
  }
};

const mpv_info: IMPVStreamInfo = { status: "idle" };
const MPVInfo = (info?: IMPVStreamInfo) => {
  if (info) {
    Object.assign(mpv_info, info);
  }
  return mpv_info;
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

const handleResponse = (resp: IAPIResponse) => {
  const newItems: HTMLDivElement[] = [];

  resp.items.forEach((item, i) => {
    const historyItem = document.createElement("div");
    historyItem.classList.add("searchhelper-item");
    historyItem.innerHTML = `${i == 0 ? "🔥" : "🔍"} - ${item.snippet.title}`;
    historyItem.addEventListener("click", () => {
      sendWSQuery(item.snippet.title);
    });

    newItems.push(historyItem);
  });

  searchHelperResponses.replaceChildren(...newItems);
  searchHelpIcon!.style.display = "block";
  searchHelper!.style.display = "block";
};

const KEY = "APITOKEN";
const sendAPIQueryFromString = (query: string) => {
  const queryParts = query.split(" ").join("+");
  const fetchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${queryParts}&key=${KEY}`;

  fetch(fetchUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((response) => handleResponse(response));
};

if (KEY.length == 8) {
  searchHelpIcon!.style.display = "none";
}

inputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendWSQuery(inputField.value);
  }
});

socket.addEventListener("open", () => {
  sendWSStatus();
  sendWSHistory();
});
