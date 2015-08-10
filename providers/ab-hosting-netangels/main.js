/**
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
    var baseurl = "https://panel.netangels.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'auth/?next=/', g_headers);
	var token = getParam(html, null, null, /name='csrfmiddlewaretoken'\s+value='([\s\S]*?)'/i, replaceTagsAndSpaces, html_entity_decode);
	if(!token)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'auth/?next=/', {
		csrfmiddlewaretoken:token,
		username:prefs.login,
		password:prefs.password,
		next:'/'
    }, addHeaders({Referer: baseurl + 'auth/?next=/'}));
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	
    if(!/\/auth\/logout/i.test(html)) {
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+id="overall_error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    //Раз мы здесь, то мы успешно вошли в кабинет
    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="top_exit"[^>]*>([\s\S]*?)(?:\(|<a|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Заказанные услуги:([\s\S]*?)(?:<\/ul|<\/p>)/i, [replaceTagsAndSpaces, /:\s*заказан/ig, ', '], html_entity_decode);
    getParam(html, result, 'licschet', /Договор:([\s\S]*?)(?:<br|<\/(?:b|p)>)/i, replaceTagsAndSpaces, html_entity_decode); 
    getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<span[^>]+user_state_[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('space', 'space_total', 'sites', 'sites_total', 'mail', 'mail_total')){
        html = AnyBalance.requestGet(baseurl + 'resources.json', g_headers);
        var json = getJson(html);
        for(var i=0; i<json.length; ++i){
            var info = json[i];
            if(info.id == 'disk'){
                getParam(info.value + info.label, result, 'space', null, replaceTagsAndSpaces, parseTraffic);
                getParam(info.limit + info.label, result, 'space_total', null, replaceTagsAndSpaces, parseTraffic);
            }
            if(info.id == 'domains'){
                getParam(info.value + info.label, result, 'sites', null, replaceTagsAndSpaces, parseBalance);
                getParam(info.limit + info.label, result, 'sites_total', null, replaceTagsAndSpaces, parseBalance);
            }
            if(info.id == 'mail'){
                getParam(info.value + info.label, result, 'mail', null, replaceTagsAndSpaces, parseTraffic);
                getParam(info.limit + info.label, result, 'mail_total', null, replaceTagsAndSpaces, parseTraffic);
            }
        }
    }
    //Возвращаем результат
    AnyBalance.setResult(result);
}