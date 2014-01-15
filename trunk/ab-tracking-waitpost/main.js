/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://waitpost.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер отправления!');
	
	var html = AnyBalance.requestGet(baseurl + '?track=&btnNewTrack=%D0%94%D0%BE%D0%B1%D0%B0%D0%B2%D0%B8%D1%82%D1%8C%2F%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%B8%D1%82%D1%8C+%D1%82%D1%80%D0%B5%D0%BA-%D0%BD%D0%BE%D0%BC%D0%B5%D1%80', g_headers);
	
	html = requestPostMultipart(baseurl, {
		"id":0,
		"track":prefs.login,
		"btnTrack":'Добавить/проверить'
	}, addHeaders({Referer: baseurl}));
	
	if (!/Трек-номер[^<]*Смотрите информацию ниже/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(html));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Трек-номер(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'from', /Страна, откуда отправлена посылка(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'to', /Страна, куда\s+отправлена посылка(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'type', /Способ доставки(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'days', /В\s+пути, дней(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	var data = sumParam(html, null, null, /(?:<[^<]*){3}\d{1,2}-\d{2}-\d{4}/ig);
	var text = '';
	if(data && data.length > 0) {
		for(var i = 0; i < data.length; i++) {
			var current = data[i];
			var value = getParam(current, null, null, /(?:[^>]*>)([^<]+)/i, replaceTagsAndSpaces);
			var date = getParam(current, null, null, /(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces);
			
			if((isset(date) && date.length > 0) && (isset(value) && value.length > 0)) {
				text += '<b>' + date + '</b>: ' + value + '</br>';
			}
		}
		if(text && text.length > 0) {
			getParam(text, result, 'all');
		}
	} else {
		AnyBalance.trace('Не найдено информации.');
	}
	
	AnyBalance.setResult(result);
}