
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.gioc.kiev.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cabinet/login/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(
        baseurl + 'post/cabinet/login/',
        getParams(),
        AB.addHeaders({
		    Referer: baseurl + 'cabinet/login/'
	    })
    );

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /error-description[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /невірні/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'debt', /Сума до сплати[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'payed', /Сплачено за[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(getElement(html, /<div[^>]+class="title"[^>]*>/i), result, 'address', null, [AB.replaceTagsAndSpaces, /\n/g, ' ']);
	AB.getParam(html, result, 'pay_period', /<div[^>]+class="bydate"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

	var countersToCheck = [];
	for(var i=0; i<8; ++i){
		countersToCheck.push('type' + i);
		countersToCheck.push('value' + i);
	}

	if(isAvailable(countersToCheck)){
		var url = getParam(html, null, null, /<a[^>]+href="([^"]*\/cabinet\/objects\/\d+[^"]*)/i, replaceHtmlEntities);
		AnyBalance.trace('Ссылка на счет: ' + url);
		if(url){
			html = AnyBalance.requestGet(url, g_headers);
			var bill = getElement(html, /<table[^>]+d[ae]tailbill-table[^>]*>/i);
			var rows = getElements(bill, /<tr[^>]+item-row[^>]*>/ig);
			AnyBalance.trace('Найдено ' + rows.length + ' строк в счете');
	    
			for(i=0; i<rows.length; ++i){
				var row = rows[i];
				getParam(row, result, 'type' + i, /<label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
				getParam(row, result, 'value' + i, /<input[^>]+bill-summ-input[^>]*value="([^"]*)/i, replaceHtmlEntities, parseBalance);
			}
		}
	}

	AnyBalance.setResult(result);
}

function getParams() {
    var prefs = AnyBalance.getPreferences(),
        res = {
            email: '',
            phone: '',
            password: prefs.password
        };

    if (/^[\d\+]+$/.test(prefs.login)) {
        res['phone'] = prefs.login;
    }
    else {
        res['email'] = prefs.login;
    }

    return res;
}
