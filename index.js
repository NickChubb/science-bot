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
        musicChannelID } = require('./config.json');
const client = new Discord.Client();
const eventsChannel = client.channels.cache.get(eventsChannelID);
const modCommandsChannel = client.channels.cache.get(modCommandsChannelID);
const announcementsChannel = client.channels.cache.get(announcementsChannelID);

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

// Displays console log when bot is successfully running
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
    const voiceChannel = client.channels.cache.get(musicChannelID);
    voiceChannel.join().then(connection => {
        // Yay, it worked!
        console.log("Successfully connected to voice channel.");
        playMusic();
    }).catch(e => {
        // Oh no, it errored! Let's log it to console :)
        console.error(e);
    });
});

client.on('message', async message => {
	if (message.content.startsWith(`${prefix}`)) {

        if (message.channel.id == eventsChannelID) {  // CHANGE TO MOD COMMAND

            let args = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
            let command = args[0].substring(1); // Remove prefix from command
            args.shift(); // Remove first element (command) from args

            if (command == 'add') {

                if (args.length == 7) {

                    eventTitle = args[0].split('"').join('');
                    eventDescription = args[1].split('"').join('');
                    eventLocation = args[2].split('"').join('');
                    eventDate = args[3];
                    eventStartTime = args[4];
                    eventEndTime = args[5];
                    eventURL = args[6];
    
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
    
                } else {
                    message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +add "<title>" "<description>" "<location>" <date (YYYY-MM-DD)> <start_time> <end_time> <URL>```'); //Red text
                }
            
            } else if (command == 'show') {
                
                const channel = message.channel;

                createCalendar(channel);

            } else if (command == 'del') {

                if (args.length == 1) {

                    const delID = args[0];
                    const rowCount = await Events.destroy({ where: { id: delID } });
                    if   (!rowCount) return message.reply('```diff\n- ERROR: That event does not exist.\n```');
                    return message.reply('```diff\n+ Event deleted successfully\n```');

                } else {
                    message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +del <id>```'); //Red text
                }
            } else if (command == 'test') { // Testing command
                //updateLoop();
                updateCalendar();
            } else {
                message.reply('```diff\n- Sorry, I don\'t know that command.\n```'); //Red text
            }
            
        } else {
            message.reply('```diff\n- Sorry, I only respond to commands in the mod-commands channel.\n```'); //Red text
        }
    }
});

/**
 * Creates the message to be sent in the events channel
 */
async function createCalendar(channel){

    const eventsList = await Events.findAll({ order: [['date', 'DESC']] });

    eventsList.forEach(event => {
        eventEmbed = createEventEmbed(event.dataValues);
        channel.send(eventEmbed);
    });
}

function updateCalendar() {
    
    console.log("Calendar updating");
    
    const chnnl = client.channels.cache.get(eventsChannelID);

    // Delete all the messages in the channel
    chnnl.bulkDelete(100);
    // Create new calendar of messages
    createCalendar(chnnl);
}

/**
 * Creates an Embed for a specified event
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
 * The main update loop of the bot, commands to be executed every 30 minutes
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

function playMusic(){
    const voiceChannel = client.channels.cache.get(musicChannelID);

    voiceChannel.join().then(connection => {
        const stream = ytdl('https://www.youtube.com/watch?v=5qap5aO4i9A&ab_channel=ChilledCow', { filter: 'audioonly' });
        const dispatcher = connection.play(stream);

        dispatcher.on('finish', () => voiceChannel.leave());
    });
}

// Executes every 30 minutes
setInterval(updateLoop, 1800000);

client.login(token);