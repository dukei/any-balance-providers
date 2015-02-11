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
	var baseurl = 'https://lk-smolensk.center.mts.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
		'LoginForm[login]': prefs.login,
		'LoginForm[password]': prefs.password,
		'yt0': 'Войти'
	}, addHeaders({Referer: baseurl + 'index.php?r=site/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /alert-error"(?:[^>]*>){3}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};	
  
    html = AnyBalance.requestGet(baseurl + 'index.php?r=account/index', g_headers);
  
	getParam(html, result, 'balance', /index\.php\?r=payment\/pay">([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /content-aside-name"(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Номер договора(?:[^>]*>){14}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
    var service = getParam(html, null, null, /show-vgroups-(\d*?)"/i);
  
	html = AnyBalance.requestPost(baseurl + 'index.php?r=account/vgroups&agrmid=' + service, {}, addHeaders({Referer: baseurl + 'index.php?r=account/index', 'X-Requested-With': 'XMLHttpRequest'}));
    
    var json = getJson(html);
    if (!json) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные по договору. Сайт изменен?');    
    }
    
	getParam(json.body[0].tarifdescr, result, '__tariff', null, null);
	getParam(json.body[0].rent, result, 'abon_payment', null, null);
	getParam(json.body[0].state.state, result, 'status', null, null);
	
	AnyBalance.setResult(result);
}