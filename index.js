// index.js

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const { token, 
        prefix, 
        eventsChannelID,
        modCommandsChannelID, 
        announcementsChannelID } = require('./config.json');

const client = new Discord.Client();
const eventsChannel = client.channels.cache.get(eventsChannelID);
const modCommandsChannel = client.channels.cache.get(modCommandsChannelID);
const announcementsChannel = client.channels.cache.get(announcementsChannelID);

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
	name: Sequelize.STRING,
	description: Sequelize.TEXT,
    date: Sequelize.DATEONLY,
    start_time: Sequelize.INTEGER,
    end_time: Sequelize.STRING,
    location: Sequelize.STRING,
    URL: Sequelize.STRING
});

// Displays console log when bot is successfully running
client.once('ready', () => {
    console.log('Ready!');
    try {
        Events.sync();
        console.log("Events database created successfully");
    } catch {
        console.log("Error creating database");
    }
});

client.on('message', message => {
	if (message.content.startsWith(`${prefix}add`)) {

        if (message.channel.id == modCommandsChannelID) {

            // Add event to DB

        }else{
            message.channel.send('```diff\n- Sorry, I only respond to commands in the mod-commands channel.\n```'); //Red text
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

/**
 * Send announcements if any events are close to happening
 */
function sendAnnouncement(){

    // GET request from DB
    
}

setInterval(sendMessage, 60000);

// Executes every 30 minutes
setInterval(sendAnnouncement, 1800000);

client.login(token);