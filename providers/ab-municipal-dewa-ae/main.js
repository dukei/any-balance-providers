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
    var baseurl = 'https://portal.dewa.gov.ae/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'irj/portal/anonymous/onbp', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'irj/portal/anonymous/onbp', {
		'lang':'en',
		'guest_user':'null',
		'login_submit':'on',
		'login_do_redirect':'1',
		'no_cert_storing':'on',
		'j_user':prefs.login,
		'j_password':prefs.password,
		'j_authscheme':'default',
		'uidPasswordLogon':'Login',
    }, addHeaders({Referer: baseurl + 'irj/portal/anonymous/onbp'})); 

    if(!/Logout/i.test(html)){
        throw new AnyBalance.Error('Login failed, is site changed?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /totalamt[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'electricity', /Row">\s*Electricity[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);
	getParam(html, result, 'water', /Row">\s*Water[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);
	getParam(html, result, 'sewerage', /Row">\s*Sewerage[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);
	getParam(html, result, 'housing', /Row">\s*Housing[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);
	getParam(html, result, 'cooling', /Row">\s*Cooling[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);
	getParam(html, result, 'other', /Row">\s*Other Charges[\s\S]*?class="center">\s*([^<]*)/i, null, parseBalance);

    AnyBalance.setResult(result);
}