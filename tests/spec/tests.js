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

var webdriver = require("selenium-webdriver");
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
var path = require("path")
var parentDir = path.resolve(process.cwd(), "..", "src", "index.html");
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
    var firefox = require("selenium-webdriver/firefox");
    var binary = new firefox.Binary(firefox.Channel.NIGHTLY);
    binary.addArguments("-headless");
    newDriver = function() {
        return new webdriver.Builder()
              .forBrowser("firefox")
              .setFirefoxOptions(new firefox.Options().setBinary(binary))
              .build();
    }
}
else if (browser == "chrome") {
    var chrome = require("selenium-webdriver/chrome");
    newDriver = function() {
        return new webdriver.Builder()
          .forBrowser("chrome")
          .setChromeOptions(new chrome.Options().addArguments("headless"))
          .build();
    }
}

// Custom Matchers

let customMatchers = {
    toBeAMnemonic: function(util, customEqualityTesters) {
        return {
            compare: function(actual) {
                let result = {};
                // test if actual is a mnemonic
                // TODO might improve this
                result.pass = actual.length > 0;
                return result;
            }
        }
    },
}


// Tests

describe("SLIP39 Tool Tests", function() {

    beforeEach(function(done) {
        jasmine.addMatchers(customMatchers);
        driver = newDriver();
        driver.get(url).then(done);
    });

    // Close the website after each test is run (so that it is opened fresh each time)
    afterEach(function(done) {
        driver.quit().then(done);
    });

// BEGIN TESTS

// Page has text
it("Should have text on the page", function(done) {
    driver.findElement(By.css("body"))
        .getText()
        .then(function(text) {
            var textToFind = "SLIP39";
            expect(text).toContain(textToFind);
            done();
        });
});

// Page has SLIP39 libraries
it("Should load libraries for SLIP39", function(done) {
    driver.executeScript(function() {
        document.body.textContent = slip39libs.slip39.toString();
    });
    driver.findElement(By.css("body"))
        .getText()
        .then(function(text) {
            var textToFind = "class Slip39";
            expect(text).toContain(textToFind);
            done();
        });
});

// User can enter their own master secret
it("Should allow users to enter their own master secret", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("ABCDEFGHIJKLMNOP");
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(value) {
            expect(value).toBeAMnemonic();
            done();
        });
});

// Master secret less than 16 chars shows error
it("Should show error for master secret less than 16 chars", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("too short");
    driver.findElement(By.css("#master-secret-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Master Secret must be at least 16 characters");
            done();
        });
});

// Master secret with uneven chars shows error
it("Should show error for master secret with odd number of characters", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234odd");
    driver.findElement(By.css("#master-secret-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Master Secret must be an even number of characters, try adding one more");
            done();
        });
});

// Passphrase can be blank
it("Should show allow blank passphrase", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#passphrase"))
        .clear();
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(value) {
            expect(value).toBeAMnemonic();
            done();
        });
});

// Passphrase changes shares
it("Should show allow custom passphrase", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#passphrase"))
        .clear();
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(mnemonicsNoPassphrase) {
            driver.findElement(By.css("#passphrase"))
                .sendKeys("my passphrase");
                driver.findElement(By.css("#new-shares"))
                    .getAttribute("value")
                    .then(function(mnemonicsWithPassphrase) {
                        expect(mnemonicsNoPassphrase).not.toEqual(mnemonicsWithPassphrase);
                        done();
                    });
        });
});

// Total shares can be set by user
it("Should allow total shares to be set by the user", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#total-shares"))
        .clear();
    driver.findElement(By.css("#total-shares"))
        .sendKeys("4");
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(mnemonics) {
            let split = mnemonics.split("\n\n");
            expect(split.length).toEqual(4);
            done();
        });
});

// Total shares less than 1 shows error
it("Should show an error if total shares is less than 1", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#total-shares"))
        .clear();
    driver.findElement(By.css("#total-shares"))
        .sendKeys("0");
    driver.findElement(By.css("#total-shares-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Must be at least 1");
            done();
        });
});

// Threshold can be set by user
it("Should allow user to set a threshold value", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#threshold"))
        .clear();
    driver.findElement(By.css("#threshold"))
        .sendKeys("1");
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(mnemonics) {
            // TODO should check the shares combine with lower threshold
            expect(mnemonics).toBeAMnemonic();
            done();
        });
});

// Threshold more than total shares shows error
it("Should show an error if threshold is more than total shares", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#threshold"))
        .clear();
    driver.findElement(By.css("#threshold"))
        .sendKeys("6");
    driver.findElement(By.css("#threshold-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Must be less than or equal to total shares");
            done();
        });
});

// Threshold less than 1 shows error
it("Should show an error if threshold is less than 1", function(done) {
    driver.findElement(By.css("#master-secret"))
        .sendKeys("abcd1234abcd1234");
    driver.findElement(By.css("#threshold"))
        .clear();
    driver.findElement(By.css("#threshold"))
        .sendKeys("0");
    driver.findElement(By.css("#threshold-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Must be greater than 1");
            done();
        });
});

// User can automatically generate master secret
it("Allows the user to automatically generate a master secret", function(done) {
    driver.findElement(By.css(".generate:nth-of-type(1)"))
        .click();
    driver.findElement(By.css("#master-secret"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret.length).toBe(32);
            done();
        });
});

// User can choose size of generated master secret
it("Allows the user to choose the degree of security when generating master secrets", function(done) {
    driver.findElement(By.css(".generate:nth-of-type(2)"))
        .click();
    driver.findElement(By.css("#master-secret"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret.length).toBe(40);
            done();
        });
});

// User can enter mnemonics for reconstruction
// Encrypted master secrets require passphrase to decrypt
// Not enough shares shows an error
// Invalid word in share shows error identifying the invalid word
// Missing word in share shows mnemonic length error
// Missing words in share shows checksum error

});
