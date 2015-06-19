#!/usr/bin/env node

/**
 * Lists all notebooks in Evernote users's account and creates a new note.
 */

var fs = require('fs');
var colors = require('colors');
var config = require('../config.json');
var crypto = require('crypto');
var Evernote = require('evernote').Evernote;
var path = require('path');
var util = require('util');

var authToken = config.DEVELOPER_TOKEN || undefined;
if (!authToken) {
  console.error("I'm sorry. ".red +
    "I can't proceed without your " + "DEVELOPER_TOKEN.".bold);
  console.error();
  console.error(util.format("\t1. Sign up for a sandbox account at %s",
    'https://sandbox.evernote.com/Registration.action'.underline));
  console.error(util.format("\t2. Get your %s at %s",
    'DEVELOPER_TOKEN'.bold,
    'https://sandbox.evernote.com/api/DeveloperToken.action'.underline));
  console.error(util.format("\t3. Copy/paste it into %s",
    'config.template.js'.yellow));
  console.error(util.format("\t4. Rename %s to %s",
    'config.template.js'.yellow, 'config.js'.green));
  console.error(util.format("\t5. Run this script again."));
  console.error();
  process.exit();
}
var client = new Evernote.Client({token: authToken, sandbox: true});
var userStore = client.getUserStore();

userStore.checkVersion(
  "Evernote Certified Developer Program Exercise",
  Evernote.EDAM_VERSION_MAJOR,
  Evernote.EDAM_VERSION_MINOR,
  function(err, versionOK) {
    if (!versionOK) {
      console.error(util.format("%s The %s is not up-to-date.",
        "I'm sorry.".red, "Evernote SDK".bold));
      console.error("Please run the following before running this script again:");
      console.error();
      console.error('\tnpm prune && npm install');
      console.error();
      process.exit();
    }
  }
);

// Lists all notebooks in the user's account.
var noteStore = client.getNoteStore();
var notebooks = noteStore.listNotebooks(function(err, notebooks) {
  userStore.getUser(function(err, user) {
    console.log(util.format('%s has %d notebooks:', user.username.bold, notebooks.length));
    console.log();
    notebooks.forEach(function(notebook, index) {
      console.log(util.format('\t%s. %s', index + 1, notebook.name));
    });
    console.log();
  });
});
