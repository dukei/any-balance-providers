﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences(),
		baseurl = 'https://strelkacard.ru/',
		lkurl = 'https://lk.strelkacard.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(!/\s+/.test(prefs.login), 'Логин не должен содержать пробелов!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(lkurl, g_headers);
	var error = getParam(html, null, null, /<div[^>]+class="panel-body"[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error('ЛК Стрелки не работает: ' + error + ' Для получения информации по карте можно воспользоваться провайдером "Стрелка (по номеру)".');

	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if(/^\d{10}$/.test(prefs.login))
		prefs.login = '7' + prefs.login;
	
	// Логинимся
	var json = makeRequest('Post', baseurl + 'api/users/login/', {
		username: prefs.login,
		password: prefs.password
	}, baseurl);

	if(json.username)
		throw new AnyBalance.Error(json.username + '', null, true);

	// Получаем данные по всем картам
	var data = makeRequest('Get', lkurl + 'api/cards/', null, lkurl + '/cards');

	if(!data || (isArray(data) && data.length === 0))
		throw new AnyBalance.Error('Не найдено ни одной карты');

	//Ищем заданную пользователем карту или берем первую
	var card, filtered = [];
	if(prefs.num){
		for(var i = 0, toi = data.length; i < toi; i++){
			if(new RegExp(prefs.num + '$').test(data[i].cardnum))
				filtered.push(data[i]);
		}
		if(filtered.length > 1)
			throw new AnyBalance.Error('Найдено больше одной карты с последними цифрами ' + prefs.num);
		else if(filtered.length === 0)
			throw new AnyBalance.Error('Не найдено ни одной карты с последними цифрами ' + prefs.num);
		else
			card = filtered[0];
	} else {
		card = data[0];
	}
	AnyBalance.trace('Найдена карта:' + JSON.stringify(card));

	if(!card.status)
		throw new AnyBalance.Error('Не удалось получить баланс карты, попробуйте позже!');

	var result = {success: true};
	
	getParam(card.status.balance/100, result, 'balance');
	getParam(card.cardalias, result, 'alias', /[\s\S]{2,}/, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('discount_till', 'discount_count', 'discount_next_count', 'discount_rate')){
		data = makeRequest('Get', lkurl + 'api/cards/status/?cardid=' + card.cardid, null, lkurl + '/cards');
		getParam(data.discountenddate, result, 'discount_till', null, null, parseDateISO);
		getParam(data.discountcount, result, 'discount_count');
		getParam(data.discountnextcount, result, 'discount_next_count');
		getParam((data.baserate - (data.discountsum || 0))/100, result, 'discount_rate');
	}
	
	if(isAvailable(['history', 'total_outcome', 'total_income'])) {
		var count = 5, history = [], item, i, date, summ;
		
		data = makeRequest('Get', lkurl + 'api/cards/' + card.cardid + '/history/all/' + getFormattedDate({offsetMonth: 1}) + '/' + getFormattedDate() + '/', null, lkurl + '/cards');
		if(data.items){
			for(i=0; i<data.items.length && i<count; ++i){
				item = data.items[i];
				date = getFormattedDate1(item.date);
				summ = '<b>' + (item.row_type === 1 ? '-' : '+') + (item.sum / 100) + ' руб.</b>';
				history.push([summ, date, item.title].join(' '));
			}
			
			getParam(history.join('<br />'), result, 'history');
		}

		if(data.total){
			getParam(data.total.outcome/100, result, 'total_outcome');
			getParam(data.total.income/100, result, 'total_income');
		}
	}
	
	AnyBalance.setResult(result);
}

function makeRequest(type, url, data, referer){
	var res = AnyBalance.requestPost(url, data ? JSON.stringify(data) : '',
		addHeaders({
			'X-CSRFToken': AnyBalance.getCookie('csrftoken'),
			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type': 'application/json;charset=UTF-8',
			'Referer': referer
		}), {HTTP_METHOD: type});

	var json = getJson(res);

	if(json.__all__){
		AnyBalance.trace(JSON.stringify(json));
		var message = json.__all__.join(', ');
		throw new AnyBalance.Error(message, null, /Учетная запись не зарегистрирована/i.test(message));
	}

	return json;
}

function getFormattedDate1(sdate){
	var data = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/i.exec(sdate);
	return [data[4], data[5]].join(':') + ' ' + [data[3], data[2], data[1]].join('-');
}