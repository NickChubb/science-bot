#!/usr/bin/env node

// index.js

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const moment = require('moment');
const ytdl = require("ytdl-core");
const { token, 
        prefix, 
        eventsChannelID,
        modCommandsChannelID, 
        announcementsChannelID,
        musicChannelID,
        isMusicOn } = require('./config.json');

const client = new Discord.Client();
var time = moment();

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
        playMusic();
    }
});

/**
 * Response when the client recieves a message.  This is where chat commands go.
 */
client.on('message', async message => {

    if (!message.content.startsWith(`${prefix}`)) { return };

    const modCommandsChannel = await client.channels.cache.get(modCommandsChannelID);
    if (message.channel != modCommandsChannel) { message.reply('```diff\n- Sorry, I only respond to commands in the mod-commands channel.\n```'); return; };

    let args = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
    let command = args[0].substring(1); // Remove prefix from command
    args.shift(); // Remove first element (command) from args

    switch (command) {
        case 'add': {

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
            
                message.reply('```diff\n+ Event Added to Calendar: ' + args.join(', ') + ' with id: ' + newEvent.id + '\n```');
                updateCalendar();

            } else {
                message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +add "<title>" "<description>" "<location>" <date (YYYY-MM-DD)> <start_time> <end_time> <URL>```'); //Red text
            }

            break;
        } 
        case 'del': {

            if (args.length == 1) {

                const delID = args[0];
                const rowCount = await Events.destroy({ where: { id: delID } });
                if   (!rowCount) return message.reply('```diff\n- ERROR: That event does not exist.\n```');
                return message.reply('```diff\n+ Event deleted successfully\n```');

            } else {
                message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +del <id>```'); //Red text
            }

            break;
        }
        case 'show': {
            // Display a table of all scheduled events

            generateEventsTable(message);

            break;
        } 
        case 'music': {

            const arg = args[0];
            switch (arg) {
                case 'stop':
                    stopMusic();
                    break;
                case 'start':
                    playMusic();
                    break;
                default:
                    message.reply('```diff\n- Sorry, I don\'t know that command. 🤔\n\n- +music <start/stop>```'); //Red text
            }

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

    if ( oldUserChannelID !== musicChannelID && newUserChannelID === musicChannelID ) {

        console.log(`${newState.member.displayName} has joined the music channel`);
        const userID = newState.member.user;

        /*
        const isUserUnique = await MusicUsers.findOne({where: {user: userID}});

        if (isUserUnique) {
            console.log("first time joining!");
        }
        */

        // Send DM welcoming and ask to mute if not in DB

    } else if ( oldUserChannelID === musicChannelID && newUserChannelID !== musicChannelID ) {
        console.log(`${newState.member.displayName} has left the music channel`);
    }
});

/**
 * Creates and sends the embeds for each event in the database to the events channel.
 * 
 * @param {Discord.Client.channel} channel
 */
async function createCalendar(channel){

    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });

    eventsList.forEach(event => {
        const eventEmbed = createEventEmbed(event.dataValues);
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
    // Create new calendar of messages
    createCalendar(eventsChannel);
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

    var embedColour = '#0099ff';

    const eventDate = moment(event.date);
    const strDate = eventDate.format('dddd MMM Do, YYYY');

    const now = moment();

    if(eventDate.isSame(now, 'date')){
        embedColour = '#00FF7F';
    }

    const eventEmbed = new Discord.MessageEmbed()
	.setColor(embedColour)
	.setTitle(event.title)
	.setURL('https://discord.js.org/')
    .setDescription(event.description)
    .attachFiles(['src/sus.png'])
	.setThumbnail('attachment://sus.png')
	.addFields(
        { name: 'Location', value: event.location },
        { name: 'Date', value: strDate + '\u200b \u200b \u200b \u200b \u200b \u200b', inline: true},
        //{ name: '\u200B', value: '\u200B', inline: true},
		{ name: 'Start Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.startTime , inline: true },
		{ name: 'End Time \u200b \u200b \u200b \u200b \u200b \u200b', value: event.endTime, inline: true },
	)

    return eventEmbed;
    
}

/**
 * Sends an embed notifcation to the announements channel.
 * 
 * @param {Event} event See createEventEmbed for info on Event object.
 */
function sendAnnouncement(event){

    const announcementsChannel = client.channels.cache.get(announcementsChannelID);

    var msg = 'An event is happening soon!'



}

/**
 * The main update loop of the bot, commands to be executed every 30 minutes.
 */
async function updateLoop(){

    const now = moment();
    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });

    // Manages alerts to notification channel if event is less than 1 hour away
    eventsList.forEach(event => {
        const eventDateTime = moment(event.date + ' ' + event.startTime, 'YYYY-MM-DD hh:mma');
        if(eventDateTime.isSame(now, 'date')){
            // Check if time now is after 1 hour before the event
            if(now.isAfter(eventDateTime.subtract(1, 'hours'))){

                // Alert to notifications channel
                sendAnnouncement(event);

            }
        }
    });

    if ( !(time.isSame(now, 'date')) ) { // Returns true if not the same day as last time
        console.log("New day! " + time.format("YYYY-MM-DD HH:mma"));
        time = now;

        // If any event is now today, update the calendar
        eventsList.forEach(event => {
            if(moment(event.date).isSame(time, 'date')){
                updateCalendar();
            } else if(moment(event.date).isBefore(time, 'date')){
                // Remove past event from DB
                Events.destroy({ where: {id: event.id} });
                updateCalendar();
            }
        });

    }
}

/**
 * Make Hawking play music.
 * 
 * Links:
 *  https://github.com/fent/node-ytdl-core/issues/399
 */
function playMusic(){

    const voiceChannel = client.channels.cache.get(musicChannelID);

    voiceChannel.join().then(async connection  => {

        connection.voice.setSelfDeaf(true);
        console.log("Successfully connected to voice channel.");

        const info = await ytdl.getInfo('https://www.youtube.com/watch?v=5qap5aO4i9A');
        const stream = () => {
            if (info.livestream) {
                const format = ytdl.chooseFormat(info.formats, { quality: 'highest' /*[128,127,120,96,95,94,93]*/ });
                return format.url;
            } else return ytdl.downloadFromInfo(info, { type: 'opus' });
        }

        connection.play(stream());
        setInterval( () => {
            connection.play(stream);
            console.log("Reloading music stream...");
        }, 3600000);  //restart every hour
        
    }).catch(e => {
        console.error(e);
    });
}

/**
 * Stop Hawking from playing music.
 */
function stopMusic() {
    const voiceChannel = client.channels.cache.get(musicChannelID);
    voiceChannel.leave();
}

// Executes every 30 minutes
setInterval(updateLoop, 1800000);

client.login(token);