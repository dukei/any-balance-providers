/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.saqqent.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'sqa', {
		username: prefs.login,
		userpass: prefs.password,
        go: 'auth'
	}, addHeaders({Referer: baseurl + 'wui/saqqent.html'}));    
   
    var sid = getParam(html, null, null, /name="sid"[\s]value="([^"]+)/i);    
    AnyBalance.trace("sid: " + sid);
    
	if (!sid) {
        html = AnyBalance.requestGet(baseurl + 'wui/saqqent.html?sid=nosid', g_headers);
		var error = getParam(html, null, null, /text_error(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Ошибка авторизации/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
   
    html = AnyBalance.requestGet(baseurl + 'sqa?wui_show_page=../wui/face.html', g_headers);
    
    html = AnyBalance.requestGet(baseurl + 'sqa?wui_show_page=../wui/face.html&sid=' + sid + '&null=null', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'sqa?pcode_ver=1&cmd=pso_digitcity_ls_accounts&go=pso_digitcity&sid=' + sid, {
		pcode_ver: 1,
        cmd: 'pso_digitcity_ls_accounts',
        go: 'pso_digitcity',
        sid: sid
	}, addHeaders({Referer: baseurl + 'wui/saqqent.html'}));        

    var json = getJsonEval(html);
    
	var result = {success: true};
    
	getParam(json[2].text, result, 'name', /([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[2].text, result, 'account', /Лицевой счет:([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
    
    var pcode = getParam(html, null, null, /pcode=([\s\S]+)&/i);
    var uid = getParam(html, null, null, /uid=([^"]+)/i);
    
	html = AnyBalance.requestPost(baseurl + 'sqa?go=pso_digitcity&cmd=pso_digitcity_accinfo&target=accinfo&pcode=' + pcode + '&uid=' + uid + '&sid=' + sid, {
		go: 'pso_digitcity',
        cmd: 'pso_digitcity_accinfo',
        target: 'accinfo',
        pcode: pcode,
        uid: uid,
        sid: sid
	}, addHeaders({Referer: baseurl + 'wui/saqqent.html'}));        
    
    json = getJsonEval(html);
    
    for (var i = 0; i < json.length; i++) {
        if (json[i].parentId == 'nId1') {
            getParam(json[i].text, result, 'balance', /(Задолженность по услуге:[\s\S]*?[\s\S]*?)<\//i, [replaceTagsAndSpaces, /Задолженность по услуге:/, '-'], parseBalance);
            getParam(json[i].text, result, 'sum_to_be_paid', /Начислено в текущем месяце:[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
        }
    }
	
	AnyBalance.setResult(result);
}