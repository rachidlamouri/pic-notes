#!bash

nvm use

npm ci
echo ""

mkdir -p pics
echo "Pics directory exists"

touch .metadata
echo "Metadata file exists"

touch .notes-config
echo "Notes config file exists"

mkdir -p backup
echo "Backup directory exists"

alias notes="./node_modules/.bin/ts-node src/index.ts"
echo "Created alias 'notes'"
