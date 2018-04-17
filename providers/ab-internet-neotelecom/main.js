/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://lk.neotelecom.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	var html = AnyBalance.requestPost(baseurl + 'auth.php', params, addHeaders({Referer: baseurl + 'auth.php'}));

    if(!/exit/i.test(html)){
        var error = getElement(html, /<[^>]+error/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var contracts = getElements(html, [/<tr/ig, /td[^>]+class="contract"/i]);
	AnyBalance.trace('Найдено ' + contracts.length + ' л/с');
	
	if(!contracts.length)
		throw new AnyBalance.Error('Не найдено ни одной услуги в личном кабинете!');

	var result = {success: true};
	
	for(var i = 0; i < contracts.length; i++)
	{
		var c = contracts[i];
		var num = getElement(c, /<h4/i, [replaceTagsAndSpaces, /Договор №\s*/i, '']);
		AnyBalance.trace('Найден договор № ' + num);

		// Если не указан счет, просто берем первую таблицу
		if(!prefs.acc || endsWith(num, prefs.acc))
		{	
			AnyBalance.trace('Договор № ' + num + ' подходит по последним цифрам ' + prefs.acc);

			getParam(num, result, 'acc_num');
			getParam(c, result, 'balance', /<div[^>]+balance[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(c, result, 'usluga', /<div[^>]+title[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(c, result, '__tariff', /<div[^>]+tariff_scheme[^>]*>([\s\S]*?)(?:<\/div>|<a)/i, replaceTagsAndSpaces);
			break;
		}
	}
    AnyBalance.setResult(result);
}