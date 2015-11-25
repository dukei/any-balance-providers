/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Connection': 'keep-alive',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
	'Content-Type': 'application/x-www-form-urlencoded',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'en-US,en;q=0.8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.smartutilities.com.mt/wps/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.userid, 'Input user ID');
	checkEmpty(prefs.password, 'Input password');
	
	var html = AnyBalance.requestGet(baseurl + 'portal/Public%20Area/wps.Login/!ut/p/b1', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var params = {
		'wps.portlets.userid': prefs.userid,
		'password': prefs.password,
		'ns_Z7_CGAH47L008LG50IAHUR9Q330U1__login': 'Вход в систему'
    };
    var loginurl = 'portal/!ut/p/b0/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3R09TMx9DAwsfNxNDTwdPUKDLAONjQ1czfULsh0VAW9IRPw!/';
	html = AnyBalance.requestPost(baseurl + loginurl, params);
	
	if (!/Выход из системы/i.test(html)) {
		var error = getParam(html, null, null, /class="wpsFieldSuccessText"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'myportal/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3Y0CzYzdfMw8Q11dDBxNfENcQr19DA28zfULsh0VAWCRPls', g_headers);
	
	var result = {success: true};
	
	// getParam(html, result, 'subtotal', /Payment Subtotal[\s\S]*?\/>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'date', /(?:Заказ\s№[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	// getParam(html, result, 'status', /Статус[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	// getParam(html, result, 'sum', /Общая сумма([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}