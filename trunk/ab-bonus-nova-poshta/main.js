/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
};

function main(){
	var baseurl = 'https://my.novaposhta.ua/';
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.email, 'Введите логин!');
	checkEmpty(prefs.passw, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?r=auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
    var html = AnyBalance.requestPost(baseurl + '?r=auth/index', {
    	"LoginForm[username]": prefs.email,
        "LoginForm[password]": prefs.passw,
		'LoginForm[remember]':0,
		'yt0':'Увійти'
    }, addHeaders({'Referer' : baseurl + '?r=auth'}));
	
    if (!/Налаштування/i.test(html)) {
    	var error = getParam(html, null, null, /<div class="errorSummary">\s*<ul>\s*<li>([\s\S]*)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    	if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	
	html = AnyBalance.requestPost(baseurl + '?r=loyaltyUser/index');
	// ФИО
	getParam(html, result, '__tariff', /<th>Власник:<\/th>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	// Номер карты
	getParam(html, result, 'ncard', /<th>Номер картки лояльності:<\/th>\s*<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	html = AnyBalance.requestPost(baseurl + '?r=loyaltyUser/turnover');
	// Балы
	sumParam(html, result, 'balance', /<th>Залишок балів:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'balance_all', /<th>Всього балів:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	// Скидка
	sumParam(html, result, 'discount', /<th>Доступна знижка, грн.:<\/th>\s*<td>(\d+.\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	// Кол-во отправок
	sumParam(html, result, 'send', /<th>Кількість ТТН:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	// Статус
	getParam(html, result, 'status', /<th>Статус Учасника:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status_next', /<th>Наступний статус:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.setResult(result);
}