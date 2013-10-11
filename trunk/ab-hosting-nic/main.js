/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о домене для регистратора доменов RUcenter

Сайт оператора: http://fibrenet.ru
Личный кабинет: https://billing.fibrenet.ru
*/
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	var baseurl = "https://www.nic.ru/";
	var html = AnyBalance.requestGet(baseurl + 'manager/');
	var href = getParam(html, null, null, /<form[^>]*action="([^"]*login[^"]*)/i);
	if (!href) throw new AnyBalance.Error('Не удалось найти форму входа. Проблемы на сайте или сайт изменен.');
	var html = AnyBalance.requestPost(href, {
		login: prefs.login,
		client_type: prefs.client_type || 'NIC-D',
		password: prefs.password,
		password_type: prefs.pass_type || 'adm'
	});
	//AnyBalance.trace(html);
	if (!/\/logout\//i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*class=["']warning[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}
	var result = {
		success: true
	};
	getParam(html, result, 'balance', /<a[^>]*href="[^"]*step=pay.medium_balance[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	if (prefs.domains) {
		var notfound = [];
		var found = [];
		var ind = 0;
		var domains = prefs.domains.split(/\s*,\s*/g);
		for (var i = 0; i < domains.length; ++i) {
			var domain = domains[i];
			html = AnyBalance.requestPost(baseurl + 'manager/my_domains.cgi', {
				'step': 'srv.my_domains.search',
				'view.order_by': '',
				'search.domain': domain,
				'search.domain_group': '',
				'view.limit': 1,
				'cmd.search': 'Найти'
			});
			if (!/Найдено:\s*<strong[^>]*>\s*[1-9]/i.test(html)) {
				notfound[notfound.length] = domain;
			} else {
				var suffix = ind > 0 ? ind : '';
				var domain_name = getParam(html, null, null, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode)
				getParam(html, result, 'domain' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(html, result, 'domain_status' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(html, result, 'domain_till' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
				found[found.length] = domain_name;
			}++ind;
		}
		if (!found.length) 
			throw new AnyBalance.Error('Не найдено ни одного домена из списка: ' + prefs.domains);
		if (notfound.length)
			AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));
		result.__tariff = found.join(', ');
	}
	AnyBalance.setResult(result);
}