<html>

<style>
  ::placeholder {
    font-style: italic;
    color: #ccc;
    transition: color 0.2s ease;
  }

  input:focus::placeholder {
    color: transparent;
  }

  input[type=text]:focus {
    outline: none;
    padding: 12px;
  }

  input[type=text] {
    padding: 0;
    transition: padding 0.2s ease;
    background: none;
  }

  body {
    background: #ffeeff;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    justify-content: center;
    align-items: center;
    font-size: 32px;
    overflow: hidden;
  }

  button,
  input[type=submit] {
    background: none;
    padding: 40px;
    border: 1px solid #ccc;
    margin: 8px;
    transition: background 0.2s ease, color 0.2s ease;
  }

  button:hover,
  input[type=submit]:hover {
    cursor: pointer;
    background: #111122;
    color: #FFF;
  }

  .verbatim {
    display: flex;
    background: #eee;
    padding: 8px;
    gap: 8px;
    flex-direction: column;
    max-height: 128px;
    overflow: auto;
  }

  #shutdown {
    border: 1px solid black;
    position: absolute;
    right: 0;
    bottom: 0;
    background: #992222; 
    color: #fff;
  }

  #shutdown:hover {
    cursor: pointer;
    background: #FFaaaa;
    color: black;
  }
</style>

<body>
  <div style="display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;">
    <div style="min-width: 400px;">
      <form method="post" style="display: flex;
    flex-direction: column;
    -webkit-gap: 8px;
    gap: 8px;" target="_self">
        <input type="text" name="query" placeholder="Youtube Search"
          style="border: none; border-bottom: 1px solid; font-size: 32px;">
        <div style="display: flex;
    justify-content: center;">
          <input type="submit" name="search" value="Search" />
          <input type="submit" name="reset" value="Stop playback" />
          <input type="submit" id="shutdown" name="shutdown" value="Power off" />
        </div>
    </div>
    <div class="search-response" style="display: flex;
    max-width: 600px;
    font-size: 18px;
    gap: 12px;
    flex-direction: column; align-items: center;">
      <?php
      
      if(isset($_POST["search"])){
	      echo "<div>Playing ".$_POST["query"]."</div>";
	      
        $cmd = "sudo killall mpv; sudo mpv --no-video --audio-device=alsa/plughw:CARD=Headphones,DEV=0 ytdl://ytsearch:\"".$_POST["query"]."\" & disown;";
	      while (@ ob_end_flush());
        $proc = popen($cmd, 'r');

        echo '<div class="verbatim">';

        while (!feof($proc))
        {
          echo '<div>'.fread($proc, 4096).'</div>';
          @ flush();
        }

        echo '</div>';
      }
    
      if (isset($_POST["reset"])){
        $exec = shell_exec('sudo killall mpv');
        echo $exec;
      }
      
      if (isset($_POST["shutdown"])){
        echo "Shutting down...";
        $exec = shell_exec('sudo shutdown now');
      }

    ?>
    </div>
  </div>
</body>

</html>
