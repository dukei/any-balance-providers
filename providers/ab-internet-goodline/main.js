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
	var baseurl = 'https://old-lk.goodline.info/';
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'users/auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'users/auth', {
		login: prefs.login,
		password: prefs.password,
		remember: '0',
		submit:'Войти в систему'
	}, AB.addHeaders({Referer: baseurl + 'users/auth'}));
	
	if(!/\/users\/exit/.test(html)) {
		var error = AB.getParam(html, null, null, /<span[^>]*class=["']text-suspend[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        
		error = getParam(html, null, null, /jGrowl\s*\(\s*'([^']*)/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[^>]*>([\S\s]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /к оплате(?:[^>]*>){2}\s*<div[^>]*class="price"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	
	
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
		html = AnyBalance.requestGet(baseurl + 'popup/internetstatistic', addHeaders({'X-fancyBox': 'true', 'X-Requested-With': 'XMLHttpRequest'}));
		
		getParam(html, result, 'trafficInter', /За месяц[\s\S]*?Итого([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTrafficGb);
		getParam(html, result, 'trafficIntra', /За месяц[\s\S]*?Итого:(?:[\s\S]*?<td[^>]*>){1}?Итого:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}

function parseTrafficGb(str) {
	var mbytes = parseTraffic(str, 'mb');
	return parseFloat((mbytes/1024).toFixed(2));
}