/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
	'Connection': 'keep-alive',
	'Accept-Language': 'en-US,en;q=0.8',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.smartutilities.com.mt';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.userid, 'Input user ID');
	checkEmpty(prefs.password, 'Input password');
	
	var html = AnyBalance.requestGet(baseurl + '/wps/myportal', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = getParam(html, null, null, /<form[^>]*name="LoginForm[\s\S]*?<\/form>/i);
	var action = getParam(form, null, null, /action="([^"]+)/i);
	if(!form || !action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'wps.portlets.userid') 
			return prefs.userid;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + action, params, addHeaders({'Referer': baseurl + action}));
	
	if (!/Выход из системы|Log out/i.test(html)) {
		var error = getParam(html, null, null, /class="wpsFieldSuccessText"[^>]*>([\s\S]*?<\/span>)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Please enter a valid user ID and password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'contractno', /id="contractNo"[\s\S]*<option[^>]*selected[^>]+>(\d+)[\s\S]*<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contractaddress', /id="contractNo"[\s\S]*<option[^>]*selected[^>]+>\d+[^,]*,([\s\S]*)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'totalbalance', /You have a total due of([\s\S]*?)in/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date', /<table class="resume">(?:[\s\S]*?<td>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'datedue', /<table class="resume">(?:[\s\S]*?<td>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'billnumber', /<table class="resume">(?:[\s\S]*?<td>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'billed', /<table class="resume">(?:[\s\S]*?<td>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<table class="resume">(?:[\s\S]*?<td>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'daysoverdue', /<table class="resume">(?:[\s\S]*?<td>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'interestacc', /<table class="resume">(?:[\s\S]*?<td>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}