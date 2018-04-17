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
    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://ssl.belorusneft.by/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	//Пароль в SHA-1
	var pass = prefs.password;
	var key = prefs.login;
    
    var passHash = rstr2hex(rstr_hmac_sha1(pass, key)) + prefs.login;
	
	AnyBalance.requestGet(baseurl + 'lprogram/index.html', g_headers);
	
	var html = AnyBalance.requestPost(baseurl + 'lprogram/login-url', {
        loginName: prefs.login,
		txtPassword: pass,
        passHesh: passHash
    }, AB.addHeaders({Referer: baseurl + 'lprogram/index.html', Origin:baseurl}));
	
    if(!/lprogram\/logout/i.test(html)){
        var error = AB.getParam(html, null, null, /id="login_error"[^>]*>((?:[^>]*>){3})/i, AB.replaceTagsAndSpaces);
		if (error) {
            throw new AnyBalance.Error("Неверный логин или пароль", null, true);
        }
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};

    AB.getParam(html, result, 'fio',      /<li[^>]+fio_cabinet[^>]*>([\s\S]*?)<\/li>/i, [/Личный кабинет/i, '', AB.replaceTagsAndSpaces]);
    AB.getParam(html, result, 'status',   /<span[^>]+info_label[^>]*>Статус[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'products', /<span[^>]+info_label[^>]*>Сопут. товары[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'chance_1', /<span[^>]+info_label[^>]*>Шансы приз 1[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'chance_2', /<span[^>]+info_label[^>]*>Шансы приз 2[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'balance',  /<span[^>]+info_label[^>]*>Баллы[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'card_num', /<span[^>]+info_label[^>]*>Карта №[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, '__tariff', /<span[^>]+info_label[^>]*>Карта №[\s\S]*?<span[^>]+info_value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
/*
    if(isAvailable(['discount', 'discount_sum'])) {
      html = AnyBalance.requestGet(baseurl + 'lprogram/cabinet/bonus.jsp', g_headers);

      AB.getParam(html, result, 'discount',     /Размер скидки(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i,                AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'discount_sum', /Сумма предоставленной скидки(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    }
  */
    //AB.getParam(html, result, 'discount', /скидка на топливо([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AnyBalance.setResult(result);
}