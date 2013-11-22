/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.mnogo.ru/';
	
	var matches = /(\d{2})-(\d{2})-(\d{4})/.exec(prefs.birthday);
	if(!matches)
		throw new AnyBalance.Error('День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');

	var dt = new Date(matches[2]+'/'+matches[1]+'/'+matches[3]);
	if(isNaN(dt))
		throw new AnyBalance.Error('Неверная дата ' + prefs.birthday);
	
	var html = AnyBalance.requestPost(baseurl + 'enterljs.html', {
		UserLogin: prefs.login,
		'UserBirth[d]': dt.getDate(),
		'UserBirth[m]': dt.getMonth()+1,
		'UserBirth[y]': dt.getFullYear()
	});
	
	//AnyBalance.trace('got from login (' + typeof(html) + '): ' + html);
	if (!/OK/i.test(html)) {
		var error = html;
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'index.html');
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*(\d+) бонусов\s*</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'username', /class="authorized[^>]*>\s*Ура[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /class="authorized[^>]*>\s*Ура(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);	
	
	AnyBalance.setResult(result);
}

