/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1000).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://billing.rosintel.com/";

    var html = AnyBalance.requestPost(baseurl + 'client/index.php', {
        login: prefs.login,
        password: prefs.password
    });
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /<(form)[^>]*name="loginForm">/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

	getParam(html, result, 'balance', />\s*Баланс(?:[^>]*>){14}([\-\d.,]{2,})/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /Вы:<\/td>\s*<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', new RegExp(prefs.login + '\\s*</a([^>]*>){4}', 'i'), replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', new RegExp(prefs.login + '\\s*</a([^>]*>){12}', 'i'), replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}