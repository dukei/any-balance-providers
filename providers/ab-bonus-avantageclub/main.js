/**
Бонусная карта сети магазинов Улыбка Радуги (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.r-ulybka.ru/';
    AnyBalance.setDefaultCharset('UTF-8'); 

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
/*	Выдают 500 в нормальном режиме
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
*/	
	html = AnyBalance.requestPost(baseurl + 'personal/?login=yes', {
		'auth_submit_button': 'Y',
		'Login': 'Войти',
		'USER_REMEMBER': '',
		'AUTH_FORM': 'Y',
		'TYPE': 'AUTH',
		'backurl': '/personal/',
		'USER_LOGIN': prefs.login,
		'USER_PASSWORD': prefs.password,
	}, addHeaders({
		Referer: baseurl + 'personal/'
	}));
	
    if(!/logout=yes/i.test(html)){
        var error = getParam(html, null, null, /"entry error"[^>]*>(?:[\s\S]*?)<div class="danger-info"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
		}

        AnyBalance.trace(html);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	
    getParam(html, result, 'balance', /<div class="number-of-points"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', 	  /<input[^>]*name="name"[^>]*value="([^"]*)/i, 		   replaceTagsAndSpaces);
    getParam(html, result, 'number',  /<input[^>]*id="AVANTAGE_CARD"[^>]*value="([^"]*)/i, 	   replaceTagsAndSpaces);
    getParam(html, result, 'phone',   /<input[^>]*id="PERSONAL_PHONE"[^>]*value="([^"]*)/i,    replaceTagsAndSpaces);
    getParam(html, result, 'email',   /<input[^>]*name="EMAIL"[^>]*value="([^"]*)/i, 		   replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
