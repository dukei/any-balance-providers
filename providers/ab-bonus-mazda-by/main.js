
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://amlkv2.atlantm.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, addHeaders({
		'Referer': 'http://www.mazda.by/lk/?returned=true'
	}));

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}


	var token = AB.getParam(html, null, null, /<input[^>]+name='csrfmiddlewaretoken'[^>]+value='([^']*)/i);
	if(!token) {
		throw new AnyBalance.Error("Не удалось найти параметры авторизации. Сайт изменён?");
	}

	html = AnyBalance.requestPost(baseurl, {
		sap_login: prefs.login,
		sap_password: prefs.password,
		csrfmiddlewaretoken: token
	}, AB.addHeaders({
		Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="mess-err"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /(Неверный пароль|Логин клиента не существует)/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'json/infobonus/', addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	if(json && json.data && json.data[0]) {
		AB.getParam(json.data[0].xBonusSaldo + '', result, 'balance', null, null, AB.parseBalance);
	} else {
		AnyBalance.trace("Не удалось найти информацию о бонусах. Сайт изменён?");
	}

	if(isAvailable('car')) {
		html = AnyBalance.requestGet(baseurl + 'json/auto/', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		json = getJson(html);

		if(json && json.xAvtoList && json.xAvtoList[0]) {
			AB.getParam(json.xAvtoList[0].MODEL + ' ' + json.xAvtoList[0].GOS_NUMB, result, 'car');
		} else {
			AnyBalance.trace("Не удалось найти информацию об автомобиле. Сайт изменён?")
		}
	}

	if(isAvailable(['lb_date', 'lb_document', 'lb_sum', 'lb_type'])) {
		html = AnyBalance.requestGet(baseurl + 'json/bonushist/', addHeaders({
			'X-Requested-With': 'XMLHttpRequest'
		}));
		json = getJson(html);

		if(json && json.xBonusHist && json.xBonusHist[0]) {
			var info = json.xBonusHist[0];
			AB.getParam(info.B_DATE, 	  result, 'lb_date', null, [/(\d{4})(\d{2})(\d{2})/i, '$1-$2-$3'], AB.parseDateISO);
			AB.getParam(info.B_SUM  + '', result, 'lb_sum',  null, null, 								   AB.parseBalance);
			AB.getParam(info.B_NUMB, 	  result, 'lb_document');
			AB.getParam(info.B_NAME + '', result, 'lb_type');

		} else {
			AnyBalance.trace("Не удалось найти информацию о последнем бонусе. Сайт изменён?");
		}
	}


	AnyBalance.setResult(result);
}
