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
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);
	
	var params = AB.createFormParams(html, function(params, str, name, value) {
		if(/UserName$/i.test(name))
			return prefs.login;
		else if(/Login1\$Password$/i.test(name))
			return prefs.password;
		return value;
	});
       
        // два атрибута name в текстовом поле UserName
        var inputName = AB.getParam(html, null, null, /<input[^>]*?name\s*=\s*"[^"]*UserName"[^>]*>/i);
        if (inputName) {
            var match, rxName = /\bname="([^"]+)"/g;
            while (match = rxName.exec(inputName)) {
                params[match[1]] = prefs.login;
            }
        }
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx', params, addHeaders({Referer: baseurl + 'login.aspx'}));
        
        function selectId(html, selector, replace, parse) {
            selector = selector.split('#');
            var tag = selector[0] || '[a-z1-6]+';
            var id = selector[1];
            return AB.getElement(html, RegExp('<' + tag + '(?=\\s)[^>]*?\\sid\\s*=\\s*"[^"]*?' + id + '"[^>]*>', 'i'), replace, parse);
        }
        
        var userFIOElem = selectId(html, 'span#txtFio', AB.replaceTagsAndSpaces);
        
	if(!userFIOElem) {
                var error = selectId(html, 'span#alertRegistrationText', AB.replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /(пользовател|парол).*правильн/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(userFIOElem, result, 'fio');
	AB.getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){1,4}[^>]*value="([^"]*)/i, AB.replaceTagsAndSpaces);
	
	// Заходим на страницу детализации
	html = AnyBalance.requestGet(baseurl + 'FL/historyOfPayment.aspx', g_headers);
	params = AB.createFormParams(html);
	
	var select = selectId(html, 'select#ddlLS');
        
	if(select) {
		AnyBalance.trace('Нашли выбор счетов...');
		var items = AB.sumParam(select, null, null, /<option[^>]*value="(\d+)/ig);
		
		AnyBalance.trace('Всего счетов: ' + items.length);
		
		for(var i = 0; i < items.length; i++) {
			var curr = items[i];
			
			if(prefs.account_num) {
				// Ищем нужный
				if(AB.endsWith(curr, prefs.account_num)) {
					params['ctl00$ContentPlaceHolder1$ddlLS'] = curr;
					params['ctl00$ContentPlaceHolder1$ScriptManager2'] = 'ctl00$ContentPlaceHolder1$ScriptManager2|ctl00$ContentPlaceHolder1$btnView';
					AnyBalance.trace('Номер счета выбран: ' + curr + ' в настройках указан: ' + prefs.account_num);
					
					AB.getParam(curr, result, 'acc_num');
					break;
				} else {
					AnyBalance.trace('Номер счета ' + curr + ' не подходит ' + prefs.account_num);
				}
			} else {
				params['ctl00$ContentPlaceHolder1$ddlLS'] = curr;
				AnyBalance.trace('Номер счета не указан, выбран автоматически: ' + curr);
				AB.getParam(curr, result, 'acc_num');
				break;
			}
		}
	}
	
	params['ctl00$ContentPlaceHolder1$Bdate'] = getMonthDate(true);
	params['ctl00$ContentPlaceHolder1$Edate'] = getMonthDate();
        
        
	
	html = AnyBalance.requestPost(baseurl + 'FL/historyOfPayment.aspx', params, AB.addHeaders({Referer: baseurl + 'FL/historyOfPayment.aspx'}));
	
	var table = selectId(html, 'table#gvSel');
	AB.checkEmpty(table, 'Нет данных о последних платежах за текущий период', true);
	
	AB.getParam(table, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}

function getMonthDate(prev) {
	var months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
	var dt = new Date();
	var month = dt.getMonth();
	var year = dt.getFullYear();
	
	if(prev) {
		if(month == 0) {
			month = 12;
                        year--;
                    }
		
		return months[month-1] + ' ' + year;
	} else {
		return months[month] + ' ' + year;
	}
}