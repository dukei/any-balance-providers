/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control':'max-age=0',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('Utf-8');
	
    var baseurl = "http://abonent.teleoka.su/";
    var html = AnyBalance.requestGet(baseurl + 'login.php');
	
	html = AnyBalance.requestPost(baseurl + 'login.php', {
		user_id: prefs.login,
		pass: prefs.password,
		submit: "Вход",
	}, addHeaders({
		Referer: baseurl + 'login.php'
	}));
	
	var cookie = getParam(html, null, null, /<session_cookie>([\s\S]*?)<\//i, null, html_entity_decode);
	
	AnyBalance.setCookie('abonent.teleoka.su', 'session_cookie', cookie);

	html = AnyBalance.requestPost(baseurl + 'index.php');

	var result = {success: true};
	
	getParam (html, result, 'days_left', /Осталось[^b]*b>(.*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'balance', /Остаток[^b]*b>([0-9|\.|,]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'uid', /Лицевой счет[^b]*b>([0-9]*)/i, null, null);
	getParam (html, result, 'abonent', /Абонент[^b]*b>(.*)<\/b/i, null, null);
	getParam (html, result, 'address', /Адрес[^b]*b>(.*)<\/b/i, null, null);
	getParam (html, result, 'u_name', /Имя пользователя[^b]*b>(.*)<\/b/i, null, null);
	getParam (html, result, 'tarif', /Тарифный план[^b]*b>(.*)<\/b/i, null, null);
	getParam (html, result, 'staticIP', /Статический[^b]*b>(.*)<\/b/i, null, null);
	getParam (html, result, 'basic_bal', /Основной счет[^b]*b>([0-9|\.|,]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'bonus_bal', /Бонусный счет[^b]*b>([0-9|\.|,]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'block_date', /заблокирован ([\d|-]*)/i, null, parseDate);
	getParam (html, result, 'totaltime', /в сети[^b]*b>(.*?)<\/b/i, null, null);
	getParam (html, result, 'downloaded', /скачано[^b]*b>(.*?)<\/b/i, null, null);
	getParam (html, result, 'uploaded', /отдано[^b]*b>(.*?)<\/b/i, null, null);

	AnyBalance.setResult(result);
}
