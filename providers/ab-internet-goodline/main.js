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

function main(){
    var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.goodline.info/';
    AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var token = getParam(html, null, null, /<input[^>]+name="_token"[^>]*value="([^"]*)/i) || '';

	html = AnyBalance.requestPost(baseurl + 'auth/login', {
		login: prefs.login,
		password: prefs.password,
		remember: '0',
        new_lk: '1',
        url: '',
        _token: token,
        remember: '1',
		'g-recaptcha-response': ''
	}, AB.addHeaders({Referer: baseurl + 'auth'}));

	var json = getJson(html);

	if(!json.success) {
		var error = json.message ? json.message : '';
		if (error) {
            throw new AnyBalance.Error(error, null, /логин или пароль/i.test(error));

        }

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'service', g_headers);

    getParam(html, result, 'balance', /Ваш баланс(?:[\s\S]*?)<div[^>]*class="price"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', 	  /К ОПЛАТЕ(?:[\s\S]*?)<div[^>]*class="price"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paid', 	  /Списано за(?:[\s\S]*?)<div[^>]*class="price"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	
    // getParam(html, result, 'status', /Статус[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // getParam(html, result, 'agreement', /Номер договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Получаем таблицу услуг
    // var table = getParam(html, null, null, /<table[^>]+class="my-service-info"[^>]*>([\S\s]*?)<\/table>/i);
    // if(table){
        // var tariff = [];
        // //вычленяем тарифные планы из таблицы услуг
        // table.replace(/<tr[^>]*>[\s\S]*?<\/tr>/ig, function(str){
            // //получаем тариф текущей услуги
            // var t = getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            // if(t)
                 // tariff[tariff.length] = t;
        // });
        // result.__tariff = tariff.join(', ');
    // }else{
        // AnyBalance.trace('Не удалось найти таблицу подключенных услуг');
    // }

	if(AnyBalance.isAvailable('trafficInter', 'trafficIntra')){
		html = AnyBalance.requestGet(baseurl + 'service/internet_stat', g_headers);

		getParam(html, result, 'trafficInter', /За месяц(?:[\s\S]*?<td[^>]*class="sum"[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'trafficIntra', /За месяц(?:[\s\S]*?<td[^>]*class="sum"[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

