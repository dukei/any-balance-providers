/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(/^\d{13}$/.test(prefs.login), 'Введите 13 цифр номера карты без пробелов и разделителей!');
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://krasnoeibeloe.ru/";
	
    var incapsule = Cloudflare(baseurl + 'discount/?old=Y');
	var html = AnyBalance.requestGet(baseurl + 'discount/?old=Y', g_headers);
    if(incapsule.isCloudflared(html))
        html = incapsule.executeScript(html);
	
	var form = getElements(html, [/<form[^>]*card_reg_form[^>]*>/ig, /<input[^>]+sessid/i])[0];
    var sessid = getParam(form, null, null, /name="sessid"[\s\S]*?value="([^"]+)/i);
    	
    html = AnyBalance.requestPost(baseurl + 'discount/?old=Y', {
        'sessid': sessid,
        'card_number1': '2',
        'card_number2': prefs.login.substr(1, 6),
        'card_number3': prefs.login.substr(7, 6),
        'card_number': '',
        'card_submit': 'Узнать'
    }, addHeaders({Referer: baseurl + 'discount/?old=Y'}));
	
	if (!/По данным на/i.test(getElement(html, /<div[^>]+bl_result_nomer_text[^>]*>/i))) {
		var error = getParam(html, null, null, /<div[^>]+bl_result_nomer_text[^>]*>([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Данных по карте не найдено/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	

    var result = {success: true};
	
	getParam(html, result, 'discount', /<div[^>]+bl_result_nomer_procent[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sumleft', /накопить еще([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nextdis', /До скидки([\s\d,.%]+)Вам необходимо/i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, '__tariff', null, [/(\d)(\d{6})(\d{6})/, '$1-$2-$3']);

    AnyBalance.setResult(result);
}