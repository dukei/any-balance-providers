/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseTrafficGb(str){
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
	
    var baseurl = "https://weburg.me/planeta";
	
    var html = AnyBalance.requestPost(baseurl + '/login', {
        'planeta[login]':prefs.login,
        'planeta[password]':prefs.password
    });
	
    if(!/pl-logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*error_message[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
    
    var result = {success: true};

    getParam(html, result, '__tariff', /<div[^>]*pl-curent-tarif-title[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Договор([^<]*)от/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', [/Остаток на счете[\s\S]*?<div[^>]*class="\s*pl-tab-value\s*"[^>]*>([\S\s]*?)<\/div>/i, />Остаток на счете([^>]*>){8}/i], replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'chatles', /<div[^>]*pl-tab-value_chatles[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + '/statistic/internet');
        getParam(html, result, 'trafficIn', /pl-stat-td_total_border(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /pl-stat-td_total_border(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
    }
	
    AnyBalance.setResult(result);
}