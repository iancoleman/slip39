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
else if (browser !== 'chrome' && browser !== 'firefox') {
    throw `Unsupported browser "${browser}", must be "chrome" or "firefox"`
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

// Helper functions

function testMofN(done, m, n) {
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
    driver.findElement(By.css("#total-shares"))
        .clear();
    driver.findElement(By.css("#total-shares"))
        .sendKeys(n.toString());
    driver.findElement(By.css("#threshold"))
        .clear();
    driver.findElement(By.css("#threshold"))
        .sendKeys(m.toString());
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(shares) {
            expect(shares).toBeAMnemonic();
            // try to combine m shares
            let sharesArr = shares.split("\n\n");
            let mShares = "";
            for (let i=0; i<m; i++) {
                mShares += sharesArr[i] + "\n\n";
            }
            driver.findElement(By.css("#existing-shares"))
                .sendKeys(mShares);
            driver.findElement(By.css("#reconstructed-hex"))
                .getAttribute("value")
                .then(function(masterSecret) {
                    expect(masterSecret).toBe("abcdef0123456789abcdef0123456789");
                    done();
                });
        });
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
    driver.findElement(By.css("#new-shares"))
        .getAttribute("value")
        .then(function(value) {
            expect(value).toBeAMnemonic();
            done();
        });
});

// Master secret less than 16 chars shows error
it("Should show error for master secret less than 128 bits", function(done) {
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); // 31 hex chars, needs 32
    driver.findElement(By.css("#master-secret-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Master Secret must be at least 128 bits (32 hex chars)");
            done();
        });
});

// Master secret with uneven chars shows error
it("Should show error for master secret with odd number of characters", function(done) {
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789a");
    driver.findElement(By.css("#master-secret-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Master Secret must be an even number of bytes (multiples of 4 hex chars)");
            done();
        });
});

// Passphrase can be blank
it("Should show allow blank passphrase", function(done) {
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
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
    driver.findElement(By.css("#master-secret-hex"))
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
    driver.findElement(By.css("#master-secret-hex"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret.length).toBe(40);
            done();
        });
});

// User can enter mnemonics for reconstruction
it("Allows the user to reconstruct a master secret from mnemonics", function(done) {
    let shares = [
        "work taught acrobat leader activity tactics column similar herald much justice coal silver wildlife military august scared thunder acquire rocky",
        "work taught beard leader crunch standard moisture river expect patent obesity theory adult usual ambition huge problem charity type chew",
    ].join("\n");
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(shares);
    driver.findElement(By.css("#reconstructed-hex"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret).toBe("abcdef0123456789abcdef0123456789");
            done();
        });
});

// Encrypted master secrets require passphrase to decrypt
it("Requires a master secret for reconstructing encrypted master secrets", function(done) {
    let shares = [
        "losing extend acrobat leader duckling true profile spend advocate evening obesity forecast wrap genius false prayer cargo medical bulb enjoy",
        "losing extend beard leader dragon fitness rebuild drink guitar laden august math example ceiling coastal legal nylon senior observe alarm",
    ].join("\n");
    let passphrase = "z";
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(shares);
    driver.findElement(By.css("#decrypter"))
        .sendKeys(passphrase);
    driver.findElement(By.css("#reconstructed-hex"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret).toBe("abcdef0123456789abcdef0123456789");
            done();
        });
});

// Incorrect passphrase decrypts to incorrect master secret
it("Allows decryption with incorrect passhprase but to different master secret", function(done) {
    let shares = [
        "losing extend acrobat leader duckling true profile spend advocate evening obesity forecast wrap genius false prayer cargo medical bulb enjoy",
        "losing extend beard leader dragon fitness rebuild drink guitar laden august math example ceiling coastal legal nylon senior observe alarm",
    ].join("\n");
    let passphrase = "incorrect passphrase";
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(shares);
    driver.findElement(By.css("#decrypter"))
        .sendKeys(passphrase);
    driver.findElement(By.css("#reconstructed-hex"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret).not.toBe("abcdef0123456789abcdef0123456789");
            done();
        });
});

// Not enough shares shows an error
it("Shows an error if not enough shares are provided during reconstruction", function(done) {
    let shares = [
        "losing extend acrobat leader duckling true profile spend advocate evening obesity forecast wrap genius false prayer cargo medical bulb enjoy",
    ].join("\n");
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(shares);
    driver.findElement(By.css("#reconstructed-error"))
        .getText()
        .then(function(error) {
            expect(error).toBe("Error: Insufficient number of mnemonic groups (undefined). The required number of groups is 2.");
            done();
        });
});

// Invalid word in share shows error identifying the invalid word
it("Shows an error if there are invalid words in a share", function(done) {
    driver.findElement(By.css("#existing-shares"))
        .sendKeys("invalidword");
    driver.findElement(By.css("#reconstructed-error"))
        .getText()
        .then(function(error) {
            expect(error).toBe("Error: Invalid mnemonic word invalidword.");
            done();
        });
});

// Missing word in share shows mnemonic length error
it("Shows an error if there is a missing word in a share", function(done) {
    let share = "response senior acrobat leader scholar gather mule fridge chubby facility hesitate burning depict fiscal drift dominant miracle ancient thunder owner carve"; // missing last words 'edge drink'
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(share);
    driver.findElement(By.css("#reconstructed-error"))
        .getText()
        .then(function(error) {
            expect(error).toBe("Error: Invalid mnemonic length.");
            done();
        });
});

// Missing words in share shows checksum error
it("Shows an error if there is a missing word in a share", function(done) {
    let share = "response senior acrobat leader scholar gather mule fridge chubby facility hesitate burning depict fiscal drift dominant miracle ancient thunder owner carve edge"; // missing last word 'drink'
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(share);
    driver.findElement(By.css("#reconstructed-error"))
        .getText()
        .then(function(error) {
            expect(error).toBe("Error: Invalid mnemonic checksum");
            done();
        });
});

// Trying to generate more than 16 shares shows an error
it("Should not allow total shares to be greater than 16", function(done) {
    driver.findElement(By.css("#master-secret-hex"))
        .sendKeys("abcdef0123456789abcdef0123456789");
    driver.findElement(By.css("#total-shares"))
        .clear();
    driver.findElement(By.css("#total-shares"))
        .sendKeys("17");
    driver.findElement(By.css("#total-shares-error"))
        .getText()
        .then(function(text) {
            expect(text).toBe("Total shares must be 16 or less");
            done();
        });
});
// check m-of-n shares can be generated and reconstructed
// boundary cases and potentially unusual situations
it("Allows 1-of-1 shares", function(done) {
    testMofN(done, 1, 1);
});
it("Allows 2-of-2 shares", function(done) {
    testMofN(done, 2, 2);
});
it("Allows 14-of-15 shares", function(done) {
    testMofN(done, 14, 15);
});
it("Allows 15-of-15 shares", function(done) {
    testMofN(done, 15, 15);
});
it("Allows 1-of-16 shares", function(done) {
    testMofN(done, 1, 16);
});
it("Allows 15-of-16 shares", function(done) {
    testMofN(done, 15, 16);
});
it("Allows 16-of-16 shares", function(done) {
    testMofN(done, 16, 16);
});

// check it works with SLIP39 test vectors.
// only check the first one since it's a UI thing rather than a coverage thing
// and if the first one works the rest of the original test vectors are covered
// by the slip39 library.
it("Passes slip39 test vectors", function(done) {
    let share = "duckling enlarge academic academic agency result length solution fridge kidney coal piece deal husband erode duke ajar critical decision keyboard";
    driver.findElement(By.css("#existing-shares"))
        .sendKeys(share);
    driver.findElement(By.css("#decrypter"))
        .sendKeys("TREZOR");
    driver.findElement(By.css("#reconstructed-hex"))
        .getAttribute("value")
        .then(function(masterSecret) {
            expect(masterSecret).toBe("bb54aac4b89dc868ba37d9cc21b2cece");
            done();
        });
});

});
