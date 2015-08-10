/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация об использовании партнерской программы Mobiads. Отображает сколько заработано за сегодня, сколько потрачено за сегодня (если вы покупаете рекламу) и текущее состояние баланса.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт партнерки: http://mobiads.ru/
Личный кабинет: http://mobiads.ru/login.php
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet('http://mobiads.ru/login.php?login='+prefs.login+'&pass='+prefs.password);

    var result = {
        success: true
    };

	if(html.search('<a href="/?exit">')) {
		html = AnyBalance.requestGet('http://mobiads.ru/bank.php');
		var r = new RegExp('<tr(?:[^>]+)?><td>([^<]+)</td><td><strong>([0-9\\.]+) руб.</strong></td></tr>','g');
		var updated=0;
		var mustbe=3;
		while((matches=r.exec(html))!=null) {
			switch(matches[1]) {
				case 'Сегодня заработано:':
					result.earned=parseFloat(matches[2]);
					updated++;
					break;
				case 'Сегодня потрачено:':
					result.spended=parseFloat(matches[2]);
					updated++;
					break;
				case 'Ваш баланс:':
					result.balance=parseFloat(matches[2]);
					updated++;
					break;
			}
		}
		if(updated!=mustbe) throw new AnyBalance.Error('Ошибка разбора статистики ('+updated+'/'+mustbe+')');
	} else {
		throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль.');
	}

    AnyBalance.setResult(result);
}