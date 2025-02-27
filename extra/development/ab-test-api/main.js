
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function test(result, comment, testFunc){
	++result.total;
	AnyBalance.trace("[" + result.total + "]. " + comment);
	let error;
	try{
		error = testFunc();
	}catch(e){
		error = e.message + "\n" + e.stack;
	}
	if(error){
		++result.failed;
		AnyBalance.trace("[" + result.total + "]. FAILED: " + error);
	}else{
		++result.passed;
		AnyBalance.trace("[" + result.total + "]. Passed");
	}
}

function getSiteReceivedCookies(html){
	const received_cookies_html = getParam(html, /Received cookies:.*?<ul>([\s\S]*?)<\/ul>/i);
	if(!received_cookies_html)
		return [];
	const received_cookies = getElements(received_cookies_html, /<li>/g, AB.replaceTagsAndSpaces, text => text.split(/\s*=\s*/));
	return received_cookies;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	if(prefs.client){
		AnyBalance.trace("Setting client: " + prefs.client);
		AnyBalance.setOptions({CLIENT: prefs.client});
	}
	if(prefs.cookies === undefined) prefs.cookies = true;
	if(prefs.redirect === undefined) prefs.redirect = true;
	if(prefs.encoding === undefined) prefs.encoding = true;

	var result = {
		passed: 0,
		failed: 0,
		total: 0,
		success: true
	};

	if(prefs.cookies)
		testCookies(result);
	if(prefs.redirect)
		testRedirect(result);
	if(prefs.encoding)
		testEncoding(result);



	AnyBalance.setResult(result);
}


function testEncoding(result){
	var prefs = AnyBalance.getPreferences();
	
	test(result, "Encoding should be utf-8 when not specified", () => {
		const html = AnyBalance.requestGet('https://anybalance.ru/download/testUtf8.html');
		if(!/Тестируем/.test(html))
			return "Wrong encoding!";
	});
}
	

function testCookies(result){
	var prefs = AnyBalance.getPreferences();
	
	test(result, "Cookie store should be empty on start", () => {
		const cookies = AnyBalance.getCookies();
		return cookies.length !== 0 && `${cookies.length} in empty cookies store!`;
	});
	
	test(result, "Sites should be able to set session cookies", () => {
		AnyBalance.requestPost("https://setcookie.net", {
			name: "testSession",
			value:	"cookie_data",
			dom: "setcookie.net",
			path:	"/",
		});
		const cookies = AnyBalance.getCookies();
		if(cookies.length !== 1)
			return `Should be 1 cookie in store, there are ${cookies.length}!`;
		if(cookies[0].name !== "testSession" || cookies[0].value !== 'cookie_data')
			return `Wrong cookie saved: ` + JSON.stringify(cookies[0]);
		
		const html = AnyBalance.requestGet("https://setcookie.net");
		const received_cookies = getSiteReceivedCookies(html);
		if(received_cookies.length !== 1)
			return `Site should receive only one cookie. Received: ` + JSON.stringify(received_cookies);
		if(received_cookies[0][0] !== "testSession" || received_cookies[0][1] !== 'cookie_data')
			return `Wrong cookie received: ` + JSON.stringify(received_cookies[0]);
	});

	test(result, "Should be able to set persistent cookie", () => {
		AnyBalance.requestPost("https://setcookie.net", {
			name: "testPersistent",
			value:	"cookie_data2",
			dom: "setcookie.net",
			path:	"/",
			expires: 'on',
			expdate: new Date(Date.now() + 86400*1000).toISOString(),
			httponly: 'on' 
		});

		const cookies = AnyBalance.getCookies();
		if(cookies.length !== 2)
			return `Should be 2 cookie in store, there are ${cookies.length}!`;
		const cookie = cookies.find(c => c.name === 'testPersistent');
		if(!cookie)
			return `Could not find set cookie!`;
		if(!cookie.expires)
			return `Persistent cookie does not expire!`;
		const expdate = new Date(cookie.expires);
		if(+expdate < Date.now() + 86000*1000 || +expdate > Date.now() + 87000*1000)
			return `Persistent cookie has wrong expire: ` + expdate;

		const html = AnyBalance.requestGet("https://setcookie.net");
		const received_cookies = getSiteReceivedCookies(html);
		if(received_cookies.length !== 2)
			return `Site should receive two cookies. Received: ` + JSON.stringify(received_cookies);
		const rc = received_cookies.find(c => c[0] === 'testPersistent' && c[1] === 'cookie_data2');
		if(!rc)
			return `Wrong cookies received: ` + JSON.stringify(received_cookies);
	});

	test(result, "Should be able to remove cookie", () => {
		AnyBalance.setCookie('setcookie.net', 'testSession');

		const cookies = AnyBalance.getCookies();
		if(cookies.length !== 1)
			return `Should be 1 cookie in store, there are ${cookies.length}!`;
		if(cookies[0].name !== "testPersistent" || cookies[0].value !== 'cookie_data2')
			return `Wrong cookie left: ` + JSON.stringify(cookies[0]);
		
		const html = AnyBalance.requestGet("https://setcookie.net");
		const received_cookies = getSiteReceivedCookies(html);
		if(received_cookies.length !== 1)
			return `Site should receive only one cookie. Received: ` + JSON.stringify(received_cookies);
		if(received_cookies[0][0] !== "testPersistent" || received_cookies[0][1] !== 'cookie_data2')
			return `Wrong cookie received: ` + JSON.stringify(received_cookies[0]);
	});

	test(result, "Should be able to remove all cookies", () => {
		clearAllCookies();
		const html = AnyBalance.requestGet("https://setcookie.net");
		const received_cookies = getSiteReceivedCookies(html);
		if(received_cookies.length > 0)
			return `Site should not receive cookies! ` + JSON.stringify(received_cookies);
		const cookies = AnyBalance.getCookies();
		if(cookies.length !== 0)
			return `Cookie store should be empty! ` + JSON.stringify(cookies);
	});
}

function testRedirect(result){
	var prefs = AnyBalance.getPreferences();
	if(!AnyBalance.getCapabilities().manualRedirects){
		AnyBalance.trace("Redirects capability is not supported, skipping redirection tests");
		return;
	}

	test(result, "Should not follow redirects", () => {
		AnyBalance.setOptions({
			MANUAL_REDIRECTS: true
                });
		let html = AnyBalance.requestGet("http://ya.ru");
		if(AnyBalance.getLastStatusCode() < 300 || 400 <= AnyBalance.getLastStatusCode())
			return "Got no redirect status code! " + AnyBalance.getLastStatusCode();
		html = AnyBalance.requestGet("http://ya.ru", null, {options: {MANUAL_REDIRECTS: false}});
		if(300 <= AnyBalance.getLastStatusCode() && AnyBalance.getLastStatusCode() < 400)
			return "Per-request override failed: got redirect status code! " + AnyBalance.getLastStatusCode();
	});

	test(result, "Should be able to cancel manual redirects", () => {
		AnyBalance.setOptions({
			MANUAL_REDIRECTS: null
                });
		const html = AnyBalance.requestGet("http://ya.ru");
		if(300 <= AnyBalance.getLastStatusCode() && AnyBalance.getLastStatusCode() < 400)
			return "Got redirect status code! " + AnyBalance.getLastStatusCode();
	});

	test(result, "Should not follow redirects per request", () => {
		const html = AnyBalance.requestGet("http://ya.ru", null, {options: {MANUAL_REDIRECTS: true}});
		if(AnyBalance.getLastStatusCode() < 300 || 400 <= AnyBalance.getLastStatusCode())
			return "Got no redirect status code! " + AnyBalance.getLastStatusCode();
	});

	test(result, "Should be able do manual redirects on per domain basis", () => {
		AnyBalance.setOptions({
			PER_DOMAIN: {
				'ya.ru': {
					MANUAL_REDIRECTS: true
				}
			}
                });
		const html = AnyBalance.requestGet("http://ya.ru");
		if(AnyBalance.getLastStatusCode() < 300 || 400 <= AnyBalance.getLastStatusCode())
			return "Got no redirect status code! " + AnyBalance.getLastStatusCode();
	});
}