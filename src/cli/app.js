#!/usr/bin/env node

/**
 * Lists all notebooks in Evernote users's account and creates a new note.
 */

var fs = require('fs');
var config = require('../../config.json');
var crypto = require('crypto');
var Evernote = require('evernote').Evernote;
var path = require('path');


var authToken = config.DEVELOPER_TOKEN;
var client = new Evernote.Client({token: authToken, sandbox: true});
var userStore = client.getUserStore();

userStore.checkVersion(
  "Evernote EDAMTest (Node.js)",
  Evernote.EDAM_VERSION_MAJOR,
  Evernote.EDAM_VERSION_MINOR,
  function(err, versionOk) {
    console.log("Evernote API version up to date? " + versionOk);
    if (!versionOk) {
      process.exit(1);
    }
  }
);

var noteStore = client.getNoteStore();

// Lists all notebooks in the user's account.
var notebooks = noteStore.listNotebooks(function(err, notebooks) {
  console.log("Found " + notebooks.length + " notebooks:");
  for (var i in notebooks) {
    console.log("  * " + notebooks[i].name);
  }
});

// Creates a new note.
var note = new Evernote.Note();
note.title = "Test note from EDAMTest.js";

// Creates attachment resource containing the file's binary data,
// an MD5 hash of the file's binary data, and the file's MIME type.
var image = fs.readFileSync(path.join(__dirname, '../../input/', 'enlogo.png'));
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
  console.log("Created new note with GUID: " + createdNote.guid);
});
