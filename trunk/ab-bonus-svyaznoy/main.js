/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main () {
	var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://sclub.ru/';
	
    checkEmpty(prefs.login, 'Введите № карты!');
    checkEmailOrCardNum(prefs.login, 'Некорректный email или номер карты');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
    
	var res = AnyBalance.requestPost(baseurl + 'oauth/token', {
		grant_type: 'password',
		username: prefs.login,
		password: prefs.password,
		client_id: '1',
		captcha: 'null'
	}, addHeaders({
		Referer: baseurl
	}));

	var json = getJson(res);

	if(!json || json.error || !json.access_token){
		if(json.error_description)
			throw new AnyBalance.Error (json.error_description, null, /Неверные данные для авторизации/.test(json.error_description));
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var token = json.access_token;

	res = AnyBalance.requestGet(baseurl + 'api/profile', addHeaders({
		Referer: baseurl,
		Authorization: 'Bearer ' + token
	}));

	json = getJson(res);

    var result = {success: true};
    var card = json.cards[0];
	
	getParam(json.firstName + '', result, 'customer', null, replaceTagsAndSpaces);
	getParam(json.pluses + '', result, 'balanceinpoints', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.balance + '', result, 'balanceinrubles', null, replaceTagsAndSpaces, function(str){ var bal = parseBalance(str); return bal && bal/100;}); //Почему-то в копейках приходит
	getParam(json.unreadMessagesCount + '', result, 'messages', null, replaceTagsAndSpaces, parseBalance);
	getParam(card ? card.ean : undefined, result, 'cardnumber');
	getParam(card && +card.cardStatus == 1 ? 'активная' : undefined, result, 'cardstate');
	
    if (isAvailable(['pointsinlastoper', 'lastoperationplace', 'lastoperationdate'])) {
		res = AnyBalance.requestGet(baseurl + 'api/cards/current/operations?orderByDateAsc=false&skip=0&take=10&type=', addHeaders({
			Referer: baseurl,
			Authorization: 'Bearer ' + token
		}));
		
		json = getJson(res);
		
		if(json.operations && json.operations.length) {
			var lastOperation = json.operations[0];
			
			getParam(lastOperation.amount + '', result, 'pointsinlastoper', null, replaceTagsAndSpaces, parseBalance);
			getParam(lastOperation.partnerName + '', result, 'lastoperationplace', null, replaceTagsAndSpaces);
			getParam(lastOperation.operationDate + '', result, 'lastoperationdate', null, replaceTagsAndSpaces, parseDate);
		}
    }
	
    AnyBalance.setResult(result);
}

function checkEmailOrCardNum(n, msg){
	if(/^[a-zA-Z0-9]+[a-zA-Z0-9_.-]*[a-zA-Z0-9_-]*@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+[a-zA-Z]+$/.test(n))
		return true;
    if(n && 13 == n.length){
        var a = /298[0-9]{10}/.test(n);
        if(a){
            for (var o, l = n.toString(), c = 0, u = 0, d = 0, f = 1; d < l.length - 1; d += 2, f += 2){
                var p = Number(l.substr(d, 1));
                if(c += p, 13 > f){
                    var h = Number(l.substr(f, 1));
                    u += h;
                }
            }
            if(u = 3 * u, o = c + u, o = (o + Number(l.substr(12, 1))) % 10, 0 === o)
            	return true;
        }
    }
    throw new AnyBalance.Error(msg);
}