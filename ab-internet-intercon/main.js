/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://client2.intercon.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'Login.aspx', g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'ctl00$m$lc$tbLogin')
			return prefs.login;
		else if(name == 'ctl00$m$lc$tbPassword')
			return prefs.password;			
		return value;
	});
		
	html = AnyBalance.requestPost(baseurl + 'Login.aspx', params, addHeaders({Referer: baseurl + 'Login.aspx'})); 

    if(!/logoff=1/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true, nextbonuses: ''};
    getParam(html, result, 'balance', /баланс<(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /font[^>]*class="t_b6"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'dogovor', /ctl00_m_rc_ctl00_c_lContract[^>]*>([^:]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc-num', /ctl00_m_rc_ctl00_c_lContract[^>]*>[^>]*счет\s*\[([\s\S]*?)\]<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	
	var table = getParam(html, null, null, /Бонусы будущих периодов[^>]*>\s*(<table[\s\S]*?<\/table>)/i);
	if(table) {
		var tr = sumParam(table, null, null, /(<tr>[\s\S]*?<\/tr>)/ig, replaceTagsAndSpaces, html_entity_decode);
		for(i = 0; i < tr.length; i++) {
			result.nextbonuses += tr[i] + '\n';
		}
	}
	
	
	
	
    AnyBalance.setResult(result);
}