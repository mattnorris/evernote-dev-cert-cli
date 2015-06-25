# Evernote Certified Developer Program Exercises

## Install

    git clone git@github.com:mattnorris/evernote-dev-cert-cli.git
    cd evernote-dev-cert-cli
    npm install

## Configure
Switch to the desired branch (each branch is an exercise). For example:

    git checkout exercise-5.1

Rename `config.template.json` to `config.json`.

Copy/paste your  [developer token](https://sandbox.evernote.com/api/DeveloperToken.action) or [API key](https://dev.evernote.com/#apikey) into `config.json`.

## Run

Create a note. Copy/paste its GUID into the `disclaimer` command. 

    $ ./app.js --create
    Created a new note with GUID 88888888-4444-4444-4444-000000000012 and 1 attachment(s).

    $ ./app.js --disclaimer 88888888-4444-4444-4444-000000000012
    Updated note with GUID 88888888-4444-4444-4444-000000000012 with disclaimer. 2 attachment(s) total.
