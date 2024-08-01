#!bash

nvm use

mkdir -p pics
echo "Pics directory exists"

touch .metadata
echo "Metadata file exists"

mkdir -p backup
echo "Backup directory exists"

alias notes="npx ts-node src/index.js"
echo "Created alias 'notes'"
