/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://utm.xn--80aa3a0ag.xn--80asehdb/';
	AnyBalance.setDefaultCharset('utf-8');

	var xml = AnyBalance.requestPost(baseurl, {
		user:prefs.login,
		passwd:prefs.password,
    }, g_headers);
	
	var str_end = -1 ;
	var str_begin = xml.indexOf( '<div id=info_message>' );
	if( str_begin != -1 ){
		str_begin = xml.indexOf('<div class=err_message>Ошибка</div>' , str_begin );
		if( str_begin != -1 ){
			str_begin = xml.indexOf( '<div><img src="/img/attention.png" border="0" hspace="10" dir="ltr" alt="Error">' ,str_begin );
			if( str_begin != -1 ){
				str_end = xml.indexOf( '</div>' , str_begin );
				if( str_end != -1 ){
					var result = {success: true, balance: parseFloat(xml.substring(str_begin+80 , str_end  ))};
	
					AnyBalance.setResult(result);
					return;
				}
			}
		}
		
	}
	
	str_begin = xml.indexOf( "<TR><TD class='utm-cell'><b>Баланс:</b></TD><TD>" );
	if( str_begin != -1 ){
		str_end = xml.indexOf( '&nbsp;',str_begin );
		if( str_end != -1 ){
			var result = {success: true, balance: parseFloat(xml.substring(str_begin+44 , str_end))};
			
			AnyBalance.setResult(result);
		}
	}

	if(!AnyBalance.isSetResultCalled()){
		AnyBalance.trace(xml);
		throw AnyBalance.Error('Неизвестная ошибка. Сайт изменен?');
	}
}