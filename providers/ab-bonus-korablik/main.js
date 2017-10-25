var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.korablik.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
        login: prefs.login,
        pwd: prefs.password,
		'remember': '0',
		'act': 'enter',
    }, addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'auth/login'
	}));
	
	var json = getJson(html);
	
	if (!json.status) {
		var error = json.errors.login;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверные логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'detskaya/mycards', addHeaders({Referer: baseurl + 'detskaya/profile'}));
	var cards = sumParam(html, null, null, /b[^>]*>№\s\d{1,16}\s*(?:[^>]*>){2,6}/ig);
//	var cards = sumParam(html, null, null, /"my_card_numb"[^>]*>\s*\d+(?:[^>]*>){9,13}[^>]*"my_card_ballans"(?:[^>]*>){2,4}/ig);
	if(!cards || cards.length < 1) {
		throw new AnyBalance.Error('Не удалось найти ни одной карты. Сайт изменен?');
	}
	
	for(var i = 0; i < cards.length; i++) {
		getParam(cards[i], result, (i > 0) ? 'cardnum' + i : 'cardnum', /b[^>]*>№.([^<]+)/i, replaceTagsAndSpaces);
		getParam(cards[i], result, (i > 0) ? 'cardbalance' + i : 'cardbalance', /<div[^>]*>Баланс: ([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	//getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}