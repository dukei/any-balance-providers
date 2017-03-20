/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://krsk-sbit.ru/";

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form[^>]+login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'index.php?route=account/login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+alert-danger/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

    var result = {success: true}, tr;

    getParam(html, result, 'fio', /<div[^>]+account_info__name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Введите текущие показания прибора учета\s+ТУ([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<div[^>]+account_blnc__num[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('lastpaydate', 'lastpaysum')){
		html = AnyBalance.requestGet(baseurl + 'home_kabinet?received', addHeaders({Referer: AnyBalance.getLastUrl()}));
        var tds = getElements(html, /<div[^>]+account_period_dvic__tbl_td/ig);
        if(tds.length){
            getParam(tds[tds.length-1], result, 'lastpaydate', /(?:[\s\S]*?<div[^>]+dvic__tbl_td_item[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
            getParam(tds[tds.length-1], result, 'lastpaysum', /(?:[\s\S]*?<div[^>]+dvic__tbl_td_item[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    if(AnyBalance.isAvailable('lastbilldate', 'indication','cons_ind','cost_ind','cons_com','cost_com','cons_tot','cost_tot')){
		html = AnyBalance.requestGet(baseurl + 'home_kabinet?invoices', addHeaders({Referer: AnyBalance.getLastUrl()}));
		var tbl = getElement(html, /<div[^>]+a_received_tbl/i);
		if(tbl){
            var tds = getElements(tbl, /<div[^>]+account_period_dvic__tbl_td/ig);
            if(tds.length){
            	var tr = tds[tds.length-2] + tds[tds.length-1];
                getParam(tr, result, 'lastbilldate', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
                getParam(tr, result, 'indication', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            
                sumParam(tr, result, 'cons_ind', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cost_ind', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){11}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cons_ind', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cost_ind', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){12}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            
                sumParam(tr, result, 'cons_com', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cost_com', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){13}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cons_com', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(tr, result, 'cost_com', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){14}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            
                getParam(tr, result, 'cons_tot', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){8}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
                getParam(tr, result, 'cost_tot', /(?:[\s\S]*?<div[^>]+invoice__tbl_td_item[^>]*>){15}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            }
        }
    }

    AnyBalance.setResult(result);
}