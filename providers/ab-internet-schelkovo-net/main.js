/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.schelkovo-net.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl+'enter', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
     }

     var build_id 	= getParam(html, null, null, /<input[^>]*name="form_build_id"[^>]*value="([^"]*)/i) || '',
		 form_id	= getParam(html, null, null, /<input[^>]*name="form_id"[^>]*value="([^"]*)/i) || '';

    html = AnyBalance.requestPost(baseurl + 'enter', {
        name: 			prefs.login,
        pass: 			prefs.password,
		op: 			'Войти',
		form_build_id: 	build_id,
        form_id: 		form_id
	}, addHeaders({
		Referer: baseurl + 'enter'
	}));
	
	if (!/log-out/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="alert[^"]*"(?:[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error){
			throw new AnyBalance.Error(error, null, /логина или пароля/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
    var token = getParam(html, null, null, /theme_token(?:[^"]*"){2}([^"]*)/i) || '';

    getParam(html, result, 'balance', /Баланс([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'ip', />\s*Основной IP-адрес[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', />\s*Кредит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    //Ифнормация о пользователе
    if(AnyBalance.isAvailable('agreement', 'blocked', 'fio')){
        var json = getJson(AnyBalance.requestPost(baseurl+'mypage/ajax/data/personal-account-inet', {
            'theme_token': token
        }));
        if(json.length) {
            getParam(json[1].data, result, 'agreement', /Номер договора(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
            getParam(json[1].data, result, 'blocked', /Заблокирован(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
            getParam(json[1].data, result, '__tariff', /Тарифный план(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
            getParam(json[1].data, result, 'fio', /Полное имя(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        } else {
            AnyBalance.trace('Не удалось получить данные о пользователе.');
        }
	}


    //Ифнормация о статусе
    if(AnyBalance.isAvailable('status')) {
        var json=getJson(AnyBalance.requestPost(baseurl + 'mypage/ajax/data/change-inet-status', {
            'theme_token': token
        }));
        if(json.length) {
            getParam(json[1].data, result, 'status', /<div[^>]*id="edit-inet-on"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        } else {
            AnyBalance.trace('Не удалось получить данные о состояниии интернета.');
        }
    }


	//Ифнормация по трафику
    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        json = getJson(AnyBalance.requestPost(baseurl + 'mypage/ajax/data/total-info-inet', {
            'theme_token': token
        }));

        if(json.length) {
            getParam(json[1].data, result, 'trafficIn', /Входящий(?:[^>]*>){2}([^<]*<)/i, replaceTagsAndSpaces, parseTraffic);
            getParam(json[1].data, result, 'trafficOut', /Исходящий(?:[^>]*>){2}([^<]*<)/i, replaceTagsAndSpaces, parseTraffic);
        } else {
            AnyBalance.trace('Не удалось получить данные о трафике.');
        }
	}
	AnyBalance.setResult(result);
}