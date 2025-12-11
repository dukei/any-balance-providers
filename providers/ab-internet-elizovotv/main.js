/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://inet.elizovotv.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var forms = getElements(html, /<form[^>]+method=\"post\"[^>]*>/ig);
	
	if(!forms){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти формы входа. Сайт изменен?');
    }
	
	var form;
	
	for(var i=0; i<forms.length; ++i){
		if(/Логин ИНТЕРНЕТ/i.test(forms[i])){ // Пока нужна только форма интернет-кабинета
			form = getElement(html, /<form[^>]*>/i);
			
			break;
		}
	}
	
    if(!form){
        AnyBalance.trace(forms);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'user') {
	   		return prefs.login;
    	}else if(name == 'pswd'){
	    	return prefs.password;
	    }
        	        
	    return value;
	});
		
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': baseurl + '/'
	}));
	
	if(!/action=Exit/i.test(html)){
		var error = getParam(html, /<div[^>]+idDiv[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|номер|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var menu = getElement(html, /<div[^>]+class="menu"[^>]*>[\s\S]*?<ul[^>]*>/i); // Получаем меню главной страницы...
	var aaa = getElements(menu, /<a[^>]*>/ig); // ... и все ссылки из меню
	
	var hrefGetBalance, hrefChangeTariff, hrefContractParameters, url, contractId;
	
	if(aaa.length && aaa.length > 0){
		AnyBalance.trace('Найдено пунктов меню: ' + aaa.length);
		for(var i=0; i<aaa.length; ++i){
	    	var a = aaa[i];
			var href = getParam(a, null, null, /<a[^>]+href="([^"]*)/i, replaceHtmlEntities);
			
			if(/Просмотр баланса|GetBalance/i.test(a)){
			    hrefGetBalance = href;
			}else if(/Смена тарифного плана|hrefChangeTariff/i.test(a)){
				hrefChangeTariff = href;
			}else if(/Правка контактных данных|hrefContractParameters/i.test(a)){
				hrefContractParameters = href;
			}
	    }
	}else{ // Если ссылки получить не удалось, пробуем получить хотя бы contractId, а ссылки использовать фиксированные
		AnyBalance.trace('Не удалось получить ссылки меню. Пробуем получить данные через contractId');
		contractId = getParam(html, null, null, /contractId\s?=\s?([\s\S]*?)[\;|\"]/i, replaceTagsAndSpaces);
	}
	
	url = hrefGetBalance || '/webexecuter?action=GetBalance&mid=0&module=contract&contractId=' + contractId;
	
	html = AnyBalance.requestPost(joinUrl(baseurl, url), addHeaders({'Referer': baseurl + '/webexecuter'}));
	
	getParam(html, result, 'balance', /<td[^>]*>Входящий остаток на начало месяца[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'monthly_arrival', /<td[^>]*>Приход за месяц[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly_expense', /<td[^>]*>Расход за месяц[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly_operating', /<td[^>]*>Наработка за месяц[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'unlim_abon', /<td[^>]*>Абонплата за Безлимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoing_balance', /<td[^>]*>Исходящий остаток[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /<td[^>]*>Лимит[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', /Договор №\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var dt = new Date();
	var month = getParam(html, null, null, /month="([^"]*)/i, replaceTagsAndSpaces) || (dt.getMonth() + 1);
	var year = getParam(html, null, null, /year="([^"]*)/i, replaceTagsAndSpaces) || dt.getFullYear();
	
	var monthes = {1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь', 7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'}
	getParam(monthes[month] + ' ' + year, result, 'period');
	
	var table = getElement(html, /<table[^>]+balanceList[^>]*>/i);
	var items = getElements(table, [/<tr[^>]*>/ig, /\d+\.\d+\.\d{4}|\d{4}-\d+-\d+/i]);
	
	if(items.length && items.length > 0){
		AnyBalance.trace('Найдено приходов: ' + items.length);
		for(var i=items.length-1; i>=0; i--){ // Последний приход ищем с конца
			var item = items[i];
			
			if(/\d{4}-\d+-\d+/i.test(item)){
			    getParam(item, result, 'last_arrival_date', /<td[^>]*>(\d{4}-\d+-\d+)[\s\S]*?<td[^>]*>[\s\S]*?<\/td>/i, replaceTagsAndSpaces, parseDateISO);
			}else if(/\d+\.\d+\.\d{4}/i.test(item)){
				getParam(item, result, 'last_arrival_date', /<td[^>]*>(\d+\.\d+\.\d{4})[\s\S]*?<td[^>]*>[\s\S]*?<\/td>/i, replaceTagsAndSpaces, parseDate);
			}
			getParam(item, result, 'last_arrival_sum', /<td[^>]*>(?:\d+\.\d+\.\d{4}|\d{4}-\d+-\d+)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(item, result, 'last_arrival_type', /<td[^>]*>(?:\d+\.\d+\.\d{4}|\d{4}-\d+-\d+)[\s\S]*?<i[^>]*>\s*\(?([\s\S]*?)\)?\s*<\/i>/i, replaceTagsAndSpaces);
			
			break;
	    }
	}else{
		AnyBalance.trace('Не удалось получить данные по приходам');
	}
	
	url = hrefChangeTariff || '/bgbilling/webexecuter?action=ChangeTariff&mid=0&module=contract&contractId=' + contractId;
	
	html = AnyBalance.requestPost(joinUrl(baseurl, url), addHeaders({'Referer': baseurl + '/webexecuter'}));
	
	getParam(html, result, '__tariff', /<td><font>([\s\S]*?)<\/font><\/td>/i, replaceTagsAndSpaces); // Неактивные тарифные планы выделены цветом, поэтому font должен быть без стиля
    
	url = hrefContractParameters || '/bgbilling/webexecuter?action=ContractParameters&mid=0&module=contract&contractId=' + contractId;
	
	html = AnyBalance.requestPost(joinUrl(baseurl, url), addHeaders({'Referer': baseurl + '/webexecuter'}));
	
	getParam(html, result, 'address', /<td[^>]*>Адрес ИНЕТ[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'email', /<td[^>]*>E-mail[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<td[^>]*>Телефон[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceNumber);
	getParam(html, result, 'fio', /<td[^>]*>Ф\.И\.О\. пользователя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	
	AnyBalance.setResult(result);
}
