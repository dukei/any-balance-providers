/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':		'keep-alive',
    'User-Agent':		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs   = AnyBalance.getPreferences(),
		baseurl = 'https://cabinet.esbt.ru/';

    AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'Present-web/login.action', {
		'onload_event':"setFocusField('username')",
		'username':prefs.login,
		'password':prefs.password,
	}, g_headers);
    
	if(!/loadingText="Загрузка/i.test(html)){
		var error = AB.getParam(html, null, null, /<li[^>]*>[\s\S]*?<\/li>/i, AB.replaceTagsAndSpaces);
		if(error) {
			throw new AnyBalance.Error(error, null, /Проверьте правильность/i);
		}

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	var result = {success: true};

	if(isAvailable(['agreement', 'fio'])) {
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/menu.action?dojo.preventCache=1376998876150');

		AB.getParam(html, result, 'agreement', /"testForm_useraccountid"\s*class="app_form_text">([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'fio', 	   /Имя[\s\S]*?"app_form_text">([\s\S]*?)<\//i,                       AB.replaceTagsAndSpaces);
	}

	if(isAvailable(['lastpaydate', 'lastpaysum'])) {
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/paymentHistory.action?dojo.preventCache=1376998876150');

		AB.getParam(html, result, 'lastpaydate', /Дата платежа[\s\S]*?(?:[\s\S]*?<td[^>]*>){1}[\s\S]*?([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseDate);
		AB.getParam(html, result, 'lastpaysum',  /Дата платежа[\s\S]*?(?:[\s\S]*?<td[^>]*>){4}[\s\S]*?([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	if(isAvailable(['penya', 'ODN', 'byt'])) {
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/updateBalance.action?dojo.preventCache=1376998876150');

		AB.getParam(html, result, 'penya', /Пеня(?:[^>]*>){4}([^<]*)/i, 			   AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'ODN',   /потребление одн(?:[^>]*>){4}([^<]*)/i,     AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'byt',   /Бытовое потребление(?:[^>]*>){4}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	if(isAvailable(['lastcounterdate', 'lastcounterday', 'lastcounternight', 'lastcounterpik', 'lastcounterstatus'])) {
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/countervalue/showAccountCounterValues.action?clearsessionhelper=true&dojo.preventCache=1377159328001');

		AB.getParam(html, result, 'lastcounterdate',   /Дата(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
		// Показания ДЕНЬ
		AB.getParam(html, result, 'lastcounterday',    /Дата(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		// Показания НОЧЬ
		AB.getParam(html, result, 'lastcounternight',  /Дата(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		// Показания ПИК
		AB.getParam(html, result, 'lastcounterpik',    /Дата(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		// Статус
		AB.getParam(html, result, 'lastcounterstatus', /Дата(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	}

    AnyBalance.setResult(result);
}