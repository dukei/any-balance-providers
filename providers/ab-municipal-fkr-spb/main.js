/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://fkr-spb.ru';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	if (prefs.housenum && !prefs.flatnum)
		checkEmpty(prefs.flatnum, 'Введите номер квартиры!');
	if (prefs.flatnum && !prefs.housenum)
		checkEmpty(prefs.housenum, 'Введите номер дома!');

    var html = AnyBalance.requestGet(baseurl + '/user', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
	var form = getElement(html, /<form[^>]+id="user-login"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
    var formBuildID = getParam(form, null, null, /<input[^>]+name="form_build_id"[^>]+value="([\s\S]*?)"[^>]*>/i);
    html = AnyBalance.requestPost(baseurl + '/user', {
        name: prefs.login,
        pass: prefs.password,
        form_id: 'user_login',
        op: 'Войти',
        form_build_id: formBuildID,
//      'Remember': 'false'
    }, addHeaders({Referer: baseurl}));

    if (!/\/user\/\d+\/edit/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>([\s\S]*?)\(.*?<\/div>/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /Логин или пароль введены неверно/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
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