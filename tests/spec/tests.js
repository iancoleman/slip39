// Usage:
// cd /path/to/repo/tests
// jasmine spec/tests.js
//
// Dependencies:
// nodejs
// selenium
// jasmine
// see https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Headless_mode#Automated_testing_with_headless_mode

// USER SPECIFIED OPTIONS
var browser = process.env.BROWSER; //"firefox"; // or "chrome"
if (!browser) {
    console.log("Browser can be set via environment variable, eg");
    console.log("BROWSER=firefox jasmine spec/tests.js");
    console.log("Options for BROWSER are firefox chrome");
    console.log("Using default browser: chrome");
    browser = "chrome";
}
else {
    console.log("Using browser: " + browser);
}

// Globals

var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var Key = webdriver.Key;
var until = webdriver.until;
var newDriver = null;
var driver = null;
// Delays in ms
var generateDelay = 1500;
var feedbackDelay = 500;
var entropyFeedbackDelay = 500;
var bip38delay = 15000;

// url uses file:// scheme
var path = require('path')
var parentDir = path.resolve(process.cwd(), '..', 'src', 'index.html');
var url = "file://" + parentDir;
if (browser == "firefox") {
    // TODO loading local html in firefox is broken
    console.log("Loading local html in firefox is broken, see https://stackoverflow.com/q/46367054");
    console.log("You must run a server in this case, ie do this:");
    console.log("$ cd /path/to/slip39/src");
    console.log("$ python -m http.server");
    url = "http://localhost:8000";
}

// Variables dependent on specific browser selection

if (browser == "firefox") {
    var firefox = require('selenium-webdriver/firefox');
    var binary = new firefox.Binary(firefox.Channel.NIGHTLY);
    binary.addArguments("-headless");
    newDriver = function() {
        return new webdriver.Builder()
              .forBrowser('firefox')
              .setFirefoxOptions(new firefox.Options().setBinary(binary))
              .build();
    }
}
else if (browser == "chrome") {
    var chrome = require('selenium-webdriver/chrome');
    newDriver = function() {
        return new webdriver.Builder()
          .forBrowser('chrome')
          .setChromeOptions(new chrome.Options().addArguments("headless"))
          .build();
    }
}


// Tests

describe('SLIP39 Tool Tests', function() {

    beforeEach(function(done) {
        driver = newDriver();
        driver.get(url).then(done);
    });

    // Close the website after each test is run (so that it is opened fresh each time)
    afterEach(function(done) {
        driver.quit().then(done);
    });

// BEGIN TESTS

// Page has text
it('Should have text on the page', function(done) {
    driver.findElement(By.css('body'))
        .getText()
        .then(function(text) {
            var textToFind = "SLIP39";
            expect(text).toContain(textToFind);
            done();
        });
});

// Page has SLIP39 libraries
it('Should load libraries for SLIP39', function(done) {
    driver.executeScript(function() {
        document.body.textContent = slip39libs.slip39.toString();
    });
    driver.findElement(By.css('body'))
        .getText()
        .then(function(text) {
            var textToFind = "class Slip39";
            expect(text).toContain(textToFind);
            done();
        });
});

// TODO User can enter their own master secret
// TODO Master secret less than 16 chars shows error
// TODO Master secret with uneven chars shows error
// TODO Passphrase can be blank
// TODO Passphrase changes shares
// TODO Total shares can be set by user
// TODO Total shares less than 1 shows error
// TODO Threshold can be set by user
// TODO Threshold more than total shares shows error
// TODO Threshold less than 1 shows error
// TODO User can automatically generate master secret
// TODO User can choose size of generated master secret

});
