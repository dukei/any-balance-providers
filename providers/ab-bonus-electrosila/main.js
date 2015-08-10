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
	var baseurl = 'http://sila.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите фамилию!');
	
	var html = AnyBalance.requestPost(baseurl + 'bonus.php', {
		card: prefs.login,
		fio: prefs.password
	}, addHeaders({Referer: baseurl + 'bonus', 'X-Requested-With': 'XMLHttpRequest'}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var json = getJson(html);
	
	if (!json.bonus || json.bonus == 0) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Вы ввели некорректные данные!');
	}
	
	var result = {success: true};
	
	getParam(json.bonus, result, 'balance', null, null, parseBalance);
	getParam(json.date_end, result, 'till', null, null, parseDateWord);
	
	AnyBalance.setResult(result);
}