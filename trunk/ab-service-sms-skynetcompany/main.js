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

    var baseurl = "http://sms.skynetcompany.com/";
	
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'ru/-utils/login/', {
		'SL':prefs.login,
		'SP':prefs.password,
		'ST':'wide',
	}, g_headers);
    
    if(!/utils\/exit/i.test(html)){
        var error = getParam(html, null, null, /class="message errormsg"><p>([\s\S]*?)<\/p><\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sms', /debet_sms([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тариф:\s*[\s\S]*?([\s\S]*?)\s*<\/div/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'summary', /(Запланированных\s+рассылок[\s\S]*?\s+руб.)/i, replaceTagsAndSpaces, html_entity_decode);
	
    //Возвращаем результат
    AnyBalance.setResult(result);
}
