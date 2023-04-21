/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
};

var g_savedData;

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.fkr-spb.ru';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	if (prefs.housenum && !prefs.flatnum)
		checkEmpty(prefs.flatnum, 'Введите номер квартиры!');
	if (prefs.flatnum && !prefs.housenum)
		checkEmpty(prefs.housenum, 'Введите номер дома!');
	
	if(!g_savedData)
		g_savedData = new SavedData('fkr-spb', prefs.login);

	g_savedData.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + '/user', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
	if(/user\/logout/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var form = getElement(html, /<form[^>]+id="user-login"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if (name == 'name') {
	   			return prefs.login;
    		} else if (name == 'pass') {
	    		return prefs.password;
	    	} else if (name == 'captcha_response') {
	    		var imgUrl = getParam(form, null, null, /<img[^>]+foaf:Image[^>]+src="([^"]*)/i);
	        
	    		if(!imgUrl){
	    			AnyBalance.trace(html);
	    			throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
	    		}
	    		var img = AnyBalance.requestGet(joinUrl(baseurl, imgUrl), addHeaders({Referer: baseurl + '/user'}));
	    		return AnyBalance.retrieveCode('Пожалуйста, введите символы с картинки', img, {/*inputType: 'number', */time: 300000});
	    	}
	        
	    	return value;
	    });
	    var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i, replaceHtmlEntities);

		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: baseurl + '/user'}));
        
		if (!/\/user\/\d+\/edit/i.test(html)) {
            var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            if (error)
                throw new AnyBalance.Error(error, null, /имя|парол/i.test(error));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}
	
    var result = {success: true};

    var userID = getParam(html, null, null, /<a href="\/user\/(\d+)\/[^>]*>/i);

    getParam(html, result, 'fio', /<a href="\/user\/\d+\/edit"\stitle="([\s\S]*?)">/i, replaceTagsAndSpaces);

    var json = requestGetJson('/rest.php?method=flats', baseurl);

    if (!isArray(json) || json.length == 0)
        throw new AnyBalance.Error('Не удалось найти информацию по квартире. Сайт изменен?');
	
	var curFlat;
	for(var i=0; i<json.length; ++i){
		var curr = json[i];
		AnyBalance.trace('Найдена квартира №' + curr.flatNum + ', дом №' + curr.house.houseNum);
		if(!curFlat && (!prefs.flatnum  || endsWith(curr.house.houseNum + curr.flatNum, prefs.housenum + prefs.flatnum))){
			AnyBalance.trace('Выбрана квартира №' + curr.flatNum + ', дом №' + curr.house.houseNum);
			curFlat = curr.id;
		}
	}

	if(!curFlat)
		throw new AnyBalance.Error('Не удалось найти квартиру №' + prefs.flatnum + ', дом №' + prefs.housenum);

    json = requestGetJson('/rest.php?method=flat&id=' + curFlat, baseurl);
	
	getParam(json.saldo + '', result, 'balance', null, null, parseBalance);
	getParam(json.penalty + '', result, 'penalty', null, null, parseBalance);
	getParam(json.account, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(json.account, result, 'account', null, replaceTagsAndSpaces);
	getParam(json.fullAddress, result, 'adress', null, replaceTagsAndSpaces);
    getParam(json.sqrFull + '', result, 'flatArea', null, null, parseBalance);
    getParam(json.kadNum, result, 'flatKadNum', null, replaceTagsAndSpaces);
    getParam(json.house.kadNum, result, 'houseKadNum', null, replaceTagsAndSpaces);

    getParam(json.house.houseTotals.collectPercent + '', result, 'contribution', null, null, parseBalance);
	getParam(json.house.houseTotals.collectPercentPeny + '', result, 'collectPercentPeny', null, null, parseBalance);

    AnyBalance.setResult(result);
}

function requestGetJson(href, baseurl) {
    return getJson(AnyBalance.requestGet(baseurl + href));
}