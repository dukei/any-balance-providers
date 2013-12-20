/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'Origin': 'https://m.vodafone.com.tr',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://m.vodafone.com.tr/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Telefon numaranızı girin!');
    checkEmpty(prefs.password, 'Şifrenizi girin!');

	var html = AnyBalance.requestGet(baseurl + 'customer/login', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'customer/login', params, addHeaders({Referer: baseurl + 'customer/login'}));	
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}	
	
	var result = { success: true };
	
	getParam(html, result, 'balance', /"unbilledAmt"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Tarifeniz(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Потом завернуть сюда
	if(isAvailable(['sms_local', 'sms', 'data_left', 'minutes','minutes_local'/*,'','','',*/])) {
		var obj = getPackages(baseurl, prefs);
		
		var packageInfo = obj.packageList.packageInfo;
		for (i = 0; i < packageInfo.length; i++) {
			switch (packageInfo[i].trafficType) {
				case "SMS":
					// Sms to vodafone numbers
					if(/Vodafone İçi/i.test(packageInfo[i].trafficDirection)) {
						sumParam(packageInfo[i].credits+'', result, 'sms_local', null, null, parseBalance, aggregate_sum);
					} else {
						sumParam(packageInfo[i].credits+'', result, 'sms', null, null, parseBalance, aggregate_sum);
					}
					break;
				case "DATA":
					sumParam(packageInfo[i].credits+' b', result, 'data_left', null, null, parseTraffic, aggregate_sum);
					break;
				case "VOICE":
					// to all numbers
					if(/Her Yöne/i.test(packageInfo[i].trafficDirection)) {
						sumParam(packageInfo[i].credits+'', result, 'minutes', null, null, parseBalance, aggregate_sum);
					} else {
						sumParam(packageInfo[i].credits+'', result, 'minutes_local', null, null, parseBalance, aggregate_sum);
					}			
					break;
			}
		}
	}
	
    AnyBalance.setResult(result);
}

// Пакеты
function getPackages(baseurl, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'maltgateway/api?method=createSession&msisdn=' + prefs.login + '&password=' + prefs.password + '&isSecure=true', g_headers);

    var obj = getJson(html);
    if (obj.result.result != 'SUCCESS') {
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error(obj.result.resultDesc);
    }

    var mysid = obj.session.sessionId;

    html = AnyBalance.requestPost(baseurl + 'maltgateway/api', {
        'method': 'getPackageList',
        'sid': mysid,
        'isSecure': 'true',
    }, addHeaders({ Referer: 'https://m.vodafone.com.tr/touch/' }));

    obj = getJson(html);
    if (obj.result.result != 'SUCCESS') {
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error(obj.result.resultDesc);
    }
	return obj;
}