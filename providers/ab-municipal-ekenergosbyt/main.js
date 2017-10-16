
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.eens.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + encodeURIComponent('авторизация'), g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + encodeURIComponent('авторизация'), {
      ua_ru_contract_number:  prefs.login,
      ua_ru_pass:             prefs.password,
      ua_ru_auth:             'Войти'
    }, AB.addHeaders({
      Referer: baseurl + encodeURIComponent('авторизация') + '/'
    }));

    if (!/exit/i.test(html)) {
      var error = AB.getParam(html, null, null, /<h1(?:[^>]*>){3}([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
      if (error) {
        throw new AnyBalance.Error(error, null, /№ Договора либо пароль введены неверно/i.test(error));
      }

      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'fio', /ФИО ответственного лица(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'email', /E-mail ответственного лица(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces);

    if(isAvailable(['balance', 'reporting', 'cm_balance'])) {
      html = AnyBalance.requestGet(baseurl + encodeURIComponent('финансы') + '/' + encodeURIComponent('счета'), g_headers);
      AB.getParam(html, result, 'cm_balance', /<table[^>]+type_1[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'balance',    /Итого задолженность:(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,    AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(html, result, 'accrued',    /<table[^>]+type_1[^>]*>(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    }

    AnyBalance.setResult(result);
}
