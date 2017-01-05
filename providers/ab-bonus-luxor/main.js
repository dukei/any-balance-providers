/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, /name="__VIEWSTATE".*?value="([^"]*)"/);
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
	
    if(!/exit.png/i.test(html)){
		var error = sumParam(html, /<span[^>]*lblMessageLogin[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, null, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'club-profile/cardinfo/default.aspx');
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Количество баллов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'visits', /Количество посещений[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'visits_left', /Посещений до следующего уровня[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /Карта №[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Ваш уровень[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}