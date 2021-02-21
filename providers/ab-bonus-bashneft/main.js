/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	try {
		mobileApp();
	}catch (e){
		AnyBalance.trace('Ошибка при получении данных через API');
		if (/парол/.test(e.message))  throw new AnyBalance.Error(e.message,false,true);
                if (/заблокирован/.test(e.message))  throw new AnyBalance.Error(e.message,false,true);
		AnyBalance.trace(e.message);
                site();
	}
}

function mobileApp(){
  var g_headers = {
	'User-Agent':'ksoap2-android/2.6.0+',
	'SOAPAction':'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/userSignInV3',
	'Content-Type':'text/xml;charset=utf-8',
	'Accept-Encoding':'gzip',
	'X-SMP-APPCID':'c0ca9481-d10c-4f62-8aa3-30c00f6b3931',
	'Accept-Language':'ru',
	'X-CSRF-TOKEN':'FETCH',
	'Host':'mobilewsp.bashneft.ru',
	'Connection':'Keep-Alive'
  }
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900';
	AnyBalance.setDefaultCharset('utf-8');

	var xml=AnyBalance.requestPost(baseurl,'<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:userSignInV3 id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><EMAIL i:type="d:string">'+prefs.login+'</EMAIL><CNUM i:type="d:string"></CNUM><REGID i:type="d:string">c0ca9481-d10c-4f62-8aa3-30c00f6b3931</REGID><PASSWORD i:type="d:string">'+prefs.password+'</PASSWORD><NOTSMS i:type="d:string"></NOTSMS></n0:userSignInV3></v:Body></v:Envelope>\r\n',g_headers);
	var desk=getXMLValue('STAT_DESC');
	if (desk&&desk!='Ок') throw new AnyBalance.Error(desk);
	var authToken=getXMLValue('AUTHTOKEN');
	var authToken_pass=getXMLValue('AUTHTOKEN_PASS');
	if (!authToken) throw new AnyBalance.Error('Не удалось получить токен авторизации. Изменения в API?');

        g_headers.SOAPAction='https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/readClientData';
	var xml=AnyBalance.requestPost(baseurl,'<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:readClientData id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><ATOKEN i:type="d:string">'+authToken+'</ATOKEN></n0:readClientData></v:Body></v:Envelope>\r\n',g_headers);
	var desk=getXMLValue('STAT_DESC');
	if (desk&&desk!='Ок') throw new AnyBalance.Error(desk);

	var result = {success: true};
	
	getParam(getXMLValue('LBAL'), result, 'balance', null, null, parseBalance);
	getParam(getXMLValue('FNAME')+' '+getXMLValue('LNAME'), result, 'fio', null, null);
	getParam(getXMLValue('CNUM'), result, 'cardNumber', null, null);
	getParam(getXMLValue('TOWN'), result, '__tariff', null, null);

	AnyBalance.setResult(result);

  function getXMLValue(find){
    const re = new RegExp('<'+find+'>([^<]*)');
    return getParam(xml,re)
  }
}

function site() {
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bashneft-azs.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	AnyBalance.restoreCookies();
	var html = AnyBalance.requestGet(baseurl + 'loyalty/personal/', g_headers);
if (!/Выход/i.test(html)) {
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
                clearAllCookies();
		AnyBalance.saveData();
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
        var recaptcha=getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
	if(recaptcha){
	    var g_recaptcha_response = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), recaptcha);
	}else{
		AnyBalance.trace('Капча не требуется, ура');
	}

	html = AnyBalance.requestPost(baseurl + 'loyalty/personal/', {
		userLoginForm_login: prefs.login,
		userLoginForm_pswrd: prefs.password,
                'g-recaptcha-response':g_recaptcha_response
	}, addHeaders({Referer: baseurl + 'loyalty/personal/'}));
	
	if (!/Выход/i.test(html)) {
		if(/Технические работы/i.test(html))
			throw new AnyBalance.Error('Личный кабинет временно не доступен в связи с проводимыми техническими работами.');

		var error = getParam(html, null, null, /<div\s+class="error_block">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
		if (error) {
                	clearAllCookies();
                	AnyBalance.saveData();
                	throw new AnyBalance.Error(error, null, /данные неверны!/i.test(error));
		}
		
		AnyBalance.trace(html);
                clearAllCookies();
		AnyBalance.saveData();
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
}	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс[\s\S]*?<div[^>]*>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div\s+class="lk_left_info_block">[\s\S]*?<div\s+class="text">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardNumber', /Ваша карта[\s\S]*?<div[^>]*>№?([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}