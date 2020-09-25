/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, бонусные баллы, сумму доплаты и пакеты услуг у НТВ+.

Сайт: http://www.ntvplus.ru
Личный кабинет: http://www.ntvplus.ru/login-page.xl
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
    var baseurlLogin = 'https://ntvplus.ru/';
    var baseurl = 'https://service.ntvplus.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин.');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль.');


    var html = AnyBalance.requestGet (baseurl, g_headers);

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    html = AnyBalance.requestPost (baseurl + "users/ajax/log-in.xl", {
        email: prefs.login,
        pass: prefs.password,
    }, addHeaders({
    	Referer: baseurl
    }));

    var json = getJson(html);
    if(json.error){
		throw new AnyBalance.Error(json.error.value, null, json.error.name == 'siteusers.login');
    }

	html = AnyBalance.requestGet(baseurl + 'account/', addHeaders({Referer: baseurl}));
	if(!/logout/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var contracts = getElements(html, /<div[^>]+panel[^>]+data-contract-id[^>]*>/ig);
	AnyBalance.trace('Найдено ' + contracts.length + ' договоров');
    var result = {success: true};

	for(var i=0; i<contracts.length; ++i){
		var c = contracts[i];
		var num = getElement(c, /<span[^>]*contract--number-label[^>]*>/i, replaceTagsAndSpaces);
		

		if(prefs.contract && !endsWith(num, prefs.contract)){
			AnyBalance.trace('Договор ' + num + ' не подходит по номеру, пропускаем');
			continue;
		}

		AnyBalance.trace('Найден нужный договор: ' + num);

		getParam(num, result, 'agreement');
		getParam(getElements(c, /<[^>]+contract--description[^>]*>/i), result, '__tariff', null, replaceTagsAndSpaces);

		if(AnyBalance.isAvailable('balance', 'bonus', 'state', 'packets')){
			var ref = getParam(c, null, null, /<a[^>]+href="([^"]*\/info\?id=[^"]*)/i, replaceHtmlEntities);
			if(!ref){
				AnyBalance.trace('Не удалось найти ссылку на расширенную информацию: ' + c);
				throw new AnyBalance.Error('Не удалось найти ссылку на подробную информацию о договоре. Сайт изменен?');
			}
		    
			var url = joinUrl(baseurl + 'account/', ref);
			html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl + 'account/'}));
			
			getParam(getElements(html, [/<div[^>]+form--outlined[^>]*>/ig, />\s*Баланс/i]), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
			getParam(getElements(html, [/<div[^>]+form--outlined[^>]*>/ig, />\s*Бонусный баланс/i]), result, 'bonus', null, replaceTagsAndSpaces, parseBalance);
			getParam(getElements(html, /<[^>]+status--label[^>]*>/i), result, 'state', null, replaceTagsAndSpaces);
		    
			var tagsContainer = getElement(html, /<div[^>]+tags[^>]*>/i);
			var tags = getElements(tagsContainer, /<span[^>]+tags--item[^>]*>/ig, replaceTagsAndSpaces);
			getParam(tags.join(', '), result, 'packets');
		}
		
		break;
	}
	
    AnyBalance.setResult(result);
}

                                 