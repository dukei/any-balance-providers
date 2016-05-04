/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
};

function main() {
    var prefs         = AnyBalance.getPreferences(),
        baseurl       = 'https://school.mosreg.ru/',
        baseurl_login = 'https://login.school.mosreg.ru/';

    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl)
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(baseurl_login + 'user/login', {
      login:    prefs.login,
      password: prefs.password
    }, AB.addHeaders({
      Referer: 'https://uslugi.mosreg.ru/'
    }));

    var json = getJson(html);
    if (!json.returnUrl) {
      var error = json.error ? json.error.messages : undefined;
      if (error)
        throw new AnyBalance.Error(error, null, /Ошибка в логине или пароле/i.test(error));

      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};


   /* Не нашла ничего подобного на новом сайте. Да и на старом тоже не нашла
    if(prefs.id) {
      AnyBalance.trace('Ищем дневник ребенка с идентификатором ' + prefs.id);
      html = AnyBalance.requestGet(baseurlChildren + '/marks.aspx?child=' + prefs.id, g_headers);
    } else {
          AnyBalance.trace('Идентификатор ребенка не указан, ищем без него');

          html = AnyBalance.requestGet(baseurlChildren, g_headers);
          if (!html || AnyBalance.getLastStatusCode() >= 400) {
              // в каких-то случаях children.dnevnik.ru закрыт (403), смотрим schools.dnevnik.ru
              html = AnyBalance.requestGet(baseurlSchool + '/marks.aspx', g_headers);
          } else {
              var href = AB.getParam(html, null, null, /<a\s[^>]*\bhref="(https?:\/\/children\.dnevnik\.ru\/marks\.aspx\?[^'"\s#>]*?child=[^'"\s#>]+)/i);
              if (!href) {
                  href = baseurlChildren + '/marks.aspx';
              }
              AnyBalance.trace(href);
              html = AnyBalance.requestGet(href, g_headers);
          }
      }*/

    html = AnyBalance.requestGet(baseurl + 'user', g_headers);

    var schedule_href = getParam(html, null, null, /<a[^>]+href="([^"]*)[^>]*>Дневник/i);
    if(!schedule_href) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error("Не удалось найти ссылку на расписание. Сайт изменён?");
    }

    html = AnyBalance.requestGet(schedule_href, g_headers);

    var left = getElement(html, /<div[^>]+diarydaysleft[^>]*>/i),
        right = getElement(html, /<div[^>]+diarydaysright[^>]*>/i);

    if(!left || !right) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error("Не удалось найти столбцы с расписанием. Сайт изменён?");
    }

    var result = {success: true};

    var left_columm   = getElements(left, /<div[^>]+"col24"[^>]*>/ig),
        right_column  = getElements(right, /<div[^>]+"col24 first"[^>]*>/ig);

    var schedule = left_columm.concat(right_column);

    for(var i = 0; i < schedule.length; i++) {
      var day = AB.getParam(schedule[i], null, null, /<h3>([\s\S]*?)<\/h3>/i, AB.replaceTagsAndSpaces);
      if(!day)
        continue;

      var lessons 	 = getElements(schedule[i], /<tr[^>]*>/ig),
        total 		 = '<b>' + day + '</b><br/>',
        totalLessons = '';

      for(var j = 0; j < lessons.length; j++) {
        var subject = AB.getParam(lessons[j], null, null, /title="([^"]+)/i, AB.replaceTagsAndSpaces);
        var mark	= AB.getParam(lessons[j], null, null, /class="mark[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);

        if(mark && subject) {
          totalLessons += subject + ': ' + mark + '<br/>';
        }
      }

      if(totalLessons != '')
        AB.getParam('<b>' + day + '</b><br/><br/>' + totalLessons, result, 'total' + i);
    }

    /*var daysHtml = AB.getElement(html, /<div\s[^>]*id="diarydays"/);
     if (!daysHtml) {
     AnyBalance.trace(html);
     throw new AnyBalance.Error('Не удалось найти оценки, сайт изменен?');
     }*/

    /*var regLesson = '<a\\s*class="strong\\s*" title="[^"]+" href="https?://(?:schools|children).dnevnik.ru/lesson.aspx(?:[^>]*>){15,30}</tr>';
    // Бывает от 1 до 6 уроков
    //var regDay = new RegExp('<div class="panel blue2 clear">(?:[\\s\\S]*?' + regLesson + '){1,6}', 'ig');

    var regDay = new RegExp('<div class="panel blue2 clear">[^]+?<table class="grid vam marks">[^]*?<\/table>', 'ig');
    var days = AB.sumParam(daysHtml, null, null, regDay);

    for(var i = 0; i < days.length; i++) {
      var currentDay = days[i];

      var day = AB.getParam(currentDay, null, null, /<h3>([\s\S]*?)<\/h3>/i, AB.replaceTagsAndSpaces);
      if(!day)
        continue;

      var lessons = AB.sumParam(currentDay, null, null, new RegExp(regLesson, 'ig'));

      var total = '<b>' + day + '</b><br/>';
      var totalLessons = '';

      for(var z = 0; z < lessons.length; z++) {
        var currentLesson = lessons[z];

        var name = AB.getParam(currentLesson, null, null, /title="([^"]+)/i, AB.replaceTagsAndSpaces);
        var mark = AB.getParam(currentLesson, null, null, /class="mark([^>]*>){2}/i, AB.replaceTagsAndSpaces);
        if(mark && name) {
          totalLessons += name + ': ' + mark + '<br/>';
        }
        //total += name + (mark ? ': ' + mark : 'нет оценок') + '<br/>';
      }
      if(totalLessons != '')
        AB.getParam('<b>' + day + '</b><br/><br/>' + totalLessons, result, 'total' + i);
    }*/

    AB.getParam(html, result, 'fio', /header-profile__name[^>]+>([^<]+)/i, AB.replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}