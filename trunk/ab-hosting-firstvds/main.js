/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Для этого провайдера требуется AnyBalance 2.8+. Пожалуйста, обновите программу.');

    var baseurl = "https://my.firstvds.ru/manager/billmgr";
    var html;

    if(!prefs.__dbg){
        AnyBalance.setCookie('my.firstvds.ru', 'billmgr4', 'sirius:ru:0');
        
        html = AnyBalance.requestPost(baseurl + '?func=logon', {
            username:prefs.login,
            password:prefs.password,
            lang:'ru',
            func:'auth',
        }, g_headers);
        
	   	if (!/document\.location\s*=\s*"\/manager\/billmgr/i.test(html)) {
			var error = getParam(html, null, null, /error">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + '?sfrom=loginform&sfrom=loginform ', g_headers);
    }
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '?func=dashboard.info&p_cnt=undefined&p_num=1&dashboard=info&sfrom=ajax&operafake=1413790832259', g_headers);
	
    getParam(html, result, 'balance', /"Баланс"(?:[^"]+"){5,20}value"\s*:\s*"([\s\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'forecast', /"Средств хватит до"(?:[^"]+"){5,20}value"\s*:\s*"([\s\d\/-]+)/i, replaceTagsAndSpaces, parseDateISO);

    AnyBalance.setResult(result);
}