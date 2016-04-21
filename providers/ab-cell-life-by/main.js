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

function getStateParams(html, param) {
  return getParam(html, null, null, new RegExp(param + "[^>]*value=['\"]([^'\"]+)", 'i'));
}

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://issa.life.com.by/';

  AB.checkEmpty(prefs.login, 'Введите номер телефона!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
  if (!matches)
    throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');

		var main = 'ru/';
	  var html = AnyBalance.requestGet(baseurl + main, g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

  html = AnyBalance.requestPost(baseurl + main, {
    csrfmiddlewaretoken: AB.getParam(html, null, null, /csrfmiddlewaretoken['"][\s\S]*?value=['"]([^"']*)['"]/i),
    msisdn_code: matches[1],
    msisdn: matches[2],
    super_password: prefs.password,
    form: true,
    next: '/ru/'
  }, addHeaders({
    Referer: baseurl + main
  }));

  // Иногда после логина висит 500ая ошибка, при переходе на главную все начинает работать
  if (/Ошибка 500/i.test(html)) {
    AnyBalance.trace('Ошибка при логине... попробуем исправить...');
    html = AnyBalance.requestGet(baseurl + main + 'informaciya/abonent/', g_headers);
  }

  if (!/logout/i.test(html)) {
    if (/action\s*=\s*["']https:\/\/issa2\.life\.com\.by/i.test(html)) {
      AnyBalance.trace('Этот номер не поддерживается в новом кабинете, нас редиректит на старый адрес...');
      doOldCabinet(prefs, matches);
      return;
    }
    var error = getParam(html, null, null, /errorlist[^"]*"[^<]([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /пароль/i.test(error));
    }

    throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
  }

  var result = {
    success: true,
    balance: null
  };

//  html = AnyBalance.requestGet(baseurl + 'ru/informaciya/abonent/', g_headers);

  getParam(html, result, '__tariff', [/Тарифный план([^<]+)/i, /Наименование тарифного плана(?:[^>]*>){2}([\s\S]*?)<\/td>/i], replaceTagsAndSpaces);
  getParam(html, result, 'fio', /ФИО(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
  getParam(html, result, 'phone', /Номер (?:life|телефона)(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
  // СМС/ММС
  sumParam(html, result, 'sms_left_other', /SMS на все сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'sms_left', /SMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'mms_left', /MMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Минуты
  sumParam(html, result, 'min_left_other', /Звонки (?:на|во) (?:все|другие) сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'min_left', /Звонки внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  // Трафик
  sumParam(html, result, 'traffic_night_left', />\s*Ночной интернет(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'traffic_left', />(?:Безлимитный)?\s*интернет(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'traffic_msg_left', />интернет[^<]*(?:viber|whatsapp)(?:[^>]+>){2}([^<]+ед)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Баланс

  getParam(html, result, 'balance', /<tr>\s*<td[^>]*>\s*Основной (?:сч(?:е|ё)т|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
  // Баланс для постоплаты
  if (!isset(result.balance) || result.balance === 0)
    getParam(html, result, 'balance', /Задолженность на линии(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'balance_bonus', /<tr>\s*<td[^>]*>\s*Бонусный (?:сч(?:е|ё)т|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
  // Оплаченные обязательства
  getParam(html, result, 'balance_corent', /Оплаченные обязательства(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
  // Карманы
  getParam(html, result, 'carmani_min_left', /(?:&#34;|")карманы(?:&#34;|")(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

  // Life points
  getParam(html, result, 'life_points', /Бонусный счет для участников клуба my life(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);


  html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/smena-tarifnogo-plana/', g_headers);
  getParam(html, result, '__tariff', /href="[^"]*">([^<]+)(?:[^>]*>){11}Активен/i, replaceTagsAndSpaces);

  if (isAvailable(['packs', 'packs_deadline'])) {
    html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/upravleniye-uslugami/', g_headers);

    var packs = sumParam(html, null, null, /<tr>\s*<td[^>]*>\s*<p>[^<]+<\/p>(?:[^>]*>){5}\s*Активная(?:[^>]*>){2}\s*до[^<]+/ig, null);

    AnyBalance.trace('Найдено активных пакетов: ' + packs.length);

    sumParam(packs, result, 'packs', /<tr>\s*<td[^>]*>\s*<p>([^<]+)<\/p>/ig, replaceTagsAndSpaces, null, aggregate_join);
    sumParam(packs, result, 'packs_deadline', /Активная(?:[^>]*>){2}\s*до([^<]+)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  }

  AnyBalance.setResult(result);
}
