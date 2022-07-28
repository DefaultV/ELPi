# MPV-berryPi
Using youtube-dl and MPV, host your own free audio streaming service locally on the raspberry pi.

## Why would I want this? (And why I made this project)
If you want a free, easy to use audio streaming service, seeking an alternative to expensive surround sound systems being tethered to restrictive apps. Or just want a free alternative to audio services like Spotify, then this project might be for you!

```
- Doesn't require bluetooth
- Doesn't require HDMI
- Doesn't require an app
- Doesn't require linking a separate service
- Doesn't require any accounts (or paid accounts)
```
```
- Only requires a local network, a Raspberry Pi and some speakers
```

A good DIY project to tinker with, and even better, you can host this alongside all the different things you otherwise use the Pi for, e.g. retropie, without needing to mess with configs or flashing.

##### Disclaimer
At the current state, this project:
* Either take the first result of a given youtube search string or directly play a "video", given a URL
* Requires manually updating youtube-dl from pip3 occasionally (Can be automated)

## Instructions

### Setup
Your raspberry will be the sole agent in this, any other device will merely be a client. Meaning, the audio will not be streamed from external devices to the pi, the pi itself will be the one playing the audio, all by itself. External devices will only be used to tell the pi what to "search" for, or "play" directly from youtube (Assuming the device has a web-browser)

### Packages
```mpv```
```youtube-dl (Through pip3, apt is outdated)```
```python3-pip```
```apache```
```php```

### Config
The `/etc/sudoers` file needs to have a few additions, this is to allow command calls from PHP. You can leave out the /bin/speaker-test, it's only used for testing since youtube-dl can be a tad slow occasionally. 

***Note*** that the shutdown is in ```/sbin/``` and not ```/bin/``` and that there's no spaces between the commands!

***BE AWARE!*** you might break your sudo access if you're not careful with this file, either copy-paste or look carefully before saving.

```
...

%www-data ALL=NOPASSWD:/bin/mpv,/bin/speaker-test,/bin/killall,/sbin/shutdown
```

### PHP/Apache
