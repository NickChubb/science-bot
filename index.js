// index.js

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const moment = require('moment');
const { token, 
        prefix, 
        eventsChannelID,
        modCommandsChannelID, 
        announcementsChannelID } = require('./config.json');

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
client.once('ready', () => {
    console.log('Ready!');
    console.log('initiated: ' + time.format("YYYY-MM-DD HH:mm"));

    try {
        Events.sync();
        console.log("Events database created successfully");
    } catch {
        console.log("Error creating database");
    }
});

client.on('message', async message => {
	if (message.content.startsWith(`${prefix}`)) {

        if (message.channel.id == eventsChannelID) {  // CHANGE TO MOD COMMAND

            let args = message.content.match(/(?:[^\s"]+|"[^"]*")+/g);
            let command = args[0].substring(1); // Remove prefix from command
            args.shift(); // Remove first element (command) from args

            if (command == 'add') {

                if (args.length == 7) {

                    eventTitle = args[0];
                    eventDescription = args[1];
                    eventLocation = args[2];
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
                    message.reply('```diff\n- ERROR: Incorrect number of arguements.\n\n- +add "<title>" "<description>" "<location>" <date (YYYY-MM-DDD)> <start_time> <end_time> <URL>```'); //Red text
                }
            
            } else if (command == 'show') {
                
                const eventsList = await Events.findAll();
                //const eventsString = eventsList.map(e => `\n+     ${e.title}: date = ${e.date}, id = ${e.id}`).join(' ') || 'No events set.';
                //console.log(eventsList);
                eventsList.forEach(event => {
                    eventEmbed = createEventEmbed(event.dataValues);
                    client.channels.cache.get(eventsChannelID).send({ embed: eventEmbed });
                });
                /*
                for (event in eventsList) {
                    console.log(event);
                    //console.log(event.dataValues.title);
                    eventEmbed = createEventEmbed(event);
                    client.channels.cache.get(eventsChannelID).send({ embed: eventEmbed });
                }
                */

                //message.reply('```diff\n+ Upcoming events: ' + eventsString+ '\n```');

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
                updateLoop();
            } else {
                message.reply('```diff\n- Sorry, I don\'t know that command.\n```'); //Red text
            }
            
        } else {
            message.reply('```diff\n- Sorry, I only respond to commands in the mod-commands channel.\n```'); //Red text
        }
    }
});

function sendMessage(){
    client.channels.cache.get(eventsChannelID).send(createCalendar());
}

/**
 * Creates the message to be sent in the events channel
 */
function createCalendar(){
    return "```EVENTS CALENDAR\n\nHewwo uwu this is a test for message styling```";
}

function updateCalendar() {
    console.log("Calendar updated");
}

/**
 * Creates an Embed for a specified event
 */
function createEventEmbed(event){

    //Events.findAll({ where: {id: eventID }})
    const eventEmbed = {
        color: 0x0099ff,
        title: event.title,
        description: event.description,
        fields: [
            {
                value: event.location + '',
                inline: true,
            },
            {
                value: event.startTime,
                inline: true,
            },
            {
                value: event.endTime,
                inline: true,
            },
        ]
    };

    return eventEmbed;
    
}

/**
 * The main update loop of the bot, commands to be executed every 30 minutes
 */
async function updateLoop(){

    const now = moment();
    const eventsList = await Events.findAll({ order: [['date', 'ASC']] });

    //client.channels.cache.get(eventsChannelID).send(eventsList.map(e => e.title));

    for (const event in eventsList) {

        // Check if time until event < 1hr:
        //      Send announcement about event
        


    }

    if ( !(time.isSame(now, 'day')) ) { // Returns true if not the same day as last time
        console.log("New day!");
        time = now;
        for (const event in eventsList) {
            if (event.date == time.format("YYYY-MM-DD")) {
                updateCalendar();
            }
        }
    }
}

// Executes every 30 minutes
setInterval(updateLoop, 1800000);

client.login(token);