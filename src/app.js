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

// Creates a new note.
var note = new Evernote.Note();
var filename = __filename.split(path.sep).pop();
note.title = util.format('Note generated by %s', filename);

// Creates attachment resource containing the file's binary data,
// an MD5 hash of the file's binary data, and the file's MIME type.
var image = fs.readFileSync(path.join(__dirname, '../input/', 'wraithmonster.png'));
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

// Constructs the note's content.
// See http://dev.evernote.com/documentation/cloud/chapters/ENML.php
// for full ENML specification.
note.content = (
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">' +
  '<en-note>' +
    util.format('<p>Note generated by <i>%s</i>. Authored by <a href="%s">%s</a>.</p>',
      filename,
      util.format('http://twitter.com/%s', process.env.npm_package_author_name),
      process.env.npm_package_author_name) +
    util.format('<en-media type="image/png" hash="%s"/>', hashHex) +
  '</en-note>'
);

// Uploads note to the NoteStore.
var noteStore = client.getNoteStore();
noteStore.createNote(note, function(err, createdNote) {
  console.log(util.format('%s with ID %s', 'Created a new note'.green, createdNote.guid.bold));
  console.log();
});
