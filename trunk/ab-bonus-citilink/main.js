/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.citilink.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	var action = getParam(html, null, null, /<form name="mainForm" method="POST" action="([^"]+)/i);
	
	try{
        html = AnyBalance.requestPost(action, {
			email:prefs.login,
			pass:prefs.password,
			passOk:false
        }, addHeaders({Referer: baseurl})); 
    }catch(e){
    	if(prefs.__dbg)
    		html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
    	else
    		throw e;
    }

    if(!/\/logout\//i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="(?:red|msg-error)"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Логин или пароль неверный/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
	
    if(!/<h2[^>]*>Закрома/i.test(html))
        throw new AnyBalance.Error('Для пользования этим провайдером прикрепите бонусную карту к личному кабинету.');
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /<h2[^>]*>Закрома<\/h2>(?:[\s\S](?!<\/td>))*?<p[^>]*>\s*(\d+)\s*бонус/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'new', /ожидают начисления([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'num', /(\d+)\s*товар\S* на сумму/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sum', /\d+\s*товар\S* на сумму([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', [/Статус &laquo;([\s\S]*?)&raquo;? в следующем квартале будет сохранен/i, /Для сохранения статуса([^<]+)по итогам/i], [replaceTagsAndSpaces, /&raquo/ig, '»'], html_entity_decode);

	if(isAvailable(['obrabotannie', 'pomosh', 'reshennie', 'zhalobi', 'rating', 'position', 'nachisleno'])) {
		AnyBalance.trace('Переходим на страницу эксперта..');
		html = AnyBalance.requestGet(baseurl + 'profile/expert/', g_headers);
		
		getParam(html, result, 'obrabotannie', /Количество обработанных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pomosh', /Скольким людям помогли ответы(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'reshennie', /Количество решенных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'zhalobi', /Количество жалоб на эксперта(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'rating', /Ваш рейтинг(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'position', /Ваше место(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'nachisleno', /Начислено бонусов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}
