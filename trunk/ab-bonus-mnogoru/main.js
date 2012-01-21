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
    
    matches = /<!--\s*авториз\.\s*пользователь\s*-->[\s\S]*<!--.*?\/авториз\.\s*пользователь.*?-->/.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Can not find account info, contact the author");

    var result = {
        success: true
    };
  
    var $table = $(matches[0]);
    if(AnyBalance.isAvailable('username'))
        result.username = $table.find('tr:first-child td.authorizedhat').text() + ' ' + $table.find('tr:nth-child(2) td.authorizedhat').text();
  
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = $table.find('tr:last-child td.authorizedhat:first-child font').text();
  
    if(AnyBalance.isAvailable('balance'))
        result.balance = $table.find('tr:nth-child(3) td.authorizedhat b').text();
    
    AnyBalance.setResult(result);
}

