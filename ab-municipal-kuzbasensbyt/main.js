/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {

	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Origin':'http://www.kuzesc.ru:7777',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'Cache-Control':'max-age=0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.kuzesc.ru:7777/pls/apex/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'f?p=100:1', g_headers);

    var tform = getParam(html, null, null, /<form[^>]+name="wwv_flow"[^>]*>[\s\S]*?<\/form>/i);
    if(!tform)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(tform, function(params, str, name, value){
		if(/id="P101_USERNAME"/i.test(str))
			return prefs.login;
        if(/id="P101_PASSWORD"/i.test(str))
			return prefs.password;
		if(name == 'p_request')
			return 'LOGIN';
		return value;
	}, true);
    html = AnyBalance.requestPost(baseurl + 'wwv_flow.accept', params, addHeaders({Referer: baseurl + 'f?p=100:1'}));

    if(!/exit\.gif/i.test(html)){
        var error = getParam(html, null, null, /<table class="tbl-body"[\s\S]*?<H2>([\s\S]*?)<\/H2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	var table = getParam(html, null, null, /<table[^>]*class="report-standard-alternatingrowcolors"[\s\S]*?<\/table>/i);
    if(!table)
        throw new AnyBalance.Error('Не удалось найти таблицу с данными, возможно у Вас нет данных, либо Ваш тариф не поддерживается, в таком случае свяжитесь с автором провайдера.');

    var result = {success: true};
	// Баланс
	getParam(html, result, 'balance', /Ваша (?:переплата|задолженность)[\s\S]*?по показан[\s\S]*?составляет([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	// Текущие показания 
	getParam(html, result, 'current', /Ваша (?:переплата|задолженность)[\s\S]*?по показан([\s\S]*?)составляет/i, replaceTagsAndSpaces, parseBalance);
	// Список формируется так, что последняя запись находится внизу, надо почитать все ряды в таблице и узнать какой из них последний
	var periods = sumParam(html, null, null, /(<tr\s*class="highlight-row">[\s\S]*?<\/tr>)/ig, null, html_entity_decode, null);

	var tableTitles = sumParam(html, null, null, /<th[^>]*COL[^>]*>([\s\S]*?)<\/th>/ig);	
	if(prefs.period == 'prev')
		html = periods[periods.length-2];	
	else
		html = periods[periods.length-1];

	var tableElements = sumParam(html, null, null, /<td[^>]*>([\s\S]*?)<\/td>/ig);
	
	for(i = 0; i < tableTitles.length; i++){
		var curr = tableTitles[i];
		if(curr.indexOf('Период расчёта') > -1)
			getParam(tableElements[i], result, 'period', null, replaceTagsAndSpaces, html_entity_decode);
		else if(curr.indexOf('Сальдо на начало периода') > -1)
			getParam(tableElements[i], result, 'saldo', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Показания на начало периода') > -1)
			getParam(tableElements[i], result, 'pokazaniya', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Показания на конец периода') > -1)
			getParam(tableElements[i], result, 'pokazaniya_end', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Расход, кВтч') > -1)
			getParam(tableElements[i], result, 'rashod', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Тариф') > -1)
			getParam(tableElements[i], result, 'tarif', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Начислено за период, руб') > -1)
			getParam(tableElements[i], result, 'nachisleno', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Оплачено за период') > -1)
			getParam(tableElements[i], result, 'oplacheno', null, replaceTagsAndSpaces, parseBalance);
		else if(curr.indexOf('Сальдо на конец периода') > -1)
			getParam(tableElements[i], result, 'saldo_end', null, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}