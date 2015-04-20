/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Host': 'lk.samaraenergo.ru',
	'Pragma': 'no-cache',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.samaraenergo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.requestGet(baseurl + 'bdisu/public/frameset_top_html.jsp', g_headers);
	var html = AnyBalance.requestGet(baseurl + 'bdisu/startEBPP.sap', addHeaders({Referer: baseurl + 'bdisu/frameset_application.sap'}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'j_username') 
			return prefs.login;
		else if (name == 'j_password')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'bdisu/j_security_check', params, addHeaders({Referer: baseurl + 'bdisu/startEBPP.sap'}));
	
	if (!/Фамилия/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="urMsgBarErr"[^>]*>[\s\S]*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Аутентификация пользователя не выполнена/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var name = getParam(html, null, null, /Имя\s*<\/span>\s*<\/td>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode),
		surname = getParam(html, null, null, /Фамилия\s*<\/span>\s*<\/td>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode),
		patronymic = getParam(html, null, null, /Отчество\s*<\/span>\s*<\/td>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

	getParam([surname, name, patronymic].join(' '), result, 'fio', null, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Номер лицевого счета\s*<\/span>\s*<\/td>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tariffType', /Тип тарифа\s*<\/span>\s*<\/td>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'tariff', /Тариф\s*?<\/[\s\S]*?<\/tr>((?:[\s\S]*?<\/tr>){2})/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable('lastPayment')){
		html = AnyBalance.requestGet(baseurl + 'bdisu/bills.sap?doAction=filter&singleBillIdx=0&billType=3&searchDateId=10000&filterscreen=PAYMENTS&filterfield=NOFILTER&filterfieldtype=ALL&filterlow1=&filterlow2=&filterlow3=&filterhigh1=&filterhigh2=&filterhigh3=&filterselection=&billsdescriptionaccess=&billstotalamountaccessFrom=&billstotalamountaccessTo=&billspayinfoaccess=&paymentExplain=0', addHeaders({Referer: baseurl + 'bdisu/startEBPP.sap?nextpage=getPayments'}));
		getParam(html, result, 'lastPayment', /Название платежа(?:[\s\S]*?<\/tr>){2}((?:[\s\S]*?<\/td>){3})/i, replaceTagsAndSpaces, html_entity_decode);
	}

	if(isAvailable('notPaid')){
		html = AnyBalance.requestGet(baseurl + 'bdisu/startEBPP.sap?nextpage=getBills', addHeaders({Referer: baseurl + 'bdisu/navigation.sap'}));
		getParam(html, result, 'notPaid', /<input[^>]*name="inputSumToPay"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}