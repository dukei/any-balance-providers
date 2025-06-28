/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у ногинского интернет-провайдера Flex. Он осуществляет подключение клиентов к домовым сетям в населенных пунктах: Ногинск, Электросталь, Бахчиванджи, Электроугли, Орехово-Зуево, Ликино-Дулево, Давыдово, Демехово, Куровское, Селятино.

Сайт оператора: http://www.flex.ru/
Личный кабинет: https://www.flex.ru/stats/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

var baseurl = 'https://lk.flex.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + '?auth', {
        login:prefs.login,
        password:prefs.password,
        act:'login'
    }, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': baseurl
    }));

    //AnyBalance.trace(html);
    if(!/\?logout/.test(html)){
        var error = getParam(html, null, null, /alert\('([^']*)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '?traffic', g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета\s*?:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс лицевого счета\s*?:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'discount', /Скидка\s*?:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Зачтенный трафик с начала месяца\s*?:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'outgoing', /Исходящий \(от абонента\)[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'incoming', /Входящий \(к абоненту\)[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'limit', /Лимит[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'exceeding', /Превышение[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'remains', /Остаток[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'licschet', /Лицевой сч[её]т\s*?:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Действующий тарифный план\s*:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ip_address', /Статический IP адрес\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	getParam(html, result, 'username', /Имя пользователя\s*:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(AnyBalance.isAvailable(['last_pay_date', 'last_pay_sum', 'last_pay_desc'])){
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear()-1, dt.getMonth(), dt.getDate());
	    var dateFrom = n2(dtPrev.getDate()) + '.' + n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
	    var dateTo = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		html = AnyBalance.requestPost(baseurl + 'api/?method=getstats', {
			'statstype': '1',
            'type': '5',
            'dayfrom': dateFrom,
		    'dayto': dateTo
		}, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'Referer': baseurl + '?perpay'
		}));
	    
	    var payments = getJson(html);
		
		if(payments && payments.length && payments.length > 0){
			var payment = payments[payments.length-1]; // Последний платеж с конца надо брать
			AnyBalance.trace('Последний платеж: ' + JSON.stringify(payment));
			getParam(payment[0], result, 'last_pay_date', null, null, parseDate);
	        getParam(payment[3], result, 'last_pay_sum', null, null, parseBalance);
	        getParam(payment[1], result, 'last_pay_desc', null, null, capitalizeFirstLetter);
		}else{
			AnyBalance.trace('Не удалось получить данные по платежам');
		}
	}
	
	if(AnyBalance.isAvailable(['last_write_date', 'last_write_sum', 'last_write_desc'])){
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear()-1, dt.getMonth(), dt.getDate());
	    var dateFrom = n2(dtPrev.getDate()) + '.' + n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
	    var dateTo = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		html = AnyBalance.requestPost(baseurl + 'api/?method=getstats', {
			'statstype': '3',
            'type': '5',
            'dayfrom': dateFrom,
		    'dayto': dateTo
		}, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'Referer': baseurl + '?perpay'
		}));
	    
	    var writeOffs = getJson(html);
		
		if(writeOffs && writeOffs.length && writeOffs.length > 0){
			var writeOff = writeOffs[writeOffs.length-1]; // Последнее списание с конца надо брать
			AnyBalance.trace('Последний платеж: ' + JSON.stringify(writeOff));
			getParam(writeOff[0], result, 'last_write_date', null, null, parseDate);
	        getParam(writeOff[2], result, 'last_write_sum', null, null, parseBalance);
	        getParam(writeOff[1], result, 'last_write_desc', null, null, capitalizeFirstLetter);
		}else{
			AnyBalance.trace('Не удалось получить данные по списаниям');
		}
	}

    AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

