/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wk.rcurala.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == 'Login1$UserName')
			return prefs.login;
		else if(name == 'Login1$Password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx', params, addHeaders({Referer: baseurl + 'login.aspx'}));
	
	if(!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]*color:Red[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неудачная попытка входа/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){1,4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){1,4}[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Заходим на страницу детализации
	html = AnyBalance.requestGet(baseurl + 'FL/historyOfPayment.aspx', g_headers);
	params = createFormParams(html);
	
	var select = getParam(html, null, null, /<select[^>]*name="ctl00\$ContentPlaceHolder1\$ddlLS" [^>]*>([\s\S]*?)<\/select>/i);
	if(select) {
		AnyBalance.trace('Нашли выбор счетов...');
		var items = sumParam(select, null, null, /<option[^>]*value="(\d+)/ig);
		
		AnyBalance.trace('Всего счетов: ' + items.length);
		
		for(var i = 0; i < items.length; i++) {
			var curr = items[i];
			
			if(prefs.account_num) {
				// Ищем нужный
				if(endsWith(curr, prefs.account_num)) {
					params['ctl00$ContentPlaceHolder1$ddlLS'] = curr;
					params['ctl00$ContentPlaceHolder1$ScriptManager2'] = 'ctl00$ContentPlaceHolder1$ScriptManager2|ctl00$ContentPlaceHolder1$btnView';
					AnyBalance.trace('Номер счета выбран: ' + curr + ' в настройках указан: ' + prefs.account_num);
					
					getParam(curr, result, 'acc_num');
					break;
				} else {
					AnyBalance.trace('Номер счета ' + curr + ' не подходит ' + prefs.account_num);
				}
			} else {
				params['ctl00$ContentPlaceHolder1$ddlLS'] = curr;
				AnyBalance.trace('Номер счета не указан, выбран автоматически: ' + curr);
				getParam(curr, result, 'acc_num');
				break;
			}
		}
	}
	
	params['ctl00$ContentPlaceHolder1$Bdate'] = getMonthDate(true);
	params['ctl00$ContentPlaceHolder1$Edate'] = getMonthDate();
	
	html = AnyBalance.requestPost(baseurl + 'FL/historyOfPayment.aspx', params, addHeaders({Referer: baseurl + 'FL/historyOfPayment.aspx'}));
	
	var table = getParam(html, null, null, /(<table[^>]*id="ctl00_ContentPlaceHolder1_gvSel"[\s\S]*?<\/table>)/i);
	checkEmpty(table, 'Нет данных о последних платежах за текущий период', true);
	
	getParam(table, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}

function getMonthDate(prev) {
	var months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
	var dt = new Date();
	var month = dt.getMonth();
	var year = dt.getFullYear();
	
	if(prev) {
		if(month == 0)
			month = 12;
		
		return months[month-1] + ' ' + year;
	} else {
		return months[month] + ' ' + year;
	}
}