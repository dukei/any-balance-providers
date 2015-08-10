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
    var baseurl = 'http://go.jetswap.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
//    var html = AnyBalance.requestGet(baseurl + 'account', g_headers);
	
	var html = AnyBalance.requestPost(baseurl + 'account', {
        user:prefs.login,
        pss:prefs.password,
        qs:''
    }, addHeaders({Referer: baseurl + 'account'})); 

    var uniqueid;
   	uniqueid = AnyBalance.getData('uniqueid', null);

    if(!uniqueid){
    	uniqueid = AnyBalance.requestGet(baseurl + 'uniqueid.php', addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + 'account'}));
   		AnyBalance.setData('uniqueid', uniqueid);
   		AnyBalance.saveData(); 
    }

   	AnyBalance.setCookie('go.jetswap.com', 'jetuserid', uniqueid);

    html = AnyBalance.requestPost(baseurl + 'account', {evc: uniqueid, fnp: hex_md5(uniqueid)}, addHeaders({Referer: baseurl + 'account'}));
	
    if(!/cmd=logout/i.test(html)) {
        var error = getParam(html, null, null, /Ошибка:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


	
    var result = {success: true};
    getParam(html, result, 'balance', /Деньги[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred', /Список рефералов[\s\S]*?Кредиты[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Список рефералов[\s\S]*?Бонусы[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Статус:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'refs', /Всего рефералов([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'refs_pcts', /Процент с рефералов:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'earned_today', /Вы заработали кредитов в серфинге сегодня[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'earned_month', /Вы заработали кредитов в серфинге сегодня[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	
    AnyBalance.setResult(result);
}