/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function parseDateMy(str) {
	var val;
	if (/Завтра/i.test(str)) {
		var dt = new Date();
		val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
	} else if (/Сегодня/i.test(str)) {
		var dt = new Date();
		val = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
	} else {
		return parseDate(str);
	}
	AnyBalance.trace("Parsed " + val + " from " + str);
	return val && val.getTime();
}

Array.prototype.contains = function(k) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] === k) {
			return true;
		}
	}
	return false;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "http://www.exist.ru/Profile/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', g_headers);
	
    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние цифры номера заказа или не вводите ничего, чтобы получить информацию по последнему заказу');
	
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);
    if(!viewstate)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
    html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx', {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:viewstate,
        __EVENTVALIDATION:eventvalidation,
        ctl00$ctl00$b$b$custLogin$txtLogin:prefs.login,
        ctl00$ctl00$b$b$custLogin$txtPassword:prefs.password,
        ctl00$ctl00$b$b$custLogin$bnLogin:'Ждите...'
    }, addHeaders({Referer: baseurl + 'Login.aspx?ReturnUrl=%2fProfile%2fbalance.aspx'})); 
	
	if(!/\/exit.axd/i.test(html)){
		var error = getParam(html, null, null, /<span[^>]+id="lblError"[^>]*>([\s\S]*?)(?:<\/span>|<a[^>]+href=['"]\/howgetpass.aspx)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'balance', />\s*Счёт:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'code', /'код клиента':\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /'код клиента':\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'debt', />\s*Долг по заказам:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Вроде как этих данных нет больше
	getParam(html, result, 'balancebez', /Безналичный счёт:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'card', /Счёт[^>]*карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'carddebt', /Долг по счёту кредитной карты:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	var singleOrder;
	// Новый формат, по всем позициям в заказе
	if (AnyBalance.isAvailable('ordernum', 'ordersum', 'orderdesc', 'orderstatus', 'orderexpect')) {
    	html = AnyBalance.requestGet(baseurl + 'Orders/default.aspx', g_headers);
    	var trs = sumParam(html, null, null, new RegExp("<tr[^>]*>(?:[\\s\\S](?!</tr>))*?getOrder\\('[^']*\\d*" + (prefs.num || '\\d+') + "'[\\s\\S]*?</tr>", "ig"));
		AnyBalance.trace('Found ' + trs.length + ' items');
		if (!trs || !trs.length) {
			AnyBalance.trace(prefs.num ? 'Не найдено активного заказа с последними цифрами ' + prefs.num : 'Не найдено ни одного активного заказа!');
		} else {
			for(var i = 0; i < trs.length; i++) {
				var tr = trs[i];
				// AnyBalance.trace('Found tr: ' + tr);
				var order = getParam(tr, null, null, /(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
				if(!order) {
					AnyBalance.trace('Не удалось узнать номер заказа, останавливаемся, дальше не идем..');
					break;
				}
				
				// Если номер заказа еще не установлен - установим его
				if(!singleOrder) {
					singleOrder = order;
					getParam(order, result, 'ordernum');
					
					getParam(tr, result, 'orderstatus', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\s*отказаться\s*/i, ''], html_entity_decode);
					
				}
				if(order == singleOrder) {
					AnyBalance.trace('Найденый номер заказа соответствует текущему..');

					sumParam(tr, result, 'ordersum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(tr, result, 'orderexpect', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy, aggregate_min);

					sumParam(tr, result, 'orderdesc', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, function (values, delimiter, allow_empty) {
						if (values.length == 0) 
							return;
						if (!isset(delimiter)) 
							delimiter = '\n';
						var ret = values.join(delimiter);
						if (!allow_empty) 
							ret = ret.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g, '');
						return ret;
					});
				} else {
					AnyBalance.trace('Найденый номер заказа не соответствует текущему..');
				}
			}
		}
    }
	
    AnyBalance.setResult(result);
}