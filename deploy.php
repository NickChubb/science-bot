<?php

// Automatically pulls on the server when a git push happens in the repo.

if ( $_POST['payload'] ) {
    shell_exec('echo pull');
    shell_exec( 'cd /home/nick/dev/science-bot && git pull origin master' );
}

?>hi