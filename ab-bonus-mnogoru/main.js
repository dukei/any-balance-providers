/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Накопительная программа много.ру

Сайт оператора: http://mnogo.ru/
Личный кабинет: https://mnogo.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://mnogo.ru/';
  
    var matches = /(\d{1,2})[^\d](\d{1,2})[^\d](\d\d\d\d)/.exec('' + prefs.birthday);
    if(!matches)
        throw new AnyBalance.Error('День рождения должен быть в формате DD-MM-YYYY, например, 28-04-1980');
  
    var dt = new Date(matches[2]+'/'+matches[1]+'/'+matches[3]);
    if(isNaN(dt))
        throw new AnyBalance.Error('Неверная дата ' + prefs.birthday);
  
    var html = AnyBalance.requestPost(baseurl + 'enterljs.html', {
        UserLogin: prefs.login,
        'UserBirth[d]': dt.getDate(),
        'UserBirth[m]': dt.getMonth()+1,
        'UserBirth[y]': dt.getFullYear()
    });

    
    AnyBalance.trace('got from login (' + typeof(html) + '): ' + html);

    if($.trim(html) != "OK")
        throw new AnyBalance.Error($.trim(html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ')));
    
    html = AnyBalance.requestGet(baseurl + 'index.html');
    
    matches = /<!--\s*авторизованный\s*-->[\s\S]*<!--\s*?\/авторизованный\s*?-->/.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Can not find account info (design changed?), contact the author");

    var result = {
        success: true
    };
  
    var $table = $(matches[0]);
    if(AnyBalance.isAvailable('username'))
        result.username = $table.find('td.authorized2012 font').first().text().replace(/\s*[cс]\s+картой\s*/g, '');
  
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = $table.find('td.authorized2012 a').first().text();
  
    if(AnyBalance.isAvailable('balance'))
        result.balance = parseInt($table.find('td.authorized2012 a:contains("бонус")').text().replace(/[^\d]+/g, ''));
    
    AnyBalance.setResult(result);
}

