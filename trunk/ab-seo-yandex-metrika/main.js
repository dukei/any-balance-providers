﻿/**
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
	var baseurl = 'https://old.metrika.yandex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	var html = '';
	if (!prefs.debug) html = AnyBalance.requestGet(baseurl + 'stat/?counter_id=' + prefs.login, g_headers);
	if (prefs.debug || /<form[^>]+name="MainLogin"|К сожалению, у вас нет прав доступа к этому объекту|Авторизация|войдите под своим именем/i.test(html)) {
		AnyBalance.trace('Требуется залогиниться... ');
		//Не залогинены в яндекс... Надо залогиниться
		checkEmpty(prefs.yalogin && prefs.password, 'Для просмотра информации по счетчику Яндекс требует авторизации. Введите в настройки логин и пароль.');
		html = loginYandex(prefs.yalogin, prefs.password, html, baseurl + 'stat/?counter_id=' + prefs.login, 'metrika');
	}
	var repl = getParam(html, null, null, /http-equiv="refresh"[^>]+content="[^"]*url=([^"]*)/i, null, html_entity_decode);
	if (repl) {
		AnyBalance.trace('Переадресация на ' + repl);
		html = AnyBalance.requestGet(repl, g_headers);
	}
	var title = getParam(html, null, null, /<h1 class="b-page-title__title">([\s\S]*?)<a title/i, replaceTagsAndSpaces, html_entity_decode);
	if (!title) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по счетчику. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'api/stat/traffic.json?offset=1&group=day&reverse=0&id=' + prefs.login + '&table_mode=tree&mticket=', g_headers);
	var json = getJson(html);
	var len = json.data ? json.data.length : 0,
		today, yesterday;
	if (len > 0) today = json.data[len - 1];
	if (len > 1) yesterday = json.data[len - 2];
	var result = {
		success: true
	};
	getParam(title, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	if (today) {
		AnyBalance.trace('Сегодняшняя дата: ' + today.date);
		getParam('' + today.page_views, result, 'views_today', null, null, parseBalance);
		getParam('' + today.visits, result, 'visits_today', null, null, parseBalance);
		getParam('' + today.visitors, result, 'visitors_today', null, null, parseBalance);
	} else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Данные не найдены. Возможно, следует накопить данные в течение пары дней.');
	}
	if (yesterday) {
		AnyBalance.trace('Вчерашняя дата: ' + yesterday.date);
		getParam('' + yesterday.page_views, result, 'views_yesterday', null, null, parseBalance);
		getParam('' + yesterday.visits, result, 'visits_yesterday', null, null, parseBalance);
		getParam('' + yesterday.visitors, result, 'visitors_yesterday', null, null, parseBalance);
	}
	AnyBalance.setResult(result);
}