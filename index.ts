#!/usr/bin/env node

// index.ts

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const moment = require('moment');
const ytdl = require("ytdl-core");
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");
const { token, 
        prefix,
        botID,
        eventsChannelID,
        modCommandsChannelID, 
        announcementsChannelID,
        musicChannelID,
        isMusicOn,
        modRoles,
        drawExcludedRoles } = require('./config.json');

const app = express();
// const port = process.env.PORT || "3000";
const port = "3001";

const fetch = require("node-fetch");
global.Headers = fetch.Headers;
global.Request = fetch.Request;
const client = new Discord.Client();
var time = moment();
var connection;

var raffleWinners = [];

// Initialize the events database
const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'data/database.sqlite',
});

/*
 * equivalent to: CREATE TABLE events(
 * id INT,
 * name VARCHAR(255),
 * description TEXT,
 * date VARCHAR(255),
 * usage INT
 * );
 */
const Events = sequelize.define('events', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
	title: Sequelize.STRING,
	description: Sequelize.TEXT,
    date: Sequelize.DATEONLY,
    startTime: Sequelize.STRING,
    endTime: Sequelize.STRING,
    location: Sequelize.STRING,
    URL: Sequelize.STRING
});

const MusicUsers = sequelize.define('musicUsers', {
    user: {
        type: Sequelize.STRING,
        primaryKey: true
    }
});

function isModerator(message) {
    if (!message.member.roles.cache.some(item => modRoles.indexOf(item.name) !== -1)) {

        message.reply('```diff\n- Sorry, only users with at least one of the following roles can use this command: ' +  `${modRoles.join(', ')}` + '\n```');
        return false;
        
    } else {
        return true;
    }
}

// Runs the body once the client is connected to the server and ready
client.once('ready', async () => {
    console.log('Ready!');
    console.log('initiated: ' + time.format("YYYY-MM-DD HH:mma"));

    try {
        Events.sync();
        console.log("Events database created successfully");
    } catch {
        console.log("Error creating database");
    }

    // Music Integration
    if (isMusicOn) {
        MusicUsers.sync();
        console.log("MusicUsers database created successfully");

        joinVoiceChannel();
    }
});

/**
 * Response when the client recieves a message.  This is where chat commands go.
 */
client.on('message', async message => {

    if (!message.content.startsWith(`${prefix}`)) { return };

    // if (!message.member.roles.cache.some(item => modRoles.indexOf(item.name) !== -1)) {
    //     message.reply('```diff\n- Sorry, only users with at least one of the following roles can use me: ' +  `${modRoles.join(', ')}` + '\n```');
    //     return;
    // };

    //const modCommandsChannel = await client.channels.cache.get(modCommandsChannelID);
    //if (message.channel != modCommandsChannel) { message.reply('```diff\n- Sorry, I only respond to commands in the mod-commands channel.\n```'); return; };

    let args = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
    let command = args[0].substring(1); // Remove prefix from command
    args.shift(); // Remove first element (command) from args

    switch (command) {
        case 'add': {

            if (!isModerator(message)) { return }
            
            commandLog(message.member, command, args);

            if (args.length == 6) {

                const eventTitle = args[0].split('"').join('');
                const eventDescription = args[1].split('"').join('');
                const eventLocation = args[2].split('"').join('');
                const eventDate = args[3];
                const eventStartTime = args[4];
                const eventEndTime = args[5];

                const now = moment();
                if (moment(eventDate).isBefore(now, 'date')) { 
                    message.reply('```diff\n- ERROR: I don\'t think your date is right 🤔.  Make sure your date is after now.```'); //Red text
                } else {
                    const newEvent = addEvent(eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, "sfusus.com")

                    newEvent.then((event) => {
                            message.reply('```diff\n+ Event Added to Calendar:\n+ ' + args.join('\n+ ') + ' with id: ' + event.id + '\n```');                    
                        })
                }

            } else {
                message.reply('```diff\n- ERROR: Incorrect number of arguements.'
                                + '\n\n- +add "<title>" "<description>" "<location>" <date (YYYY-MM-DD)> <start_time> <end_time>' 
                                + '\n\n- Remember to put quotation marks around the title, description and location.'
                                + '\n\n- If location is a text channel in the discord, #channel-name (WITHOUT QUOTES) will link to it.```'); //Red text
            }

            break;
        } 
        case 'del': {

            if (!isModerator(message)) { return }

            commandLog(message.member, command, args);

            if (args.length == 1) {

                const delID = args[0];
                const rowCount = await Events.destroy({ where: { id: delID } });
                if   (!rowCount) return message.reply('```diff\n- ERROR: That event does not exist.\n```');
                updateCalendar();
                return message.reply('```diff\n+ Event deleted successfully\n```');

            } else {
                message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +del <id>```'); //Red text
            }

            break;
        }
        case 'events': {
            // Display a table of all scheduled events.

            if (!isModerator(message)) { return }

            commandLog(message.member, command, args);

            generateEventsTable(message);
            break;
        } 
        case 'music': {
            // Hawking's Music control commands.

            if (!isModerator(message)) { return }

            commandLog(message.member, command, args);

            const arg = args[0];
            switch (arg) {
                case 'stop':
                    stopMusic(connection);
                    break;
                case 'start':
                    playMusic(connection);
                    break;
                default:
                    message.reply('```diff\n- Sorry, I don\'t know that command. 🤔\n\n- +music <start/stop>```'); //Red text
            }

            break;
        }
        case 'draw': {
            // Select a random member from the command user's voice channel to win a draw at random.
            // Winners are added to the raffleWinners array which will reset each time the bot restarts.
            // Members with roles in drawExcludedRoles can't win draws :(

            if (!isModerator(message)) { return }

            commandLog(message.member, command, args);

            if ( args[0] == 'reset' ) {

                console.log('👉 RESETTING RAFFLE');

                raffleWinners = [];
                const voiceChannel = message.member.voice.channel;
                message.channel.send(`A new raffle is starting!  🎉  Join ${voiceChannel.name} for a chance to win!!`);

            } else {

                console.log('👉 INITIATING DRAW');

                const voiceChannelMembers = message.member.voice.channel.members;
                var raffleMembers = []; 
    
                voiceChannelMembers.forEach(member => {
                    if (!raffleWinners.includes(member) && !member.roles.cache.some(r => drawExcludedRoles.indexOf(r.name) !== -1)) {
                        raffleMembers.push(member);
                    }
                });
                
                if (raffleMembers.length == 0) {
                    message.channel.send(`There are no more eligible raffle winners 😔`);
                } else {
                    const winningIndex = Math.floor(Math.random() * raffleMembers.length);
                    const winningMember = raffleMembers[winningIndex];
                    message.channel.send(`The winner of the draw is ${winningMember}!!  🎉  Check your DMs!`);
                    raffleWinners.push(winningMember);
                }
                raffleMembers = [];
            }
            break;
        }
        case 'gif': {

            commandLog(message.member, command, args);

            const query = args.join(" ");
            const gif = await getGif(query);
            message.channel.send(gif);
            break;
        }
        case 'help': {

            commandLog(message.member, command, args);

            message.reply('For more info and commands, check out => https://github.com/NickChubb/science-bot/blob/master/README.md');
            break;
        }
        case 'reloadcalendar': {
            if (!isModerator(message)) { return }
            commandLog(message.member, command, args);
            
            updateCalendar();
            break;
        }
        default: {
            message.reply('```diff\n- Sorry, I don\'t know that command. 🤔\n```');
        }
    }
});

/**
 * Hawking determines when users join his voice channel
 */
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!isMusicOn) { return }; // Update later to check if in Voice Channel instead...

    const newUserChannelID = newState.channelID;
    const oldUserChannelID = oldState.channelID;
    const voiceChannel = client.channels.cache.get(musicChannelID);

    const user = newState.member;
    const userID = user.user.id;

    if ( oldUserChannelID !== musicChannelID && newUserChannelID === musicChannelID ) {

        if ( newState.channel.members.keyArray().length >= 2 ) {

            if ( newState.channel.members.keyArray().length == 2 ) { playMusic(connection); }

            console.log(`   ${user.displayName} (${userID}) has joined the music channel`);
            try {

                const newUser = await MusicUsers.create({
                    user: userID
                });
                
                // User's ID is added to DB successfully
                console.log(`    -> It's ${user.displayName}'s first time joining!`);
                sendWelcomeMessage(user);

            } catch {
                //User's ID is already in DB
                console.log(`    -> It's not ${user.displayName}'s first time joining!`);
            }
        } 
    } else if ( oldUserChannelID === musicChannelID && newUserChannelID !== musicChannelID ) {

        if (oldState.channel.members.keyArray().length != 0) {
            console.log(`${newState.member.displayName} has left the music channel`);
        }
        if (oldState.channel.members.keyArray().length == 1) {
            stopMusic(connection);
        }
        
    }
});

/**
 * Logs when a user uses a command.
 * @param member - Member that Hawking is responding to
 * @param command - Command that was used
 * @param args - Arguements passed []
 */
function commandLog(member, command, args){
    console.log(`👉 ${member.displayName} has used the command '${prefix}${command}' with the arguments: ${args}` )
}

/**
 * Creates and sends the embeds for each event in the database to the events channel.
 * 
 * @param {Discord.Client.channel} channel
 */
async function createCalendar(channel){

    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });
    var sentBanner = false;

    eventsList.forEach(event => {
        const eventEmbed = createEventEmbed(event.dataValues);

        // Generate today banner if not sent already and event is today
        if (moment(event.dataValues.date).isSame(moment(), 'date') && !sentBanner) {
            //channel.send("", {files: ["https://nickchubb.ca/sus/sus_today_banner.png"]});
            sentBanner = true;
        }

        channel.send(eventEmbed);
    });
}

/**
 * Create a new event in the event database and refresh calendar.
 */
async function addEvent(eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, eventURL) {

    const newEvent = await Events.create({
        title: eventTitle,
        description: eventDescription,
        location: eventLocation,
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        URL: eventURL,
    });

    updateCalendar();
    return newEvent;
}

/**
 * Deletes the previous calendar embeds and repopulates Events Channel with new ones.
 */
function updateCalendar() {
    
    console.log("Calendar updating");
    const eventsChannel = client.channels.cache.get(eventsChannelID);

    // Delete all the messages in the channel
    eventsChannel.messages.cache.each(message => message.delete());

    // Generate calendar image
    eventsChannel.send("", {files: ["https://nickchubb.ca/sus/sus_event_calendar.png"]});
    // Create new calendar of messages
    setTimeout(() => {
        createCalendar(eventsChannel);
    }, 1000);
}

/**
 * Displays all events in the database with their corresponding IDs.
 * 
 * @param {Discord.message} message 
 */
async function generateEventsTable(message) {

    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });
    var msg = '```diff\n';

    // Display table with all events and their IDs
    eventsList.forEach(event => {
        msg += '+ ' + event.dataValues.title + ' on ' + event.dataValues.date + ': ID = ' + event.dataValues.id + '\n';
    });
    msg += '```';
    message.reply(msg);
}

/**
 * Creates an Embed for a given event.
 * 
 * event is an object with fields = { id: UUID, title: STRING, description: STRING, date: YYYY-MM-DD, 
 *                                          startTime: STRING, endTime: STRING, location: STRING, URL: STRING }
 */
function createEventEmbed(event){

    const eventDate = moment(event.date);
    const strDate = eventDate.format('dddd MMM Do, YYYY');
    const now = moment();
    var embedColour = '#0099ff';
    // var thumbnailUrl = 'https://nchubb.com/sus/'; // Hosting DSU logos on my server


    // Change colour to green if event is today
    if (eventDate.isSame(now, 'date')){
        embedColour = '#00FF7F';
    }

    // Generates a different thumbnail link depending on which DSU is organizing the event
    if (event.title.includes("Physics") || event.title.includes("PSA")) {
        imageFilename = 'psa.jpeg'; // Change to png when new logo
    } else if (event.title.includes("Chemistry") || event.title.includes("CSS")) {
        imageFilename = 'css.jpeg'; // Change to png when new logo
    } else if (event.title.includes("Molecular Biology and Biochemistry") || event.title.includes("MBBSU")) {
        imageFilename = 'mbbsu.png';
    } else if (event.title.includes("Simon Fraser Student Society") || event.title.includes("SFSS")) {
        imageFilename = 'sfss.png';
    } else {
        imageFilename = 'sus.png';
    }

    let eventLocation = event.location;
    if (eventLocation.startsWith("#")) {

        const location = event.location.substring(1);
        eventLocation = client.channels.cache.find(channel => channel.name.endsWith(location));

        if (eventLocation === undefined) {
            eventLocation = event.location;
        }

    }

    const eventEmbed = new Discord.MessageEmbed()
	.setColor(embedColour)
	.setTitle(event.title)
	//.setURL(event.URL)
    .setDescription(event.description)
    .attachFiles(['src/' + imageFilename])
	.setThumbnail('attachment://' + imageFilename)
	.addFields(
        { name: 'Location', value: eventLocation },
        { name: 'Date', value: strDate + '\u200b \u200b \u200b \u200b \u200b \u200b', inline: true},
        //{ name: '\u200B', value: '\u200B', inline: true},
		{ name: 'Start Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.startTime , inline: true },
		{ name: 'End Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.endTime, inline: true },
    );

    return eventEmbed;
    
}

async function getGif(query) {

    console.log("Retrieving gif from GIPHY...")

    const url = "https://chubb.api.stdlib.com/hawking@dev/getGif/?query=";

    let response = await fetch(url + query);
    let result = await response.json();

    const gif = new Discord.MessageEmbed()
                            .setColor('#0099ff')
                            .setImage(result['images']['original']['url']);

    return gif;
}

/**
 * Sends an embed notifcation to the announements channel.
 * 
 * @param {Event} event See createEventEmbed for info on Event object.
 */
function sendAnnouncement(event){

    const announcementsChannel = client.channels.cache.get(announcementsChannelID);
    var eventLocation = event.location;

    var msg = `.\n👉   The event **${event.title}** is happening in less than an hour!   \n\n`
               + `👉   Head on over to **${eventLocation}** from **${event.startTime}** to **${event.endTime}** get involved!!\n\n`
               + `👉   *${event.description}*\n.`;

    announcementsChannel.send(msg);
    console.log("Sent announcement.");
}

async function joinVoiceChannel () {
    const voiceChannel = client.channels.cache.get(musicChannelID);
    console.log(`Joining voice channel: ${voiceChannel.name}`);
    connection = await voiceChannel.join();
    console.log('Connection: ' + connection.channel.name);
}

function leaveVoiceChannel () {
    const voiceChannel = client.channels.cache.get(musicChannelID);
    console.log(`Leaving voice channel: ${voiceChannel.name}`);
    voiceChannel.leave();
}

async function playMusic (connection) {

    const streamLink = await ytdl.getInfo('https://www.youtube.com/watch?v=5qap5aO4i9A');
    const errorLink = await ytdl.getInfo('https://www.youtube.com/watch?v=5qap5aO4i9A');
    
    const stream = (info) => {
        if (info.livestream) {
            const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', highWaterMark: 1024 * 1024 * 10 }); // [128,127,120,96,95,94,93]
            return format.url;
        } else return ytdl.downloadFromInfo(info, { type: 'opus' });
    }

    var dispatcher = await connection.play(stream(streamLink));
    console.log("Playing music...");

    dispatcher.on('error', () => {
        console.error;
        dispatcher = connection.play(stream(errorLink));
        setTimeout( () => { 
            dispatcher = connection.play(stream(streamLink));
        }, 30000);
    });
    
}

function stopMusic (connection) {
    console.log("Stopping music...");
    leaveVoiceChannel();
    setTimeout( () => {
        joinVoiceChannel();
    }, 2000);
}

/**
 * Sends a DM to a user reminding them to mute and chill
 */
function sendWelcomeMessage (member) {
    console.log(`Sending welcome message to: ${member.displayName}`);

    const msg = `Hey ${member.displayName}, you're recieving this cause it's your first time in my lo-fi channel.  Please remember to mute your mic and have a chill time. 😎`;
    member.send(msg);
}

/**
 * The main update loop of the bot, commands to be executed every 30 minutes.
 */
async function eventUpdateLoop(){

    // Make Hawking stay in the music channel forever
    const voiceChannel = client.channels.cache.get(musicChannelID);
    if ( voiceChannel.members.keyArray().length == 0 ) {
        joinVoiceChannel();
    }

    const now = moment();
    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });

    // Manages alerts to notification channel if event is less than 1 hour away
    eventsList.forEach(event => {
        const eventDateTime = moment(event.date + ' ' + event.startTime, 'YYYY-MM-DD hh:mma');
        if(eventDateTime.isSame(now, 'date')){

            // Check if time now is after 1 hour before the event
            if(now.isAfter(eventDateTime.subtract(1, 'hours'))){
                //if(now.isBetween(eventDateTime.subtract({minutes: 60}), eventDateTime.subtract({minutes: 30}))){

                console.log(`Time (now): ${now}, eventDateTime: ${eventDateTime}, eventDateTime - 30 mins: ${eventDateTime.subtract({minutes: 30})}`);

                if(now.isBefore(eventDateTime.subtract({minutes: 30}))) {
                    console.log(`Sending announcement about: ${event.title}`);

                    // Alert to notifications channel
                    sendAnnouncement(event);
                }
            }
        }
    });

    if ( !(time.isSame(now, 'date')) ) { // Returns true if not the same day as last time
        console.log("New day! " + time.format("YYYY-MM-DD HH:mma"));
        time = now;
        var isUpdate = false;

        // If any event is now today, update the calendar
        eventsList.forEach(event => {
            if(moment(event.date).isSame(time, 'date')){
                isUpdate = true;
            } else if(moment(event.date).isBefore(time, 'date')){
                // Remove past event from DB
                Events.destroy({ where: {id: event.id} });
                isUpdate = true;
            }
        });

        if ( isUpdate ){
            updateCalendar();
        }

    }
}

// Executes every 30 minutes
setInterval(eventUpdateLoop, 1800000);

/**
 * Express Routing
 */
app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/api", require("./api.ts"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
})

app.get("/event", (req, res) => {
    res.sendFile(__dirname + "/public/event.html");
})

app.post("/bot/addEvent", (req, res) => {

    const eventTitle = req.body.eventTitle;
    const eventDescription = req.body.eventDescription;
    const eventLocation = req.body.eventLocation;
    const eventStartTime = req.body.eventStartTime;
    const eventEndTime = req.body.eventEndTime;
    const eventDate = req.body.eventDate;  

    console.log(`Event Received: \n\t"${eventTitle}"\n\t"${eventDescription}"\n\t"${eventLocation}"\n\t"${eventStartTime}"\n\t"${eventEndTime}"\n\t"${eventDate}"`);

    addEvent(eventTitle, eventDescription, eventLocation, eventDate, eventStartTime, eventEndTime, "");
})  

app.get("/bot/restart", (req, res) => {
    client.destroy(token);
    client.login(token);
})


/**
 * Server Activation
 */
app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});

// Log the client in to the server
client.login(token);
