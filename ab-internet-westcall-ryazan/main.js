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
    var baseurl = 'https://cabinet.westcall-rzn.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

   html = AnyBalance.requestPost(baseurl + 'cgi-bin/clients/login', {
        login:prefs.login,
		password:prefs.password,
		'action':'validate',
		'submit':'Вход'
    }, g_headers); 
	
    if(!/action=logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'fio', /<b>([\s\S]*?),/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc_num', /счет N\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'recomended', /Рекомендуемый платеж([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Ваш баланс([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	
	// переходим на стрницу Услуги
    var href = getParam(html, null, null, /<a class="" href="([\s\S]*?)">\s*Услуги/i, null, html_entity_decode);
	if(href)
	{
		html = AnyBalance.requestGet(baseurl+href, g_headers);
		getParam(html, result, 'sess', /Месяц:(?:[\s\S]*?<td[^>]*>){18}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'incoming_traf', /Месяц:(?:[\s\S]*?<td[^>]*>){19}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMy);
		getParam(html, result, 'outgoing_traf', /Месяц:(?:[\s\S]*?<td[^>]*>){20}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMy);
		var href = getParam(html, null, null, /Интернет\s*\(\d+\)[\s\S]*?<li><a href="([\s\S]*?)"/i, null, html_entity_decode);
		if(href)
		{
			html = AnyBalance.requestGet(baseurl+href, g_headers);
			getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'deadline', /Дата окончания расчетного периода:[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, replaceTagsAndSpaces, parseDateISO);

		}
	}
    AnyBalance.setResult(result);
}
function parseTrafficMy(str){
    return parseTrafficGb(str, 'b');
}