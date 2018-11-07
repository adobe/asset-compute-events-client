Integration YAML
----------------

This library uses a fully self-contained YAML file describing an Adobe I/O Integration including the necessary credentials (private key and client secret) to act on behalf of the technical account of the integration.

### Generate YAML using bookmarklet

You can get the file easily using this handy bookmarklet:

<a href="javascript:void%20function(){(function(){function%20e(e){for(i=0;i%3CsessionStorage.length;i++){var%20n=sessionStorage.key(i);if(n.startsWith(%22adobeid_ims_access_token%22)){var%20o=sessionStorage.getItem(n);return%20t=JSON.parse(o).access_token,void%20e()}}}function%20n(e,n){var%20o=new%20XMLHttpRequest;o.addEventListener(%22load%22,function(){n(JSON.parse(this.responseText))}),o.open(%22GET%22,e),o.setRequestHeader(%22Authorization%22,%22Bearer%20%22+t),o.setRequestHeader(%22x-api-key%22,%22UDPWeb1%22),o.send()}var%20t,o=%22https://console.adobe.io%22,a=o+%22/integrations%22,r=%22Adobe%20I/O%20Integration%20YAML%20bookmarklet\n\n%22,s=%22Please%20go%20to%20'Integrations',%20select%20the%20appropriate%20organization%20from%20the%20drop%20down,%20and%20then%20click%20on%20the%20integration%20for%20which%20you%20want%20to%20retrieve%20the%20YAML%20for.%20Then%20click%20the%20bookmarklet%20again.%22;if(window.location.origin!==o){var%20c=confirm(r+%22This%20bookmarklet%20only%20works%20on%20%22+o+%22,%20inside%20an%20integration.\n\nDo%20you%20want%20to%20go%20there%20now%3F%22);return%20void(c%26%26(window.location=a))}var%20l,d,p=window.location.pathname;if(!p.startsWith(%22/integrations/%22))return%20void%20alert(r+%22This%20bookmarklet%20only%20works%20when%20you%20navigated%20to%20an%20integration.\n\n%22+s);var%20h=p.substring(14).split(%22/%22);return%20h.length%3C2%3Fvoid%20alert(r+%22You%20must%20be%20inside%20an%20integration,%20the%20one%20you%20want%20to%20retrieve%20the%20YAML%20file%20for.%20%22+s):(l=h[0],d=h[1],void%20e(function(){n(o+%22/api/organizations/%22+l+%22/integrations/%22+d,function(e){n(o+%22/api/organizations/%22+l+%22/integrations/entp/%22+d+%22/bindings%22,function(t){e.orgId=t[0].orgId,n(o+%22/api/organizations/%22+l+%22/integrations/%22+d+%22/secrets%22,function(n){e.clientSecret=n.client_secrets[0].client_secret;var%20t=prompt(r+%22Please%20paste%20in%20the%20private%20key%20of%20the%20integration.\nThis%20is%20a%20PEM%20encoded%20string%20such%20as\n\n%20%20%20%20-----BEGIN%20PRIVATE%20KEY-----\n%20%20%20%20...\n%20%20%20%20-----END%20PRIVATE%20KEY-----\n\nThe%20multiline%20string%20will%20fit%20into%20the%20small%20textbox%20when%20you%20paste%20it.\n\nPlease%20note%20that%20nothing%20is%20sent%20to%20a%20server.\n\nPrivate%20Key:%22);if(null==t)return%20void%20alert(r+%22Aborted%20at%20your%20wish.%20Please%20note%20that%20this%20is%20completely%20local%20in%20your%20browser%20and%20does%20not%20send%20the%20private%20keys%20to%20a%20server.\n\nYou%20can%20also%20paste%20in%20the%20private%20key%20yourself%20in%20the%20final%20YAML%20file.%22);%22%22==t%26%26(t=%22%26lt;please%20insert%20private-key%20here,%20with%204%20space%20indentation%26gt;%22);var%20o=%22%20%20%20%20%22;t=o+t.replace(/\n/g,%22\n%22+o);var%20i=%22consumerId:%20%20%20%20%22+l+%22\napplicationId:%20%22+d+%22\n\ntechnicalAccount:\n%20%20id:%20%20%20%20%20%20%20%20%20%20%20%22+e.technicalAccountId+%22\n%20%20email:%20%20%20%20%20%20%20%20%22+e.technicalAccountEmail+%22\n%20%20org:%20%20%20%20%20%20%20%20%20%20%22+e.orgId+%22\n%20%20clientId:%20%20%20%20%20%22+e.apiKey+%22\n%20%20clientSecret:%20%22+e.clientSecret+%22\n%20%20privateKey:%20|\n%22+t+%22\n%22;document.body.innerHTML=%22%3Cdiv%20style='margin:%2050px;'%3E%3Ch2%3E%3Ccode%3E%22+e.name+%22%3C/code%3E%20Adobe%20I/O%20Integration%20YAML%3C/h2%3E%3Cp%3EPlease%20copy%20the%20YAML%20below%20into%20a%20new%20text%20file%20and%20save%20it%20as%20%3Ccode%3E%22+e.name+%22-adobe-integration.yaml%3C/code%3E:%3C/p%3E%3Ctextarea%20rows=39%20cols=80%20readonly%20style='font-family:%20Monaco,%20Menlo,%20\%22Ubuntu%20Mono\%22,%20Consolas,%20source-code-pro,%20monospace;%20font-size:%2012px;%20background-color:%20%23ccc;padding:%2010px;'%3E%22+i+%22%3C/textarea%3E%3Cp%3EThis%20file%20includes%20the%20private%20key%20and%20client%20secret,%20%3Cb%3Eplease%20store%20it%20securely%3C/b%3E.%3C/p%3E%3Cp%3E%3Cbutton%20class='btn%20coral-btn%20coral-btn-cta'%20onclick='javascript:window.location.reload();'%3EClose%3C/button%3E%3C/p%3E%3C/div%3E%22})})})}))})()}();">Adobe I/O Integration YAML</a> <-- drag this to your browser's bookmarks bar

Then follow these steps:

1. go to <https://console.adobe.io/integrations>
2. select the right organization from the drop-down
3. click the desired integration
4. click the bookmark in your browser
5. it will ask for the private key that you used to create the integration, paste it in
6. it will show you the file ready to copy and paste and save with a text editor

To enhance the bookmarklet, find the [source here](bookmarklet/get-integration-yaml-bookmarklet.js) and a tool such as <http://bookmarklets.org/maker/> can be used to generate the bookmarklet link.

### Manually create YAML

Alternatively, you can manually create the file, as per the example below. Include the technical account info from the integration, the private key you created for this integration, and the `consumerId` and `applicationId` taken from the console.adobe.io URL: `https://console.adobe.io/integrations/{consumerId}/{applicationId}/overview`.

YAML template:

```
consumerId:    123456
applicationId: 99999

technicalAccount:
  id:           053530dxxxxxxxxxxxxxxxxx@techacct.adobe.com
  org:          6EEF747xxxxxxxxxxxxxxxxx@AdobeOrg
  clientId:     1401f9dxxxxxxxxxxxxxxxxxxxxxxxxx
  clientSecret: d34081fc-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  privateKey: |
    -----BEGIN PRIVATE KEY-----
    abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl
    mnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx
    ....
    -----END PRIVATE KEY-----
```

