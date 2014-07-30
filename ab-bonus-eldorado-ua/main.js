/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт магазина: http://eldorado.com.ua/
Личный кабинет: http://www.club.eldorado.com.ua/personal/
*/

var headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
};

function main(){
	var baseurl = 'http://www.club.eldorado.com.ua/personal/';
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	
    var html = AnyBalance.requestGet(baseurl, headers);
	
    headers.Referer = baseurl;
	
	html = AnyBalance.requestPost(baseurl, {
		login: prefs.login,
		pin: prefs.pass,
		mail: prefs.email,
		gologin: 'Y'
	}, headers);
	
	if(!/Выход/i.test(html)){
		var error = getParam(html, null, null, /<div class="popup-inner">(?:\s*|\s*<p class='er_'>)([^<]*)(?:|<\/p>)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	
	getParam(html, result, '__tariff', /Фамилия:([\s\S]*?)Пол/i, [replaceTagsAndSpaces, /(?:Фамилия|Имя|Отчество):/ig, ''], html_entity_decode);
    getParam(html, result, 'balance', /class="num_new"[^>]*>([^<]*)(?:[^>]*>){2}- Активных бонусов/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_not_active', /class="num_new"[^>]*>([^<]*)(?:[^>]*>){2}- Не активных бонусов/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus_burn_date', /<td><span>Бонусы<\/span><\/td>\s*<td><span>Срок действия<\/span><\/td>\s*<\/tr>\s*<tr>\s*<td>[^<]*<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'bonus_active', /<td><span>Бонусы<\/span><\/td>\s*<td><span>В статус активный<\/span><\/td>\s*<\/tr>\s*<tr>\s*<td>[^<]*<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);	
	
    result.ncard = prefs.login;
	
    AnyBalance.setResult(result);
}