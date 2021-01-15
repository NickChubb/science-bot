# Hawking, the SFU Science Discord Bot

A multi-purpose Discord bot.

## Features

1) **Event Database Manager**

    Manages an event calendar channel, which users can add/remove events from with a text command.  The bot automatically removes past events and sends announcements to an announcement channel right before an event is happening.
    
    <img src="https://i.imgur.com/sKA15fC.png" alt="Event Calendar" width="500"/>

2) **24/7 Music Player**

    Streams audio from youtube into an audio channel 24/7 with no downtime.  

3) **Randomized Draws**

    Draw events can be initiated to select a winner at random for giveaways.

5) **Gifs!**

    Hawking responds with a randomized gif based on a search query!  Uses the [GIPHY](https://giphy.com/) SDK to search and return gifs.

4) **More**

    More features are being added as they are needed!
   
## Documentation

To enable Hawking, you will need to rename the config.json.sample to config.json and edit it.  

modRoles are the roles that are permitted to use commands.

drawExcludedRoles are roles that are excluded from winning draws.

### Commands

- **+add** "<title>" "\<description\>" "\<location\>" <date (YYYY-MM-DD)> <start_time> <end_time> <URL>
    
    Adds a new event to the Event Calendar Database.  Title, Description, and Location must have quotation marks around the arguments if they are more than one word long.  Location may refer to a text on the current Discord channel and will create a link to it as long as it doesn't have quotation marks around it.
    
    start_time and end_time should be formatted in 12 hour standard such as XX:XXpm or XX:XXam, with no space between the numbers and the period (am/pm).  
    
    There should be no quotation marks around date, times, or the URL.  
    
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
    
- **+gif** < query >

    Responds with a randomized gif based on the search query.  Queries can be multiple words long and should not be wrapped in quotation marks.
    
## Deployment

### Docker

Currently, the preferred method of deployment is with Docker.  The included script `./docker.sh` will remove the current container (if it exists) and run a new one.

The UI interface is available at http://localhost:3001 once the container is running.  It is suggested to port forward this using either Nginx or Express if you already have another Node server on the same machine.

### config.json

Hawking requires a few channels for all the features to work properly, and these must be configured in a config.json file.  There is a provided config.json.sample to refer to.  

- The Events Calendar should be a channel that only the bot has permissions to post in, since it will delete every message in the channel which it points to when it has to refresh the calendar.  

- The announcements channel can be any channel where you would like announcements to be made.  

- The mod commands channel is a channel which is not used at this time, but I am leaving it for the time being if I need it again. 

- The music channel is any voice channel in which Hawking will join and play music on repeat.  

- isMusicOn is a boolean value which indicates whether Hawking should join a voice channel and play music.

- modRoles are a list of roles which can use moderator commands, such as adding events, running raffles, or anything to do with music.

- drawExcludedRoles are a list of roles which will not be selected to win in a raffle.  
    
## About

Created for the SFU Science Undergraduate Society Discord server by Nick Chubb.


