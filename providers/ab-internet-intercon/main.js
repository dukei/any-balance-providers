/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
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
	
	getParam(html, result, 'fio', /font[^>]*class="t_b6"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// <div(?:[^>]+>){3}\d+6275(?:[\s\S]*?<\/table){1,2}
	var digits = prefs.digits || '';
	var tr = getParam(html, null, null, new RegExp('<div(?:[^>]+>){3}\\d+'+ digits +'(?:[\\s\\S]*?</table){1,2}', 'i'));
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.digits ? 'счет с последними цифрами ' + prefs.digits : 'ни одного счета. Сайт изменен?'));

	getParam(tr, result, 'balance', /баланс<(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'dogovor', /ctl00_m_rc_ctl01_c_lContract"[^>]*class="tb_1"[^>]*>([^:]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'acc-num', /ctl00_m_rc_ctl01_c_lContract"[^>]*class="tb_1"[^>]*>[^>]+>(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /ТП:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('nextbonuses_summ')) {
		var table = getParam(html, null, null, /Бонусы будущих периодов[^>]*>\s*(<table[\s\S]*?<\/table>)/i);
		if(table) {
			sumParam(table, result, 'nextbonuses_summ', /(?:[\s\S]*?<td[^>]*>){4}([^<]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		
			var tr = sumParam(table, null, null, /(<tr>[\s\S]*?<\/tr>)/ig, replaceTagsAndSpaces, html_entity_decode);
			for(i = 0; i < tr.length; i++) {
				result.nextbonuses += tr[i] + '\n';
			}
			result.nextbonuses = result.nextbonuses.replace(/^\s+|\s+$/g, '');
		}	
	}
    AnyBalance.setResult(result);
}