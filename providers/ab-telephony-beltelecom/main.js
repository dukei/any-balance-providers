/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36',
	Origin: 'https://my.beltelecom.by',
	Referer: 'https://my.beltelecom.by/login',
	TE: 'Trailers',
	'Accept-Language': 'en-GB,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://myapi.beltelecom.by';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер телефона! без(+)');
	checkEmpty(prefs.password, 'Введите Пароль!');

	var html = AnyBalance.requestPost(baseurl + '/api/v1/oauth/token?lang=ru', JSON.stringify({
				"username": prefs.login,
				"password": prefs.password,
			}), addHeaders({
				Accept: 'application/json',
				'content-type': 'application/json',
				hl: 'ru',
				'X-Client': 'web',
			}));
	if (!html) {
		throw new AnyBalance.Error('Не удалось получить данные, проверьте доступ к интернету');
	}

	var access_token = getJson(html).access_token; //получаем токен авторизации

	checkEmpty(access_token, 'Не удалось получить токен авторизации, сайт изменен?', true);

	html2 = AnyBalance.requestGet('https://myapi.beltelecom.by/api/v1/contracts', addHeaders({
				'Authorization': 'Bearer ' + access_token,
			}));
	checkEmpty(html2, 'Не удалось найти Список с Услугами, сайт изменен?', true);

	var res = getJsonEval(html2).data; // получаем данные с услугами

	checkEmpty(res, 'Не удалось найти Список с Услугами, сайт изменен?', true);
//Выходим из Кабинета
	var html3 = AnyBalance.requestPost(baseurl + '/api/v1/logout?lang=ru', JSON.stringify({}), addHeaders({Accept: 'application/json','content-type': 'application/json','Authorization': 'Bearer ' + access_token,hl: 'ru','X-Client': 'web',}));
	
	var result = {success: true};
	
	var id = prefs.id;
	//var id = 1500013629501; //80234231458, 2342003314804
	
	AnyBalance.trace('Найдено Услуг:' + res.length);
	var counts_contract_name = '\n Найдено Услуг:' + res.length;

	for (var i = 0; i <= res.length - 1; i++) {
		counts_contract_name += '\n ' + res[i].contract_name;
		if (!id) {
			if (res[0].is_telephony == 1) {
				AnyBalance.trace('Найдена услуга Телефон: ' + res[0].is_telephony);
				getParam(res[0].name, result, 'fio');
				getParam(res[0].balance, result, 'balance');
				getParam(res[0].contract_name, result, '__tariff');
				getParam(res[0].contract_name, result, 'agreement');
				getParam(res[0].contract_name, result, 'phone');
			} else {
				AnyBalance.trace('Найдена услуга : ' + res[0].applications[0].tariff.name);
				getParam(res[0].name, result, 'fio');
				getParam(res[0].balance, result, 'balance');
				getParam(res[0].applications[0].tariff.name, result, '__tariff');
				getParam(res[0].btk_id, result, 'agreement');
				getParam('~' + res[0].terminate_in + ' дн.', result, 'terminate_in');

			}
		} else {
			if (res[i].contract_name == id) {
				AnyBalance.trace('Будет показана услуга с номером : ' + id);
				if (res[i].is_telephony == 1) {
					AnyBalance.trace('Телефон ?: ' + res[i].is_telephony);
					getParam(res[i].name, result, 'fio');
					getParam(res[i].balance, result, 'balance');
					getParam(res[i].contract_name, result, '__tariff');
					if (res[i].bills != '') {
						var bills = 'Задолженность на ' + res[i].bills[0].date + '\n' + res[i].bills[0].amount;
						getParam(bills, result, 'bills');
					} else {
						getParam('Нет задолженности', result, 'bills');
					}
					getParam(res[i].contract_name, result, 'agreement');
					getParam(res[i].contract_name, result, 'phone');
				} else {
					AnyBalance.trace('Телефон ?: ' + res[i].is_telephony);
					getParam(res[i].name, result, 'fio');
					getParam(res[i].balance, result, 'balance');
					getParam(res[i].applications[0].tariff.name, result, '__tariff');
					getParam(res[i].btk_id, result, 'agreement');
					getParam('~' + res[i].terminate_in + ' дн.', result, 'terminate_in');
				}

			} else {
				continue; //проверяем дальше если нет совпадений
			}

		}

	}
	getParam(counts_contract_name + '\n Укажите в настройках номер договора из этого списка по какой услуге показывать баланс', result, 'counts');

	AnyBalance.setResult(result);
}
