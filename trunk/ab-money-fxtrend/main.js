/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'utf-8;q=0.7,*;q=0.3',
//	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Language': 'en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://fx-trend.com/';
	var result;

//Account monitoring (with login)
	if(prefs.type==1){

		AnyBalance.trace('Authorizing...');

		var info = AnyBalance.requestPost(baseurl + 'login/my/profile/info', {
			"login": prefs.login,
			"pass": prefs.pass
		}, addHeaders({Referer: baseurl + 'profile'}));	

		var error = $('#errHolder', info).text();
		if(error){
			throw new AnyBalance.Error(error);
		}

		result = {success: true};
		var total = 0.0;
		var account;

		AnyBalance.trace('Requesting account info... ');

		info = AnyBalance.requestGet(baseurl + 'en/my/accounts/', addHeaders({Referer: baseurl}));

		if(matches = info.match(/<script type="text\/javascript">\s+var userAccountsBundle =([\s\S]+?);\s+<\/script>/)){

			var a = getJson(matches[1]);
			var d = JSON.parse('["vBalance","vInvestProduct","vECNTrade","vMiniTrade","vReferrer","vPAMM"]');
			for(i in d){
				for(j in a[d[i]]){
					var b=a[d[i]][j];
//					AnyBalance.trace('Found account: '+b.group+'... '+b.mt_login+' = '+b.equity);
					total += getEquity(b);
					if(b.mt_login == prefs.account){account = b}
				}
			}
			AnyBalance.trace('Total equity calculated: ' + total);
			result.total = total;

			if(account != undefined){			
				AnyBalance.trace('Account found: '+account.mt_login+', type: '+account.type+', group: '+account.group);

				result.__tariff = prefs.account;

				var c=['created_at','currency','balance','equity','margin','free','mlevel','profit'];
				for(i in c){
					if(account[c[i]] != undefined){result[c[i]] = account[c[i]];}
				}
				result.receipts = Math.round((result.equity*1 - result.balance*1)*100)/100;
			}else{
				throw new AnyBalance.Error("Incorrect account number.");
			}
		}
		else{
			if(matches = info.match(/We apologize, but access to the personal office area.*?due to the PAMM periodic rollover.*?is temporary suspended/i)){
				throw new AnyBalance.Error("Access to the personal office area due to the PAMM periodic rollover is temporary suspended.");}
			else{
				throw new AnyBalance.Error("Error getting data.");}
		}

		if(isAvailable('deposited', 'withdrawn', 'difference', 'income')){

			AnyBalance.trace('Requesting deposit info... ');
			var info = AnyBalance.requestGet(baseurl + 'en/my/accounts/deposit/', addHeaders({Referer: baseurl}));

			result.deposited = getParam(info, null, null, /<td[^>]*>total<\/td>\s+<td[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			result.withdrawn = getParam(info, null, null, /<td[^>]*>total<\/td>\s+<td[^>]*>.*?<\/td>\s+<td[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			result.difference = getParam(info, null, null, /<td[^>]*>total<\/td>\s+<td[^>]*>.*?<\/td>\s+<td[^>]*>.*?<\/td>\s+<td[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			result.income = Math.round((result.total*1 - result.difference*1)*100)/100;

		}
//PAMM-monitoring (without login)
	}else if(prefs.type==2){

		AnyBalance.trace('Requesting PAMM info... ');

		var info = AnyBalance.requestGet(baseurl + 'en/pamm/' + prefs.pamm, addHeaders({Referer: baseurl}));

		if(matches = info.match(/<h2>PAMM account details (.*?)<\/h2>/)){
			result = {success: true};
			result.__tariff = matches[1];
		}else{
			throw new AnyBalance.Error("Error getting data of account '"+prefs.pamm+"' (may be it not exist?).");
		}

		result.currency = getParam(info, null, null, /Managing trader initial capital:<\/b><\/td>\s+<td.*?>.*? (.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'initial_capital', /Managing trader initial capital:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'current_capital', /Current capital оf the Managing trader:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'amount_in_management', /Amоunt in management:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'relative_drawdown', /Relative drawdоwn:<\/b><\/td>\s+<td.*?>(.*?)\%<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'maximum_drawdown', /Maximum drawdоwn:<\/b><\/td>\s+<td.*?>(.*?)\%<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'open_trades', /Number оf оpen trades:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'annualized_gain', /Expected annualized gain:<\/b><\/td>\s+<td.*?>(.*?)\%<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'previous_rollover', /Date of previous periodic rollover:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'next_rollover', /Next periodic rollover:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

		if(matches = info.match(/<h2>profit by months<\/h2>[\s\S]+?<\/table>/i)){
			var info1=matches[0];
			result.month = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>.*?\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
			result.month_profit = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?>(.*?)<\/td>\s+<td.*?>.*?\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			result.month_interest = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>(.*?)\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, parseBalance);
		}
		if(matches = info.match(/<h2>rate of return by weeks<\/h2>[\s\S]+?<\/table>/i)){
			var info1=matches[0];
			result.week = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>.*?\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
			result.week_profit = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?>(.*?)<\/td>\s+<td.*?>.*?\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			result.week_interest = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>(.*?)\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, parseBalance);
		}
//PAMM indices (without login)
	}else if(prefs.type==3){

		AnyBalance.trace('Requesting indices info... ');

		var info = AnyBalance.requestGet(baseurl + 'en/pamm/index/' + prefs.index, addHeaders({Referer: baseurl}));

		if(matches = info.match(/<h2>PAMM index details/)){
			result = {success: true};
			result.__tariff = prefs.index;
		}else{
			throw new AnyBalance.Error("Error getting data of index '"+prefs.index+"' (may be it not exist?).");
		}

		result.index_included = (getParam(info, null, null, /PAMM accounts that are included in PAMM index:<\/b><\/td>\s+<td.*?>([\s\S]+?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode)).replace(/\% /g,"%, ");
		AnyBalance.trace('Index included: ' + result.index_included);

		getParam(info, result, 'index_started', /Time of starting:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

		if(matches = info.match(/<h2>weekly investor’s returns<\/h2>[\s\S]+?<\/table>/i)){
			var info1=matches[0];
			result.index_last_week = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?><span.*?>.*?\%<\/span><\/td>\s+<\/tr>\s+<tr>.*?\s+<tr>/i, replaceTagsAndSpaces, html_entity_decode);
			result.index_last_return = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?><span.*?>(.*?)\%<\/span><\/td>\s+<\/tr>\s+<tr>.*?\s+<tr>/i, replaceTagsAndSpaces, parseBalance);
			result.index_week = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?><span.*?>.*?\%<\/span><\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			result.index_return = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?><span.*?>(.*?)\%<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);
		}
	}
	
	AnyBalance.setResult(result);
};

function getEquity(b){
	var a = 0;
	if(typeof(b.equity) == 'number'){
		a = b.equity;
	}else if(typeof(b.balance) == 'number'){
		a = b.balance;
	}
	return a;
}