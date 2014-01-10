/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.letoile.ru/';

    checkEmpty (prefs.number, 'Введите номер карты');
    checkEmpty (prefs.color, 'Выберите цвет карты');

    var html = AnyBalance.requestGet(baseurl + 'ajax/check_account.php?card_type=' + prefs.color + '&card_number=' + prefs.number);
    // Проверка неправильной пары логин/пароль
	if (!/Баланс\s*карты:/i.test(html)) {
		var error = getParam(html, null, null, /class="g-error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
    // Баланс
	getParam(html, result, 'balance', /Баланс\s*карты:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('dateOf')) {
		html = AnyBalance.requestGet (baseurl + 'club/cards/account/');
		// Дата актуализации баланса
		getParam(html, result, 'dateOf', /Данные\s*о\s*балансе(?:[^>]*>){2}(\d{1,2}.\d{1,2}.\d{4} \d{1,2}:\d{2})/i, replaceTagsAndSpaces, parseDate);	
	}

    AnyBalance.setResult (result);
}