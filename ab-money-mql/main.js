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
	var html;
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.mql5.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.signal, 'Enter signal!');

	var result = {success: true};

	if(prefs.Login!=null && prefs.Login.length>0){
		try {
			html = AnyBalance.requestPost('https://login.mql5.com/en/auth_login', {
				'Login':prefs.Login,
				'Password':prefs.Password,
//				'RedirectAfterLoginUrl':baseurl+'en',//+'en/signals/'+prefs.signal,
				'RememberMe':'false',
			}, addHeaders({Referer: 'https://login.mql5.com/en/auth_login'}));		
		} catch(e) {
		}
	}
	if (/Incorrect login or password/i.test(html)) {
		throw new AnyBalance.Error('Incorrect login or password.');
	}
	html = AnyBalance.requestGet(baseurl + 'en/signals/'+prefs.signal, g_headers);
	if (/<h1>404<\/h1>/i.test(html)) {
		throw new AnyBalance.Error('Signal incorrect.');
	}else if(/signal is disabled and unavailable/i.test(html)) {
		throw new AnyBalance.Error('Signal is disabled, unavailable or need to type login and password.');
	}

	result.__tariff = getParam(html, null, null , /<div class="info signals">[\s\S]*?<meta itemprop="name" content="(.*?)" \/>/, replaceTagsAndSpaces, html_entity_decode);
	result.initial_deposit = getParam(html, null, null, />Initial Deposit:\s+<span>(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	result.deposits = getParam(html, null, null , />Deposits:\s+<span>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	result.total_deposit = Math.round((result.initial_deposit+result.deposits)*100)/100;
	result.currency = getParam(html, null, null , />Initial Deposit:\s+<span>.*? ([\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'withdrawals' , />Withdrawals:\s+<span>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	result.balance = getParam(html, null, null , />Balance:\s+<span>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	result.equity = getParam(html, null, null , />Equity:\s+<span>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	result.current_profit = Math.round((result.equity-result.balance)*100)/100;
	getParam(html, result, 'profit' , />Profit:\s+<span>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'subscribers' , />Subscribers:\s+<span>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'subscribers_funds' , />Subscribers' funds:\s+<span>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'maximum_drawdown' , />Maximum drawdown:\s+<span.*?>(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'weeks' , />Weeks:\s+<span>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'latest_trade' , />Latest trade:\s+<span.*?>([\s\S]*?)</, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'trades_per_week' , />Trades per week:\s+<span>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'avg_holding_time' , />Avg holding time:\s+<span>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);

	
	AnyBalance.setResult(result);
}