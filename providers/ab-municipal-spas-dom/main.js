/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.spas-dom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите лицевой счет!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ajax/login/', {
		username: prefs.login,
		userpswd: prefs.password
	}, addHeaders({Referer: baseurl + 'login/'}));

	var json = getJson(html);
	if(json[0].code != 1){
		throw AnyBalance.Error(doGetAjaxErrorMsgByCode(json[0].code), null, json[0].code == -0xf8);
	}
	
    html = AnyBalance.requestGet(baseurl + 'mycabinet/', g_headers);
    
	if (!/logout/i.test(html)) {		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    //получаем данные о начислениях за квартиру
    var today = new Date();
    var monthNumber = today.getMonth()+1;
    var report_year = today.getFullYear();
    AnyBalance.trace(monthNumber);
    AnyBalance.trace(report_year);
    
	html = AnyBalance.requestPost(baseurl + 'ajax/accview/', {
		pmonth: monthNumber,
		pyear: report_year
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    
    var json = getJson(html);
    
    if(json[0].code != 1) {
		AnyBalance.trace(doGetAjaxErrorMsgByCode(json[0].code) + ': ' + html);
		throw new AnyBalance.Error('Не удалось получить данные о начислениях. Сайт изменен?');       
    }
    
	var result = {success: true};
	
	getParam(json[1].page, result, 'acc_num', /№ л\/с:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[1].page, result, 'fio', /Ф.И.О:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[1].page, result, 'balance', /Задолженность:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(json[1].title, result, 'period', /за(.*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    if(AnyBalance.isAvailable('fulltext')){
        var services = getElements(json[1].page, [/<tr[^>]*>/ig, /<td[^>]+class="service"/i]);
        var res = [];
        for(var i = 0; i < services.length; i++) {
        	var name = getParam(services[i], null, null, /<td[^>]+class="service"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        	var saldo = getParam(services[i], null, null, /<td[^>]*>([^<]*)<\/td>\s*<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
            res.push('<b>' + name + '</b>' + ' - Задолженность: ' + saldo);
        }
    	result.fulltext = res.join('<br/>');
    }
    
    // получаем данные по счетчикам на воду
	html = AnyBalance.requestPost(baseurl + 'ajax/lists/meters/', {}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    
    json = getJson(html);
    if(json[0].code != 1) {
		AnyBalance.trace(doGetAjaxErrorMsgByCode(json[0].code) + ': ' + html);
		throw new AnyBalance.Error('Не удалось получить данные о приборах учета. Сайт изменен?');       
    }

	getParam(json[1].rsay_ind, result, 'hot_water', null, replaceTagsAndSpaces, parseBalance);
	getParam(json[2].rsay_ind, result, 'cold_water', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function doGetAjaxErrorMsgByCode( code )
{
    var errMsg = "Неизвестная ошибка";
    if ( code == -0xff ) { errMsg = "Отправлен не ajax-запрос"; } //255
    if ( code == -0xfe ) { errMsg = "Некорректный протокол"; }
    if ( code == -0xfd ) { errMsg = "На сайте ведутся технические работы"; }
    if ( code == -0xfc ) { errMsg = "Нет соединения с базой данных"; }
    if ( code == -0xfb ) { errMsg = "Пользователь не авторизован"; }
    if ( code == -0xfa ) { errMsg = "Время сессии истекло. Обновите страницу."; }
    if ( code == -0xf9 ) { errMsg = "Не указано имя пользователя или пароль"; }
    if ( code == -0xf8 ) { errMsg = "Неверное имя пользователя или пароль"; }
    if ( code == -0xf7 ) { errMsg = "Аккаунт пользователя отключен"; }
    if ( code == -0xf6 ) { errMsg = "Сбой системы авторизации"; }
    if ( code == -0xf5 ) { errMsg = "Не указан текущий пароль"; }
    if ( code == -0xf4 ) { errMsg = "Не указан новый пароль"; }
    if ( code == -0xf3 ) { errMsg = "Новый пароль и его подтверждение не совпадают"; }
    if ( code == -0xf2 ) { errMsg = "Неверный текущий пароль"; }
    if ( code == -0xf1 ) { errMsg = "Смена пароля невозможна"; }
    if ( code == -0xf0 ) { errMsg = "Неизвестный режим"; }

    if ( code == -0xef ) { errMsg = "Невозможно сформировать требуемый документ"; }
    if ( code == -0xee ) { errMsg = "Файл не найден"; }
    if ( code == -0xed ) { errMsg = "По Вашему адресу не найдено зарегистрированных счетчиков"; }
    if ( code == -0xec ) { errMsg = "Не задан список счетчиков с показаниями"; }
    if ( code == -0xeb ) { errMsg = "Один или несколько счетчиков не принадлежат абоненту"; }
    if ( code == -0xea ) { errMsg = "Показания по одному или нескольким счетчикам уже были заявлены сегодня"; }
    if ( code == -0xe9 ) { errMsg = "Один или несколько счетчиков имеют некорректные показания"; }
    if ( code == -0xe8 ) { errMsg = "Не указан текущий пароль"; }
    if ( code == -0xe7 ) { errMsg = "Неверный текущий пароль"; }
    if ( code == -0xe6 ) { errMsg = "Невозможно сохранить новые показания по одному или нескольким счетчикам"; }
    if ( code == -0xe5 ) { errMsg = "Невозможно сделать предварительный расчет по одному или нескольким счетчикам"; }
    if ( code == -0xe4 ) { errMsg = "Не задан список услуг или сумм"; }
    if ( code == -0xe3 ) { errMsg = "Некорректное кол-во услуг/сумм"; }
    if ( code == -0xe2 ) { errMsg = "Некорректный номер услуги"; }
    if ( code == -0xe1 ) { errMsg = "Некорректная сумма"; }
    if ( code == -0xe0 ) { errMsg = "Невозможно сформировать платеж"; }

    if ( code == -0xdf ) { errMsg = "Одна или несколько услуг не принадлежат абоненту"; }
    if ( code == -0xde ) { errMsg = "Частое формирование платежа запрещено"; }
    if ( code == -0xdd ) { errMsg = "Некорректный e-mail"; }
    if ( code == -0xdc ) { errMsg = "Некорректный номер телефона"; }
    if ( code == -0xdb ) { errMsg = "Невозможно сохранить настройки"; }
    if ( code == -0xda ) { errMsg = "Необслуживаемый оператор<br/>мобильной связи"; }
    if ( code == -0xd9 ) { errMsg = "Некорректный период оповещения"; }
    if ( code == -0xd8 ) { errMsg = "Неверный код подтверждения e-mail"; }
    if ( code == -0xd7 ) { errMsg = "Неверный код подтверждения телефона"; }
    if ( code == -0xd6 ) { errMsg = "Номер телефона принадлежит другому абоненту"; }
    if ( code == -0xd5 ) { errMsg = "По Вашему дому нет задолженности"; }
    if ( code == -0xd4 ) { errMsg = "Невозможно получить список начислений и оплат"; }
    if ( code == -0xd3 ) { errMsg = "Невозможно получить историю задолженности"; }
    if ( code == -0xd2 ) { errMsg = "Список улиц не получен <br /> Попробуйте позднее."; }
    if ( code == -0xd1 ) { errMsg = "Список зданий не получен <br /> Попробуйте позднее."; }
    if ( code == -0xd0 ) { errMsg = "Список квартир не получен <br /> Попробуйте позднее."; }

    if ( code == -0xcf ) { errMsg = "Ошибка! <br /> Неверные серия и/или <br /> номер паспорта."; }
    if ( code == -0xce ) { errMsg = "Собственник не найден проверьте правильность ввода паспортных данных!"; }
    if ( code == -0xcd ) { errMsg = "Доступ в Личный кабинет для <br /> данного лицевого счета уже открыт!"; }
    if ( code == -0xcc ) { errMsg = "Пользователь не существует!"; }
    if ( code == -0xcb ) { errMsg = "Номер телефона не привязан к ЛС"; }
    if ( code == -0xca ) { errMsg = "Введенный E-mail не привязан к ЛС"; }
    if ( code == -0xc9 ) { errMsg = "Аккаунт не активирован!"; }
    if ( code == -0xc8 ) { errMsg = "Невозможно получить историю показаний ОДПУ"; }
    if ( code == -0xc7 ) { errMsg = "Невозможно получить информацию о Вашем доме"; }
    if ( code == -0xc6 ) { errMsg = "Невозможно получить список событий"; }
    if ( code == -0xc5 ) { errMsg = "Не найдено ни одной фотографии"; }
    if ( code == -0xc4 ) { errMsg = "Ошибка распределения суммы"; }
    if ( code == -0xc3 ) { errMsg = "Невозможно получить данные УК"; }
    if ( code == -0xc2 ) { errMsg = "Невозможно получить список домов"; }
    if ( code == -0xc1 ) { errMsg = "Невозможно получить график работ"; }
    if ( code == -0xc0 ) { errMsg = "Нет домов расторгших договор с УК за прошедший год"; }

    if ( code == -0xbf ) { errMsg = "Данные для выгрузки в соцзащиту не были получены"; }
    if ( code == -0xbe ) { errMsg = "На данном адресе уже есть зарегестрированный пользователь. Перейдите на страницу входа."; }
    if ( code == -0xbd ) { errMsg = "По выбранному адресу нет владельцев с указанными паспортными данными"; }
    if ( code == -0xbc ) { errMsg = "Неверно указан графический код"; }
    if ( code == -0xbb ) { errMsg = "Сбой регистрации"; }
    if ( code == -0xba ) { errMsg = "Не указан адрес или пароль"; }
    if ( code == -0xb9 ) { errMsg = "Неправильный период"; }
    if ( code == -0xb8 ) { errMsg = "Невозможно получить информацию о событии"; }
    if ( code == -0xb7 ) { errMsg = "Дефектов не зарегестрировано"; }
    if ( code == -0xb6 ) { errMsg = "Неверный пароль"; }
    if ( code == -0xb5 ) { errMsg = "Список пунктов ПП РФ №731 не получен"; }
    if ( code == -0xb4 ) { errMsg = "Управляющая организация не предоставила файлов по данному разделу"; }
    if ( code == -0xb1 ) { errMsg = "Не удалось получить данные по организации"; }
    if ( code == -0xb0 ) { errMsg = "Событие не было добавлено"; }

    if ( code == -0xaf ) { errMsg = "Файл не был корректно загружен"; }
    if ( code == -0xae ) { errMsg = "Список улиц не был загружен"; }
    if ( code == -0xad ) { errMsg = "Список домов не был загружен"; }
    if ( code == -0xac ) { errMsg = "Список абонентов не был загружен"; }
    if ( code == -0xab ) { errMsg = "Абонент не был назначен председателем"; }
    if ( code == -0xaa ) { errMsg = "Информация о подразделении не была получена"; }
    if ( code == -0xa9 ) { errMsg = "Список организаций не был получен"; }
    if ( code == -0xa8 ) { errMsg = "Информация о типах организаций не была получена"; }
    if ( code == -0xa7 ) { errMsg = "Список подразделений не был получен"; }
    if ( code == -0xa6 ) { errMsg = "Информация о подразделении не была сохранена"; }
    if ( code == -0xa5 ) { errMsg = "Список домов с данными о председателях не был получен"; }
    if ( code == -0xa4 ) { errMsg = "Реквизиты организации не были получены"; }
    if ( code == -0xa1 ) { errMsg = "Реквизиты организации не были сохранены"; }
    if ( code == -0xa0 ) { errMsg = "Невозможно сохранить файл. Проверьте права доступа к каталогам"; }

    if ( code == -0x9f ) { errMsg = "Архив с устанавливаемой версией не корректен. Обратитесь к разработчику."; }
    if ( code == -0x9e ) { errMsg = "Архив содержит необратимые изменения БД. Обратитесь к разработчику за уточнением."; }
    if ( code == -0x9d ) { errMsg = "Скрипт обновления БД не был выполнен"; }
    if ( code == -0x9c ) { errMsg = "Список версий системы не был получен"; }
    if ( code == -0x9b ) { errMsg = "Файл восстановления не был создан"; }
    if ( code == -0x9a ) { errMsg = "Не все файлы были скопированы при обновлении"; }
    if ( code == -0x99 ) { errMsg = "Обновление не было выполнено"; }
    if ( code == -0x98 ) { errMsg = "Скрипт восстановления БД не был выполнен"; }
    if ( code == -0x97 ) { errMsg = "Архив восстановления поврежден - отсутствует скрипт перемещения файлов"; }
    if ( code == -0x96 ) { errMsg = "Скрипт перемещения файлов не был выполнен"; }
    if ( code == -0x95 ) { errMsg = "Восстановление не было выполнено"; }
    if ( code == -0x94 ) { errMsg = "Превышена максимальная сумма начислений, показания не сохранены"; }
    if ( code == -0x93 ) { errMsg = "Организация не была добавлена"; }
    if ( code == -0x92 ) { errMsg = "Организация не была удалена"; }
    if ( code == -0x91 ) { errMsg = "Список юридических лиц не был получен"; }
    if ( code == -0x90 ) { errMsg = "Запись о юридическом лице не была сохранена"; }

    if ( code == -0x8f ) { errMsg = "Пароль учетной записи не был изменён"; }
    if ( code == -0x8e ) { errMsg = "Невозможно получить список тарифов"; }
    if ( code == -0x8d ) { errMsg = "Список файлов юридического лица не был получен"; }
    if ( code == -0x8c ) { errMsg = "Невозможно получить список актов недопоставок"; }
    if ( code == -0x8b ) { errMsg = "Для данной организации уже создан вход в Личный Кабинет"; }
    if ( code == -0x8a ) { errMsg = ""; }
    if ( code == -0x89 ) { errMsg = ""; }
    if ( code == -0x88 ) { errMsg = ""; }
    if ( code == -0x87 ) { errMsg = ""; }
    if ( code == -0x86 ) { errMsg = ""; }
    if ( code == -0x85 ) { errMsg = ""; }
    if ( code == -0x84 ) { errMsg = ""; }
    if ( code == -0x83 ) { errMsg = ""; }
    if ( code == -0x82 ) { errMsg = ""; }
    if ( code == -0x81 ) { errMsg = ""; }
    if ( code == -0x80 ) { errMsg = ""; }


/*
    if ( code == -0x100 ) { errMsg = "По выбранному адресу нет владельцев с указанными паспортными данными"; }
    if ( code == -0x101 ) { errMsg = "Не указан адрес или пароль"; }
    if ( code == -0x102 ) { errMsg = "Сбой регистрации"; }
    if ( code == -0x103 ) { errMsg = "Попытка перерегистрации существующего пользователя"; }
*/

    if ( code == -0x104 ) { errMsg = "Неверно указан графический код"; } //??????????????????? WHERE ????????????

    /* Ошибки, проверяемые на стороне клиента при вводе данных */
    if ( code == -0x300 ) { errMsg = "Не указана улица"; }
    if ( code == -0x301 ) { errMsg = "Не указан дом"; }
    if ( code == -0x302 ) { errMsg = "Не указана квартира"; }
    if ( code == -0x303 ) { errMsg = "Не указана серия паспорта"; }
    if ( code == -0x304 ) { errMsg = "Не указан номер паспорта"; }
    if ( code == -0x305 ) { errMsg = "Неверный формат серии паспорта"; }
    if ( code == -0x306 ) { errMsg = "Неверный формат номера паспорта"; }
    if ( code == -0x307 ) { errMsg = "Не указан графический код"; }
    if ( code == -0x308 ) { errMsg = "Ошибка проверки данных на сервере.<br/>Попробуйте позднее."; }
    if ( code == -0x309 ) { errMsg = "Не указан пароль"; }
    if ( code == -0x30a ) { errMsg = "Не указано подтверждение пароля"; }
    if ( code == -0x30b ) { errMsg = "Пароль и его подтверждение не совпадают"; }


    if ( code == -0x500 ) { errMsg = "Некорректная операция на сервере"; }

    return errMsg;
}