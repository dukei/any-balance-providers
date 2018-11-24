/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	
    var baseurl = 'https://issaold.beltelecom.by/';
	
    var required_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-ru,ru;q=0.8,en-us;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
    };
	
	var html = AnyBalance.requestGet(baseurl + "main.html", required_headers);
	
	var captchaa;
	/*if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ '/ps/scc/php/cryptographp.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}*/	
	
    html = AnyBalance.requestPost(baseurl + "main.html", {
		'redirect':'/main.html',
		'oper_user':prefs.login,
		'passwd':prefs.password,
		'cap_field':captchaa
    }, required_headers);
	
	if (!/\/logout/i.test(html)) {
		var error = sumParam(html, null, null, /id="error"[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	

	var forcedChoice = /choice/i.test(AnyBalance.getLastUrl());
	
	// Указан номер - надо переключиться
	if(prefs.number || forcedChoice) {
		var login = forcedChoice ? 'надо выбрать' : getParam(html, null, null, /Логин[^<]+?(\d{6,})/i);
		AnyBalance.trace('Залогинены на номер: ' + login);
		
		if((prefs.number && !endsWith(login, prefs.number)) || forcedChoice) {
			var post = getParam(html, null, null, new RegExp('SendPost\\(\'(\\?pril_sel=\\d*' + (prefs.number || prefs.login) + '[^)\']+)', 'i'));
			if(!post){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не найден логин с последними цифрами ' + (prefs.number || prefs.login));
			}
			
			html = AnyBalance.requestPost(baseurl + "choice.html", {
				'pril_sel':getParam(post, null, null, /pril_sel=([^&]+)/i),
				'live':getParam(post, null, null, /live=([^&]+)/i),
				'chpril':getParam(post, null, null, /chpril=([^&]+)/i),
			}, required_headers);
			
			AnyBalance.trace('Переключились на номер с последними цифрами: ' + (prefs.number || prefs.login));
		} else {
			AnyBalance.trace('Уже залогинены на правильный номер: ' + login);
		}
	}
	
    var result = {success: true};
	
	getParam(html, result, 'username', />\s*ФИО\s*\/\s*Компания[^:]*:([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'agreement', />\s*Договор([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /coins\.png">(?:&nbsp;|\s*)?[^<]+баланс([\s\S]*?)р/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план на услуги[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}