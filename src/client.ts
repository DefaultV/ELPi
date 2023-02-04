interface IMPVStreamInfo {
  status: "idle" | "searching" | "playing" | "buffering" | "paused";
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

interface IAPIResponse {
  items: { id: { videoId: string }; snippet: { title: string } }[];
}

const socket = new WebSocket(`ws://${location.host.split(":")[0]}:8080`);
const MAX_STRING_LENGTH = 60;

const eLPiConfig: IELPiConfig = {
  searchWithToken: false,
  highQualityAudio: false,
  experimentalLoader: false,
};

const KEY = "APITOKEN";

const inputField: HTMLInputElement = document.getElementById(
  "queryinput"
) as HTMLInputElement;
const loadingElement: HTMLDivElement = document.getElementById(
  "loader"
) as HTMLDivElement;
const historyElement: HTMLDivElement = document.getElementById(
  "history"
) as HTMLDivElement;
const settingsElement: HTMLDivElement = document.getElementById(
  "settings"
) as HTMLDivElement;
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
const controlsContainer = document.getElementById(
  "controlscontainer"
) as HTMLDivElement;
const timestamps = document.getElementById("timestamps") as HTMLDivElement;
const timestampsIndex = document.getElementById(
  "timestamp-index"
) as HTMLDivElement;
const timestampsLength = document.getElementById(
  "timestamp-length"
) as HTMLDivElement;
const songtitle = document.getElementById("songtitle") as HTMLDivElement;
const searchHelpIcon = document.getElementById("searchhelp");
const searchHelper = document.getElementById("search-helper") as HTMLDivElement;
const historybutton = document.getElementById(
  "historybutton"
) as HTMLButtonElement;
const settingsbutton = document.getElementById(
  "settingsbutton"
) as HTMLButtonElement;
const randomizerButton = document.getElementById(
  "randomizer"
) as HTMLButtonElement;
const BACKGROUND_IMAGEURL = "/res/elpi_bg.png";

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
  submitInputField();
});
playElement?.addEventListener("click", () => {
  sendWSPause(false);
});
pauseElement?.addEventListener("click", () => {
  sendWSPause(true);
});
document.getElementById("shutdown")?.addEventListener("click", () => {
  sendWSShutdown();
});
document.getElementById("queue")?.addEventListener("click", () => {
  sendWSQueue(inputField.value);
});
document.getElementById("searchhelper-close")?.addEventListener("click", () => {
  specifyClassList(false, searchHelper, "active");
});
const fastStreamingCheckbox: HTMLInputElement = document.getElementById(
  "faster-streaming-checkbox"
) as HTMLInputElement;
fastStreamingCheckbox?.addEventListener("click", (ev) => {
  sendWSConfigChange(
    "experimentalLoader",
    (ev.target as HTMLInputElement).checked
  );
});
const searchApiCheckbox: HTMLInputElement = document.getElementById(
  "search-api-checkbox"
) as HTMLInputElement;
searchApiCheckbox?.addEventListener("click", (ev) => {
  sendWSConfigChange(
    "searchWithToken",
    (ev.target as HTMLInputElement).checked
  );
});
searchApiCheckbox.disabled = KEY.length == 8;
const highQualityCheckbox: HTMLInputElement = document.getElementById(
  "high-quality-checkbox"
) as HTMLInputElement;
highQualityCheckbox?.addEventListener("click", (ev) => {
  sendWSConfigChange(
    "highQualityAudio",
    (ev.target as HTMLInputElement).checked
  );
});
searchHelpIcon?.addEventListener("click", () => {
  searchHelpIcon.style.display = "none";
  sendAPIQueryFromString(inputField.value);
});
historybutton.addEventListener("click", () => {
  const state = !historyElement.classList.contains("active");
  specifyClassList(state, historyElement, "active");
  specifyClassList(state, randomizerButton, "active");

  specifyClassList(false, settingsElement, "active");
});
randomizerButton.addEventListener("click", () => {
  specifyClassList(false, randomizerButton, "active");
  specifyClassList(false, historyElement, "active");
  specifyClassList(false, settingsElement, "active");
});
settingsbutton.addEventListener("click", () => {
  const state = !settingsElement.classList.contains("active");
  specifyClassList(state, settingsElement, "active");

  specifyClassList(false, randomizerButton, "active");
  specifyClassList(false, historyElement, "active");
});

const submitInputField = () => {
  if (eLPiConfig.searchWithToken && KEY.length != 8) {
    sendAPIQueryFromString(inputField.value);
  } else {
    sendWSQuery(inputField.value);
  }
  inputField.value = "";
  inputField.blur();
};

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
const sendWSConfig = () => {
  socket.send("config:all");
};
const sendWSConfigChange = (option: string, value: boolean) => {
  socket.send(`config:${option} ${value}`);
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
  info: IMPVStreamInfo | IELPiSongInfo[] | IELPiConfig
): info is IMPVStreamInfo {
  return (info as IMPVStreamInfo).status !== undefined;
}
function isElpiConfigInfo(
  info: IMPVStreamInfo | IELPiSongInfo[] | IELPiConfig
): info is IELPiConfig {
  return (info as IELPiConfig).searchWithToken !== undefined;
}

const populateHistory = (items: IELPiSongInfo[]) => {
  const newItems: HTMLDivElement[] = [];

  items.forEach((item) => {
    const historyItem = createSongContainer(
      item.searchTitle,
      item.videoId,
      () => {
        sendWSQuery(item.searchTitle);
        specifyClassList(false, historyElement, "active");
        specifyClassList(false, randomizerButton, "active");
      }
    );

    specifyClassList(items.length > 0, randomElement, "active");
    if (items.length > 0) {
      randomElement.onclick = () => {
        sendWSQuery(
          Array.from(items.map((filter) => filter.searchTitle))[
            Math.floor(Math.random() * items.length)
          ]
        );
      };
    }
    newItems.push(historyItem);
  });

  historyElement.replaceChildren(...newItems);
};

const createSongContainer = (
  title: string,
  videoId: string,
  onContainerClick?: () => void
): HTMLDivElement => {
  const songContainer = document.createElement("div");
  const songImage = document.createElement("img");
  const songText = document.createElement("p");

  songText.innerHTML = title.substring(0, MAX_STRING_LENGTH);
  songContainer.classList.add("history-item");
  songImage.classList.add("history-item-image");
  songContainer.addEventListener("click", onContainerClick);
  songImage.src = videoIdToImageUrl(videoId);
  songContainer.appendChild(songImage);
  songContainer.appendChild(songText);

  return songContainer;
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
  const info: IMPVStreamInfo | IELPiSongInfo[] | IELPiConfig = JSON.parse(
    event.data
  );
  const isMPVInfo = isMPVStreamInfo(info);

  if (isMPVInfo) {
    handleOnInfo(info);
  } else {
    const isElpiConfig = isElpiConfigInfo(info);
    if (isElpiConfig) {
      Object.assign(eLPiConfig, info);

      highQualityCheckbox.checked = eLPiConfig.highQualityAudio;
      searchApiCheckbox.checked = eLPiConfig.searchWithToken;
      fastStreamingCheckbox.checked = eLPiConfig.experimentalLoader;

      if (eLPiConfig.searchWithToken) {
        searchHelpIcon!.style.display = "none";
      }
    } else {
      populateHistory(info);
    }
  }
});

const setBackgroundImage = (url: string) => {
  document.body.style.backgroundImage = `url(${url})`;
};

const videoIdToImageUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/0.jpg`;
};

let lastQueueLength = 0;
let previousInfoStatus = "idle";
const handleOnInfo = (info: IMPVStreamInfo) => {
  if (info.status == "idle") setScrubberWidth(0);
  const isLoading = info.status == "buffering" || info.status == "searching";
  const changedState = previousInfoStatus != info.status;
  previousInfoStatus = info.status;

  if (info.videoUrl && changedState) {
    setBackgroundImage(videoIdToImageUrl(info.videoUrl));
  }
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

  if (changedState) {
    const hasSong = info.status == "playing" || info.status == "paused";
    specifyClassList(hasSong, songtitle, "active");
    specifyClassList(hasSong, timestamps, "active");
    specifyClassList(hasSong, controlsContainer, "active");
    songtitle.innerHTML = info.searchQuery;

    specifyClassList(isLoading, loadingElement, "active");
    specifyClassList(info.status == "paused", playElement, "active");
    specifyClassList(info.status == "playing", pauseElement, "active");
    specifyClassList(
      info.status == "playing" || info.status == "paused",
      scrubbarElement,
      "active"
    );

    if (info.status == "idle" || info.status == "searching") {
      setBackgroundImage(BACKGROUND_IMAGEURL);
    }
  }

  timestampsIndex.innerHTML = formatTime(videoIndex);
  timestampsLength.innerHTML = formatTime(videoLength);

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

const formatTime = (time: string) => {
  const formattedTime = time.split(":");
  if (time.length >= 3 && parseInt(formattedTime[0]) == 0) {
    return `${formattedTime[1]}:${formattedTime[2]}`;
  }
  return time;
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
  specifyClassList(true, searchHelper, "active");

  resp.items.forEach((item) => {
    const songItem = createSongContainer(
      item.snippet.title,
      item.id.videoId,
      () => {
        sendWSQuery(item.snippet.title);
        specifyClassList(false, searchHelper, "active");
      }
    );

    newItems.push(songItem);
  });

  searchHelperResponses.replaceChildren(...newItems);
  searchHelpIcon!.style.display = "block";
};

const sendAPIQueryFromString = (query: string) => {
  const queryParts = query.split(" ").join("+");
  const fetchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=${queryParts}&key=${KEY}&maxResults=10`;

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
    submitInputField();
  }
});

socket.addEventListener("open", () => {
  sendWSStatus();
  sendWSHistory();
  sendWSConfig();
});
