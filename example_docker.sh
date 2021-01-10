cd science-bot
docker build -t nchubb/science-bot .
docker run --name hawking -p 3001:3001 -v db:/usr/src/app/data -d nchubb/science-bot
