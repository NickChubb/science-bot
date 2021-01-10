const express = require('express');
const router = express.Router();
const stream = require('stream');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const containerName = 'hawking';

router.get('/getContainers', (req,res) => {
    docker.listContainers().then(containers => {return res.json(containers)});
    console.log('👉 sent list of containers');
});

router.get("/getLog", (req, res) => {

    let container = docker.getContainer(containerName);
    container.logs({
        follow: true,
        stdout: true,
        stderr: true
    }, function(err, stream){
        if(err) {
            return logger.error(err.message);
        }

        streamToString(stream).then( (response) => {
            res.status(200);
            res.send(response);
            console.log('👉 sent logs for container with index: ' + index);
        });

        setTimeout(function() {
        stream.destroy();
        }, 2000);
    })
   
})

router.get("/restart", (req, res) => {
    let container = docker.getContainer(containerName);
    container.restart();
})



async function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

module.exports = router;