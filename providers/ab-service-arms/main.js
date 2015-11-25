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
	

	var loginurl = 'portal/Public%20Area/wps.Login/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3R09TMx9DAwsfNxNDTwdPUKDLAONjQ1czYEKIoEKDHAARwOofqNAM2M3H7NAc2dXA0cTM18XF_8wIwNPI6h-XBY4GhNnPx4LCOgP14_CqwTkArACPF7088jPTdUvyA0NjTDIMgEAMTbqew!!/dl4/d5/L0lDUWtpQ1NZSkNncFJBISEvb0VvZ0FFQ1FRREdJUXBTR0djRndUT0EhLzRHMGhSQjdRUjM1UWhTWkNuNnBoL1o3X0NHQUg0N0wwMDhMRzUwSUFIVVI5UTMzMFUxLzAvd3BzLnBvcnRsZXRzLmxvZ2lu/';
	var html = AnyBalance.requestGet(baseurl + loginurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var params = {
		'wps.portlets.userid': prefs.userid,
		'password': prefs.password,
		'ns_Z7_CGAH47L008LG50IAHUR9Q330U1__login': 'Log in'
    };
    // var loginurl = 'portal/!ut/p/b0/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3R09TMx9DAwsfNxNDTwdPUKDLAONjQ1czfULsh0VAW9IRPw!/';
	
	html = AnyBalance.requestPost(baseurl + loginurl, params,
		addHeaders({'Referer':'https://www.smartutilities.com.mt/wps/portal/Public%20Area/wps.Login/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3Y0CzYzdfMwCzZ1dDRxNzHxdXPzDjAw8jYAKIoEKDHAARwNC-sP1o6BKHD1MzH0MDCx83E0NPB09QoMsA42NDRyNoQrwWOHnkZ-bql-QG2GQZeKoCABxOILM/dl4/d5/L2dJQSEvUUt3QS80SmtFL1o2X0NHQUg0N0wwMDhMRzUwSUFIVVI5UTMzMEU3/'}));
	html = AnyBalance.requestGet(baseurl + 'https://www.smartutilities.com.mt/wps/myportal/Public%20Area/ARMS.CustomerArea.loginPage/ARMS.AccountManagement/billingOverview2/!ut/p/b1/04_SjzSyMDI3MjMztNCP0I_KSyzLTE8syczPS8wB8aPM4p3djQLNjN18zDxDXV0MHE18Q1xCvX0MDbzNgQoiwQocPUzMfQwMLHzcTQ08HT1CgywDjY0NHI2J02-AAzgaENIfrh-FX4kpAQUmhnAFuP0AVoDHkX4e-bmp-rlROW6WnpkB6Y6KigAYi_Lk/dl4/d5/L2dBISEvZ0FBIS9nQSEh/',
		addHeaders({'Referer':'https://www.smartutilities.com.mt/wps/portal/Public%20Area/wps.Login/!ut/p/b1/04_Sj9CPykssy0xPLMnMz0vMAfGjzOKd3Y0CzYzdfMwCzZ1dDRxNzHxdXPzDjAw8jYAKIoEKDHAARwNC-sP1o6BKHD1MzH0MDCx83E0NPB09QoMsA42NDRyNoQrwWOHnkZ-bql-QG2GQZeKoCABxOILM/dl4/d5/L2dJQSEvUUt3QS80SmtFL1o2X0NHQUg0N0wwMDhMRzUwSUFIVVI5UTMzMEU3/'}));

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