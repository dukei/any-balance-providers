/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseUrl = 'https://cabinet.enpf.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseUrl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = {
        '__VIEWSTATE': AB.getParam(html, null, null, /__viewstate[\s\S]*?value="([^"]*?)"/i),
        '__EVENTTARGET': '__Page',
        '__EVENTARGUMENT': 'btnLogInÝ;' + prefs.login + '±;' + prefs.password + 'Ѿ;'
    };
	
	html = AnyBalance.requestPost(baseUrl, params, AB.addHeaders({Referer: baseUrl}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /не\s+найден\s+вкладчик/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    var savingsSum = AB.getParam(html, null, null, getRegEx('Сумма\\s+пенсионных\\s+накоплений'), AB.replaceTagsAndSpaces, AB.parseBalance),
        startDateIncome = AB.getParam(html, null, null, getRegEx('в\\s+том\\s+числе\\s+инвестиционный\\s+доход'), AB.replaceTagsAndSpaces, AB.parseBalance),
        periodIncome = AB.getParam(html, null, null, getRegEx('инвестиционный\\s+доход\\s+за\\s+период'), AB.replaceTagsAndSpaces, AB.parseBalance),
        total = AB.getParam(html, null, null, getRegEx('Всего'), AB.replaceTagsAndSpaces, AB.parseBalance),
        contributions = savingsSum - startDateIncome + total,
        investIncome = startDateIncome + periodIncome;

	AB.getParam(html, result, 'savings', getRegEx('Итого\\s+пенсионных\\s+накоплений'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(contributions, result, 'contributions');
    AB.getParam(investIncome, result, 'invest_income');
	AB.getParam(html, result, 'ppa_number', getRegEx('№\\s+ИПС'), AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'ppa_start_date', getRegEx('Дата\\s+открытия\\s+ИПС'), AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'uid', getRegEx('ИИН'), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'full_name', getRegEx('ФИО'), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'birth_date', getRegEx('Дата\\s+рождения'), AB.replaceTagsAndSpaces, AB.parseDate);
	
	AnyBalance.setResult(result);
}

function getRegEx(searchValue) {
    var commonPattern = '[\\s\\S]*?<td[^>]*?>([\\s\\S]*?)</td>';
    return new RegExp(searchValue + commonPattern, 'i');
}