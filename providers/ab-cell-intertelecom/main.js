/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers={
'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
'Sec-Fetch-Mode':'navigate',
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
'Sec-Fetch-Site':'same-origin',
'Referer':'https://my.intertelecom.ua/',
'Accept-Encoding':'gzip, deflate, br',
'Accept-Language':'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
'Upgrade-Insecure-Requests':1,
//'DNT':1
}
function main() {
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.phone, 'Введите номер телефона!');
    checkEmpty(prefs.pass, 'Введите пароль!');
    var baseurl='https://my.intertelecom.ua';

    AnyBalance.restoreCookies();
    var html = AnyBalance.requestGet(baseurl+'/pages/overview?lang=ru',g_headers);

if (!/\?logout/i.test(html)) {
    AnyBalance.trace('Нужно логиниться');
    var form = AB.getElement(html, /<form[^>]+loginform[^>]*>/i);
    var g_recaptcha_response = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), JSON.stringify({SITEKEY: '6LfJJFkUAAAAAFFqmzqEeQ4qBEEukpIXulxtEF74', TYPE: 'V3', ACTION: 'ongoing_password_check'}));
    var form_id=getParam(form,/(form\d+)/);                                                                      
	   var params = createFormParams(form, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/subscriber_numberform/i.test(name)) 
			return prefs.phone;
		else if (/password/i.test(name))
			return prefs.pass;
		else if (/form_id/i.test(name))
			return form_id;
		else if (/form_token/i.test(name))
			return g_recaptcha_response;
		else if (/submit/i.test(name))
			return undefined;
		return value;
	   });
    var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    var html=requestPostMultipart(baseurl+action, params, g_headers, null)

    if (!/\?logout/i.test(html)) {
        var error = getParam(html, null, null, /class="error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
			throw new AnyBalance.Error(error, null, /неверный пароль/i.test(error));
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var html = AnyBalance.requestGet(baseurl+'/pages/overview?lang=ru',g_headers);
} 
AnyBalance.trace(html);
    var result = {success: true};
    //Название тарифа
    getParam(html, result, '__tariff', /<div[^>]*>\s*Тарифный план:\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
    //Основной счет (Сальдо)
    getParam(html, result, 'saldo', /account-balance-span[^>]*>([^<]*)</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'perevod', /account-transfer-balance-text-span[^>]*>([^<]*)</i, replaceTagsAndSpaces, parseBalance);
    //Предоплаченые услуги на месяц
    //getParam(html, result, 'predoplata', /<div[^>]*>\s*Предоплаченые услуги на месяц\s*<\/div>\s*<div[^>]*>([^<]*)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Неактивированные бонусы с 094
    //getParam(html, result, 'bonus', /<div[^>]*>\s*Неактивированные бонусы \(с 094\)\s*<\/div>\s*<div[^>]*>([^<]*)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Предоплачение ИТ(местные+Украина+моб.094)+Местные
    getParam(html, result, 'min_it', /<div[^>]*>[^<]*ИТ[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseMinutes);
    //Предоплачение местные минуты
    getParam(html, result, 'min_local', /<div>Местные<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseMinutes);
    //Предоплачение местные минуты и по Украине
    getParam(html, result, 'min_local_uk', /<div>Местные\+Украина<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseMinutes);
    //Украина (моб.) [100 и 200 мин]
    sumParam(html, result, 'min_uk_mob', /<div>[^<]*Украина\s*\(моб.?\)\s*(?:\[.00\s*мин?\][^<]*<\/div>|[^<]*<\/div>)\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    //Украина+Моб.Украина
    sumParam(html, result, 'min_uk_mob_uk', /<div[^>]*>Украина\+Моб\.Украина([\s\S]*?)по/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_uk_mob_uk', /<div[^>]*>Вся\s*Украина\s*([\s\S]*?)по/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_uk_mob_uk', /<div[^>]*>Украина\s\(фикс\+моб\)([\s\S]*?)по/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    //Дата минуты
    getParam(html, result, 'date_min_it', /<div[^>]*>[^<]*ИТ[^>]*>[\s\S]*?по([^<]*)</g, replaceTagsAndSpaces, parseDate, aggregate_min);
    getParam(html, result, 'date_min_uk_mob_uk', /<div[^>]*>Украина\s\(фикс\+моб\)[\s\S]*?по([^<]*)</g, replaceTagsAndSpaces, parseDate, aggregate_min);
    getParam(html, result, 'date_min_uk_mob_uk', /<div[^>]*>[\s\S]*?Украина\+Моб\.Украина[^<]*<\/div>\s*<div[^>]*>[\s\S]*?[\s\S]*?по([^<]*)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    getParam(html, result, 'date_min_uk_mob_uk', /<div>[^<]*Вся\s*Украина\s*\[Подарок\][^<]*<\/div>\s*<div[^>]*>[\s\S]*?[\s\S]*?по([^<]*)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    getParam(html, result, 'date_min_uk_mob', /<div>[^<]*Украина\s*\(моб.?\)\s*[^<]*<\/div>\s*<div[^>]*>[\s\S]*?[\s\S]*?по([^<]*)</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Россия [100 мин]
    getParam(html, result, 'min_rus', /<div[^>]*>\s*Минуты\s*<\/div>[\s\S]*?<div[^>]*>[^<]*Россия[^<]*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseMinutes);
    //Бонус по программе лояльности «Наилучшее общение»
    getParam(html, result, 'bonus_pl', /<div[^>]*>\s*Наилучшее общение\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Бонус facebook
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус facebook\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус контактный номер
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус за контактный номер\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус "Угадай код"
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус [^>]*Угадай код[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус "Смартфон за Check-in"
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус [^>]*Смартфон за Check-in[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус "На лето" (на доп.услуги)"
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус [^>]*На лето[^>]*\s*[^>]*на доп.услуги[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус за регистрацию в АССА
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус регистрация АССА\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус исключительно на АП
    sumParam(html, result, 'bonus_fb', /<div[^>]*>\s*Бонус исключительно на АП\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонус «Вільний доступ»    [^>]*<\/div>
    getParam(html, result, 'bonus_vd', /<div[^>]*>\s*Бонус [^>]*Вільний доступ[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^>]*\)\s*<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Бонус при пополнении счета через Portmone + Лояльный Бонус
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Бонус при поповненні рахунку через Portmone[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Лояльный Бонус[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Бонус Debtors \(без АП\)[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Бесплатная смена пакета \(шт\.\)[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Бонус за пополнение[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'bonus_pr', /<div[^>]*>\s*Бонус на все услуги[^>]*\s*<\/div>\s*<div[^>]*>([\s\S]*?) \([^<]*\)\s*<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //СМС по Украине
    sumParam(html, result, 'sms_ukr', />\s*сеть ИТ\+CDMA\+GSM операторов\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок действия СМС по Украине
    sumParam(html, result, 'date_sms_ukr', />\s*сеть ИТ\+CDMA\+GSM операторов\s*<[\s\S]*?<div[^>]*>[\s\S]*? по ([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус контактный номер
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус за контактный номер\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус "Угадай код"
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус [^>]*Угадай код[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус "Смартфон за Check-in"
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус [^>]*Смартфон за Check-in[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус "На лето" (на доп.услуги)"
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус [^>]*На лето[^>]*\s*[^>]*на доп.услуги[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус за регистрацию в АССА
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус регистрация АССА\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата Бонус исключительно на АП
    sumParam(html, result, 'date_bonus_fb', /<div[^>]*>\s*Бонус исключительно на АП\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Дата "Бонус при пополнении счета через Portmone" + Лояльный Бонус
    sumParam(html, result, 'date_bonus_pr', /<div[^>]*>\s*Бонус при поповненні рахунку через Portmone[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam(html, result, 'date_bonus_pr', /<div[^>]*>\s*Лояльный Бонус[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam(html, result, 'date_bonus_pr', /<div[^>]*>\s*Бесплатная смена пакета \(шт\.\)[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam(html, result, 'date_bonus_pr', /<div[^>]*>\s*Бонус за пополнение[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam(html, result, 'date_bonus_pr', /<div[^>]*>\s*Бонус на все услуги[^>]*\s*<\/div>\s*<div[^>]*>\s*.* \(по ([^<]*)\)\s*<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Пакетный трафик (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket')
    var traffic_paket = sumParam(html, null, null, /пакетный трафик[^>]*>([\s\S]*?)по/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'traffic_paket', /<div[^>]*>\s*ТУРБО скорость 3G_BOOST \(Rev.B\)\s*<\/div>\s*<div[^>]*>([\s\S]*?)\s/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Пакетный трафик (Rev.B)
    var traffic_paket_revb = getParam(html, null, null, /пакетный трафик \(Rev.B\)\s*<[\s\S]*?<div[^>]*>([\s\S]*?) по/i, replaceTagsAndSpaces, parseBalance);
    //Трафик использованный за текущую интернет сессию  (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket_session')
    var traffic_paket_session = getParam(html, null, null, /<div[^>]*>\s*Трафик МБ\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Узнаем разницу между имеющимся Пакетным трафиком и израсходованным за текущую сессию
    if (isset(traffic_paket)) {
        if (AnyBalance.isAvailable('traffic_paket')) 
			result.traffic_paket = traffic_paket - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
    }
    if (isset(traffic_paket_revb)) {
        if (AnyBalance.isAvailable('traffic_paket_revb'))
			result.traffic_paket_revb = traffic_paket_revb - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
    }
    //Трафик ночной
    getParam(html, result, 'traffic_night', />\s*Ночной трафик\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Трафик смартфон 
    getParam(html, result, 'traffic_smart', />\s*Смартфон\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Трафик по акции
    sumParam(html, result, 'traffic_action', />\s*по акци(?:и|и \(Rev.A\)|и \(Rev.A\/Rev.B\))\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'traffic_action', />\s*Валентинка от Интертелеком. 1000 MB\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'traffic_action', />\s*Подарок от Интертелеком. 1000 MB\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'traffic_action', />\s*Компенсация от Интертелеком. \(Rev.A\/Rev.B\)\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок трафика по акции
    sumParam(html, result, 'date_traffic_action', />\s*по акци(?:и|и \(Rev.A\)|и \(Rev.A\/Rev.B\))\s*<[\s\S]*?<div[^>]*>[\s\S]*? по ([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    sumParam(html, result, 'date_traffic_action', />\s*Компенсация от Интертелеком. \(Rev.A\/Rev.B\)\s*<[\s\S]*?<div[^>]*>[\s\S]*? по ([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Срок действия безлимита на скорости до 128 Кбит/с
    sumParam(html, result, 'date_bezlimit', />\s*Трафик на скорости до 128\s*<[\s\S]*?<div[^>]*>Неограничено по ([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Акционный счет
    getParam(html, result, 'bonus_action_current', /<div[^>]*>\s*Акционный счет на текущий месяц[^>]*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus_action_next', /<div[^>]*>\s*Акционный счет на следующие мес.[^>]*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Трафик использованный за текущую интернет сессию  (получаем в счетчик на всякий случай)
    getParam(html, result, 'traffic_session', /<div[^>]*>\s*Трафик МБ\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Использованный трафик
    sumParam(html, result, 'traffic_it', />\s*IT\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Использованный трафик
    sumParam(html, result, 'traffic_3g_turbo', />\s*3G_TURBO\s*<[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Дата последней абонентской активности
    sumParam(html, result, 'date_activity', /<div[^>]*>\s*Дата последней абонентской активности:\s*<\/div>\s*<div[^>]*>([^<]*)<\/div>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    //Лояльный стаж
    getParam(html, result, 'loyalty', /<div[^>]*>\s*Лояльный стаж:\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseStazh);
    //Абонентский стаж
    getParam(html, result, 'mobsubscr', /<div[^>]*>\s*Абонентский стаж:\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, parseStazh);
    //Размер скидки по программе лояльности «Наилучшее общение»
    //getParam(html, result, 'skidka', /<div[^>]*>\s*Лояльный стаж \(гг.мм\)\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, skidka2loyal);
    //Количество новостей
    //getParam(html, result, 'news', />Новости <span [^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    //Кредит до…
    //getParam(html, result, 'kredit', /<div[^>]*>\s*Кредит до...\s*<\/div>\s*<div[^>]*>([^<]*)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Номер телефона
    getParam(html, result, 'phonet', /Номер:[\s\S]*?(\d{9,10})/, [replaceTagsAndSpaces, /(\d{3})(\d{3})(\d{2})(\d{2})/i, '+38($1)$2-$3-$4']);
    getParam(html, result, 'contphone', /Контактный номер телефона:[\s\S]*?(\d{9,10})/, [replaceTagsAndSpaces, /(\d{3})(\d{3})(\d{2})(\d{2})/i, '+38($1)$2-$3-$4']);
    //Номер телефона мобильный
    getParam(html, result, 'mobphonet', /Мобильный номер:[\s\S]*?(\d{9,10})/, [replaceTagsAndSpaces, /(\d{3})(\d{3})(\d{2})(\d{2})/i, '+38($1)$2-$3-$4']);
    //Лицевой счет
    getParam(html, result, 'ls', /Лицевой счет:[^>]*?>[^>]*?>([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
    //getParam(html, result, 'ip_adr', /<div[^>]*>\s*IP([^>]*>){3}/i, replaceTagsAndSpaces);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
    AnyBalance.setResult(result);
}

function parseStazh(str) {
    var matches = str.match(/(\d+)[^\d]*?(\d+)/);
    if (matches) {
        var val = (365 * matches[1] + 30 * matches[2]) * 86400;
        AnyBalance.trace("Parsed " + val + ' seconds from ' + str);
        return val;
    } else {
        AnyBalance.trace("Не удалось вычислить стаж из " + str);
    }
}

function parseSeconds(str) {
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if (matches) {
        time = (+matches[1]) * 3600 + (+matches[2]) * 60 + (+matches[3]);
        AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
        return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}

function skidka2loyal(str) {
    var val = parseStazh(str);
    if (!isset(val)) return;
    var skidka;
    if (val < 7776000) 
		skidka = 0;
    else if ((val >= 7776000) && (val < 15552000)) 
		skidka = 2;
    else if ((val >= 15552000) && (val < 63072000))
		skidka = 5;
    else if ((val >= 63072000) && (val < 94608000))
		skidka = 7;
    else if ((val >= 94608000) && (val < 157680000))
		skidka = 10;
    else if ((val >= 157680000) && (val < 315360000))
		skidka = 15;
    else //if((val>=315360000)&&(val<946080000))
		skidka = 20;
	
    return skidka;
}
