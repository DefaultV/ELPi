# ELPi :notes:
Using youtube-dl and MPV, host your own free audio streaming service locally on the Raspberry Pi.

<p align="center">
  <img width="128" src="https://user-images.githubusercontent.com/14123880/184543425-90f57adf-c123-4138-aec1-b6c349e30eeb.png">
</p>
<br>

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

:tada: Playback controls (scrubbing + more)

:tada: History (quick play + randomize)

:tada: Realtime playback information for any device

:magic_wand: Sleek AI generated visuals

### TL;DR
```
sudo apt install mpv python3-pip nodejs socat
sudo pip3 install youtube-dl
mkdir ELPi; cd ELPi
wget https://github.com/DefaultV/ELPi/releases/download/v1.6/elpi_1.6.zip
unzip elpi_1.6.zip; rm elpi_1.6.zip
sudo node dist/server.min.js
```

##### Disclaimer :triangular_flag_on_post:
At the current state, this project:
* Either take the first result of a given youtube search string or directly play a "video", given a URL
* Requires manually updating youtube-dl from pip3 occasionally (Can be automated)

Some values or arguments might differ from Pi to Pi, like the jack audio card in the MPV command arguments. Find out what your audio jack is through alsa `aplay -L` and replace the argument `--audio-device=alsa/plughw:CARD=Headphones,DEV=0`. This project has only been tested on a Raspberry Pi A+

##### Current Issues
Check out the [Issues](https://github.com/DefaultV/mpvberrypi/issues)

## Instructions
Your raspberry will be the sole agent in this, any other device will merely be a client. Meaning, the audio will not be streamed from external devices to the pi, the pi itself will be the one playing the audio, all by itself. External devices will only be used to tell the pi what to "search" for, or "play" directly from youtube (Assuming the device has a web-browser)

As simple as 1, 2!

<a name="packages"></a>
### 1. Packages
The following packages are required for the system to work

```node```
```mpv```
```socat```
```python3-pip```
```youtube-dl (Through pip3, apt is outdated)```

This can be done with:

```
sudo apt install mpv python3-pip nodejs socat
```

Then, using pip:

```
(sudo) pip3 install youtube-dl
```

For better performance, make sure `nodejs` is somewhat the latest version, the apt version is 10.x

### 2. Setup
Either clone the repo or download one of the releases.

#### Release setup
After downloading a release, unzip and run the following command

```
sudo node dist/server.min.js
```

#### Repo setup
Clone the repo and run `tsc`, then after compilation you can run the command
```
sudo node dist/server.js
```

That's it! Everything should work now and you should see a webpage when accessing the ip of your Pi on your network.

## Startup
If you want, you can run the application on startup. If you are using systemd you can achieve this the following way:

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

<p align="center">
  <img width="500" src="https://user-images.githubusercontent.com/14123880/188965977-99b10c3b-d531-4dbe-a8a1-6258a2b7a6c0.png">
</p>


# IMPORTANT
Do not host this publicly to the rest of the internet, the system is vulnerable to format string attacks and exposes both the terminal and multiple commands which should only be used by admins of the system. ONLY USE ON YOUR LOCAL NETWORK
