
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
    var prefs   = AnyBalance.getPreferences();
    var baseurl = 'https://lkz.ahml.ru/borrower/';

    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
        j_username: prefs.login,
        j_password: prefs.password,
    }, AB.addHeaders({
        Referer: baseurl
    }));

    if (!/logout/i.test(html)) {
      var error = AB.getParam(html, null, null, [/<div[^>]+NoPass\s*Emf[^>]*>([\s\S]*?)<\/div>/i, /<div[^>]+Title\s*Emf[^>]*>([\s\S]*?)<\/div>/i], AB.replaceTagsAndSpaces);
      if (error) {
        throw new AnyBalance.Error(error, null, /(В целях безопасности|Учетная запись не найдена)/i.test(error));
      }

      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'balance',        /На Вашем счете(?:[^>]*>){1}([^<]*)/i,       AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'pay_sum',        /<span[^>]+Price Nearest[^>]*>([\s\S]*?)</i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'insurance_sum',  /<span[^>]+"Price"[^>]*>([^<]*)/i,           AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'pay_left',       /Остаток основного долга:([^<]*)/i,          AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'credit_sum',     /<span[^>]+Nowrap[^>]*>([^<]*)/i,            AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'pct',            /Процентная ставка:([^<]*)/i,                AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'fio',              /<div[^>]+name[^>]*>([\s\S]*?)<\/div>/i,  AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'credit_agreement', /Кредитный договор(?:[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'mortgage_num',     /Закладная(?:[^>]*>){1}([^<]*)/i,         AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'credit_pay_till',  /Ближайший платеж по кредиту(?:[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'mortgage_till',    /Срок погашения кредита:([^<]*)/i,                  AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'insurance_till',   /оплатить до(?:[^>]*>){1}([^<]*)/i,                 AB.replaceTagsAndSpaces, AB.parseDate);

    AnyBalance.setResult(result);
}