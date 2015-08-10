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

function parseTrafficGb(str){
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lk.ionitcom.ru/index.php";
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
    html = AnyBalance.requestPost(baseurl, {
        'do':'login',
        //type_auth: /^\d+$/i.test(prefs.login) ? 'ls' : 'login', //Если только цифры, то номер договора, если буквы есть, то логин
        lc:prefs.login,
        password:prefs.password
    }, addHeaders({Referer: baseurl}));

    //AnyBalance.trace(html);
    if(/<input[^>]*name="?do[^>]*value="?login_form/.test(html)){
        var error = getParam(html, null, null, /<form[\s\S]*?<td[^>]*tdgrey[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestPost(baseurl, {'do':'users_info'});

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', / Статус лицевого счёта:(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой(?:\s+|&nbsp;)счёт:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /№(?:\s+|&nbsp;)договора:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestPost(baseurl, {'do':'users_services'});

    getParam(html, result, '__tariff', /Текущий тарифный план[\S\s]*?<td[^>]*>([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}