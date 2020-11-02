# Hawking, the SFU Science Discord Bot

A multi-purpose Discord bot.

## Features

1) **Event Database Manager**

    Manages an event calendar channel, which users can add/remove events from with a text command.  The bot automatically removes past events and sends announcements to an announcement channel right before an event is happening.
    
    <img src="https://i.imgur.com/wPebzoX.png" alt="Event Calendar" width="500"/>

2) **24/7 Music Player**

    Streams audio from youtube into an audio channel 24/7 with no downtime.  

3) **Randomized Draws**

    Draw events can be initiated to select a winner at random for giveaways.
    
4) **More**

    More features are being added as they are needed!
   
## Documentation

To enable Hawking, you will need to rename the config.json.sample to config.json and edit it.  

modRoles are the roles that are permitted to use commands.

drawExcludedRoles are roles that are excluded from winning draws.

### Commands

- **+add** "<title>" "\<description\>" "\<location\>" <date (YYYY-MM-DD)> <start_time> <end_time> <URL>
    
    Adds a new event to the Event Calendar Database.  Title, Description, and Location must have quotation marks around the arguments if they are more than one word long.  Location may refer to a text on the current Discord channel and will create a link to it as long as it doesn't have quotation marks around it.
    
- **+del** <event_id>

    Deletes event with specified id from event calendar database.
    
- **+events**

    Display a list of all events in the database with their ID.
    
- **+music** <start/stop>

    Start or stop the music.  Generally not necessary to use but is here in case something goes wrong or music must be stopped for some reason.
    
- **+draw**

    Selects one user to win a draw.  Selected at random from the same voice channel as the user calling the command.  Roles can be excluded from draws by adding them to the drawExcludedRoles list in the config.json file.  After a user wins, they cannot be drawn again.
    
- **+draw reset**

    Reset the current draw winners.  Use this command to initialize a new raffle.
    
## About

Created for the SFU Science Undergraduate Society Discord server by Nick Chubb.


