/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "http://luxorfilm.ru/";
	
    var html = AnyBalance.requestGet(baseurl + 'login.aspx');
	
    html = AnyBalance.requestPost(baseurl + 'login.aspx', {
        __LASTFOCUS:'',
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        ctl00$contentPlaceHolder$txtLogin:prefs.login,
        ctl00$contentPlaceHolder$txtPassword:prefs.password,
        ctl00$contentPlaceHolder$btnLogin:''
    });
	
    if(!/SignOut.aspx/i.test(html)){
		var error = getParam(html, null, null, /span[^>]*lblMessageLogin[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'users/MyBonuses.aspx');
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Количество баллов(\s*<(?:[^>]*>){2,5})\s*<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /Карта №(\s*<(?:[^>]*>){2,5})\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Карта №(\s*<(?:[^>]*>){2,5})\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}