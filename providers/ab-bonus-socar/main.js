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
    var baseurl = 'http://socar.secureprofile.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var	html = AnyBalance.requestPost(baseurl + 'Account/LogOn/', {
        UserName:prefs.login,
        Password:prefs.password,
        RememberMe:'false'
    }, g_headers); 

    if(!/Account\/Profile/i.test(html)){
        var error = getParam(html, null, null, /class="validation-summary-errors"><ul><li>([\s\S]*?)<\/li>/i, null, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	getParam(html, result, 'balance', /Всего бонусов на счету[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	
	
	getParam(html, result, 'akt', /Из них активных[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'non_akt', /Не активных[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'income_total', /Всего начислено[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'expense_total', /Всего потрачено[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	
	
	getParam(html, result, '__tariff', /Номер[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус[\s\S]{1,200}value="([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /(<a id="ProfileMenuLauncher[\s\S]*?[\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}