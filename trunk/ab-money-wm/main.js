/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://enter.webmoney.ru/addLP.aspx";
	
    var html = AnyBalance.requestGet(baseurl);
	
    html = AnyBalance.requestPost(baseurl, {
    	__EVENTTARGET: '',
    	__EVENTARGUMENT: '',
    	__VIEWSTATE: getViewState(html),
    	__EVENTVALIDATION: getEventValidation(html),
    	search: 'Найти информацию',
    	ctl00$CPH_Body$TB_WMID: prefs.login,
    	ctl00$CPH_Body$TB_PWD: prefs.password,
    	ctl00$CPH_Body$B_CheckPwd: 'Искать'
    });
	
	if (!/<div[^>]*class="purses"/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*id="ctl00_CPH_Body_VSPE"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result={success: true};

    getParam(html, result, 'wmr', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMR/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wmz', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMZ/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wme', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WME/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wmu', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMU/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wmb', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMB/i, replaceTagsAndSpaces, parseBalance);
    getParam(prefs.login, result, '__tariff', /(.*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
