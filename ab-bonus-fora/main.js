/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите № карты!');
	checkEmpty(prefs.pass, 'Введите пароль!');
	
	var html = AnyBalance.requestPost('http://fora.ua/club_postiynih_pokuptsiv/osobistiy_kabinet/', {
		login: prefs.login,
		pass: prefs.pass
	}, {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.57 Safari/537.17"});
	
	if (!/\?logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'bonus', /Доступний для витрат бонус:(?:[^>]*>){2}([\d\s.,]+)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /"leftColumnText"(?:[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'baly', /id="balliNow">(\d+?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus_deadline', /Доступний для витрат бонус:(?:[^>]*>){2}[^<]+до([^<]+)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}