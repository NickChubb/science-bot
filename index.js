// index.js

const Discord = require('discord.js');
const Sequelize = require('sequelize');
const { token, 
        prefix, 
        eventsChannelID, 
        announcementsChannelID } = require('./config.json');

const client = new Discord.Client();
const eventsChannel = client.channels.cache.get(eventsChannelID);
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
 * equivalent to: CREATE TABLE tags(
 * name VARCHAR(255),
 * description TEXT,
 * username VARCHAR(255),
 * usage INT
 * );
 */
const Events = sequelize.define('events', {
    id: {
        type: Sequelize.INTEGER,
        unique: true,
    },
	name: Sequelize.STRING,
	description: Sequelize.TEXT,
    date: Sequelize.STRING,
    start_time: Sequelize.STRING,
    end_time: Sequelize.STRING,
    location: Sequelize.STRING,
    URL: Sequelize.STRING
});

// Displays console log when bot is successfully running
client.once('ready', () => {
    console.log('Ready!');
});

/* TODO later -> v1.1
client.on('message', message => {
	if (message.content === `${prefix}add`) {

        // POST request to database

        // Update events channel

        // 

    }
});
*/

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