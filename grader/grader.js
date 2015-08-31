#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var rest = require('restler');
var program = require('commander');
var cheerio = require('cheerio');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";


/**
 * Make sure file exists. Will do process.exit() otherwise.
 *
 * @param {string} infile  filename
 * @return {string}        infile as string
 */
var assertFileExists = function(infile) {
    var instr = infile.toString();  // why toString()?
    if (!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};


/**
 * Return the cheerio object (aka jquery $) for the html file.
 *
 * @param {string} html file  filename
 * @return {object}           assign return to $
 */
var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};


/**
 * Load the checks.json file into memory
 *
 * @param {string} checksfile  input json file
 * @return {object}            JS object representing the json
 */
var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};


/**
 * Checks the cheerio object against the check file to see if the obj
 * contains the tags listed in the check file.
 *
 * @param {cheerio} $          cherrio object
 * @param {string} checksfile  input JSON file with checks
 * @return {object}            check result
 */
var runCheckFile = function($, checksfile) {
    // load the check JSON file
    var checks = loadChecks(checksfile).sort();
    // perform the check
    var out = {};
    for (var ii in checks) {
        // for each item in check list, we use jquery's css selector
        // to see if there exist such element, brilliant!
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};


/**
 * Checks the HTML file against the check file
 *
 * @param {string} htmlfile    input HTML file to check
 * @param {string} checksfile  input JSON file with checks
 * @return {object}            check status
 */
var checkHtmlFile = function(htmlfile, checksfile) {
    return runCheckFile(cheerioHtmlFile(htmlfile),
                        checksfile);
};


/**
 * Fetch the URL content, and check it against the check file
 *
 * @param {string} urlpath     the url we want to check
 * @param {string} checksfile  input JSON file with checks
 * @return {}
 */
var checkUrl = function(urlpath, checksfile) {
    // inner function that gets called on restler complete event.
    var onComplete = function(result, response) {
        if (result instanceof Error) {
            console.error(result.message);
        } else {
            var checkJson = runCheckFile(cheerio.load(result),
                                         checksfile);
            var outJson = JSON.stringify(checkJson, null, 4);
            console.log(outJson);
        }
    };
    // fetch the URL and register the onComplete handler above to
    // process the result of the page.
    rest.get(urlpath).on('complete', onComplete);
};


var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};


/**
 * Main entrypoint function when running as script.
 *
 * @return {}
 */
var main = function() {
    // use chaining to call multiple methods on obj and a final parse()!
    program
        .option('-f, --file <html_file>', 'Path to index.html',
                clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url>', 'URL Path')
        .option('-c, --checks <check_file>', 'Path to checks.json',
                clone(assertFileExists), CHECKSFILE_DEFAULT)
        .parse(process.argv);
    // now check the file
    if (program.url) {
        checkUrl(program.url, program.checks);
        // checkUrl() will return before URL is fetched, so we need to
        // do the console output in the event URL event handler, not
        // here.
    } else {
        // this is async so we can write to console afterwards
        var checkJson = checkHtmlFile(program.file, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }
};


if (require.main == module) {
    main();
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
