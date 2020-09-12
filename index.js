// index.js

const Discord = require('discord.js');
const { token, prefix, eventsChannelID, announcementsChannelID } = require('./config.json');
const client = new Discord.Client();

eventsChannel = client.channels.cache.get(eventsChannelID);
announcementsChannel = client.channels.cache.get(announcementsChannelID);

client.once('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {
	if (message.content === `${prefix}add`) {

        // POST request to database

        // Update events channel

        //

    }
});

function sendMessage(){
    client.channels.cache.get(eventsChannelID).send("This text is being sent every minute");
}

/**
 * Creates the message to be sent in the events channel
 */
function createCalendar(){
    
}

setInterval(sendMessage, 60000);

client.login(token);