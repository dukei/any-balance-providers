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
  AnyBalance.setDefaultCharset('utf-8');
  var baseurl = "https://ss.zadarma.com/";
  var captchaUrl = 'captcha/index.php?form=login&unq=';

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    // AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var captchaKey = '';


  var authForm = AB.getElement(html, /<form[^>]*action="[^"]*auth\/login[^"]*"[^>]*>/i);
  AnyBalance.trace(authForm);
  // if(/<img[^>]*id="captcha_login"[^>]*>/i.test(authForm)) {
  if (!/none[\s\S]*?id="captcha_login/i.test(authForm)) {
    AnyBalance.trace('captcha discovered');
    captchaKey = captchaAuth(baseurl, captchaUrl);
  }

  html = AnyBalance.requestPost(baseurl + "auth/login/", {
    redirect: '',
    answer: 'json',
    captcha: captchaKey || '',
    email: prefs.login,
    password: prefs.password
  }, addHeaders({
    Referer: baseurl
  }));

  var json = getJson(html);


  if (json.success !== true) {
    var error = json.error;

    // if (json.needCaptcha === true) {
    //
    // }

    if (error !== '') {
      throw new AnyBalance.Error(error, null, /найден/i.test(error));
    }

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

  var result = {
    success: true
  };

  AB.getParam(html, result, 'balance', /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
  AB.getParam(html, result, ['currency', 'balance'], /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces,
    parseCurrency);
  AB.getParam(html, result, '__tariff', [/<p><strong>(.*)<\/strong>( \((?:стоимость|вартість|cost) \d+\.\d+.*\))<\/p>/i,
    /<h2>Текущий тарифный план<\/h2>\s*<p>\s*<strong>(.*)<\/strong>/i
  ], replaceTagsAndSpaces, html_entity_decode);
  AB.getParam(html, result, 'min', /использовано:[^<]+\[(\d+ мин)/i, replaceTagsAndSpaces, parseMinutes);

  if (isAvailable(['phone0', 'phone0till', 'phone1', 'phone1till', 'phone2', 'phone2till'])) {
    html = AnyBalance.requestGet(baseurl + 'dirnum/', g_headers);
    var numbers = sumParam(html, null, null,
      /<h2[^>]*>(?:Бесплатный|Безкоштовний|Free)(?:[^<](?!c донабором|з донабором|with dtmf))*<\/h2>(?:[^>]*>){20,25}(?:<h2|Номер действителен|Номер діє|The number works)/ig
    );
    for (var i = 0; i < Math.min(numbers.length, 3); ++i) {
      AB.getParam(numbers[i], result, 'phone' + i,
        /(?:Вам подключен прямой номер|Вам надано прямий номер|Your connected number|Вам підключено прямий номер)[^>]*>([\s\S]*?)<\//i,
        replaceTagsAndSpaces, html_entity_decode);
      AB.getParam(numbers[i], result, 'phone' + i + 'till', /(?:Действует до|Діє до|Valid till)([^<]*)\./i,
        replaceTagsAndSpaces, parseDateISO);
      AB.getParam(numbers[i], result, 'phone' + i + 'status', /(?:Статус)\s*:([^<]*)/i, replaceTagsAndSpaces,
        html_entity_decode);
    }
  }

  if (isAvailable(['shortphone0', 'shortphone1', 'shortphone2', 'shortphone3', 'shortphone4'])) {
    html = AnyBalance.requestGet(baseurl + 'mysip/', g_headers);

    var numbers = AB.sumParam(html, null, null, /<li>\s*<a href="#\d+"[^>]*>([^<]*)/ig);
    for (var i = 0; i < Math.min(numbers.length, 5); ++i) {
      AB.getParam(numbers[i], result, 'shortphone' + i, null, replaceTagsAndSpaces, html_entity_decode);
    }
  }

  AnyBalance.setResult(result);
}

//help func
function captchaAuth(baseurl, captchaUrl) {
  var captcha, captchaSrc, captchaKey;
  if (AnyBalance.getLevel() >= 7) {
    // var captcha, captchaSrc, captchaKey;
    AnyBalance.trace('Пытаемся ввести капчу');
    captcha = AnyBalance.requestGet(baseurl + captchaUrl + Math.random(), g_headers);
    captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
    AnyBalance.trace('Капча получена: ' + captchaKey);
  } else {
    throw new AnyBalance.Error('Провайдер требует AnyBalance API v7 или выше, пожалуйста, обновите AnyBalance!', null,
      true);
  }
  return captchaKey;
}
