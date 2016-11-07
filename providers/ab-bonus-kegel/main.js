/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Кегельбум

Сайт оператора: http://www.kegelbum.ru
Личный кабинет: www.kegelbum.ru/login/
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Origin': 'http://www.kegelbum.ru'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://www.kegelbum.ru/";
    
    var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	var timeToWait = 5000 + Math.random()*3000;
	var startTime = +(new Date());

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+form_auth[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}


	var sitekey = getParam(form, null, null, /data-sitekey=['"]([^'"]*)/i, replaceHtmlEntities);
	var grc_response = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', baseurl, sitekey);

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'USER_LOGIN') {
			return prefs.login;
		} else if (name == 'USER_PASSWORD') {
			return prefs.password;
		}

		return value;
	});
	params['g-recaptcha-response'] = grc_response;

	//Надо задержку
	var toWait = Math.floor(timeToWait - (+new Date() - startTime));
	AnyBalance.trace('Ждем ' + toWait + ' мс');
	if(toWait > 0)
		AnyBalance.sleep(toWait);

    html = AnyBalance.requestPost(baseurl + 'login/?login=yes', params, addHeaders({Referer: baseurl + 'login/'}));

    if(!/logout=yes/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="errortext"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestPost(baseurl + 'personal/cards/', '', addHeaders({Referer: AnyBalance.getLastUrl()}));

    var result = {success: true};

    getParam(html, result, 'fio', /<div[^>]+class="welcome"[^>]*>\s*Здравствуйте,([\s\S]*?)!?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    sumParam(html, result, 'balance_total', /<td[^>]+class="balance"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    var num = prefs.num ? prefs.num : "\\d+";
    var re = new RegExp('<tr[^>]+card-id="\\d*' + num + '"[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);

    getParam(tr, result, 'balance', /<td[^>]+class="balance"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /<td[^>]+class="cnumber"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'status', /<td[^>]+class="status"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td[^>]+class="cnumber"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
