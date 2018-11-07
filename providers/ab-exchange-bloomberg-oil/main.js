/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language':'en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.bloomberg.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'energy/', g_headers);

	var result = {success: true};

	var table = getParam(html, /<h2[^>]*>\s*Crude Oil[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);

    var colsDef = {
        __tariff: {
            re: /INDEX/i,
            result_func: null
        },
        __balance: {
            re: /PRICE/i
        },
        __currency: {
            re: /UNITS/i,
            result_func: null
        },
        __change: {
            re: /[^%]CHANGE/i,
        },
        __change_pcts: {
            re: /%CHANGE/i,
        },
        __contract: {
            re: /contract/i,
            result_func: null
        },
        __contract_time: {
            re: /time/i,
            result_func: null
        },
    };

    var rows = [];
    processTable(table, rows, '', colsDef);

    var re = new RegExp((prefs.type || 'WTI'), 'i');
    for(var i=0; i<rows.length; ++i){
    	var row = rows[i];
    	if(re.test(row.__tariff)){
			getParam(row.__tariff, result, '__tariff');
			getParam(row.__balance, result, 'balance');
			getParam(row.__currency, result, ['currency', 'balance']);
			getParam(row.__change, result, 'change');
			getParam(row.__change_pcts, result, 'change_pcts');
			getParam(row.__contract, result, 'contract');
			getParam(row.__contract_time, result, 'contract_time');
    	}
    }
	
    AnyBalance.setResult(result);
}