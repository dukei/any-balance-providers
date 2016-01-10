/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс на Google Adwords.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках e-mail и пароль.
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

function main() {
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = 'https://adwords.google.com/';
    
	var html = googleLogin(prefs);
	
	html = AnyBalance.requestGet(baseurl + 'um/identity?authuser=0&dst=/dashboard/Dashboard?authuser%3D0%26mode%3Dreal%26type%3Ddesktop', g_headers);

	var form = getElement(html, /<form[^>]+id="gaia_loginform"[^>]*>/i);
	if(form){
		//Надо ещё разок ввести пароль
		var params = AB.createFormParams(html, function(params, str, name, value) {
			if (name == 'Passwd') 
				return prefs.password;
	    
			return value;
		});

		var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), action), params, addHeaders({Referer: AnyBalance.getLastUrl()})); 
	}
	
	if(/<form[^>]+name="tcaccept"/i.test(html)){
        //Надо че-то принять, че-то у них изменилось.
        throw new AnyBalance.Error('Google license agreement is changed. Please enter your Adwords account manually and accept changes.');
    }

    if(!/dashboard_clientInfo/.test(html)){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Could not enter AdWords account. Is the site changed?');
    }

	var gwtCfg = {
		url: baseurl + 'dashboard/',
		strong_name: '\\b%VARNAME_LANG%,%VARNAME_DEVICE%,%VARNAME_BROWSER%],(\\w+)\\)',
		secret_id: '0BE59D522F789E9DC14629E0DD231C0A',
	};

	var info = getJsonObject(html, /var dashboard_clientInfo=/);

	var result = {success: true};
    getParam(info.accountCurrencyCode, result, ['currency', 'cost', 'balance', 'last_pay_sum', 'average']);

    if(AnyBalance.isAvailable('cost', 'views', 'clicks', 'rate', 'average')){
    	try{
			var permutation = gwtGetStrongName(html, gwtCfg);
			var html = AnyBalance.requestPost(gwtCfg.url + 'modulesgwt?__c=' + info.customerId + '&__u=' + info.effectiveUserId + '&authuser=0', 
				makeReplaces('7|0|18|%url%|%secret_id%|com.google.ads.apps.mobile.shared.service.desktop.DesktopModuleService|getModules|com.google.ads.apps.mobile.shared.module.desktop.DesktopModuleSelector/2614045478|com.google.ads.apps.common.datepicker.shared.CompareDateRange/3221976067|Отсутствует|NONE|com.google.ads.apps.common.datepicker.shared.CompareDateRange$ComparisonType/1735517792|com.google.ads.apps.common.datepicker.shared.DateRange/358841294|За все время|ALL_TIME|com.google.ads.api.services.common.date.DateRange/1118087507|com.google.ads.api.services.common.date.Date/373224763|com.google.ads.apps.common.datepicker.shared.DateRange$DateRangeType/1228702317|com.google.ads.apps.mobile.shared.module.AccountInfo/3037695802|Europe/Moscow|%PARAMS%|1|2|3|4|1|5|5|6|7|8|0|9|3|10|11|12|13|14|8|1|2016|14|1|1|2001|15|0|0|0|30|3|2|0|16|17|0|8|0|0|1|148|18|1|0|1|0|', gwtCfg)
					.replace(/%PARAMS%/, info.servletParamsId),
				gwtHeaders(permutation, gwtCfg));
	        
   	   	   	var json = gwtGetJSON(html);
			var arr = findSums(json);
			if(!arr){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Could not find stats. Is the site changed?');
			}
	        
			AnyBalance.trace('Found stats: ' + JSON.stringify(arr));
 	 	 	
			getParam(arr[4], result, 'cost', null, replaceTagsAndSpaces, parseBalance);
			getParam(arr[7], result, 'views', null, replaceTagsAndSpaces, parseBalance);
			getParam(arr[2], result, 'clicks', null, replaceTagsAndSpaces, parseBalance);
			getParam(arr[6], result, 'rate', null, replaceTagsAndSpaces, parseBalance);
			getParam(arr[0], result, 'average', null, replaceTagsAndSpaces, parseBalance);
		}catch(e){
			AnyBalance.trace('Could not get stats: ' + e.message + '\n' + e.stack);
		}
	}

	if(AnyBalance.isAvailable('balance', 'last_pay_date', 'last_pay_sum')){
		html = AnyBalance.requestGet(baseurl + 'payments/u/0/adwords/signup?authuser=0&__c=' + info.customerId + '&__u=' + info.effectiveUserId + '&hl=ru', g_headers);
		AnyBalance.trace('Getting balance: redirected to ' + AnyBalance.getLastUrl());
		var pcid = getParam(AnyBalance.getLastUrl(), null, null, /[&?]pcid=([^&]*)/i);
		if(!pcid){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find required parameter. Is the site changed?');
		}

		html = AnyBalance.requestGet("https://bpui0.google.com/payments/u/0/transactions?hl=ru&pcid=" + pcid);
		getParam(html, result, 'balance', /<div[^>]+id="balance"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_pay_date', /<div[^>]+id="lastSuccessfulPayment"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'last_pay_sum', /<div[^>]+id="lastSuccessfulPayment"[^>]*>[^(<]*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}

function findSums(json){
	for(var i=0; i<json.length; ++i){
		var val = json[i];
		if(typeof val == 'string' && /\.CommonStats\b/.test(val)){
			//Суммы находятся сразу за CommonStats, 8 элементов
//		    "com.google.ads.apps.mobile.shared.module.CommonStats/3939813119",
//		  	"13,15\xA0\u20BD", //Avg cost
//		    "",
//		    "4\xA0809", //Interactions
//		    "0,00",
//		    "63\xA0240,07\xA0\u20BD", //Balance
//		    "0,00\xA0\u20BD",
//		    "0,55\xA0%",  //Interaction rate
//		    "869\xA0963", //Views
			return json.slice(i+1, i+9);
		}else if(isArray(val)){
			var arr = findSums(val);
			if(arr)
				return arr;
		}
	}
}