/**
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
		baseurl = 'http://strelkacard.ru/',
		lkurl = 'https://lk.strelkacard.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона без +7, 10 цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	// Логинимся
	makeRequest('Post', baseurl + 'api/users/login/', {
		phone: '7' + prefs.login,
		password: prefs.password
	}, baseurl);

	// Получаем данные по всем картам
	var data = makeRequest('Get', lkurl + 'api/cards/', null, lkurl + '/cards');

	if(!data || (isArray(data) && data.length === 0))
		throw new AnyBalance.Error('Не найдено ни одной карты');

	//Ищем заданную пользователем карту или берем первую
	var card;
	if(prefs.num){
		var filtered = data.filter(function(card){ return new RegExp(prefs.num + '$').test(card.cardnum); });
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
	
	if(isAvailable(['history', 'total_outcome', 'total_income'])) {
		var count = 5, history = [], item, last, i, date, summ;
		
		data = makeRequest('Get', lkurl + 'api/cards/' + card.cardid + '/history/all/', null, lkurl + '/cards');
		if(data.items){
			for(last = i = data.items.length - 1; i >= 0 && i > last - count; i--){
				item = data.items[i];
				date = getFormattedDate(item.date);
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
	var res = AnyBalance['request' + type](url, data ? JSON.stringify(data) : '',
		addHeaders({
			'X-CSRFToken': AnyBalance.getCookie('csrftoken'),
			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type': 'application/json;charset=UTF-8',
			'Referer': referer
		}));

	var json = getJson(res);

	if(json.__all__){
		AnyBalance.trace(JSON.stringify(json));
		var message = json.__all__.join(', ');
		throw new AnyBalance.Error(message, null, /Учетная запись не зарегистрирована/i.test(message));
	}

	return json;
}

function getFormattedDate(sdate){
	var date = new Date(sdate);
	return [('0' + date.getUTCHours()).slice(-2), ('0' + date.getUTCMinutes()).slice(-2)].join(':') + ' ' + [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()].join('-');
}