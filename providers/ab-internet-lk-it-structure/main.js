﻿
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
ООО "Структура"
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
  var baseurl = 'http://lk.it-structure.ru/cabinet/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var authForm = AB.getElement(html, /<form[^>]*action="[^"]*cabinet[^"]*"[^>]*>/i);

  var params = AB.createFormParams(authForm, function(params, str, name, value) { //token
    if (name == 'LOGIN')
      return prefs.login;
    else if (name == 'PASSWD')
      return prefs.password;

    return value;
  });

  html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({
    Referer: baseurl
  }));

  if (!/logout/i.test(html)) {
    var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*messages[^"]*[^>]*>([\s\S]*)?<\/div>/i, AB.replaceTagsAndSpaces);
    if (error)
      throw new AnyBalance.Error(error, null, /Неправильный/i.test(error));

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  var infoSideBar = AB.getElement(html, /<div[^>]*class=["'][^"']*carbon_modules_userinfosidebar[^"']*[^>]+>/i);

	AB.getParam(infoSideBar, result, 'balance', /Баланс([\s\S]*?class="[^"]*fa-rub[^"]*[^>]*">)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(infoSideBar, result, 'endDate', /Хватит([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(infoSideBar, result, 'licschet', /Договор\s*<\/div>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

  html = AnyBalance.requestGet(baseurl + 'Лицевой-счет/', g_headers);

  AB.getParam(html, result, 'licschet', /Номер\s+сч[её]та\s*<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, '__tariff', /Тариф\s*<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);


  AnyBalance.setResult(result);
}
