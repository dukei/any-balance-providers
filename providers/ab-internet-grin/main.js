/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://10.1.1.51:8001/login";
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	AnyBalance.setDefaultCharset('UTF-8');
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var token_aut = getParam(html, null, null, /authenticity_token" type="hidden" value="(.*)"/i, replaceTagsAndSpaces, html_entity_decode);
	html = AnyBalance.requestPost(baseurl, {
			utf8: "✓",
			authenticity_token: token_aut,
			'user[login]': prefs.login,
			'user[password]': prefs.password,
			commit: 'Войти'
		}, addHeaders({
				Referer: baseurl
			}));
	if (!/>Личный кабинет</i.test(html)) {
		var error = getParam(html, null, null, />Личный кабинет</i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {
		success: true
	};
	var data = getParam(html, null, null, /new HupoApp\((.*)\.data/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.trace(data);
	var res_data = getJsonEval(data);
	AnyBalance.trace("ФИО : " + res_data.data.person.vc_name);
	getParam(res_data.data.person.vc_name, result, 'fio');
	AnyBalance.trace("Лицевой счет : " + res_data.data.personal_accounts[0].vc_subj_code);
	getParam(res_data.data.personal_accounts[0].vc_subj_code, result, 'account');
	AnyBalance.trace("Тариф интернета : " + res_data.data.servs[0].vc_name);
	getParam(res_data.data.servs[0].vc_name, result, '__tariff');
	for (var i = 0; i < res_data.data.personal_accounts.length; i++) {
		if (res_data.data.personal_accounts[i].vc_currency_code == "BYN") {
			if (/-3/i.test(res_data.data.personal_accounts[i].vc_account)) {
				AnyBalance.trace("Баланс : " + res_data.data.personal_accounts[i].n_sum_bal + ' BYN');
				getParam(res_data.data.personal_accounts[i].n_sum_bal, result, 'balance', res_data.data.personal_accounts[i].n_sum_bal, replaceTagsAndSpaces, parseBalance);
				if (res_data.data.personal_accounts[i].n_temporal_overdraft) {
					AnyBalance.trace("Кредит: " + res_data.data.personal_accounts[i].n_temporal_overdraft + ' BYN,' + " До: " + res_data.data.personal_accounts[i].d_overdraft_end);
					getParam("Кредит: " + res_data.data.personal_accounts[i].n_temporal_overdraft + ' BYN,' + " До: " + res_data.data.personal_accounts[i].d_overdraft_end, result, 'balanceCredit');
				}
			}
		}
	}
	AnyBalance.requestGet("https://10.1.1.51:8001/logout");
	AnyBalance.setResult(result);
}

