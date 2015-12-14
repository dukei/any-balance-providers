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
        'form': $.param({
          login: prefs.login,
          pass: prefs.password
        })
      }),
      headers = {
        'Referer': baseurl,
        'X-Requested-With': 'XMLHttpRequest'
      };
	
	var res = AnyBalance.requestPost(baseurl + loginUrl, loginData, addHeaders(headers));

  if (res == 0) {
    throw new AnyBalance.Error('Неверный логин или пароль', null, true);
  }
  else if (res == '') {
    throw new AnyBalance.Error('Не удалось зайти в аккаунт. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl);
	
	var result = {success: true};

  var counters = [{
      name: 'advertisements',
      searchValue: 'объявлений'
    }, {
      name: 'comments',
      searchValue: 'комментарии'
    }, {
      name: 'messages',
      searchValue: 'сообщения'
    }, {
      name: 'user_lists',
      searchValue: 'списки пользователей'
    }, {
      name: 'collaborative_purchases',
      searchValue: 'совместные покупки'
    }, {
      name: 'feedback',
      searchValue: 'отзывы'
  }];

  counters.forEach(function(counter) {
    var re = getRegex(counter.searchValue),
        numericCounters = ['advertisements', 'messages', 'user_lists'],
        parser = numericCounters.includes(counter.name) ? parseBalance : null;

    getParam(html, result, counter.name, re, replaceTagsAndSpaces, parser);
  });
	
	AnyBalance.setResult(result);
}

function getRegex(srcValue) {
  var str = '<li\\s*class="user_link_item"\\s*>(?:(?!<li[^>]*>)[^]*?)' + srcValue + '((?!<li[^>]*>)[^]*?)<\/li>';
  return new RegExp(str, 'i');
}