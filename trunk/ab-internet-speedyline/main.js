/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о состоянии счета интернет-провайдера Спиди-Лайн.
Для корректной работы провайдера необходимо в личном кабинете
в разделе Настройки включить опцию "Разрешить вход в личный кабинет
с чужих ip адресов".

Сайт оператора: http://www.speedyline.ru/
Личный кабинет: http://web.speedyline.ru/
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://web.speedyline.ru/';

    checkEmpty (prefs.login, 'Введите логин');
    checkEmpty (prefs.password, 'Введите пароль');
    checkEmpty (prefs.region, 'Выберите регион');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestPost (baseurl + '', {
        login: prefs.login,
        password: prefs.password,
        region: prefs.region,
        submit: 'Войти'
        });

    // Проверка неправильной пары логин/пароль
    var regexp=/class='no-border red'>[\s*]*([^<]+?)\s*</;
    var res = regexp.exec (html);
    if (res) {
        if (res[1].indexOf ('Доступ разрешен только с ip адресов') >= 0)
            throw new AnyBalance.Error (res[1] + ' Для корректной работы провайдера необходимо в личном кабинете в разделе Настройки включить опцию "Разрешить вход в личный кабинет с чужих ip адресов".');
		else
            throw new AnyBalance.Error (res[1]);
	}

    // Проверка на корректный вход
    regexp = /href="\/logout.html"/;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    AnyBalance.trace ('Parsing data...');

    var result = {success: true};

    // ID пользователя
    getParam (html, result, 'id', /<th>ID(?:\s|&nbsp;)*пользователя<\/th>\s*[^>]*>(\d+)/i);

    // Клиент
    getParam (html, result, 'client', /<th>Клиент<\/th>\s*[^>]*>([^<]+)/i);

    // Скорость
    getParam (html, result, 'speed', /<th>Скорость<\/th>\s*[^>]*>([^<]+)/i, [/&nbsp;/g, '', /\s*$/, '']);

    // Скачано
    getParam (html, result, 'download', /<th>Скачано[^<]*<\/th>\s*[^>]*>([^<]+)/i, [], parseFloat);

    // Статус
    getParam (html, result, 'state', /<th>Состояние<\/th>\s*[^>]*>[^>]*>([^<]+)/i);

    // Интернет
    getParam (html, result, 'stateinternet', /<th>Интернет<\/th>\s*[^>]*>[^>]*>([^<]+)/i);

    // Текущий баланс
    getParam (html, result, 'balance', /<th>Текущий баланс<\/th>\s*[^>]*>[^>]*>([^<]+)/i, [], parseFloat);

    // Кредит
    getParam (html, result, 'credit', /<th>Кредит<\/th>\s*[^>]*>([^\s]+)/i, [], parseFloat);

    // Тарифный план
    regexp=/<th>Тарифный план<\/th>[\s\S]*?<td>([^<]+)/i;
    if (res = regexp.exec (html)){
        result.__tariff = res[1];
    }

    AnyBalance.setResult (result);
}
