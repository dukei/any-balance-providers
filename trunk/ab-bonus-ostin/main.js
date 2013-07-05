﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://bonus.ostin.com/';

    AnyBalance.setDefaultCharset('utf-8'); 

    html = AnyBalance.requestGet(baseurl+'about/?card_id='+prefs.login, g_headers);

    if(/class="balance">Такой карты нет!<\/div>/i.test(html)){
        throw new AnyBalance.Error('Такой карты нет!');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Ваш баланс[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
