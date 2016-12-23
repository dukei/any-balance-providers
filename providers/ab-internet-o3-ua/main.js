/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.o3.ua/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'login_check', {
		_target_path:	'/',
		_username: prefs.login,
		_password: prefs.password
    }, addHeaders({
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
    	Referer: baseurl
    }));

    var json = getJson(html);
	
	if(!json.success) {
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'ajax/services', g_headers);
    var json = getJson(html);
    getParam(json[0] && json[0].pay_type_name, result, '__tariff');

    html = AnyBalance.requestGet(baseurl + 'ajax/persons', g_headers);
    var json = getJson(html);
    var join_space = create_aggregate_join(' ');

	sumParam(json.name, result, 'fio', null, replaceTagsAndSpaces, null, join_space);
	sumParam(json.surname, result, 'fio', null, replaceTagsAndSpaces, null, join_space);
	sumParam(json.lastname, result, 'fio', null, replaceTagsAndSpaces, null, join_space);

	getParam(Math.round(json.current*100)/100, result, 'balance');
	getParam(json.current < json.stopsum ? 'Не активний' : 'Активний', result, 'status');
	getParam(json.card, result, 'dogovor');
/*	
	if(isAvailable(['traf_income','traf_outgoing'])) {
		html = AnyBalance.requestGet(baseurl + 'ru/statystyka-zahruzok.html', g_headers);
	
		getParam(html, result, 'traf_income', /Всего за период(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'traf_outgoing', /Всего за период(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
*/	
    AnyBalance.setResult(result);
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersDecode(str)
{
	str = html_entity_decode(str+'');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');	
}