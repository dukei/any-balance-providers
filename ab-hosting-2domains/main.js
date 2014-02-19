/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	var baseurl = "https://reg.2domains.ru/";
	
	var html = AnyBalance.requestPost(baseurl + 'login2.php', {
		ret: '/',
		email: prefs.login,
		passwd: prefs.password,
		login: 'Авторизоваться'
	});
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*class=["']warning[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс[\s\S]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'domains', /Домены требующие продления[\s\S]*?<strong[^>]*>[^<]*из([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	//getParam(html, result, 'services', /Всего доменов[\s\S]*?<big[^>]*>[^<]*\/([\S\s]*?)<\/big>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'prolong', /Домены требующие продления[\s\S]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тариф:[\s\S]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (prefs.domains) {
		var notfound = [];
		var found = [];
		var ind = 0;
		var domains = prefs.domains.split(/\s*,\s*/g);
		for (var i = 0; i < domains.length; ++i) {
			var domain = domains[i];
			
			html = AnyBalance.requestPost(baseurl + 'domains/index.php', {
				p_page: 1,
				c_page: 1,
				find_domain: 1,
				search_domain_name: domain
			});
			var tr = getParam(html, null, null, /(<tr(?:[\s\S](?!<\/tr>))*?domain_param_tt[\s\S]*?<\/tr>)/i);
			
			if (!tr) {
				notfound[notfound.length] = domain;
			} else {
				var suffix = ind > 0 ? ind : '';
				var domain_name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(tr, result, 'domain' + suffix, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(tr, result, 'domain_till' + suffix, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
				found[found.length] = domain_name;
			}
			++ind;
		}
		if (!found.length)
			throw new AnyBalance.Error('Не найдено ни одного домена из списка: ' + prefs.domains);
			
		if (notfound.length)
			AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));
		
		result.__tariff = ((result.__tariff && result.__tariff + ': ') || '') + found.join(', ');
	}
	AnyBalance.setResult(result);
}