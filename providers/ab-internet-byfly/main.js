/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36',
	Origin: 'https://my.beltelecom.by',
	Referer: 'https://my.beltelecom.by/check-balance',
	'Accept-Language': 'en-GB,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
};

function encodeInt(e) {
    var t = "", r = 64;
    var a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("")
    do {
        t = a[e % r] + t,
        e = Math.floor(e / r)
    } while (e > 0);
    return t;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestPost('https://myapi.beltelecom.by/api/v1/contracts/check/balance', JSON.stringify({
  		"login": prefs.login,
  		"password": prefs.password,
	}), addHeaders({
		Accept: 'application/json',
		'content-type': 'application/json',
		hl: 'ru',
		'X-Client': 'web',
	}));

	var json = getJson(html);
	if(!json.channel){
		var error = '';
		for(var n in json){
			error += n + ': ' + json[n].join('\n') + '\n';
		}
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти, сайт изменен?');
	}

	AnyBalance.trace('Channel id: ' + json.channel);

	html = AnyBalance.requestGet('https://myws.beltelecom.by/socket.io/?EIO=3&transport=polling&t=' + encodeInt(+new Date()), addHeaders({
	    Accept: '*/*',
	}));

	var sess = getJsonObject(html);
	AnyBalance.trace('sid: ' + sess.sid);

	html = AnyBalance.requestPost('https://myws.beltelecom.by/socket.io/?EIO=3&transport=polling&sid=' + sess.sid + '&t=' + encodeInt(+new Date()),
		'150:42' + JSON.stringify(
			["subscribe",{"channel":json.channel,"auth":{"headers":{"Authorization":"Bearer undefined"}}}]
		),
		addHeaders({
	    	Accept: '*/*',
	    	'Content-type': 'text/plain;charset=UTF-8'
		}));

	if(html !== 'ok'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка подписки на баланс. Сайт изменен?');
	}

	json = [];
	for(var i=0; i<20; ++i){
		html = AnyBalance.requestGet('https://myws.beltelecom.by/socket.io/?EIO=3&transport=polling&sid=' + sess.sid + '&t=' + encodeInt(+new Date()),
			addHeaders({
	    		Accept: '*/*',
			}));

	    AnyBalance.trace('Попытка ' + (i+1) + '/20: ' + html);
		
		json = getJsonObject(html);
		if(json && json[2])
			break;
	}

	if(!json[2]){
		throw AnyBalance.Error('Не удалось получить баланс. Сайт изменен?');
	}

	if(json[2].status !== 'success'){
		var error = json[2].message;
		throw AnyBalance.Error(error, null, /парол/i.test(error));
	}

	var result = {success: true};
    
    getParam(json[2].balance, result, 'balance');
    getParam(json[2].tariff, result, '__tariff');
    getParam(json[2].message, result, 'agreement');
    AnyBalance.setResult(result);
}