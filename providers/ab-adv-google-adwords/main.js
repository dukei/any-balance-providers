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
/*
function evalAll(arr, url){
	var largeScript = arr.join('\n');

	var ABSave = AnyBalance;
	var formParams = {};

	function Element(tag){
		this.attributes = {};
		this.tagName = tag;
		this.style = {};
		this.dir = 'ltr';
		this.children = [];
		this.setAttribute = function(name, val){
			this.attributes[name] = val;
		}
		this.getAttribute = function(name){
			this.attributes[name];
		}
		this.appendChild = function(elem){
			this.children.push(elem);
			elements.push(elem);
		}
		return this;
	}

	function createGetInterceptor(target, objectName){
		return typeof Proxy != 'undefined' ? new Proxy(target, {
			get: function(target, name, receiver) {
       			ABSave.trace('get was called for: ' + objectName + '.' + name);
       			if(!isset(target[name]))
       				ABSave.trace('!!!!!!!!!!!!!! ' + objectName + '.' + name + ' is undefined!!!!!!!!!!!!!!!!!!!!!');
       			return target[name];
   			}
   		}) : target;
	}

	var doc = {
		_cookie: '',
		compatMode: 'CSS1Compat',
		forms: {
			challenge: {
				appendChild: function(elem){
					formParams[elem.name] = elem.value;
				}
			}
		},
		
		get cookie(){
			return this._cookie;
		},
		
		set cookie(str){
			try{
				AnyBalance = ABSave;
				AnyBalance.trace('Setting cookie: ' + str);
				var name = getParam(str, null, null, /[^=\s]+/i);
				var val = getParam(str, null, null, /=\s*([^;]*)/i);
				AnyBalance.setCookie('adwords.google.com', name, val);
				this._cookie = name + '=' + val;
			}finally{
				AnyBalance = undefined;
			}
		},

		createElement: function(tag){
			return createGetInterceptor(new Element(tag), 'element<' + tag + '>');
		},

		getElementsByTagName: function(tag){
			ABSave.trace('getElementsByTagName(' + tag + ')');
			var e = elements.filter(function(e){ return e.tagName == tag });
			if(!e.length)
				ABSave.trace('Could not find elements by tag: ' + id);
			return e;
		},

		getElementById: function(id){
			var e = elements.find(function(e){ return e.id == id });
			if(!e)
				ABSave.trace('Could not find element by Id: ' + id);
			return elements[id];
		},

		lastModified: new Date().toString(),
		characterSet: 'UTF-8',
		documentElement: new Element('html'),
		domain: 'adwords.google.com',
		body: new Element('body'),
		readyState: "complete",
		styleSheets: [],
	};

	var elements = [doc.createElement('body'), doc.createElement('head')];
	
	var XHR = function(){
		this.method = "POST";
		this.url = '';
		this.headers = {Referer: url};
		this.body = '';

		this.open = function(method, url){
			this.method = method;
			this.url = joinUrl(baseurl, url);
		}

		this.setRequestHeader = function(name, val){
			this.headers[name] = val;
		}

		this.send = function(body){
			try{
				AnyBalance = ABSave;
				this.body = body;
				AnyBalance.trace('Requesting ' + this.url + ' with ' + body);
				AnyBalance.requestPost(this.url, body, addHeaders(this.headers), {HTTP_METHOD: this.method});
			}finally{
				AnyBalance = undefined;
			}
		}
	}

	var intervals = [];
	function doIntervals(){
		var isThereInterval = false;
		do{
			for(var i=0; i<intervals.length; ++i){
				var interval = intervals[i];
				if(interval){
					isThereInterval = true;
					var now = +new Date();
					var wait = interval.when - (now - interval.lastTime);
					if(wait > 0){
						ABSave.trace('sleep before interval');
						ABSave.sleep(wait);
					}
					var f = interval.what;
					f();
		    
				}
			}
		}while(isThereInterval);
	}

	var win = {
		document: createGetInterceptor(doc, 'document'),
		XMLHttpRequest: createGetInterceptor(XHR, 'XHR'),
		navigator: createGetInterceptor({
			appName: 'Netscape'
		}, 'navigator'),
		screen: createGetInterceptor({}, 'screen'),
		innerWidth: 913,
		location: createGetInterceptor({
			host: "adwords.google.com",
			href: url,
			get search(){
				return getParam(url, /\?.*./i)
			}
		}, 'location'),
		Error: Error,
		Function: Function,
		Math: Math,
		Array: Array,
		TypeError: TypeError,
		setInterval: function(what, when){
			ABSave.trace('setInterval(' + what + ',' + when + ')');
			intervals.push({what: what, when: when, lastTime: +new Date()});
			return intervals.length;
		},
		clearInterval(id){intervals[id-1] = null; ABSave.trace('clearInterval(' + id + ')')}
	};

	var winProxy = createGetInterceptor(win, 'window');

	this.document = win.document;
	this.window = winProxy;

	var com_google_ads_apps_usermgmt_billing_client_main_Module_serverDuration = '2649';
	var com_google_ads_apps_usermgmt_billing_client_main_Module_baseServletPath = '\/um\/Billing';
	var clientInfo = {
    'accountCurrencyCode': 'RUB',
    'currencySymbol': '₽',
    'accountCountryCode': 'RU',
    'accountDateTimeZone': 'Europe\/Moscow',
    'accountRegionCode': 'RU',
    'authenticatedUserId': '9056379995',
    'authenticatedUserName': 'uds.maxop@gmail.com',
    'buildVersion': 'v1491825984',
    'customerId': '9470317835',
    'effectiveUserId': '9056379995',
    'multiloginSessionIndex': '0',
    'token': 'D9tX206x1IFZQOfJUfRbbrv0y9M:1492079092189',
    'disabledFeatures': '0,2,3,4,5,8,11',
    'canUpdateAccount': 'true',
    'changeBillingPermission': 'true',
    'isInternalOrBillable': 'true',
    'billingIntegrationTimeout': '90000',
    'billingNavigationTabsId': 'SUMMARY,SETTINGS,PAYMENT_METHODS,TRANSACTIONS',
    'customerBillingId': '84228395',
    'customerBillingStatus': 'ACTIVE',
    'transferApprovalStatus': 'NOT_REQUIRED',
    'tokenDuration': '3000000',
    'AUTH_token': 'AHbxessAAAA7ChYIBxIINzY2MDYyMzUaCDg0MjI4Mzk1EMjH4La2KygDQhQxNTg1MjU1Njc2OTgwMDU2NzAwNFoCCAHBDE0pRw9uRLwOJpHkIPclygu4soF71yvZ+AwFdyw6ELtuJG5rbVDE+oyvHrZpqRlAazTt0E1LuV4IYAnK0G8yWvjDY+OFNGiXJ0ANUGA+\/+viOPXFDqkIhTwRBZjdLesjSIbjqhIkhIZaItQhSrgDbjpgYJVL82yyrGJ6\/ceyUoXwks7bQKY4El7RqZRWLJgRJt4MU+k6qAJE35KpuNx6TreIXvR+t3Arn8c+cKclyXHXjeUhgU4ynaBH+NGHifOuUFVcVhFCGwF4pjMQYpzPUnILSULO0KM80ymtj1oZYwATMTUHxRnPbxMG1KHT6QUxcHO8MAPCNVvryrBjK4iN',
    'SUMMARY_token': 'ALFTWs1ASklxUCIB9CbkIwFGBWOWWuE35lUcxQwnoANp1pcGdsIxIXjL4ljdkBpiPvQErdW9+NtUVM4yLMj7g0qptzJe2BbdpJjGXNDUTThmXMIskIf5oCLiR5bwRv7pIOvDbHFa44nJv\/lEzvcqsVsG6TQj2D6zOI7EErch4L5iChWsK1fxEcr8wnfoa7CiIXVb9Nl7pbbntnxdfjl7V1oMKAxK\/X08kYJUdb78As7+DDg\/HawRE4BF3FvTyXPR5CJr2alPiuCLbYbzeYKRdo3ID05He7WYcTN+FKwfpx0STm9hE\/d3M+mkesVTDyw0jhrM2pccHzceifQDa+NuMGqxie6Yytnt64wUFqhIVZfFsnLJYedbZ1hE0q07Ni\/BBA0LhAJZwYxDLvY\/lFfzYsC8H0cb3S6PzK5DRxLKk7c6T8+Is1xX3KawJQ21BIVQCWuU+FeGJ7w28eDsI9CkGHEoUxilNBSDAmJmn3F5VRJ0plxOeCYTqeuMGYsrlrwS3AMKBWtn5QZmIC9QEW5wjxmbIgEtbSOvqAdljcsPf+DJkSTtZz3LCtM\x3d',
    'SETTINGS_token': 'ALFTWs05s5PT93Xc4ZGYNW\/TkjssaD6imlcl5QPxACkqew9E7wXMwegN3kvj0C2JZpA0ShtAyROQvYtjVL9bKRajSo1B3F0\/FPZNHICmD0JhA0ng8htAezdvQuDbDrKNFppbleGhgY1wTjMS6b8IhE5zGTxVzhqVIVJIyVxXy0U4Oe0Rt2+q7QJsT\/l+I61D3+6A8Gc7NyNIYiOy3PUSfG\/Z78ltIvZUFdh9aRs+zBb3ZZhRFh6hNf4tG7If9h0VAAGrMPL1B0hNga\/hfYnlS4jZV3cx5nil+KuIqUcoo9CFXfUOJW8lJUMng3uAMMPBDM+xbFWJyzlE5lAFKd6Jr4PlzG4SilUzAT4Q9vIshakrm5OxnZl6bZGK5zNAVxCuw7UDERWpMv3nJhPekxTDZpfft0EDQEpnnoyo3DCgAiaCIcq1V3HyQNZQ+uEJg4eTHrlUoYsAldrbwDdgLJg0vLgY+zBQL1sexexpq43937kiC3KfCOWcHO\/fSQNdeGgxLPJcbzT7N5FCiRIXu68miEohzVBKfZzpUUiR+cZNiHzskluyTPInmIo\x3d',
    'PAYMENT_METHODS_token': 'ALFTWs3lt15tbhn6gCdLGfU8XbH7aA2\/Yx\/WaN3g4nDF7O2j+GuVzHbtmva9DxvnsmBxpoHHTfJQaPlczBLP3VDNNPFT2kT0pRbVLDETg0I+Rt6sZPXtlDI3wRQbwKlWMKzF4Fjb6T7ke2I\/dsiJ0IT0uULYnarqEAdcP0nt3XM6aCeyI42XQe+Kudb2UrlQQOZesWHbtuTWZNFOVQOkBnAOtwWjHvhylMnX+MoUUXW9or\/5dL4bBN3b\/xo4aQ3S6Hft0cbvLU0KezrzU03Fq8MRUTpiOW+8K0dLggdg5cZ\/QesnNfGRhM5q72n6PvlHYQWLadEYPOHp\/7E3Z5zlAjLMTMojA53xFcSawzmHp5omBAGmEtAjvApo7XQsVr8dG06WYnd8GXrEDPnoz8mjsbMLWaC83Mr9C59CF5cdYApWgIqGdMOyz6z2i60WADGnq\/cIvjrpepewvVG3kjyQFG5\/7uA3QCuvgnmfrW6iLQ39JEdaFZS68TpSQgHpCyadEtm0rDy2wZIRdioPYgpRjQWAC3tmKVIzvWkhMILTOvORre7NnJH542Y\x3d',
    'TRANSACTION_HISTORY_token': 'ALFTWs1ZixlSOlFp8pLzCOjdcPdsc8ZKIB\/635c\/5V7+IZGeEdnWRgaGwoHZ8i0RFLC7Ie5bmMwK\/GjRKOPE9zrCRfDFC+1Hc4nUQvdSqJGRQXLelG01oR0C5LAt4AnJ\/4tgNNe7gSbMd5KD6IkIX7lbomUoZoQThJD7R+HwYqU9AGx8U7LqOBNqKgxdGOJlswuOsGGiq2zpRk2XSZwI6F6i+8vC6fI6ucm8\/7TU1ObULZ\/bbGCz75GxUuUYj4zqnx7lccDyLPyKi+wXfoyWOMptSRTX8Q0dyM2LCYelQpJ4eg0CD6Y5v2+5PQAMnKg0ebzE6qH8N0vcQXfT0wEWhlEtIS2YnzXO+gygjrlF053sYDcyFYZAN4lizMgoCM5vX1FQzL2yE0OiGlehsl4VsFT+fNknRx7Qp+qfr5NPZqLtCcb6+cX4bLhAh\/3MZmb63Kgq5l2HK8jiD0UdvZ1gNA3+eEvJiZcd7u1JNvW100gr3o0LO1+\/XHuu3+NnGBr2X40zNUfiEElkQqAdXgcw1XOhclm39tC0p3T0roquXl\/E6lxdoiReTUk\x3d',
    'INVOICES_token': 'ALFTWs3h2aIq8peC6GBS\/7Pc12UWaIDjFE8INpXC7hylp3XdQC2UV7idIA4oZJjmsW1C7zEPXlHL5mVLexJDfLYdsOIJRdxocGVLAe1IxO+mM9mbtsdsvpibxFyHl885vX78wAD8FDch8lFJy3kYDvmg\/zDOwJl9iMueJ3UnDJndvVCP1RLwh9ylSbMJTfNqB5H5+DDt1PmR9rSofnMoZT2KxRjJtqy5fZ6FvcwepV84ndCiuxJI\/xkTdvKq8gQpKIejeFjbHPmNxVhwEPs+A5QLVNuwvI2ekTCPvtr0jC0geWCKSAMKJBl1ScJ2MdXAG1tHHd1wc6MFZkTVFopcFlOcLutw6V5r1paIFspMrCaDNC7TTfOmhM+McHMip94xBeZP2CjIu7ejwLF1YJO1EIZd3VtBo4mTtlIMkI3WDpuWWw3zEhIg\/V9LD8D6kDIQlv6Wh2M\/B+2UGySXb9unu\/sm4yQFJX9AzzN+5XxUN\/xlc7IMzreUTp0IkKfW0WHvMX5LjTWNSquZxP\/JQHSOfoyHkMTjBbz0Y82DQ0lbprffQoOSGXc8g50\x3d',
    'SIGNUP_token': '',
    'PENDING_token': '',
    'billingCustomerName': 'Aquasol',
    'billingCustomerNumber': '8836-9430-4582',
    'billingProductCorrelationId': 'awo6010368515-7-5160382355',
    'billingSetupStatus': 'COMPLETE',
    'externalCustomerId': '704-912-3126',
    'localePreference': 'ru',
    'obfuscatedAccountId': '6010368515',
    'signupDetailsUrl': '',
    'insServiceId': '7',
    'advertiserDateToday': '-48294658,2017\/4\/13:38105342,2017\/4\/14:124505342,2017\/4\/15'
	};

	var com_google_ads_apps_usermgmt_billing_client_main_Module_apexExperimentDiversions = '{\x22840\x22:[{\x221021\x22:\x221487708444247229\x22,\x221981\x22:\x22ADWORDS_NEXT_MCC\x22,\x222665\x22:348,\x222781\x22:0,\x223096\x22:0,\x223772\x22:[\x22AWSM\x22,\x22CUES\x22,\x22UM\x22]},{\x221021\x22:\x221491893968411622\x22,\x221324\x22:\x22TREATMENT_OPT_IN_M18\x22,\x221981\x22:\x22ADWORDS_NEXT_INTERNALOPS\x22,\x222665\x22:348,\x222781\x22:0,\x223096\x22:1,\x223772\x22:[\x22AWSM\x22,\x22CUES\x22,\x22UM\x22]},{\x221021\x22:\x221491893968411622\x22,\x221324\x22:\x22TREATMENT_OPT_IN_M18\x22,\x221981\x22:\x22ADWORDS_NEXT\x22,\x222665\x22:348,\x222781\x22:0,\x223096\x22:1,\x223772\x22:[\x22AWSM\x22,\x22CUES\x22,\x22UM\x22,\x22CT\x22,\x22PRIME\x22,\x22AWN_PRIME\x22,\x22AWN_INTERNALOPS\x22,\x22AWN_CM\x22,\x22CM\x22]},{\x221021\x22:\x221490657796825684\x22,\x221324\x22:\x22TREATMENT\x22,\x221981\x22:\x22UM_BILLING_MASTER_POST_SIGNUP_PAYMENTS_ACL_IN_ADS\x22,\x222665\x22:238,\x222781\x22:0,\x223096\x22:1,\x223772\x22:[\x22UM\x22]},{\x221021\x22:\x221482361777393828\x22,\x221324\x22:\x22TREATMENT_PRODUCT_FEATURE\x22,\x221981\x22:\x22UM_BILLING_MEGABLOX_EXPERIENCE\x22,\x222665\x22:464,\x222781\x22:0,\x223096\x22:1,\x223772\x22:[\x22UM\x22]},{\x221021\x22:\x221490373894453333\x22,\x221981\x22:\x22ADWORDS_NEXT_KEYWORD_PLANNER\x22,\x222665\x22:348,\x222781\x22:0,\x223096\x22:0,\x223772\x22:[\x22AWSM\x22,\x22UM\x22,\x22KP\x22]},{\x221021\x22:\x221485807574441622\x22,\x221324\x22:\x22TREATMENT\x22,\x221981\x22:\x22UM_BILLING_NO_CACHE_PAGE_OBJECTS\x22,\x222665\x22:99,\x222781\x22:0,\x223096\x22:1,\x223772\x22:[\x22UM\x22]}]}';
	var com_google_ads_apps_usermgmt_billing_client_main_Module__preferences = '\/\/OK[2,2,2,3,1,[\x22java.util.ArrayList\/4159755760\x22,\x22com.google.ads.api.services.preferences.types.NotAvailable\/3703634061\x22],1,7]';
	var com_google_ads_apps_usermgmt_billing_client_main_Module_isInitialDataAvailable = true;

	function com_google_ads_apps_usermgmt_billing_client_main_Module(){
//	    var I = 'bootstrap', J = 'begin', K = 'gwt.codesvr.com.google.ads.apps.usermgmt.billing.client.main.Module=', L = 'gwt.codesvr=', M = 'com.google.ads.apps.usermgmt.billing.client.main.Module', N = 'startup', O = 'DUMMY', P = 0, Q = 1, R = 'iframe', S = 'javascript:""', T = 'position:absolute; width:0; height:0; border:none; left: -1000px;', U = ' top: -1000px;', V = 'CSS1Compat', W = '<!doctype html>', X = '', Y = '<html><head><\/head><body><\/body><\/html>', Z = 'undefined', $ = 'readystatechange', _ = 10, ab = 'Chrome', bb = 'eval("', cb = '");', db = 'script', eb = 'javascript', fb = 'moduleStartup', gb = 'moduleRequested', hb = 'com_google_ads_apps_usermgmt_billing_client_main_Module', ib = 'Failed to load ', jb = 'head', kb = 'meta', lb = 'name', mb = 'com.google.ads.apps.usermgmt.billing.client.main.Module::', nb = '::', ob = 'gwt:property', pb = 'content', qb = '=', rb = 'gwt:onPropertyErrorFn', sb = 'Bad handler "', tb = '" for "gwt:onPropertyErrorFn"', ub = 'gwt:onLoadErrorFn', vb = '" for "gwt:onLoadErrorFn"', wb = '#', xb = '?', yb = '/', zb = 'img', Ab = 'clear.cache.gif', Bb = 'baseUrl', Cb = 'com.google.ads.apps.usermgmt.billing.client.main.Module.nocache.js', Db = 'base', Eb = '//', Fb = 'locale', Gb = '__gwt_Locale', Hb = 'runtimeLocale', Ib = 'default', Jb = 2, Kb = 3, Lb = 4, Mb = 5, Nb = 6, Ob = 7, Pb = 8, Qb = 9, Rb = 11, Sb = 12, Tb = 13, Ub = 14, Vb = 15, Wb = 16, Xb = 17, Yb = 18, Zb = 19, $b = 20, _b = 21, ac = 22, bc = 23, cc = 24, dc = 25, ec = 26, fc = 27, gc = 28, hc = 29, ic = 30, jc = 31, kc = 32, lc = 33, mc = 34, nc = 35, oc = 36, pc = 37, qc = 38, rc = 39, sc = 40, tc = 41, uc = 42, vc = 43, wc = 44, xc = 45, yc = 46, zc = 47, Ac = 48, Bc = 'user.agent', Cc = 'webkit', Dc = 'safari', Ec = 'msie', Fc = 'ie10', Gc = 'ie9', Hc = 'ie8', Ic = 'gecko', Jc = 'gecko1_8', Kc = 'selectingPermutation', Lc = 'com.google.ads.apps.usermgmt.billing.client.main.Module.devmode.js', Mc = 'pt_PT', Nc = '019C3AFB489D84CF9DABEDC3F63BC53E', Oc = 'de', Pc = '03161B519E8864BF95CDF7F0A3DAFB30', Qc = 'hi', Rc = '036900DAEA49225BD5B13CF33D64269B', Sc = 'es_419', Tc = '058425C5B5DFAB02E1DEFC9604BFD69C', Uc = 'el', Vc = '058CCB761C6783AA62722CF63D2D64EF', Wc = 'da', Xc = '0600F463E4B3AA08DDD220524E961FDE', Yc = 'ms', Zc = '06500D8001F1EB7AE47D05140515C78D', $c = 'id', _c = '07A966BD1B12170AC2AD09424E58D265', ad = 'ko', bd = '08385869F46E638E9581F950B3A30C68', cd = 'ar_XB', dd = '08AD0C3C06ED460F1DA0A5CCEE3F842D', ed = 'th', fd = '09C557372FCA379288BB023E7CC532B4', gd = 'pl', hd = '0ADA3545F8ABDF56FDC001ADC303A90D', jd = '0BAE03C0BAF6CEF630C672E036AD9E7E', kd = 'nb', ld = '0BED2BE12BAF01AE50D0EDD47114A8F0', md = 'en_US', nd = '0CA326FC92A6D0960722B964E2F40787', od = 'zh_TW', pd = '0D645038EA2C54B7413FBA1CBF397ED7', qd = 'lt', rd = '0DABF02C6349297DBD70102A64B8F8B4', sd = 'fi', td = '0E2BB4C46A70B228A492A115780A53FB', ud = 'sk', vd = '0E478D65E3046061F317D62BB342A6B2', wd = 'it', xd = '0E51F7CEDC93371679B7B2B0E52965B5', yd = 'sv', zd = '112F0F31E1CC8E3DAA38CF3DC94297BD', Ad = '12A7E444728B93A9AC4B5B98FA733A31', Bd = 'fil', Cd = '12DC4544E1EFB9B934C30916D3E057A7', Dd = '12ED2E0610BDD28F7F4692AE2293684D', Ed = 'he', Fd = '13DD27568E0B19C5E8BA3CC2E25953C2', Gd = '13F1E4452E67A713C26A9F8848F530E9', Hd = 'ca', Id = '14555174426F673CD24F27253970A5F0', Jd = '15C72A467C5C97E3097A185D19F7A1E9', Kd = 'ar', Ld = '162FB6D83CEEB5D28EDB18410449C10A', Md = 'sr', Nd = '16AEDDDC441099A4804B102B1CC4E7EE', Od = '17EE7A9796BFD62341FE9C67C6B993F2', Pd = 'sl', Qd = '1856B3C95A325B8C56CADF56C7143F0C', Rd = '19185C4821DA98B39555D8E77430A4AB', Sd = '1A2A3B54FA3CB50FCC4EA2D200011EB5', Td = 'hr', Ud = '1D79621361340F057FF5C468C0BEAB93', Vd = '1DE82901C5F3757CF30136B9810CDC16', Wd = 'en_XA', Xd = '1E78458CCCCC42FFF6C947550DB5039A', Yd = 'en_GB', Zd = '2195424AF3588BA835C8562220F3A9EF', $d = '229F4717DB24A3AA713FD86C56D54196', _d = 'vi', ae = '24BFE1B2FFD497B6AA3D264A1AFCCA79', be = '2529270E1364F2F101F345BDD54E2441', ce = '26264BDFC7C45983A0FDE6276949010F', de = 'hu', ee = '266310CBB7D5C5C1430475028F1CB0B7', fe = 'cs', ge = '27016E8FFD7C6C3911792A63D07262D5', he = '2B272BA818B7835A92CC25D645CD7D71', ie = 'en_XC', je = '2C20F9888EBC40711DA1F80504030AC2', ke = '2C7D61B07F73144B4C9D389961970A19', le = 'zh_CN', me = '2E0520ED894425B1591A8FF6F60E65DA', ne = '2E1DA0E16433A3BC82FA2102BB8B1644', oe = '2F3427C5D7F05637BD3A96E4C54C14D4', pe = '2F537163A593F215EC8D4CA327944D82', qe = '2F5C9350EF6E07E60EBB7E65121CF4D9', re = '2F7254687194E0DC8B53280DE2050CAF', se = '30569A949EC83551F58281FFFA88D2C1', te = '3107F6AF7A07EC9FBF0E8AC8567B58C7', ue = 'en_AU', ve = '31570BC39EBCDDFF8DEFFF95624ACA55', we = '3180DA663FF607592DB82BF5777F012E', xe = 'ro', ye = '3196FEF16E67D3EB2FE1F3949A85DF66', ze = 'lv', Ae = '31DEA1BE96E627AA5A62589C30D9CBFD', Be = '31FF09C7B06F73C79C7A574910787402', Ce = 'ja', De = '3243728B5FA2834C54A3D7517B68643A', Ee = 'es', Fe = '354958E6DBDF560650F1840626B418AA', Ge = '3570738C94867B505DE1576CB0F3FD81', He = '371646992270A75AE3516A79199540ED', Ie = 'pt_BR', Je = '375192B0AC8C773D4CA9DB0A20E768A5', Ke = '3ABFE975EBC03898A6407B377254285E', Le = '3C2854C1505B848D624412101B03FEB9', Me = 'uk', Ne = '3C42636F76B4A3DE500BD1E6D5BEAC5A', Oe = 'et', Pe = '3C6981CF2281EA063AFBB3B97AA62290', Qe = '3D43B21E70B125297923FD3A182E5041', Re = '3DC58BF8290024C6AD0BE3D6592E8E4B', Se = '3F2A4EE67724DAD75CEB3190A2FC9511', Te = '42E03B1E144C59804F121550A1D34EA6', Ue = '4318AA80E550602DF031D9C7CBA5354D', Ve = '435DD9CF74CA66ADB17C32E35370D868', We = '44CD93830B45172D34FAA946A9CFE1A3', Xe = '45CE42D5375841F8F706E8457481B0D9', Ye = '45E5A31C64DCF61A37A0D627A49AA199', Ze = '46F6ED6CD86BDAF64B1A36ABAF14AF02', $e = '46F88E90406F66C8C3254A2E930822B0', _e = '47D7D9206B0A6B1FE60B60A4B4CE1163', af = 'bg', bf = '49A299CF9FB02A301F21EA910F3744D8', cf = 'fr', df = '4CA48D66667966EA8250D8F1B1FA3681', ef = '4DC725C6A38658BD756FE7A2FDF8FE3F', ff = '4EAC582B312A6B928FBA7A1AA9BF4002', gf = 'nl', hf = '4F7906E9568D37F82431A41BF26866BE', jf = '4F88902274B91F452008A152F1C06F58', kf = 'tr', lf = '4FC506F9A3693D2DAD14E10A6AE9140D', mf = '517197747992EC4FE1C309235F63A020', nf = '51A95DB06C7A836DF7ED313A117FA541', of = '523E1F71148B6A9F9363CDC6BD874F8C', pf = '52A895B77E0F57D8A398B1FB32A3108A', qf = '544DEE3254804595111F801DA339F91E', rf = 'zh_HK', sf = '548923FF073939AA8D9AC8909D22C645', tf = 'ru', uf = '54B5E454BCE4BDA0962BF3566C5B9FBB', vf = '5508AB31CD441D26FC9F30A1170E2CC5', wf = '585E12C04425D0A58CEEACB725E92EF0', xf = '5869145FE58A797666C9789C2098D5D5', yf = '58FE2FEF4D24790A3DC2181865938B73', zf = '59A281FC2C5EB32D201F570F316D2E61', Af = '5A54F2A37A1BF5889E6537B35461EED9', Bf = '5B10C2440FAAE12BB6B163072E9E3733', Cf = '5C6C61EC04EA2D1E35BB2973C95D0E09', Df = '5DE518913D669FB94CCD77BC2F1BDF31', Ef = '60194BED2DD08CAAB0917A13EFDF0B3D', Ff = '6190CB4EBA9383B05E2ABFA1B8C5B488', Gf = '627A1CE291C44DC39F42D1041D41EE03', Hf = '63085028EAE178BA35B55E146FADCA20', If = '66C6D84C8CAA274CE8E7ACFCA68116A4', Jf = '696708EC4DECEBFB817E6845C677DEA6', Kf = '69D40522C58D71D1D67FBD948987F212', Lf = '6A3821F55A81A6C5E1AB6607B03A85B5', Mf = '6AF57B53E8D23CF653DD29ADF842374A', Nf = '6BE62E7DF60DDBD05987B8EC009DFD98', Of = '6C310F2DE4148829ED01281F288704FF', Pf = '6C47B4D57E4669F99DA502829AEC3DA7', Qf = '6C59A9D2B1098D5BED2045163E17EBA4', Rf = '6DDFE4CEFD65DBE1BDB989A675DC6D01', Sf = '7054C388CD8E06B02D98C04F0C296CA8', Tf = '7285DCE435C75A5285E1AC5C83B8BA33', Uf = '74E4E29010C7F0BE1A66121AF056F2DD', Vf = '75A7B27262416992886D066BA163B3D5', Wf = '76081199F2D33C780B5988D2EFE24ED7', Xf = '778A1B5215891B9141A3F1E020DB156A', Yf = '77F465001DDE3D034B6710CFB38BFD6D', Zf = '7830DB53F54CFF7E169F41D62CA17659', $f = '7A7DC3B3A7ABE93BD4BA231E4C634077', _f = '7A89969CA668B429628A48C966E50DD2', ag = '7AF736D60DD66A6FB8A72C8686352A0C', bg = '7B3056EC99345519D62D9C087E86698B', cg = '7C14AD909203AA56632FDF3278A50B60', dg = '7C5A05DD3B781A534401FA2FC5533FC2', eg = '7E30F92EBFE0AE550DE20902F7562096', fg = '7F94A2685ED7D6EA3DE7F9590A9D1210', gg = '80099E33A12F7724CF36E3FFC71E4DF4', hg = '80FC97B1246E710A14CDA1FBC4797FD8', ig = '82694309E55A91CDBCF10A6DC03F32ED', jg = '82D54D8BC9EE7BB5B4FA6FA245A5BF65', kg = '839F51EB8F5A2714950308B4C24F0C3E', lg = '842DED8A1E1EA4A9E2337ACF36D1F011', mg = '868F544F0075AD916E7A9A03EA35996E', ng = '89FE48FFDC2DFEA546124D33A466F0CA', og = '8A9893720A82F6CD5A094EE9199FD362', pg = '8AD78F7B5682C0A02AE637DB6D40353D', qg = '8B2033FBB9D9384E59708ECBBBD123F1', rg = '8BEEC4B504B43DAB1A12898FDEA87F66', sg = '8CA0A1724FC96E47F668ED1A12F221FE', tg = '8D6E620B62D032775CBF524BB9FE7A1D', ug = '8E530088A3817CE4B00E4F5124CD7F5A', vg = '8FC11670523CE4B6FD50720D2FD2D9E2', wg = '91695B21335D8E71D8388E527E8B6FD8', xg = '91A840B89CFE3F16E00E88180B1F1FB5', yg = '9219F07206069BBD6CEE83DBFC9767B0', zg = '96C849B7CC55BBBBD6C453A38374B6BF', Ag = '989BBF5996E8FA487D028115B5B212C9', Bg = '9B89B9AE54DE63D9DDA3408143CAE221', Cg = '9C9B0BDCEC4E0FDC6AD842AAA52735EC', Dg = '9EC4BA9A63D0F00008750A0482258283', Eg = '9F11E2346B4E211AF2CB76E2E6A5485E', Fg = '9FF3136D0F83929B827AA3C292705DDC', Gg = 'A1572BD007E42CCD9088030D939D2860', Hg = 'A1DA6DD8DD4C11C2065BEB2765C0F6CC', Ig = 'A1DC0B48AD5CBDD38B360D2B7F2D93A7', Jg = 'A1E86365D9BF2C38189686DF6F367066', Kg = 'A2D3E07D791B5C350F0AC52B5F677AAA', Lg = 'A3D028F2906035513A960A3E72D280CD', Mg = 'A6738F3C6CCCB545CB22B5774202C9E1', Ng = 'A6E7DB36EC4E2BA1041FB2D1083C11A0', Og = 'A8E9FDD6F0121A7ED4103BC614A3AC42', Pg = 'A8F3CB8C5A99B64ADA06D9035E8A7189', Qg = 'A90D543A70D60DB0454CB070758D3CAA', Rg = 'AA26B9BB8FAB4075AD280421957F66AC', Sg = 'ABE14AD2CB6655617C015C2EFF6A2960', Tg = 'AC22E9B1A2A8545E9B2ADF66769B596A', Ug = 'AC5DE8F9400347540714E9224C612C96', Vg = 'AC79940BA228510A45121DD3876F1E24', Wg = 'AD1132248CA6BA589A8008DFD90079A6', Xg = 'B1153CEDDE603E3FBF546DE3A35FBEE4', Yg = 'B4359028EE4C451739BB53BD6B4F7D1D', Zg = 'B467E9BB85A55233BC934EFE8845D3DB', $g = 'B4B6A5C2EE0D0CEFF6BB06BCE3608DC5', _g = 'B56FD155DC835A4E2DA1FAF8CDCA3812', ah = 'B6BF55C0F2A7F177387E9D2650A7AEFF', bh = 'B8C1B6CB691AD1AD13B2E986270E98B1', dh = 'B8EE7FB192B260103F8B63FB1D780837', eh = 'B92CA5D7BC986B4832153FB8ECF18FB9', fh = 'B9697AE9500A722B3CF25147E503C6E8', gh = 'BA3BAB8C886F29928BEA632260114F66', hh = 'BAE54709F4347C8C02A000A43318278F', ih = 'BB70E7CFFC470EC08F7F2362A2843D72', jh = 'C04BE1B3733F676808B60FA50750FF52', kh = 'C0AE0B2964C3A74EB5E04AA746349CAC', lh = 'C21E85A82D208E98BE7EEE7F8C5AD272', mh = 'C2F8A7F3B350AB59B7B00D6246C8FA2D', nh = 'C4A3F9BB3EA4B4E0AEC10F0FAAAEA26B', oh = 'C4F00CBF9F7F2428AD74A06D85D893AA', ph = 'C5F2C58D1ADC746179B8B0F3FD0A474A', qh = 'C6279F3F125DB6651F9ADAED99897C2D', rh = 'C63A05A02446D6D6F53958C324D92FAA', sh = 'C794DDEE904B5F3DE2337D78BEBA65DC', th = 'C86AE2CBE01C1B0250B98369BF2C8222', uh = 'C89D3F0CEF133F4D20FBF0F7B0817504', vh = 'C96522309F246DAF78E2DCD52CB6FC0F', wh = 'CAB64FEB53FF89E52CEAC5815EAD2277', xh = 'CBC76AC92C2ED77A491BF24F9AC12DD7', yh = 'CDA6A79364C4B3A38FC854DF4282341B', zh = 'CF4BBDC26BD27DFEFF633D2CB7C86AEB', Ah = 'CFA2330627A18F6D9D91A95CF43D5FBA', Bh = 'D18D49DFBDE348A46A03945AB5DBED11', Ch = 'D1BE4BA448002F405F20EB1DC7E4A7A6', Dh = 'D2588A1D47E7FA0A93E4BA72EEC02582', Eh = 'D332EB7F8BEF07801D33AE3CD716B022', Fh = 'D37F43703361DBF9C36B8C0829B3AE10', Gh = 'D44FC6C5BB8A0CBD5C628C792AA372C2', Hh = 'D8B90BAE5A1388310049A7A53DF86BCF', Ih = 'DB98D822C708F300B8E76F687458D5EB', Jh = 'DD74D94271784B165CDF03936C82A41E', Kh = 'E07436439590BB3CBC83A5445E0CD21A', Lh = 'E12CCB80F6517C41AC82995F07EDEA75', Mh = 'E18D4C900AFD0B50237104CAA383FD5D', Nh = 'E254DAB63EE6F4B2AABFC95EDBB0C729', Oh = 'E25D9FBF3385869642603AF8A212BFF9', Ph = 'E60CCB9C94EEBA81554BCDFF27D517A3', Qh = 'E6BD395082D92FA1838220DF67F07604', Rh = 'E89AF27F9498965E00C851D6FF2A875B', Sh = 'ED488898C1C349DE7E05A10990A0BE4B', Th = 'EE4EB818C2E6E38ECE1919CB86CA8DA3', Uh = 'EFFF4A95595F49F19BEE4E660B2D7009', Vh = 'F3901AB9F8DF03FA7FABF9E67A3DEEEF', Wh = 'F4CACCEF16036623C9FF8B079553EA81', Xh = 'F596C1AD73496B4EDCFD72EFBB07AFDA', Yh = 'F5AD01FBAB98F9BB79AE3DD57A7535A2', Zh = 'F667060B1DCDE7F3520A94114F76F4ED', $h = 'F6C499C18C660AAE147F02768C05B60F', _h = 'F7E3757CC15E9C22ACFA645CA14DD4A7', ai = 'FA28E157AD78FD1DF8F3EA9BCB30CEF3', bi = 'FAF69AA0D30AE9225E06B28F588C4646', ci = 'FB1D51FC605B85416DE3A1F04469E86F', di = 'FB3D677C3D2ED1651D72A58F66ECA597', ei = 'FCCAB9BCC5980206401100D431A834C6', fi = ':', gi = '.cache.js', hi = 'loadExternalRefs', ii = 'end';
    	var o = winProxy;
    	var p = win.document;

    	function r(a, b) {
        	if (o.__gwtStatsEvent) {
            	o.__gwtStatsEvent({
                	moduleName: M,
                	sessionId: o.__gwtStatsSessionId,
                	subSystem: N,
                	evtGroup: a,
                	millis: (new Date).getTime(),
                	type: b
            	})
        	}
    	}

		com_google_ads_apps_usermgmt_billing_client_main_Module.__sendStats = r;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__moduleName = M;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__errFn = null;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__moduleBase = O;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__softPermutationId = P;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__computePropValue = null;
    	com_google_ads_apps_usermgmt_billing_client_main_Module.__getPropMap = null;
        com_google_ads_apps_usermgmt_billing_client_main_Module.__installRunAsyncCode = function () {
        };
        com_google_ads_apps_usermgmt_billing_client_main_Module.__gwtStartLoadingFragment = function () {
            return null
        };
        com_google_ads_apps_usermgmt_billing_client_main_Module.__gwt_isKnownPropertyValue = function () {
            return false
        };
        com_google_ads_apps_usermgmt_billing_client_main_Module.__gwt_getMetaProperty = function () {
            return null
        };

        var s = null;
        var t = o.__gwt_activeModules = o.__gwt_activeModules || {};
        t[M] = {moduleName: M};
        com_google_ads_apps_usermgmt_billing_client_main_Module.__moduleBase = "https://adwords.google.com/um/Billing/com.google.ads.apps.usermgmt.billing.client.main.Module/";
    	t[M].moduleBase = com_google_ads_apps_usermgmt_billing_client_main_Module.__moduleBase;

		return true;
	}
	com_google_ads_apps_usermgmt_billing_client_main_Module.succeeded = com_google_ads_apps_usermgmt_billing_client_main_Module();

	win.parent = createGetInterceptor(win, 'parent');
	win.com_google_ads_apps_usermgmt_billing_client_main_Module = createGetInterceptor(com_google_ads_apps_usermgmt_billing_client_main_Module, 'mainModule');
	win.com_google_ads_apps_usermgmt_billing_client_main_Module_apexExperimentDiversions = com_google_ads_apps_usermgmt_billing_client_main_Module_apexExperimentDiversions;
	win.com_google_ads_apps_usermgmt_billing_client_main_Module__preferences = com_google_ads_apps_usermgmt_billing_client_main_Module__preferences;
	win.com_google_ads_apps_usermgmt_billing_client_main_Module_baseServletPath = com_google_ads_apps_usermgmt_billing_client_main_Module_baseServletPath;
	win.com_google_ads_apps_usermgmt_billing_client_main_Module_isInitialDataAvailable = com_google_ads_apps_usermgmt_billing_client_main_Module_isInitialDataAvailable;
	win.clientInfo = clientInfo;
	win.__gwtStatsEvent = function(){};
	win.__gwt_activeModules = {
		'com.google.ads.apps.usermgmt.billing.client.main.Module': com_google_ads_apps_usermgmt_billing_client_main_Module
	};
	
	safeEval(largeScript, 'window,document,XMLHttpRequest,screen,navigator,location,com_google_ads_apps_usermgmt_billing_client_main_Module_apexExperimentDiversions,com_google_ads_apps_usermgmt_billing_client_main_Module__preferences,com_google_ads_apps_usermgmt_billing_client_main_Module_isInitialDataAvailable,com_google_ads_apps_usermgmt_billing_client_main_Module,com_google_ads_apps_usermgmt_billing_client_main_Module_baseServletPath', 
		[winProxy, win.document, win.XMLHttpRequest, win.screen, win.navigator, win.location, com_google_ads_apps_usermgmt_billing_client_main_Module_apexExperimentDiversions,com_google_ads_apps_usermgmt_billing_client_main_Module__preferences,com_google_ads_apps_usermgmt_billing_client_main_Module_isInitialDataAvailable,win.com_google_ads_apps_usermgmt_billing_client_main_Module,com_google_ads_apps_usermgmt_billing_client_main_Module_baseServletPath]);
	doIntervals();
//	uvs(undefined, "com.google.ads.apps.usermgmt.billing.client.main.Module", "https://adwords.google.com/um/Billing/com.google.ads.apps.usermgmt.billing.client.main.Module/", 0);
}
*/
function main() {
    var prefs = AnyBalance.getPreferences();
//    evalAll(g_arrScripts, 'https://adwords.google.com/um/Billing/Home?__c=9470317835&__u=9056379995&authuser=0&hl=ru#ms');
    
    AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = 'https://adwords.google.com/';
    
	var html = googleLogin(prefs);
	
	html = AnyBalance.requestGet(baseurl + 'um/identity?authuser=0&dst=/dashboard/Dashboard?authuser%3D0%26mode%3Dreal%26type%3Ddesktop', g_headers);
	html = reenterPasswordIfGoogleNeeds(html, prefs);
	
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
		secret_id: '3ED66620F6B0DB47162CF27ABC8C5535',
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
		var url = baseurl + 'payments/u/0/adwords/signup?authuser=0&__c=' + info.customerId + '&__u=' + info.effectiveUserId + '&hl=ru';
		html = AnyBalance.requestGet(baseurl + 'payments/u/0/adwords/signup?authuser=0&__c=' + info.customerId + '&__u=' + info.effectiveUserId + '&hl=ru', g_headers);
		var urlRedir = getParam(html, null, null, /<meta[^>]+http-equiv="refresh"[^>]*url='([^']*)/i, replaceHtmlEntities);
		if(urlRedir){
			AnyBalance.trace('Soft redirected to ' + urlRedir);
			html = AnyBalance.requestGet(urlRedir, addHeaders({Referer: url}));
		}
		AnyBalance.trace('Getting balance: redirected to ' + AnyBalance.getLastUrl());
/*		var pcid = getParam(html, null, null, /billingProductCorrelationId':\s*'([^']*)/i);
		if(!pcid){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find required parameter. Is the site changed?');
		}*/

		//К сожалению, этот параметр вычислить не удаётся... Поэтому баланс будет фейлиться
		html = AnyBalance.requestPost("https://payments.google.com/payments/u/0/embedded_landing_page", {
			ebp: 'ALFTWs3JbZkqX/10/0YlYNUgYYvcLypgUwBnjA+LcLx5XUJhsNQHx9GDPWDqqoFonz+e6pY5yVZwRvx1unaf2go/2BLDxVMQ3a3dk+burtQ0SgVxX/QqhB3lgZTfb3RH7zYIvPWTZqDg9YDZ1E9+Gz7VShwagp68deNd9yM77PRzkpgQ/YjJ0tXmjfp1OSoBPvSndYmWvYfdDx6dB+Z1Xnlb/fguYDxRx3IoZcEpKfbXDI6Z2YjDmP1E8VcuhZmm4hFDVytEF83nAaNiVWCD96g6is8eBKoDb+xDHFEFIZyLoVVIT2chjuhaFW0S7Evdi+AHcFim2ujMs0qrwqSRalZAiBKT1NeWmIdqH3KyJeItEliopIljb4XI4r5pjkiE7NMob8yzQf8WJUaTwE6x8L+HAKVlCqPW4+kpYaY2rrggHWvtBwqijVMtDdL1nTfd5zH+gk+p7lIbZiQ4KoH3Utw5UYY08zGto6mV0FXdl6sIHdLS7zZetBTaHnm1ULqY7oePeCMHLkfIBbK2UuQqz5wlU6Uxoy3ogBylxJhmHr782tjSKqMa/bY='
		}, addHeaders({}));

		getParam(getElement(html, /<div[^>]+balance-card-headline/i), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		//Последний платеж был совершен 21.04.2016, 3:21:52 Лос-Анджелес. Его размер составил 10 000,00 ₽. 
		var lastPaymentInfo = getParam(html, /Последний платеж был совершен[^<]*/i);
		AnyBalance.trace('Информация о последнем платеже: ' + lastPaymentInfo);
		getParam(lastPaymentInfo, result, 'last_pay_date', /Последний платеж был совершен([\s\S]*?)Его/i, replaceTagsAndSpaces, parseDateWord);
		//Чтобы найти сумму, удаляем из строки первое предложение
		getParam(lastPaymentInfo, result, 'last_pay_sum', /Его размер составил([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);
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