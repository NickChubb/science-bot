// index.js

const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
	if (message.content === '~ping') {
        // send back "Pong." to the channel the message was sent in
        message.channel.send('Pong.');
    }
});

client.login('NzU0MzcyNjMwNDM3NTYwNDMx.X1zyQg._l2OYdWYxZY6PDU4LPS_a0JJ1L4');