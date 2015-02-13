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
    checkEmpty(prefs.login, 'Введите номер карты!');
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.krasnoeibeloe.ru/";
	
    var incapsule = Cloudflare(baseurl + 'discount/?old=Y');
	var html = AnyBalance.requestGet(baseurl + 'discount/?old=Y', g_headers);
    if(incapsule.isCloudflared(html))
        html = incapsule.executeScript(html);
	
	var form = getParam(html, null, null, /<form action="[^"]*" method="POST"(?:[^>]*>)[\s\S]*?<\/form>/i);
    var bxajaxid = getParam(form, null, null, /name="bxajaxid"[\s\S]*?id="([^"]+)/i);
    var sessid = getParam(form, null, null, /name="sessid"[\s\S]*?value="([^"]+)/i);
	
    html = AnyBalance.requestPost(baseurl + 'discount/?old=Y', {
        'bxajaxid': bxajaxid,
        'AJAX_CALL': 'Y',
        'sessid': sessid,
        'card_number': prefs.login,
        'card_submit': 'Узнать'
    }, addHeaders({Referer: baseurl + 'discount/?old=Y'}));
	
	if (!/Скидка по вашей карте(?:[^>]*>)[1-9][0-9]*%/i.test(html)) {
		var error = getParam(html, null, null, /"white-ramka"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Данных по карте не найдено/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	

    var result = {success: true};
	
	getParam(html, result, 'discount', /Скидка по вашей карте(?:[^>]*>)([0-9]+%)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sumleft', /Вам необходимо накопить еще([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nextdis', /До скидки([\s\d,.%]+)Вам необходимо накопить еще/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}