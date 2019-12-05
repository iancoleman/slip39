(function() {

    let DOM = {};
    DOM.masterSecret = $("#master-secret");
    DOM.passphrase = $("#passphrase");
    DOM.totalShares = $("#total-shares");
    DOM.threshold = $("#threshold");
    DOM.newShares = $("#new-shares");
    DOM.generate = $(".generate");
    DOM.masterSecretError = $("#master-secret-error");
    DOM.totalSharesError = $("#total-shares-error");
    DOM.thresholdError = $("#threshold-error");

    DOM.masterSecret.on("input", createShares);
    DOM.passphrase.on("input", createShares);
    DOM.totalShares.on("input", createShares);
    DOM.threshold.on("input", createShares);
    DOM.generate.on("click", generateClicked);

    DOM.masterSecret.focus();

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
        let masterSecret = generateMasterSecret(strength);
        DOM.masterSecret.val(masterSecret);
        createShares();

    }

    function createShares() {
        clearShares();
        // parse parameters
        let masterSecret = DOM.masterSecret.val();
        if (masterSecret.length < 16) {
            let msg = "Master Secret must be at least 16 characters";
            showMasterSecretError(msg);
            return;
        }
        if (masterSecret.length % 2 != 0) {
            let msg = "Master Secret must be an even number of characters, try adding one more";
            showMasterSecretError(msg);
            return;
        }
        let masterSecretHex = masterSecret.encodeHex();
        let totalShares = parseInt(DOM.totalShares.val());
        if (isNaN(totalShares)) {
            showTotalSharesError("Value must be a number");
            return;
        }
        if (totalShares <= 0) {
            showTotalSharesError("Must be at least 1");
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
        for (let i=0; i<totalShares; i++) {
            groups.push([1,1]);
        }
        // create shares
        let slip = slip39libs.slip39.fromArray(
            masterSecretHex, {
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

    function generateMasterSecret(strengthBits) {
        // TODO test crypto.getRandomValues exists
        // generate secure entropy for the secret
        let buffer = new Uint8Array(strengthBits / 8);
        let data = crypto.getRandomValues(buffer);
        // fill the masterSecret value
        let arr = [];
        for (let i=0; i<data.length; i++) {
            arr[i] = data[i];
        }
        let masterSecret = arr.toHexString();
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

})();
