/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

(function(){

var CONSOLE = "https://console.adobe.io";
var CONSOLE_INTEGRATIONS = CONSOLE + "/integrations";
var alertTitle = "Adobe I/O Integration YAML bookmarklet\n\n";
var clickStepsHelp = "Please go to 'Integrations', select the appropriate organization from the drop down, and then click on the integration for which you want to retrieve the YAML for. Then click the bookmarklet again.";
var accessToken;

function getImsToken(callback) {
    for (i=0; i<sessionStorage.length; i++) {
        var key = sessionStorage.key(i);
        if (key.startsWith("adobeid_ims_access_token")) {
            var item = sessionStorage.getItem(key);
            accessToken = JSON.parse(item).access_token;
            callback();
            return;
        }
    }
}

function xhr(url, callback) {
    var req = new XMLHttpRequest();
    req.addEventListener("load", function() {
        callback(JSON.parse(this.responseText));
    });
    req.open("GET", url);
    req.setRequestHeader("Authorization", "Bearer " + accessToken);
    req.setRequestHeader("x-api-key", "UDPWeb1");
    req.send();
}

if (window.location.origin !== CONSOLE) {
    var go = confirm(alertTitle + "This bookmarklet only works on " + CONSOLE + ", inside an integration.\n\nDo you want to go there now?");
    if (go) {
        window.location = CONSOLE_INTEGRATIONS;
    }
    return;
}

var consumerId, appId;
var url = window.location.pathname;
if (url.startsWith("/integrations/")) {
    var p = url.substring(14).split("/");
    if (p.length < 2) {
        alert(alertTitle + "You must be inside an integration, the one you want to retrieve the YAML file for. " + clickStepsHelp);
        return;
    } else {
        consumerId = p[0];
        appId = p[1];
    }
} else {
    alert(alertTitle + "This bookmarklet only works when you navigated to an integration.\n\n" + clickStepsHelp);
    return;
}

getImsToken(function() {
    xhr(CONSOLE + "/api/organizations/" + consumerId + "/integrations/" + appId, function(app) {
    
        xhr(CONSOLE + "/api/organizations/" + consumerId + "/integrations/entp/" + appId + "/bindings", function(bindings) {
            app.orgId = bindings[0].orgId;
            
            xhr(CONSOLE + "/api/organizations/" + consumerId + "/integrations/" + appId + "/secrets", function(secretJson) {
                app.clientSecret = secretJson.client_secrets[0].client_secret;

                var privateKey = prompt(alertTitle + "Please paste in the private key of the integration.\nThis is a PEM encoded string such as\n\n    -----BEGIN PRIVATE KEY-----\n    ...\n    -----END PRIVATE KEY-----\n\nThe multiline string will fit into the small textbox when you paste it.\n\nPlease note that nothing is sent to a server.\n\nPrivate Key:");
                if (privateKey == null) {
                    alert(alertTitle + "Aborted at your wish. Please note that this is completely local in your browser and does not send the private keys to a server.\n\nYou can also paste in the private key yourself in the final YAML file.");
                    return;
                }
                if (privateKey == "") {
                    privateKey = "&lt;please insert private-key here, with 4 space indentation&gt;";
                }
                var indent = "    ";
                privateKey = indent + privateKey.replace(/\n/g, "\n" + indent);

                var yaml = "consumerId:    " + consumerId + "\n" +
                    "applicationId: " + appId + "\n\n" +
                    "technicalAccount:\n" +
                    "  id:           " + app.technicalAccountId + "\n" +
                    "  email:        " + app.technicalAccountEmail + "\n" +
                    "  org:          " + app.orgId + "\n" +
                    "  clientId:     " + app.apiKey + "\n" +
                    "  clientSecret: " + app.clientSecret + "\n" +
                    "  privateKey: |\n" + privateKey + "\n";

                document.body.innerHTML = "<div style='margin: 50px;'><h2><code>" + app.name + "</code> Adobe I/O Integration YAML</h2>" +
                    "<p>Please copy the YAML below into a new text file and save it as <code>" + app.name + "-adobe-integration.yaml</code>:</p>" + 
                    "<textarea rows=39 cols=80 readonly style='font-family: Monaco, Menlo, \"Ubuntu Mono\", Consolas, source-code-pro, monospace; font-size: 12px; background-color: #ccc;padding: 10px;'>" + yaml + "</textarea>" +
                    "<p>This file includes the private key and client secret, <b>please store it securely</b>.</p>" +
                    "<p><button class='btn coral-btn coral-btn-cta' onclick='javascript:window.location.reload();'>Close</button></p></div>";
            });
        });
    });
});

})();