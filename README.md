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
```
- Requires a local network, a Raspberry Pi and some speakers
```

A good DIY project to tinker with, and even better, you can host this alongside all the different things you otherwise use the Pi for, e.g. retropie, without needing to mess with configs or flashing.

##### Disclaimer :triangular_flag_on_post:
At the current state, this project:
* Either take the first result of a given youtube search string or directly play a "video", given a URL
* Requires manually updating youtube-dl from pip3 occasionally (Can be automated)

Some values or arguments might differ from Pi to Pi, like the jack audio card in the [MPV section](#mpv). This project has only been tested on a Raspberry Pi A+

##### Current Issues
Check out the [Issues](https://github.com/DefaultV/mpvberrypi/issues)

## Instructions
Your raspberry will be the sole agent in this, any other device will merely be a client. Meaning, the audio will not be streamed from external devices to the pi, the pi itself will be the one playing the audio, all by itself. External devices will only be used to tell the pi what to "search" for, or "play" directly from youtube (Assuming the device has a web-browser)

As simple as 1, 2, 3!

### 1. Setup

<a name="packages"></a>
### 2. Packages
The following packages are required for the system to work

```mpv```
```python3-pip```
```youtube-dl (Through pip3, apt is outdated)```

This can be done with:

```
sudo apt install mpv python3-pip
```

Then, using pip:

```
(sudo) pip3 install youtube-dl
```

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

## Conclusion
If everything works as it should, then navigating to the local website and upon searching for a song or inputting a youtube url directly into the search field, a small dialogue box should show stating the output of MPV from the terminal upon refreshing the page.

<p align="center">
  <img width="500" src="https://user-images.githubusercontent.com/14123880/181741565-3d05e8f3-d303-41b6-87c8-01933f1ba699.png">
</p>


# IMPORTANT
Do not host this publicly to the rest of the internet, the system is vulnerable to format string attacks and exposes both the terminal and multiple commands which should only be used by admins of the system. ONLY USE ON YOUR LOCAL NETWORK
