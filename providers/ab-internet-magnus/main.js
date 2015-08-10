/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0',
	'Content-Type':'application/x-www-form-urlencoded',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://bill.magnus.net.ua/';
    AnyBalance.setDefaultCharset('windows-1251'); 
	
	var html = AnyBalance.requestPost(baseurl + 'user/index.php', {
        'type':'userlogin',
		us_abon_login:prefs.login,
        us_abon_pass:prefs.password,
    }, addHeaders({Referer: baseurl + 'user/index.php'})); 
	
    if(!/Выход/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id="[^"]*login_page_alert_inside[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /class="lk_lk_userdata"><b>([\s\S]*?)<\/b><br>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тариф: <b>([\s\S]*?).\(/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс.*?label_h2\">([\s\S]*?)<\/span><br>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abonplata', /Тариф.*\(([\s\S]*?)ежедневно\)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'state', /Состояние:([\s\S]*?)<\/b><br>/i, replaceTagsAndSpaces);
	getParam(html, result, 'ip', /IP:([\s\S]*?)<\/b><br>/i, replaceTagsAndSpaces);
	getParam(html, result, 'currency', /Баланс.*?label_h2\">([\s\S]*?).<\/span><br>/i, replaceTagsAndSpaces, parseCurrency);

    AnyBalance.setResult(result);
}