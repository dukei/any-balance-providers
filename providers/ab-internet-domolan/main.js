
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
};

var baseurl = 'https://www.domolan.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('domolan', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
	   	AnyBalance.trace(html);
	    throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}
	
	if (/\/signin/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();

        var params = [
            ['username',prefs.login],
            ['password',prefs.password],
			['rememberMe','1']
	    ];

        html = AnyBalance.requestPost(baseurl + '/signin', params, AB.addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded',
	    	'Origin': baseurl,
            'Referer': baseurl + '/signin',
            'Upgrade-Insecure-Requests': '1'	
	    }));
	
	    if(!/\/signout/i.test(html)){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');			
	    }
			
		g_savedData.setCookies();
	    g_savedData.save();
		
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'pin', '__tariff', 'speed', 'currency')) {
	    html = AnyBalance.requestGet(baseurl + '/', g_headers);
		
        getParam(html, result, 'balance', /<p>Баланс:[\s\S]*?>([\s\S]*?)<\/span>\s*?<\/p>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'pin', /<p>Ваш PIN код:[\s\S]*?>([\s\S]*?)<\/span>\s*?<\/p>/i, replaceTagsAndSpaces);
	    getParam(html, result, '__tariff', /<div[^>]+class="calculation tariff-update">[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		getParam(html, result, 'speed', /<div[^>]+class="progress-speed">([\s\S]*?)<span class="progress-unit">[\s\S]*?<\/span><\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'speed'], /<span[^>]+class="progress-unit">([\s\S]*?)<\/span><\/div>/i, replaceTagsAndSpaces);
	}
	
	if (AnyBalance.isAvailable('balance_start', 'cab_tv', 'abon', 'pay_month', 'lastpay_sum', 'lastpay_date')) {
	    html = AnyBalance.requestGet(baseurl + '/statistics', g_headers);
		
        getParam(html, result, 'balance_start', /<td>Баланс на 01\.[\s\S]*?<td class="last-cell">([\s\S]*?)<tr>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cab_tv', /<td>Услуга кабельного телевидения[\s\S]*?<td class="last-cell">([\s\S]*?)<tr>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'abon', /<td>Абонентская плата[\s\S]*?<td class="last-cell">([\s\S]*?)<tr>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pay_month', /<td>Пополнение[\s\S]*?<td class="last-cell">([\s\S]*?)<\/tbody>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'lastpay_sum', /<span class="heading">История платежей[\s\S]*<td>[\s\S]*?<td class="last-cell">([\s\S]*?)<\/tbody>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'lastpay_date', /<span class="heading">История платежей[\s\S]*<td>([\s\S]*?)<td>/i, replaceTagsAndSpaces, parseDate);
	}
	
	if (AnyBalance.isAvailable('fio', 'phone', 'block_from')) {
	    html = AnyBalance.requestGet(baseurl + '/profile', g_headers);
		
        getParam(html, result, 'fio', /<td>Фамилия Имя Отчество:[\s\S]*?<td>([\s\S]*?)<td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'phone', /<td>Телефон:[\s\S]*?<td>([\s\S]*?)<td>/i, replaceNumber);
		getParam(html, result, 'block_from', /<td>Блокировка с [\s\S]*?<td>([\s\S]*?)<td>/i, replaceTagsAndSpaces, parseDate);
	}
	
	AnyBalance.setResult(result);
}
