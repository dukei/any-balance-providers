/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

//var browserApi = 'http://browser.anybalance.ru:4024';
//var browserApi = 'http://192.168.0.117:4024';
var browserApi = 'http://localhost:4024';
var baseurl = 'https://login.mts.ru/amserver/UI/Login'

function main() {
    var html = AnyBalance.requestGet(baseurl, g_headers);
clearAllCookies();
    	html = AnyBalance.requestPost(browserApi + '/base/open', JSON.stringify({
    		userAgent: g_headers["User-Agent"],
    		url: baseurl,
    		rules: [
    		    {
                	resType: /^(image|stylesheet|font)$/.toString(),
                	action: 'abort',
               	}
		,{
               		url: /_qrator/.toString(),
                	action: 'request',
		},
    		    {
                	resType: /^(image|stylesheet|font|script)$/i.toString(),
                	action: 'abort',
               	}
		,{
               		url: /\.(png|jpg|ico)/.toString(),
                	action: 'abort',
                }
		,{
               		url: /.*/.toString(),
                	action: 'request',
                }
    		],
    	}), {"Content-Type": "application/json"});
    	var json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}
    	var page = json.page, num=0;

    	do{
    		++num;
    		AnyBalance.sleep(3000);
  			html = AnyBalance.requestGet(browserApi + '/base/status?page=' + page);
  			json = JSON.parse(html);
    		if(json.status !== 'ok'){
    			AnyBalance.trace(html);
    			throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    		}
    		AnyBalance.trace('Статус загрузки: ' + json.loadStatus + ' (попытка ' + num + ')');
    		if(json.pendingRequests && json.pendingRequests.length > 0){
    			for(let j=0; j<json.pendingRequests.length; ++j){
    				var pr = json.pendingRequests[j];
    				var headers = [];
    				for(var name in pr.headers){
    					var values = pr.headers[name].split('\n');
					if(name === 'referer')
						continue;
    					for(var i=0; i<values.length; ++i)
    						headers.push([name, values[i]]);
					
    				}
    				html = AnyBalance.requestPost(pr.url, pr.body, addHeaders(headers, {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    					'Accept': '*/*',
//						'Origin': 'https://login.mts.ru',
//						'Sec-Fetch-Site': 'same-origin',
//						'Sec-Fetch-Mode': 'cors',
						//'Sec-Fetch-Dest': 'empty'
    				}), {HTTP_METHOD: pr.method});
    				var params = AnyBalance.getLastResponseParameters();
    				var convertedHeaders = {}, ct;
//    				params.headers.push(['set-cookie', '_HASH__=' + AnyBalance.getCookie('_HASH__') + '; Max-Age=3600; Path=/']);

    				for(var i=0; i<params.headers.length; ++i){
    					var h = params.headers[i];
    					var name = h[0].toLowerCase();
    					if(['transfer-encoding','content-encoding'].indexOf(name) >= 0)
    						continue; //Возвращаем контент целиком
    					if(name === 'content-length'){
    						//https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
    						h[1] = '' + unescape(encodeURIComponent(html || '')).length;
    					}
    					if(convertedHeaders[name] === undefined){
    						convertedHeaders[name] = h[1];
    					}else if(Array.isArray(convertedHeaders[name])){
						convertedHeaders[name].push(h[1]);
					}else{
    						convertedHeaders[name] += [h[1]];
    					}
    					if(name === 'content-type')
    						ct = h[1];
    				}
    				var pr = {
    					id: pr.id,
    					page: page,
    					r: {
    						status: AnyBalance.getLastStatusCode(),
    						headers: convertedHeaders,
    						contentType: ct,
    						body: html
    					}
    				}
    				html = AnyBalance.requestPost(browserApi + '/base/response', JSON.stringify(pr), {"Content-Type": "application/json"});
    			}
    		}else if(json.loadStatus === 'load')
    			break;
    	}while(num < 15);

    	if(json.loadStatus !== 'load')
    		throw new AnyBalance.Error('Не удалось получить информацию для входа');

    	html = AnyBalance.requestGet(browserApi + '/base/content?page='+page);
    	json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}
    	var htmlContent = json.content;

    	html = AnyBalance.requestPost(browserApi + '/base/cookies', JSON.stringify({
    		page: page,
    		urls: [baseurl]
    	}), {"Content-Type": "application/json"});

    	json = JSON.parse(html);
    	if(json.status !== 'ok'){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Ошибка browser api: ' + json.message);
    	}

    	html = AnyBalance.requestPost(browserApi + '/base/close', JSON.stringify({
    		page: page,
    	}), {"Content-Type": "application/json"});

    	for(var i=0; i<json.cookies.length; ++i){
    		var c = json.cookies[i];
    		AnyBalance.setCookie(c.domain, c.name, c.value, c);
    	}

        html = htmlContent;
}

function main_old() {
    var prefs = AnyBalance.getPreferences();

	AnyBalance.setOptions({
		PER_DOMAIN: {
			'ihelper.mts.ru': {
				SSL_ENABLED_PROTOCOLS: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
			}
		}
	});
	

    if(prefs.__initialization)
	    return initialize();

    var result = {success: true};

    var html = login(result);

	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
	
    adapter.mainLK = adapter.envelope(mainLK);
	
    adapter.mainLK(html, result);
    var were_errors = result.were_errors;

	result = adapter.convert(result);
    if(were_errors)
    	setCountersToNull(result);

    AnyBalance.setResult(result);
}

var g_countersTable = {
	common: {
		"balance": "balance",
		"bonus": "bonus",
		"min_local": "remainders.min_local",
		"min_left": "remainders.min_left",
		"min_left_mezh": "remainders.min_left_mezh",
		"min_left_connect": "remainders.min_left_connect",
		"sms_left": "remainders.sms_left",
		"sms_europe": "remainders.sms_europe",
		"sms_world": "remainders.sms_world",
		"mms_left": "remainders.mms_left",
		"sms_used": "remainders.sms_used",
		"min_used": "remainders.min_used",
		"min_love": "remainders.min_love",
		"min_used_mts": "remainders.min_used_mts",
		"min_left_mts": "remainders.min_left_mts",
		"min_left_mts_rf": "remainders.min_left_mts_rf",
		"tourist": "remainders.tourist",
		"abonservice": "abonservice",
		"debt": "debt",
		"pay_till": "pay_till",
		"min_till": "remainders.min_till",
		"traffic_left_till": "remainders.traffic_left_till",
		"sms_till": "remainders.sms_till",
		"mms_till": "remainders.mms_till",
		"traffic_left_mb": "remainders.traffic_left_mb",
		"traffic_used_mb": "remainders.traffic_used_mb",
		"traffic_used_by_acceptors_mb": "remainders.traffic_used_by_acceptors_mb",
		"cashback": "remainders.cashback",
		"statuslock": "remainders.statuslock",
		"credit": "remainders.credit",
		"services": "remainders.services",
		"services_free": "remainders.services_free",
		"services_paid": "remainders.services_paid",
		"usedinthismonth": "usedinthismonth",
		"usedinprevmonth": "usedinprevmonth",
		"license": "info.licschet",
		"monthlypay": "monthlypay",
		"phone": "info.phone",
		"fio": "info.fio",
		"bonus_balance": "remainders.bonus_balance",
		"sms_left_perezvoni": "remainders.sms_left_perezvoni",
		"last_pay_date": "payments.date",
		"last_pay_sum": "payments.sum",
		"__tariff": "tariff"
	}
};


function initialize(){
	var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите телефон (логин)!');

	var ret = loginWithoutPassword(); 

	var result = {success: true, __initialization: true, login: prefs.login, password: ret.password};

    AnyBalance.setResult(result);
}

