#!/usr/bin/env node

// index.ts

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const moment = require('moment');
const ytdl = require("ytdl-core");
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

const lib = require('lib')({token: 'tok_dev_Yencymh8ZRb51EgqvQ8C8bCik8w5s1FHzMuPHkzjbVqgPnkb1mZBeLCT31kf3ruR'});
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
	storage: 'database.sqlite',
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

            if (args.length == 7) {

                const eventTitle = args[0].split('"').join('');
                const eventDescription = args[1].split('"').join('');
                const eventLocation = args[2].split('"').join('');
                const eventDate = args[3];
                const eventStartTime = args[4];
                const eventEndTime = args[5];
                const eventURL = args[6];

                const newEvent = await Events.create({
                    title: eventTitle,
                    description: eventDescription,
                    location: eventLocation,
                    date: eventDate,
                    startTime: eventStartTime,
                    endTime: eventEndTime,
                    URL: eventURL,
                });
            
                message.reply('```diff\n+ Event Added to Calendar:\n+ ' + args.join('\n+ ') + ' with id: ' + newEvent.id + '\n```');
                updateCalendar();

            } else {
                message.reply('```diff\n- ERROR: Incorrect number of arguements.'
                                + '\n\n- +add "<title>" "<description>" "<location>" <date (YYYY-MM-DD)> <start_time> <end_time> <URL>' 
                                + '\n\n- Remember to put quotation marks around the title, description and location.'
                                + '\n\n- If location is a text channel in the discord, #channel-name (WITHOUT QUOTES) will link to it.```'); //Red text
            }

            break;
        } 
        case 'del': {

            if (!isModerator(message)) { return }

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

            generateEventsTable(message);
            break;
        } 
        case 'music': {
            // Hawking's Music control commands.

            if (!isModerator(message)) { return }

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
            
            const query = args.join(" ");
            const gif = await getGif(query);
            message.channel.send(gif);
            break;
        }
        case 'help': {

            message.reply('For more info and commands, check out => https://github.com/NickChubb/science-bot/blob/master/README.md');
            break;
        }
        case 'test': {
            // Test case.

            if (!isModerator(message)) { return }

            const eventsList = await Events.findAll({ order: [['date', 'DESC']] });
            const event1 = eventsList[1];

            sendAnnouncement(event1);
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
 * Deletes the previous calendar embeds and repopulates Events Channel with new ones.
 */
function updateCalendar() {
    
    console.log("Calendar updating");
    const eventsChannel = client.channels.cache.get(eventsChannelID);

    // Delete all the messages in the channel
    eventsChannel.bulkDelete(100);
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
    var thumbnailUrl = 'https://nchubb.com/sus/'; // Hosting DSU logos on my server

    // Change colour to green if event is today
    if (eventDate.isSame(now, 'date')){
        embedColour = '#00FF7F';
    }

    // Generates a different thumbnail link depending on which DSU is organizing the event
    if (event.title.includes("Physics Student Association") || event.title.includes("PSA")) {
        thumbnailUrl += 'psa.png';
    } else if (event.title.includes("Chemistry Student Society") || event.title.includes("CSS")) {
        thumbnailUrl += 'css.png';
    } else if (event.title.includes("Simon Fraser Student Society") || event.title.includes("SFSS")) {
        thumbnailUrl += 'sfss.png';
    } else {
        thumbnailUrl += 'sus.png';
    }

    const eventEmbed = new Discord.MessageEmbed()
	.setColor(embedColour)
	.setTitle(event.title)
	//.setURL(event.URL)
    .setDescription(event.description)
    .attachFiles(['src/sus.png'])
	.setThumbnail('attachment://sus.png')
	.addFields(
        { name: 'Location', value: event.location },
        { name: 'Date', value: strDate + '\u200b \u200b \u200b \u200b \u200b \u200b', inline: true},
        //{ name: '\u200B', value: '\u200B', inline: true},
		{ name: 'Start Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.startTime , inline: true },
		{ name: 'End Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.endTime, inline: true },
    );

    return eventEmbed;
    
}

async function getGif(query) {

    // make API request
    let result = await lib.giphy.search['@0.0.9'].gifs({
        query: query,
        rating: `pg-13`
    });

    const gif = new Discord.MessageEmbed()
                            .setColor('#0099ff')
                            .setImage(result[Math.floor(Math.random() * result.length)]['images']['original']['url']);

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

    if (event.location.startsWith("#")) {

        const location = event.location.substring(1);
        eventLocation = client.channels.cache.find(channel => channel.name.endsWith(location));

        if (eventLocation === undefined) {
            eventLocation = event.location;
        }

    }

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

// Log the client in to the server
client.login(token);