/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
};

//(function() { 
//var z="";var b="7472797B766172207868723B76617220743D6E6577204461746528292E67657454696D6528293B766172207374617475733D227374617274223B7661722074696D696E673D6E65772041727261792833293B77696E646F772E6F6E756E6C6F61643D66756E6374696F6E28297B74696D696E675B325D3D22723A222B286E6577204461746528292E67657454696D6528292D74293B646F63756D656E742E637265617465456C656D656E742822696D6722292E7372633D222F5F496E63617073756C615F5265736F757263653F4553324C555243543D363726743D373826643D222B656E636F6465555249436F6D706F6E656E74287374617475732B222028222B74696D696E672E6A6F696E28292B222922297D3B69662877696E646F772E584D4C4874747052657175657374297B7868723D6E657720584D4C48747470526571756573747D656C73657B7868723D6E657720416374697665584F626A65637428224D6963726F736F66742E584D4C4854545022297D7868722E6F6E726561647973746174656368616E67653D66756E6374696F6E28297B737769746368287868722E72656164795374617465297B6361736520303A7374617475733D6E6577204461746528292E67657454696D6528292D742B223A2072657175657374206E6F7420696E697469616C697A656420223B627265616B3B6361736520313A7374617475733D6E6577204461746528292E67657454696D6528292D742B223A2073657276657220636F6E6E656374696F6E2065737461626C6973686564223B627265616B3B6361736520323A7374617475733D6E6577204461746528292E67657454696D6528292D742B223A2072657175657374207265636569766564223B627265616B3B6361736520333A7374617475733D6E6577204461746528292E67657454696D6528292D742B223A2070726F63657373696E672072657175657374223B627265616B3B6361736520343A7374617475733D22636F6D706C657465223B74696D696E675B315D3D22633A222B286E6577204461746528292E67657454696D6528292D74293B6966287868722E7374617475733D3D323030297B706172656E742E6C6F636174696F6E2E72656C6F616428297D627265616B7D7D3B74696D696E675B305D3D22733A222B286E6577204461746528292E67657454696D6528292D74293B7868722E6F70656E2822474554222C222F5F496E63617073756C615F5265736F757263653F535748414E45444C3D323239353139303739313031353137323333372C31323430353137353235393130353235323835302C38343732323536393338303034383339312C343432383436222C66616C7365293B7868722E73656E64286E756C6C297D63617463682863297B7374617475732B3D6E6577204461746528292E67657454696D6528292D742B2220696E6361705F6578633A20222B633B646F63756D656E742E637265617465456C656D656E742822696D6722292E7372633D222F5F496E63617073756C615F5265736F757263653F4553324C555243543D363726743D373826643D222B656E636F6465555249436F6D706F6E656E74287374617475732B222028222B74696D696E672E6A6F696E28292B222922297D3B";for (var i=0;i<b.length;i+=2){z=z+parseInt(b.substring(i, i+2), 16)+",";}z = z.substring(0,z.length-1); alert(eval('String.fromCharCode('+z+')'));})();

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://fx-trend.com/';
	var result;

	var incapsule = Incapsule(baseurl + 'sign_in/');
	var html = AnyBalance.requestGet(baseurl + 'sign_in/', g_headers);
	if(incapsule.isIncapsulated(html))
	    html = incapsule.executeScript(html);

    if(!/<input[^>]+name="login"/i.test(html))
        throw new AnyBalance.Error('Не удается найти форму входа. Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'sign_in/', {login: prefs.login, pass: prefs.pass}, addHeaders({Referer: baseurl + 'sign_in/'}));
    if(!/\/logout\//i.test(html))
        throw new AnyBalance.Error('Не удалось войти в личный кабинет'); //Надо более подробно ошибку разобрать и вывести причину невхода
    
    AnyBalance.trace('Вошли!');
    return true;

//Account monitoring (with login)
	if(prefs.type==1 || !isset(prefs.type)){

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
				if(result.equity!=null && result.balance!=null)
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
			if(result.total!=null && result.difference!=null)
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
		getParam(info, result, 'open_trades', /<tr>\s+<td><b>Number оf оpen trades:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
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

		if(isAvailable('pamm_forecast') && (matches = info.match(/<h2>rate of return by weeks<\/h2>[\s\S]+?<\/table>/i))){
			AnyBalance.trace('Trying to analyze for interests...');
			var interests = [];
			var regexp = /<tr>\s+<td>.*?<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>(.*?)\%<\/td>\s+<\/tr>/g;
			while((r = regexp.exec(matches[0])) != null) {
	           		interests[interests.length] = Number(r[1]);
			}
			result.pamm_forecast = getForecast(interests,prefs.limit);
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

		result.index_included = (getParam(info, null, null, /PAMM accounts that are included in PAMM index:<\/b><\/td>\s+<td.*?>([\s\S]+?)<\/table>/i, replaceTagsAndSpaces, html_entity_decode)).replace(/\% /g,"%, ");


		if(matches = info.match(/PAMM accounts that are included in PAMM index:<\/b><\/td>\s+<td.*?>([\s\S]+?)<\/table>/i)){
			included=matches[1];
		}else{
			throw new AnyBalance.Error("Error getting data of index '"+prefs.index+"' (may be it not exist?).");
		}
		AnyBalance.trace('Index included: ' + result.index_included);

		getParam(info, result, 'index_started', /Time of starting:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);


		if(isAvailable('sum_open_trades') || isAvailable('index_forecast')){
			AnyBalance.trace('Getting open trades...');

			if(isAvailable('index_forecast')){result.index_forecast=0;};

			var regexp = /<a href="https?:\/\/fx\-trend\.com\/(.*?)">(.*?)<\/a><\/td>\s+<td.*?>(\d+)\%/g;
			var sum = 0;
			while((r = regexp.exec(included)) != null) {
				var part=r[3];
				AnyBalance.trace('Getting details for PAMM: '+r[2]+' ('+part+'%)...');
				var info1 = AnyBalance.requestGet(baseurl + 'en/' + r[1], addHeaders({Referer: baseurl}));

				if((matches = info1.match(/<h2>PAMM account details (.*?)<\/h2>/)) == null){
					throw new AnyBalance.Error("Error getting data of PAMM '"+r[2]+"' (may be it not exist?).");
				}

				AnyBalance.trace('Looking for open trades...');
				sum += getParam(info1, null, null, /<tr>\s+<td><b>Number оf оpen trades:<\/b><\/td>\s+<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

				if(matches = info1.match(/<h2>rate of return by weeks<\/h2>[\s\S]+?<\/table>/i)){
					AnyBalance.trace('Looking for this week interest...');
					getParam(matches[0], null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>(.*?)\%<\/td>\s+<\/tr>/i, replaceTagsAndSpaces, parseBalance);

					if(isAvailable('index_forecast')){
//						AnyBalance.trace('Trying to forecast of drawdown...');
						var interests = [];
						var regexp1 = /<tr>\s+<td>.*?<\/td>\s+<td.*?>.*?<\/td>\s+<td.*?>(.*?)\%<\/td>\s+<\/tr>/g;
						while((r1 = regexp1.exec(matches[0])) != null) {
	        			   		interests[interests.length] = Number(r1[1]);
						}

						result.index_forecast += Math.round(getForecast(interests,prefs.limit)/100*part);
					}
				}
			}
			AnyBalance.trace('Sum of open trades: '+sum);
			result.sum_open_trades = sum;

			if(isAvailable('index_forecast')){
				if(result.index_forecast<10)result.index_forecast=10;
				else if(result.index_forecast>90)result.index_forecast=90;
			};

		}

		if(matches = info.match(/<h2>weekly investor’s returns<\/h2>[\s\S]+?<\/table>/i)){
			var info1=matches[0];
			result.index_last_week = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?><span.*?>.*?\%<\/span><\/td>\s+<\/tr>\s+<tr>.*?\s+<tr>/i, replaceTagsAndSpaces, html_entity_decode);
			result.index_last_return = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?><span.*?>(.*?)\%<\/span><\/td>\s+<\/tr>\s+<tr>.*?\s+<tr>/i, replaceTagsAndSpaces, parseBalance);
			result.index_week = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>(.*?)<\/td>\s+<td.*?><span.*?>.*?\%<\/span><\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			result.index_return = getParam(info1, null, null, /[\s\S]*<tr>\s+<td>.*?<\/td>\s+<td.*?><span.*?>(.*?)\%<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);
		}
/*
		if(isAvailable('index_forecast') && (matches = info.match(/<h2>weekly investor’s returns<\/h2>[\s\S]+?<\/table>/i))){
			AnyBalance.trace('Trying to analyze for interests...');
			var interests = [];
			var regexp = /<td align="right"><span.*?>(.*?)\%<\/span><\/td>/g;
			while((r = regexp.exec(matches[0])) != null) {
	           		interests[interests.length] = Number(r[1]);
			}
			result.index_forecast = getForecast(interests,prefs.limit);
		}
*/
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
};

function getForecast(a,limit){
	var last = 0;
	var minus = 0;
	var lim = -5;if(limit != null){lim = -Math.abs(limit);}
	for(i in a){
		if(i<a.length && a[i]<lim){last=i;minus+=1;}
	}

	if(minus == 0){
		AnyBalance.trace('Forecast of drawdown by '+a.length+' week(s), none overlimit drawdowns with limit '+lim+' is about '+Math.round(50)+'%.');
		return Math.round(50);
	}

	var delta=last/minus;
	var f = (a.length - 1 - last)/delta;
	if(f<.1){f=.1;}else if(f>.9){f=.9;}

	last++;
	AnyBalance.trace('Forecast of drawdown by '+a.length+' week(s), '+minus+' overlimit drawdown(s) with limit '+lim+', last drawdown at '+last+'-th week is about '+Math.round(f*100)+'%.');

	return Math.round(f*100);
};

