#!/usr/bin/env node

/**
 * Lists all notebooks in Evernote users's account and creates a new note.
 */

var argv = require('yargs')
  .alias('b', 'business')
  .alias('c', 'create')
  .alias('d', 'disclaimer')
  .alias('g', 'guid')
  .alias('l', 'list')
  .alias('m', 'listbusiness')
  .argv;
var colors = require('colors');
var config = require('../config.json');
var crypto = require('crypto');
var Evernote = require('evernote').Evernote;
var fs = require('fs');
var path = require('path');
var util = require('util');

require('es6-promise').polyfill();

//
// Functions
//

/**
 * Constructs attachment for a note given a filepath.
 * @param  {string} filepath path to file to attach as a resource
 * @return {Object}          contains hash and resource of file
 */
var constructAttachment = function(filepath) {
  // Creates attachment resource containing the file's binary data,
  // an MD5 hash of the file's binary data, and the file's MIME type.
  var image = fs.readFileSync(filepath);
  var hash = image.toString('base64');

  var data = new Evernote.Data();
  data.size = image.length;
  data.bodyHash = hash;
  data.body = image;

  resource = new Evernote.Resource();
  resource.mime = 'image/png';
  resource.data = data;

  // Displays the resource as part of the note's ENML content.
  var md5 = crypto.createHash('md5');
  md5.update(image);

  return {
    hash: md5.digest('hex'),
    resource: resource
  };
}

var _constructNote = function() {
  var note = new Evernote.Note();
  var filename = __filename.split(path.sep).pop();
  note.title = util.format('Note generated by %s', filename);

  // Creates and adds attachment.
  var attachment = constructAttachment(
    path.join(__dirname, '../input/', 'wraithmonster.png'));
  note.resources = [attachment.resource];

  var authorName = process.env.npm_package_author_name || '@mattnorrisme';

  note.content = (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">' +
    '<en-note>' +
      util.format('<p>Note generated by <i>%s</i>. Authored by <a href="%s">%s</a>.</p>',
        filename,
        util.format('http://twitter.com/%s', authorName),
        authorName) +
      util.format('<en-media type="image/png" hash="%s"/>', attachment.hash) +
    '</en-note>'
  );

  return note;
}

/**
 * Creates a sample note.
 */
var createNote = function() {
  var note = _constructNote();
  noteStore.createNote(note, function(err, createdNote) {
    console.log(util.format('%s with GUID %s and %d attachment(s).',
      'Created a new note'.green,
      createdNote.guid.bold,
      createdNote.resources.length));
    console.log();
  });
}

/**
 * Adds disclaimer to the note with the specified GUID.
 * @param  {string} guid GUID of note to alter
 */
var addDisclaimer = function(guid) {
  var disclaimerText = "This note and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this note in error please notify the system manager. This note contains confidential information and is intended only for the individual named. If you are not the named addressee you should not disseminate, distribute or copy this note. Please notify the sender immediately by e-mail if you have received this note by mistake and delete this note from your system. If you are not the intended recipient you are notified that disclosing, copying, distributing or taking any action in reliance on the contents of this information is strictly prohibited.";

  _getNoteP(guid).then(function(note) {
    // Creates attachment.
    var attachment = constructAttachment(
      path.join(__dirname, '../input/', 'a42-disclaimerLogo.png'));
    if (!note.resources) {
      note.resources = [];
    }
    note.resources.push(attachment.resource);

    // Alters note.
    note.content = note.content.replace('<en-note>',
      (
        '<en-note>' +
          util.format('<en-media type="image/png" hash="%s" />', attachment.hash) +
          util.format('<blockquote>%s</blockquote>', disclaimerText) +
          '<hr/>'
      )
    );

    // Updates note.
    noteStore.updateNote(authToken, note, function(err, updatedNote) {
      if (err) {
        console.error("I'm sorry, an error occurred:", err);
        process.exit(1);
      }
      else {
        console.log(util.format('%s with GUID %s with disclaimer. %d attachment(s) total.',
          'Updated note'.green,
          updatedNote.guid.bold,
          updatedNote.resources.length));
        console.log();
      }
    });
  });
}

/**
 * Returns a promise to retrieve the note with the specified GUID.
 * @param  {string} guid note GUID
 * @return {Promise}      promise to get the note
 */
var _getNoteP = function(guid) {
  return new Promise(function(resolve, reject) {
    noteStore.getNote(authToken, guid, true, false, false, false, function(err, note) {
      if (note) {
        resolve(note);
      }
      else {
        reject(err);
      }
    });
  });
}

/**
 * Gets the note with the specified GUID.
 * @param  {string} guid note GUID
 */
var getNote = function(guid) {
  // Gets note with content, but without resources, OCR, or alternate resource data.
  noteStore.getNote(authToken, guid, true, false, false, false, function(err, note) {
    if (note) {
      console.log(util.format('%s with GUID %s', 'Retrieved note'.green, note.guid.bold));
      console.log();
    }
    else {
      console.error(util.format('%s, the note with GUID %s %s.',
        "I'm sorry".red,
        guid.bold,
        'could not be found'));
      console.error('Please try another GUID.');
      console.error();
    }
  });
}

/**
 * Prints notebook titles from the specified list of notebooks.
 * @param  {Array} notebooks list of user's notebooks
 */
var _printNotebooks = function(notebooks) {
  if (!notebooks) {
    console.log('\tNo notebooks.');
  }
  else {
    notebooks.forEach(function(notebook, index) {
      console.log(util.format('\t%s. %s', index + 1, notebook.name || notebook.shareName));
    });
  }
}

/**
 * Lists the current user's username and notebooks.
 */
var listNotebooks = function() {
  noteStore.listNotebooks(function(err, notebooks) {
    userStore.getUser(function(err, user) {
      console.log(util.format('%s has %d notebook(s):',
        user.username.bold, notebooks.length));
      console.log();
      _printNotebooks(notebooks);
      console.log();
    });
  });
}

var createBusinessNotebookAndNote = function() {
  var notebook = new Evernote.Notebook();
  // var notebook = new Evernote.BusinessNotebook();
  notebook.name = 'Sample Business Notebook ' + new Date().getTime();
  client.createBusinessNotebook(notebook, function(err, createdNotebook) {
    // FIXME: createdNotebook is always 'undefined',
    // but the notebook is created success.
    // console.error('error', err);
    // console.log('createdNotebook', createdNotebook);
    _getBusinessNotebooksP().then(function(notebooks) {
      var latest = notebooks[notebooks.length-1];
      var tmpFirst = notebooks[0];
      var note = _constructNote();
      client.createNoteInBusinessNotebook(note, tmpFirst, function(err, createdNote) {
        // console.error(err);
        // console.log(createdNote);
      });
    });
  });
}

var _getBusinessNotebooksP = function() {
  return new Promise(function(resolve, reject) {
    userStore.getUser(function(err, user) {
      if (user && user.isBusinessUser) {
        client.getBusinessNoteStore().listNotebooks(function(err, notebooks) {
          if (notebooks) {
            resolve(notebooks);
          }
          else {
            reject(err);
          }
        });
      }
      else {
        reject(err);
      }
    });
  });
}

/**
 * Lists the current user's username and business notebooks.
 */
var listBusinessNotebooks = function() {
  userStore.getUser(function(err, user) {
    if (user.isBusinessUser) {
      client.getBusinessNoteStore().listNotebooks(function(err, notebooks) {
        console.log(util.format('%s is a business user with %d notebook(s):',
          user.username.bold, notebooks.length));
        console.log();
        _printNotebooks(notebooks);
        console.log();
      });

      client.listBusinessNotebooks(function(err, notebooks) {
        console.log(util.format('%s can access %d business notebook(s):',
          user.username.bold, notebooks.length));
        console.log();
        _printNotebooks(notebooks);
        console.log();
      });
    }
    else {
      console.log(util.format('%s is not a business user.',
        user.username.bold));
      console.log();
    }
  });
}

/**
 * Prints help.
 */
var printHelp = function() {
  console.error(util.format("%s, I didn't recognize any valid options.", "I'm sorry".red));
  console.log();
  console.error('Please try one of the following flags:'.bold);
  console.log();
  console.log("\t-l, --list\t\tLists user's notebooks");
  console.log("\t-c, --create\t\tCreates a new sample note");
  console.log("\t-g, --guid [GUID]\tReturns the specified note");
  console.log("\t-d, --disclaimer [GUID]\tAdds disclaimer to the specified note");
  console.log()
  console.log("\t-m, --listbusiness\tLists business notebooks");
  console.log("\t-b, --business\t\tCreates business notebook and note");
  console.log();
  process.exit();
}

//
// Script
//

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
      console.error(util.format("%s, the %s is not up-to-date.",
        "I'm sorry".red, "Evernote SDK".bold));
      console.log();
      console.error("Please run the following before running this script again:".bold);
      console.error();
      console.error('\tnpm prune && npm install');
      console.error();
      process.exit();
    }
  }
);
var noteStore = client.getNoteStore();

// TODO: Notice about `npm start` doesn't work with args.
if (Object.keys(argv).length <=2 && !argv._.length) {
  printHelp();
}
else {
  var argvValid = false;

  // Lists username and notebooks.
  if (argv.l) {
    listNotebooks();
    argvValid = true;
  }
  // Lists username and business notebooks.
  if (argv.m) {
    listBusinessNotebooks();
    argvValid = true;
  }
  // Gets the note with the specified GUID.
  if (argv.g && argv.g !== true) {
    console.log(util.format('%s with GUID %s...', 'Getting note'.yellow, argv.g.bold));
    getNote(argv.g);
    argvValid = true;
  }
  // Creates a new sample note.
  if (argv.c) {
    createNote();
    argvValid = true;
  }
  // Creates a new sample business notebook and note.
  if (argv.b) {
    createBusinessNotebookAndNote();
    argvValid = true
  }
  // Adds disclaimer to note with the specified GUID.
  if (argv.d && argv.d !== true) {
    // TODO: Reuse getNote
    addDisclaimer(argv.d);
    argvValid = true;
  }

  // Prints help if no valid options were provided.
  if (!argvValid) {
    printHelp();
  }
}
