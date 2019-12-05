(function() {

    let DOM = {};
    DOM.masterSecret = $("#master-secret");
    DOM.passphrase = $("#passphrase");
    DOM.totalShares = $("#total-shares");
    DOM.threshold = $("#threshold");
    DOM.newShares = $("#new-shares");
    DOM.generate = $(".generate");

    DOM.masterSecret.on("input", createShares);
    DOM.passphrase.on("input", createShares);
    DOM.totalShares.on("input", createShares);
    DOM.threshold.on("input", createShares);
    DOM.generate.on("click", generateClicked);

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
        if (masterSecret.length == 0) {
            showMasterSecretError();
            return;
        }
        let masterSecretHex = masterSecret.encodeHex();
        let totalShares = parseInt(DOM.totalShares.val());
        if (isNaN(totalShares)) {
            showTotalSharesError();
            return;
        }
        if (totalShares <= 0) {
            showThresholdError();
            return;
        }
        let threshold = parseInt(DOM.threshold.val());
        if (isNaN(threshold)) {
            showThresholdError();
            return;
        }
        if (threshold > totalShares) {
            showThresholdError();
            return;
        }
        if (threshold <= 0) {
            showThresholdError();
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

    function showMasterSecretError() {
        // TODO
    }

    function showTotalSharesError() {
        // TODO
    }

    function showThresholdError() {
        // TODO
    }

    function clearShares() {
        DOM.newShares.val("");
    }

})();
