/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статистика заработка на Plus1.WapStart.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт партнерки: http://plus1.wapstart.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();

	var html = AnyBalance.requestPost('http://wap.passport.wapstart.ru/index.php?area=login', {
		login: prefs.login,
		password: prefs.password,
		signIn: 'Войти'
	  });

    var result = {
        success: true
    };

    var r = new RegExp('>Изменить пароль</a>');
	if(r.test(html)) {
		html = AnyBalance.requestGet('http://wap.plus1.wapstart.ru/?area=mainAccount');

		r = new RegExp('<p>Баланс:\\s+([0-9 ,.]+)\\s+руб.</p>');
		var matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Ошибка получения баланса');
		matches[1]=matches[1].replace(",",".");
		matches[1]=matches[1].replace(" ","");
		result.balance=parseFloat(matches[1]);

		r = new RegExp('<table class="statistic">\\s+<tr>[\\s\\S]+?</tr>\\s+<tr>\\s+<td>\\s+([0-9,.]+)\\s+</td>\\s+<td>\\s+([0-9,.]+)\\s+</td>\\s+<td>\\s+([0-9,.]+)\\s+</td>\\s+<td>\\s+([0-9,.]+)\\s+</td>\\s+</tr>\\s+</table>');

		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Ошибка заполнения счетчиков');
		matches[1]=matches[1].replace(",",".");
		result.yesterday=parseFloat(matches[1]);
		matches[2]=matches[2].replace(",",".");
		result.today=parseFloat(matches[2]);
		matches[3]=matches[3].replace(",",".");
		result.week=parseFloat(matches[3]);
		matches[4]=matches[4].replace(",",".");
		result.month=parseFloat(matches[4]);
	} else {
		throw new AnyBalance.Error('Невозможно получить данные. Проверьте логин и пароль.');
	}

    AnyBalance.setResult(result);
}
