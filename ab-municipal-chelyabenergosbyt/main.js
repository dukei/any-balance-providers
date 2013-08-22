/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://cabinet.esbt.ru/';
	var html = AnyBalance.requestPost(baseurl + 'Present-web/login.action', {
		'onload_event':"setFocusField('username')",
		'username':prefs.login,
		'password':prefs.password,
	}, g_headers);
    
	if(!/loadingText="Загрузка/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	var result = {success: true};
	
	if(isAvailable(['agreement', 'fio']))
	{
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/menu.action?dojo.preventCache=1376998876150');

		getParam(html, result, 'agreement', /"testForm_useraccountid"\s*class="app_form_text">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'fio', /Имя[\s\S]*?"app_form_text">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);		
	}
	// Баланс всегда нужен
	html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/updateBalance.action?dojo.preventCache=1376998876150');
	getParam(html, result, 'balance', /руб:[\s\S]*?class="send_error">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['lastpaydate', 'lastpaysum']))
	{
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/my_summary/paymentHistory.action?dojo.preventCache=1376998876150');
		getParam(html, result, 'lastpaydate', /Дата платежа[\s\S]*?(?:[\s\S]*?<td[^>]*>){1}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);	
		getParam(html, result, 'lastpaysum', /Дата платежа[\s\S]*?(?:[\s\S]*?<td[^>]*>){3}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	}
	if(isAvailable(['lastcounterdate', 'lastcounterday', 'lastcounternight', 'lastcounterpik', 'lastcounterstatus']))
	{
		html = AnyBalance.requestGet(baseurl + 'Present-web/consumer/countervalue/showAccountCounterValues.action?clearsessionhelper=true&dojo.preventCache=1377159328001');
		getParam(html, result, 'lastcounterdate', /Дата(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);	
		// Показания ДЕНЬ
		getParam(html, result, 'lastcounterday', /Дата(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		// Показания НОЧЬ
		getParam(html, result, 'lastcounternight', /Дата(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		// Показания ПИК
		getParam(html, result, 'lastcounterpik', /Дата(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);		
		//Статус
		getParam(html, result, 'lastcounterstatus', /Дата(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);		
	}
    AnyBalance.setResult(result);
}