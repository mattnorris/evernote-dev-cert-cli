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
  var CONFIG = 'config.js';
  var CONFIG_TEMPLATE = 'config.template.js';
  console.error("I'm sorry. ".bold +
    "I cannot proceed without your " + "DEVELOPER_TOKEN.".bold);
  console.error(util.format('Please rename %s to %s, then copy/paste it there.', 'config.template.js'.yellow, 'config.js'.green));
  process.exit(1);
}
var client = new Evernote.Client({token: authToken, sandbox: true});
var userStore = client.getUserStore();

userStore.checkVersion(
  "Evernote Certified Developer Program Exercise",
  Evernote.EDAM_VERSION_MAJOR,
  Evernote.EDAM_VERSION_MINOR,
  function(err, versionOk) {
    if (!versionOk) {
      console.error("Evernote API version not up-to-date.\nPlease update before continuing.");
      process.exit(2);
    }
  }
);

// Lists all notebooks in the user's account.
var noteStore = client.getNoteStore();
var notebooks = noteStore.listNotebooks(function(err, notebooks) {
  userStore.getUser(function(err, user) {
    console.log(util.format('%s has %d notebooks:', user.username.bold, notebooks.length));
    notebooks.forEach(function(notebook, index) {
      console.log(util.format('\t%s. %s', index + 1, notebook.name));
    });
    console.log();
  });
});

// Creates a new note.
var note = new Evernote.Note();
note.title = util.format('Note generated by %s', __filename.split(path.sep).pop());

// Creates attachment resource containing the file's binary data,
// an MD5 hash of the file's binary data, and the file's MIME type.
var image = fs.readFileSync(path.join(__dirname, '../input/', 'enlogo.png'));
var hash = image.toString('base64');

var data = new Evernote.Data();
data.size = image.length;
data.bodyHash = hash;
data.body = image;

resource = new Evernote.Resource();
resource.mime = 'image/png';
resource.data = data;

// Adds the resource to the note's list of resources.
note.resources = [resource];

// Displays the resource as part of the note's ENML content.
var md5 = crypto.createHash('md5');
md5.update(image);
hashHex = md5.digest('hex');

// Constructs the note. See http://dev.evernote.com/documentation/cloud/chapters/ENML.php
// for full ENML specification.
note.content = '<?xml version="1.0" encoding="UTF-8"?>';
note.content += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
note.content += '<en-note>Here is the Evernote logo:<br/>';
note.content += '<en-media type="image/png" hash="' + hashHex + '"/>';
note.content += '</en-note>';

// Creates the note.
noteStore.createNote(note, function(err, createdNote) {
  console.log(util.format('%s with ID %s', 'Created a new note'.green, createdNote.guid.bold));
  console.log();
});
