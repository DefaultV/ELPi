# ELPi :notes:

Using youtube-dl/yt-dlp and MPV, host your own free audio streaming service locally on the Raspberry Pi (or Unix system).

<p align="center">
  <img width="128" src="https://user-images.githubusercontent.com/14123880/184543425-90f57adf-c123-4138-aec1-b6c349e30eeb.png">
</p>

---

## Why would I want this? (And why I made this project) :thinking:

If you want a free, easy to use audio streaming service (and without ads!), seeking an alternative to expensive surround sound systems being tethered to restrictive apps. Or just want a free alternative to audio services like Spotify. Sounds too good to be true? Then this project might be for you!

```
- Doesn't require Bluetooth
- Doesn't require HDMI
- Doesn't require an app
- Doesn't require linking separate services
- Doesn't require any accounts (or paid accounts)
```

A good DIY project to tinker with, and even better, you can host this alongside all the different things you otherwise use the Pi for, e.g. retropie, without needing to mess with configs or flashing.

### Features

:tada: Song queue

:tada: Playback controls

:tada: History

:tada: Realtime playback information across all connected devices

:tada: Optionally get search results via API

:tada: Settings menu

:magic_wand: Sleek AI generated visuals

---

<p align="center">
  <img height="700" hspace="20" src="https://user-images.githubusercontent.com/14123880/211880372-ae73be60-4fd8-4ab5-b16a-0f2f6da41f16.png">
  <img height="700" hspace="20" src="https://user-images.githubusercontent.com/14123880/211881016-23d3bbf3-8061-478c-8129-dd42906127bc.png">
</p>

---

### TL;DR

```
sudo apt install mpv python3-pip nodejs socat
sudo pip3 install yt-dlp
sudo pip3 install youtube-dl
sudo cp /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl
mkdir ELPi; cd ELPi
wget https://github.com/DefaultV/ELPi/releases/download/v1.13/elpi_1.13.zip
unzip elpi_1.13.zip; rm elpi_1.13.zip

sudo node dist/server.min.js
```

⚠️ Here we are replacing the youtube-dl binary with yt-dlp. This is because the MPV stable release on apt does not support linking `yt-dlp` as an alternative.

1. If you're building MPV from source, look into the [alternative downloader path configuration](https://github.com/mpv-player/mpv/commit/93f84b514a741c2001e6603d0304cd4a6ab63c73).

2. If you don't want to do this, you might run into [upload id extraction issues](https://github.com/ytdl-org/youtube-dl/issues?q=is%3Aissue+is%3Aopen+unable+to+extract+uploader+id+). Using the `Experimental faster searching & streaming` setting will allow you to stream without changing binaries, but with it's own cons.

Optionally (For API query results)

```
cd dist; ./settoken.sh
Enter your API token
```

#### Running on boot

TL;DR
```
echo '#!/bin/bash\ncd /home/pi/ELPi/; sudo node dist/server.min.js' > /home/pi/ELPi/elpi.sh
echo '[Service]\nType=simple\nRemainAfterExit=yes\nExecStart=/home/pi/ELPi/elpi.sh\nTimeoutStartSec=0\n\n[Install]\nWantedBy=default.target' > /home/pi/ELPi/elpi.service
sudo chmod +x /home/pi/ELPi/elpi.sh
sudo mv /home/pi/ELPi/elpi.service /etc/systemd/system/elpi.service
systemctl enable elpi && systemctl start elpi
```

OR

Read the [Startup](#startup) section for running on boot.

#### Disclaimer :triangular_flag_on_post:

At the current state, this project:

- Either take the first result of a given youtube search string or directly play a "video", given a URL (You can however pass a token and get the first 10 results to choose from)
- Requires manually updating yt-dlp from pip3 rarely

Some values or arguments might differ from Pi to Pi, like the jack audio card in the MPV command arguments. Find out what your audio jack is through alsa `aplay -L` and replace the argument `--audio-device=alsa/plughw:CARD=Headphones,DEV=0`. This project has only been tested on a Raspberry Pi A+

### Feedback

Please post features in the [Issues](https://github.com/DefaultV/mpvberrypi/issues) tab, prefix issue with `Feature Suggestion:` and label it `feature`

## Building and repo setup

Your raspberry will be the sole agent in this, any other device will merely be a client. Meaning, the audio will not be streamed from external devices to the pi, the pi itself will be the one playing the audio, all by itself. External devices will only be used to tell the pi what to "search" for, or "play" directly from youtube (Assuming the device has a web-browser)

As simple as 1, 2!

<a name="packages"></a>

### 1. Packages

The following packages are required for the system to work

`node`
`mpv`
`socat`
`python3-pip`
`yt-dlp (Through pip3, apt is outdated)`
`youtube-dl (Through pip3, apt is outdated)`

This can be done with:

```
sudo apt install mpv python3-pip nodejs socat
```

Then, using pip:

```
sudo pip3 install yt-dlp
sudo pip3 install youtube-dl
```

For better performance, make sure `nodejs` is somewhat the latest version, the apt version is 10.x

### 2. Building

Clone the repo and run `tsc` (having typescript installed), then after compilation you can run the command

```
sudo node dist/server.js
```

That's it! Everything should work now and you should see a webpage when accessing the ip of your Pi on your network.

---

<a name="startup"></a>

## Startup

If you want, you can run the application on startup. If you are using systemd (by default on raspberry pi's) you can achieve this the following way:

`/home/pi/ELPi/elpi.sh`

```
#!/bin/bash
cd /home/pi/ELPi/; sudo node dist/server.min.js
```

`/etc/systemd/system/elpi.service`

```
[Service]
Type=simple
RemainAfterExit=yes
ExecStart=/home/pi/ELPi/elpi.sh
TimeoutStartSec=0

[Install]
WantedBy=default.target
```

Then to enable on boot

```
systemctl enable elpi && systemctl start elpi
```

## Conclusion

If everything works as it should, then navigating to the local website and upon searching for a song or inputting a youtube url directly into the search field.

# IMPORTANT

Do not host this publicly to the rest of the internet, the system is vulnerable to format string attacks and exposes both the terminal and multiple commands which should only be used by admins of the system. ONLY USE ON YOUR LOCAL NETWORK
