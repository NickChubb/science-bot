docker stop hawking
docker rm hawking
docker build -t nchubb/science-bot .
docker run --restart unless-stopped --name hawking -p 3001:3001 -v db:/usr/src/app/data -d nchubb/science-bot
