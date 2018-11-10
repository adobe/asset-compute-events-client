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