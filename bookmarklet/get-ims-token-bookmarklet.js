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

function getImsToken() {
    for (i = 0; i < sessionStorage.length; i++) {
        var key = sessionStorage.key(i);
        if (key.startsWith("adobeid_ims_access_token")) {
            var item = sessionStorage.getItem(key);
            return JSON.parse(item).access_token;
        }
    }
    return null;
}

function parseJwt(token) {
    var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
};

var token = getImsToken();
if (token != null) {
    var jwt = parseJwt(token);
    var expires = "?";
    try {
        expires = new Date(Number.parseInt(jwt.created_at) + Number.parseInt(jwt.expires_in)).toLocaleString();
    } catch(e) {
        console.error(e);
    }
    window.prompt("𝗜𝗠𝗦 𝗮𝗰𝗰𝗲𝘀𝘀 𝘁𝗼𝗸𝗲𝗻 𝗳𝗼𝘂𝗻𝗱\n𝗖𝗹𝗶𝗲𝗻𝘁 𝗶𝗱: " + jwt.client_id + "\n𝗨𝘀𝗲𝗿 𝗶𝗱: " + jwt.user_id + "\n𝗘𝘅𝗽𝗶𝗿𝗲𝘀: " + expires + "\n𝗦𝗰𝗼𝗽𝗲𝘀: " + jwt.scope + "\n𝗧𝗼𝗸𝗲𝗻 (copy to clipboard):", token);
    console.log("IMS access token:", jwt);
} else {
    alert("Sorry, no IMS access token was found.");
}