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
var prefs;
function main() {
	var html;
	prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.mql5.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
//	checkEmpty(prefs.signal, 'Enter signal!');

	var result = {success: true};

	if(prefs.Login!=null && prefs.Login.length>0){
		try {
			html = AnyBalance.requestPost('https://www.mql5.com/en/auth_login', {
				'Login':prefs.Login,
				'Password':prefs.Password,
				'RememberMe':'false',
			}, addHeaders({Referer: 'https://www.mql5.com/en/auth_login','X-Requested-With':'XMLHttpRequest'}));		
		} catch(e) {
		}
	}
	if (/Incorrect login or password/i.test(html)) {
		throw new AnyBalance.Error('Incorrect login or password.');
	}
	if(prefs.signal){
		html = AnyBalance.requestGet(baseurl + 'en/signals/'+prefs.signal, g_headers);
		if (/<h1>404<\/h1>/i.test(html)) {
			throw new AnyBalance.Error('Signal incorrect.');
		}else if(/signal is disabled and unavailable/i.test(html)) {
			throw new AnyBalance.Error('Signal is disabled, unavailable or need to type login and password.');
		}

		result.__tariff = getParam(html, null, null , /<span class="signal-card__title-wrapper">(.*?)</, replaceTagsAndSpaces, html_entity_decode);
		result.initial_deposit = getParam(html, null, null, /Initial Deposit',[\s\S]+?value: '(.*?)'/i, replaceTagsAndSpaces, parseBalanceMulti);
		result.deposits = getParam(html, null, null , /Deposits',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalanceMulti);
		result.total_deposit = Math.round((result.initial_deposit+result.deposits)*100)/100;
		result.currency = getParam(html, null, null , /Initial Deposit',[\s\S]+value:.*?[\s\S]+?valueText: '.*? ([\S]*?)'/, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'withdrawals' , /Withdrawals',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalanceMulti);
		result.balance = getParam(html, null, null , /'Balance:[\s\S]+?(.*?) .*?'/, replaceTagsAndSpaces, parseBalanceMulti);
		result.equity = getParam(html, null, null , /Equity',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalanceMulti);
		result.current_profit = Math.round((result.equity-result.balance)*100)/100;
		getParam(html, result, 'profit' , /Profit',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalanceMulti);
		getParam(html, result, 'subscribers' , /Subscribers',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'subscribers_funds' , /Subscribers funds',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'maximum_drawdown' , /value : (.*?),[\s\S]+?name : 'Maximum drawdown/, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'weeks' , /Weeks',[\s\S]+?value: '(.*?)'/, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'latest_trade' , /Latest trade:[\s\S]+?columns__value>(.*?)</, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'trades_per_week' , /Trades per week:[\s\S]+?columns__value>(.*?)</, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'trades_total' , />Trades:[\s\S]+?columns__value>(.*?)</, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'avg_holding_time' , /Avg holding time:[\s\S]+?columns__value>(.*?)</, replaceTagsAndSpaces, html_entity_decode);

	}
	if(AnyBalance.isAvailable('profile_balance')){
		checkEmpty(prefs.Login, 'Enter login and password!');
		html = AnyBalance.requestGet(baseurl + 'en/users/'+prefs.Login, g_headers);
		getParam(html, result, 'profile_balance' , /Your balance is (.*?) /, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'profile_currency' , /Your balance is .*? (\w+)/, replaceTagsAndSpaces, html_entity_decode);
	}

	
	AnyBalance.setResult(result);
}
function parseBalanceMulti(text) {
	var val=parseBalance(text);
	var div=prefs.multiplier || 1;
	return Math.round(val/div*100)/100;
}

