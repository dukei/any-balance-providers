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

    var baseurl = 'https://lk.ensbyt.ru/';
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'security_check', {
		'j_username':prefs.login,
		'j_password':prefs.password,
	}, g_headers);
	
    if(!/logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	getParam(html, result, 'fio', /<title>\s*([\s\S]*?)\s{2,}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /<div class="payer-name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<div class="payer-name">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);	
	// Долг/переплата
    getParam(html, result, 'dolg', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){1}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	// Оплачено
	getParam(html, result, 'opl', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){2}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	// Кол-во/ объем потребления
	getParam(html, result, 'potreblenie', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){3}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);	
	// Начислено
	getParam(html, result, 'nachisleno', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){4}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	// Перерасчеты 
	getParam(html, result, 'pererascheti', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){5}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	// Сумма к оплате
	getParam(html, result, 'balance', /Итого[\s\S]*?(?:[\s\S]*?<th[^>]*>){6}[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	//html = AnyBalance.requestGet(baseurl + 'abonent/persInfo.xhtml', g_headers);
	//Величина тарифа:
    getParam(html, result, '__tariff', /Величина тарифа:[\s\S]*?(<table>[\s\S]*?<\/table>)/i, replaceTagsAndSpaces, html_entity_decode);
	// Однотарифный, Двухтарифный, Трехтарифный
	var type = getParam(html, null, null, /Тариф[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, null, null);
	
	
	/*if(isAvailable(['lastdate', 'lastsum']))
	{
		html = AnyBalance.requestGet(baseurl + 'abonent/paysInfo.xhtml', g_headers);
		var table = getParam(html, null, null, /(<tbody id="t_pays:tbody_element">[\s\S]*?<\/tbody>)/i, null, null);
		if(!table){
			AnyBalance.trace('не нашли таблицу с платежами, если платежи у вас есть - свяжитесь с автором провайдера');
		}else{
		    getParam(table, result, 'lastdate', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		    getParam(table, result, 'lastsum', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
                }
	}
    if(isAvailable(['lastcounter', 'lastcounter1', 'lastcounter2']))
	{
		html = AnyBalance.requestGet(baseurl + 'abonent/counter.xhtml', g_headers);
		var table = getParam(html, null, null, /(<table id="r_ctr:0:t_pok"[\s\S]*?<\/tbody><\/table>)/i, null, null);
		if(!table){
			AnyBalance.trace('не нашли таблицу с показаниями счетчиков, если показания у вас есть, свяжитесь с автором провайдера');
		}else{	
			getParam(table, result, 'lastcounter', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			
			if(type.toLowerCase().indexOf("двухтарифный") != -1)
				getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			
			if(type.toLowerCase().indexOf("трехтарифный") != -1)
			{	
				getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(table, result, 'lastcounter2', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			}
                }
	}*/
    AnyBalance.setResult(result);
}