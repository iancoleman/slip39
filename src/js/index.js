(function() {

    // should be 16 but some issues with 16 shares, giving
    // Error: Invalid digest of the shared secret.
    let MAX_SHARES = 16;

    let DOM = {};
    DOM.masterSecretHex = $("#master-secret-hex");
    DOM.passphrase = $("#passphrase");
    DOM.totalShares = $("#total-shares");
    DOM.threshold = $("#threshold");
    DOM.newShares = $("#new-shares");
    DOM.generate = $(".generate");
    DOM.masterSecretError = $("#master-secret-error");
    DOM.totalSharesError = $("#total-shares-error");
    DOM.thresholdError = $("#threshold-error");
    DOM.existingShares = $("#existing-shares");
    DOM.decrypter = $("#decrypter");
    DOM.reconstructedHex = $("#reconstructed-hex");
    DOM.reconstructedError = $("#reconstructed-error");

    DOM.masterSecretHex.on("input", createShares);
    DOM.passphrase.on("input", createShares);
    DOM.totalShares.on("input", createShares);
    DOM.threshold.on("input", createShares);
    DOM.generate.on("click", generateClicked);
    DOM.existingShares.on("input", reconstruct);
    DOM.decrypter.on("input", reconstruct);

    DOM.masterSecretHex.focus();

    function generateClicked(e) {
        // get strength value
        let strengthStr = e.target.getAttribute("data-strength");
        let strength = parseInt(strengthStr);
        // validate strength value
        if (isNaN(strength)) {
            // TODO
        }
        if (strength % 16 != 0) {
            // TODO
        }
        // generate master secret
        let masterSecretHex = generateMasterSecret(strength);
        DOM.masterSecretHex.val(masterSecretHex);
        createShares();

    }

    function createShares() {
        clearShares();
        // parse parameters
        let masterSecretHex = DOM.masterSecretHex.val();
        let masterSecretBytes = hexToBytes(masterSecretHex);
        if (masterSecretHex.length < 32) {
            showMasterSecretError("Master Secret must be at least 128 bits (32 hex chars)");
            return;
        }
        if (masterSecretBytes.length % 2 != 0) {
            showMasterSecretError("Master Secret must be an even number of bytes (multiples of 4 hex chars)");
            return;
        }
        let totalShares = parseInt(DOM.totalShares.val());
        if (isNaN(totalShares)) {
            showTotalSharesError("Value must be a number");
            return;
        }
        if (totalShares <= 0) {
            showTotalSharesError("Must be at least 1");
            return;
        }
        if (totalShares > MAX_SHARES) {
            showTotalSharesError("Total shares must be " + MAX_SHARES + " or less");
            return;
        }
        let threshold = parseInt(DOM.threshold.val());
        if (isNaN(threshold)) {
            showThresholdError("Value must be a number");
            return;
        }
        if (threshold > totalShares) {
            showThresholdError("Must be less than or equal to total shares");
            return;
        }
        if (threshold <= 0) {
            showThresholdError("Must be greater than 1");
            return;
        }
        let groups = [];
        // for now only one group.
        // in the future this can be more complex.
        // Using 1-of-1 member shares because of this error in slip39 lib:
        // Creating multiple member shares with member threshold 1 is not
        // allowed. Use 1-of-1 member sharing instead.
        for (let i=0; i<totalShares; i++) {
            groups.push([1,1]);
        }
        // create shares
        let slip = slip39libs.slip39.fromArray(
            masterSecretBytes, {
            passphrase: DOM.passphrase.val(),
            threshold: threshold,
            groups: groups,
        });
        // show in the UI
        let sharesStr = "";
        for (let i=0; i<totalShares; i++) {
            let derivationPath = "r/" + i;
            sharesStr += slip.fromPath(derivationPath).mnemonics + "\n\n";
        }
        DOM.newShares.val(sharesStr.trim());
    }

    function reconstruct() {
        clearReconstructed();
        let mnemonicsStr = DOM.existingShares.val();
        if (mnemonicsStr.length == 0) {
            return;
        }
        let mnemonics = mnemonicsStr.split("\n");
        let passphrase = DOM.decrypter.val();
        mnemonics = mnemonics.map(function(m) {
            return m.trim();
        });
        mnemonics = mnemonics.filter(function(m) {
            return m.length > 0;
        });
        let secretBytes = "";
        try {
            secretBytes = slip39libs.slip39.recoverSecret(mnemonics, passphrase);
        }
        catch (e) {
            // TODO modify error text and make it easier for users
            DOM.reconstructedError.text(e);
            return;
        }
        let secretHex = bytesToHex(secretBytes);
        DOM.reconstructedHex.val(secretHex);
    }

    function generateMasterSecret(strengthBits) {
        // TODO test crypto.getRandomValues exists
        // generate secure entropy for the secret
        let buffer = new Uint8Array(strengthBits / 8);
        let data = crypto.getRandomValues(buffer);
        // fill the masterSecret value
        let masterSecret = bytesToHex(data);
        return masterSecret;
    }

    function showMasterSecretError(msg) {
        DOM.masterSecretError.text(msg);
        DOM.masterSecretError.removeClass("hidden");
    }

    function showTotalSharesError(msg) {
        DOM.totalSharesError.text(msg);
        DOM.totalSharesError.removeClass("hidden");
    }

    function showThresholdError(msg) {
        DOM.thresholdError.text(msg);
        DOM.thresholdError.removeClass("hidden");
    }

    function clearShares() {
        DOM.newShares.val("");
        DOM.masterSecretError.html("&nbsp;");
        DOM.totalSharesError.addClass("hidden");
        DOM.thresholdError.addClass("hidden");
    }

    function clearReconstructed() {
        DOM.reconstructedHex.val("");
        DOM.reconstructedError.html("&nbsp;");
    }

    function bytesToHex(u8) {
        let h = "";
        for (i=0; i<u8.length; i++) {
            hexChars = u8[i].toString(16);
            while (hexChars.length % 2 != 0) {
                hexChars = "0" + hexChars;
            }
            h += hexChars;
        }
        return h;
    }

    function hexToBytes(h) {
        // Is left padding suitable here?
        if (h.length % 2 != 0) {
            h = "0" + h;
        }
        // create bytes
        let a = [];
        for (i=0; i<h.length; i+=2) {
            let b = parseInt(h.substring(i, i+2), 16)
            a.push(b);
        }
        return a;
    }

})();
