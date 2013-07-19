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
    var baseurl = 'http://www.miit.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'ajax_api_login', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl + 'ajax_api_login'})); 

    if(!/authorisationSuccess/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'office_new', g_headers);

	// Теперь таблица услуг
	var table = getParam(html, null, null, /(<table class="pc_table">[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не найдена таблица услуг. Обратитесь к автору провайдера по имейл.');

	var result = {success: true};
    getParam(html, result, 'fio', /<div class="pc_clientname">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Общий баланс[\s\S]{1,100}<td class="border_vertical">[\s\S]{1,100}">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	var re = /(<tr class="pc_table_line">[\s\S]*?<\/tr>)/ig;
	html.replace(re, function(tr)
	{
		if(AnyBalance.isSetResultCalled())
			return; //Если уже вернули результат, то дальше крутимся вхолостую

		var accnum = (prefs.accnum || '').toUpperCase();
		var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		
		if(!prefs.accnum || (acc && acc.toUpperCase().indexOf(accnum) >= 0))
		{
			getParam(tr, result, 'usluga', /(?:[\s\S]*?<td[^>]*>){1}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'usluga_balance', /(?:[\s\S]*?<td[^>]*>){4}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){5}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'acc_num', /(?:[\s\S]*?<td[^>]*>){2}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}\s*(?:<b>|<[\s\S]*?class="green"[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|<\/span>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			
			AnyBalance.setResult(result);
			return;
		}
	});

    AnyBalance.setResult(result);
}