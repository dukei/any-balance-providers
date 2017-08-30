/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получение информации о состоянии баланса и использовании дневного лимита SMS с сайта http://sms.ru

Сайт оператора: http://sms.ru/
Личный кабинет: https://sms.ru/
*/

function main() {
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://sms.ru/';

	var strToken = AnyBalance.requestGet(baseurl + 'auth/get_token');

	var strPage = AnyBalance.requestPost(baseurl + '?panel=my', {
		login:prefs.login,
		password:prefs.password,
		token:strToken,
	});

	if( strPage.indexOf('Добро пожаловать') < 0) {
		throw new AnyBalance.Error('Ошибка. Что-то пошло не так');
	}

	var result = {success: true};

	result['balance'] = /<div[\s\S]+>([\d\.]+)\sруб.<\/div>/i.exec(strPage)[1];

	var re = /<b>Расход лимита:<\/b><br>([\d]+)\sиз\s([\d]+)<div/i;

	result['sent'] = re.exec(strPage)[1];
	result['limit'] = re.exec(strPage)[2];
	result['remain'] = result['limit'] - result['sent'];

	AnyBalance.setResult(result);
}
