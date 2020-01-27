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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.mega-net.com.ua/cgi-bin/stat.pl';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
var trai = 1;
do{
        if (/Вы можете авторизоваться одним из данных способов/i.test(html)){
		var ses = /<a href='([^']*)'>Авторизация по логину и паролю/i.exec(html)[1];	
		html = AnyBalance.requestGet(baseurl+ses, g_headers); 
	}else{
        break;
	}
if (++trai > 5) break;
}while(true);

        if (/id\=\'login_form\'/i.test(html)){
        

	var params = createFormParams(html, function(params, str, name, value){
		if(name == '_uu')
			return prefs.login;
		else if(name == '_pp')
			return prefs.password;		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, g_headers); 

	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
//	html = AnyBalance.requestPost(baseurl, {
//		_uu: prefs.login,
//		_pp: prefs.password,
//		'go': ''
//	}, addHeaders({Referer: baseurl}));
	}
	if (!/\?a\=logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var s=/PAYS.BLOCK[\s\S]*?Платежи([\s\S]*?)\<\!/i.exec(html)[1];
	s=replaceAll(s.toString(),replaceTagsAndSpaces)
        s=s.replace(/ \d\d\./g, "<br><br>$&")
        s=s.replace(/(\+\d*?(\.\d\d)?\s)/g, "<strong>$&</strong><br>")
        s=s.replace(/(\-\d*?(\.\d\d)?\s)/g, "<strong><font  color=\"red\">$&<font  color=\"black\"></strong><br>")

	var result = {success: true};

	getParam(html, result, 'balance', /Остаток на счете(?:[^>]*>){2}([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'login', /(Договор[\s\S]*?)\<\/p/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /ТАРИФ[\s\S]*?grn([\s\S]*?мес)/i, replaceTagsAndSpaces);
	getParam(s, result, 'pays');

	AnyBalance.setResult(result);
}
