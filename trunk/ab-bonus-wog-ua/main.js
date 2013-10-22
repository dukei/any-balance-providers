/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://pride.wog.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'ajax/service.php', {
        card:prefs.login,
        pass:prefs.password,
		func:'GetRemains'
    }, addHeaders({Referer: 'http://pride.wog.ua/rus'}));
	
	var json = getJson(html);
	if(!json || json.Status != 0 || !json.Bonuses.Remains) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	getParam(json.Bonuses.Remains+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}