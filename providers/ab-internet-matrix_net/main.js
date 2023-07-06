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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.m-x.net.ua/cgi-bin/stat.pl';
	AnyBalance.setDefaultCharset('windows-1251');
	var html=AnyBalance.requestGet(baseurl, g_headers);

        if (/Авторизація для доступу до клієнтської статистики/i.test(html)){
		var ses = /name\=ses\svalue\=(\d*)\>/i.exec(html)[1];	
		var pp=hex_md5(ses+' '+prefs.password).toString();
		html = AnyBalance.requestGet(baseurl+'?ses='+ses+'&uu='+prefs.login+'&pp='+pp, g_headers); 
	}
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!/Стан доступу до ваших облікових записів/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'balance', /на вашому рахунку(?:[^>]*>){2}([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'price', /Итого к оплате([\s\S]*?)\<\/tr\>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mb', /вход\+выход([\s\S]*?)Мб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /((Особовий Рахунок)[\s\S]*?)\/b/i, replaceTagsAndSpaces, parseBalance);
        result.stat='<font  color=\'' + (/(дяку)|(спасибо)/i.test(html) ? 'green\'>Ok' : 'red\'>ALERT') + '</font>';
	AnyBalance.setResult(result);
}
