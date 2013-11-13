/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://service.nalog.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://service.nalog.ru/';
	var html = AnyBalance.requestGet(baseurl + 'debt/req.do?');
	var session = getParam(html, null, null, /name="PHPSESSID"[^>]*value="([^"]*)/i);
	
	var captchaa;
	if (AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setDefaultCharset('base64');
		var captcha = AnyBalance.requestGet(baseurl + 'debt/req.do?captcha=1');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7+, пожалуйста, обновите AnyBalance!');
	}
	AnyBalance.setDefaultCharset('utf-8');
	
	html = AnyBalance.requestPost(baseurl + 'debt/req.do?', {
		cmd: 'find',
		inn: prefs.inn,
		fam: prefs.surname,
		nam: prefs.fio_name,
		otch: prefs.otchestvo,
		cap: captchaa
	}, addHeaders({Referer: baseurl + 'debt/req.do'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, /div[^>]*"field-error"(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось получить информацию. Сайт изменен?');
	}
	var result = {
		success: true,
		balance: 0,
		all: ''
	};
	var errString = 'Не найдена информация по задолженности с данными: ИНН: ' + prefs.inn + ', ФИО: ' + prefs.surname + ' ' + prefs.fio_name + ' ' + prefs.otchestvo + '. Пожалуйста, проверьте правильность ввода. ';
	// Если не получили на странице инфу, пойдем глубже и запросим прямо в базу
	var token = getParam(html, null, null, /name="token"[^>]*value="([^"]*)/i);
	
	var RetryCounts = 30, json;
	while(!json && RetryCounts > 0) {
		AnyBalance.trace('Не нашли информацию, попробуем еще раз, осталось попыток: ' + RetryCounts--);
		
		var xhtml = AnyBalance.requestPost(baseurl + 'debt/debt-find.do', {
			t: new Date().getTime(),
			'token':token,
		}, addHeaders({
			Referer: baseurl + 'debt/req.do',
			'X-Requested-With':'XMLHttpRequest'
		}));
		//if(xhtml || xhtml != 'null')
		json = getJson(xhtml);
	}
	
	if (!json || json.STATUS == 'ERROR' ) {
		var error = getParam(html, null, null, [/<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, /div[^>]*"field-error"(?:[^>]*>){2}([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		//AnyBalance.trace(html);
		throw new AnyBalance.Error(errString);
	}
	if (!json || !json.regions) 
		throw new AnyBalance.Error(errString);
	for (i = 0; i < json.regions.length; i++) {
		var curr = json.regions[i];
		if(!curr.pds) {
			AnyBalance.trace('По региону ' +curr.name + ' информация времено не доступна, скоро все заработает снова.');
		} else {
			for (j = 0; j < curr.pds.length; j++) {
				var sum = (curr.pds ? curr.pds[j].sum : '');
				if (curr.message == 'По вашему запросу информация не найдена') {
					result.all = errString;
				} else {
					result.all += '<b>' + curr.code + ' ' + curr.name + '</b><br/>' + (sum ? curr.pds[j].ifnsName + ': ' + curr.pds[j].taxName + '-' + curr.pds[j].taxKind + ': <b>' + sum + '</b>' : (curr.message ? curr.message : 'Нет задолженности')) + (i < json.regions.length-1 ? '<br/><br/>' : '');
					sumParam(sum, result, 'balance', /([\s\S]*)/i, null, parseBalance, aggregate_sum);
				}
			}
		}
	}
	AnyBalance.setResult(result);
}