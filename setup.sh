#!bash

printTopLevel() {
  FORMATTED=`echo "$1" | sed 's/^/- /'`
  echo "$FORMATTED"
}

printIndented() {
  FORMATTED=`echo "$1" | sed 's/^/  - /'`
  echo "$FORMATTED"
}

installDependencies() {
  npm ci
  printf "\n"

  sha1sum package-lock.json > "$SHA_FILE_PATH"
}

# Installs dependencies and then saves a hash of package-lock to a local file.
# If the hash of package-lock file matches the value saved in package-lock.sha1 then it skips reinstalling dependencies
# You can delete the node_moduels directory to force a reinstall or just run the install command manually
checkDependencies() {
  printTopLevel "Checking npm dependencies"
  SHA_FILE_PATH=package-lock.sha1

  SHA1_RESULT=`sha1sum "$SHA_FILE_PATH" 2>&1`
  SHA1_CODE="$?"
  printIndented "$SHA1_RESULT"
  if test "$SHA1_CODE" != "0"; then
    printIndented "sha1 mismatch; running install"
    installDependencies
  elif test ! -d "node_modules"; then
    printIndented "missing node_modules; running install"
    installDependencies
  else
    printIndented "sha1 matches; skipping install"
  fi
}

switchNodeVersion() {
  printTopLevel "Attempting to switch to correct node version"

  # TODO: need to figure out why running nvm use and saving it to a variable does not actually change the node version. It's running twice here so that it actually appleis and so that we can get the output
  nvm use 2>&1 > /dev/null
  NVM_USE_RESULT=`nvm use 2>&1`
  NVM_USE_CODE=$?
  test `cat .nvmrc` = `node -v` || return 1
  printIndented  "$NVM_USE_RESULT"

  return $NVM_USE_CODE
}

switchNodeVersion
if test "$?" != "0"; then
  printTopLevel "Attempting to install correct node version"

  NVM_INSTALL_RESULT=`nvm install 2>&1`
  NVM_INSTALL_CODE=$?
  printIndented "$NVM_INSTALL_RESULT"

  test "$NVM_INSTALL_CODE" = "0" || return 1

  switchNodeVersion || return 1
fi

checkDependencies

mkdir -p pics
printTopLevel "Pics directory exists"

touch .metadata
printTopLevel "Metadata file exists"

touch .notes-config
printTopLevel "Notes config file exists"

mkdir -p backup
printTopLevel "Backup directory exists"

mkdir -p tmp/append
mkdir -p tmp/recycle
printTopLevel "Temp directories exist"

if [[ ! -d "freeform" ]]; then
  mkdir -p "freeform"
  printf "# Freeform\n\nUse this folder however you wish. When you use \`notes backup\` this folder will be saved as well.\n" > "freeform/FREEFORM.md"
fi
printTopLevel "Freeform directory exists"

alias notes="./node_modules/.bin/ts-node src/index.ts"
printTopLevel "Created alias 'notes'"
