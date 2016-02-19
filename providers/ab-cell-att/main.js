/**
Provider AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'application/json, text/plain, */*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.93 Safari/537.36',
    'Origin': 'https://m.att.com',
};

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://m.att.com/';

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
    checkEmpty(prefs.password, 'Введите проверочный код!');

    var html = AnyBalance.requestGet(baseurl + 'myatt/', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = {
        useridVisible: prefs.login,
        userid: prefs.login,
        password: prefs.password,
        persist: 'y',
        logoutcookiename:''
    };

    html = AnyBalance.requestPost(baseurl + 'myatt/TGProxy', JSON.stringify(params), addHeaders({Referer: baseurl + 'myatt/'}));
	
    if(!/isAuthenticated=true/i.test(html)) {
        var error = getParam(html, null, null, /response_code=([^&#\s]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if (error == 'E.01.03.050') {
            throw new AnyBalance.Error('That User ID and password combination does not match our files.', false, true);
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Unable to access personal account. Site has been changed?');
    }
	
    params = {
        "CommonData":{"AppName":"MYATT"},
        "PrefetchAccountInfo":"true",
        "UserId":prefs.login
    };
	
    html = AnyBalance.requestPost(baseurl + 'best/resources/auth/login/accountdetails/invoke', JSON.stringify(params), addHeaders({
        Referer: baseurl + 'myatt/',
        'X-Requested-By': 'MYATT',
        'UserId': prefs.login,
        'Cache-Control': 'no-cache=set-cookie',
        'Pragma': 'no-cache',
        'Content-Type':'application/json',
        'Expires': '-1',
    }));
    
    
    
    var json = AB.getJson(html);
    
    var uid = json.WirelessAccountDetails.AccountNumber; 
    
    params = {
        "CommonData":{
            "AppName":"MYATT"
        },
        "ResourceRequestDetails":[
            {
                "URI":"unauth/login/passcode/validate",
                "Async":false,
                "SequenceNumber":1,
                "ResourceInput":{
                    "CommonData":{
                        "AppName":"MYATT",
                        "WirelessAccountData":[{
                            "AccountNumber":uid
                        }]
                    },
                    "WirelessPasscode":[{
                        "AccountNumber":uid,
                        "Passcode": prefs.code
                    }]
                }
            }, 
            {
                "URI":"auth/login/accountdetails/invoke",
                "Async":false,
                "SequenceNumber":"2",
                "ResourceInput":{
                    "CommonData":{"AppName":"MYATT"},
                    "PrefetchAccountInfo":"true",
                    "UserId":prefs.login
                }
            }
        ]
    };
    
    html = AnyBalance.requestPost(baseurl + 'best/resources/unauth/common/concurrent/resource/invoke', JSON.stringify(params), addHeaders({
        Referer: baseurl + 'myatt/',
        'X-Requested-By': 'MYATT',
        'Cache-Control': 'no-cache=set-cookie',
        'Content-Type':'application/json',
        'Pragma': 'no-cache',
        'Expires': '-1',
    }));
    //*/
    
    var jsonVPC = AB.getJson(html);
    
    if (jsonVPC.ValidateAccountPasscodeResponse.Result.Status == 'FAILURE') {
        if (jsonVPC.ValidateAccountPasscodeResponse.Result.Code == 'F0001') {
            throw new AnyBalance.Error('The passcode should be the same code you use to access account information.', false, true);
        }
        AnyBalance.trace(JSON.stringify(jsonVPC.ValidateAccountPasscodeResponse.Result));
        throw new AnyBalance.Error('Unable to access personal account. Site has been changed?');
    }
    
    var uidSubs = jsonVPC.AccountDetailsResponse.WirelessAccountDetails[0].WirelessSubscriberDetails[0].SubscriberNumber;
        
    params = {
      "CommonData": {
        "AppName": "MYATT"
      },
      "ResourceRequestDetails": [
        {
          "URI": "auth/usage/unbilled/data/summary",
          "Async": false,
          "SequenceNumber": 0,
          "ResourceInput": {
            "CommonData": {
              "AppName": "MYATT",
              "WirelessAccountData": [
                {
                  "WirelessSubscriberData": [
                    {
                      "SubscriberNumber": uidSubs
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          "URI": "auth/usage/unbilled/voice/summary",
          "Async": false,
          "SequenceNumber": 0,
          "ResourceInput": {
            "CommonData": {
              "AppName": "MYATT",
              "WirelessAccountData": [
                {
                  "WirelessSubscriberData": [
                    {
                      "SubscriberNumber": uidSubs
                    }
                  ]
                }
              ]
            }
          }
        }
      ]
    };
    
    html = AnyBalance.requestPost(baseurl + 'best/resources/unauth/common/concurrent/resource/invoke', JSON.stringify(params), addHeaders({
        Referer: baseurl + 'myatt/',
        'X-Requested-By': 'MYATT',
        'Cache-Control': 'no-cache=set-cookie',
        'Pragma': 'no-cache',
        'Content-Type':'application/json',
        'Expires': '-1',
    }));
        
    var jsonData = AB.getJson(html);
    

    var result = {success: true};
    
    getParam(prefs.login, result, 'user');
    
    var gdu = jsonData.UnbilledDataSummaryResponse && jsonData.UnbilledDataSummaryResponse.GroupDataUsage;
    
    if (gdu && gdu.WebUsage) {
        var webUsage = 0;
        var allWU = 0;
        var isUnlim = false;
        for (var i = 0; i < gdu.WebUsage.length; ++i) {
            webUsage += AB.parseTraffic((gdu.WebUsage[i].Used || 0) + ' ' + gdu.WebUsage[i].Uom);
            allWU += AB.parseTraffic((gdu.WebUsage[i].Alloted || 0) + ' ' + gdu.WebUsage[i].Uom);
            isUnlim = isUnlim || (gdu.WebUsage[i].isUnlimited == 'true');
        }
        getParam(webUsage, result, 'wltrafficused');
        getParam(isUnlim ? void(0) : allWU, result, 'wltrafficall');
    }
    
    if (gdu && gdu.TextUsage) {
        var textUsage = 0;
        for (var i = 0; i < gdu.TextUsage.length; ++i) {
            textUsage += gdu.TextUsage[i].Used || 0;
        }
        getParam(textUsage, result, 'wltext');
    }
    
    getParam(jsonData.UnbilledDataSummaryResponse.NextBillCycleDate, result, 'wlnextdate', null, null, AB.parseDateISO);
    
    if (json.WirelessAccountDetails) {
        getParam(json.WirelessAccountDetails.AccountStatus, result, 'wlstatus');
    }
    
    if (json.UverseAccountDetails) {
        getParam(json.UverseAccountDetails.BillingDetails.BillingEndtDate, result, 'uverseenddate', null, null, AB.parseDateISO);
        getParam(json.UverseAccountDetails.AccountStatus, result, 'uversestatus');
    }
	
    // getParam(findTagWithClass(html,'div','plan-name'), result, 'planName', /^.*$/, replaceTagsAndSpaces, html_entity_decode);
    // getParam(findTagWithClass(html,'p','sup'), result, 'balance', /^.*$/, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'expires', /Expires on (\S+\s+\d+)/, replaceTagsAndSpaces, parseDate);
    // getParam(html, result, 'minPerMonth', /<strong>\d+ of (\d+) minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'minAvailable', /<strong>(\d+) of \d+ minutes<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'till', /Plan\s+Renews\s+On\s+<p[^>]*>\s*(\S+\s\d+)\D.{30}/, replaceTagsAndSpaces, parseDate);

    // getParam(html, result, 'smsPerMonth', /<strong>\d+ of (\d+) messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'smsAvailable', /<strong>(\d+) of \d+ messages<\/strong>/i, replaceTagsAndSpaces, parseBalance);
    // getParam(html, result, 'trafficPerMonth', /<strong>[.\d]+ MB\s+of\s+([.\d]+ MB)\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'trafficAvaliable', /<strong>([.\d]+ MB)\s+of\s+[.\d]+ MB\s*<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    // getParam(html, result, 'status', /Plan Status\s*:[\s\S]*?<var[^>]*>([\s\S]*?)<\/var>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
