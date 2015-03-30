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
    var baseurl = 'https://www.sportmaster.ru/';
    AnyBalance.setDefaultCharset('utf-8');
    
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'user/session/login.do', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
	var html = AnyBalance.requestPost(baseurl + 'user/session/login.do?continue=%2Fcatalog%2Fproduct%2Fwelcome.do&', {
		option: 'email',
		email: prefs.login,
		password: prefs.password
	}, addHeaders({ Referer: baseurl + 'user/session/login.do' }));

	if (!/userId/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class="sm-form__errors-block"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'user/profile/bonus.do', g_headers);
    
    var result = {success: true};
	getParam(html, result, '__tariff', /smProfile__level[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /smProfile__total-amount[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nextlevel', /Совершите покупки еще на([^<]*?)рублей/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('all')) {
		var table = getParam(html, null, null, /<table[^>]*sm-profile__bonustable[^>]*>(?:[\s\S](?!<\/table>))[\s\S]*?<\/table>/i);
		if(table) {
			var string = '';
			var array = sumParam(table, null, null, /<tr>\s*<td[^>]*>\s*[\s\S]*?<\/tr>/ig, replaceTagsAndSpaces);
			for(var i = 0; i < array.length; i++) {
				var current = getParam(array[i], null, null, null, [/(\d{4})$/i, '$1\n', /(\d{2})-(\d{2})-(\d{4})/, '$1/$2/$3']);
				string += current;
			}
			getParam(string, result, 'all');
		}
	}

    AnyBalance.setResult(result);
}