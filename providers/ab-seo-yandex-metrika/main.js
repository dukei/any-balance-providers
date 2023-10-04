/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
};

var baseurl = 'https://metrika.yandex.ru/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите ID счетчика, информацию по которому вы хотите посмотреть');
	checkEmpty(/^\d+$/.test(prefs.login), 'ID счетчика должен состоять только из цифр!');
    
	if(!g_savedData)
		g_savedData = new SavedData('metrika', prefs.yalogin);

	g_savedData.restoreCookies();
	
	var now = new Date();
	var dateTo = getFormattedDate({format: 'YYYY-MM-DD', offsetDay: 0}, now);
	var dateFrom = getFormattedDate({format: 'YYYY-MM-DD', offsetDay: 2}, now);
    
	var counter_url = baseurl + "stat/traffic?group=day&period=" + dateFrom + "%3A" + dateTo + "&id=" + prefs.login;

	AnyBalance.setDefaultCharset('utf-8');
	if (!prefs.debug)
		html = AnyBalance.requestGet(counter_url, g_headers);

	if (prefs.debug || !/ownLogin|ownDisplayName/i.test(html) || /<form[^>]+name="MainLogin"|К сожалению, у вас нет прав доступа к этому объекту|Авторизация|войдите под своим именем|Начать пользоваться/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
		var html = '';
		checkEmpty(prefs.yalogin && prefs.password, 'Для просмотра информации по счетчику Яндекс требует авторизации. Введите в настройки логин и пароль');
		html = loginYandex(prefs.yalogin, prefs.password, html, baseurl, 'metrika');
			
		html = AnyBalance.requestGet(baseurl + 'list', g_headers);
			
        if(!/=logout/i.test(html)){
    		AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    	}
		
		html = AnyBalance.requestGet(counter_url, g_headers);
        
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}

	var meta = getParam(html, null, null, /<body[^>]*data-bem='([^']*)/i, replaceHtmlEntities, getJson);
	if(!meta){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить метаинформацию по счетчику. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(getElement(html, /<span[^>]+counter-toolbar__name[^>]*>([\s\S]*?)<\/span>/i), result, '__tariff', null, replaceTagsAndSpaces);
	getParam(getElement(html, /<span[^>]+counter-toolbar__number[^>]*>([\s\S]*?)<\/span>/i), result, 'counter_id', null, replaceTagsAndSpaces);
	getParam(getElement(html, /<a[^>]+counter-toolbar__site[^>]*>([\s\S]*?)<\/a>/i), result, 'site', null, replaceTagsAndSpaces);
    
	var key = meta['i-global'].jsParams['i-api-request'].skv2;
	var data = [{"ids":prefs.login,"group":"day","calcHash":true,"sort":{"field":"ym:s:datePeriod<group>","direction":"desc"},"mode":"list","offset":0,"limit":50,"parents":null,"metrics":["ym:s:visits","ym:s:users","ym:s:pageviews","ym:s:percentNewVisitors","ym:s:bounceRate","ym:s:pageDepth","ym:s:avgVisitDurationSeconds"],"dimensions":["ym:s:datePeriod<group>"],"segments":[{"period":{"from":dateFrom,"to":dateTo},"filter":"ym:s:datePeriod<group>!n and ym:s:datePeriod<group>!n"}],"accuracy":"medium"}];
	var rId = meta['i-global'].jsParams['requestId'];
	
	html = AnyBalance.requestPost(baseurl + 'i-proxy/i-data-api-comparable/getData?lang=ru', {
		args: JSON.stringify(data),
		key: key,
		lang: 'ru'
	},
	addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: counter_url,
		'Content-Type': 'application/json',
		'X-Request-Id': rId
	}));

	var json = getJson(html);
	
	if(!json.result){
		var error;
		if(json.error)
			error = json.error.args && json.error.args[1] && json.error.args[1].errors && json.error.args[1].errors[0] && json.error.args[1].errors[0].message;
		if(error)
			throw new AnyBalance.Error('Ошибка запроса информации: ' + error);
		if(json.error.args && json.error.args[0] && !json.error.args[0].errors){ // Конфликт с данными предыдущей сессии
			AnyBalance.clearData();
		    g_savedData.save();
			throw new AnyBalance.Error('Необходима повторная авторизация', true);
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неизвестная ошибка запроса информации. Сайт изменен?');
	}

	if(json.result.data[0]){
		var it = json.result.data[0];
		AnyBalance.trace('Сегодняшняя дата: ' + it.dimensions[0].name);
		AnyBalance.trace('Сводка за сегодня: ' + JSON.stringify(it));
		getParam(it.metrics[2], result, 'views_today');
		getParam(it.metrics[0], result, 'visits_today');
		getParam(it.metrics[1], result, 'visitors_today');
		getParam(it.metrics[3], result, 'new_visitors_part_today', null, null, parseBalanceRound);
		getParam(it.metrics[4], result, 'refusals_today', null, null, parseBalanceRound);
		getParam(it.metrics[5], result, 'views_deep_today', null, null, parseBalanceRound);
		getParam(it.metrics[6], result, 'time_today', null, null, parseMinutes);
	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Данные не найдены. Возможно, следует накопить данные в течение пары дней');
	}
	
	if (json.result.data[1]) {
		var it = json.result.data[1];
		AnyBalance.trace('Вчерашняя дата: ' + it.dimensions[0].name);
		AnyBalance.trace('Сводка за вчера: ' + JSON.stringify(it));
		getParam(it.metrics[2], result, 'views_yesterday');
		getParam(it.metrics[0], result, 'visits_yesterday');
		getParam(it.metrics[1], result, 'visitors_yesterday');
		getParam(it.metrics[3], result, 'new_visitors_part_yesterday', null, null, parseBalanceRound);
		getParam(it.metrics[4], result, 'refusals_yesterday', null, null, parseBalanceRound);
		getParam(it.metrics[5], result, 'views_deep_yesterday', null, null, parseBalanceRound);
		getParam(it.metrics[6], result, 'time_yesterday', null, null, parseMinutes);
	}

	AnyBalance.setResult(result);
}

function parseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}