/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите ID счетчика, информацию по которому вы хотите посмотреть');
	checkEmpty(/^\d+$/.test(prefs.login), 'ID счетчика должен состоять только из цифр!');
	var baseurl = 'https://metrika.yandex.ru/';
	
	
	var now = new Date();
	var dateTo = getFormattedDate({format: 'YYYY-MM-DD', offsetDay: 0}, now);
	var dateFrom = getFormattedDate({format: 'YYYY-MM-DD', offsetDay: 2}, now);
	var counter_url = baseurl + "stat/traffic?group=day&period=" + dateFrom + "%3A" + dateTo + "&id=" + prefs.login;

	AnyBalance.setDefaultCharset('utf-8');
	var html = '';
	if (!prefs.debug)
		html = AnyBalance.requestGet(counter_url, g_headers);

	if (prefs.debug || /<form[^>]+name="MainLogin"|К сожалению, у вас нет прав доступа к этому объекту|Авторизация|войдите под своим именем/i.test(html)) {
		AnyBalance.trace('Требуется залогиниться... ');
		//Не залогинены в яндекс... Надо залогиниться
		checkEmpty(prefs.yalogin && prefs.password, 'Для просмотра информации по счетчику Яндекс требует авторизации. Введите в настройки логин и пароль.');
		html = loginYandex(prefs.yalogin, prefs.password, html, counter_url, 'metrika');
	}

	var meta = getParam(html, null, null, /<body[^>]*data-bem="([^"]*)/i, replaceHtmlEntities, getJson);
	if(!meta){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить метаинформацию по счетчику. Сайт изменен?');
	}

	var result = {
		success: true
	};
	getParam(getElement(html, /<span[^>]+counter-toolbar__caption[^>]*>/i), result, '__tariff', null, replaceTagsAndSpaces);

	var key = meta['i-global'].jsParams['i-api-request'].skv2;
	var data = [{"ids":prefs.login,"group":"day","calcHash":true,"sort":{"field":"ym:s:datePeriod<group>","direction":"desc"},"mode":"list","offset":0,"limit":50,"parents":null,"metrics":["ym:s:visits","ym:s:users","ym:s:pageviews","ym:s:percentNewVisitors","ym:s:bounceRate","ym:s:pageDepth","ym:s:avgVisitDurationSeconds"],"dimensions":["ym:s:datePeriod<group>"],"segments":[{"period":{"from":dateFrom,"to":dateTo},"filter":"ym:s:datePeriod<group>!n and ym:s:datePeriod<group>!n"}],"accuracy":"medium"}];

	html = AnyBalance.requestPost(baseurl + 'i-proxy/i-data-api-comparable/getData?lang=ru', {
		args: JSON.stringify(data),
		key: key,
		lang: 'ru'
	},
	addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: counter_url,
		'Content-Type': 'application/json'
	}));

	var json = getJson(html);
	if(!json.result){
		var error;
		if(json.error)
			error = json.error.args[1].errors[0].message;
		if(error)
			throw new AnyBalance.Error('Ошибка запроса информации: ' + error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неизвестная ошибка запроса информации. Сайт изменен?');
	}

	if(json.result.data[0]){
		var it = json.result.data[0];
		AnyBalance.trace('Сегодняшняя дата: ' + it.dimensions[0].name);
		getParam(it.metrics[2], result, 'views_today');
		getParam(it.metrics[0], result, 'visits_today');
		getParam(it.metrics[1], result, 'visitors_today');
	} else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Данные не найдены. Возможно, следует накопить данные в течение пары дней.');
	}
	
	if (json.result.data[1]) {
		var it = json.result.data[1];
		AnyBalance.trace('Вчерашняя дата: ' + it.dimensions[0].name);
		getParam(it.metrics[2], result, 'views_yesterday');
		getParam(it.metrics[0], result, 'visits_yesterday');
		getParam(it.metrics[1], result, 'visitors_yesterday');
	}

	AnyBalance.setResult(result);
}