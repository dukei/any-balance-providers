/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru,en-US;q=0.8,en;q=0.6',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.npfe.ru';

    AnyBalance.setOptions({
        DEFAULT_CHARSET: 'windows-1251',
        SSL_ENABLED_PROTOCOLS: ['TLSv1.2']
    });

	checkEmpty(prefs.login, 'Введите пароль!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = createFormParams(html, function (params, str, name, value) {
        if (name == '_nonempty_login4')
            return prefs.login;
        else if (name == '_nonempty_password4')
            return prefs.password;

        return value;
    });

    try {
    	AnyBalance.sleep(3000); //Иначе не пускает
        html = AnyBalance.requestPost(baseurl + '/', params, addHeaders({
        	Origin: baseurl,
            Referer: baseurl + '/'
        }));
    } catch (e) {
        html = AnyBalance.requestGet(baseurl + '/ru/savings/', g_headers);
    }

    if (!/logout/.test(html)) {
    	if(/Для продолжения работы с сервисом необходимо ознакомиться/i.test(html)){
    		AnyBalance.trace('Надо с чем-то ознакомиться. Ознакамливаемся');
    		var form = getElement(html, /<form/i);
			var params = AB.createFormParams(form, function(params, str, name, value) {
				if (/checkbox/i.test(str)) {
					return getParam(str, /value\s*=\s*["']([^"']*)/i, replaceHtmlEntities);
				}
	        
				return value;
			});

			html = AnyBalance.requestPost(AnyBalance.getLastUrl(), params, addHeaders({
				Referer: AnyBalance.getLastUrl()
			}));
    	}
    }

    if (!/logout/.test(html)) {
        var error = AB.getParam(html, null, null, /<span[^>]+class="mess">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /(?:не\s+найдены|неверный\s*пароль)/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


	var result = {success: true};

	if(!/savings/i.test(AnyBalance.getLastUrl()))
    	html = AnyBalance.requestGet(baseurl + '/ru/savings/', g_headers);

    AnyBalance.trace('Смотрим негосударственную пенсию');
    var table = getParam(html, /<h3[^>]*>\s*Негосударственная пенсия\s*<\/h3>\s*<table[^>]+other_contrac?ts[^>]*>([\s\S]*?)<\/table>/i);
    var row = table && getElement(table, /<tr[^>]+exists/i);
    if(row){
    	AB.sumParam(row, result, '__tariff',  /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i,  [AB.replaceTagsAndSpaces, /\s+/g, ' '], null, aggregate_join);
    	AB.sumParam(row, result, 'balance',  /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,  AB.replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }else{
    	AnyBalance.trace('У вас нет негосударственной пенсии');
    }

    AnyBalance.trace('Смотрим накопительную пенсию');
    var table = getParam(html, /<h3[^>]*>\s*Накопительная пенсия\s*<\/h3>\s*<table[^>]+other_contrac?ts[^>]*>([\s\S]*?)<\/table>/i);
    var row = getParam(table, /(?:[\s\S]*?<tr[^>]*>){2}([\s\S]*?)<\/tr>/i);
    if(row){
    	AB.sumParam(row, result, '__tariff',  /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i,  [AB.replaceTagsAndSpaces, /\s+/g, ' '], null, aggregate_join);
    	AB.sumParam(row, result, 'balance',  /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i,  AB.replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	AB.sumParam(row, result, 'insurance',  /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i,  AB.replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }else{
    	AnyBalance.trace('У вас нет накопительной пенсии');
    }

	AnyBalance.setResult(result);
}