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

/**
 * This function changes date object to string in specified format.
 * @param dat date object.
 * @param format Date format - contains: 'yyyy' (or 'yy'), 'MM' and 'dd'.
 */
function date2string(dat, format) {
	var y = dat.getFullYear() + "";
	var m = dat.getMonth() + 1;
	var d = dat.getDate();
	
	if(format.length > 10)
	{
		var HH = dat.getHours();
		var mm = dat.getMinutes();
		var ss = dat.getSeconds();
	}
	
	if ((format.indexOf('yyyy') == -1 && format.indexOf('yy') == -1)
			|| format.indexOf('MM')  == -1 || format.indexOf('dd') == -1) {
		return null;		
	}

	if (m < 10) m = "0" + m;
	if (d < 10) d = "0" + d;
	
	if (HH < 10) HH = "0" + HH;
	if (mm < 10) mm = "0" + mm;
	if (ss < 10) ss = "0" + ss;
	
	var ret = format;
	ret = ret.replace("yyyy", y);
	ret = ret.replace("yy", y);
	ret = ret.replace("MM", m);
	ret = ret.replace("dd", d);
	
	if(format.length > 10)
	{
		ret = ret.replace("HH", HH);
		ret = ret.replace("mm", mm);
		ret = ret.replace("ss", ss);
	}
	
	return ret;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://prcab.x5club.ru/karusel/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestGet(baseurl + 'anonymousLogin.do', g_headers);
	
    var form = getElement(html, /<form[^>]+LoginForm/i);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'job') {
			return 'LOGIN';
		} else if (/id="logOnDate"/i.test(str)){
			return date2string(new Date(),'yyyy-MM-dd HH:mm');
		} else if (name == 'login'){
			return prefs.login;
		} else if (name == 'password') {
			return hex_sha1(prefs.login + prefs.password);
		} else if (name == 'captchaAnswer') {
			var image = getParam(form, /<img[^>]+captcha[^>]+src="([^"]*)/i, replaceHtmlEntities);
			image = AnyBalance.requestGet(joinUrl(baseurl, image), addHeaders({Referer: baseurl}));
			return AnyBalance.retrieveCode('Введите символы с изображения', image);
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login.do', params, addHeaders({Referer: baseurl + 'anonymousLogin.do'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="errorBoldText"[^>]*>([\s\S]*?)<br\/>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /некорре/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'cardnum', /Номер карты:([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'bonuses', /Баланс бонусов:([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses_avail', /Доступно бонусов:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Баллов на счете:([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	//getParam(html, result, 'last_visit', /Последнее посещение:([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}
