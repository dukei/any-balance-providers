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
	var prefs = AnyBalance.getPreferences(),
	    baseurl = 'http://second.by';

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

  var loginUrl = '/r1_system/router.ajax.php',
      loginData = ({
        'class': 'auth',
        'method': 'user_login',
        'form': parametrize({
          login: prefs.login,
          pass: prefs.password
        })
      }),
      headers = {
        'Referer': baseurl,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      };
	
	var success = AnyBalance.requestPost(baseurl + loginUrl, loginData, addHeaders(headers));

  if (success != 'true') {
    if (success === 'false') {
      throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
    }

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl);
	var result = {success: true};

  getParam(html, result, 'advertisements', getRegex('объявлений'), replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'comments', getRegex('комментарии'), replaceTagsAndSpaces);
  getParam(html, result, 'messages', getRegex('сообщения'), replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'user_lists', getRegex('списки пользователей'), replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'collaborative_purchases', getRegex('совместные покупки'), replaceTagsAndSpaces);
  getParam(html, result, 'feedback', getRegex('отзывы'), replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function parametrize(obj) {
  return Object.keys(obj).map(function(item) {
    return encodeURIComponent(item) + '=' + encodeURIComponent(obj[item]);
  }).join('&');
}

function getRegex(srcValue) {
  var str = '<li\\s*class="user_link_item"\\s*>(?:(?!<li[^>]*>)[^]*?)' + srcValue + '((?!<li[^>]*>)[^]*?)<\/li>';
  return new RegExp(str, 'i');
}