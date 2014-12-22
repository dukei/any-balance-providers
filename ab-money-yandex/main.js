/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин в Яндекс.Деньги!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему Яндекс.Деньги. Не платежный пароль, а именно пароль для входа!');

	var baseurl = 'https://money.yandex.ru/';
	
	var html = AnyBalance.requestGet("https://passport.yandex.ru", g_headers);
	if (!prefs.__dbg) {
		try {
			html = loginYandex(prefs.login, prefs.password, html, baseurl + 'index.xml', 'money');
		} catch(e) {
			// Нужно для отладчика
			AnyBalance.trace('Error in loginYandex ' + e.message);
			html = AnyBalance.requestGet(baseurl, g_headers);
		}
	}
	if (!/current\-user\-balance\-link/i.test(html))
		throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");
	
	var result = {success: true};

	getParam(html, result, 'number', /"b-account__number__text"[^>]*>(.*?)</i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /"b-account__number__text"[^>]*>(.*?)</i, replaceTagsAndSpaces);

	if(/data-is-sum-visible\s*=\s*"false"/i.test(html)){
	    AnyBalance.trace('Сумма спрятана. Будем пытаться найти...');
		var sk = getParam(html, null, null, /data-account-secret-key\s*=\s*"([^"]*)/i, replaceTagsAndSpaces);
		if(!sk){
			AnyBalance.trace(html);
			throw new AnyBalanceError('Не удаётся найти ключ для получения баланса! Сайт изменен?');
		}
		var text = AnyBalance.requestGet(baseurl + "/internal/index-ajax.xml?action=updateSumVisibility&sk=" + sk + "&showSum=1", addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		var json = getJson(text);
	    getParam('' + json.sum, result, 'balance', null, null, parseBalanceRK);
	}else{
	    getParam(html, result, 'balance', /<div[^>]*id="current-user-balance-container"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalanceRK);
	}

	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /([\s\S]*)руб/i, replaceTagsAndSpaces, parseBalance);
    var kop = getParam(text, null, null, /((?:[\s\S](?!руб))*)коп/i, [/руб\.?/i, '', replaceTagsAndSpaces], parseBalance);
    var val;
    if(isset(rub) || isset(kop)){
    	val = (rub || 0) + (kop || 0)/100;
    }
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function loginYandex(login, password, html, retpath, from) {
	function getIdKey(html) {
		return getParam(html, null, null, /<input[^>]*name="idkey"[^>]*value="([^"]*)/i);
	}
	var baseurl = "https://passport.yandex.ru/passport?mode=auth";
	if (from) baseurl += '&from=' + encodeURIComponent(from);
	if (retpath) baseurl += '&retpath=' + encodeURIComponent(retpath);
	if (!html) html = AnyBalance.requestGet(baseurl, g_headers);
	var idKey = getIdKey(html);
	// Если нет этого параметра, то это другой тип кабинета
	if (idKey) {
		var html = AnyBalance.requestPost(baseurl, {
			from: from || 'passport',
			retpath: retpath,
			idkey: idKey,
			display: 'page',
			login: login,
			passwd: password,
			timestamp: new Date().getTime()
		}, g_headers);
	} else {
		var html = AnyBalance.requestPost(baseurl, {
			//from:from || 'passport',
			retpath: retpath,
			login: login,
			passwd: password,
		}, addHeaders({
			Referer: baseurl
		}));
	}
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/b\-login\-error[^>]*>([\s\S]*?)<\/strong>/i, /error-msg[^>]*>([^<]+)/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Учётной записи с таким логином не существует|Неправильная пара логин-пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет Яндекса. Сайт изменен?');
	}
	if (/Установить постоянную авторизацию на(?:\s|&nbsp;)+данном компьютере\?/i.test(html)) {
		//Яндекс задаёт дурацкие вопросы.
		AnyBalance.trace("Яндекс спрашивает, нужно ли запоминать этот компьютер. Отвечаем, что нет... (idkey=" + getIdKey(html) + ")");
		html = AnyBalance.requestPost(baseurl, {
			filled: 'yes',
			timestamp: new Date().getTime(),
			idkey: getIdKey(html),
			no: 1
		}, g_headers);
	}
	return html;
}