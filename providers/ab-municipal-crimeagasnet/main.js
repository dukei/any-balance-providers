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
	var baseurl = 'https://lkk.crimeagasnet.ru';
	AnyBalance.setDefaultCharset('utf-8');

//	return createList();
	
	checkEmpty(prefs.login, 'Введите фамилию!');
	checkEmpty(prefs.password, 'Введите лицевой счет!');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

//	var captchaUrl = getParam(html, null, null, /<img[^>]+id="captcha"[^>]*src="([^"]*)/i);
//	if(!captchaUrl){
//		var error = sumParam(html, null, null, /<h4[^>]*>([\s\S]*?)<\/h4>/ig, replaceTagsAndSpaces, null, create_aggregate_join(' '));
//		if(error)
//			throw new AnyBalance.Error(error);
//		AnyBalance.trace(html);
//		throw new AnyBalance.Error('Не удалось получить ссылку на капчу. Сайт изменен?');
//	}
//	var img = AnyBalance.requestGet(baseurl + captchaUrl, g_headers);
//	var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
	
	html = AnyBalance.requestPost(baseurl + '/', [
		['mail',prefs.login],
        ['password',prefs.password],
        ['save_my','on'],
        ['submit','']
	], addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': baseurl + '/'}));
	
	if (!/sign-out/i.test(html)) {
		var error = getParam(html, null, null, /<h3[^>]*>([\s\S]*?)\./i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var accounts = getElements(html, /<tr[^>]([\s\S]*?)<\/tr>/ig);
	AnyBalance.trace('Найдено лицевых счетов: ' + accounts.length);	

	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');
	
	var curAcc;
	for(var i=0; i<accounts.length; i++){
		var account = getParam(accounts[i], /ls_id[\s\S]*?(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	   	AnyBalance.trace('Найден лицевой счет ' + account);
	   	if(!curAcc && (!prefs.num || endsWith(account, prefs.num))){
	   		AnyBalance.trace('Выбран лицевой счет ' + account);
	   		curAcc = accounts[i];
	   	}
	}

	if(!curAcc)
	   	throw new AnyBalance.Error('Не удалось найти лицевой счет ' + prefs.num);
	
	getParam(curAcc, result, 'balance', /ls_id[\s\S]*?(?:[^>]*>){9}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	if(result.balance && /\-/i.test(result.balance))
		result.balance = -result.balance;

	getParam(curAcc, result, '__tariff', /ls_id[\s\S]*?(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	getParam(curAcc, result, 'licschet', /ls_id[\s\S]*?(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	getParam(curAcc, result, 'department', /ls_id[\s\S]*?(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
	getParam(curAcc, result, 'address', /ls_id[\s\S]*?(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces);
	getParam(curAcc, result, 'fio', /ls_id[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
//	sumParam(prefs.licschet, result, '__tariff', null, null, null, aggregate_join);
	
	AnyBalance.setResult(result);
}

function createList(){
	var baseurl = 'http://crimeagasnet.ru:8106';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + '/custom_scripts/abonent.php', g_headers);
	var options = getElements(html, /<option[^>]*>/ig);
	var values = [], names = [];
	for(var i=0; i< options.length; ++i){
		var name = getParam(options[i], null, null, null, replaceTagsAndSpaces);
		var value = getParam(options[i], null, null, /<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
		values.push(value);
		names.push(name);
	}

	AnyBalance.setResult({success: true, values: values.join('|'), names: names.join('|')});
}