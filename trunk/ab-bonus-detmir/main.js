/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://vg.vainahtelecom.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://detmir-cardinfo.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl);
	var params = createFormParams(html);

	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + getParam(html, null, null, /id="imgCaptcha"[^>]*src="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode));
		params.txtCaptcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
		AnyBalance.trace('Капча получена: ' + params.txtCaptcha);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	params.CardNumberTextBox = prefs.login;

	html = AnyBalance.requestPost(baseurl + 'default.aspx', params, addHeaders({Referer: baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1'})); 
	if(!/БАЛАНС КАРТЫ/i.test(html)){
        var error = getParam(html, null, null, /id="ErrorLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'balance', /Общее количество бонусов([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'active', /Количество активных бонусов([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inactive', /Количество неактивных бонусов([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}